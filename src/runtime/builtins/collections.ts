// Pine Script v6 array built-in functions

export const arrayModule = {
  /** Create a new float (number) array. */
  newFloat(size?: number, val?: number): number[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? 0);
  },

  /** Create a new int (number) array. */
  newInt(size?: number, val?: number): number[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? 0);
  },

  /** Create a new boolean array. */
  newBool(size?: number, val?: boolean): boolean[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? false);
  },

  /** Create a new string array. */
  newString(size?: number, val?: string): string[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? '');
  },

  /** Generic new array. */
  new(size?: number, val?: any): any[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? null);
  },

  /** Push a value onto the end of the array. */
  push(arr: any[], val: any): void {
    arr.push(val);
  },

  /** Remove and return the last element. */
  pop(arr: any[]): any {
    if (arr.length === 0) return undefined;
    return arr.pop();
  },

  /** Get the element at the given index. */
  get(arr: any[], index: number): any {
    if (index < 0 || index >= arr.length) return undefined;
    return arr[index];
  },

  /** Set the element at the given index. */
  set(arr: any[], index: number, val: any): void {
    if (index >= 0 && index < arr.length) {
      arr[index] = val;
    }
  },

  /** Return the size (length) of the array. */
  size(arr: any[]): number {
    return arr.length;
  },

  /** Return the sum of all elements in a numeric array. */
  sum(arr: number[]): number {
    if (arr.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      total += arr[i];
    }
    return total;
  },

  /** Return the average of all elements in a numeric array. */
  avg(arr: number[]): number {
    if (arr.length === 0) return NaN;
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      total += arr[i];
    }
    return total / arr.length;
  },

  /** Return the maximum value in a numeric array. */
  max(arr: number[]): number {
    if (arr.length === 0) return NaN;
    let m = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > m) m = arr[i];
    }
    return m;
  },

  /** Return the minimum value in a numeric array. */
  min(arr: number[]): number {
    if (arr.length === 0) return NaN;
    let m = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < m) m = arr[i];
    }
    return m;
  },

  /** Insert a value at the given index, shifting elements right. */
  insert(arr: any[], index: number, val: any): void {
    arr.splice(index, 0, val);
  },

  /** Remove and return the element at the given index. */
  remove(arr: any[], index: number): any {
    if (index < 0 || index >= arr.length) return undefined;
    return arr.splice(index, 1)[0];
  },

  /** Remove all elements from the array. */
  clear(arr: any[]): void {
    arr.length = 0;
  },

  /** Return a shallow copy of the array. */
  copy(arr: any[]): any[] {
    return arr.slice();
  },

  /** Reverse the array in place. */
  reverse(arr: any[]): void {
    arr.reverse();
  },

  /**
   * Sort the array in place.
   * @param order - 'asc' (default) or 'desc'
   */
  sort(arr: any[], order?: string): void {
    const dir = order === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      if (a < b) return -1 * dir;
      if (a > b) return 1 * dir;
      return 0;
    });
  },

  /** Join all elements into a string with the given separator. */
  join(arr: any[], sep?: string): string {
    return arr.join(sep ?? ', ');
  },

  /** Return a shallow copy of a portion of the array. */
  slice(arr: any[], start: number, end?: number): any[] {
    if (end === undefined) return arr.slice(start);
    return arr.slice(start, end);
  },

  /** Check if the array contains a given value. */
  includes(arr: any[], val: any): boolean {
    return arr.includes(val);
  },

  /** Return the index of the first occurrence of val, or -1. */
  indexof(arr: any[], val: any): number {
    return arr.indexOf(val);
  },

  /** Return the index of the last occurrence of val, or -1. */
  lastindexof(arr: any[], val: any): number {
    return arr.lastIndexOf(val);
  },

  /** Create an array from the given values. */
  from(...vals: any[]): any[] {
    return [...vals];
  },

  /** Remove and return the first element. */
  shift(arr: any[]): any {
    if (arr.length === 0) return undefined;
    return arr.shift();
  },

  /** Add element(s) to the beginning. */
  unshift(arr: any[], val: any): void {
    arr.unshift(val);
  },

  /** Return the median of a numeric array. */
  median(arr: number[]): number {
    if (arr.length === 0) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  /** Return the standard deviation. */
  stdev(arr: number[]): number {
    if (arr.length === 0) return NaN;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sqDiffs = arr.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
  },

  /** Return the variance. */
  variance(arr: number[]): number {
    if (arr.length === 0) return NaN;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / arr.length;
  },

  /** Return the range (max - min). */
  range(arr: number[]): number {
    if (arr.length === 0) return NaN;
    let lo = arr[0], hi = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < lo) lo = arr[i];
      if (arr[i] > hi) hi = arr[i];
    }
    return hi - lo;
  },

  /** Return the first element. */
  first(arr: any[]): any {
    return arr.length > 0 ? arr[0] : undefined;
  },

  /** Return the last element. */
  last(arr: any[]): any {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
  },

  /** Concatenate two arrays into a new one. */
  concat(arr1: any[], arr2: any[]): any[] {
    return arr1.concat(arr2);
  },

  /** Create a new line array. */
  newLine(size?: number, val?: any): any[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? null);
  },

  /** Create a new label array. */
  newLabel(size?: number, val?: any): any[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? null);
  },

  /** Create a new box array. */
  newBox(size?: number, val?: any): any[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? null);
  },

  /** Create a new table array. */
  newTable(size?: number, val?: any): any[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? null);
  },

  /** Create a new color array. */
  newColor(size?: number, val?: any): any[] {
    if (size === undefined || size <= 0) return [];
    return new Array(size).fill(val ?? null);
  },

  /** Return absolute values of all elements. */
  abs(arr: number[]): number[] {
    return arr.map(v => Math.abs(v));
  },

  /** Binary search (array must be sorted). Returns index. */
  binarySearch(arr: number[], val: number): number {
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] === val) return mid;
      if (arr[mid] < val) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  },

  binarySearchLeftmost(arr: number[], val: number): number {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < val) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  },

  binarySearchRightmost(arr: number[], val: number): number {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= val) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  },

  /** Test if all elements pass a condition function. */
  every(arr: any[], fn: (val: any) => boolean): boolean {
    return arr.every(fn);
  },

  /** Test if any element passes a condition function. */
  some(arr: any[], fn: (val: any) => boolean): boolean {
    return arr.some(fn);
  },

  /** Fill array with a value. */
  fill(arr: any[], val: any, fromIndex?: number, toIndex?: number): void {
    arr.fill(val, fromIndex ?? 0, toIndex ?? arr.length);
  },

  /** Compute covariance between two arrays. */
  covariance(arr1: number[], arr2: number[]): number {
    const n = Math.min(arr1.length, arr2.length);
    if (n === 0) return NaN;
    const mean1 = arr1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = arr2.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    return sum / n;
  },

  /** Return the mode (most common value). */
  mode(arr: number[]): number {
    if (arr.length === 0) return NaN;
    const counts = new Map<number, number>();
    for (const v of arr) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    let best = arr[0], bestCount = 0;
    for (const [v, c] of counts) {
      if (c > bestCount) { best = v; bestCount = c; }
    }
    return best;
  },

  /** Percentile using linear interpolation. */
  percentileLinearInterpolation(arr: number[], pct: number): number {
    if (arr.length === 0) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const idx = (pct / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  },

  /** Percentile using nearest rank. */
  percentileNearestRank(arr: number[], pct: number): number {
    if (arr.length === 0) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const idx = Math.ceil((pct / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  },

  /** Percent rank of value within array. */
  percentrank(arr: number[], val: number): number {
    if (arr.length === 0) return NaN;
    let count = 0;
    for (const v of arr) {
      if (v <= val) count++;
    }
    return (count / arr.length) * 100;
  },

  /** Standardize array (z-score). */
  standardize(arr: number[]): number[] {
    if (arr.length === 0) return [];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / arr.length);
    if (std === 0) return arr.map(() => 0);
    return arr.map(v => (v - mean) / std);
  },
};
