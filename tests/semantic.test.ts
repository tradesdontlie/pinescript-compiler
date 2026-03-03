import { describe, it, expect, beforeEach } from 'vitest';
import { compile } from '../src/compiler/index';
import { SemanticAnalyzer } from '../src/compiler/semantic/analyzer';
import { DiagnosticReporter } from '../src/compiler/diagnostics/diagnostic';
import { Lexer } from '../src/compiler/lexer/lexer';
import { Parser } from '../src/compiler/parser/parser';
import {
  makePineType,
  FLOAT_SERIES,
  INT_SERIES,
  BOOL_SERIES,
  STRING_SERIES,
  NA_TYPE,
  VOID_TYPE,
  typesCompatible,
  qualifierCompatible,
  widenTypes,
  baseTypesCompatible,
  typeToString,
} from '../src/compiler/semantic/types';
import { ScopeManager, makeSymbol } from '../src/compiler/semantic/scope';

// ── Helpers ──────────────────────────────────────────────────────────────────

function analyzeCode(source: string): ReturnType<DiagnosticReporter['getAll']> {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(source, reporter);
  const tokens = lexer.tokenize();
  if (reporter.hasErrors()) return reporter.getAll();
  const parser = new Parser(tokens, reporter);
  const ast = parser.parse();
  if (reporter.hasErrors()) return reporter.getAll();
  const analyzer = new SemanticAnalyzer(reporter);
  analyzer.analyze(ast);
  return reporter.getAll();
}

function analyzeErrors(source: string) {
  return analyzeCode(source).filter(d => d.severity === 'error');
}

function analyzeWarnings(source: string) {
  return analyzeCode(source).filter(d => d.severity === 'warning');
}

// ── Type system tests ─────────────────────────────────────────────────────────

describe('PineType helpers', () => {
  it('makePineType creates correct type', () => {
    const t = makePineType('float', 'series', true);
    expect(t.base).toBe('float');
    expect(t.qualifier).toBe('series');
    expect(t.nullable).toBe(true);
  });

  it('qualifier ordering: const < input < simple < series', () => {
    expect(qualifierCompatible('const', 'series')).toBe(true);
    expect(qualifierCompatible('const', 'input')).toBe(true);
    expect(qualifierCompatible('const', 'simple')).toBe(true);
    expect(qualifierCompatible('const', 'const')).toBe(true);
    expect(qualifierCompatible('series', 'const')).toBe(false);
    expect(qualifierCompatible('series', 'simple')).toBe(false);
    expect(qualifierCompatible('input', 'const')).toBe(false);
    expect(qualifierCompatible('simple', 'input')).toBe(false);
  });

  it('baseTypesCompatible: int and float are compatible', () => {
    expect(baseTypesCompatible('int', 'float')).toBe(true);
    expect(baseTypesCompatible('float', 'int')).toBe(true);
    expect(baseTypesCompatible('int', 'string')).toBe(false);
    expect(baseTypesCompatible('bool', 'float')).toBe(false);
  });

  it('baseTypesCompatible: na is compatible with everything', () => {
    expect(baseTypesCompatible('na', 'float')).toBe(true);
    expect(baseTypesCompatible('float', 'na')).toBe(true);
    expect(baseTypesCompatible('na', 'string')).toBe(true);
  });

  it('baseTypesCompatible: unknown is compatible with everything', () => {
    expect(baseTypesCompatible('unknown', 'float')).toBe(true);
    expect(baseTypesCompatible('float', 'unknown')).toBe(true);
  });

  it('typesCompatible checks both base and qualifier', () => {
    const seriesFloat = makePineType('float', 'series');
    const constFloat  = makePineType('float', 'const');
    const simpleFloat = makePineType('float', 'simple');

    expect(typesCompatible(constFloat, seriesFloat)).toBe(true);  // const → series OK
    expect(typesCompatible(seriesFloat, constFloat)).toBe(false); // series → const NOT OK
    expect(typesCompatible(simpleFloat, seriesFloat)).toBe(true); // simple → series OK
    expect(typesCompatible(simpleFloat, constFloat)).toBe(false); // simple → const NOT OK
  });

  it('widenTypes selects the higher qualifier', () => {
    const constInt  = makePineType('int', 'const');
    const seriesInt = makePineType('int', 'series');
    const wide = widenTypes(constInt, seriesInt);
    expect(wide.qualifier).toBe('series');
  });

  it('widenTypes: int + float -> float', () => {
    const i = makePineType('int', 'series');
    const f = makePineType('float', 'series');
    expect(widenTypes(i, f).base).toBe('float');
    expect(widenTypes(f, i).base).toBe('float');
  });

  it('widenTypes: na + float -> float', () => {
    const result = widenTypes(NA_TYPE, FLOAT_SERIES);
    expect(result.base).toBe('float');
  });

  it('widenTypes: incompatible bases -> unknown', () => {
    const s = makePineType('string', 'series');
    const f = makePineType('float', 'series');
    expect(widenTypes(s, f).base).toBe('unknown');
  });

  it('typeToString formats types correctly', () => {
    expect(typeToString(FLOAT_SERIES)).toBe('float');
    expect(typeToString(makePineType('float', 'const'))).toBe('const float');
    expect(typeToString(makePineType('array', 'series', true, [FLOAT_SERIES]))).toBe('array<float>');
  });
});

// ── Scope tests ───────────────────────────────────────────────────────────────

describe('ScopeManager', () => {
  let sm: ScopeManager;
  const dummyLoc = { line: 1, column: 0, offset: 0 };

  beforeEach(() => {
    sm = new ScopeManager();
  });

  it('declares and looks up a variable in the current scope', () => {
    sm.declare(makeSymbol('x', FLOAT_SERIES, dummyLoc));
    const sym = sm.lookup('x');
    expect(sym).toBeDefined();
    expect(sym!.name).toBe('x');
    expect(sym!.type.base).toBe('float');
  });

  it('looks up through parent scopes', () => {
    sm.declare(makeSymbol('x', FLOAT_SERIES, dummyLoc));
    sm.push();
    expect(sm.lookup('x')).toBeDefined();
    sm.pop();
  });

  it('variable in child scope not visible in parent', () => {
    sm.push();
    sm.declare(makeSymbol('y', INT_SERIES, dummyLoc));
    sm.pop();
    expect(sm.lookup('y')).toBeUndefined();
  });

  it('markUsed marks the symbol in any parent scope', () => {
    sm.declare(makeSymbol('z', BOOL_SERIES, dummyLoc));
    sm.push();
    sm.markUsed('z');
    sm.pop();
    expect(sm.lookup('z')!.used).toBe(true);
  });

  it('declareBuiltin registers in global scope', () => {
    sm.declareBuiltin('close', FLOAT_SERIES);
    sm.push();
    expect(sm.lookup('close')).toBeDefined();
    expect(sm.lookup('close')!.builtin).toBe(true);
    sm.pop();
  });

  it('ownSymbols only returns symbols from current scope', () => {
    sm.declare(makeSymbol('a', FLOAT_SERIES, dummyLoc));
    sm.push();
    sm.declare(makeSymbol('b', INT_SERIES, dummyLoc));
    const own = sm.ownSymbols().map(s => s.name);
    expect(own).toContain('b');
    expect(own).not.toContain('a');
    sm.pop();
  });

  it('isGlobal returns true at depth 1', () => {
    expect(sm.isGlobal()).toBe(true);
    sm.push();
    expect(sm.isGlobal()).toBe(false);
    sm.pop();
    expect(sm.isGlobal()).toBe(true);
  });
});

// ── Semantic analyzer integration tests ──────────────────────────────────────

describe('SemanticAnalyzer — undeclared variables', () => {
  it('flags undeclared variable usage', () => {
    const errs = analyzeErrors('y = x + 1');
    expect(errs.some(e => e.message.includes("Undeclared variable 'x'"))).toBe(true);
  });

  it('does NOT flag built-in variables', () => {
    const errs = analyzeErrors('x = close + open');
    expect(errs.filter(e => e.message.includes("Undeclared variable 'close'"))).toHaveLength(0);
    expect(errs.filter(e => e.message.includes("Undeclared variable 'open'"))).toHaveLength(0);
  });

  it('does NOT flag declared variables', () => {
    const errs = analyzeErrors('x = 1.0\ny = x + 2.0');
    expect(errs.filter(e => e.message.includes("Undeclared variable 'x'"))).toHaveLength(0);
  });

  it('does NOT flag function calls on built-in namespaces', () => {
    const errs = analyzeErrors('x = ta.sma(close, 14)');
    expect(errs.filter(e => e.message.includes("ta"))).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — unused variables', () => {
  it('warns about unused user variables', () => {
    const warnings = analyzeWarnings('unused_var = 42');
    expect(warnings.some(w => w.message.includes("'unused_var' is declared but never used"))).toBe(true);
  });

  it('does NOT warn when variable is used', () => {
    const warnings = analyzeWarnings('x = 42\ny = x + 1');
    expect(warnings.filter(w => w.message.includes("'x' is declared"))).toHaveLength(0);
  });

  it('does NOT warn for built-in variables', () => {
    const warnings = analyzeWarnings('x = close');
    expect(warnings.filter(w => w.message.includes("'close'"))).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — type checking', () => {
  it('warns on string-to-int type mismatch with annotation', () => {
    // Note: Pine Script parser may allow this but semantic analyzer warns
    const diags = analyzeCode('int x = "hello"');
    const relevant = diags.filter(d =>
      d.message.toLowerCase().includes('mismatch') ||
      d.message.toLowerCase().includes('type')
    );
    // Should have at least a warning
    expect(relevant.length).toBeGreaterThan(0);
  });

  it('does NOT warn for compatible types (int to float)', () => {
    const warnings = analyzeWarnings('float x = 42');
    expect(warnings.filter(w => w.message.includes('mismatch'))).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — qualifier enforcement', () => {
  it('reports error for const variable with non-const value', () => {
    const errs = analyzeErrors('const int x = close');
    expect(errs.length).toBeGreaterThan(0);
  });

  it('allows const with literal value', () => {
    const errs = analyzeErrors('const int x = 42');
    expect(errs.filter(e => e.message.includes("'const'"))).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — reassignment validation', () => {
  it('errors when reassigning an input variable', () => {
    // Use input() shorthand — input.int() fails at parser level because
    // 'int' is a type keyword token, not an IDENTIFIER.
    // The analyzer marks variables assigned from input() as isInput=true.
    const errs = analyzeErrors([
      'x = input(20)',
      'x := 30',
    ].join('\n'));
    expect(errs.some(e => e.message.includes("Cannot reassign input variable"))).toBe(true);
  });
});

describe('SemanticAnalyzer — function bodies', () => {
  it('analyzes function parameters without errors for basic function', () => {
    const errs = analyzeErrors([
      'f(x) =>',
      '    x + 1',
    ].join('\n'));
    expect(errs.filter(e => e.message.includes("Undeclared variable 'x'"))).toHaveLength(0);
  });

  it('analyzes nested scopes in if statements', () => {
    const code = [
      'cond = close > open',
      'if cond',
      '    x = 1',
    ].join('\n');
    const errs = analyzeErrors(code);
    expect(errs).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — for loop', () => {
  it('declares loop variable inside for body', () => {
    const code = [
      'for i = 0 to 10',
      '    x = i * 2',
    ].join('\n');
    const errs = analyzeErrors(code);
    expect(errs.filter(e => e.message.includes("Undeclared variable 'i'"))).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — ta.* and math.* return types', () => {
  it('ta.sma returns float series', () => {
    const code = 'x = ta.sma(close, 14)';
    const errs = analyzeErrors(code);
    expect(errs).toHaveLength(0);
  });

  it('math.abs returns float', () => {
    const code = 'x = math.abs(close)';
    const errs = analyzeErrors(code);
    expect(errs).toHaveLength(0);
  });
});

describe('SemanticAnalyzer — non-blocking', () => {
  it('does not crash on empty program', () => {
    const diags = analyzeCode('');
    expect(diags).toBeDefined();
  });

  it('does not crash on complex program', () => {
    const code = [
      '//@version=6',
      'indicator("Test")',
      'len = input(14)',
      'sma = ta.sma(close, len)',
      'plot(sma)',
    ].join('\n');
    expect(() => analyzeCode(code)).not.toThrow();
  });

  it('compile() pipeline still succeeds after analyzer adds warnings', () => {
    const result = compile([
      '//@version=6',
      'indicator("Test")',
      'x = close + open',
      'plot(x)',
    ].join('\n'));
    expect(result.success).toBe(true);
  });
});
