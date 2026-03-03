// Pine Script v6 timeframe built-in module

export interface TimeframeInfo {
  period: string;
  multiplier: number;
  isdwm: boolean;
  isintraday: boolean;
  isminutes: boolean;
  ishours: boolean;
  isdaily: boolean;
  isweekly: boolean;
  ismonthly: boolean;
  in_seconds: (tf?: string) => number;
}

/**
 * Convert a timeframe period string to its duration in seconds.
 *
 * - Numeric strings (e.g. "1", "5", "60") are treated as minutes.
 * - "D" → 86 400  (1 day)
 * - "W" → 604 800 (7 days)
 * - "M" → 2 592 000 (30 days, Pine convention)
 *
 * @param tf  Period string.  If omitted the caller should supply a default.
 */
export function inSeconds(tf: string): number {
  if (tf === 'D') return 86400;
  if (tf === 'W') return 604800;
  if (tf === 'M') return 2592000;

  const num = parseInt(tf, 10);
  if (!isNaN(num)) {
    return num * 60; // numeric periods are minutes
  }

  // Unknown format — fall back to daily
  return 86400;
}

/**
 * Create a timeframe info object from a period string.
 *
 * Period string conventions (Pine Script):
 *   - "1", "5", "15", "60", "240" — intraday minute-based
 *   - "D" — daily
 *   - "W" — weekly
 *   - "M" — monthly
 *
 * Minutes < 60 are classified as isminutes; >= 60 as ishours.
 */
export function createTimeframe(periodStr?: string): TimeframeInfo {
  const period = periodStr ?? 'D';

  const isDWM = period === 'D' || period === 'W' || period === 'M';
  const isNumeric = /^\d+$/.test(period);
  const numericValue = isNumeric ? parseInt(period, 10) : 0;

  let multiplier = 1;
  if (isNumeric) {
    multiplier = numericValue;
  }

  return {
    period,
    multiplier,
    isdwm: isDWM,
    isintraday: !isDWM,
    isminutes: isNumeric && numericValue < 60,
    ishours: isNumeric && numericValue >= 60,
    isdaily: period === 'D',
    isweekly: period === 'W',
    ismonthly: period === 'M',
    in_seconds(tf?: string): number {
      return inSeconds(tf ?? period);
    },
  };
}
