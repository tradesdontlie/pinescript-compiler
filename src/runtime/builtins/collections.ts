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
};
