import { describe, it, expect } from 'vitest';
import { compile } from '../src/compiler/index';

// Helper: compile source and assert success, return generated code
function compileOk(src: string): string {
  const result = compile(src);
  if (!result.success || result.code === null) {
    throw new Error(
      `Compilation failed: ${result.diagnostics.map(d => d.message).join(', ')}`
    );
  }
  return result.code;
}

// Helper: compile and return metadata
function compileMeta(src: string) {
  const result = compile(src);
  return result.metadata;
}

// ─── Metadata extraction ────────────────────────────────────────────────────

describe('Metadata extraction', () => {
  it('extracts indicator title', () => {
    const src = `//@version=6\nindicator("My RSI", overlay=false)\n`;
    const meta = compileMeta(src);
    expect(meta).not.toBeNull();
    expect(meta!.type).toBe('indicator');
    expect(meta!.title).toBe('My RSI');
  });

  it('extracts indicator overlay=true', () => {
    const src = `//@version=6\nindicator("SMA", overlay=true)\n`;
    const meta = compileMeta(src);
    expect(meta!.overlay).toBe(true);
  });

  it('extracts strategy type', () => {
    const src = `//@version=6\nstrategy("My Strategy")\n`;
    const meta = compileMeta(src);
    expect(meta!.type).toBe('strategy');
    expect(meta!.title).toBe('My Strategy');
  });

  it('does not emit indicator() as runtime code', () => {
    const src = `//@version=6\nindicator("Test")\n`;
    const code = compileOk(src);
    expect(code).not.toContain('indicator(');
  });

  it('metadata is included in setMetadata call', () => {
    const src = `//@version=6\nindicator("SMA Cross", overlay=true)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.setMetadata(');
    expect(code).toContain('"title":"SMA Cross"');
  });
});

// ─── Builtin variables ───────────────────────────────────────────────────────

describe('Built-in variable mapping', () => {
  it('maps close to __rt.close', () => {
    const src = `//@version=6\nindicator("Test")\nx = close\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.close');
  });

  it('maps open, high, low, volume', () => {
    const src = `//@version=6\nindicator("Test")\nx = open + high + low + volume\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.open');
    expect(code).toContain('__rt.high');
    expect(code).toContain('__rt.low');
    expect(code).toContain('__rt.volume');
  });

  it('maps bar_index and hl2', () => {
    const src = `//@version=6\nindicator("Test")\nx = bar_index\ny = hl2\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.bar_index');
    expect(code).toContain('__rt.hl2');
  });

  it('maps close[1] to series get', () => {
    const src = `//@version=6\nindicator("Test")\nx = close[1]\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.series("close").get(1)');
  });

  it('maps high[2] to series get', () => {
    const src = `//@version=6\nindicator("Test")\nx = high[2]\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.series("high").get(2)');
  });

  it('maps hlc3 to __rt.hlc3', () => {
    const src = `//@version=6\nindicator("Test")\nx = hlc3\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.hlc3');
  });
});

// ─── TA functions ────────────────────────────────────────────────────────────

describe('TA function mapping', () => {
  it('maps ta.sma to __rt.ta.sma', () => {
    const src = `//@version=6\nindicator("SMA")\nsmaVal = ta.sma(close, 20)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.sma(__rt.close, 20)');
  });

  it('maps ta.ema to __rt.ta.ema', () => {
    const src = `//@version=6\nindicator("EMA")\nemaVal = ta.ema(close, 14)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.ema(__rt.close, 14)');
  });

  it('maps ta.rsi to __rt.ta.rsi', () => {
    const src = `//@version=6\nindicator("RSI")\nrsiVal = ta.rsi(close, 14)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.rsi(__rt.close, 14)');
  });

  it('maps ta.macd result to tuple destructure', () => {
    const src = `//@version=6\nindicator("MACD")\n[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)\n`;
    const code = compileOk(src);
    expect(code).toContain('var [macdLine, signalLine, hist]');
    expect(code).toContain('__rt.ta.macd(__rt.close, 12, 26, 9)');
  });

  it('maps ta.crossover to __rt.ta.crossover', () => {
    const src = `//@version=6\nindicator("Cross")\nsma20 = ta.sma(close, 20)\nx = ta.crossover(close, sma20)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.crossover');
  });

  it('maps ta.crossunder to __rt.ta.crossunder', () => {
    const src = `//@version=6\nindicator("Cross")\nfast = ta.ema(close, 12)\nslow = ta.ema(close, 26)\nx = ta.crossunder(fast, slow)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.crossunder');
  });
});

// ─── var / varip ─────────────────────────────────────────────────────────────

describe('var and varip declarations', () => {
  it('generates init block for var', () => {
    const src = `//@version=6\nindicator("Test")\nvar x = 0\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.setInit(function()');
    expect(code).toContain('__rt.state.x = 0');
  });

  it('generates init block for varip', () => {
    const src = `//@version=6\nindicator("Test")\nvarip y = 0\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.persistentState.y = 0');
  });

  it('references var variable as __rt.state.x in execute', () => {
    const src = `//@version=6\nindicator("Test")\nvar x = 0\nx := x + 1\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.state.x = __rt.state.x + 1');
  });

  it('does not declare var variable in execute block with var keyword', () => {
    const src = `//@version=6\nindicator("Test")\nvar counter = 0\ncounter := counter + 1\n`;
    const code = compileOk(src);
    // Should not have 'var counter =' in execute
    const executeSection = code.split('__rt.setExecute')[1];
    expect(executeSection).not.toContain('var counter =');
  });

  it('init block is only present when var/varip exist', () => {
    const src = `//@version=6\nindicator("Test")\nx = close\n`;
    const code = compileOk(src);
    expect(code).not.toContain('__rt.setInit(');
  });
});

// ─── plot() ──────────────────────────────────────────────────────────────────

describe('plot() generation', () => {
  it('generates __rt.plot call with index 0', () => {
    const src = `//@version=6\nindicator("Test")\nplot(close)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.plot(0, __rt.close,');
  });

  it('includes plot title in opts when passed as positional arg', () => {
    const src = `//@version=6\nindicator("Test")\nplot(close, title="Close Price")\n`;
    const code = compileOk(src);
    expect(code).toContain('"title":"Close Price"');
  });

  it('increments plot index for multiple plots', () => {
    const src = `//@version=6\nindicator("Test")\nplot(close)\nplot(open)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.plot(0,');
    expect(code).toContain('__rt.plot(1,');
  });

  it('plot metadata is captured with default color', () => {
    const src = `//@version=6\nindicator("Test")\nplot(close)\n`;
    const result = compile(src);
    const plots = result.metadata?.plots ?? [];
    expect(plots.length).toBe(1);
    expect(plots[0].index).toBe(0);
    expect(plots[0].color).toBe('#2962FF');
  });

  it('plot metadata captures title from named arg', () => {
    const src = `//@version=6\nindicator("Test")\nplot(close, title="SMA 20")\n`;
    const result = compile(src);
    const plots = result.metadata?.plots ?? [];
    expect(plots.length).toBe(1);
    expect(plots[0].title).toBe('SMA 20');
  });
});

// ─── hline() ─────────────────────────────────────────────────────────────────

describe('hline() generation', () => {
  it('generates __rt.hline call', () => {
    const src = `//@version=6\nindicator("Test")\nhline(70)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.hline(0, 70,');
  });

  it('hline increments index', () => {
    const src = `//@version=6\nindicator("Test")\nhline(70)\nhline(30)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.hline(0, 70,');
    expect(code).toContain('__rt.hline(1, 30,');
  });

  it('hline with title', () => {
    const src = `//@version=6\nindicator("Test")\nhline(30, title="Oversold")\n`;
    const code = compileOk(src);
    expect(code).toContain('Oversold');
    expect(code).toContain('__rt.hline(0, 30,');
  });
});

// ─── Color constants in member expression ────────────────────────────────────

describe('Color constant mapping', () => {
  it('maps color.blue member expression to hex string in code', () => {
    const src = `//@version=6\nindicator("Test")\nx = color.blue\n`;
    const code = compileOk(src);
    expect(code).toContain('"#2962FF"');
  });

  it('maps color.red member expression to hex string', () => {
    const src = `//@version=6\nindicator("Test")\nx = color.red\n`;
    const code = compileOk(src);
    expect(code).toContain('"#FF5252"');
  });

  it('maps color.green member expression to hex string', () => {
    const src = `//@version=6\nindicator("Test")\nx = color.green\n`;
    const code = compileOk(src);
    expect(code).toContain('"#4CAF50"');
  });

  it('maps color.orange to correct hex', () => {
    const src = `//@version=6\nindicator("Test")\nx = color.orange\n`;
    const code = compileOk(src);
    expect(code).toContain('"#FF9800"');
  });

  it('maps color.purple to correct hex', () => {
    const src = `//@version=6\nindicator("Test")\nx = color.purple\n`;
    const code = compileOk(src);
    expect(code).toContain('"#9C27B0"');
  });

  it('maps color.yellow to correct hex', () => {
    const src = `//@version=6\nindicator("Test")\nx = color.yellow\n`;
    const code = compileOk(src);
    expect(code).toContain('"#FFEB3B"');
  });
});

// ─── Control flow ────────────────────────────────────────────────────────────

describe('Control flow generation', () => {
  it('generates if/else', () => {
    const src = `//@version=6\nindicator("Test")\nif close > open\n    x = 1\nelse\n    x = 0\n`;
    const code = compileOk(src);
    expect(code).toContain('if (__rt.close > __rt.open)');
    expect(code).toContain('else {');
  });

  it('generates for loop', () => {
    const src = `//@version=6\nindicator("Test")\nfor i = 0 to 9\n    x = i\n`;
    const code = compileOk(src);
    expect(code).toContain('for (var i = 0; i <= 9; i += 1)');
  });

  it('generates while loop', () => {
    const src = `//@version=6\nindicator("Test")\nvar i = 0\nwhile i < 10\n    i := i + 1\n`;
    const code = compileOk(src);
    expect(code).toContain('while (__rt.state.i < 10)');
  });

  it('generates nested if', () => {
    const src = `//@version=6\nindicator("Test")\nif close > open\n    if close > 100\n        x = 1\n`;
    const code = compileOk(src);
    expect(code).toContain('if (__rt.close > __rt.open)');
  });
});

// ─── math namespace ───────────────────────────────────────────────────────────

describe('math namespace mapping', () => {
  it('maps math.abs to __rt.math.abs', () => {
    const src = `//@version=6\nindicator("Test")\nx = math.abs(close - open)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.math.abs');
  });

  it('maps math.max to __rt.math.max', () => {
    const src = `//@version=6\nindicator("Test")\nx = math.max(close, open)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.math.max');
  });

  it('maps math.sqrt to __rt.math.sqrt', () => {
    const src = `//@version=6\nindicator("Test")\nx = math.sqrt(close)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.math.sqrt');
  });

  it('maps math.floor to __rt.math.floor', () => {
    const src = `//@version=6\nindicator("Test")\nx = math.floor(close)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.math.floor');
  });
});

// ─── na handling ─────────────────────────────────────────────────────────────

describe('NA handling', () => {
  it('maps na literal to __rt.na', () => {
    const src = `//@version=6\nindicator("Test")\nx = na\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.na');
  });

  it('maps na in conditional to __rt.na', () => {
    const src = `//@version=6\nindicator("Test")\nx = close > 0 ? close : na\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.na');
  });
});

// ─── User-defined functions ───────────────────────────────────────────────────

describe('User-defined function generation', () => {
  it('generates function declaration in execute', () => {
    // Single-line arrow body
    const src = `//@version=6\nindicator("Test")\nmyFn(x) => x * 2\n`;
    const code = compileOk(src);
    expect(code).toContain('function myFn(x)');
  });

  it('function can be called after declaration', () => {
    const src = `//@version=6\nindicator("Test")\ndouble(x) => x * 2\nresult = double(close)\n`;
    const code = compileOk(src);
    expect(code).toContain('function double(x)');
    expect(code).toContain('double(__rt.close)');
  });

  it('function returns expression from arrow body', () => {
    const src = `//@version=6\nindicator("Test")\naddOne(n) => n + 1\n`;
    const code = compileOk(src);
    expect(code).toContain('return n + 1');
  });
});

// ─── Complete script structure ────────────────────────────────────────────────

describe('Generated code structure', () => {
  it('wraps code in IIFE with __rt parameter', () => {
    const src = `//@version=6\nindicator("Test")\n`;
    const code = compileOk(src);
    expect(code).toMatch(/^\(function\(__rt\)/);
    expect(code).toContain('})');
  });

  it('includes setExecute call', () => {
    const src = `//@version=6\nindicator("Test")\nplot(close)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.setExecute(function()');
  });

  it('full SMA indicator generates correct structure', () => {
    const src = `//@version=6\nindicator("SMA 20", overlay=true)\nsmaVal = ta.sma(close, 20)\nplot(smaVal, title="SMA 20")\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.setMetadata(');
    expect(code).toContain('__rt.ta.sma(__rt.close, 20)');
    expect(code).toContain('__rt.plot(0, smaVal,');
    expect(code).toContain('"title":"SMA 20"');
  });

  it('full RSI indicator structure', () => {
    const src = `//@version=6\nindicator("RSI")\nrsiVal = ta.rsi(close, 14)\nhline(70)\nhline(30)\nplot(rsiVal)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.rsi');
    expect(code).toContain('__rt.hline(0,');
    expect(code).toContain('__rt.hline(1,');
    expect(code).toContain('__rt.plot(0,');
  });
});

// ─── Assignment operators ────────────────────────────────────────────────────

describe('Assignment operators', () => {
  it('generates := as = for plain variables', () => {
    const src = `//@version=6\nindicator("Test")\nx = 5\nx := 10\n`;
    const code = compileOk(src);
    expect(code).toContain('x = 10');
  });

  it('generates += operator for var state', () => {
    const src = `//@version=6\nindicator("Test")\nvar total = 0\ntotal += 1\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.state.total += 1');
  });

  it('generates -= operator for var state', () => {
    const src = `//@version=6\nindicator("Test")\nvar cnt = 10\ncnt -= 1\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.state.cnt -= 1');
  });

  it('generates := as = for varip state', () => {
    const src = `//@version=6\nindicator("Test")\nvarip score = 0\nscore := score + 1\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.persistentState.score = __rt.persistentState.score + 1');
  });
});

// ─── strategy namespace ───────────────────────────────────────────────────────

describe('Strategy namespace', () => {
  it('maps strategy.entry to __rt.strategy.entry', () => {
    const src = `//@version=6\nstrategy("My Strategy")\nstrategy.entry("Long", strategy.long)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.strategy.entry');
  });

  it('maps strategy.close to __rt.strategy.close', () => {
    const src = `//@version=6\nstrategy("My Strategy")\nstrategy.close("Long")\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.strategy.close');
  });
});

// ─── Binary operators ────────────────────────────────────────────────────────

describe('Binary and logical operators', () => {
  it('converts and to &&', () => {
    const src = `//@version=6\nindicator("Test")\nx = close > 0 and open > 0\n`;
    const code = compileOk(src);
    expect(code).toContain('&&');
  });

  it('converts or to ||', () => {
    const src = `//@version=6\nindicator("Test")\nx = close > 0 or open > 0\n`;
    const code = compileOk(src);
    expect(code).toContain('||');
  });

  it('converts == to ===', () => {
    const src = `//@version=6\nindicator("Test")\nx = close == open\n`;
    const code = compileOk(src);
    expect(code).toContain('===');
  });

  it('converts != to !==', () => {
    const src = `//@version=6\nindicator("Test")\nx = close != open\n`;
    const code = compileOk(src);
    expect(code).toContain('!==');
  });
});

// ─── fill() and bgcolor() ────────────────────────────────────────────────────

describe('fill() and bgcolor() generation', () => {
  it('generates __rt.fill call', () => {
    const src = `//@version=6\nindicator("Test")\nfill(0, 1)\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.fill(0, 1)');
  });

  it('generates __rt.bgcolor call', () => {
    const src = `//@version=6\nindicator("Test")\nbgcolor("red")\n`;
    const code = compileOk(src);
    expect(code).toContain('__rt.bgcolor(');
  });
});
