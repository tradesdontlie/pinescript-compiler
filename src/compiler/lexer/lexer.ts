import { Token, TokenType, SourceLocation, KEYWORDS } from './token';
import { IndentTracker } from './indent-tracker';
import { DiagnosticReporter } from '../diagnostics/diagnostic';

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private reporter: DiagnosticReporter;
  private indentTracker: IndentTracker;
  /** Whether we are at the start of a logical line (after a newline) */
  private atLineStart: boolean = true;

  constructor(source: string, reporter: DiagnosticReporter) {
    this.source = source;
    this.reporter = reporter;
    this.indentTracker = new IndentTracker();
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      if (this.atLineStart) {
        this.handleLineStart();
      } else {
        this.scanToken();
      }
    }

    // Emit trailing DEDENTs before EOF
    const eofLoc = this.currentLoc();
    const dedents = this.indentTracker.finalize(eofLoc);
    for (const d of dedents) {
      this.tokens.push(d);
    }

    this.tokens.push({ type: TokenType.EOF, value: '', loc: eofLoc });
    return this.tokens;
  }

  // ── Line-start: measure indentation ──────────────────────────────────────

  private handleLineStart(): void {
    let indent = 0;
    const startPos = this.pos;
    const startLine = this.line;
    const startCol = this.column;

    // Measure indentation (spaces/tabs), normalising tabs to 4 spaces
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ') {
        indent++;
        this.advance();
      } else if (ch === '\t') {
        indent += 4;
        this.advance();
      } else {
        break;
      }
    }

    // If this is a blank line or comment-only line, skip it without emitting NEWLINE
    if (this.isAtEnd() || this.peek() === '\n' || this.peek() === '\r') {
      this.consumeNewline();
      return;
    }

    // Comment-only lines: skip without indent processing
    if (this.peek() === '/' && this.peekNext() === '/') {
      // Handle annotation vs comment
      // We still want to emit the annotation token. Indent processing is skipped.
      const loc: SourceLocation = { line: startLine, column: 1, offset: startPos };
      this.atLineStart = false;
      this.scanToken();
      return;
    }

    // Emit indent/dedent tokens if needed
    const loc: SourceLocation = { line: startLine, column: 1, offset: startPos };
    const indentTokens = this.indentTracker.process(indent, loc);
    for (const t of indentTokens) {
      this.tokens.push(t);
    }

    this.atLineStart = false;
  }

  // ── Main token scanner ────────────────────────────────────────────────────

  private scanToken(): void {
    // Skip non-newline whitespace
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      this.advance();
    }

    if (this.isAtEnd()) return;

    const ch = this.peek();

    // Newline
    if (ch === '\n' || ch === '\r') {
      const loc = this.currentLoc();
      this.consumeNewline();
      // Emit NEWLINE only if previous token is not a NEWLINE/INDENT/DEDENT
      const last = this.tokens[this.tokens.length - 1];
      if (
        last &&
        last.type !== TokenType.NEWLINE &&
        last.type !== TokenType.INDENT &&
        last.type !== TokenType.DEDENT
      ) {
        this.tokens.push({ type: TokenType.NEWLINE, value: '\n', loc });
      }
      this.atLineStart = true;
      return;
    }

    // Comments and annotations
    if (ch === '/' && this.peekNext() === '/') {
      this.scanCommentOrAnnotation();
      return;
    }

    // Color literal  #RRGGBB[AA]
    if (ch === '#') {
      this.scanColor();
      return;
    }

    // Strings
    if (ch === '"' || ch === "'") {
      this.scanString(ch);
      return;
    }

    // Numbers
    if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peekNext()))) {
      this.scanNumber();
      return;
    }

    // Identifiers / keywords
    if (this.isAlpha(ch)) {
      this.scanIdentifier();
      return;
    }

    // Operators & delimiters
    this.scanOperator();
  }

  // ── Comments / Annotations ────────────────────────────────────────────────

  private scanCommentOrAnnotation(): void {
    const loc = this.currentLoc();
    // consume '//'
    this.advance();
    this.advance();

    if (this.peek() === '@') {
      // Annotation: consume until end of line
      let value = '//@';
      this.advance(); // consume '@'
      while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
        value += this.advance();
      }
      this.tokens.push({ type: TokenType.ANNOTATION, value, loc });
    } else {
      // Regular comment: skip to end of line (do not emit)
      while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
        this.advance();
      }
    }
  }

  // ── Color literals ────────────────────────────────────────────────────────

  private scanColor(): void {
    const loc = this.currentLoc();
    let value = '#';
    this.advance(); // consume '#'

    while (!this.isAtEnd() && this.isHexDigit(this.peek())) {
      value += this.advance();
    }

    const hexLen = value.length - 1; // exclude '#'
    if (hexLen !== 6 && hexLen !== 8) {
      this.reporter.error(
        `Invalid color literal '${value}': expected #RRGGBB or #RRGGBBAA`,
        loc,
      );
    }

    this.tokens.push({ type: TokenType.COLOR, value, loc });
  }

  // ── String literals ───────────────────────────────────────────────────────

  private scanString(quote: string): void {
    const loc = this.currentLoc();
    this.advance(); // consume opening quote
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n' || this.peek() === '\r') {
        this.reporter.error('Unterminated string literal', loc);
        break;
      }
      if (this.peek() === '\\') {
        this.advance(); // consume backslash
        const esc = this.advance();
        switch (esc) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += '\\' + esc;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.reporter.error('Unterminated string literal', loc);
    } else {
      this.advance(); // consume closing quote
    }

    this.tokens.push({ type: TokenType.STRING, value, loc });
  }

  // ── Number literals ───────────────────────────────────────────────────────

  private scanNumber(): void {
    const loc = this.currentLoc();
    let value = '';
    let isFloat = false;

    // Integer part
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (!this.isAtEnd() && this.peek() === '.' && this.isDigit(this.peekNext())) {
      isFloat = true;
      value += this.advance(); // '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Leading dot (e.g. .5)
    if (value === '' && this.peek() === '.') {
      isFloat = true;
      value += this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.tokens.push({
      type: isFloat ? TokenType.FLOAT : TokenType.INTEGER,
      value,
      loc,
    });
  }

  // ── Identifiers / Keywords ────────────────────────────────────────────────

  private scanIdentifier(): void {
    const loc = this.currentLoc();
    let value = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check for keywords
    const kwType = KEYWORDS[value];
    if (kwType !== undefined) {
      this.tokens.push({ type: kwType, value, loc });
    } else {
      this.tokens.push({ type: TokenType.IDENTIFIER, value, loc });
    }
  }

  // ── Operators ─────────────────────────────────────────────────────────────

  private scanOperator(): void {
    const loc = this.currentLoc();
    const ch = this.advance();

    switch (ch) {
      case '+':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.PLUS_ASSIGN, value: '+=', loc });
        } else {
          this.tokens.push({ type: TokenType.PLUS, value: '+', loc });
        }
        break;
      case '-':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.MINUS_ASSIGN, value: '-=', loc });
        } else if (this.match('>')) {
          this.tokens.push({ type: TokenType.THIN_ARROW, value: '->', loc });
        } else {
          this.tokens.push({ type: TokenType.MINUS, value: '-', loc });
        }
        break;
      case '*':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.STAR_ASSIGN, value: '*=', loc });
        } else {
          this.tokens.push({ type: TokenType.STAR, value: '*', loc });
        }
        break;
      case '/':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.SLASH_ASSIGN, value: '/=', loc });
        } else {
          this.tokens.push({ type: TokenType.SLASH, value: '/', loc });
        }
        break;
      case '%':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.PERCENT_ASSIGN, value: '%=', loc });
        } else {
          this.tokens.push({ type: TokenType.PERCENT, value: '%', loc });
        }
        break;
      case '=':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.EQ, value: '==', loc });
        } else if (this.match('>')) {
          this.tokens.push({ type: TokenType.ARROW, value: '=>', loc });
        } else {
          this.tokens.push({ type: TokenType.ASSIGN, value: '=', loc });
        }
        break;
      case '!':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.NEQ, value: '!=', loc });
        } else {
          this.reporter.error(`Unexpected character '!'`, loc);
        }
        break;
      case '<':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.LTE, value: '<=', loc });
        } else {
          this.tokens.push({ type: TokenType.LT, value: '<', loc });
        }
        break;
      case '>':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.GTE, value: '>=', loc });
        } else {
          this.tokens.push({ type: TokenType.GT, value: '>', loc });
        }
        break;
      case ':':
        if (this.match('=')) {
          this.tokens.push({ type: TokenType.REASSIGN, value: ':=', loc });
        } else {
          this.tokens.push({ type: TokenType.COLON, value: ':', loc });
        }
        break;
      case '?':
        this.tokens.push({ type: TokenType.QUESTION, value: '?', loc });
        break;
      case '[':
        this.tokens.push({ type: TokenType.LBRACKET, value: '[', loc });
        break;
      case ']':
        this.tokens.push({ type: TokenType.RBRACKET, value: ']', loc });
        break;
      case '(':
        this.tokens.push({ type: TokenType.LPAREN, value: '(', loc });
        break;
      case ')':
        this.tokens.push({ type: TokenType.RPAREN, value: ')', loc });
        break;
      case ',':
        this.tokens.push({ type: TokenType.COMMA, value: ',', loc });
        break;
      case '.':
        this.tokens.push({ type: TokenType.DOT, value: '.', loc });
        break;
      default:
        this.reporter.error(`Unexpected character '${ch}'`, loc);
        break;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private peek(): string {
    return this.source[this.pos] ?? '';
  }

  private peekNext(): string {
    return this.source[this.pos + 1] ?? '';
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.pos] !== expected) return false;
    this.advance();
    return true;
  }

  private consumeNewline(): void {
    if (this.peek() === '\r') {
      this.advance();
      if (this.peek() === '\n') this.advance();
    } else {
      this.advance(); // '\n'
    }
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private currentLoc(): SourceLocation {
    return { line: this.line, column: this.column, offset: this.pos };
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  private isHexDigit(ch: string): boolean {
    return (
      (ch >= '0' && ch <= '9') ||
      (ch >= 'a' && ch <= 'f') ||
      (ch >= 'A' && ch <= 'F')
    );
  }
}
