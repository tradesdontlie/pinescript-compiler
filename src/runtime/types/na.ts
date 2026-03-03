export const NA: unique symbol = Symbol('na');
export type NaType = typeof NA;

export function isNa(val: unknown): boolean {
  return val === NA || val === null || val === undefined || (typeof val === 'number' && isNaN(val));
}

export function nz(val: unknown, replacement: number = 0): number {
  if (isNa(val)) return replacement;
  return val as number;
}

let _lastNonNa: number | typeof NA = NA;
export function fixnan(val: unknown): number | typeof NA {
  if (!isNa(val)) {
    _lastNonNa = val as number;
    return val as number;
  }
  return _lastNonNa;
}

export function naAdd(a: unknown, b: unknown): number | typeof NA {
  if (isNa(a) || isNa(b)) return NA;
  return (a as number) + (b as number);
}

export function naSub(a: unknown, b: unknown): number | typeof NA {
  if (isNa(a) || isNa(b)) return NA;
  return (a as number) - (b as number);
}

export function naMul(a: unknown, b: unknown): number | typeof NA {
  if (isNa(a) || isNa(b)) return NA;
  return (a as number) * (b as number);
}

export function naDiv(a: unknown, b: unknown): number | typeof NA {
  if (isNa(a) || isNa(b)) return NA;
  const divisor = b as number;
  if (divisor === 0) return NA;
  return (a as number) / divisor;
}
