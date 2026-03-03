# 09 — Runtime: User Variable Series History

> **Status**: PARTIAL (builtin series only)
> **Priority**: P0 (100+ occurrences in benchmark)
> **Files to modify**: `src/runtime/types/series.ts`, `src/runtime/context.ts`, `src/runtime/engine.ts`, `src/compiler/codegen/generator.ts`

---

## What Exists

### Builtin Variable History — Working
```pine
prevClose = close[1]     // ✅ Works → __rt.series("close").get(1)
prevHigh = high[3]       // ✅ Works → __rt.series("high").get(3)
```

The codegen checks if the object of an `IndexExpression` is a known builtin variable (`open`, `high`, `low`, `close`, `volume`, `time`, `bar_index`, `hl2`, `hlc3`, `ohlc4`) and emits `__rt.series("name").get(n)`.

### What Doesn't Work — User Variable History
```pine
myEma = ta.ema(close, 20)
prevEma = myEma[1]       // ❌ Generates myEma[1] → JS array index, not series history
```

---

## What's Missing

### The Problem

In Pine Script, **every variable is implicitly a series**. When you write `x = close * 2`, the value of `x` is stored for every bar, and `x[1]` gives the previous bar's value.

Currently, user variables are plain JavaScript variables that get overwritten each bar. There's no historical storage for them.

### Benchmark Usage

```pine
// Common patterns in benchmark:
ses_1_open[1]        // Previous session open
tfClose[1]           // Previous timeframe close
time[1]              // Previous bar time (time is builtin, but user copies aren't)
bool myCondition = ...
if myCondition[1]    // Previous bar's condition value
```

100+ occurrences of `userVar[n]` in the benchmark.

---

## Implementation Plan

### Approach: Automatic Series Wrapping

When the codegen detects that a user variable is accessed with `[n]`, it must:
1. Store that variable's value each bar in a Series ring buffer
2. Replace `myVar[n]` with the Series history access

#### Option A: Explicit Series Registration (Recommended)

On first assignment, register the variable as a user series:
```javascript
// Pine: myEma = ta.ema(close, 20)
// Generated JS:
var myEma = __rt.ta.ema(__rt.close, 20);
__rt.userSeriesSet("myEma", myEma);  // Store in series buffer
```

On history access:
```javascript
// Pine: myEma[1]
// Generated JS:
__rt.userSeriesGet("myEma", 1)
```

#### Option B: Proxy-based Auto-tracking

Wrap all user variables in Proxy objects that auto-track history. This is more complex and likely slower.

**Recommendation:** Option A — explicit series registration.

---

### Implementation Details

#### 1. Runtime — User Series Store

Add to `src/runtime/context.ts`:

```typescript
// Map of user variable name → Series<any>
private userSeries = new Map<string, Series<any>>();

// Called at end of each bar's execute() to snapshot all registered user variables
userSeriesSet(name: string, value: any): void {
    let s = this.userSeries.get(name);
    if (!s) {
        s = new Series<any>(this.maxBars);
        this.userSeries.set(name, s);
    }
    // Coerce Series to scalar before storing
    const scalar = (value !== null && typeof value === 'object' && 'get' in value)
        ? value.get(0)
        : value;
    s.push(scalar);
}

userSeriesGet(name: string, offset: number): any {
    const s = this.userSeries.get(name);
    if (!s) return NA;
    return s.get(offset);
}
```

#### 2. Codegen — Detect and Emit Series Operations

In `generator.ts`, track which variables are accessed with `[n]`:

**Pass 1 — Pre-scan for history usage:**
```typescript
// Before generating, scan the AST for IndexExpression nodes
// where the object is a user variable (not a builtin)
private historyVars = new Set<string>();

private scanForHistoryVars(stmts: Statement[]): void {
    // Walk AST, find IndexExpression where object is IdentifierExpression
    // and the identifier is NOT a builtin variable
    // Add the identifier name to historyVars
}
```

**Code generation for assignments:**
```typescript
// For variables that use history, emit userSeriesSet after assignment:
// Pine: myEma = ta.ema(close, 20)
// JS:
//   var myEma = __rt.ta.ema(__rt.close, 20);
//   __rt.userSeriesSet("myEma", myEma);
```

**Code generation for index access:**
```typescript
// In genIndex():
if (objExpr.kind === 'IdentifierExpression') {
    const name = (objExpr as IdentifierExpression).name;
    if (!this.mapper.isBuiltinVar(name)) {
        // User variable history access
        return `__rt.userSeriesGet("${name}", ${idxStr})`;
    }
}
```

#### 3. Handle var/varip Variables

var/varip variables use `__rt.state.x` or `__rt.persistentState.x`. Their series tracking needs special handling:

```typescript
// Pine: var float myVar = 0
//        myVar := close
//        prevMyVar = myVar[1]

// Generated:
// Init: __rt.state.myVar = 0;
// Execute:
//   __rt.state.myVar = __rt.close;
//   __rt.userSeriesSet("myVar", __rt.state.myVar);
//   var prevMyVar = __rt.userSeriesGet("myVar", 1);
```

#### 4. Handle Tuple Destructured Variables

```pine
[macdLine, signalLine, histogram] = ta.macd(close, 12, 26, 9)
prevMacd = macdLine[1]
```

Each variable from the tuple needs individual series tracking:
```javascript
var [macdLine, signalLine, histogram] = __rt.ta.macd(__rt.close, 12, 26, 9);
__rt.userSeriesSet("macdLine", macdLine);
__rt.userSeriesSet("signalLine", signalLine);
__rt.userSeriesSet("histogram", histogram);
```

---

## Edge Cases

### 1. Conditional Assignment
```pine
x = if condition
    close
else
    open
// x[1] should return the previous bar's x value regardless of condition
```
Solution: `userSeriesSet` is called after the full assignment, capturing whatever value x ends up with.

### 2. Loop Variables
```pine
for i = 0 to 10
    arr.push(myVar[i])  // myVar[i] for various lookback depths
```
Solution: `userSeriesGet("myVar", i)` works naturally since `i` is a dynamic value.

### 3. Variable Reassignment Within a Bar
```pine
x = 1
x := x + close
prev = x[1]  // Should get the FINAL value of x from the previous bar
```
Solution: `userSeriesSet("x", x)` should be emitted AFTER the last assignment to `x` in the bar's execution. Simplest approach: emit `userSeriesSet` at the END of the execute function for all tracked variables.

### 4. Series Depth
In Pine Script, the maximum lookback is typically 5000 bars (`max_bars_back`). The Series ring buffer size should accommodate this.

---

## Acceptance Criteria

1. `myVar = close * 2; prev = myVar[1]` — `prev` gets the previous bar's `myVar` value
2. `ta.ema(close, 20)[1]` — inline history access works
3. `var x = 0; x := close; x[1]` — var variable history works
4. `[a, b] = ta.macd(...); a[1]` — tuple variable history works
5. `myVar[0]` returns the current bar's value
6. `myVar[5000]` returns NA when not enough history
7. Series history is reset between separate script executions
8. All 329 existing tests continue to pass
9. At least 10 new tests covering user variable history patterns
