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
  avg: (...args: number[]): number => {
    if (args.length === 0) return 0;
    return args.reduce((sum, v) => sum + v, 0) / args.length;
  },
  sum: (...args: number[]): number => args.reduce((sum, v) => sum + v, 0),

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
