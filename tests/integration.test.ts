import { describe, it, expect } from 'vitest';
import { compile } from '../src/compiler/index';
import { createRuntime } from '../src/runtime/index';
import { Bar } from '../src/data/types';

// Generate sample bars for testing
function makeBars(n: number): Bar[] {
  const bars: Bar[] = [];
  let price = 100;
  const baseTime = 1700000000;
  for (let i = 0; i < n; i++) {
    const change = (Math.sin(i * 0.3) * 2) + (Math.random() - 0.5);
    price += change;
    const o = price;
    const h = price + Math.abs(change) + Math.random();
    const l = price - Math.abs(change) - Math.random();
    const c = price + (Math.random() - 0.5);
    bars.push({
      time: baseTime + i * 86400,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: Math.floor(1000000 + Math.random() * 500000),
    });
  }
  return bars;
}

const bars = makeBars(100);

function compileAndRun(source: string) {
  const result = compile(source);
  if (!result.success || !result.code) {
    throw new Error(
      `Compile failed: ${result.diagnostics.map(d => d.message).join('; ')}`
    );
  }
  return createRuntime(result.code, bars);
}

// ── End-to-end: SMA indicator ─────────────────────────────────────────────────

describe('E2E: SMA Indicator', () => {
  const src = `//@version=6
indicator("SMA Test", overlay=true)
plot(ta.sma(close, 20), "SMA 20", color.blue, 2)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('generates valid JavaScript', () => {
    const result = compile(src);
    expect(result.code).toBeTruthy();
    expect(result.code).toContain('__rt.setMetadata');
    expect(result.code).toContain('__rt.setExecute');
  });

  it('extracts correct metadata', () => {
    const result = compile(src);
    expect(result.metadata).toBeTruthy();
    expect(result.metadata!.title).toBe('SMA Test');
    expect(result.metadata!.overlay).toBe(true);
    expect(result.metadata!.type).toBe('indicator');
  });

  it('executes and produces plot data', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBeGreaterThan(0);
    expect(exec.plots[0].title).toBe('SMA 20');
    expect(exec.plots[0].values.length).toBe(bars.length);
  });

  it('SMA values are NaN-free after warmup', () => {
    const exec = compileAndRun(src);
    const values = exec.plots[0].values;
    // After 20 bars, SMA should have non-null values
    for (let i = 20; i < values.length; i++) {
      expect(values[i].value).not.toBeNull();
    }
  });
});

// ── End-to-end: Multiple plots ────────────────────────────────────────────────

describe('E2E: Multiple Plots', () => {
  const src = `//@version=6
indicator("Multi Plot", overlay=true)
plot(ta.sma(close, 10), "Fast", color.green, 1)
plot(ta.sma(close, 30), "Slow", color.red, 2)
`;

  it('produces two plots', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(2);
    expect(exec.plots[0].title).toBe('Fast');
    expect(exec.plots[1].title).toBe('Slow');
  });

  it('fast SMA values differ from slow SMA values', () => {
    const exec = compileAndRun(src);
    // After warmup, fast and slow should be different
    const fast = exec.plots[0].values[50]?.value;
    const slow = exec.plots[1].values[50]?.value;
    expect(fast).not.toBeNull();
    expect(slow).not.toBeNull();
    // They shouldn't be exactly equal (extremely unlikely with random data)
    expect(fast).not.toBe(slow);
  });
});

// ── End-to-end: Close plot (simplest) ─────────────────────────────────────────

describe('E2E: Close Price Plot', () => {
  const src = `//@version=6
indicator("Close", overlay=true)
plot(close, "Close", color.blue)
`;

  it('plot values match close prices', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    exec.plots[0].values.forEach((v, i) => {
      expect(v.value).toBeCloseTo(bars[i].close, 5);
    });
  });
});

// ── End-to-end: Variables and expressions ─────────────────────────────────────

describe('E2E: Variables and Expressions', () => {
  const src = `//@version=6
indicator("Vars", overlay=true)
avg = (high + low) / 2
plot(avg, "HL2 Manual")
`;

  it('computed variable values match expected', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    exec.plots[0].values.forEach((v, i) => {
      const expected = (bars[i].high + bars[i].low) / 2;
      expect(v.value).toBeCloseTo(expected, 5);
    });
  });
});

// ── End-to-end: Hlines ────────────────────────────────────────────────────────

describe('E2E: Hlines', () => {
  const src = `//@version=6
indicator("RSI Lines")
hline(70, "Overbought")
hline(30, "Oversold")
`;

  it('produces hline data', () => {
    const exec = compileAndRun(src);
    expect(exec.hlines.length).toBeGreaterThanOrEqual(2);
  });
});

// ── End-to-end: Compile error handling ────────────────────────────────────────

describe('E2E: Error Handling', () => {
  it('reports error for invalid syntax', () => {
    const result = compile(`//@version=6\n@#$%^`);
    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

// ── End-to-end: RSI Indicator ──────────────────────────────────────────────────

describe('E2E: RSI Indicator', () => {
  const src = `//@version=6
indicator("RSI Test")
rsiVal = ta.rsi(close, 14)
plot(rsiVal, "RSI", color.purple, 2)
hline(70, "Overbought")
hline(30, "Oversold")
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('produces 1 plot', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    expect(exec.plots[0].title).toBe('RSI');
  });

  it('RSI values are between 0 and 100 after warmup', () => {
    const exec = compileAndRun(src);
    const values = exec.plots[0].values;
    // RSI needs 14+1 bars to initialize (first bar is seed, then 14 diffs)
    for (let i = 16; i < values.length; i++) {
      const v = values[i].value;
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('creates hlines', () => {
    const exec = compileAndRun(src);
    expect(exec.hlines.length).toBeGreaterThanOrEqual(2);
    const prices = exec.hlines.map(h => h.price);
    expect(prices).toContain(70);
    expect(prices).toContain(30);
  });
});

// ── End-to-end: EMA Indicator ──────────────────────────────────────────────────

describe('E2E: EMA Indicator', () => {
  const src = `//@version=6
indicator("EMA Test", overlay=true)
plot(ta.ema(close, 20), "EMA 20", color.blue)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('plot has values for all bars', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    expect(exec.plots[0].title).toBe('EMA 20');
    expect(exec.plots[0].values.length).toBe(bars.length);
  });

  it('EMA values are non-null after first bar', () => {
    const exec = compileAndRun(src);
    const values = exec.plots[0].values;
    // EMA seeds with first value, so all subsequent bars should have values
    for (let i = 1; i < values.length; i++) {
      expect(values[i].value).not.toBeNull();
    }
  });

  it('extracts overlay metadata', () => {
    const result = compile(src);
    expect(result.metadata!.overlay).toBe(true);
  });
});

// ── End-to-end: Bollinger Bands ────────────────────────────────────────────────

describe('E2E: Bollinger Bands', () => {
  const src = `//@version=6
indicator("BB Test", overlay=true)
[middle, upper, lower] = ta.bb(close, 20, 2.0)
plot(middle, "Middle", color.orange)
plot(upper, "Upper", color.gray)
plot(lower, "Lower", color.gray)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('produces 3 plots', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(3);
    expect(exec.plots[0].title).toBe('Middle');
    expect(exec.plots[1].title).toBe('Upper');
    expect(exec.plots[2].title).toBe('Lower');
  });

  it('upper > middle > lower after warmup', () => {
    const exec = compileAndRun(src);
    // BB needs 20 bars for SMA calculation
    for (let i = 20; i < bars.length; i++) {
      const mid = exec.plots[0].values[i].value;
      const up = exec.plots[1].values[i].value;
      const lo = exec.plots[2].values[i].value;
      if (mid !== null && up !== null && lo !== null) {
        expect(up).toBeGreaterThanOrEqual(mid);
        expect(mid).toBeGreaterThanOrEqual(lo);
      }
    }
  });
});

// ── End-to-end: MACD ───────────────────────────────────────────────────────────

describe('E2E: MACD', () => {
  const src = `//@version=6
indicator("MACD")
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
plot(macdLine, "MACD", color.blue)
plot(signalLine, "Signal", color.orange)
plot(hist, "Histogram", color.green)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('produces 3 plots', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(3);
    expect(exec.plots[0].title).toBe('MACD');
    expect(exec.plots[1].title).toBe('Signal');
    expect(exec.plots[2].title).toBe('Histogram');
  });

  it('histogram equals macd - signal after warmup', () => {
    const exec = compileAndRun(src);
    // MACD needs time to warm up. Check from bar 30 onward.
    for (let i = 30; i < bars.length; i++) {
      const macd = exec.plots[0].values[i].value;
      const signal = exec.plots[1].values[i].value;
      const hist = exec.plots[2].values[i].value;
      if (macd !== null && signal !== null && hist !== null) {
        expect(hist).toBeCloseTo(macd - signal, 5);
      }
    }
  });
});

// ── End-to-end: Variable State Persistence (var keyword) ───────────────────────

describe('E2E: Variable State Persistence (var keyword)', () => {
  const src = `//@version=6
indicator("Counter")
var int count = 0
count := count + 1
plot(count, "Count")
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('count increments from 1 to number of bars', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    expect(exec.plots[0].title).toBe('Count');
    const values = exec.plots[0].values;
    expect(values.length).toBe(bars.length);
    for (let i = 0; i < values.length; i++) {
      expect(values[i].value).toBe(i + 1);
    }
  });
});

// ── End-to-end: Conditional Logic ──────────────────────────────────────────────

describe('E2E: Conditional Logic', () => {
  const src = `//@version=6
indicator("Cond Test", overlay=true)
isUp = close > open
plotColor = isUp ? color.green : color.red
plot(close, "Close", plotColor)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('runs without errors and produces plot values for all bars', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    expect(exec.plots[0].title).toBe('Close');
    const values = exec.plots[0].values;
    expect(values.length).toBe(bars.length);
    for (let i = 0; i < values.length; i++) {
      expect(values[i].value).not.toBeNull();
    }
  });
});

// ── End-to-end: User-Defined Function ──────────────────────────────────────────

describe('E2E: User-Defined Function', () => {
  const src = `//@version=6
indicator("Custom Func")
myAvg(a, b) => (a + b) / 2
plot(myAvg(high, low), "Custom HL2")
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('custom HL2 matches (high + low) / 2', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    expect(exec.plots[0].title).toBe('Custom HL2');
    exec.plots[0].values.forEach((v, i) => {
      const expected = (bars[i].high + bars[i].low) / 2;
      expect(v.value).toBeCloseTo(expected, 5);
    });
  });
});

// ── End-to-end: Crossover Detection (Fast/Slow SMA) ───────────────────────────

describe('E2E: Crossover Detection', () => {
  const src = `//@version=6
indicator("Cross Test", overlay=true)
fast = ta.sma(close, 10)
slow = ta.sma(close, 30)
plot(fast, "Fast", color.green)
plot(slow, "Slow", color.red)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('produces 2 plots with values after warmup', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(2);
    expect(exec.plots[0].title).toBe('Fast');
    expect(exec.plots[1].title).toBe('Slow');

    // Fast SMA(10) warms up at bar 10, Slow SMA(30) at bar 30
    for (let i = 30; i < bars.length; i++) {
      expect(exec.plots[0].values[i].value).not.toBeNull();
      expect(exec.plots[1].values[i].value).not.toBeNull();
    }
  });
});

// ── End-to-end: ATR ────────────────────────────────────────────────────────────

describe('E2E: ATR Indicator', () => {
  const src = `//@version=6
indicator("ATR Test")
plot(ta.atr(14), "ATR 14", color.orange)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
    // Verify the generated code injects high/low/close arguments
    expect(result.code).toContain('__rt.ta.atr');
    expect(result.code).toContain('__rt.high');
    expect(result.code).toContain('__rt.low');
    expect(result.code).toContain('__rt.close');
  });

  it('produces 1 plot with non-negative ATR values', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    expect(exec.plots[0].title).toBe('ATR 14');

    // ATR should be non-negative after warmup
    for (let i = 2; i < bars.length; i++) {
      const v = exec.plots[0].values[i].value;
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ── End-to-end: Highest / Lowest ───────────────────────────────────────────────

describe('E2E: Highest / Lowest', () => {
  const src = `//@version=6
indicator("HiLo", overlay=true)
plot(ta.highest(high, 20), "High 20", color.green)
plot(ta.lowest(low, 20), "Low 20", color.red)
`;

  it('compiles without errors', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('produces 2 plots', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(2);
    expect(exec.plots[0].title).toBe('High 20');
    expect(exec.plots[1].title).toBe('Low 20');
  });

  it('highest >= close and lowest <= close in window after warmup', () => {
    const exec = compileAndRun(src);
    // After 20 bars, highest(high, 20) should be >= current close
    // and lowest(low, 20) should be <= current close
    for (let i = 20; i < bars.length; i++) {
      const hi = exec.plots[0].values[i].value;
      const lo = exec.plots[1].values[i].value;
      if (hi !== null && lo !== null) {
        // Highest of high over 20 bars should be >= close at any bar in that window
        expect(hi).toBeGreaterThanOrEqual(bars[i].close);
        // Lowest of low over 20 bars should be <= close at any bar in that window
        expect(lo).toBeLessThanOrEqual(bars[i].close);
      }
    }
  });

  it('highest >= lowest after warmup', () => {
    const exec = compileAndRun(src);
    for (let i = 20; i < bars.length; i++) {
      const hi = exec.plots[0].values[i].value;
      const lo = exec.plots[1].values[i].value;
      if (hi !== null && lo !== null) {
        expect(hi).toBeGreaterThanOrEqual(lo);
      }
    }
  });
});

// ── End-to-end: SMA Crossover Strategy ──────────────────────────────────────

describe('E2E: SMA Crossover Strategy', () => {
  const src = `//@version=6
strategy("SMA Cross", overlay=true)
fast = ta.sma(close, 10)
slow = ta.sma(close, 30)
if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long)
if ta.crossunder(fast, slow)
    strategy.close("Long")
plot(fast, "Fast", color.green)
plot(slow, "Slow", color.red)
`;

  it('compiles as strategy', () => {
    const result = compile(src);
    expect(result.success).toBe(true);
    expect(result.metadata!.type).toBe('strategy');
  });

  it('produces trades', () => {
    const exec = compileAndRun(src);
    expect(exec.strategy).toBeTruthy();
    expect(exec.strategy!.equityCurve.length).toBe(bars.length);
  });

  it('has plot data', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(2);
  });
});

// ── End-to-end: Math Functions ──────────────────────────────────────────────

describe('E2E: Math Functions', () => {
  const src = `//@version=6
indicator("Math Test")
plot(math.abs(close - open), "AbsDiff")
`;

  it('compiles and produces values', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    exec.plots[0].values.forEach((v, i) => {
      expect(v.value).toBeCloseTo(Math.abs(bars[i].close - bars[i].open), 5);
    });
  });
});

// ── End-to-end: nz Function ────────────────────────────────────────────────

describe('E2E: nz Function', () => {
  const src = `//@version=6
indicator("NZ Test", overlay=true)
smaVal = ta.sma(close, 20)
plot(nz(smaVal, close), "NZ SMA")
`;

  it('fills NA with close during warmup', () => {
    const exec = compileAndRun(src);
    expect(exec.plots.length).toBe(1);
    // During warmup (first 19 bars), nz should fall back to close
    for (let i = 0; i < 19; i++) {
      expect(exec.plots[0].values[i].value).not.toBeNull();
    }
  });
});
