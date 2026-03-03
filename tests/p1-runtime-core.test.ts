import { describe, it, expect } from 'vitest';
import { Bar } from '../src/data/types';
import { createRuntime } from '../src/runtime/index';
import { createContext } from '../src/runtime/context';
import { createBuiltinVariables } from '../src/runtime/builtins/variables';
import { createTaModule } from '../src/runtime/builtins/ta';

// Helper: generate bars with realistic timestamps (NYSE trading hours)
// Using 2024-01-02 as base date, 09:30 AM ET = 14:30 UTC = 1704202200000 ms
const MARKET_OPEN_MS = 1704202200000; // 2024-01-02 09:30 ET in ms
const ONE_MINUTE_MS = 60 * 1000;

function makeBars(count: number, startTimeMs: number = MARKET_OPEN_MS): Bar[] {
  const bars: Bar[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = price + Math.sin(i * 0.3) * 2;
    const high = Math.max(open, close) + 1;
    const low = Math.min(open, close) - 1;
    bars.push({
      time: startTimeMs + i * ONE_MINUTE_MS,
      open,
      high,
      low,
      close,
      volume: 1000 + i * 10,
    });
    price = close;
  }
  return bars;
}

// Helper: create a minimal windowed builtin for context tests
function makeWindowedBuiltins() {
  // Use 1 bar for simple context tests
  const bars = makeBars(1);
  return createBuiltinVariables(bars);
}

// ============================================================
// last_bar_index
// ============================================================
describe('last_bar_index', () => {
  it('equals bars.length - 1 in execution result', () => {
    const bars = makeBars(20);
    const results: number[] = [];
    const code = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        results.push(__rt.last_bar_index);
      });
    `;
    // We need to capture the value — use a shared array via closure trick
    // Instead, test via createRuntime with a bar that plots last_bar_index
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.last_bar_index);
      });
    `;
    const result = createRuntime(plotCode, bars);
    const lastValues = result.plots[0].values;
    // last_bar_index should be 19 (bars.length - 1) on every bar
    expect(lastValues[0].value).toBe(19);
    expect(lastValues[19].value).toBe(19);
  });

  it('is consistent across all bars', () => {
    const bars = makeBars(5);
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.last_bar_index);
      });
    `;
    const result = createRuntime(plotCode, bars);
    const values = result.plots[0].values.map(v => v.value);
    // Should always be 4 (5 bars - 1)
    expect(values).toEqual([4, 4, 4, 4, 4]);
  });

  it('is 0 for single bar', () => {
    const bars = makeBars(1);
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.last_bar_index);
      });
    `;
    const result = createRuntime(plotCode, bars);
    expect(result.plots[0].values[0].value).toBe(0);
  });
});

// ============================================================
// last_bar_time
// ============================================================
describe('last_bar_time', () => {
  it('equals the time of the last bar', () => {
    const bars = makeBars(10);
    const expectedLastTime = bars[bars.length - 1].time;
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.last_bar_time);
      });
    `;
    const result = createRuntime(plotCode, bars);
    // last_bar_time should be constant across all bars
    const values = result.plots[0].values.map(v => v.value);
    expect(values[0]).toBe(expectedLastTime);
    expect(values[9]).toBe(expectedLastTime);
  });

  it('is set correctly for 3-bar dataset', () => {
    const bars = makeBars(3, 1700000000000);
    const expectedTime = bars[2].time; // third bar's time
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.last_bar_time);
      });
    `;
    const result = createRuntime(plotCode, bars);
    expect(result.plots[0].values[0].value).toBe(expectedTime);
  });
});

// ============================================================
// timenow
// ============================================================
describe('timenow', () => {
  it('is a number (epoch ms)', () => {
    const bars = makeBars(5);
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.timenow);
      });
    `;
    const result = createRuntime(plotCode, bars);
    const val = result.plots[0].values[0].value;
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThan(1700000000000); // after Nov 2023
  });

  it('is constant across all bars (set once at execution start)', () => {
    const bars = makeBars(5);
    const plotCode = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.timenow);
      });
    `;
    const result = createRuntime(plotCode, bars);
    const values = result.plots[0].values.map(v => v.value);
    // All bars should see the same timenow
    const first = values[0];
    for (const v of values) {
      expect(v).toBe(first);
    }
  });
});

// ============================================================
// ticker.new
// ============================================================
describe('ticker.new', () => {
  it('formats PREFIX:TICKER correctly', () => {
    const bars = makeBars(1);
    const resultHolder: string[] = [];
    // Use a creative approach: store result in a var, plot won't work for strings
    // We'll test via createContext directly
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    const ctx = createContext(builtins, ta, bars.length).ctx;
    expect(ctx.ticker.new('NASDAQ', 'AAPL')).toBe('NASDAQ:AAPL');
    expect(ctx.ticker.new('NYSE', 'IBM')).toBe('NYSE:IBM');
    expect(ctx.ticker.new('BINANCE', 'BTCUSDT')).toBe('BINANCE:BTCUSDT');
  });

  it('handles single argument gracefully', () => {
    const bars = makeBars(1);
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    const ctx = createContext(builtins, ta, bars.length).ctx;
    expect(ctx.ticker.new('NASDAQ')).toBe('NASDAQ');
  });

  it('works in script execution context', () => {
    const bars = makeBars(2);
    // Can't easily test string return, but verify it doesn't throw
    const code = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        var t = __rt.ticker.new('NASDAQ', 'AAPL');
        __rt.plot(0, t === 'NASDAQ:AAPL' ? 1 : 0);
      });
    `;
    const result = createRuntime(code, bars);
    expect(result.plots[0].values[0].value).toBe(1);
  });
});

// ============================================================
// session.ismarket / ispremarket / ispostmarket
// ============================================================
describe('session.*', () => {
  // 2024-01-02 timestamps in ET:
  // Pre-market: 07:00 ET = 12:00 UTC = 1704196800000
  // Market open: 09:30 ET = 14:30 UTC = 1704202200000
  // Mid-day: 12:00 ET = 17:00 UTC = 1704207600000
  // After close: 17:00 ET = 22:00 UTC = 1704229200000

  const PRE_MARKET_MS = 1704196800000;   // 07:00 ET
  const MID_DAY_MS = 1704207600000;      // 12:00 ET
  const AFTER_CLOSE_MS = 1704229200000;  // 17:00 ET

  function makeBarAt(timeMs: number): Bar[] {
    return [{
      time: timeMs,
      open: 100, high: 101, low: 99, close: 100, volume: 1000,
    }];
  }

  it('ismarket is true during regular market hours', () => {
    const bars = makeBarAt(MID_DAY_MS);
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    builtins.open.push(100); builtins.high.push(101); builtins.low.push(99);
    builtins.close.push(100); builtins.volume.push(1000); builtins.time.push(MID_DAY_MS);
    builtins.bar_index.push(0); builtins.hl2.push(100); builtins.hlc3.push(100); builtins.ohlc4.push(100);
    const ctx = createContext(builtins, ta, bars.length).ctx;
    expect(ctx.session.ismarket).toBe(true);
    expect(ctx.session.ispremarket).toBe(false);
    expect(ctx.session.ispostmarket).toBe(false);
  });

  it('ispremarket is true before market open', () => {
    const bars = makeBarAt(PRE_MARKET_MS);
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    builtins.open.push(100); builtins.high.push(101); builtins.low.push(99);
    builtins.close.push(100); builtins.volume.push(1000); builtins.time.push(PRE_MARKET_MS);
    builtins.bar_index.push(0); builtins.hl2.push(100); builtins.hlc3.push(100); builtins.ohlc4.push(100);
    const ctx = createContext(builtins, ta, bars.length).ctx;
    expect(ctx.session.ispremarket).toBe(true);
    expect(ctx.session.ismarket).toBe(false);
    expect(ctx.session.ispostmarket).toBe(false);
  });

  it('ispostmarket is true after market close', () => {
    const bars = makeBarAt(AFTER_CLOSE_MS);
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    builtins.open.push(100); builtins.high.push(101); builtins.low.push(99);
    builtins.close.push(100); builtins.volume.push(1000); builtins.time.push(AFTER_CLOSE_MS);
    builtins.bar_index.push(0); builtins.hl2.push(100); builtins.hlc3.push(100); builtins.ohlc4.push(100);
    const ctx = createContext(builtins, ta, bars.length).ctx;
    expect(ctx.session.ispostmarket).toBe(true);
    expect(ctx.session.ismarket).toBe(false);
    expect(ctx.session.ispremarket).toBe(false);
  });

  it('session checks work in script execution', () => {
    // Use bars at market open time
    const bars = makeBarAt(MID_DAY_MS);
    const code = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.plot(0, __rt.session.ismarket ? 1 : 0);
      });
    `;
    const result = createRuntime(code, bars);
    expect(result.plots[0].values[0].value).toBe(1);
  });
});

// ============================================================
// runtime.error
// ============================================================
describe('runtime.error', () => {
  it('throws an error with the given message', () => {
    const bars = makeBars(1);
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    const ctx = createContext(builtins, ta, bars.length).ctx;
    expect(() => ctx.runtime.error('test error message')).toThrow('test error message');
  });

  it('thrown error has isRuntimeError flag', () => {
    const bars = makeBars(1);
    const builtins = createBuiltinVariables(bars);
    let capturedIdx = 0;
    const ta = createTaModule(
      () => capturedIdx,
      () => builtins.high,
      () => builtins.low,
      () => builtins.close,
      () => builtins.volume
    );
    const ctx = createContext(builtins, ta, bars.length).ctx;
    try {
      ctx.runtime.error('flagged error');
    } catch (e) {
      expect((e as any).isRuntimeError).toBe(true);
    }
  });

  it('stops script execution when called', () => {
    const bars = makeBars(5);
    const code = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        __rt.runtime.error('stop execution');
        __rt.plot(0, 999); // should never reach here
      });
    `;
    expect(() => createRuntime(code, bars)).toThrow('stop execution');
  });

  it('does not execute code after runtime.error', () => {
    const bars = makeBars(3);
    // Plot on bars 0, then runtime.error on bar 1
    // The engine should throw on bar 1, so bar 2 never executes
    let barCount = 0;
    const code = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        if (__rt.bar_index === 1) {
          __rt.runtime.error('halt on bar 1');
        }
        __rt.plot(0, __rt.bar_index);
      });
    `;
    expect(() => createRuntime(code, bars)).toThrow('halt on bar 1');
  });
});

// ============================================================
// Integration: last_bar_index + barstate.islast
// ============================================================
describe('last_bar_index integration', () => {
  it('last_bar_index equals bar_index when barstate.islast is true', () => {
    const bars = makeBars(10);
    const code = `
      __rt.setMetadata({ type: 'indicator', title: 'test', shorttitle: '', overlay: false, inputs: [], plots: [] });
      __rt.setExecute(function() {
        var isLast = __rt.barstate.islast;
        var matches = (isLast && __rt.bar_index === __rt.last_bar_index) ? 1 : 0;
        __rt.plot(0, isLast ? matches : 0);
      });
    `;
    const result = createRuntime(code, bars);
    // On the last bar, plot should be 1
    const values = result.plots[0].values.map(v => v.value);
    expect(values[9]).toBe(1);
  });
});
