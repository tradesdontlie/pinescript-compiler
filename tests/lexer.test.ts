import { describe, it, expect, beforeEach } from 'vitest';
import { Lexer } from '../src/compiler/lexer/lexer';
import { DiagnosticReporter } from '../src/compiler/diagnostics/diagnostic';
import { TokenType, Token } from '../src/compiler/lexer/token';

// Helper: tokenize source and return non-EOF tokens
function tokenize(src: string): Token[] {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(src, reporter);
  const tokens = lexer.tokenize();
  return tokens.filter(t => t.type !== TokenType.EOF);
}

function tokenizeWithReporter(src: string): { tokens: Token[]; reporter: DiagnosticReporter } {
  const reporter = new DiagnosticReporter();
  const lexer = new Lexer(src, reporter);
  const tokens = lexer.tokenize();
  return { tokens: tokens.filter(t => t.type !== TokenType.EOF), reporter };
}

function types(src: string): TokenType[] {
  return tokenize(src).map(t => t.type);
}

function values(src: string): string[] {
  return tokenize(src).map(t => t.value);
}

// ─── Literals ───────────────────────────────────────────────────────────────

describe('Integer literals', () => {
  it('tokenizes a simple integer', () => {
    const toks = tokenize('42');
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.INTEGER);
    expect(toks[0].value).toBe('42');
  });

  it('tokenizes zero', () => {
    const toks = tokenize('0');
    expect(toks[0].type).toBe(TokenType.INTEGER);
    expect(toks[0].value).toBe('0');
  });

  it('tokenizes large integer', () => {
    const toks = tokenize('1000000');
    expect(toks[0].type).toBe(TokenType.INTEGER);
    expect(toks[0].value).toBe('1000000');
  });
});

describe('Float literals', () => {
  it('tokenizes a standard float', () => {
    const toks = tokenize('3.14');
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('3.14');
  });

  it('tokenizes a leading-dot float', () => {
    const toks = tokenize('.5');
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('.5');
  });

  it('tokenizes 0.0', () => {
    const toks = tokenize('0.0');
    expect(toks[0].type).toBe(TokenType.FLOAT);
    expect(toks[0].value).toBe('0.0');
  });
});

describe('String literals', () => {
  it('tokenizes a double-quoted string', () => {
    const toks = tokenize('"hello world"');
    expect(toks[0].type).toBe(TokenType.STRING);
    expect(toks[0].value).toBe('hello world');
  });

  it('tokenizes a single-quoted string', () => {
    const toks = tokenize("'pine'");
    expect(toks[0].type).toBe(TokenType.STRING);
    expect(toks[0].value).toBe('pine');
  });

  it('handles escape sequences', () => {
    const toks = tokenize('"line1\\nline2"');
    expect(toks[0].type).toBe(TokenType.STRING);
    expect(toks[0].value).toBe('line1\nline2');
  });

  it('handles escaped quote', () => {
    const toks = tokenize('"say \\"hi\\""');
    expect(toks[0].type).toBe(TokenType.STRING);
    expect(toks[0].value).toBe('say "hi"');
  });

  it('handles empty string', () => {
    const toks = tokenize('""');
    expect(toks[0].type).toBe(TokenType.STRING);
    expect(toks[0].value).toBe('');
  });
});

describe('Boolean literals', () => {
  it('tokenizes true as TRUE keyword', () => {
    const toks = tokenize('true');
    expect(toks[0].type).toBe(TokenType.TRUE);
  });

  it('tokenizes false as FALSE keyword', () => {
    const toks = tokenize('false');
    expect(toks[0].type).toBe(TokenType.FALSE);
  });
});

describe('NA literal', () => {
  it('tokenizes na', () => {
    const toks = tokenize('na');
    expect(toks[0].type).toBe(TokenType.NA);
  });
});

describe('Color literals', () => {
  it('tokenizes #RRGGBB', () => {
    const toks = tokenize('#FF0000');
    expect(toks[0].type).toBe(TokenType.COLOR);
    expect(toks[0].value).toBe('#FF0000');
  });

  it('tokenizes #RRGGBBAA', () => {
    const toks = tokenize('#FF0000FF');
    expect(toks[0].type).toBe(TokenType.COLOR);
    expect(toks[0].value).toBe('#FF0000FF');
  });

  it('reports error on invalid color length', () => {
    const { reporter } = tokenizeWithReporter('#FFF');
    expect(reporter.hasErrors()).toBe(true);
  });
});

// ─── Identifiers ─────────────────────────────────────────────────────────────

describe('Identifiers', () => {
  it('tokenizes a simple identifier', () => {
    const toks = tokenize('myVar');
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[0].value).toBe('myVar');
  });

  it('tokenizes underscore-prefixed identifier', () => {
    const toks = tokenize('_private');
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[0].value).toBe('_private');
  });

  it('tokenizes identifier with digits', () => {
    const toks = tokenize('bar42');
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[0].value).toBe('bar42');
  });
});

// ─── Keywords ────────────────────────────────────────────────────────────────

describe('Keywords', () => {
  const kwCases: [string, TokenType][] = [
    ['var', TokenType.VAR],
    ['varip', TokenType.VARIP],
    ['if', TokenType.IF],
    ['else', TokenType.ELSE],
    ['for', TokenType.FOR],
    ['to', TokenType.TO],
    ['by', TokenType.BY],
    ['in', TokenType.IN],
    ['while', TokenType.WHILE],
    ['switch', TokenType.SWITCH],
    ['break', TokenType.BREAK],
    ['continue', TokenType.CONTINUE],
    ['return', TokenType.RETURN],
    ['import', TokenType.IMPORT],
    ['export', TokenType.EXPORT],
    ['not', TokenType.NOT],
    ['and', TokenType.AND],
    ['or', TokenType.OR],
    ['int', TokenType.INT],
    ['float', TokenType.FLOAT_TYPE],
    ['bool', TokenType.BOOL_TYPE],
    ['string', TokenType.STRING_TYPE],
    ['color', TokenType.COLOR_TYPE],
    ['series', TokenType.SERIES],
    ['simple', TokenType.SIMPLE],
    ['const', TokenType.CONST],
    ['input', TokenType.INPUT],
    ['type', TokenType.TYPE],
    ['method', TokenType.METHOD],
    ['enum', TokenType.ENUM],
  ];

  for (const [kw, expected] of kwCases) {
    it(`recognizes keyword '${kw}'`, () => {
      const toks = tokenize(kw);
      expect(toks[0].type).toBe(expected);
    });
  }
});

// ─── Operators ───────────────────────────────────────────────────────────────

describe('Single-char operators', () => {
  const cases: [string, TokenType][] = [
    ['+', TokenType.PLUS],
    ['-', TokenType.MINUS],
    ['*', TokenType.STAR],
    ['/', TokenType.SLASH],
    ['%', TokenType.PERCENT],
    ['<', TokenType.LT],
    ['>', TokenType.GT],
    ['=', TokenType.ASSIGN],
    ['?', TokenType.QUESTION],
    [':', TokenType.COLON],
    ['[', TokenType.LBRACKET],
    [']', TokenType.RBRACKET],
    ['(', TokenType.LPAREN],
    [')', TokenType.RPAREN],
    [',', TokenType.COMMA],
    ['.', TokenType.DOT],
  ];

  for (const [op, expected] of cases) {
    it(`tokenizes '${op}'`, () => {
      const toks = tokenize(op);
      expect(toks[0].type).toBe(expected);
    });
  }
});

describe('Multi-char operators', () => {
  const cases: [string, TokenType][] = [
    ['==', TokenType.EQ],
    ['!=', TokenType.NEQ],
    ['<=', TokenType.LTE],
    ['>=', TokenType.GTE],
    [':=', TokenType.REASSIGN],
    ['+=', TokenType.PLUS_ASSIGN],
    ['-=', TokenType.MINUS_ASSIGN],
    ['*=', TokenType.STAR_ASSIGN],
    ['/=', TokenType.SLASH_ASSIGN],
    ['%=', TokenType.PERCENT_ASSIGN],
    ['=>', TokenType.ARROW],
    ['->', TokenType.THIN_ARROW],
  ];

  for (const [op, expected] of cases) {
    it(`tokenizes '${op}'`, () => {
      const toks = tokenize(op);
      expect(toks[0].type).toBe(expected);
    });
  }
});

// ─── Annotations ─────────────────────────────────────────────────────────────

describe('Annotations', () => {
  it('tokenizes //@version=6', () => {
    const toks = tokenize('//@version=6');
    expect(toks[0].type).toBe(TokenType.ANNOTATION);
    expect(toks[0].value).toBe('//@version=6');
  });

  it('tokenizes //@description', () => {
    const toks = tokenize('//@description My script');
    expect(toks[0].type).toBe(TokenType.ANNOTATION);
    expect(toks[0].value).toBe('//@description My script');
  });

  it('does not emit COMMENT tokens for regular // comments', () => {
    const toks = tokenize('// this is a comment\nx');
    const types_ = toks.map(t => t.type);
    expect(types_).not.toContain(TokenType.COMMENT);
    // identifier 'x' should be present
    expect(types_).toContain(TokenType.IDENTIFIER);
  });
});

// ─── Newlines ────────────────────────────────────────────────────────────────

describe('Newlines', () => {
  it('emits NEWLINE between statements', () => {
    const toks = tokenize('a\nb');
    const types_ = toks.map(t => t.type);
    expect(types_).toContain(TokenType.NEWLINE);
  });

  it('does not emit NEWLINE for blank lines', () => {
    const toks = tokenize('a\n\nb');
    const newlines = toks.filter(t => t.type === TokenType.NEWLINE);
    // Should only have one NEWLINE (blank line is skipped)
    expect(newlines.length).toBeLessThanOrEqual(1);
  });
});

// ─── Indentation ─────────────────────────────────────────────────────────────

describe('INDENT / DEDENT', () => {
  it('emits INDENT when indentation increases', () => {
    const src = `if true\n    x = 1\n`;
    const toks = tokenize(src);
    const types_ = toks.map(t => t.type);
    expect(types_).toContain(TokenType.INDENT);
  });

  it('emits DEDENT when indentation decreases', () => {
    const src = `if true\n    x = 1\ny = 2\n`;
    const toks = tokenize(src);
    const types_ = toks.map(t => t.type);
    expect(types_).toContain(TokenType.DEDENT);
  });

  it('emits matching number of INDENT and DEDENT tokens for nested blocks', () => {
    const src = [
      'if true',
      '    if false',
      '        x = 1',
      'y = 2',
      '',
    ].join('\n');
    const toks = tokenize(src);
    const indentCount = toks.filter(t => t.type === TokenType.INDENT).length;
    const dedentCount = toks.filter(t => t.type === TokenType.DEDENT).length;
    expect(indentCount).toBe(2);
    expect(dedentCount).toBe(2);
  });

  it('emits DEDENT at EOF for unclosed indents', () => {
    const src = 'if true\n    x = 1';
    const toks = tokenize(src);
    const types_ = toks.map(t => t.type);
    expect(types_).toContain(TokenType.DEDENT);
  });

  it('normalizes tabs to 4 spaces for indentation', () => {
    const src = 'if true\n\tx = 1\ny = 2\n';
    const toks = tokenize(src);
    const types_ = toks.map(t => t.type);
    expect(types_).toContain(TokenType.INDENT);
    expect(types_).toContain(TokenType.DEDENT);
  });
});

// ─── Source location ──────────────────────────────────────────────────────────

describe('Source location tracking', () => {
  it('reports line 1 col 1 for first token', () => {
    const toks = tokenize('x');
    expect(toks[0].loc.line).toBe(1);
    expect(toks[0].loc.column).toBe(1);
  });

  it('tracks column for tokens on the same line', () => {
    const toks = tokenize('a + b');
    // 'a' at col 1, '+' at col 3, 'b' at col 5
    expect(toks[0].loc.column).toBe(1);
    expect(toks[1].loc.column).toBe(3);
    expect(toks[2].loc.column).toBe(5);
  });

  it('tracks line numbers across newlines', () => {
    const toks = tokenize('a\nb');
    const bTok = toks.find(t => t.value === 'b');
    expect(bTok?.loc.line).toBe(2);
  });
});

// ─── Error recovery ───────────────────────────────────────────────────────────

describe('Error recovery', () => {
  it('reports error for invalid character and continues', () => {
    const { tokens, reporter } = tokenizeWithReporter('x @ y');
    expect(reporter.hasErrors()).toBe(true);
    // Should still have tokenized x and y
    const ids = tokens.filter(t => t.type === TokenType.IDENTIFIER);
    expect(ids.length).toBe(2);
  });

  it('reports error for unterminated string', () => {
    const { reporter } = tokenizeWithReporter('"unterminated');
    expect(reporter.hasErrors()).toBe(true);
  });

  it('reports error for ! without =', () => {
    const { reporter } = tokenizeWithReporter('!x');
    expect(reporter.hasErrors()).toBe(true);
  });
});

// ─── Multi-token expressions ──────────────────────────────────────────────────

describe('Multi-token expressions', () => {
  it('tokenizes a full assignment', () => {
    const toks = tokenize('var x = 42');
    expect(toks[0].type).toBe(TokenType.VAR);
    expect(toks[1].type).toBe(TokenType.IDENTIFIER);
    expect(toks[1].value).toBe('x');
    expect(toks[2].type).toBe(TokenType.ASSIGN);
    expect(toks[3].type).toBe(TokenType.INTEGER);
    expect(toks[3].value).toBe('42');
  });

  it('tokenizes function call syntax', () => {
    const toks = tokenize('plot(close)');
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[1].type).toBe(TokenType.LPAREN);
    expect(toks[2].type).toBe(TokenType.IDENTIFIER);
    expect(toks[3].type).toBe(TokenType.RPAREN);
  });

  it('tokenizes a Pine Script annotation header', () => {
    const src = '//@version=6\nx = 1';
    const toks = tokenize(src);
    expect(toks[0].type).toBe(TokenType.ANNOTATION);
    expect(toks[0].value).toBe('//@version=6');
  });

  it('tokenizes member access with dot', () => {
    const toks = tokenize('bar.close');
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[1].type).toBe(TokenType.DOT);
    expect(toks[2].type).toBe(TokenType.IDENTIFIER);
  });

  it('tokenizes ternary operator', () => {
    const toks = tokenize('a ? b : c');
    const types_ = toks.map(t => t.type);
    expect(types_).toContain(TokenType.QUESTION);
    expect(types_).toContain(TokenType.COLON);
  });

  it('tokenizes array index', () => {
    const toks = tokenize('close[1]');
    expect(toks[0].type).toBe(TokenType.IDENTIFIER);
    expect(toks[1].type).toBe(TokenType.LBRACKET);
    expect(toks[2].type).toBe(TokenType.INTEGER);
    expect(toks[3].type).toBe(TokenType.RBRACKET);
  });
});
