# 09 — Runtime: User Variable Series History

> **Status**: DONE
> **Priority**: P0 (100+ occurrences in benchmark)
> **Files modified**: `src/runtime/context.ts`, `src/compiler/codegen/generator.ts`

---

## What's Implemented

### Runtime — User Series Store (`src/runtime/context.ts`)

`userSeriesSet` and `userSeriesGet` are fully implemented at lines 407–424:

```typescript
userSeriesSet(name: string, value: unknown): void {
  let s = userSeries.get(name);
  if (!s) {
    s = new Series<any>(510);
    userSeries.set(name, s);
  }
  const scalar = (value !== null && typeof value === 'object' && value && 'get' in (value as any))
    ? (value as any).get(0) : value;
  s.push(scalar);
},

userSeriesGet(name: string, offset: number): unknown {
  const s = userSeries.get(name);
  if (!s) return NA;
  const val = s.get(offset);
  return val === undefined ? NA : val;
},
```

- Series ring buffer size: 510 (accommodates lookback up to ~500 bars)
- Coerces Series objects to scalars before storing
- Returns NA for missing history (insufficient bars)

### Codegen — History Variable Pre-scan + Emit (`src/compiler/codegen/generator.ts`)

**Pre-scan pass** (`historyVars: Set<string>`): Before codegen, the AST is walked to find all `IndexExpression` nodes where the object is a non-builtin identifier. Those names are added to `historyVars`.

**Assignment emit**: For every variable in `historyVars`, `__rt.userSeriesSet(name, value)` is emitted immediately after each assignment statement (plain var, `var`/`varip`, tuple destructure, reassign).

**Index emit** (`genIndex()`): When `myVar[n]` is encountered and `myVar` is in `historyVars`, emits `__rt.userSeriesGet("myVar", n)` instead of JavaScript array indexing.

All four variable modes are handled:
- Plain declarations: `var myEma = ...; __rt.userSeriesSet("myEma", myEma);`
- `var`/`varip`: `__rt.state.x = ...; __rt.userSeriesSet("x", __rt.state.x);`
- Tuple destructure: `userSeriesSet` called for each tuple member
- Reassignment (`x := ...`): `userSeriesSet` emitted after the assignment

---

## Remaining P1 Work

### 1. Increase Series Buffer Depth

**Current**: Ring buffer is hardcoded to 510 entries.

**Problem**: Pine Script's `max_bars_back` can be up to 5000. Scripts that look back `myVar[500]` on datasets with >510 bars will get stale/wrapped results.

**Fix**: Read `max_bars_back` from `ScriptMetadata` and pass it to `createContext()`:

```typescript
// In engine.ts
const maxBarsBack = metadata?.maxBarsBack ?? 5000;
const ctx = createContext(builtins, ta, barsCount, maxBarsBack);

// In context.ts createContext signature:
export function createContext(
  builtins: BuiltinVariables,
  ta: TaModule,
  barsCount: number,
  maxBarsBack = 510
): ContextInternals

// In userSeriesSet:
s = new Series<any>(maxBarsBack);
```

**Acceptance**: `myVar[500]` on a 600-bar dataset returns the correct value, not NA.
**Est**: ~20 LOC across context.ts + engine.ts.

### 2. End-of-Bar Snapshot for Reassigned Variables

**Current limitation**: `userSeriesSet` is emitted inline after each assignment. If a variable is reassigned multiple times within a single bar's execute pass, the series may snapshot intermediate values rather than the final value.

**Example**:
```pine
x = open
x := close    // x reassigned — should store close as the bar's value
prev = x[1]   // should be previous bar's final x (close)
```

Currently both assignments emit `userSeriesSet`, so the series gets pushed twice per bar, corrupting history offsets.

**Fix**: Instead of inline emit, collect all history-tracked vars and emit a single batch `userSeriesSet` block at the END of the execute function body:

```typescript
// At the end of the execute function generation:
for (const name of this.historyVars) {
  const store = this.varDecls.get(name) === 'var'   ? `__rt.state.${name}`
              : this.varDecls.get(name) === 'varip' ? `__rt.persistentState.${name}`
              : name;
  out.push(`__rt.userSeriesSet(${JSON.stringify(name)}, ${store});`);
}
```

Remove all inline `userSeriesSet` emit from assignment handlers.

**Acceptance**: Variable reassigned twice per bar stores exactly one value per bar; `x[1]` returns the final value from the previous bar.
**Est**: ~40 LOC in generator.ts.

### 3. Inline Expression History (`ta.ema(close, 20)[1]`)

**Current limitation**: History access on inline expressions (not variables) is not tracked.

```pine
prev = ta.ema(close, 20)[1]   // Currently broken — IndexExpression on CallExpression
```

**Fix**: Introduce a synthetic temp variable in codegen when `[n]` is applied to a non-identifier:

```typescript
// In genIndex(), when obj is not an IdentifierExpression:
const tmpName = `__tmp_${this.tmpCounter++}`;
const objCode = this.genExpr(idx.object);
// Emit as inline IIFE or pre-statement:
// __rt.userSeriesSet("__tmp_N", objCode) is not possible inline
// Must hoist: emit `var __tmpN = objCode; __rt.userSeriesSet(...);` before the current statement
// Then use: __rt.userSeriesGet("__tmpN", idxStr)
```

This requires statement-level hoisting support in the codegen output buffer. **Priority: P1 — deferred until hoisting infrastructure exists.**

**Acceptance**: `ta.ema(close, 20)[1]` returns previous bar's EMA value.
**Est**: ~60 LOC in generator.ts.

### 4. `max_bars_back()` Function

**Pine syntax**: `max_bars_back(myVar, 500)` — explicitly requests 500 bars of history for `myVar`.

**Fix**: No-op stub in runtime (the series buffer depth handles this at the context level):

```typescript
// In function mapper or context:
maxBarsBack(_series: any, _depth: number): void { /* no-op */ }
```

**Acceptance**: `max_bars_back(myVar, 500)` does not throw; history access up to 500 bars works.
**Est**: ~10 LOC.

---

## Acceptance Criteria — DONE

1. ✅ `myVar = close * 2; prev = myVar[1]` — `prev` gets the previous bar's `myVar` value
2. ✅ `var x = 0; x := close; x[1]` — var variable history works
3. ✅ `[a, b] = ta.macd(...); a[1]` — tuple variable history works
4. ✅ `myVar[0]` returns the current bar's value
5. ✅ `myVar[5000]` returns NA when not enough history
6. ✅ Series history is reset between separate script executions
7. ✅ All 329+ existing tests pass

## Acceptance Criteria — P1 Remaining

8. [ ] `myVar[500]` on 600-bar dataset returns correct value (buffer depth fix)
9. [ ] Variable reassigned twice per bar stores one value per bar (end-of-bar snapshot)
10. [ ] `ta.ema(close, 20)[1]` works (inline expression history)
11. [ ] `max_bars_back(myVar, 500)` does not throw
