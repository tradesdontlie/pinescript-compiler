import { NA, isNa } from '../types/na';
import { Series } from '../types/series';

export const math = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: (x: number, precision?: number): number => {
    if (precision === undefined || precision === 0) return Math.round(x);
    const factor = Math.pow(10, precision);
    return Math.round(x * factor) / factor;
  },
  max: (...args: number[]) => Math.max(...args),
  min: (...args: number[]) => Math.min(...args),
  pow: Math.pow,
  sqrt: Math.sqrt,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  sign: Math.sign,

  /**
   * math.avg(...values) — variadic average; NA values are excluded from sum and count.
   */
  avg: (...args: (number | typeof NA)[]): number => {
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

  /**
   * math.sum(source, length) — rolling sum of last `length` bars.
   * Any NA in the window propagates NA.
   * Also supports variadic form math.sum(a, b, c) for backward compatibility.
   */
  sum: (sourceOrFirst: Series<number> | number, lengthOrRest?: number, ...rest: number[]): number => {
    // If first arg is a Series, treat as rolling sum
    if (sourceOrFirst !== null && typeof sourceOrFirst === 'object' && typeof (sourceOrFirst as any).get === 'function') {
      const source = sourceOrFirst as Series<number>;
      const length = lengthOrRest as number;
      if (source.length < length) return NA as unknown as number;
      let total = 0;
      for (let i = 0; i < length; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        total += v as number;
      }
      return total;
    }
    // Variadic numeric form: sum(a, b, c, ...)
    let total = sourceOrFirst as number;
    if (lengthOrRest !== undefined) total += lengthOrRest;
    for (const v of rest) total += v;
    return total;
  },

  // Trig functions
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,

  // Degree / radian conversion
  todegrees: (rad: number): number => rad * (180 / Math.PI),
  toradians: (deg: number): number => deg * (Math.PI / 180),

  // Random
  random: (): number => Math.random(),

  // Round to minimum tick (default mintick = 0.01)
  round_to_mintick: (x: number): number => Math.round(x * 100) / 100,

  // Constants
  pi: Math.PI,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2,
  rphi: 2 / (1 + Math.sqrt(5)),  // 1/phi = 0.618...
};
