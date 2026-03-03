/**
 * P1 tests for remaining time functions and string functions.
 *
 * Covers:
 * - weekofyear(ts?, tz?)
 * - timeInSession(timeframe?, session?, timezone?)
 * - str.repeat(s, count)
 * - str.match returning matched string (not boolean)
 * - str.tostring named format specifiers (format.mintick, format.volume, format.percent)
 */

import { describe, it, expect } from 'vitest';
import { createTimeFunctions } from '../src/runtime/builtins/time-functions';
import { str } from '../src/runtime/builtins/str';
import { NA, isNa } from '../src/runtime/types/na';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 2024-01-15 12:30:45 UTC = Monday */
const TS_2024_01_15_12_30_45 = Date.UTC(2024, 0, 15, 12, 30, 45); // 1705319445000

/** 2024-03-04 09:30:00 UTC (Monday, NYSE open) */
const TS_2024_03_04_09_30 = Date.UTC(2024, 2, 4, 9, 30, 0);

/** 2024-01-01 00:00:00 UTC (Monday, Jan 1 — ISO week 1) */
const TS_2024_01_01 = Date.UTC(2024, 0, 1, 0, 0, 0);

/** 2024-01-07 00:00:00 UTC (Sunday) */
const TS_2024_01_07 = Date.UTC(2024, 0, 7, 0, 0, 0);

/** 2023-12-31 00:00:00 UTC (Sunday, ISO week 52 of 2023) */
const TS_2023_12_31 = Date.UTC(2023, 11, 31, 0, 0, 0);

function makeTimeFns(fixedTs: number) {
  return createTimeFunctions(() => fixedTs);
}

// ─── weekofyear ───────────────────────────────────────────────────────────────

describe('weekofyear', () => {
  it('Jan 15 2024 is ISO week 3', () => {
    const fns = makeTimeFns(TS_2024_01_15_12_30_45);
    expect(fns.weekofyear()).toBe(3);
  });

  it('Jan 1 2024 (Monday) is ISO week 1', () => {
    const fns = makeTimeFns(TS_2024_01_01);
    expect(fns.weekofyear()).toBe(1);
  });

  it('Jan 7 2024 (Sunday) is ISO week 1', () => {
    // ISO: Sunday belongs to the week starting the previous Monday
    const fns = makeTimeFns(TS_2024_01_07);
    expect(fns.weekofyear()).toBe(1);
  });

  it('Dec 31 2023 (Sunday) is ISO week 52', () => {
    const fns = makeTimeFns(TS_2023_12_31);
    expect(fns.weekofyear()).toBe(52);
  });

  it('accepts explicit timestamp argument', () => {
    const fns = makeTimeFns(0); // won't be used
    expect(fns.weekofyear(TS_2024_01_15_12_30_45)).toBe(3);
  });

  it('falls back to current bar time when no ts given', () => {
    const fns = makeTimeFns(TS_2024_01_15_12_30_45);
    expect(fns.weekofyear()).toBe(fns.weekofyear(TS_2024_01_15_12_30_45));
  });
});

// ─── timeInSession ────────────────────────────────────────────────────────────

describe('timeInSession', () => {
  it('returns timestamp when bar is within session (no day filter)', () => {
    // TS_2024_03_04_09_30 = 09:30 UTC on Monday — within 0900-1700
    const fns = makeTimeFns(TS_2024_03_04_09_30);
    const result = fns.timeInSession('D', '0900-1700');
    expect(result).toBe(TS_2024_03_04_09_30);
  });

  it('returns NA when bar is outside session time range', () => {
    // 09:30 is outside 1000-1600
    const fns = makeTimeFns(TS_2024_03_04_09_30);
    const result = fns.timeInSession('D', '1000-1600');
    expect(isNa(result)).toBe(true);
  });

  it('returns timestamp when bar matches session day filter (Mon=2)', () => {
    // TS_2024_03_04 = Monday, Pine dayofweek = 2
    const fns = makeTimeFns(TS_2024_03_04_09_30);
    const result = fns.timeInSession('D', '0900-1700:23456'); // Mon-Fri
    expect(result).toBe(TS_2024_03_04_09_30);
  });

  it('returns NA when bar day is excluded from session (weekend only session)', () => {
    // Monday (dow=2) with a session that only covers Sun(1) and Sat(7)
    const fns = makeTimeFns(TS_2024_03_04_09_30);
    const result = fns.timeInSession('D', '0900-1700:17'); // Sun+Sat only
    expect(isNa(result)).toBe(true);
  });

  it('returns ts when no session string given', () => {
    const fns = makeTimeFns(TS_2024_03_04_09_30);
    const result = fns.timeInSession('D');
    expect(result).toBe(TS_2024_03_04_09_30);
  });

  it('handles midnight-crossing session (e.g. 2200-0200)', () => {
    // 23:30 UTC should be inside 2200-0200
    const ts_23_30 = Date.UTC(2024, 2, 4, 23, 30, 0);
    const fns = makeTimeFns(ts_23_30);
    const result = fns.timeInSession('D', '2200-0200');
    expect(result).toBe(ts_23_30);
  });

  it('handles midnight-crossing session — time outside range', () => {
    // 12:00 UTC should be outside 2200-0200
    const ts_12_00 = Date.UTC(2024, 2, 4, 12, 0, 0);
    const fns = makeTimeFns(ts_12_00);
    const result = fns.timeInSession('D', '2200-0200');
    expect(isNa(result)).toBe(true);
  });
});

// ─── str.repeat ───────────────────────────────────────────────────────────────

describe('str.repeat', () => {
  it('repeats a string count times', () => {
    expect(str.repeat('-', 5)).toBe('-----');
  });

  it('repeats a multi-char string', () => {
    expect(str.repeat('ab', 3)).toBe('ababab');
  });

  it('returns empty string for count=0', () => {
    expect(str.repeat('-', 0)).toBe('');
  });

  it('returns empty string for negative count', () => {
    expect(str.repeat('-', -1)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(str.repeat('', 5)).toBe('');
  });

  it('floors fractional count', () => {
    expect(str.repeat('x', 3.9)).toBe('xxx');
  });

  it('returns 10 dashes for str.repeat("-", 10)', () => {
    expect(str.repeat('-', 10)).toBe('----------');
  });
});

// ─── str.match (now returns string | NA) ─────────────────────────────────────

describe('str.match', () => {
  it('returns matched substring', () => {
    expect(str.match('hello123world', '\\d+')).toBe('123');
  });

  it('returns first match when multiple matches exist', () => {
    expect(str.match('abc 42 def 99', '\\d+')).toBe('42');
  });

  it('returns NA when no match', () => {
    expect(isNa(str.match('hello', '\\d+'))).toBe(true);
  });

  it('returns NA for null input', () => {
    expect(isNa(str.match(null as any, '\\d+'))).toBe(true);
  });

  it('returns NA for null regex', () => {
    expect(isNa(str.match('hello', null as any))).toBe(true);
  });

  it('returns NA for invalid regex', () => {
    expect(isNa(str.match('hello', '[invalid'))).toBe(true);
  });

  it('matches full string pattern', () => {
    expect(str.match('AAPL', '[A-Z]+')).toBe('AAPL');
  });
});

// ─── str.tostring named format specifiers ─────────────────────────────────────

describe('str.tostring format specifiers', () => {
  describe('format.mintick', () => {
    it('formats to 2 decimal places', () => {
      expect(str.tostring(123.456, 'format.mintick')).toBe('123.46');
    });

    it('formats whole number with 2 decimals', () => {
      expect(str.tostring(100, 'format.mintick')).toBe('100.00');
    });

    it('formats zero', () => {
      expect(str.tostring(0, 'format.mintick')).toBe('0.00');
    });
  });

  describe('format.volume', () => {
    it('formats billions with B suffix', () => {
      expect(str.tostring(1500000000, 'format.volume')).toBe('1.50B');
    });

    it('formats millions with M suffix', () => {
      expect(str.tostring(2500000, 'format.volume')).toBe('2.50M');
    });

    it('formats thousands with K suffix', () => {
      expect(str.tostring(5500, 'format.volume')).toBe('5.50K');
    });

    it('formats small numbers as rounded integer', () => {
      expect(str.tostring(999, 'format.volume')).toBe('999');
    });

    it('formats negative millions', () => {
      expect(str.tostring(-3000000, 'format.volume')).toBe('-3.00M');
    });
  });

  describe('format.percent', () => {
    it('appends percent sign with 2 decimals', () => {
      expect(str.tostring(12.345, 'format.percent')).toBe('12.35%');
    });

    it('formats integer percentage', () => {
      expect(str.tostring(50, 'format.percent')).toBe('50.00%');
    });

    it('formats zero percent', () => {
      expect(str.tostring(0, 'format.percent')).toBe('0.00%');
    });

    it('formats negative percent', () => {
      expect(str.tostring(-5.5, 'format.percent')).toBe('-5.50%');
    });
  });

  describe('existing #.## format strings still work', () => {
    it('formats with #.## pattern', () => {
      expect(str.tostring(3.14159, '#.##')).toBe('3.14');
    });

    it('formats with 0.00 pattern', () => {
      expect(str.tostring(3, '0.00')).toBe('3.00');
    });
  });
});

// ─── Integration: all time functions accessible via createTimeFunctions ────────

describe('createTimeFunctions integration', () => {
  it('exposes weekofyear on returned object', () => {
    const fns = makeTimeFns(TS_2024_01_15_12_30_45);
    expect(typeof fns.weekofyear).toBe('function');
  });

  it('exposes timeInSession on returned object', () => {
    const fns = makeTimeFns(TS_2024_01_15_12_30_45);
    expect(typeof fns.timeInSession).toBe('function');
  });

  it('all existing functions still work after adding new ones', () => {
    const fns = makeTimeFns(TS_2024_01_15_12_30_45);
    expect(fns.hour()).toBe(12);
    expect(fns.minute()).toBe(30);
    expect(fns.second()).toBe(45);
    expect(fns.dayofmonth()).toBe(15);
    expect(fns.month()).toBe(1);
    expect(fns.year()).toBe(2024);
    expect(fns.dayofweek()).toBe(2); // Monday = 2
  });

  it('timestamp() still constructs correct epoch ms', () => {
    const fns = makeTimeFns(0);
    const ts = fns.timestamp(2024, 1, 15, 12, 30, 45);
    expect(ts).toBe(TS_2024_01_15_12_30_45);
  });
});
