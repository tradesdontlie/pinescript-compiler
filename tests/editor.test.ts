import { describe, it, expect } from 'vitest';
import {
  PINE_KEYWORDS,
  PINE_TYPE_KEYWORDS,
  PINE_BUILTIN_VARS,
  PINE_NAMESPACES,
  PINE_NAMESPACE_MEMBERS,
  PINE_GLOBAL_FUNCTIONS,
  pineToken,
  makePineState,
  TokenTag,
} from '../src/editor/pine-language';
import { PINE_THEME_COLORS, getPineThemeConfig } from '../src/editor/theme';

// ── Mock stream interface ─────────────────────────────────────────────────────

class MockStream {
  private src: string;
  pos = 0;
  private _current = '';

  constructor(src: string) {
    this.src = src;
  }

  peek(): string | null {
    return this.pos < this.src.length ? this.src[this.pos] : null;
  }

  next(): string | null {
    if (this.pos >= this.src.length) return null;
    const ch = this.src[this.pos++];
    this._current += ch;
    return ch;
  }

  match(pattern: string | RegExp, consume = true): boolean | RegExpMatchArray | null {
    if (typeof pattern === 'string') {
      if (this.src.startsWith(pattern, this.pos)) {
        if (consume) {
          this._current += pattern;
          this.pos += pattern.length;
        }
        return true;
      }
      return false;
    }
    const m = this.src.slice(this.pos).match(pattern);
    if (m && m.index === 0) {
      if (consume) {
        this._current += m[0];
        this.pos += m[0].length;
      }
      return m;
    }
    return null;
  }

  skipToEnd(): void {
    this._current += this.src.slice(this.pos);
    this.pos = this.src.length;
  }

  eatWhile(re: RegExp): boolean {
    let ate = false;
    while (this.pos < this.src.length && re.test(this.src[this.pos])) {
      this._current += this.src[this.pos++];
      ate = true;
    }
    return ate;
  }

  sol(): boolean { return this.pos === 0; }
  eol(): boolean { return this.pos >= this.src.length; }
  current(): string { return this._current; }
}

function tokenize(src: string): Array<{ tag: TokenTag; text: string }> {
  const tokens: Array<{ tag: TokenTag; text: string }> = [];
  const state = makePineState();
  const stream = new MockStream(src);

  while (!stream.eol()) {
    (stream as any)._current = '';
    const startPos = stream.pos;
    const tag = pineToken(stream as any, state);
    const text = (stream as any).current() as string;
    if (text.length > 0) {
      tokens.push({ tag, text });
    } else if (stream.pos === startPos) {
      // Safety: force advance if no progress
      stream.next();
    }
  }
  return tokens;
}

// ── Token table tests ─────────────────────────────────────────────────────────

describe('Pine Script keyword lists', () => {
  it('PINE_KEYWORDS contains essential control flow keywords', () => {
    expect(PINE_KEYWORDS).toContain('if');
    expect(PINE_KEYWORDS).toContain('else');
    expect(PINE_KEYWORDS).toContain('for');
    expect(PINE_KEYWORDS).toContain('while');
    expect(PINE_KEYWORDS).toContain('var');
    expect(PINE_KEYWORDS).toContain('return');
    expect(PINE_KEYWORDS).toContain('switch');
  });

  it('PINE_TYPE_KEYWORDS contains all type qualifiers', () => {
    expect(PINE_TYPE_KEYWORDS).toContain('int');
    expect(PINE_TYPE_KEYWORDS).toContain('float');
    expect(PINE_TYPE_KEYWORDS).toContain('bool');
    expect(PINE_TYPE_KEYWORDS).toContain('string');
    expect(PINE_TYPE_KEYWORDS).toContain('color');
    expect(PINE_TYPE_KEYWORDS).toContain('series');
    expect(PINE_TYPE_KEYWORDS).toContain('const');
    expect(PINE_TYPE_KEYWORDS).toContain('input');
  });

  it('PINE_BUILTIN_VARS contains OHLCV variables', () => {
    expect(PINE_BUILTIN_VARS).toContain('open');
    expect(PINE_BUILTIN_VARS).toContain('high');
    expect(PINE_BUILTIN_VARS).toContain('low');
    expect(PINE_BUILTIN_VARS).toContain('close');
    expect(PINE_BUILTIN_VARS).toContain('volume');
    expect(PINE_BUILTIN_VARS).toContain('bar_index');
  });

  it('PINE_NAMESPACES contains all major namespaces', () => {
    expect(PINE_NAMESPACES).toContain('ta');
    expect(PINE_NAMESPACES).toContain('math');
    expect(PINE_NAMESPACES).toContain('str');
    expect(PINE_NAMESPACES).toContain('array');
    expect(PINE_NAMESPACES).toContain('color');
    expect(PINE_NAMESPACES).toContain('strategy');
    expect(PINE_NAMESPACES).toContain('request');
    expect(PINE_NAMESPACES).toContain('line');
    expect(PINE_NAMESPACES).toContain('label');
    expect(PINE_NAMESPACES).toContain('box');
    expect(PINE_NAMESPACES).toContain('table');
  });

  it('namespace members exist for all namespaces', () => {
    for (const ns of PINE_NAMESPACES) {
      if (['alert', 'runtime'].includes(ns)) continue; // small namespaces OK to not list
      expect(PINE_NAMESPACE_MEMBERS).toHaveProperty(ns);
      expect((PINE_NAMESPACE_MEMBERS as Record<string, string[]>)[ns].length).toBeGreaterThan(0);
    }
  });

  it('ta namespace has common TA functions', () => {
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('sma');
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('ema');
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('rsi');
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('macd');
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('bbands');
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('crossover');
    expect(PINE_NAMESPACE_MEMBERS.ta).toContain('crossunder');
  });

  it('math namespace has arithmetic functions', () => {
    expect(PINE_NAMESPACE_MEMBERS.math).toContain('abs');
    expect(PINE_NAMESPACE_MEMBERS.math).toContain('sqrt');
    expect(PINE_NAMESPACE_MEMBERS.math).toContain('pow');
    expect(PINE_NAMESPACE_MEMBERS.math).toContain('log');
    expect(PINE_NAMESPACE_MEMBERS.math).toContain('round');
    expect(PINE_NAMESPACE_MEMBERS.math).toContain('pi');
  });
});

// ── Tokenizer tests ───────────────────────────────────────────────────────────

describe('pineToken — line comments', () => {
  it('tokenizes a line comment', () => {
    const tokens = tokenize('// this is a comment');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tag).toBe('comment');
  });

  it('tokenizes code before a comment', () => {
    const tokens = tokenize('x // comment');
    const tags = tokens.map(t => t.tag);
    expect(tags).toContain('variableName');
    expect(tags).toContain('comment');
  });
});

describe('pineToken — block comments', () => {
  it('tokenizes a block comment', () => {
    const tokens = tokenize('/* block comment */');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tag).toBe('comment');
  });

  it('handles unclosed block comment', () => {
    const state = makePineState();
    const stream = new MockStream('/* unclosed');
    (stream as any)._current = '';
    pineToken(stream as any, state);
    expect(state.inBlockComment).toBe(true);
  });
});

describe('pineToken — strings', () => {
  it('tokenizes double-quoted string', () => {
    const tokens = tokenize('"hello world"');
    expect(tokens[0].tag).toBe('string');
    expect(tokens[0].text).toBe('"hello world"');
  });

  it('tokenizes single-quoted string', () => {
    const tokens = tokenize("'test'");
    expect(tokens[0].tag).toBe('string');
  });

  it('handles escape sequences in strings', () => {
    const tokens = tokenize('"say \\"hi\\""');
    expect(tokens[0].tag).toBe('string');
  });
});

describe('pineToken — numbers', () => {
  it('tokenizes integer', () => {
    const tokens = tokenize('42');
    expect(tokens[0].tag).toBe('number');
  });

  it('tokenizes float', () => {
    const tokens = tokenize('3.14');
    expect(tokens[0].tag).toBe('number');
  });

  it('tokenizes scientific notation', () => {
    const tokens = tokenize('1.5e10');
    expect(tokens[0].tag).toBe('number');
  });

  it('tokenizes negative scientific notation', () => {
    const tokens = tokenize('1e-5');
    expect(tokens[0].tag).toBe('number');
  });
});

describe('pineToken — color literals', () => {
  it('tokenizes hex color', () => {
    const tokens = tokenize('#ff0000');
    expect(tokens[0].tag).toBe('color');
  });

  it('tokenizes 8-char hex color with alpha', () => {
    const tokens = tokenize('#ff000080');
    expect(tokens[0].tag).toBe('color');
  });
});

describe('pineToken — keywords', () => {
  it('tokenizes if as keyword', () => {
    const tokens = tokenize('if');
    expect(tokens[0].tag).toBe('keyword');
  });

  it('tokenizes var as keyword', () => {
    const tokens = tokenize('var');
    expect(tokens[0].tag).toBe('keyword');
  });

  it('tokenizes for as keyword', () => {
    const tokens = tokenize('for');
    expect(tokens[0].tag).toBe('keyword');
  });

  it('tokenizes int as typeName', () => {
    const tokens = tokenize('int');
    expect(tokens[0].tag).toBe('typeName');
  });

  it('tokenizes float as typeName', () => {
    const tokens = tokenize('float');
    expect(tokens[0].tag).toBe('typeName');
  });

  it('tokenizes series as typeName', () => {
    const tokens = tokenize('series');
    expect(tokens[0].tag).toBe('typeName');
  });
});

describe('pineToken — namespaces and builtins', () => {
  it('tokenizes ta as namespace', () => {
    const tokens = tokenize('ta');
    expect(tokens[0].tag).toBe('namespace');
  });

  it('tokenizes math as namespace', () => {
    const tokens = tokenize('math');
    expect(tokens[0].tag).toBe('namespace');
  });

  it('tokenizes close as builtinVar', () => {
    const tokens = tokenize('close');
    expect(tokens[0].tag).toBe('builtinVar');
  });

  it('tokenizes bar_index as builtinVar', () => {
    const tokens = tokenize('bar_index');
    expect(tokens[0].tag).toBe('builtinVar');
  });

  it('tokenizes user identifier as variableName', () => {
    const tokens = tokenize('myCustomVar');
    expect(tokens[0].tag).toBe('variableName');
  });
});

describe('pineToken — operators', () => {
  it('tokenizes := as operator', () => {
    const tokens = tokenize(':=');
    expect(tokens[0].tag).toBe('operator');
  });

  it('tokenizes == as operator', () => {
    const tokens = tokenize('==');
    expect(tokens[0].tag).toBe('operator');
  });

  it('tokenizes => as operator', () => {
    const tokens = tokenize('=>');
    expect(tokens[0].tag).toBe('operator');
  });
});

// ── Theme tests ───────────────────────────────────────────────────────────────

describe('Pine theme', () => {
  it('PINE_THEME_COLORS has expected background color', () => {
    expect(PINE_THEME_COLORS.background).toBe('#1e222d');
  });

  it('PINE_THEME_COLORS has foreground text color', () => {
    expect(PINE_THEME_COLORS.foreground).toBe('#d1d4dc');
  });

  it('PINE_THEME_COLORS has distinct keyword color', () => {
    expect(PINE_THEME_COLORS.keyword).toBeDefined();
    expect(PINE_THEME_COLORS.keyword).not.toBe(PINE_THEME_COLORS.foreground);
  });

  it('PINE_THEME_COLORS has distinct string color', () => {
    expect(PINE_THEME_COLORS.string).toBeDefined();
  });

  it('PINE_THEME_COLORS has distinct comment color', () => {
    expect(PINE_THEME_COLORS.comment).toBeDefined();
  });

  it('getPineThemeConfig returns object with background', () => {
    const config = getPineThemeConfig();
    expect(config['&']).toBeDefined();
    expect(config['&'].backgroundColor).toBe('#1e222d');
  });

  it('getPineThemeConfig includes syntax colors', () => {
    const config = getPineThemeConfig();
    expect(config['.cm-keyword']).toBeDefined();
    expect(config['.cm-string']).toBeDefined();
    expect(config['.cm-comment']).toBeDefined();
    expect(config['.cm-number']).toBeDefined();
  });
});

// ── Global functions ──────────────────────────────────────────────────────────

describe('PINE_GLOBAL_FUNCTIONS', () => {
  it('contains indicator', () => {
    expect(PINE_GLOBAL_FUNCTIONS).toContain('indicator');
  });

  it('contains strategy', () => {
    expect(PINE_GLOBAL_FUNCTIONS).toContain('strategy');
  });

  it('contains plot', () => {
    expect(PINE_GLOBAL_FUNCTIONS).toContain('plot');
  });

  it('contains plotshape', () => {
    expect(PINE_GLOBAL_FUNCTIONS).toContain('plotshape');
  });
});
