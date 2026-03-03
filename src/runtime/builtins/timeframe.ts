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
  };
}
