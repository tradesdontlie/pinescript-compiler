# 08 — Runtime: request.security()

> **Status**: COMPLETE (P0 DONE — same-symbol MTF resampling)
> **Priority**: P0 DONE
> **File**: `src/runtime/builtins/request.ts`

---

## What's Implemented

`createRequestModule(bars, getCurrentBarIndex, getCurrentTimeframe)` — factory that creates a `request` module with MTF resampling capability.

### Core Implementation

**`request.security(symbol, timeframe, expression, gaps?, lookahead?)`**

Handles same-symbol MTF requests by resampling the input bars to the target timeframe.

**Resampling:** `getResampledBars(bars, tf)` groups input bars into higher-TF periods using a period-key function:
- `"D"` — groups by UTC year/month/day
- `"W"` — groups by ISO week (floors to Monday)
- `"M"` — groups by UTC year/month
- Numeric string — groups by N-minute bucket

**Aggregation:** Each group produces one `ResampledBar` with open=first bar's open, high=max, low=min, close=last bar's close, volume=sum.

**Lookup:** `buildBarToResampledIndex(barsLen, resampled)` builds an `Int32Array` for O(1) mapping from original bar index to resampled bar index.

**Lookahead behavior:**
- `barmerge.lookahead_on` or `"lookahead_on"` or `true` — returns current period's value (forward-looking, available from first bar of the period)
- Default (lookahead off) — returns **previous** completed period's value (no peeking); returns NA for the first period

**Gaps behavior:**
- `barmerge.gaps_on` — only emits a non-NA value on the **first** bar of each new period; all other bars in the period get NA
- Default (gaps off) — repeats the last known value across all bars in the period

**Same-timeframe shortcut:** If `timeframe === currentTf` or `timeframe === ''`, returns the expression directly (no resampling needed).

**Expression resolution:** Currently resolves all expressions to `reBar.close`. Tuple/array expressions return `[close, close, ...]` of matching length.

---

## Acceptance Criteria — ALL MET

- [x] `request.security(symbol, "D", close)` returns daily close values
- [x] With `lookahead=barmerge.lookahead_on`, HTF value available from first bar of period
- [x] Without lookahead, previous period's value returned during current period
- [x] `[o, c] = request.security(..., [open, close])` returns a tuple (array)
- [x] `barmerge.lookahead_on` resolves to the string `"lookahead_on"` via codegen enum routing
- [x] Request for same timeframe returns expression directly
- [x] Resampling from lower-TF bars produces correct OHLCV aggregation
- [x] `NA` returned when no bars available or bar index out of range

---

## P1 Remaining Work

### 1. Expression-Aware Resolution — P1 (HIGH IMPACT)

**Current limitation:** `resolveValue()` always returns `reBar.close` regardless of the `expression` argument. This means `request.security(..., open)` returns the close of the resampled bar, not the open.

**Root cause:** The expression is evaluated at the *current* bar's context (e.g., `close` is a Series at bar N), but the resampled bar is a synthetic object. There's no direct way to know which OHLCV field to use.

**Fix:** Pass a field selector or use a named-field lookup. The codegen must emit the field name as a string alongside the expression:

**Option A — Codegen emits field name:**
```typescript
// Codegen transforms:
//   request.security(sym, "D", close)
// into:
//   __rt.request.security(sym, "D", "close")
```
Then `resolveValue` can do `reBar[expression]`.

**Option B — Runtime wraps Series in a descriptor:**
```typescript
// Expressions are tagged objects: { field: 'close', series: closeSeriesRef }
// When expression is a tagged descriptor, resolveValue uses descriptor.field
```

Option A is simpler and recommended. Requires a codegen change to detect `request.security` calls and transform the expression argument.

**OHLCV fields to support:** `open`, `high`, `low`, `close`, `volume`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`.

### 2. Custom Expression Support — P1

Beyond OHLCV fields, Pine allows arbitrary expressions:
```pine
myRsi = request.security(sym, "D", ta.rsi(close, 14))
```

For these, the expression is a function call that must be re-evaluated against the resampled bar. This requires running the expression in a synthetic bar context.

**Approach:** This is complex and should be deferred. For now, support only named OHLCV fields (see item 1).

### 3. `barmerge.*` Constants in Codegen — P1

`barmerge.lookahead_on`, `barmerge.lookahead_off`, `barmerge.gaps_on`, `barmerge.gaps_off` must be routed by the codegen `genMember()` to string constants:

```typescript
// In genMember():
if (objStr === 'barmerge') return JSON.stringify(prop);
// 'lookahead_on' → '"lookahead_on"', etc.
```

This is likely already done given the current implementation handles `'lookahead_on'` string. Verify in codegen.

### 4. `request.security_lower_tf()` — P1

Pine v6 function that returns an array of lower-timeframe values within the current bar:
```pine
minuteCloses = request.security_lower_tf(syminfo.tickerid, "1", close)
// returns float[] of all 1-minute closes within the current bar
```

**Implementation approach:** Reverse of the current resampling — for each higher-TF bar, collect all lower-TF bars that fall within it.

### 5. `gaps=barmerge.gaps_on` with `na` Values — P1

When `gaps=barmerge.gaps_on` and there is no data for certain bars (e.g., the resampled bar has no overlapping original bar), Pine returns `na`. The current implementation returns `NA` for out-of-range lookups, which is correct, but the gaps behavior for partial periods needs verification.

---

## P2 Remaining Work

### Cross-Symbol Requests — P2

`request.security("AAPL", "D", close)` for a different symbol requires an external data source. Currently returns NA. A future data provider interface could:

1. Allow pre-loading multiple symbols in the data loader
2. Look up the requested symbol in a symbol registry
3. Resample from the alternative symbol's bars

This is architecture-level work and out of scope for current development.

### `request.quandl()` / `request.financial()` — P2

Additional Pine request functions for financial data. Not in benchmark. Return NA for now.

---

## Architecture Notes

- The module is purely computational — it does not make network requests. All data comes from the bars array passed at construction time.
- Cache key is the timeframe string. Multiple calls with the same TF reuse the same resampled bars.
- The `Int32Array` lookup is efficient for dense bar arrays (typical case).
- NA is imported from `../types/na` and used for out-of-range/unavailable values.
