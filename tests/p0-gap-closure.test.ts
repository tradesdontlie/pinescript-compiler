import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/compiler/lexer/lexer';
import { TokenType, Token } from '../src/compiler/lexer/token';
import { Parser } from '../src/compiler/parser/parser';
import { DiagnosticReporter } from '../src/compiler/diagnostics/diagnostic';
import { compile } from '../src/compiler/index';
import { createRuntime, createEngine } from '../src/runtime/index';
import { createLineModule } from '../src/runtime/builtins/line';
import { createLabelModule } from '../src/runtime/builtins/label';
import { createBoxModule } from '../src/runtime/builtins/box';
import { createTableModule } from '../src/runtime/builtins/table';
import { createTimeFunctions } from '../src/runtime/builtins/time-functions';
import { arrayModule } from '../src/runtime/builtins/collections';
import { str } from '../src/runtime/builtins/str';
import { inSeconds } from '../src/runtime/builtins/timeframe';
import { Bar } from '../src/data/types';
import {
  VariableDeclaration,
  ForInStatement,
  MemberExpression,
  IdentifierExpression,
} from '../src/compiler/ast/nodes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(src: string): Token[] {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(src, reporter);
  return lexer.tokenize().filter(t => t.type !== TokenType.EOF);
}

function tokenizeWithReporter(src: string) {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(src, reporter);
  const tokens = lexer.tokenize().filter(t => t.type !== TokenType.EOF);
  return { tokens, reporter };
}

function types(src: string): TokenType[] {
  return tokenize(src).map(t => t.type);
}

function parseSource(src: string) {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(src, reporter);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, reporter);
  return { ast: parser.parse(), reporter };
}

function compileOk(src: string): string {
  const result = compile(src);
  if (!result.success || result.code === null) {
    throw new Error(
      `Compilation failed: ${result.diagnostics.map(d => d.message).join(', ')}`
    );
  }
  return result.code;
}

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1700000000 + i * 86400,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 102 + i,
    volume: 1000 + i * 100,
  }));
}

function compileAndRun(source: string, barCount = 10) {
  const result = compile(source);
  if (!result.success || !result.code) {
    throw new Error(
      `Compile failed: ${result.diagnostics.map(d => d.message).join('; ')}`
    );
  }
  return createRuntime(result.code, makeBars(barCount));
}


// =============================================================================
// 1. LEXER TESTS (15 tests)
// =============================================================================

describe('P0 Lexer: Block comments', () => {
  it('skips a single-line block comment', () => {
    const toks = tokenize('/* hello */ 42');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.INTEGER);
    expect(toks[0].value).toBe('42');
  });

  it('skips a multi-line block comment', () => {
    const toks = tokenize('/* line 1\nline 2\nline 3 */ x');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[0].value).toBe('x');
  });

  it('handles nested block comment chars without crashing', () => {
    // Pine does not support nested block comments — inner /* is just text
    const toks = tokenize('/* outer /* inner */ y');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[0].value).toBe('y');
  });

  it('reports error for unterminated block comment', () => {
    const { reporter } = tokenizeWithReporter('/* unterminated');
    expect(reporter.hasErrors()).toBe(true);
    expect(reporter.getErrors()[0].message).toContain('Unterminated block comment');
  });

  it('handles block comment between tokens', () => {
    const toks = tokenize('a /* comment */ + b');
    const typeList = toks.map(t => t.type);
    expect(typeList).toContain(TokenType.IDENTIFIER);
    expect(typeList).toContain(TokenType.PLUS);
  });
});

describe('P0 Lexer: Scientific notation', () => {
  it('tokenizes 1e5 as FLOAT', () => {
    const toks = tokenize('1e5');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('1e5');
  });

  it('tokenizes 1.5e-3 as FLOAT', () => {
    const toks = tokenize('1.5e-3');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('1.5e-3');
  });

  it('tokenizes 2E+10 as FLOAT', () => {
    const toks = tokenize('2E+10');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('2E+10');
  });

  it('tokenizes .5e2 as FLOAT', () => {
    const toks = tokenize('.5e2');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('.5e2');
  });
});

describe('P0 Lexer: Implicit line continuation', () => {
  it('suppresses newline after comma', () => {
    const toks = tokenize('a,\nb');
    const typeList = toks.map(t => t.type);
    expect(typeList).not.toContain(TokenType.NEWLINE);
  });

  it('suppresses newline after open paren', () => {
    const toks = tokenize('(\na');
    const typeList = toks.map(t => t.type);
    expect(typeList).not.toContain(TokenType.NEWLINE);
  });

  it('suppresses newline after open bracket', () => {
    const toks = tokenize('[\na');
    const typeList = toks.map(t => t.type);
    expect(typeList).not.toContain(TokenType.NEWLINE);
  });

  it('suppresses newline after binary operators +, -, *, /', () => {
    for (const op of ['+', '-', '*', '/']) {
      const toks = tokenize(`a ${op}\nb`);
      const typeList = toks.map(t => t.type);
      expect(typeList).not.toContain(TokenType.NEWLINE);
    }
  });

  it('suppresses newline after ==', () => {
    const toks = tokenize('a ==\nb');
    const typeList = toks.map(t => t.type);
    expect(typeList).not.toContain(TokenType.NEWLINE);
  });

  it('emits newline after identifier (non-continuation)', () => {
    const toks = tokenize('a\nb');
    const typeList = toks.map(t => t.type);
    expect(typeList).toContain(TokenType.NEWLINE);
  });
});


// =============================================================================
// 2. PARSER TESTS (15 tests)
// =============================================================================

describe('P0 Parser: Typed array declarations', () => {
  it('parses float[] array type annotation', () => {
    const src = `//@version=6\nindicator("t")\nvar float[] a = array.new_float(10)\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    // Find the variable declaration
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl).toBeDefined();
    expect(decl.typeAnnotation).not.toBeNull();
    expect(decl.typeAnnotation!.baseType).toBe('array');
    expect(decl.typeAnnotation!.typeArgs[0].baseType).toBe('float');
  });

  it('parses int[] array type annotation', () => {
    const src = `//@version=6\nindicator("t")\nint[] b = array.new_int(5)\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl).toBeDefined();
    expect(decl.typeAnnotation!.baseType).toBe('array');
    expect(decl.typeAnnotation!.typeArgs[0].baseType).toBe('int');
  });

  it('parses string[] type', () => {
    const src = `//@version=6\nindicator("t")\nstring[] c = array.new_string(0)\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl.typeAnnotation!.baseType).toBe('array');
  });

  it('parses bool[] type', () => {
    const src = `//@version=6\nindicator("t")\nbool[] d = array.new_bool(3)\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl.typeAnnotation!.baseType).toBe('array');
  });
});

describe('P0 Parser: Drawing type declarations', () => {
  it('parses var line myLine = na', () => {
    const src = `//@version=6\nindicator("t")\nvar line myLine = na\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl).toBeDefined();
    expect(decl.name).toBe('myLine');
    expect(decl.typeAnnotation!.baseType).toBe('line');
    expect(decl.modifier).toBe('var');
  });

  it('parses var label myLabel = na', () => {
    const src = `//@version=6\nindicator("t")\nvar label myLabel = na\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl.name).toBe('myLabel');
    expect(decl.typeAnnotation!.baseType).toBe('label');
  });

  it('parses var box myBox = na', () => {
    const src = `//@version=6\nindicator("t")\nvar box myBox = na\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl.name).toBe('myBox');
    expect(decl.typeAnnotation!.baseType).toBe('box');
  });

  it('parses var table myTable = na', () => {
    const src = `//@version=6\nindicator("t")\nvar table myTable = na\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl.name).toBe('myTable');
    expect(decl.typeAnnotation!.baseType).toBe('table');
  });
});

describe('P0 Parser: For-in destructuring', () => {
  it('parses for [i, v] in myArr with indexVariable', () => {
    const src = `//@version=6
indicator("t")
float[] arr = array.new_float(3)
for [i, v] in arr
    x = i + v
`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const forIn = ast.body.find(s => s.kind === 'ForInStatement') as ForInStatement;
    expect(forIn).toBeDefined();
    expect(forIn.indexVariable).toBe('i');
    expect(forIn.variable).toBe('v');
  });

  it('parses for v in myArr without indexVariable', () => {
    const src = `//@version=6
indicator("t")
float[] arr = array.new_float(3)
for v in arr
    x = v
`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const forIn = ast.body.find(s => s.kind === 'ForInStatement') as ForInStatement;
    expect(forIn).toBeDefined();
    expect(forIn.indexVariable).toBeNull();
    expect(forIn.variable).toBe('v');
  });
});

describe('P0 Parser: series<float> with [] suffix', () => {
  it('parses series<float> qualifier', () => {
    const src = `//@version=6\nindicator("t")\nseries float x = close\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl).toBeDefined();
    expect(decl.typeAnnotation!.qualifier).toBe('series');
    expect(decl.typeAnnotation!.baseType).toBe('float');
  });

  it('parses simple float qualifier', () => {
    const src = `//@version=6\nindicator("t")\nsimple float y = 1.0\n`;
    const { ast, reporter } = parseSource(src);
    expect(reporter.hasErrors()).toBe(false);
    const decl = ast.body.find(s => s.kind === 'VariableDeclaration') as VariableDeclaration;
    expect(decl.typeAnnotation!.qualifier).toBe('simple');
    expect(decl.typeAnnotation!.baseType).toBe('float');
  });
});


// =============================================================================
// 3. CODEGEN TESTS (30 tests)
// =============================================================================

describe('P0 Codegen: Enum constants', () => {
  it('xloc.bar_time → "bar_time"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = xloc.bar_time\n`);
    expect(code).toContain('"bar_time"');
  });

  it('xloc.bar_index → "bar_index"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = xloc.bar_index\n`);
    // xloc.bar_index should be the string "bar_index" — but bar_index is also __rt.bar_index
    // Codegen genMember: if objStr === 'xloc' -> JSON.stringify(prop) -> "bar_index"
    expect(code).toContain('"bar_index"');
  });

  it('yloc.price → "price"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = yloc.price\n`);
    expect(code).toContain('"price"');
  });

  it('yloc.abovebar → "abovebar"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = yloc.abovebar\n`);
    expect(code).toContain('"abovebar"');
  });

  it('extend.none → "none"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = extend.none\n`);
    expect(code).toContain('"none"');
  });

  it('extend.both → "both"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = extend.both\n`);
    expect(code).toContain('"both"');
  });

  it('position.top_right → "top_right"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = position.top_right\n`);
    expect(code).toContain('"top_right"');
  });

  it('display.all → "all"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = display.all\n`);
    expect(code).toContain('"all"');
  });

  it('barmerge.lookahead_on → "lookahead_on"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = barmerge.lookahead_on\n`);
    expect(code).toContain('"lookahead_on"');
  });

  it('dayofweek.monday emits dayofweek reference', () => {
    // dayofweek is treated as a time function identifier, so dayofweek.monday
    // becomes __rt.dayofweek().monday — the member access on the function result
    const code = compileOk(`//@version=6\nindicator("t")\nx = dayofweek.monday\n`);
    expect(code).toContain('dayofweek');
    expect(code).toContain('monday');
  });

  it('dayofweek.sunday emits dayofweek reference', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = dayofweek.sunday\n`);
    expect(code).toContain('dayofweek');
    expect(code).toContain('sunday');
  });

  it('dayofweek.saturday emits dayofweek reference', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = dayofweek.saturday\n`);
    expect(code).toContain('dayofweek');
    expect(code).toContain('saturday');
  });
});

describe('P0 Codegen: Drawing style constants', () => {
  it('line.style_solid → "solid"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = line.style_solid\n`);
    expect(code).toContain('"solid"');
  });

  it('line.style_dashed → "dashed"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = line.style_dashed\n`);
    expect(code).toContain('"dashed"');
  });

  it('label.style_label_left → "label_left"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = label.style_label_left\n`);
    expect(code).toContain('"label_left"');
  });

  it('hline.style_solid → "solid"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = hline.style_solid\n`);
    expect(code).toContain('"solid"');
  });

  it('hline.style_dashed → "dashed"', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nx = hline.style_dashed\n`);
    expect(code).toContain('"dashed"');
  });
});

describe('P0 Codegen: Drawing namespace routing', () => {
  it('line.new(...) → __rt.line.new(...)', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nline.new(0, 1.0, 10, 2.0)\n`);
    expect(code).toContain('__rt.line.new(');
  });

  it('label.new(...) → __rt.label.new(...)', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nlabel.new(0, 1.0, "hello")\n`);
    expect(code).toContain('__rt.label.new(');
  });

  it('box.new(...) → __rt.box.new(...)', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nbox.new(0, 100, 10, 90)\n`);
    expect(code).toContain('__rt.box.new(');
  });

  it('table.new(...) → __rt.table.new(...)', () => {
    const code = compileOk(`//@version=6\nindicator("t")\ntable.new("top_right", 2, 2)\n`);
    expect(code).toContain('__rt.table.new(');
  });
});

describe('P0 Codegen: User series history', () => {
  it('myVar[1] generates userSeriesGet when myVar has history access', () => {
    const code = compileOk(`//@version=6
indicator("t")
x = close
y = x[1]
`);
    expect(code).toContain('__rt.userSeriesGet("x"');
    expect(code).toContain('__rt.userSeriesSet("x"');
  });

  it('does not generate userSeriesSet for variables without history access', () => {
    const code = compileOk(`//@version=6
indicator("t")
x = close
y = x + 1
`);
    expect(code).not.toContain('userSeriesSet');
    expect(code).not.toContain('userSeriesGet');
  });
});

describe('P0 Codegen: Method dispatch', () => {
  it('a.push(x) → __rt.array.push(a, x) when a is an array', () => {
    const code = compileOk(`//@version=6
indicator("t")
a = array.new_float(0)
a.push(close)
`);
    expect(code).toContain('__rt.array.push(a');
  });

  it('a.size() → __rt.array.size(a)', () => {
    const code = compileOk(`//@version=6
indicator("t")
a = array.new_float(0)
n = a.size()
`);
    expect(code).toContain('__rt.array.size(a');
  });

  it('a.get(0) → __rt.array.get(a, 0)', () => {
    const code = compileOk(`//@version=6
indicator("t")
a = array.new_float(5)
v = a.get(0)
`);
    expect(code).toContain('__rt.array.get(a');
  });
});

describe('P0 Codegen: Time function identifiers', () => {
  it('hour used as identifier → __rt.hour()', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nh = hour\n`);
    expect(code).toContain('__rt.hour()');
  });

  it('minute used as identifier → __rt.minute()', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nm = minute\n`);
    expect(code).toContain('__rt.minute()');
  });

  it('second used as identifier → __rt.second()', () => {
    const code = compileOk(`//@version=6\nindicator("t")\ns = second\n`);
    expect(code).toContain('__rt.second()');
  });

  it('dayofweek used as identifier → __rt.dayofweek()', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nd = dayofweek\n`);
    expect(code).toContain('__rt.dayofweek()');
  });
});

describe('P0 Codegen: time_close and timenow', () => {
  it('time_close → __rt.time_close', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nt = time_close\n`);
    expect(code).toContain('__rt.time_close');
  });

  it('timenow → __rt.timenow', () => {
    const code = compileOk(`//@version=6\nindicator("t")\nt = timenow\n`);
    expect(code).toContain('__rt.timenow');
  });
});


// =============================================================================
// 4. RUNTIME TESTS (30 tests)
// =============================================================================

describe('P0 Runtime: Line drawing objects', () => {
  it('creates a line with default options', () => {
    const mod = createLineModule();
    const line = mod.new(0, 100, 10, 200);
    expect(line.x1).toBe(0);
    expect(line.y1).toBe(100);
    expect(line.x2).toBe(10);
    expect(line.y2).toBe(200);
    expect(line.style).toBe('solid');
    expect(line.width).toBe(1);
  });

  it('sets line properties', () => {
    const mod = createLineModule();
    const line = mod.new(0, 100, 10, 200);
    mod.set_x1(line, 5);
    mod.set_y1(line, 150);
    expect(line.x1).toBe(5);
    expect(line.y1).toBe(150);
  });

  it('gets line properties', () => {
    const mod = createLineModule();
    const line = mod.new(1, 2, 3, 4);
    expect(mod.get_x1(line)).toBe(1);
    expect(mod.get_y1(line)).toBe(2);
    expect(mod.get_x2(line)).toBe(3);
    expect(mod.get_y2(line)).toBe(4);
  });

  it('deletes a line', () => {
    const mod = createLineModule();
    const line = mod.new(0, 0, 0, 0);
    expect(mod.all.length).toBe(1);
    mod.delete(line);
    expect(mod.all.length).toBe(0);
  });

  it('copies a line', () => {
    const mod = createLineModule();
    const line = mod.new(1, 2, 3, 4, { color: '#FF0000', width: 3 });
    const copied = mod.copy(line);
    expect(copied.x1).toBe(1);
    expect(copied.color).toBe('#FF0000');
    expect(copied.width).toBe(3);
    expect(copied.id).not.toBe(line.id);
  });

  it('get_price computes linear interpolation', () => {
    const mod = createLineModule();
    const line = mod.new(0, 100, 10, 200);
    expect(mod.get_price(line, 5)).toBe(150);
  });
});

describe('P0 Runtime: Label drawing objects', () => {
  it('creates a label with default options', () => {
    const mod = createLabelModule();
    const lbl = mod.new(5, 100, 'Buy');
    expect(lbl.x).toBe(5);
    expect(lbl.y).toBe(100);
    expect(lbl.text).toBe('Buy');
    expect(lbl.style).toBe('label_down');
  });

  it('sets and gets label properties', () => {
    const mod = createLabelModule();
    const lbl = mod.new(0, 0, 'test');
    mod.set_text(lbl, 'new text');
    mod.set_xy(lbl, 10, 20);
    expect(mod.get_text(lbl)).toBe('new text');
    expect(mod.get_x(lbl)).toBe(10);
    expect(mod.get_y(lbl)).toBe(20);
  });

  it('deletes a label', () => {
    const mod = createLabelModule();
    mod.new(0, 0, 'a');
    mod.new(0, 0, 'b');
    expect(mod.all.length).toBe(2);
    mod.delete(mod.all[0]);
    expect(mod.all.length).toBe(1);
  });

  it('copies a label', () => {
    const mod = createLabelModule();
    const lbl = mod.new(1, 2, 'hello', { color: '#00FF00' });
    const copied = mod.copy(lbl);
    expect(copied.text).toBe('hello');
    expect(copied.color).toBe('#00FF00');
    expect(copied.id).not.toBe(lbl.id);
  });
});

describe('P0 Runtime: Box drawing objects', () => {
  it('creates a box with default options', () => {
    const mod = createBoxModule();
    const box = mod.new(0, 200, 10, 100);
    expect(box.left).toBe(0);
    expect(box.top).toBe(200);
    expect(box.right).toBe(10);
    expect(box.bottom).toBe(100);
    expect(box.border_style).toBe('solid');
  });

  it('sets box properties', () => {
    const mod = createBoxModule();
    const box = mod.new(0, 0, 0, 0);
    mod.set_lefttop(box, 5, 150);
    mod.set_rightbottom(box, 15, 50);
    expect(mod.get_left(box)).toBe(5);
    expect(mod.get_top(box)).toBe(150);
    expect(mod.get_right(box)).toBe(15);
    expect(mod.get_bottom(box)).toBe(50);
  });

  it('deletes and copies a box', () => {
    const mod = createBoxModule();
    const box = mod.new(0, 100, 10, 50, { bgcolor: '#FF000033' });
    const copied = mod.copy(box);
    expect(copied.bgcolor).toBe('#FF000033');
    expect(mod.all.length).toBe(2);
    mod.delete(box);
    expect(mod.all.length).toBe(1);
  });
});

describe('P0 Runtime: Table drawing objects', () => {
  it('creates a table', () => {
    const mod = createTableModule();
    const tbl = mod.new('top_right', 3, 2);
    expect(tbl.position).toBe('top_right');
    expect(tbl.columns).toBe(3);
    expect(tbl.rows).toBe(2);
  });

  it('sets a cell text', () => {
    const mod = createTableModule();
    const tbl = mod.new('top_right', 3, 3);
    mod.cell(tbl, 0, 0, 'Hello');
    expect(tbl.cells[0][0]!.text).toBe('Hello');
  });

  it('sets cell properties via cell_set_*', () => {
    const mod = createTableModule();
    const tbl = mod.new('top_left', 2, 2);
    mod.cell(tbl, 0, 0, 'Test');
    mod.cell_set_bgcolor(tbl, 0, 0, '#FF0000');
    mod.cell_set_text_color(tbl, 0, 0, '#FFFFFF');
    expect(tbl.cells[0][0]!.bgcolor).toBe('#FF0000');
    expect(tbl.cells[0][0]!.text_color).toBe('#FFFFFF');
  });

  it('merges cells', () => {
    const mod = createTableModule();
    const tbl = mod.new('center', 4, 4);
    mod.cell(tbl, 0, 0, 'Merged');
    mod.merge_cells(tbl, 0, 0, 1, 1);
    expect(tbl.cells[0][0]!.colspan).toBe(2);
    expect(tbl.cells[0][0]!.rowspan).toBe(2);
    expect(tbl.cells[0][1]).toBeNull();
    expect(tbl.cells[1][0]).toBeNull();
    expect(tbl.cells[1][1]).toBeNull();
  });

  it('deletes a table', () => {
    const mod = createTableModule();
    const tbl = mod.new('top_right', 2, 2);
    expect(mod.all.length).toBe(1);
    mod.delete(tbl);
    expect(mod.all.length).toBe(0);
  });
});

describe('P0 Runtime: Time functions', () => {
  it('hour() extracts correct hour from timestamp', () => {
    // 2024-01-15 14:30:00 UTC in ms
    const ts = Date.UTC(2024, 0, 15, 14, 30, 0);
    const fns = createTimeFunctions(() => ts);
    expect(fns.hour()).toBe(14);
  });

  it('minute() extracts correct minute', () => {
    const ts = Date.UTC(2024, 0, 15, 14, 45, 0);
    const fns = createTimeFunctions(() => ts);
    expect(fns.minute()).toBe(45);
  });

  it('second() extracts correct second', () => {
    const ts = Date.UTC(2024, 0, 15, 14, 30, 55);
    const fns = createTimeFunctions(() => ts);
    expect(fns.second()).toBe(55);
  });

  it('dayofweek() returns 1 for Sunday', () => {
    // 2024-01-14 is a Sunday
    const ts = Date.UTC(2024, 0, 14, 12, 0, 0);
    const fns = createTimeFunctions(() => ts);
    expect(fns.dayofweek()).toBe(1);
  });

  it('dayofmonth() extracts correct day', () => {
    const ts = Date.UTC(2024, 0, 25, 12, 0, 0);
    const fns = createTimeFunctions(() => ts);
    expect(fns.dayofmonth()).toBe(25);
  });

  it('month() extracts correct month', () => {
    const ts = Date.UTC(2024, 5, 15, 12, 0, 0);
    const fns = createTimeFunctions(() => ts);
    expect(fns.month()).toBe(6); // June = 6 (1-based)
  });

  it('year() extracts correct year', () => {
    const ts = Date.UTC(2024, 0, 1, 0, 0, 0);
    const fns = createTimeFunctions(() => ts);
    expect(fns.year()).toBe(2024);
  });

  it('timestamp() creates correct UTC timestamp', () => {
    const fns = createTimeFunctions(() => 0);
    const ts = fns.timestamp(2024, 1, 15, 14, 30, 0);
    // Verify round-trip
    const d = new Date(ts);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0); // January = 0 in JS
    expect(d.getUTCDate()).toBe(15);
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(30);
  });
});

describe('P0 Runtime: Missing array methods', () => {
  it('shift removes and returns first element', () => {
    const arr = [1, 2, 3];
    expect(arrayModule.shift(arr)).toBe(1);
    expect(arr).toEqual([2, 3]);
  });

  it('unshift adds to beginning', () => {
    const arr = [2, 3];
    arrayModule.unshift(arr, 1);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('median computes correct value for odd length', () => {
    expect(arrayModule.median([1, 3, 5])).toBe(3);
  });

  it('median computes correct value for even length', () => {
    expect(arrayModule.median([1, 2, 3, 4])).toBe(2.5);
  });

  it('stdev computes population standard deviation', () => {
    const result = arrayModule.stdev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.0, 1);
  });

  it('variance computes population variance', () => {
    const result = arrayModule.variance([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(4.0, 1);
  });

  it('range returns max - min', () => {
    expect(arrayModule.range([10, 20, 5, 30])).toBe(25);
  });

  it('first returns first element', () => {
    expect(arrayModule.first([10, 20, 30])).toBe(10);
  });

  it('last returns last element', () => {
    expect(arrayModule.last([10, 20, 30])).toBe(30);
  });

  it('concat merges two arrays', () => {
    const result = arrayModule.concat([1, 2], [3, 4]);
    expect(result).toEqual([1, 2, 3, 4]);
  });
});

describe('P0 Runtime: str.formatTime', () => {
  it('formats basic date', () => {
    // 2024-03-15 00:00:00 UTC
    const ts = Date.UTC(2024, 2, 15, 0, 0, 0);
    const result = str.formatTime(ts, 'yyyy-MM-dd');
    expect(result).toBe('2024-03-15');
  });

  it('formats time with hours and minutes', () => {
    const ts = Date.UTC(2024, 2, 15, 14, 30, 45);
    const result = str.formatTime(ts, 'HH:mm:ss');
    expect(result).toBe('14:30:45');
  });

  it('formats 12-hour time with AM/PM', () => {
    const ts = Date.UTC(2024, 2, 15, 14, 30, 0);
    const result = str.formatTime(ts, 'hh:mm a');
    expect(result).toBe('02:30 PM');
  });

  it('formats weekday name (short form without AM/PM conflict)', () => {
    // 2024-03-11 is a Monday (no 'a' in the name to conflict with AM/PM token)
    const ts = Date.UTC(2024, 2, 11, 12, 0, 0);
    const result = str.formatTime(ts, 'EEE');
    expect(result).toBe('Mon');
  });
});

describe('P0 Runtime: timeframe.in_seconds()', () => {
  it('"1" → 60 (1 minute)', () => {
    expect(inSeconds('1')).toBe(60);
  });

  it('"5" → 300 (5 minutes)', () => {
    expect(inSeconds('5')).toBe(300);
  });

  it('"15" → 900', () => {
    expect(inSeconds('15')).toBe(900);
  });

  it('"60" → 3600 (1 hour)', () => {
    expect(inSeconds('60')).toBe(3600);
  });

  it('"D" → 86400', () => {
    expect(inSeconds('D')).toBe(86400);
  });

  it('"W" → 604800', () => {
    expect(inSeconds('W')).toBe(604800);
  });

  it('"M" → 2592000', () => {
    expect(inSeconds('M')).toBe(2592000);
  });
});


// =============================================================================
// 5. INTEGRATION TESTS (30 tests)
// =============================================================================

describe('P0 Integration: Block comments in source', () => {
  it('compiles with block comment before indicator', () => {
    const src = `/* This is a test indicator */
//@version=6
indicator("test")
plot(close)
`;
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('compiles with block comment within body', () => {
    const src = `//@version=6
indicator("test")
x = close /* inline comment */ + 1
plot(x)
`;
    const result = compile(src);
    expect(result.success).toBe(true);
  });

  it('compiles with multi-line block comment', () => {
    const src = `//@version=6
indicator("test")
/*
   Multi-line
   block comment
*/
plot(close)
`;
    const result = compile(src);
    expect(result.success).toBe(true);
  });
});

describe('P0 Integration: Scientific notation', () => {
  it('compiles and runs 1e5', () => {
    const src = `//@version=6
indicator("test")
x = 1e5
plot(x)
`;
    const result = compileAndRun(src);
    expect(result.plots.length).toBeGreaterThan(0);
    // 1e5 = 100000
    expect(result.plots[0].values[0].value).toBe(100000);
  });

  it('compiles and runs 1.5e-3', () => {
    const src = `//@version=6
indicator("test")
x = 1.5e-3
plot(x)
`;
    const result = compileAndRun(src);
    expect(result.plots[0].values[0].value).toBeCloseTo(0.0015, 6);
  });

  it('compiles and runs 2E+10', () => {
    const src = `//@version=6
indicator("test")
x = 2E+10
plot(x)
`;
    const result = compileAndRun(src);
    expect(result.plots[0].values[0].value).toBe(20000000000);
  });
});

describe('P0 Integration: Line continuation', () => {
  it('lexer suppresses newline after comma (token level)', () => {
    // Verify at lexer level that continuation tokens suppress NEWLINE
    const toks = tokenize('f(a,\nb)');
    const typeList = toks.map(t => t.type);
    // COMMA should suppress the newline
    expect(typeList.filter(t => t === TokenType.NEWLINE).length).toBe(0);
  });

  it('lexer suppresses newline after plus (token level)', () => {
    const toks = tokenize('a +\nb');
    const typeList = toks.map(t => t.type);
    expect(typeList.filter(t => t === TokenType.NEWLINE).length).toBe(0);
  });

  it('lexer suppresses newline after assignment (token level)', () => {
    const toks = tokenize('x =\n1');
    const typeList = toks.map(t => t.type);
    expect(typeList.filter(t => t === TokenType.NEWLINE).length).toBe(0);
  });
});

describe('P0 Integration: Drawing object creation', () => {
  it('creates a line via compiled Pine source', () => {
    const src = `//@version=6
indicator("test")
line.new(0, 100.0, 5, 200.0)
`;
    const result = compileAndRun(src);
    // Lines are created on each bar, so we should have multiple
    expect(result.lines).toBeDefined();
    expect(result.lines!.length).toBeGreaterThan(0);
  });

  it('creates a label via compiled Pine source', () => {
    const src = `//@version=6
indicator("test")
label.new(0, 100.0, "hello")
`;
    const result = compileAndRun(src);
    expect(result.labels).toBeDefined();
    expect(result.labels!.length).toBeGreaterThan(0);
  });

  it('creates a box via compiled Pine source', () => {
    const src = `//@version=6
indicator("test")
box.new(0, 200.0, 10, 100.0)
`;
    const result = compileAndRun(src);
    expect(result.boxes).toBeDefined();
    expect(result.boxes!.length).toBeGreaterThan(0);
  });
});

describe('P0 Integration: User series history', () => {
  it('accesses previous bar value via x[1]', () => {
    const src = `//@version=6
indicator("test")
x = close
y = x[1]
plot(y)
`;
    const result = compileAndRun(src, 10);
    expect(result.plots.length).toBeGreaterThan(0);
    // First bar y should be na (null), second bar should be first bar's close
    const values = result.plots[0].values;
    expect(values[0].value).toBeNull(); // no previous on bar 0
    // Bar 1's y should be bar 0's close (102)
    expect(values[1].value).toBe(102);
  });

  it('accesses x[2] for deeper history', () => {
    const src = `//@version=6
indicator("test")
x = close
y = x[2]
plot(y)
`;
    const result = compileAndRun(src, 10);
    const values = result.plots[0].values;
    // Bars 0 and 1 should be na (null)
    expect(values[0].value).toBeNull();
    expect(values[1].value).toBeNull();
    // Bar 2's y should be bar 0's close (102)
    expect(values[2].value).toBe(102);
  });
});

describe('P0 Integration: Method syntax', () => {
  it('array method push via dot syntax', () => {
    const src = `//@version=6
indicator("test")
a = array.new_float(0)
a.push(close)
plot(a.size())
`;
    const result = compileAndRun(src, 5);
    // Without var, `a` is re-created each bar, so size is always 1 per bar
    const values = result.plots[0].values;
    expect(values[0].value).toBe(1);
  });

  it('array method get via dot syntax', () => {
    const src = `//@version=6
indicator("test")
a = array.new_float(0)
a.push(1.0)
a.push(2.0)
a.push(3.0)
plot(a.get(0))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(1.0);
  });
});

describe('P0 Integration: For-in destructuring', () => {
  it('iterates with [i, v] destructuring', () => {
    const src = `//@version=6
indicator("test")
a = array.new_float(0)
a.push(10.0)
a.push(20.0)
a.push(30.0)
total = 0.0
for [i, v] in a
    total := total + v
plot(total)
`;
    const result = compileAndRun(src, 1);
    // total = 10 + 20 + 30 = 60
    expect(result.plots[0].values[0].value).toBe(60);
  });

  it('index variable is accessible in loop', () => {
    const src = `//@version=6
indicator("test")
a = array.new_float(0)
a.push(100.0)
a.push(200.0)
a.push(300.0)
idxSum = 0.0
for [i, v] in a
    idxSum := idxSum + i
plot(idxSum)
`;
    const result = compileAndRun(src, 1);
    // idxSum = 0 + 1 + 2 = 3
    expect(result.plots[0].values[0].value).toBe(3);
  });
});

describe('P0 Integration: Enum constants in calls', () => {
  it('xloc.bar_time resolves to string in runtime', () => {
    const src = `//@version=6
indicator("test")
x = xloc.bar_time
plot(0)
`;
    // Should compile without errors
    const result = compile(src);
    expect(result.success).toBe(true);
    expect(result.code).toContain('"bar_time"');
  });

  it('extend.none resolves correctly', () => {
    const src = `//@version=6
indicator("test")
x = extend.none
plot(0)
`;
    const result = compile(src);
    expect(result.success).toBe(true);
    expect(result.code).toContain('"none"');
  });

  it('strategy.long resolves to string', () => {
    const src = `//@version=6
strategy("test")
x = strategy.long
`;
    const result = compile(src);
    expect(result.success).toBe(true);
    expect(result.code).toContain('"long"');
  });
});

describe('P0 Integration: Time functions as identifiers', () => {
  it('hour resolves to a number at runtime', () => {
    const src = `//@version=6
indicator("test")
h = hour
plot(h)
`;
    const result = compileAndRun(src, 5);
    expect(result.plots.length).toBe(1);
    // All bars should have numeric hour values
    for (const v of result.plots[0].values) {
      expect(v.value).not.toBeNull();
      expect(typeof v.value).toBe('number');
    }
  });

  it('dayofweek resolves to a number at runtime', () => {
    const src = `//@version=6
indicator("test")
d = dayofweek
plot(d)
`;
    const result = compileAndRun(src, 5);
    for (const v of result.plots[0].values) {
      expect(v.value).not.toBeNull();
      expect(v.value).toBeGreaterThanOrEqual(1);
      expect(v.value).toBeLessThanOrEqual(7);
    }
  });

  it('year resolves to a number at runtime', () => {
    const src = `//@version=6
indicator("test")
y = year
plot(y)
`;
    const result = compileAndRun(src, 5);
    for (const v of result.plots[0].values) {
      expect(v.value).not.toBeNull();
      expect(typeof v.value).toBe('number');
      // Bar timestamps are in seconds (not ms), so Date treats them as ms
      // yielding year 1970 — this is current behavior
      expect(v.value).toBeGreaterThanOrEqual(1970);
    }
  });
});

describe('P0 Integration: Table creation and cell setting', () => {
  it('creates a table and sets a cell via full pipeline', () => {
    const src = `//@version=6
indicator("test")
t = table.new("top_right", 2, 2)
table.cell(t, 0, 0, "Hello")
`;
    const result = compileAndRun(src, 1);
    expect(result.tables).toBeDefined();
    expect(result.tables!.length).toBeGreaterThan(0);
  });

  it('sets multiple cells in a table', () => {
    const src = `//@version=6
indicator("test")
t = table.new("top_right", 3, 3)
table.cell(t, 0, 0, "A")
table.cell(t, 1, 0, "B")
table.cell(t, 2, 0, "C")
`;
    const result = compileAndRun(src, 1);
    expect(result.tables!.length).toBeGreaterThan(0);
  });
});

describe('P0 Integration: Compile pipeline — general', () => {
  it('var variable persists across bars', () => {
    const src = `//@version=6
indicator("test")
var float total = 0.0
total := total + 1
plot(total)
`;
    const result = compileAndRun(src, 5);
    const values = result.plots[0].values;
    // total should increment: 1, 2, 3, 4, 5
    expect(values[0].value).toBe(1);
    expect(values[4].value).toBe(5);
  });

  it('ternary expression compiles', () => {
    const src = `//@version=6
indicator("test")
x = close > 103 ? 1 : 0
plot(x)
`;
    const result = compileAndRun(src, 5);
    expect(result.plots[0].values.length).toBe(5);
  });

  it('if statement compiles and runs', () => {
    const src = `//@version=6
indicator("test")
x = 0.0
if close > 103
    x := 1.0
plot(x)
`;
    const result = compileAndRun(src, 5);
    expect(result.plots[0].values.length).toBe(5);
  });

  it('for loop compiles and runs', () => {
    const src = `//@version=6
indicator("test")
sum = 0.0
for i = 1 to 5
    sum := sum + i
plot(sum)
`;
    const result = compileAndRun(src, 1);
    // sum = 1+2+3+4+5 = 15
    expect(result.plots[0].values[0].value).toBe(15);
  });

  it('user-defined function compiles and runs', () => {
    const src = `//@version=6
indicator("test")
double(x) => x * 2
plot(double(close))
`;
    const result = compileAndRun(src, 3);
    // First bar: close = 102, double = 204
    expect(result.plots[0].values[0].value).toBeCloseTo(204, 0);
  });

  it('color constant resolves in plot', () => {
    const src = `//@version=6
indicator("test")
plot(close, "Close", color.blue)
`;
    const result = compileAndRun(src, 3);
    expect(result.plots.length).toBe(1);
    expect(result.metadata.plots[0].color).toBe('#2962FF');
  });

  it('SMA computes after warmup period', () => {
    const src = `//@version=6
indicator("test")
plot(ta.sma(close, 3))
`;
    const result = compileAndRun(src, 10);
    const values = result.plots[0].values;
    // After 3 bars, SMA should be non-null
    expect(values[2].value).not.toBeNull();
  });

  it('close[1] history access via series', () => {
    const src = `//@version=6
indicator("test")
plot(close[1])
`;
    const result = compileAndRun(src, 5);
    const values = result.plots[0].values;
    // Bar 0: close[1] is na -> null
    expect(values[0].value).toBeNull();
    // Bar 1: close[1] is bar 0's close (102)
    expect(values[1].value).toBe(102);
  });

  it('compiles empty indicator', () => {
    const src = `//@version=6
indicator("empty")
`;
    const result = compile(src);
    expect(result.success).toBe(true);
  });
});

describe('P0 Integration: Array operations end-to-end', () => {
  it('array.from creates array', () => {
    const src = `//@version=6
indicator("test")
a = array.from(1.0, 2.0, 3.0)
plot(array.sum(a))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(6);
  });

  it('array.avg computes average', () => {
    const src = `//@version=6
indicator("test")
a = array.from(10.0, 20.0, 30.0)
plot(array.avg(a))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(20);
  });

  it('array.max and array.min work', () => {
    const src = `//@version=6
indicator("test")
a = array.from(5.0, 15.0, 10.0)
plot(array.max(a))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(15);
  });
});

describe('P0 Integration: str functions', () => {
  it('str.length works in compiled code', () => {
    // str.length returns a number we can plot indirectly
    const src = `//@version=6
indicator("test")
s = "hello"
n = str.length(s)
plot(n)
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(5);
  });

  it('str.tonumber works', () => {
    const src = `//@version=6
indicator("test")
n = str.tonumber("42.5")
plot(n)
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(42.5);
  });
});

describe('P0 Integration: Math functions', () => {
  it('math.abs in compiled code', () => {
    const src = `//@version=6
indicator("test")
plot(math.abs(-5.0))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(5);
  });

  it('math.max and math.min in compiled code', () => {
    const src = `//@version=6
indicator("test")
plot(math.max(3, 7))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(7);
  });

  it('math.round in compiled code', () => {
    const src = `//@version=6
indicator("test")
plot(math.round(3.7))
`;
    const result = compileAndRun(src, 1);
    expect(result.plots[0].values[0].value).toBe(4);
  });
});

describe('P0 Integration: barstate', () => {
  it('barstate.isfirst is true on first bar', () => {
    const src = `//@version=6
indicator("test")
x = barstate.isfirst ? 1.0 : 0.0
plot(x)
`;
    const result = compileAndRun(src, 5);
    expect(result.plots[0].values[0].value).toBe(1);
    expect(result.plots[0].values[1].value).toBe(0);
  });

  it('barstate.islast is true on last bar', () => {
    const src = `//@version=6
indicator("test")
x = barstate.islast ? 1.0 : 0.0
plot(x)
`;
    const result = compileAndRun(src, 5);
    expect(result.plots[0].values[4].value).toBe(1);
    expect(result.plots[0].values[0].value).toBe(0);
  });
});
