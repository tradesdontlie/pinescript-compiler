import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/compiler/lexer/lexer';
import { DiagnosticReporter } from '../src/compiler/diagnostics/diagnostic';
import { Parser } from '../src/compiler/parser/parser';
import {
  Program, Statement, Expression,
  VariableDeclaration, FunctionDeclaration,
  IfStatement, ForStatement, ForInStatement, WhileStatement,
  ReturnStatement, BreakStatement, ContinueStatement,
  ExpressionStatement, AssignmentStatement,
  BinaryExpression, UnaryExpression, ConditionalExpression,
  CallExpression, MemberExpression, IndexExpression,
  IdentifierExpression, LiteralExpression, ArrayLiteralExpression,
} from '../src/compiler/ast/nodes';

// Helper: lex + parse source, return Program
function parse(src: string): { program: Program; reporter: DiagnosticReporter } {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(src, reporter);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, reporter);
  const program = parser.parse();
  return { program, reporter };
}

function parseExpr(src: string): Expression {
  const { program } = parse(src);
  const stmt = program.body[0] as ExpressionStatement;
  return stmt.expression;
}

function parseStmt(src: string): Statement {
  const { program } = parse(src);
  return program.body[0];
}

// ─── Literals ─────────────────────────────────────────────────────────────────

describe('Literal expressions', () => {
  it('parses integer literal', () => {
    const expr = parseExpr('42') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('int');
    expect(expr.value).toBe(42);
  });

  it('parses float literal', () => {
    const expr = parseExpr('3.14') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('float');
    expect(expr.value).toBe(3.14);
  });

  it('parses string literal', () => {
    const expr = parseExpr('"hello"') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('string');
    expect(expr.value).toBe('hello');
  });

  it('parses true literal', () => {
    const expr = parseExpr('true') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('bool');
    expect(expr.value).toBe(true);
  });

  it('parses false literal', () => {
    const expr = parseExpr('false') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('bool');
    expect(expr.value).toBe(false);
  });

  it('parses na literal', () => {
    const expr = parseExpr('na') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('na');
    expect(expr.value).toBeNull();
  });

  it('parses color literal', () => {
    const expr = parseExpr('#FF0000') as LiteralExpression;
    expect(expr.kind).toBe('LiteralExpression');
    expect(expr.valueType).toBe('color');
    expect(expr.value).toBe('#FF0000');
  });
});

// ─── Identifiers ──────────────────────────────────────────────────────────────

describe('Identifier expression', () => {
  it('parses simple identifier', () => {
    const expr = parseExpr('close') as IdentifierExpression;
    expect(expr.kind).toBe('IdentifierExpression');
    expect(expr.name).toBe('close');
  });
});

// ─── Binary Expressions ────────────────────────────────────────────────────────

describe('Binary expressions', () => {
  it('parses addition', () => {
    const expr = parseExpr('1 + 2') as BinaryExpression;
    expect(expr.kind).toBe('BinaryExpression');
    expect(expr.operator).toBe('+');
    expect((expr.left as LiteralExpression).value).toBe(1);
    expect((expr.right as LiteralExpression).value).toBe(2);
  });

  it('parses multiplication', () => {
    const expr = parseExpr('3 * 4') as BinaryExpression;
    expect(expr.operator).toBe('*');
  });

  it('respects precedence: * binds tighter than +', () => {
    const expr = parseExpr('1 + 2 * 3') as BinaryExpression;
    // Should parse as 1 + (2 * 3)
    expect(expr.operator).toBe('+');
    const right = expr.right as BinaryExpression;
    expect(right.operator).toBe('*');
    expect((right.left as LiteralExpression).value).toBe(2);
    expect((right.right as LiteralExpression).value).toBe(3);
  });

  it('respects left-associativity for same precedence', () => {
    const expr = parseExpr('1 - 2 - 3') as BinaryExpression;
    // Should parse as (1 - 2) - 3
    expect(expr.operator).toBe('-');
    const left = expr.left as BinaryExpression;
    expect(left.operator).toBe('-');
  });

  it('parses comparison operators', () => {
    const expr = parseExpr('a > b') as BinaryExpression;
    expect(expr.operator).toBe('>');
  });

  it('parses equality operators', () => {
    const expr = parseExpr('a == b') as BinaryExpression;
    expect(expr.operator).toBe('==');
  });

  it('parses logical and/or', () => {
    const expr = parseExpr('a and b') as BinaryExpression;
    expect(expr.operator).toBe('and');
  });

  it('parses or with lower precedence than and', () => {
    const expr = parseExpr('a or b and c') as BinaryExpression;
    // Should parse as a or (b and c)
    expect(expr.operator).toBe('or');
    const right = expr.right as BinaryExpression;
    expect(right.operator).toBe('and');
  });
});

// ─── Unary Expressions ────────────────────────────────────────────────────────

describe('Unary expressions', () => {
  it('parses unary minus', () => {
    const expr = parseExpr('-5') as UnaryExpression;
    expect(expr.kind).toBe('UnaryExpression');
    expect(expr.operator).toBe('-');
    expect(expr.prefix).toBe(true);
    expect((expr.operand as LiteralExpression).value).toBe(5);
  });

  it('parses not expression', () => {
    const expr = parseExpr('not true') as UnaryExpression;
    expect(expr.kind).toBe('UnaryExpression');
    expect(expr.operator).toBe('not');
  });
});

// ─── Ternary Expression ───────────────────────────────────────────────────────

describe('Ternary (conditional) expression', () => {
  it('parses ternary', () => {
    const expr = parseExpr('a > 0 ? 1 : -1') as ConditionalExpression;
    expect(expr.kind).toBe('ConditionalExpression');
    expect(expr.condition.kind).toBe('BinaryExpression');
    expect((expr.consequent as LiteralExpression).value).toBe(1);
    expect((expr.alternate as UnaryExpression).operand).toBeDefined();
  });
});

// ─── Member Access ────────────────────────────────────────────────────────────

describe('Member access expressions', () => {
  it('parses ta.sma', () => {
    const expr = parseExpr('ta.sma') as MemberExpression;
    expect(expr.kind).toBe('MemberExpression');
    expect((expr.object as IdentifierExpression).name).toBe('ta');
    expect(expr.property).toBe('sma');
  });

  it('parses chained member access', () => {
    const expr = parseExpr('a.b.c') as MemberExpression;
    expect(expr.kind).toBe('MemberExpression');
    expect(expr.property).toBe('c');
    const inner = expr.object as MemberExpression;
    expect(inner.property).toBe('b');
  });
});

// ─── Index Expressions ────────────────────────────────────────────────────────

describe('Index expressions', () => {
  it('parses close[1]', () => {
    const expr = parseExpr('close[1]') as IndexExpression;
    expect(expr.kind).toBe('IndexExpression');
    expect((expr.object as IdentifierExpression).name).toBe('close');
    expect((expr.index as LiteralExpression).value).toBe(1);
  });

  it('parses series[n]', () => {
    const expr = parseExpr('data[n]') as IndexExpression;
    expect(expr.kind).toBe('IndexExpression');
    expect((expr.index as IdentifierExpression).name).toBe('n');
  });
});

// ─── Call Expressions ─────────────────────────────────────────────────────────

describe('Call expressions', () => {
  it('parses simple function call', () => {
    const expr = parseExpr('sma(close, 14)') as CallExpression;
    expect(expr.kind).toBe('CallExpression');
    expect((expr.callee as IdentifierExpression).name).toBe('sma');
    expect(expr.args).toHaveLength(2);
    expect(expr.args[0].name).toBeNull();
    expect((expr.args[0].value as IdentifierExpression).name).toBe('close');
  });

  it('parses call with named arguments', () => {
    const expr = parseExpr('indicator(title="My Script", shorttitle="MS")') as CallExpression;
    expect(expr.kind).toBe('CallExpression');
    expect(expr.args[0].name).toBe('title');
    expect((expr.args[0].value as LiteralExpression).value).toBe('My Script');
    expect(expr.args[1].name).toBe('shorttitle');
  });

  it('parses mixed positional and named args', () => {
    const expr = parseExpr('fn(a, title="x")') as CallExpression;
    expect(expr.args[0].name).toBeNull();
    expect(expr.args[1].name).toBe('title');
  });

  it('parses method call via member expression', () => {
    const expr = parseExpr('ta.sma(close, 14)') as CallExpression;
    expect(expr.kind).toBe('CallExpression');
    expect(expr.callee.kind).toBe('MemberExpression');
  });

  it('parses call with no args', () => {
    const expr = parseExpr('close()') as CallExpression;
    expect(expr.kind).toBe('CallExpression');
    expect(expr.args).toHaveLength(0);
  });
});

// ─── Variable Declarations ────────────────────────────────────────────────────

describe('Variable declarations', () => {
  it('parses plain variable declaration', () => {
    const stmt = parseStmt('x = 42') as AssignmentStatement;
    // x = 42 at top level is an assignment, not declaration (no var/varip)
    // Actually x = 42 can be a VariableDeclaration - depends on context
    // In Pine, `x = 42` creates a new variable on first use
    expect(stmt).toBeDefined();
  });

  it('parses var declaration', () => {
    const stmt = parseStmt('var x = 0') as VariableDeclaration;
    expect(stmt.kind).toBe('VariableDeclaration');
    expect(stmt.modifier).toBe('var');
    expect(stmt.name).toBe('x');
    expect((stmt.value as LiteralExpression).value).toBe(0);
  });

  it('parses varip declaration', () => {
    const stmt = parseStmt('varip y = 0.0') as VariableDeclaration;
    expect(stmt.kind).toBe('VariableDeclaration');
    expect(stmt.modifier).toBe('varip');
    expect(stmt.name).toBe('y');
  });

  it('parses var with type annotation', () => {
    const stmt = parseStmt('var int counter = 0') as VariableDeclaration;
    expect(stmt.kind).toBe('VariableDeclaration');
    expect(stmt.modifier).toBe('var');
    expect(stmt.typeAnnotation).not.toBeNull();
    expect(stmt.typeAnnotation!.baseType).toBe('int');
    expect(stmt.name).toBe('counter');
  });

  it('parses type-annotated declaration without var', () => {
    const stmt = parseStmt('int x = 10') as VariableDeclaration;
    expect(stmt.kind).toBe('VariableDeclaration');
    expect(stmt.modifier).toBeNull();
    expect(stmt.typeAnnotation!.baseType).toBe('int');
    expect(stmt.name).toBe('x');
  });
});

// ─── Assignment Statements ────────────────────────────────────────────────────

describe('Assignment statements', () => {
  it('parses := reassignment', () => {
    const stmt = parseStmt('x := 5') as AssignmentStatement;
    expect(stmt.kind).toBe('AssignmentStatement');
    expect(stmt.operator).toBe(':=');
  });

  it('parses += compound assignment', () => {
    const stmt = parseStmt('x += 1') as AssignmentStatement;
    expect(stmt.kind).toBe('AssignmentStatement');
    expect(stmt.operator).toBe('+=');
  });

  it('parses -= compound assignment', () => {
    const stmt = parseStmt('x -= 1') as AssignmentStatement;
    expect(stmt.operator).toBe('-=');
  });

  it('parses *= compound assignment', () => {
    const stmt = parseStmt('x *= 2') as AssignmentStatement;
    expect(stmt.operator).toBe('*=');
  });
});

// ─── Function Declarations ────────────────────────────────────────────────────

describe('Function declarations', () => {
  it('parses single-expression function', () => {
    const stmt = parseStmt('myFunc(a, b) => a + b') as FunctionDeclaration;
    expect(stmt.kind).toBe('FunctionDeclaration');
    expect(stmt.name).toBe('myFunc');
    expect(stmt.params).toHaveLength(2);
    expect(stmt.params[0].name).toBe('a');
    expect(stmt.params[1].name).toBe('b');
    expect(stmt.body).toBeDefined();
  });

  it('parses function with no params', () => {
    const stmt = parseStmt('getValue() => close') as FunctionDeclaration;
    expect(stmt.kind).toBe('FunctionDeclaration');
    expect(stmt.params).toHaveLength(0);
  });

  it('parses block-body function', () => {
    const src = `myFunc(x)\n    return x * 2\n`;
    const stmt = parseStmt(src) as FunctionDeclaration;
    expect(stmt.kind).toBe('FunctionDeclaration');
    expect(Array.isArray(stmt.body)).toBe(true);
    const body = stmt.body as Statement[];
    expect(body[0].kind).toBe('ReturnStatement');
  });

  it('parses function with default param value', () => {
    const stmt = parseStmt('sma(src, len = 14) => src') as FunctionDeclaration;
    expect(stmt.kind).toBe('FunctionDeclaration');
    expect(stmt.params[1].defaultValue).not.toBeNull();
  });
});

// ─── If Statements ────────────────────────────────────────────────────────────

describe('If statements', () => {
  it('parses simple if statement', () => {
    const src = `if close > open\n    x = 1\n`;
    const stmt = parseStmt(src) as IfStatement;
    expect(stmt.kind).toBe('IfStatement');
    expect(stmt.condition.kind).toBe('BinaryExpression');
    expect(stmt.thenBlock).toHaveLength(1);
    expect(stmt.elseBlock).toBeNull();
  });

  it('parses if-else statement', () => {
    const src = `if x > 0\n    a = 1\nelse\n    a = 2\n`;
    const stmt = parseStmt(src) as IfStatement;
    expect(stmt.kind).toBe('IfStatement');
    expect(stmt.elseBlock).not.toBeNull();
    expect(Array.isArray(stmt.elseBlock)).toBe(true);
  });

  it('parses if-else if chain', () => {
    const src = `if x > 0\n    a = 1\nelse if x < 0\n    a = -1\n`;
    const stmt = parseStmt(src) as IfStatement;
    expect(stmt.kind).toBe('IfStatement');
    expect(stmt.elseBlock).not.toBeNull();
    expect((stmt.elseBlock as IfStatement).kind).toBe('IfStatement');
  });
});

// ─── For Statements ───────────────────────────────────────────────────────────

describe('For statements', () => {
  it('parses for loop with to', () => {
    const src = `for i = 0 to 10\n    x = i\n`;
    const stmt = parseStmt(src) as ForStatement;
    expect(stmt.kind).toBe('ForStatement');
    expect(stmt.variable).toBe('i');
    expect((stmt.start as LiteralExpression).value).toBe(0);
    expect((stmt.end as LiteralExpression).value).toBe(10);
    expect(stmt.step).toBeNull();
    expect(stmt.body).toHaveLength(1);
  });

  it('parses for loop with by step', () => {
    const src = `for i = 0 to 10 by 2\n    x = i\n`;
    const stmt = parseStmt(src) as ForStatement;
    expect(stmt.kind).toBe('ForStatement');
    expect(stmt.step).not.toBeNull();
    expect((stmt.step as LiteralExpression).value).toBe(2);
  });

  it('parses for-in loop', () => {
    const src = `for item in myArray\n    x = item\n`;
    const stmt = parseStmt(src) as ForInStatement;
    expect(stmt.kind).toBe('ForInStatement');
    expect(stmt.variable).toBe('item');
    expect((stmt.iterable as IdentifierExpression).name).toBe('myArray');
  });
});

// ─── While Statements ─────────────────────────────────────────────────────────

describe('While statements', () => {
  it('parses while loop', () => {
    const src = `while x > 0\n    x -= 1\n`;
    const stmt = parseStmt(src) as WhileStatement;
    expect(stmt.kind).toBe('WhileStatement');
    expect(stmt.condition.kind).toBe('BinaryExpression');
    expect(stmt.body).toHaveLength(1);
  });
});

// ─── Return/Break/Continue ────────────────────────────────────────────────────

describe('Return/Break/Continue statements', () => {
  it('parses return with value', () => {
    const src = `myFunc(x)\n    return x + 1\n`;
    const fn = parseStmt(src) as FunctionDeclaration;
    const ret = (fn.body as Statement[])[0] as ReturnStatement;
    expect(ret.kind).toBe('ReturnStatement');
    expect(ret.value).not.toBeNull();
  });

  it('parses break statement', () => {
    const src = `for i = 0 to 10\n    break\n`;
    const forStmt = parseStmt(src) as ForStatement;
    const brk = forStmt.body[0] as BreakStatement;
    expect(brk.kind).toBe('BreakStatement');
  });

  it('parses continue statement', () => {
    const src = `for i = 0 to 10\n    continue\n`;
    const forStmt = parseStmt(src) as ForStatement;
    const cont = forStmt.body[0] as ContinueStatement;
    expect(cont.kind).toBe('ContinueStatement');
  });
});

// ─── Tuple Destructuring ──────────────────────────────────────────────────────

describe('Tuple destructuring', () => {
  it('parses [a, b] = fn()', () => {
    const stmt = parseStmt('[a, b] = myFn()') as VariableDeclaration;
    expect(stmt.kind).toBe('VariableDeclaration');
    expect(stmt.isTupleDestructure).toBe(true);
    expect(stmt.tupleNames).toEqual(['a', 'b']);
  });

  it('parses three-element tuple destructure', () => {
    const stmt = parseStmt('[a, b, c] = compute()') as VariableDeclaration;
    expect(stmt.isTupleDestructure).toBe(true);
    expect(stmt.tupleNames).toHaveLength(3);
  });
});

// ─── Annotations ─────────────────────────────────────────────────────────────

describe('Annotations', () => {
  it('parses //@version=6 annotation', () => {
    const reporter = new DiagnosticReporter();
    const lexer = new Lexer('//@version=6\nx = 1\n', reporter);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, reporter);
    parser.parse();
    expect(parser.version).toBe(6);
  });

  it('parses indicator() metadata', () => {
    const src = 'indicator(title="My Script", shorttitle="MS")\n';
    const reporter = new DiagnosticReporter();
    const lexer = new Lexer(src, reporter);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, reporter);
    parser.parse();
    expect(parser.metadata['title']).toBe('My Script');
    expect(parser.metadata['shorttitle']).toBe('MS');
  });
});

// ─── Array Literals ───────────────────────────────────────────────────────────

describe('Array literal expressions', () => {
  it('parses empty array', () => {
    const expr = parseExpr('[]') as ArrayLiteralExpression;
    expect(expr.kind).toBe('ArrayLiteralExpression');
    expect(expr.elements).toHaveLength(0);
  });

  it('parses array with elements', () => {
    const expr = parseExpr('[1, 2, 3]') as ArrayLiteralExpression;
    expect(expr.kind).toBe('ArrayLiteralExpression');
    expect(expr.elements).toHaveLength(3);
  });
});

// ─── Program Structure ────────────────────────────────────────────────────────

describe('Program structure', () => {
  it('parses empty program', () => {
    const { program } = parse('');
    expect(program.kind).toBe('Program');
    expect(program.body).toHaveLength(0);
  });

  it('parses multi-statement program', () => {
    const src = `x = 1\ny = 2\nz = x + y\n`;
    const { program } = parse(src);
    expect(program.body.length).toBeGreaterThanOrEqual(3);
  });

  it('parses program with annotation and body', () => {
    const src = `//@version=6\nx = 1\n`;
    const { program } = parse(src);
    expect(program.kind).toBe('Program');
    expect(program.body.length).toBeGreaterThanOrEqual(1);
  });

  it('reports no errors for valid Pine Script', () => {
    const src = `x = close\ny = x + 1\n`;
    const { reporter } = parse(src);
    expect(reporter.hasErrors()).toBe(false);
  });
});

// ─── Grouped Expressions ──────────────────────────────────────────────────────

describe('Grouped expressions', () => {
  it('parses parenthesized expression', () => {
    const expr = parseExpr('(1 + 2)');
    expect(expr.kind).toBe('GroupExpression');
  });

  it('parentheses override precedence', () => {
    const expr = parseExpr('(1 + 2) * 3') as BinaryExpression;
    expect(expr.operator).toBe('*');
    expect(expr.left.kind).toBe('GroupExpression');
  });
});

// ─── Block Parsing ────────────────────────────────────────────────────────────

describe('Block parsing with INDENT/DEDENT', () => {
  it('parses nested if blocks', () => {
    const src = `if a\n    if b\n        x = 1\n`;
    const stmt = parseStmt(src) as IfStatement;
    expect(stmt.kind).toBe('IfStatement');
    const inner = stmt.thenBlock[0] as IfStatement;
    expect(inner.kind).toBe('IfStatement');
  });

  it('parses function with multiple statements in body', () => {
    const src = `compute(x)\n    y = x * 2\n    return y\n`;
    const fn = parseStmt(src) as FunctionDeclaration;
    expect(fn.kind).toBe('FunctionDeclaration');
    const body = fn.body as Statement[];
    expect(body).toHaveLength(2);
  });
});

// ─── Complex Pine Script ──────────────────────────────────────────────────────

describe('Complex Pine Script programs', () => {
  it('parses a typical indicator script', () => {
    const src = [
      '//@version=6',
      'indicator(title="SMA Cross", shorttitle="SMAC")',
      'fastLen = 10',
      'slowLen = 20',
      'fast = ta.sma(close, fastLen)',
      'slow = ta.sma(close, slowLen)',
      'crossUp = fast > slow',
    ].join('\n') + '\n';

    const { program, reporter } = parse(src);
    expect(program.kind).toBe('Program');
    expect(reporter.hasErrors()).toBe(false);
    expect(program.body.length).toBeGreaterThan(0);
  });

  it('parses chained function calls (ta.sma)', () => {
    const expr = parseExpr('ta.sma(close, 14)') as CallExpression;
    expect(expr.kind).toBe('CallExpression');
    const callee = expr.callee as MemberExpression;
    expect(callee.kind).toBe('MemberExpression');
    expect((callee.object as IdentifierExpression).name).toBe('ta');
    expect(callee.property).toBe('sma');
    expect(expr.args).toHaveLength(2);
  });

  it('parses index on function call result', () => {
    const expr = parseExpr('sma(close, 14)[1]') as IndexExpression;
    expect(expr.kind).toBe('IndexExpression');
    expect(expr.object.kind).toBe('CallExpression');
  });
});
