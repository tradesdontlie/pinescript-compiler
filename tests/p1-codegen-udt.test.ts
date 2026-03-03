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

// ─── UDT Type Declaration ────────────────────────────────────────────────────

describe('UDT Type Declaration codegen', () => {
  it('emits constructor function for type declaration', () => {
    const src = `
//@version=6
indicator("UDT test")
type Point
    float x = 0.0
    float y = 0.0
`;
    const code = compileOk(src);
    expect(code).toContain('function Point(fields)');
    expect(code).toContain('fields = fields || {}');
    expect(code).toContain('this.x =');
    expect(code).toContain('this.y =');
  });

  it('emits static .new() factory method', () => {
    const src = `
//@version=6
indicator("UDT test")
type Point
    float x = 0.0
    float y = 0.0
`;
    const code = compileOk(src);
    expect(code).toContain('Point.new = function(fields)');
    expect(code).toContain('return new Point(fields || {})');
  });

  it('uses explicit default values in constructor', () => {
    const src = `
//@version=6
indicator("UDT test")
type Counter
    int count = 0
    float ratio = 1.5
`;
    const code = compileOk(src);
    expect(code).toContain('this.count = (fields.count !== undefined) ? fields.count : 0');
    expect(code).toContain('this.ratio = (fields.ratio !== undefined) ? fields.ratio : 1.5');
  });

  it('uses __rt.na for fields without default value', () => {
    const src = `
//@version=6
indicator("UDT test")
type Bar
    float o
    float h
`;
    const code = compileOk(src);
    expect(code).toContain('this.o = (fields.o !== undefined) ? fields.o : __rt.na');
    expect(code).toContain('this.h = (fields.h !== undefined) ? fields.h : __rt.na');
  });

  it('uses false for bool fields without default', () => {
    const src = `
//@version=6
indicator("UDT test")
type Flags
    bool active
`;
    const code = compileOk(src);
    expect(code).toContain('this.active = (fields.active !== undefined) ? fields.active : false');
  });
});

// ─── UDT Constructor Calls ───────────────────────────────────────────────────

describe('UDT Constructor Calls', () => {
  it('generates named arg constructor call', () => {
    const src = `
//@version=6
indicator("UDT test")
type Point
    float x = 0.0
    float y = 0.0
p = Point.new(x=1.0, y=2.0)
`;
    const code = compileOk(src);
    // 1.0 may serialize as 1 depending on lexer float handling
    expect(code).toContain('Point.new({x:');
    expect(code).toContain('y:');
  });

  it('generates positional arg constructor call', () => {
    const src = `
//@version=6
indicator("UDT test")
type Vec2
    float x = 0.0
    float y = 0.0
v = Vec2.new(1.0, 2.0)
`;
    const code = compileOk(src);
    // Positional args mapped to field names
    expect(code).toContain('Vec2.new({x:');
    expect(code).toContain('y:');
  });

  it('generates empty constructor call', () => {
    const src = `
//@version=6
indicator("UDT test")
type Pt
    float x = 0.0
p = Pt.new()
`;
    const code = compileOk(src);
    expect(code).toContain('Pt.new({})');
  });

  it('handles constructor with single named arg', () => {
    const src = `
//@version=6
indicator("UDT test")
type MyType
    float price = 0.0
    int count = 0
o = MyType.new(price=100.0)
`;
    const code = compileOk(src);
    expect(code).toContain('MyType.new({price: 100');
  });
});

// ─── UDT Method Declaration ──────────────────────────────────────────────────

describe('UDT Method Declaration codegen', () => {
  it('emits prototype method for method declaration', () => {
    const src = `
//@version=6
indicator("UDT test")
type Rect
    float w = 1.0
    float h = 1.0
method area(Rect self) =>
    self.w * self.h
`;
    const code = compileOk(src);
    expect(code).toContain('Rect.prototype.area = function()');
    expect(code).toContain('var self = this');
    expect(code).toContain('self.w * self.h');
  });

  it('emits prototype method with extra parameters', () => {
    const src = `
//@version=6
indicator("UDT test")
type Counter
    int count = 0
method increment(Counter self, int by) =>
    self.count := self.count + by
`;
    const code = compileOk(src);
    expect(code).toContain('Counter.prototype.increment = function(by)');
    expect(code).toContain('var self = this');
  });

  it('emits method with statement body', () => {
    const src = `
//@version=6
indicator("UDT test")
type Box
    float x = 0.0
method setX(Box self, float newX) =>
    self.x := newX
`;
    const code = compileOk(src);
    expect(code).toContain('Box.prototype.setX = function(newX)');
  });
});

// ─── UDT Method Calls ────────────────────────────────────────────────────────

describe('UDT Method Calls', () => {
  it('emits direct method call (not __rt dispatch)', () => {
    const src = `
//@version=6
indicator("UDT test")
type Thing
    float val = 0.0
method getValue(Thing self) =>
    self.val
t = Thing.new(val=42.0)
x = t.getValue()
`;
    const code = compileOk(src);
    // Should be direct call, NOT __rt dispatch
    expect(code).toContain('t.getValue()');
    expect(code).not.toContain('__rt.thing.getValue');
    expect(code).not.toContain('__rt.Thing.getValue');
  });

  it('emits method call with args correctly', () => {
    const src = `
//@version=6
indicator("UDT test")
type Counter
    int count = 0
method add(Counter self, int n) =>
    self.count := self.count + n
c = Counter.new()
c.add(5)
`;
    const code = compileOk(src);
    expect(code).toContain('c.add(5)');
    expect(code).not.toContain('__rt.counter.add');
  });
});

// ─── UDT Field Access ────────────────────────────────────────────────────────

describe('UDT Field Access', () => {
  it('generates plain property access', () => {
    const src = `
//@version=6
indicator("UDT test")
type Point
    float x = 0.0
p = Point.new(x=5.0)
val = p.x + 1.0
`;
    const code = compileOk(src);
    expect(code).toContain('p.x + ');
  });

  it('generates plain property assignment', () => {
    const src = `
//@version=6
indicator("UDT test")
type Box
    float x = 0.0
b = Box.new()
b.x := 10.0
`;
    const code = compileOk(src);
    expect(code).toContain('b.x = 10');
  });
});

// ─── Full Integration ────────────────────────────────────────────────────────

describe('UDT Full Integration', () => {
  it('compiles complete UDT indicator with plot', () => {
    const src = `
//@version=6
indicator("UDT Demo")
type Bar
    float h = na
    float l = na
method hl2(Bar self) =>
    (self.h + self.l) / 2
b = Bar.new(h=high, l=low)
plot(b.hl2())
`;
    const code = compileOk(src);
    expect(code).toContain('function Bar(fields)');
    expect(code).toContain('Bar.prototype.hl2 = function()');
    expect(code).toContain('Bar.new({h: __rt.high');
    expect(code).toContain('b.hl2()');
    expect(code).toContain('__rt.plot(');
  });

  it('compiles nested UDT', () => {
    const src = `
//@version=6
indicator("Nested UDT")
type Inner
    float v = 0.0
type Outer
    float x = 1.0
o = Outer.new()
i = Inner.new(v=2.0)
`;
    const code = compileOk(src);
    expect(code).toContain('function Inner(fields)');
    expect(code).toContain('function Outer(fields)');
    expect(code).toContain('Outer.new({})');
    expect(code).toContain('Inner.new({v: 2');
  });

  it('Candle UDT with range and isGreen methods', () => {
    const src = `
//@version=6
indicator("Candle UDT")
type Candle
    float open = na
    float high = na
    float low = na
    float close = na
method range(Candle self) =>
    self.high - self.low
method isGreen(Candle self) =>
    self.close > self.open
c = Candle.new(open=open, high=high, low=low, close=close)
r = c.range()
green = c.isGreen()
plot(r, "Range")
`;
    const code = compileOk(src);
    expect(code).toContain('function Candle(fields)');
    expect(code).toContain('Candle.prototype.range = function()');
    expect(code).toContain('Candle.prototype.isGreen = function()');
    expect(code).toContain('c.range()');
    expect(code).toContain('c.isGreen()');
  });
});

// ─── Function mapper: new function entries ───────────────────────────────────

describe('Function mapper new entries', () => {
  it('maps ta.hma', () => {
    const src = `
//@version=6
indicator("test")
v = ta.hma(close, 14)
plot(v)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.hma(');
  });

  it('maps ta.sar', () => {
    const src = `
//@version=6
indicator("test")
v = ta.sar(0.02, 0.02, 0.2)
plot(v)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.sar(');
  });

  it('maps ta.tsi', () => {
    const src = `
//@version=6
indicator("test")
v = ta.tsi(close, 25, 13)
plot(v)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.tsi(');
  });

  it('maps ta.linreg', () => {
    const src = `
//@version=6
indicator("test")
v = ta.linreg(close, 14, 0)
plot(v)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.linreg(');
  });

  it('maps ta.donchian', () => {
    const src = `
//@version=6
indicator("test")
[upper, lower] = ta.donchian(14)
plot(upper)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.ta.donchian(');
  });

  it('maps map.new via function-mapper', () => {
    const src = `
//@version=6
indicator("test")
m = map.new()
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.map.new(');
  });

  it('maps math.avg', () => {
    const src = `
//@version=6
indicator("test")
v = math.avg(1.0, 2.0, 3.0)
plot(v)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.math.avg(');
  });

  it('maps str.repeat', () => {
    const src = `
//@version=6
indicator("test")
s = str.repeat("x", 3)
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.str.repeat(');
  });

  it('maps input.session', () => {
    const src = `
//@version=6
indicator("test")
sess = input.session("0930-1600", "Session")
`;
    const code = compileOk(src);
    expect(code).toContain('__rt.getInput(');
  });
});

// ─── display.* and other enum constants ──────────────────────────────────────

describe('Enum constants', () => {
  it('generates display.all as string constant', () => {
    const src = `
//@version=6
indicator("test")
x = display.all
`;
    const code = compileOk(src);
    expect(code).toContain('"all"');
  });

  it('generates display.none as string constant', () => {
    const src = `
//@version=6
indicator("test")
x = display.none
`;
    const code = compileOk(src);
    expect(code).toContain('"none"');
  });

  it('generates position.top_left as string constant', () => {
    const src = `
//@version=6
indicator("test")
x = position.top_left
`;
    const code = compileOk(src);
    expect(code).toContain('"top_left"');
  });

  it('generates hline.style_solid as string constant', () => {
    const src = `
//@version=6
indicator("test")
x = hline.style_solid
`;
    const code = compileOk(src);
    expect(code).toContain('"solid"');
  });

  it('generates currency.USD as string constant', () => {
    const src = `
//@version=6
indicator("test")
c = currency.USD
`;
    const code = compileOk(src);
    expect(code).toContain('"USD"');
  });
});
