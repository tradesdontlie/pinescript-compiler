# 08 — Runtime: request.security()

> **Status**: NOT STARTED
> **Priority**: P0 (7 calls in benchmark)
> **File to create**: `src/runtime/builtins/request.ts`

---

## What Exists

- `request.security` is mapped in function-mapper.ts to `__rt.request.security`
- The runtime context has `request` referenced but no actual implementation
- No multi-timeframe data loading exists

---

## What's Missing

### 1. `request.security()` — P0

**Pine Script syntax:**
```pine
// Basic: get close from another timeframe
dailyClose = request.security(syminfo.tickerid, "D", close)

// With expression
dailyHigh = request.security(syminfo.tickerid, "D", high)

// With tuple return
[dailyOpen, dailyClose] = request.security(syminfo.tickerid, "D", [open, close])

// With lookahead
prevDailyClose = request.security(syminfo.tickerid, "D", close, lookahead=barmerge.lookahead_on)

// With gaps
dailyClose = request.security(syminfo.tickerid, "D", close, gaps=barmerge.gaps_on)
```

**Benchmark usage:**
```pine
tfClose = request.security(syminfo.tickerid, "60", close, lookahead=barmerge.lookahead_on)
```
7 calls with `barmerge.lookahead_on`.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `symbol` | string | Ticker ID (e.g., `syminfo.tickerid`) |
| `timeframe` | string | `"D"`, `"W"`, `"60"`, `"240"`, etc. |
| `expression` | any | Value to fetch (close, [open, close], custom expression) |
| `gaps` | enum | `barmerge.gaps_off` (default), `barmerge.gaps_on` |
| `lookahead` | enum | `barmerge.lookahead_off` (default), `barmerge.lookahead_on` |
| `ignore_invalid_symbol` | bool | Don't error on invalid symbols |
| `currency` | string | Currency conversion |
| `calc_bars_back` | int | Number of bars to calculate |

---

### Implementation Approach

Since we run locally with a fixed dataset, `request.security()` for the **same symbol** but different timeframe can be simulated by resampling the existing bar data.

#### Phase 1: Same-symbol MTF (P0)

When `symbol === syminfo.tickerid` (same instrument), resample bars to the requested timeframe:

```typescript
export function createRequestModule(
    bars: Bar[],
    currentBarIndexFn: () => number,
    timeframePeriod: string,
) {
    // Pre-compute resampled data for common timeframes
    const resampledCache = new Map<string, ResampledBar[]>();

    return {
        security(
            symbol: string,
            timeframe: string,
            expression: any,
            opts?: { gaps?: string; lookahead?: string }
        ): any {
            const lookahead = opts?.lookahead === 'lookahead_on';
            const gaps = opts?.gaps === 'gaps_on';

            // For same symbol, resample from existing bars
            if (symbol === '__self' || symbol === currentTickerId) {
                return resampleAndFetch(bars, timeframe, expression,
                    currentBarIndexFn(), lookahead, gaps);
            }

            // For different symbols: return NA (not supported locally)
            return NA;
        }
    };
}
```

#### Resampling Logic

```typescript
interface ResampledBar {
    startIdx: number;    // First bar index in this period
    endIdx: number;      // Last bar index in this period
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
    timeClose: number;
}

function resampleBars(bars: Bar[], targetTF: string): ResampledBar[] {
    const targetSeconds = timeframeToSeconds(targetTF);
    const result: ResampledBar[] = [];
    let current: ResampledBar | null = null;

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const periodStart = Math.floor(bar.time / (targetSeconds * 1000)) * (targetSeconds * 1000);

        if (!current || current.time !== periodStart) {
            if (current) result.push(current);
            current = {
                startIdx: i, endIdx: i,
                open: bar.open, high: bar.high, low: bar.low, close: bar.close,
                volume: bar.volume, time: periodStart,
                timeClose: periodStart + targetSeconds * 1000,
            };
        } else {
            current.endIdx = i;
            current.high = Math.max(current.high, bar.high);
            current.low = Math.min(current.low, bar.low);
            current.close = bar.close;
            current.volume += bar.volume;
        }
    }
    if (current) result.push(current);
    return result;
}
```

#### Lookahead Behavior

- **`barmerge.lookahead_off`** (default): The HTF bar's value is only available after the HTF bar closes. During the HTF bar, the previous HTF bar's value is used.
- **`barmerge.lookahead_on`**: The HTF bar's value is available from the first LTF bar of the HTF period. This "peeks ahead" — commonly used for session open/close values.

```typescript
function resampleAndFetch(
    bars: Bar[], tf: string, expr: any,
    currentIdx: number, lookahead: boolean, gaps: boolean
): any {
    const resampled = getOrResample(bars, tf);

    // Find the resampled period for the current bar
    const period = findPeriod(resampled, currentIdx);
    if (!period) return NA;

    if (lookahead) {
        // Return this period's value (forward-looking)
        return extractValue(period, expr);
    } else {
        // Return previous period's value (no peeking)
        const prevPeriod = findPreviousPeriod(resampled, period);
        if (!prevPeriod) return NA;
        return extractValue(prevPeriod, expr);
    }
}
```

#### Phase 2: Cross-symbol requests (P2)

For different symbols, the implementation would need:
- A data provider that can fetch external symbol data
- Symbol resolution and normalization
- Currency conversion
- This is P2 and can initially return NA

---

### 2. `barmerge.*` Constants — P0

**Pine Script syntax:**
```pine
barmerge.lookahead_on
barmerge.lookahead_off
barmerge.gaps_on
barmerge.gaps_off
```

**Benchmark usage:** 7 references to `barmerge.lookahead_on`.

**Implementation in codegen:**
```typescript
// In genMember():
if (objStr === 'barmerge') return JSON.stringify(prop);
// 'lookahead_on' → "lookahead_on", 'gaps_off' → "gaps_off"
```

**Alternatively, map to runtime constants:**
```typescript
barmerge: {
    lookahead_on: 'lookahead_on',
    lookahead_off: 'lookahead_off',
    gaps_on: 'gaps_on',
    gaps_off: 'gaps_off',
}
```

---

### 3. Tuple Return from request.security() — P0

**Pine Script syntax:**
```pine
[o, c] = request.security(syminfo.tickerid, "D", [open, close])
```

**Implementation:**
- When `expression` is an array, return an array of resampled values
- The codegen already supports tuple destructuring via `var [o, c] = ...`

---

## Integration

### Codegen (function-mapper.ts)
Already mapped: `'request.security': '__rt.request.security'`

Add `barmerge` namespace handling in `genMember()`.

### Context (context.ts)
Add `request` module to RuntimeContext, wire with bar data.

### Engine (engine.ts)
Create request module with access to full bar array for resampling.

---

## Acceptance Criteria

1. `request.security(syminfo.tickerid, "D", close)` returns daily close values
2. With `lookahead=barmerge.lookahead_on`, the HTF value is available from the first bar of the period
3. Without lookahead, the previous period's value is returned during the current period
4. `[o, c] = request.security(..., [open, close])` returns a tuple
5. `barmerge.lookahead_on` resolves to the string `"lookahead_on"`
6. Request for a non-existent symbol returns NA
7. Resampling from 1-min bars to 60-min bars produces correct OHLCV
8. At least 10 tests covering basic MTF, lookahead, gaps, and tuple returns
