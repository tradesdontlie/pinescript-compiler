# 05 — Runtime: Collections Gaps

> **Status**: PARTIAL (26 of ~40 array methods; no map/matrix)
> **Priority**: P0 for missing array methods used in benchmark
> **File**: `src/runtime/builtins/collections.ts`

---

## What Exists

### Implemented Array Methods (26)
- Construction: `new`, `newFloat`, `newInt`, `newBool`, `newString`, `from`
- Access: `get`, `set`, `size`
- Mutation: `push`, `pop`, `insert`, `remove`, `clear`, `reverse`, `sort`
- Query: `sum`, `avg`, `max`, `min`, `includes`, `indexof`, `lastindexof`
- Utility: `copy`, `join`, `slice`

---

## What's Missing

### 1. `array.shift()` — P0

**Pine Script syntax:**
```pine
firstVal = array.shift(myArray)  // Remove and return first element
```

**Benchmark usage:** 42 calls — most-used missing method.

**Implementation:**
```typescript
shift(arr: any[]): any {
    if (arr.length === 0) return undefined;
    return arr.shift();
}
```

---

### 2. `array.unshift()` — P0

**Pine Script syntax:**
```pine
array.unshift(myArray, value)  // Add element to beginning
```

**Implementation:**
```typescript
unshift(arr: any[], val: any): void {
    arr.unshift(val);
}
```

---

### 3. `array.median()` — P0

**Pine Script syntax:**
```pine
med = array.median(myArray)
```

**Benchmark usage:** 2 calls (important for the indicator's median calculation).

**Implementation:**
```typescript
median(arr: number[]): number {
    if (arr.length === 0) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}
```

---

### 4. `array.stdev()` — P1

**Pine Script syntax:**
```pine
sd = array.stdev(myArray)
```

**Implementation:**
```typescript
stdev(arr: number[]): number {
    if (arr.length < 2) return NaN;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const sqDiffs = arr.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (arr.length - 1));
}
```

---

### 5. `array.variance()` — P1

**Pine Script syntax:**
```pine
v = array.variance(myArray)
```

**Implementation:**
```typescript
variance(arr: number[]): number {
    if (arr.length < 2) return NaN;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const sqDiffs = arr.map(v => (v - mean) ** 2);
    return sqDiffs.reduce((s, v) => s + v, 0) / (arr.length - 1);
}
```

---

### 6. `array.range()` — P1

**Pine Script syntax:**
```pine
r = array.range(myArray)  // max - min
```

**Implementation:**
```typescript
range(arr: number[]): number {
    if (arr.length === 0) return NaN;
    let mn = arr[0], mx = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < mn) mn = arr[i];
        if (arr[i] > mx) mx = arr[i];
    }
    return mx - mn;
}
```

---

### 7. `array.concat()` — P1

**Pine Script syntax:**
```pine
combined = array.concat(arr1, arr2)
```

**Implementation:**
```typescript
concat(arr1: any[], arr2: any[]): any[] {
    return arr1.concat(arr2);
}
```

---

### 8. `array.first()` / `array.last()` — P1

**Pine Script syntax:**
```pine
f = array.first(myArray)
l = array.last(myArray)
```

**Implementation:**
```typescript
first(arr: any[]): any {
    return arr.length > 0 ? arr[0] : undefined;
}

last(arr: any[]): any {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}
```

---

### 9. `array.covariance()` — P2

```typescript
covariance(arr1: number[], arr2: number[]): number {
    if (arr1.length !== arr2.length || arr1.length < 2) return NaN;
    const mean1 = arr1.reduce((s, v) => s + v, 0) / arr1.length;
    const mean2 = arr2.reduce((s, v) => s + v, 0) / arr2.length;
    let cov = 0;
    for (let i = 0; i < arr1.length; i++) {
        cov += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    return cov / (arr1.length - 1);
}
```

---

### 10. `array.percentile_linear_interpolation()` — P2

```typescript
percentile_linear_interpolation(arr: number[], percentage: number): number {
    if (arr.length === 0) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const rank = (percentage / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (rank - lower) * (sorted[upper] - sorted[lower]);
}
```

---

### 11. `array.percentile_nearest_rank()` — P2

```typescript
percentile_nearest_rank(arr: number[], percentage: number): number {
    if (arr.length === 0) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const rank = Math.ceil((percentage / 100) * sorted.length) - 1;
    return sorted[Math.max(0, rank)];
}
```

---

### 12. Drawing Object Array Types — P1

**Pine Script syntax:**
```pine
var line[] myLines = array.new_line(0)
var label[] myLabels = array.new_label(0)
var box[] myBoxes = array.new_box(0)
var table[] myTables = array.new_table(0)
```

**Implementation:**
```typescript
newLine(size?: number): any[] { return new Array(size ?? 0).fill(null); },
newLabel(size?: number): any[] { return new Array(size ?? 0).fill(null); },
newBox(size?: number): any[] { return new Array(size ?? 0).fill(null); },
newTable(size?: number): any[] { return new Array(size ?? 0).fill(null); },
newColor(size?: number, val?: string): string[] {
    return new Array(size ?? 0).fill(val ?? '');
},
```

---

### 13. Map Collection — P2

Not used in benchmark. Full implementation for completeness:

```typescript
export const mapModule = {
    new<K, V>(): Map<K, V> { return new Map(); },
    put<K, V>(m: Map<K, V>, key: K, val: V): V | undefined { ... },
    get<K, V>(m: Map<K, V>, key: K): V | undefined { ... },
    contains<K>(m: Map<K, any>, key: K): boolean { ... },
    remove<K, V>(m: Map<K, V>, key: K): V | undefined { ... },
    clear(m: Map<any, any>): void { ... },
    size(m: Map<any, any>): number { ... },
    keys<K>(m: Map<K, any>): K[] { ... },
    values<V>(m: Map<any, V>): V[] { ... },
};
```

---

### 14. Matrix Collection — P2

Not used in benchmark. Basic implementation:

```typescript
export const matrixModule = {
    new<T>(rows: number, cols: number, val?: T): T[][] { ... },
    get<T>(m: T[][], row: number, col: number): T { ... },
    set<T>(m: T[][], row: number, col: number, val: T): void { ... },
    rows<T>(m: T[][]): number { ... },
    columns<T>(m: T[][]): number { ... },
    // ... etc
};
```

---

## Function Mapper Additions

Add to `function-mapper.ts`:
```typescript
'array.shift': '__rt.array.shift',
'array.unshift': '__rt.array.unshift',
'array.median': '__rt.array.median',
'array.stdev': '__rt.array.stdev',
'array.variance': '__rt.array.variance',
'array.range': '__rt.array.range',
'array.concat': '__rt.array.concat',
'array.first': '__rt.array.first',
'array.last': '__rt.array.last',
'array.covariance': '__rt.array.covariance',
'array.percentile_linear_interpolation': '__rt.array.percentileLinearInterpolation',
'array.percentile_nearest_rank': '__rt.array.percentileNearestRank',
'array.new_line': '__rt.array.newLine',
'array.new_label': '__rt.array.newLabel',
'array.new_box': '__rt.array.newBox',
'array.new_table': '__rt.array.newTable',
'array.new_color': '__rt.array.newColor',
```

---

## Acceptance Criteria

1. `array.shift(arr)` removes and returns the first element
2. `array.unshift(arr, val)` adds element at the beginning
3. `array.median([1, 2, 3, 4, 5])` returns `3`
4. `array.median([1, 2, 3, 4])` returns `2.5`
5. `array.stdev([2, 4, 4, 4, 5, 5, 7, 9])` returns correct standard deviation
6. `array.variance()` returns correct sample variance
7. `array.range([1, 5, 3])` returns `4`
8. `array.new_line(0)` returns an empty array usable for line objects
9. All 26 existing array method tests continue to pass
10. At least 15 new tests for missing array methods
