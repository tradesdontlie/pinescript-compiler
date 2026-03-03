# 16 — Remaining ta.* and math.* Functions

> **Status**: NOT STARTED (P1)
> **Priority**: P1 — needed for full Pine Script v6 parity
> **Files to modify**:
> - `src/runtime/builtins/ta.ts` — add runtime implementations
> - `src/compiler/codegen/function-mapper.ts` — add BUILTIN_FUNCTIONS entries
> **Estimated LOC**: ~280 runtime + ~15 mapper entries

---

## What Exists (already implemented)

`ta.*`: sma, ema, rsi, macd, bb, atr, stoch, crossover, crossunder, highest, lowest,
highestbars, lowestbars, valuewhen, barssince, change, mom, wma, vwma, dmi, cci, swma, alma,
rma, stdev, variance, cum, tr, pivothigh, pivotlow, falling, rising, percentrank, correlation,
dev, mfi, obv, supertrend

`math.*`: abs, ceil, floor, round, max, min, pow, sqrt, log, log10, exp, sign, sin, cos, tan,
asin, acos, atan, random, todegrees, toradians

---

## What's Missing

### ta.* Missing Functions

---

### 1. `ta.hma(source, length)` — Hull Moving Average

**Pine Script syntax:**
```pine
hmaVal = ta.hma(close, 14)
```

**Algorithm:**
```
WMA(2 * WMA(src, length/2) - WMA(src, length), floor(sqrt(length)))
```
Step 1: compute half-length WMA: `wma1 = ta.wma(source, floor(length / 2))`
Step 2: compute full-length WMA: `wma2 = ta.wma(source, length)`
Step 3: intermediate series: `delta = 2 * wma1 - wma2`
Step 4: HMA = `ta.wma(delta_series, floor(sqrt(length)))`

**Challenge:** Step 4 requires a synthetic Series built from per-bar delta values.
Use a stateful ring buffer (same pattern as cumState) keyed by call-site ID.

**State shape:**
```typescript
const hmaState = new Map<string, {
  deltaBuf: number[];  // ring buffer of delta values
  capacity: number;    // floor(sqrt(length))
  prevBarIndex: number;
}>();
```

**Runtime implementation:**
```typescript
hma(source: Series<number>, length: number, id: string = 'default_hma'): number {
  if (source.length < length) return NA as unknown as number;

  const halfLen = Math.floor(length / 2);
  const sqrtLen = Math.floor(Math.sqrt(length));

  // Compute wma1 and wma2 inline
  let ws1 = 0, wn1 = 0, ws2 = 0, wn2 = 0;
  for (let i = 0; i < length; i++) {
    const v = source.get(i);
    if (isNa(v)) return NA as unknown as number;
    const w2 = length - i;
    ws2 += (v as number) * w2;
    wn2 += w2;
    if (i < halfLen) {
      const w1 = halfLen - i;
      ws1 += (v as number) * w1;
      wn1 += w1;
    }
  }
  if (wn1 === 0 || wn2 === 0) return NA as unknown as number;
  const delta = 2 * (ws1 / wn1) - (ws2 / wn2);

  // Accumulate delta in ring buffer
  const barIndex = getCurrentBarIndex();
  let state = hmaState.get(id);
  if (!state || state.capacity !== sqrtLen) {
    state = { deltaBuf: [], capacity: sqrtLen, prevBarIndex: barIndex };
    hmaState.set(id, state);
  }
  state.deltaBuf.unshift(delta);
  if (state.deltaBuf.length > sqrtLen) state.deltaBuf.length = sqrtLen;
  state.prevBarIndex = barIndex;

  if (state.deltaBuf.length < sqrtLen) return NA as unknown as number;

  // WMA over delta buffer
  let wSum = 0, wN = 0;
  for (let i = 0; i < sqrtLen; i++) {
    const w = sqrtLen - i;
    wSum += state.deltaBuf[i] * w;
    wN += w;
  }
  return wSum / wN;
},
```

**Function mapper entry:**
```typescript
'ta.hma': '__rt.ta.hma',
```

**TaModule interface addition:**
```typescript
hma(source: Series<number>, length: number, id?: string): number;
```

**Test cases:**
```typescript
// ta.hma returns NA until enough bars
// ta.hma(close, 9) on 9-bar series should return a number
// hma(close, 4) = wma(2*wma(close,2) - wma(close,4), 2)
// Verify: for constant series [10,10,10,...] hma should equal 10
```

**LOC estimate:** ~40 lines (state map + implementation)

---

### 2. `ta.kc(source, length, mult, useTrueRange?)` — Keltner Channels

**Pine Script syntax:**
```pine
[upper, basis, lower] = ta.kc(close, 20, 2)
[upper, basis, lower] = ta.kc(close, 20, 2, true)  // useTrueRange default true
```

**Returns:** `[upper, basis, lower]` tuple

**Algorithm:**
```
basis = ta.ema(source, length)
range = useTrueRange ? ta.tr(true) : ta.ema(high - low, length)
upper = basis + mult * range
lower = basis - mult * range
```

**State shape:** Shares emaState with keyed IDs for the basis EMA and range EMA.

**Runtime implementation:**
```typescript
kc(
  source: Series<number>,
  length: number,
  mult: number,
  useTrueRange: boolean = true,
  id: string = 'default_kc',
  high?: Series<number>,
  low?: Series<number>,
  close?: Series<number>
): [number, number, number] {
  const NA3: [number, number, number] = [NA as unknown as number, NA as unknown as number, NA as unknown as number];
  const h = high ?? getHigh?.();
  const l = low ?? getLow?.();
  const c = close ?? getClose?.();
  if (!h || !l || !c) return NA3;

  // basis EMA
  const basisId = id + '_basis';
  const basis = this.ema(source, length, basisId);
  if (isNa(basis)) return NA3;

  let rangeVal: number;
  if (useTrueRange) {
    rangeVal = this.tr(true, h, l, c);
  } else {
    // ema of (high - low)
    // We need a synthetic series for high-low; approximate with direct EMA state
    const curr = (h.get(0) as number) - (l.get(0) as number);
    const rangeId = id + '_range';
    const rangeState = emaState.get(rangeId);
    const barIndex = getCurrentBarIndex();
    if (!rangeState || rangeState.prevBarIndex !== barIndex - 1) {
      emaState.set(rangeId, { prev: curr, prevBarIndex: barIndex });
      rangeVal = curr;
    } else {
      const k = 2 / (length + 1);
      rangeVal = curr * k + (rangeState.prev as number) * (1 - k);
      emaState.set(rangeId, { prev: rangeVal, prevBarIndex: barIndex });
    }
  }
  if (isNa(rangeVal)) return NA3;

  const upper = (basis as number) + mult * rangeVal;
  const lower = (basis as number) - mult * rangeVal;
  return [upper, basis as number, lower];
},
```

**Function mapper entry:**
```typescript
'ta.kc': '__rt.ta.kc',
```

**TaModule interface addition:**
```typescript
kc(source: Series<number>, length: number, mult: number, useTrueRange?: boolean, id?: string): [number, number, number];
```

**Test cases:**
```typescript
// ta.kc returns [upper, basis, lower] tuple
// upper > basis > lower when mult > 0
// With constant series and ATR=0, upper == basis == lower
```

**LOC estimate:** ~45 lines

---

### 3. `ta.donchian(length)` — Donchian Channels

**Pine Script syntax:**
```pine
[upper, basis, lower] = ta.donchian(length)
// uses high/low implicitly
```

**Returns:** `[upper, basis, lower]` tuple

**Algorithm:**
```
upper = ta.highest(high, length)
lower = ta.lowest(low, length)
basis = math.avg(upper, lower)
```

**Runtime implementation:**
```typescript
donchian(
  length: number,
  high?: Series<number>,
  low?: Series<number>
): [number, number, number] {
  const NA3: [number, number, number] = [NA as unknown as number, NA as unknown as number, NA as unknown as number];
  const h = high ?? getHigh?.();
  const l = low ?? getLow?.();
  if (!h || !l) return NA3;

  const upper = this.highest(h, length);
  const lower = this.lowest(l, length);
  if (isNa(upper) || isNa(lower)) return NA3;

  const basis = ((upper as number) + (lower as number)) / 2;
  return [upper as number, basis, lower as number];
},
```

**Function mapper entry:**
```typescript
'ta.donchian': '__rt.ta.donchian',
```

**TaModule interface addition:**
```typescript
donchian(length: number, high?: Series<number>, low?: Series<number>): [number, number, number];
```

**Test cases:**
```typescript
// ta.donchian(3) with high=[5,4,3] low=[2,1,0]: upper=5, lower=0, basis=2.5
// Returns NA3 when fewer than length bars available
```

**LOC estimate:** ~20 lines

---

### 4. `ta.linreg(source, length, offset)` — Linear Regression Value

**Pine Script syntax:**
```pine
lrVal = ta.linreg(close, 14, 0)
lrPrev = ta.linreg(close, 14, 1)  // value 1 bar ago on the regression line
```

**Algorithm:**
Uses ordinary least squares (OLS) over the last `length` bars of `source`.
Returns the fitted value at position `offset` bars back from the most recent bar.

```
x_i = i (0 = oldest bar in window, length-1 = most recent)
y_i = source[length-1-i]  (lookback i gives bar i steps back)
x_mean = (length - 1) / 2
y_mean = sum(y_i) / length
slope = sum((x_i - x_mean) * (y_i - y_mean)) / sum((x_i - x_mean)^2)
intercept = y_mean - slope * x_mean
value at offset = intercept + slope * (length - 1 - offset)
```

**Runtime implementation:**
```typescript
linreg(source: Series<number>, length: number, offset: number = 0): number {
  if (source.length < length + offset) return NA as unknown as number;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < length; i++) {
    const x = i;  // 0 = oldest in window
    const v = source.get(length - 1 - i + offset);  // oldest first
    if (isNa(v)) return NA as unknown as number;
    sumX += x;
    sumY += v as number;
    sumXY += x * (v as number);
    sumX2 += x * x;
  }

  const denom = length * sumX2 - sumX * sumX;
  if (denom === 0) return sumY / length;

  const slope = (length * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / length;

  // Value at the "most recent" end of the regression line, shifted by offset
  return intercept + slope * (length - 1);
},
```

**Function mapper entry:**
```typescript
'ta.linreg': '__rt.ta.linreg',
```

**TaModule interface addition:**
```typescript
linreg(source: Series<number>, length: number, offset?: number): number;
```

**Test cases:**
```typescript
// Perfect linear series [1,2,3,4,5] length=5 offset=0: linreg = 5
// Constant series [3,3,3] length=3: linreg = 3
// linreg(close, 14, 0) gives current regression value
// linreg(close, 14, 1) gives regression value one bar back
```

**LOC estimate:** ~25 lines

---

### 5. `ta.median(source, length)` — Median Value

**Pine Script syntax:**
```pine
medVal = ta.median(close, 14)
```

**Algorithm:**
Sort `length` values from the source series, return the middle value.
For even-length: Pine uses the lower of the two middle values (floor median).

**Runtime implementation:**
```typescript
median(source: Series<number>, length: number): number {
  if (source.length < length) return NA as unknown as number;

  const vals: number[] = [];
  for (let i = 0; i < length; i++) {
    const v = source.get(i);
    if (isNa(v)) return NA as unknown as number;
    vals.push(v as number);
  }

  vals.sort((a, b) => a - b);
  const mid = Math.floor(length / 2);
  // Pine uses lower middle for even-length
  return length % 2 === 1 ? vals[mid] : vals[mid - 1];
},
```

**Function mapper entry:**
```typescript
'ta.median': '__rt.ta.median',
```

**TaModule interface addition:**
```typescript
median(source: Series<number>, length: number): number;
```

**Test cases:**
```typescript
// ta.median([1,2,3,4,5]) = 3
// ta.median([1,2,3,4]) = 2  (lower middle for even)
// Returns NA when fewer than length bars available
// ta.median with constant series = constant value
```

**LOC estimate:** ~18 lines

---

## math.* Missing Functions

---

### 6. `math.avg(...values)` — Average of Arguments

**Pine Script syntax:**
```pine
avgVal = math.avg(a, b, c)         // variadic
avgVal = math.avg(close, open)     // two series values
```

**Algorithm:**
```
math.avg(a, b, ...) = (a + b + ...) / count
```
NA arguments are excluded from both sum and count.

**Runtime implementation:**
```typescript
avg(...args: (number | typeof NA)[]): number {
  let sum = 0;
  let count = 0;
  for (const v of args) {
    if (!isNa(v)) {
      sum += v as number;
      count++;
    }
  }
  if (count === 0) return NA as unknown as number;
  return sum / count;
},
```

**Function mapper entry:**
```typescript
'math.avg': '__rt.math.avg',
```

**MathModule interface addition:**
```typescript
avg(...args: number[]): number;
```

**Test cases:**
```typescript
// math.avg(1, 2, 3) = 2
// math.avg(10, 20) = 15
// math.avg(na, 4, 6) = 5  (NA excluded)
// math.avg() = NA (no non-NA args)
```

**LOC estimate:** ~12 lines

---

### 7. `math.sum(source, length)` — Rolling Sum

**Pine Script syntax:**
```pine
rollingSum = math.sum(close, 14)
```

**Algorithm:**
Sum of the last `length` values of `source`. Equivalent to `ta.sma(source, length) * length`,
but `math.sum` handles NA by propagating NA (any NA in window → NA result).

**Runtime implementation:**
```typescript
sum(source: Series<number>, length: number): number {
  if (source.length < length) return NA as unknown as number;
  let total = 0;
  for (let i = 0; i < length; i++) {
    const v = source.get(i);
    if (isNa(v)) return NA as unknown as number;
    total += v as number;
  }
  return total;
},
```

**Function mapper entry:**
```typescript
'math.sum': '__rt.math.sum',
```

**MathModule interface addition:**
```typescript
sum(source: Series<number>, length: number): number;
```

**Note on current `ta.cum` vs `math.sum`:**
`ta.cum` is a running cumulative sum (infinite lookback, stateful).
`math.sum` is a windowed rolling sum over `length` bars (stateless, recomputed each bar).

**Test cases:**
```typescript
// math.sum(close, 3) on [1,2,3,4,5] = 5+4+3 = 12
// Returns NA when fewer than length bars
// math.sum with any NA in window returns NA
```

**LOC estimate:** ~15 lines

---

### 8. `math.pi`, `math.e`, `math.phi` — Mathematical Constants

**Pine Script syntax:**
```pine
circumference = 2 * math.pi * radius
napier = math.e
golden = math.phi
```

**Values:**
- `math.pi` = 3.141592653589793 (Math.PI)
- `math.e` = 2.718281828459045 (Math.E)
- `math.phi` = 1.618033988749895 (golden ratio)

**Implementation approach:**
These are constant properties on the math module object, not function calls.

**Runtime addition** (in `src/runtime/builtins/math.ts` or wherever MathModule is created):
```typescript
export const MathModule = {
  // ... existing functions ...
  pi: Math.PI,
  e: Math.E,
  phi: 1.618033988749895,
};
```

**Codegen approach:**
These are `MemberExpression` accesses (`math.pi`), not `CallExpression`.
The generator's `genMemberExpr` already handles namespace access — the runtime object
just needs the properties present. No function-mapper entry needed; the existing
member-expression passthrough (`__rt.math.pi`) will work automatically.

**However**, verify in `generator.ts` that `math` is in `KNOWN_NAMESPACES` (it is, line 26)
so `math.pi` → `__rt.math.pi` without method-dispatch interference.

**Test cases:**
```typescript
// math.pi === Math.PI
// math.e === Math.E
// math.phi === 1.618033988749895
// 2 * math.pi * 1 ≈ 6.2832
```

**LOC estimate:** 3 lines (constant properties)

---

## Implementation Order

| Priority | Function | LOC | Complexity |
|----------|----------|-----|------------|
| P1 | `math.pi/e/phi` | 3 | Trivial |
| P1 | `math.avg` | 12 | Easy |
| P1 | `math.sum` | 15 | Easy |
| P1 | `ta.median` | 18 | Easy |
| P1 | `ta.linreg` | 25 | Medium |
| P1 | `ta.donchian` | 20 | Easy |
| P1 | `ta.kc` | 45 | Medium |
| P1 | `ta.hma` | 40 | Medium |

**Total new LOC:** ~178 runtime + ~12 mapper entries + ~8 interface lines = ~200 LOC

---

## Codegen Mappings Summary

Add to `BUILTIN_FUNCTIONS` in `src/compiler/codegen/function-mapper.ts`:

```typescript
// New ta.* functions
'ta.hma':      '__rt.ta.hma',
'ta.kc':       '__rt.ta.kc',
'ta.donchian': '__rt.ta.donchian',
'ta.linreg':   '__rt.ta.linreg',
'ta.median':   '__rt.ta.median',

// New math.* functions
'math.avg': '__rt.math.avg',
'math.sum': '__rt.math.sum',
// math.pi, math.e, math.phi: no mapper entry needed — member access via __rt.math.pi etc.
```

---

## State Maps to Add (top of ta.ts)

```typescript
const hmaState = new Map<string, {
  deltaBuf: number[];
  capacity: number;
  prevBarIndex: number;
}>();
```

`kc`, `donchian`, `linreg`, `median` are stateless per-call (recompute each bar from ring buffer lookback) and require no new state maps.

---

## TaModule Interface Additions

Add to `TaModule` interface in `src/runtime/builtins/ta.ts`:

```typescript
hma(source: Series<number>, length: number, id?: string): number;
kc(source: Series<number>, length: number, mult: number, useTrueRange?: boolean, id?: string): [number, number, number];
donchian(length: number): [number, number, number];
linreg(source: Series<number>, length: number, offset?: number): number;
median(source: Series<number>, length: number): number;
```

---

## MathModule Interface Additions

Add to math module in `src/runtime/builtins/math.ts`:

```typescript
avg(...args: number[]): number;
sum(source: Series<number>, length: number): number;
pi: number;
e: number;
phi: number;
```

---

## Test Plan

### ta.hma tests
1. `hma(constant_series, 9)` = constant value after warmup
2. `hma` returns NA until `length` bars accumulated
3. `hma(close, 4)` matches manual calculation

### ta.kc tests
1. Returns `[upper, basis, lower]` tuple
2. `upper > lower` when mult > 0 and range > 0
3. Returns NA3 when not enough bars

### ta.donchian tests
1. Correct highest/lowest detection over `length` bars
2. `basis = (upper + lower) / 2`
3. Returns NA3 on insufficient data

### ta.linreg tests
1. Perfect trend `[1,2,3,4,5]` → `linreg(src, 5, 0) = 5`
2. Constant series → `linreg = constant`
3. `offset=1` returns value one bar back on regression line

### ta.median tests
1. Odd-length window: middle value
2. Even-length window: lower middle value
3. NA propagation: any NA in window → NA

### math.avg tests
1. `math.avg(1, 2, 3) = 2`
2. NA exclusion
3. All-NA → NA

### math.sum tests
1. `math.sum(src, 3)` = sum of last 3 bars
2. NA propagation in window
3. Insufficient bars → NA

### math.pi/e/phi tests
1. `math.pi === Math.PI`
2. `math.e === Math.E`
3. `math.phi === 1.618033988749895`
