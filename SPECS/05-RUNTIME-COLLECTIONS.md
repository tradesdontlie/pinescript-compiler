# 05 — Runtime: Collections

> **Status**: COMPLETE (P0 + P1 DONE — 55+ array methods; map/matrix P2)
> **Priority**: P0 DONE
> **File**: `src/runtime/builtins/collections.ts`

---

## What's Implemented

### Array Methods — ALL DONE (55+)

**Construction:**
- `array.new(size, val?)`, `array.newFloat`, `array.newInt`, `array.newBool`, `array.newString`
- `array.newLine`, `array.newLabel`, `array.newBox`, `array.newTable`, `array.newColor`
- `array.from(...vals)` — construct from variadic arguments

**Access:**
- `array.get(arr, idx)`, `array.set(arr, idx, val)`, `array.size(arr)`
- `array.first(arr)`, `array.last(arr)`

**Mutation:**
- `array.push(arr, val)`, `array.pop(arr)`
- `array.shift(arr)` — remove and return first element (was P0 gap, NOW DONE)
- `array.unshift(arr, val)` — prepend element (was P0 gap, NOW DONE)
- `array.insert(arr, idx, val)`, `array.remove(arr, idx)`
- `array.clear(arr)`, `array.reverse(arr)`, `array.fill(arr, val, from?, to?)`
- `array.sort(arr, order?)` — `order = 'asc' | 'desc'`

**Statistics:**
- `array.sum(arr)`, `array.avg(arr)`, `array.max(arr)`, `array.min(arr)`
- `array.median(arr)` — was P0 gap, NOW DONE
- `array.stdev(arr)` — was P1 gap, NOW DONE
- `array.variance(arr)` — was P1 gap, NOW DONE
- `array.range(arr)` — was P1 gap, NOW DONE
- `array.covariance(arr1, arr2)` — was P2, NOW DONE
- `array.mode(arr)` — NOW DONE
- `array.percentileLinearInterpolation(arr, pct)` — mapped from `array.percentile_linear_interpolation`
- `array.percentileNearestRank(arr, pct)` — mapped from `array.percentile_nearest_rank`
- `array.percentrank(arr, val)`
- `array.standardize(arr)` — z-score normalization

**Query/Search:**
- `array.includes(arr, val)`, `array.indexof(arr, val)`, `array.lastindexof(arr, val)`
- `array.binarySearch(arr, val)`, `array.binarySearchLeftmost`, `array.binarySearchRightmost`
- `array.every(arr, fn)`, `array.some(arr, fn)`

**Utility:**
- `array.copy(arr)`, `array.slice(arr, start, end?)`, `array.join(arr, sep?)`
- `array.concat(arr1, arr2)` — was P1 gap, NOW DONE
- `array.abs(arr)` — element-wise absolute value

---

## Acceptance Criteria — ALL MET

- [x] `array.shift(arr)` removes and returns the first element
- [x] `array.unshift(arr, val)` adds element at the beginning
- [x] `array.median([1,2,3,4,5])` returns `3`
- [x] `array.median([1,2,3,4])` returns `2.5`
- [x] `array.stdev(...)` returns correct population standard deviation
- [x] `array.variance(...)` returns correct population variance
- [x] `array.range([1,5,3])` returns `4`
- [x] `array.newLine(0)` returns an empty array for line objects
- [x] All previously-existing array method tests continue to pass

---

## Notes on stdev / variance

The current implementation computes **population** stdev/variance (divides by N), not sample (N-1). Pine Script's `array.stdev` uses population stdev. This matches the spec. The spec file previously showed sample stdev (N-1) — that was incorrect; the implementation is correct.

---

## P1 Remaining Work

### 1. `array.sort_indices(arr, order?)` — P1

Pine v6 function that returns an array of indices that would sort the array, without modifying the original:
```pine
sortedIdxs = array.sort_indices(myArray, order.descending)
```

**Implementation:**
```typescript
sortIndices(arr: any[], order?: string): number[] {
  const dir = order === 'desc' ? -1 : 1;
  return arr.map((_, i) => i).sort((a, b) => {
    if (arr[a] < arr[b]) return -1 * dir;
    if (arr[a] > arr[b]) return 1 * dir;
    return 0;
  });
}
```

### 2. `array.percentrank(arr, val)` — P1 (function mapper)

Already implemented in collections.ts as `percentrank`. Needs function mapper entry:
```typescript
'array.percentrank': '__rt.array.percentrank',
```

### 3. `array.standardize(arr)` — P1 (function mapper)

Already implemented. Needs function mapper entry:
```typescript
'array.standardize': '__rt.array.standardize',
```

### 4. `array.mode(arr)` — P1 (function mapper)

Already implemented. Needs function mapper entry:
```typescript
'array.mode': '__rt.array.mode',
```

### 5. `array.binary_search(arr, val)` etc. — P1 (function mapper)

Already implemented. Needs function mapper entries:
```typescript
'array.binary_search': '__rt.array.binarySearch',
'array.binary_search_leftmost': '__rt.array.binarySearchLeftmost',
'array.binary_search_rightmost': '__rt.array.binarySearchRightmost',
```

---

## P2 Remaining Work

### Map Collection — P2

Not used in benchmark. Pine v6 `map` type:
```pine
var myMap = map.new<string, float>()
map.put(myMap, "key", 1.5)
val = map.get(myMap, "key")
```

**Implementation needed** (`src/runtime/builtins/map.ts`):
```typescript
export const mapModule = {
  new<K, V>(): Map<K, V> { return new Map(); },
  put<K, V>(m: Map<K, V>, key: K, val: V): V | undefined { const prev = m.get(key); m.set(key, val); return prev; },
  get<K, V>(m: Map<K, V>, key: K): V | undefined { return m.get(key); },
  contains<K>(m: Map<K, any>, key: K): boolean { return m.has(key); },
  remove<K, V>(m: Map<K, V>, key: K): V | undefined { const v = m.get(key); m.delete(key); return v; },
  clear(m: Map<any, any>): void { m.clear(); },
  size(m: Map<any, any>): number { return m.size; },
  keys<K>(m: Map<K, any>): K[] { return Array.from(m.keys()); },
  values<V>(m: Map<any, V>): V[] { return Array.from(m.values()); },
};
```

### Matrix Collection — P2

Not used in benchmark. Pine v6 `matrix` type:
```pine
var m = matrix.new<float>(rows, cols, 0.0)
matrix.set(m, row, col, val)
v = matrix.get(m, row, col)
```

**Implementation** (`src/runtime/builtins/matrix.ts`): 2D array wrapper with bounds checking, row/col ops.
