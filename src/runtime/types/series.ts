import { NA, NaType, isNa } from './na';

export class Series<T> {
  private buffer: T[];
  private head: number = 0;
  private _length: number = 0;
  private maxLookback: number;

  constructor(maxLookback: number = 500) {
    this.maxLookback = maxLookback;
    this.buffer = new Array(maxLookback).fill(NA as unknown as T);
  }

  push(value: T): void {
    this.head = (this.head + 1) % this.maxLookback;
    this.buffer[this.head] = value;
    if (this._length < this.maxLookback) {
      this._length++;
    }
  }

  get(barsBack: number = 0): T {
    if (barsBack < 0 || barsBack >= this._length) {
      return NA as unknown as T;
    }
    const idx = ((this.head - barsBack) % this.maxLookback + this.maxLookback) % this.maxLookback;
    return this.buffer[idx];
  }

  set(value: T): void {
    this.buffer[this.head] = value;
  }

  get length(): number {
    return this._length;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = this._length - 1; i >= 0; i--) {
      result.push(this.get(i));
    }
    return result;
  }

  // Allow Series<number> to be used in arithmetic contexts
  // JavaScript calls valueOf() for +, -, *, /, comparisons, etc.
  valueOf(): T {
    return this.get(0);
  }

  // String coercion
  toString(): string {
    return String(this.get(0));
  }
}
