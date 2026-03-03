import { describe, it, expect } from 'vitest';
import { arrayModule, mapModule, matrixModule } from '../src/runtime/builtins/collections';

// ─── P1 Array Methods ─────────────────────────────────────────────────────────

describe('arrayModule — P1 array methods', () => {
  // stdev
  it('stdev: population standard deviation', () => {
    const arr = [2, 4, 4, 4, 5, 5, 7, 9];
    // mean = 5, variance = (9+1+1+1+0+0+4+16)/8 = 4, stdev = 2
    expect(arrayModule.stdev(arr)).toBeCloseTo(2, 5);
  });

  it('stdev: empty array returns NaN', () => {
    expect(arrayModule.stdev([])).toBeNaN();
  });

  it('stdev: single element returns 0', () => {
    expect(arrayModule.stdev([42])).toBe(0);
  });

  // variance
  it('variance: population variance', () => {
    const arr = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(arrayModule.variance(arr)).toBeCloseTo(4, 5);
  });

  it('variance: empty array returns NaN', () => {
    expect(arrayModule.variance([])).toBeNaN();
  });

  // range
  it('range: max - min', () => {
    expect(arrayModule.range([1, 5, 3, 2])).toBe(4);
  });

  it('range: single element returns 0', () => {
    expect(arrayModule.range([7])).toBe(0);
  });

  it('range: empty array returns NaN', () => {
    expect(arrayModule.range([])).toBeNaN();
  });

  // concat
  it('concat: concatenates two arrays into a new one', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const result = arrayModule.concat(a, b);
    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    // original arrays should be unchanged
    expect(a).toEqual([1, 2, 3]);
    expect(b).toEqual([4, 5, 6]);
  });

  it('concat: works with empty arrays', () => {
    expect(arrayModule.concat([], [1, 2])).toEqual([1, 2]);
    expect(arrayModule.concat([1, 2], [])).toEqual([1, 2]);
    expect(arrayModule.concat([], [])).toEqual([]);
  });

  // first / last
  it('first: returns first element', () => {
    expect(arrayModule.first([10, 20, 30])).toBe(10);
  });

  it('first: returns undefined for empty array', () => {
    expect(arrayModule.first([])).toBeUndefined();
  });

  it('last: returns last element', () => {
    expect(arrayModule.last([10, 20, 30])).toBe(30);
  });

  it('last: returns undefined for empty array', () => {
    expect(arrayModule.last([])).toBeUndefined();
  });

  // array.new_color / new_line / new_label / new_box / new_table
  it('newColor: creates array of given size filled with null', () => {
    const arr = arrayModule.newColor(3);
    expect(arr.length).toBe(3);
    expect(arr[0]).toBeNull();
  });

  it('newColor: uses provided default value', () => {
    const arr = arrayModule.newColor(2, '#ff0000');
    expect(arr).toEqual(['#ff0000', '#ff0000']);
  });

  it('newLine: creates empty array for size <= 0', () => {
    expect(arrayModule.newLine(0)).toEqual([]);
  });

  it('newLine: creates array of given size', () => {
    const arr = arrayModule.newLine(4);
    expect(arr.length).toBe(4);
  });

  it('newLabel: creates array of given size', () => {
    const arr = arrayModule.newLabel(2, 'x');
    expect(arr).toEqual(['x', 'x']);
  });

  it('newBox: creates array of given size', () => {
    const arr = arrayModule.newBox(3);
    expect(arr.length).toBe(3);
  });

  it('newTable: creates array of given size', () => {
    const arr = arrayModule.newTable(5);
    expect(arr.length).toBe(5);
  });
});

// ─── P2 Array Methods ─────────────────────────────────────────────────────────

describe('arrayModule — P2 array methods', () => {
  // covariance
  it('covariance: computes population covariance', () => {
    // two identical arrays -> covariance = variance
    const arr = [2, 4, 4, 4, 5, 5, 7, 9];
    const cov = arrayModule.covariance(arr, arr);
    const vari = arrayModule.variance(arr);
    expect(cov).toBeCloseTo(vari, 5);
  });

  it('covariance: uncorrelated arrays have covariance near 0', () => {
    const a = [1, 2, 3, 4];
    const b = [4, 3, 2, 1];
    // perfectly negatively correlated -> covariance = -variance
    expect(arrayModule.covariance(a, b)).toBeLessThan(0);
  });

  it('covariance: empty arrays return NaN', () => {
    expect(arrayModule.covariance([], [])).toBeNaN();
  });

  // percentile_linear_interpolation
  it('percentileLinearInterpolation: 50th percentile of [1,2,3,4,5] is 3', () => {
    expect(arrayModule.percentileLinearInterpolation([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('percentileLinearInterpolation: 0th percentile is min', () => {
    expect(arrayModule.percentileLinearInterpolation([5, 3, 1, 4, 2], 0)).toBe(1);
  });

  it('percentileLinearInterpolation: 100th percentile is max', () => {
    expect(arrayModule.percentileLinearInterpolation([5, 3, 1, 4, 2], 100)).toBe(5);
  });

  // percentile_nearest_rank
  it('percentileNearestRank: 50th percentile of [1,2,3,4,5]', () => {
    const result = arrayModule.percentileNearestRank([1, 2, 3, 4, 5], 50);
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(3);
  });

  it('percentileNearestRank: empty array returns NaN', () => {
    expect(arrayModule.percentileNearestRank([], 50)).toBeNaN();
  });

  // abs (in-place equivalent — returns new array in this implementation)
  it('abs: returns absolute values', () => {
    expect(arrayModule.abs([-1, -2, 3, -4])).toEqual([1, 2, 3, 4]);
  });

  it('abs: empty array returns empty', () => {
    expect(arrayModule.abs([])).toEqual([]);
  });

  // binary_search
  it('binarySearch: finds exact match', () => {
    expect(arrayModule.binarySearch([1, 2, 3, 4, 5], 3)).toBe(2);
  });

  it('binarySearch: returns -1 when not found', () => {
    expect(arrayModule.binarySearch([1, 2, 4, 5], 3)).toBe(-1);
  });

  it('binarySearchLeftmost: returns leftmost insertion index', () => {
    expect(arrayModule.binarySearchLeftmost([1, 2, 2, 3], 2)).toBe(1);
  });

  it('binarySearchRightmost: returns rightmost insertion index', () => {
    expect(arrayModule.binarySearchRightmost([1, 2, 2, 3], 2)).toBe(2);
  });

  // every / some
  it('every: returns true when all pass', () => {
    expect(arrayModule.every([2, 4, 6], v => v % 2 === 0)).toBe(true);
  });

  it('every: returns false when any fails', () => {
    expect(arrayModule.every([2, 3, 6], v => v % 2 === 0)).toBe(false);
  });

  it('some: returns true when any passes', () => {
    expect(arrayModule.some([1, 3, 4], v => v % 2 === 0)).toBe(true);
  });

  it('some: returns false when none pass', () => {
    expect(arrayModule.some([1, 3, 5], v => v % 2 === 0)).toBe(false);
  });

  // sortIndices
  it('sortIndices: returns sorted indices ascending', () => {
    expect(arrayModule.sortIndices([3, 1, 2])).toEqual([1, 2, 0]);
  });

  it('sortIndices: returns sorted indices descending', () => {
    expect(arrayModule.sortIndices([3, 1, 2], 'desc')).toEqual([0, 2, 1]);
  });
});

// ─── Map Module ───────────────────────────────────────────────────────────────

describe('mapModule', () => {
  it('new: creates an empty Map', () => {
    const m = mapModule.new<string, number>();
    expect(m instanceof Map).toBe(true);
    expect(mapModule.size(m)).toBe(0);
  });

  it('put: inserts a key-value pair', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'a', 1);
    expect(mapModule.get(m, 'a')).toBe(1);
  });

  it('put: returns previous value when key existed', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'a', 1);
    const prev = mapModule.put(m, 'a', 2);
    expect(prev).toBe(1);
    expect(mapModule.get(m, 'a')).toBe(2);
  });

  it('put: returns undefined for new key', () => {
    const m = mapModule.new<string, number>();
    const prev = mapModule.put(m, 'x', 42);
    expect(prev).toBeUndefined();
  });

  it('get: returns undefined for missing key', () => {
    const m = mapModule.new<string, number>();
    expect(mapModule.get(m, 'missing')).toBeUndefined();
  });

  it('contains: returns true for existing key', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'k', 10);
    expect(mapModule.contains(m, 'k')).toBe(true);
  });

  it('contains: returns false for missing key', () => {
    const m = mapModule.new<string, number>();
    expect(mapModule.contains(m, 'k')).toBe(false);
  });

  it('remove: removes a key and returns its value', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'r', 99);
    const val = mapModule.remove(m, 'r');
    expect(val).toBe(99);
    expect(mapModule.contains(m, 'r')).toBe(false);
  });

  it('remove: returns undefined for missing key', () => {
    const m = mapModule.new<string, number>();
    expect(mapModule.remove(m, 'missing')).toBeUndefined();
  });

  it('clear: removes all entries', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'a', 1);
    mapModule.put(m, 'b', 2);
    mapModule.clear(m);
    expect(mapModule.size(m)).toBe(0);
  });

  it('size: returns number of entries', () => {
    const m = mapModule.new<string, number>();
    expect(mapModule.size(m)).toBe(0);
    mapModule.put(m, 'a', 1);
    expect(mapModule.size(m)).toBe(1);
    mapModule.put(m, 'b', 2);
    expect(mapModule.size(m)).toBe(2);
  });

  it('keys: returns array of all keys', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'a', 1);
    mapModule.put(m, 'b', 2);
    const keys = mapModule.keys(m);
    expect(keys.sort()).toEqual(['a', 'b']);
  });

  it('values: returns array of all values', () => {
    const m = mapModule.new<string, number>();
    mapModule.put(m, 'a', 10);
    mapModule.put(m, 'b', 20);
    const vals = mapModule.values(m);
    expect(vals.sort((a, b) => a - b)).toEqual([10, 20]);
  });

  it('supports numeric keys', () => {
    const m = mapModule.new<number, string>();
    mapModule.put(m, 1, 'one');
    mapModule.put(m, 2, 'two');
    expect(mapModule.get(m, 1)).toBe('one');
    expect(mapModule.get(m, 2)).toBe('two');
    expect(mapModule.size(m)).toBe(2);
  });
});

// ─── Matrix Module ────────────────────────────────────────────────────────────

describe('matrixModule', () => {
  it('new: creates matrix with correct dimensions', () => {
    const m = matrixModule.new(3, 4, 0);
    expect(matrixModule.rows(m)).toBe(3);
    expect(matrixModule.columns(m)).toBe(4);
  });

  it('new: fills with default value', () => {
    const m = matrixModule.new(2, 3, 7);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        expect(matrixModule.get(m, r, c)).toBe(7);
      }
    }
  });

  it('new: default fill value is 0', () => {
    const m = matrixModule.new(2, 2);
    expect(matrixModule.get(m, 0, 0)).toBe(0);
  });

  it('get/set: sets and retrieves a value', () => {
    const m = matrixModule.new(3, 3, 0);
    matrixModule.set(m, 1, 2, 42);
    expect(matrixModule.get(m, 1, 2)).toBe(42);
    // Other cells unchanged
    expect(matrixModule.get(m, 0, 0)).toBe(0);
  });

  it('get: returns undefined for out-of-bounds access', () => {
    const m = matrixModule.new(2, 2, 0);
    expect(matrixModule.get(m, 5, 0)).toBeUndefined();
    expect(matrixModule.get(m, 0, 5)).toBeUndefined();
    expect(matrixModule.get(m, -1, 0)).toBeUndefined();
  });

  it('set: out-of-bounds set does not throw', () => {
    const m = matrixModule.new(2, 2, 0);
    expect(() => matrixModule.set(m, 10, 10, 99)).not.toThrow();
    // Dimensions unchanged
    expect(matrixModule.rows(m)).toBe(2);
    expect(matrixModule.columns(m)).toBe(2);
  });

  it('rows / columns: return correct dimensions', () => {
    const m = matrixModule.new(4, 5, 0);
    expect(matrixModule.rows(m)).toBe(4);
    expect(matrixModule.columns(m)).toBe(5);
  });

  it('addRow: adds a row at the given index', () => {
    const m = matrixModule.new(2, 3, 0);
    matrixModule.set(m, 0, 0, 1);
    matrixModule.set(m, 1, 0, 3);
    // Insert row with value 9 at index 1
    matrixModule.addRow(m, 1, 9);
    expect(matrixModule.rows(m)).toBe(3);
    expect(matrixModule.get(m, 0, 0)).toBe(1);   // original row 0
    expect(matrixModule.get(m, 1, 0)).toBe(9);   // new row
    expect(matrixModule.get(m, 2, 0)).toBe(3);   // original row 1 shifted
  });

  it('addRow: appends at end when index equals rows', () => {
    const m = matrixModule.new(2, 2, 0);
    matrixModule.addRow(m, 2, 5);
    expect(matrixModule.rows(m)).toBe(3);
    expect(matrixModule.get(m, 2, 0)).toBe(5);
    expect(matrixModule.get(m, 2, 1)).toBe(5);
  });

  it('addRow: supports array of values', () => {
    const m = matrixModule.new(1, 3, 0);
    matrixModule.addRow(m, 1, [7, 8, 9]);
    expect(matrixModule.get(m, 1, 0)).toBe(7);
    expect(matrixModule.get(m, 1, 1)).toBe(8);
    expect(matrixModule.get(m, 1, 2)).toBe(9);
  });

  it('addCol: adds a column at the given index', () => {
    const m = matrixModule.new(2, 2, 0);
    matrixModule.set(m, 0, 0, 1); matrixModule.set(m, 0, 1, 2);
    matrixModule.set(m, 1, 0, 3); matrixModule.set(m, 1, 1, 4);
    matrixModule.addCol(m, 1, 9);
    expect(matrixModule.columns(m)).toBe(3);
    expect(matrixModule.get(m, 0, 0)).toBe(1);
    expect(matrixModule.get(m, 0, 1)).toBe(9);   // new col
    expect(matrixModule.get(m, 0, 2)).toBe(2);   // old col 1 shifted
  });

  it('addCol: supports array of values', () => {
    const m = matrixModule.new(2, 2, 0);
    matrixModule.addCol(m, 2, [10, 20]);
    expect(matrixModule.get(m, 0, 2)).toBe(10);
    expect(matrixModule.get(m, 1, 2)).toBe(20);
  });

  it('removeRow: removes a row and returns it', () => {
    const m = matrixModule.new(3, 2, 0);
    matrixModule.set(m, 0, 0, 1);
    matrixModule.set(m, 1, 0, 2);
    matrixModule.set(m, 2, 0, 3);
    const removed = matrixModule.removeRow(m, 1);
    expect(removed).not.toBeUndefined();
    expect(removed![0]).toBe(2);
    expect(matrixModule.rows(m)).toBe(2);
    expect(matrixModule.get(m, 0, 0)).toBe(1);
    expect(matrixModule.get(m, 1, 0)).toBe(3);
  });

  it('removeRow: returns undefined for out-of-bounds', () => {
    const m = matrixModule.new(2, 2, 0);
    expect(matrixModule.removeRow(m, 5)).toBeUndefined();
    expect(matrixModule.rows(m)).toBe(2);
  });

  it('removeCol: removes a column and returns its values', () => {
    const m = matrixModule.new(2, 3, 0);
    matrixModule.set(m, 0, 0, 1); matrixModule.set(m, 0, 1, 2); matrixModule.set(m, 0, 2, 3);
    matrixModule.set(m, 1, 0, 4); matrixModule.set(m, 1, 1, 5); matrixModule.set(m, 1, 2, 6);
    const removed = matrixModule.removeCol(m, 1);
    expect(removed).toEqual([2, 5]);
    expect(matrixModule.columns(m)).toBe(2);
    expect(matrixModule.get(m, 0, 0)).toBe(1);
    expect(matrixModule.get(m, 0, 1)).toBe(3);
  });

  it('removeCol: returns undefined for out-of-bounds', () => {
    const m = matrixModule.new(2, 2, 0);
    expect(matrixModule.removeCol(m, 5)).toBeUndefined();
    expect(matrixModule.columns(m)).toBe(2);
  });

  it('supports string values', () => {
    const m = matrixModule.new<string>(2, 2, '');
    matrixModule.set(m, 0, 0, 'hello');
    matrixModule.set(m, 1, 1, 'world');
    expect(matrixModule.get(m, 0, 0)).toBe('hello');
    expect(matrixModule.get(m, 1, 1)).toBe('world');
    expect(matrixModule.get(m, 0, 1)).toBe('');
  });

  it('multiple operations: set, get, addRow, removeRow in sequence', () => {
    const m = matrixModule.new(2, 2, 0);
    matrixModule.set(m, 0, 0, 10);
    matrixModule.set(m, 0, 1, 20);
    matrixModule.set(m, 1, 0, 30);
    matrixModule.set(m, 1, 1, 40);

    // Add row at top
    matrixModule.addRow(m, 0, 1);
    expect(matrixModule.rows(m)).toBe(3);
    expect(matrixModule.get(m, 0, 0)).toBe(1);
    expect(matrixModule.get(m, 1, 0)).toBe(10);

    // Remove top row
    const removed = matrixModule.removeRow(m, 0);
    expect(removed![0]).toBe(1);
    expect(matrixModule.rows(m)).toBe(2);
    expect(matrixModule.get(m, 0, 0)).toBe(10);
  });
});
