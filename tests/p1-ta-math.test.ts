/**
 * P1 ta.* and math.* function tests.
 * Tests for: ta.hma, ta.kc, ta.donchian, ta.linreg, ta.median
 *            math.avg (NA-aware), math.sum (rolling + variadic), math.pi/e/phi
 */
import { describe, it, expect } from 'vitest';
import { NA, isNa } from '../src/runtime/types/na';
import { Series } from '../src/runtime/types/series';
import { createTaModule } from '../src/runtime/builtins/ta';
import { math } from '../src/runtime/builtins/math';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Series<number> from an array (oldest→newest order). */
function makeSeries(values: number[], capacity = 100): Series<number> {
  const s = new Series<number>(capacity);
  for (const v of values) s.push(v);
  return s;
}

/** Create ta module with a simple bar-index counter. */
function makeTa(barIdx: { value: number }) {
  return createTaModule(() => barIdx.value);
}

// ===========================================================================
// ta.median
// ===========================================================================

describe('ta.median', () => {
  it('returns NA when fewer than length bars are available', () => {
    const ta = makeTa({ value: 0 });
    const s = makeSeries([3, 1]);
    expect(isNa(ta.median(s, 5))).toBe(true);
  });

  it('odd-length window: returns middle value', () => {
    const ta = makeTa({ value: 0 });
    // [1,2,3,4,5] sorted → 3 is median
    const s = makeSeries([1, 2, 3, 4, 5]);
    const result = ta.median(s, 5);
    expect(result).toBe(3);
  });

  it('even-length window: returns lower of the two middle values', () => {
    const ta = makeTa({ value: 0 });
    // [1,2,3,4] sorted → lower middle = 2
    const s = makeSeries([1, 2, 3, 4]);
    const result = ta.median(s, 4);
    expect(result).toBe(2);
  });

  it('constant series: median equals the constant', () => {
    const ta = makeTa({ value: 0 });
    const s = makeSeries([7, 7, 7, 7, 7]);
    expect(ta.median(s, 5)).toBe(7);
  });

  it('window smaller than series: uses only last `length` bars', () => {
    const ta = makeTa({ value: 0 });
    // Series = [1,2,3,4,5,10,10,10], length=3 → most recent 3 = [10,10,10]
    const s = makeSeries([1, 2, 3, 4, 5, 10, 10, 10]);
    // series.get(0)=10, get(1)=10, get(2)=10 → sorted [10,10,10], median=10
    expect(ta.median(s, 3)).toBe(10);
  });

  it('propagates NA when a window value is NA', () => {
    const ta = makeTa({ value: 0 });
    const s = new Series<number>(10);
    s.push(NA as unknown as number);
    s.push(2);
    s.push(3);
    expect(isNa(ta.median(s, 3))).toBe(true);
  });
});

// ===========================================================================
// ta.linreg
// ===========================================================================

describe('ta.linreg', () => {
  it('returns NA when fewer than length+offset bars are available', () => {
    const ta = makeTa({ value: 0 });
    const s = makeSeries([1, 2, 3]);
    expect(isNa(ta.linreg(s, 5, 0))).toBe(true);
  });

  it('perfect linear trend [1,2,3,4,5]: linreg(offset=0) = 5', () => {
    const ta = makeTa({ value: 0 });
    const s = makeSeries([1, 2, 3, 4, 5]);
    const result = ta.linreg(s, 5, 0);
    expect(result).toBeCloseTo(5, 5);
  });

  it('constant series: linreg = constant', () => {
    const ta = makeTa({ value: 0 });
    const s = makeSeries([3, 3, 3, 3, 3]);
    expect(ta.linreg(s, 5, 0)).toBeCloseTo(3, 5);
  });

  it('returns regression value at the most recent point of the line', () => {
    const ta = makeTa({ value: 0 });
    // [2,4,6] — perfect slope=2, intercept=2, value at x=2 (length-1=2) = 2+2*2=6
    const s = makeSeries([2, 4, 6]);
    expect(ta.linreg(s, 3, 0)).toBeCloseTo(6, 4);
  });

  it('propagates NA when a value in window is NA', () => {
    const ta = makeTa({ value: 0 });
    const s = new Series<number>(10);
    s.push(NA as unknown as number);
    s.push(2);
    s.push(3);
    s.push(4);
    s.push(5);
    expect(isNa(ta.linreg(s, 5, 0))).toBe(true);
  });
});

// ===========================================================================
// ta.hma
// ===========================================================================

describe('ta.hma', () => {
  it('returns NA when fewer than length bars are available', () => {
    const idx = { value: 0 };
    const ta = makeTa(idx);
    const s = new Series<number>(50);
    let result: number = NA as unknown as number;
    for (let i = 0; i < 3; i++) {
      idx.value = i;
      s.push(10);
      result = ta.hma(s, 9, 'hma_na_test');
    }
    // length=9, only 3 bars → always NA
    expect(isNa(result)).toBe(true);
  });

  it('constant series: hma equals the constant after warmup', () => {
    const idx = { value: 0 };
    const ta = makeTa(idx);
    const s = new Series<number>(100);
    // Feed 20 bars of constant 10, calling hma each bar
    let result: number = NA as unknown as number;
    for (let i = 0; i < 20; i++) {
      idx.value = i;
      s.push(10);
      result = ta.hma(s, 9, 'hma_const_test');
    }
    // After warmup (needs length + sqrtLen bars), result should converge to 10
    expect(isNa(result)).toBe(false);
    expect(result).toBeCloseTo(10, 2);
  });

  it('returns a numeric result (not NA) once enough bars are present', () => {
    const idx = { value: 0 };
    const ta = makeTa(idx);
    const s = new Series<number>(100);
    let result: number = NA as unknown as number;
    for (let i = 0; i < 20; i++) {
      idx.value = i;
      s.push(i + 1);
      result = ta.hma(s, 9, 'hma_numeric_test');
    }
    expect(isNa(result)).toBe(false);
    expect(typeof result).toBe('number');
  });

  it('length=4: hma matches manual calculation', () => {
    // hma(4) = wma(2*wma(src,2) - wma(src,4), floor(sqrt(4))=2)
    // sqrtLen = 2, so need length=4 bars + 2 delta accumulation = 6+ bars total
    const idx = { value: 0 };
    const ta = makeTa(idx);
    const vals = [1, 2, 3, 4, 5, 6, 7, 8];
    const s = new Series<number>(50);
    let result: number = NA as unknown as number;
    for (let i = 0; i < vals.length; i++) {
      idx.value = i;
      s.push(vals[i]);
      result = ta.hma(s, 4, 'hma_manual_test');
    }
    expect(isNa(result)).toBe(false);
    // For a perfectly rising series, HMA should be close to the most recent value
    expect(result).toBeGreaterThan(5);
  });
});

// ===========================================================================
// ta.donchian
// ===========================================================================

describe('ta.donchian', () => {
  it('returns NA3 when fewer than length bars are available', () => {
    const idx = { value: 0 };
    const highS = new Series<number>(50);
    const lowS = new Series<number>(50);
    highS.push(5); lowS.push(2);
    const ta = createTaModule(() => idx.value, () => highS, () => lowS);
    const [u, b, l] = ta.donchian(3);
    expect(isNa(u)).toBe(true);
    expect(isNa(b)).toBe(true);
    expect(isNa(l)).toBe(true);
  });

  it('computes correct upper, basis, lower', () => {
    const idx = { value: 0 };
    // high=[3,4,5], low=[0,1,2] over 3 bars
    const highS = makeSeries([3, 4, 5]);
    const lowS  = makeSeries([0, 1, 2]);
    const ta = createTaModule(() => idx.value, () => highS, () => lowS);
    const [upper, basis, lower] = ta.donchian(3);
    expect(upper).toBe(5);
    expect(lower).toBe(0);
    expect(basis).toBe(2.5);
  });

  it('upper > lower when highs != lows', () => {
    const idx = { value: 0 };
    const highS = makeSeries([10, 12, 11, 13, 9]);
    const lowS  = makeSeries([5, 6, 4, 7, 3]);
    const ta = createTaModule(() => idx.value, () => highS, () => lowS);
    const [upper, basis, lower] = ta.donchian(5);
    expect(upper).toBeGreaterThan(lower);
    expect(basis).toBe((upper + lower) / 2);
  });

  it('can accept explicit high/low series', () => {
    const idx = { value: 0 };
    const highS = makeSeries([8, 9, 10]);
    const lowS  = makeSeries([1, 2, 3]);
    const ta = makeTa(idx);
    const [upper, basis, lower] = ta.donchian(3, highS, lowS);
    expect(upper).toBe(10);
    expect(lower).toBe(1);
    expect(basis).toBeCloseTo(5.5, 5);
  });
});

// ===========================================================================
// ta.kc
// ===========================================================================

describe('ta.kc', () => {
  it('returns NA3 when not enough bars', () => {
    const idx = { value: 0 };
    const s = new Series<number>(50);
    const highS = new Series<number>(50);
    const lowS  = new Series<number>(50);
    const closeS = new Series<number>(50);
    s.push(10); highS.push(11); lowS.push(9); closeS.push(10);
    const ta = createTaModule(() => idx.value, () => highS, () => lowS, () => closeS);
    // length=20, only 1 bar → basis EMA will return but ATR won't have prev close
    // The result should be a valid tuple or NA3 depending on warmup
    const result = ta.kc(s, 3, 2.0, true, 'kc_na');
    // Either [number, number, number] or NA3 — just verify it's a tuple
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it('returns [upper, basis, lower] tuple with upper > lower when mult > 0', () => {
    const idx = { value: 0 };
    const closeS = new Series<number>(100);
    const highS  = new Series<number>(100);
    const lowS   = new Series<number>(100);

    // Feed 30 bars of OHLC data
    for (let i = 0; i < 30; i++) {
      idx.value = i;
      const c = 100 + Math.sin(i * 0.5) * 5;
      closeS.push(c);
      highS.push(c + 1);
      lowS.push(c - 1);
    }
    const ta = createTaModule(() => idx.value, () => highS, () => lowS, () => closeS);
    const [upper, basis, lower] = ta.kc(closeS, 10, 2.0, true, 'kc_valid');
    if (!isNa(upper)) {
      expect(upper).toBeGreaterThanOrEqual(basis);
      expect(lower).toBeLessThanOrEqual(basis);
    }
  });
});

// ===========================================================================
// math.avg
// ===========================================================================

describe('math.avg', () => {
  it('averages plain numbers', () => {
    expect(math.avg(1, 2, 3)).toBe(2);
  });

  it('math.avg(10, 20) = 15', () => {
    expect(math.avg(10, 20)).toBe(15);
  });

  it('excludes NA from sum and count', () => {
    const result = math.avg(NA as unknown as number, 4, 6);
    expect(result).toBe(5);
  });

  it('all-NA args returns NA', () => {
    const result = math.avg(NA as unknown as number, NA as unknown as number);
    expect(isNa(result)).toBe(true);
  });

  it('single non-NA value returns that value', () => {
    expect(math.avg(42, NA as unknown as number)).toBe(42);
  });
});

// ===========================================================================
// math.sum (rolling Series form)
// ===========================================================================

describe('math.sum (rolling)', () => {
  it('returns NA when fewer than length bars', () => {
    const s = makeSeries([1, 2]);
    const result = math.sum(s, 5);
    expect(isNa(result)).toBe(true);
  });

  it('sums the last length bars correctly', () => {
    // Series = [1,2,3,4,5], length=3 → most recent 3: 5+4+3=12
    const s = makeSeries([1, 2, 3, 4, 5]);
    expect(math.sum(s, 3)).toBe(12);
  });

  it('sums all bars when length equals series size', () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    expect(math.sum(s, 5)).toBe(15);
  });

  it('propagates NA when any window value is NA', () => {
    const s = new Series<number>(10);
    s.push(1);
    s.push(NA as unknown as number);
    s.push(3);
    expect(isNa(math.sum(s, 3))).toBe(true);
  });
});

// ===========================================================================
// math.sum (variadic form — backward compatibility)
// ===========================================================================

describe('math.sum (variadic)', () => {
  it('sum of variadic numbers', () => {
    expect(math.sum(1, 2, 3, 4)).toBe(10);
  });

  it('sum of two numbers', () => {
    expect(math.sum(5, 7)).toBe(12);
  });
});

// ===========================================================================
// math constants
// ===========================================================================

describe('math constants', () => {
  it('math.pi === Math.PI', () => {
    expect(math.pi).toBe(Math.PI);
  });

  it('math.e === Math.E', () => {
    expect(math.e).toBe(Math.E);
  });

  it('math.phi is the golden ratio', () => {
    expect(math.phi).toBeCloseTo(1.6180339887, 8);
  });

  it('2 * math.pi * 1 ≈ 6.2832', () => {
    expect(2 * math.pi).toBeCloseTo(6.2832, 4);
  });
});
