import { Token, TokenType, SourceLocation } from '../lexer/token';
import { DiagnosticReporter } from '../diagnostics/diagnostic';
import {
  Program, Statement, Expression,
  VariableDeclaration, FunctionDeclaration, FunctionParam, TypeAnnotation,
  TypeDeclaration, TypeField, MethodDeclaration, EnumDeclaration,
  ImportStatement, ExportStatement,
  IfStatement, ForStatement, ForInStatement, WhileStatement,
  SwitchStatement, SwitchCase,
  ReturnStatement, BreakStatement, ContinueStatement,
  ExpressionStatement, AssignmentStatement,
  BinaryExpression, UnaryExpression, ConditionalExpression,
  CallExpression, CallArgument, MemberExpression, IndexExpression,
  IdentifierExpression, LiteralExpression, ArrayLiteralExpression,
  GroupExpression, IfExpression, SwitchExpression, SwitchExprCase,
} from '../ast/nodes';
import { Precedence, getInfixInfo } from './precedence';

// Assignment operators
const ASSIGN_OPS = new Set([
  TokenType.ASSIGN,
  TokenType.REASSIGN,
  TokenType.PLUS_ASSIGN,
  TokenType.MINUS_ASSIGN,
  TokenType.STAR_ASSIGN,
  TokenType.SLASH_ASSIGN,
  TokenType.PERCENT_ASSIGN,
]);

// Type qualifier keywords
const TYPE_QUALIFIERS = new Set([
  TokenType.CONST,
  TokenType.INPUT,
  TokenType.SIMPLE,
  TokenType.SERIES,
]);

// Base type keywords (non-IDENTIFIER)
const BASE_TYPE_KWS = new Set([
  TokenType.INT,
  TokenType.FLOAT_TYPE,
  TokenType.BOOL_TYPE,
  TokenType.STRING_TYPE,
  TokenType.COLOR_TYPE,
]);

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private reporter: DiagnosticReporter;

  // Metadata extracted from top-level calls
  public version: number = 6;
  public metadata: Record<string, string> = {};

  constructor(tokens: Token[], reporter: DiagnosticReporter) {
    // Filter out comments but keep everything else
    this.tokens = tokens.filter(t => t.type !== TokenType.COMMENT);
    this.reporter = reporter;
  }

  parse(): Program {
    const loc = this.peek().loc;
    const body = this.parseProgram();
    return { kind: 'Program', body, loc };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', loc: { line: 0, column: 0, offset: 0 } };
  }

  private peekAt(offset: number): Token {
    return this.tokens[this.pos + offset] ?? { type: TokenType.EOF, value: '', loc: { line: 0, column: 0, offset: 0 } };
  }

  private advance(): Token {
    const tok = this.peek();
    if (tok.type !== TokenType.EOF) this.pos++;
    return tok;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkAny(...types: TokenType[]): boolean {
    return types.includes(this.peek().type);
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const loc = this.peek().loc;
    this.reporter.error(`${message}, got '${this.peek().value}' (${this.peek().type})`, loc);
    // Advance past the unexpected token to prevent infinite loops
    if (!this.isAtEnd()) this.advance();
    return { type, value: '', loc };
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) this.advance();
  }

  private consumeNewline(): void {
    if (this.check(TokenType.NEWLINE)) this.advance();
  }

  // ── Program ──────────────────────────────────────────────────────────────

  private parseProgram(): Statement[] {
    const stmts: Statement[] = [];
    this.skipNewlines();

    while (!this.isAtEnd()) {
      if (this.check(TokenType.ANNOTATION)) {
        this.parseAnnotation();
        this.skipNewlines();
        continue;
      }
      const stmt = this.parseStatementSafe();
      if (stmt) stmts.push(stmt);
      this.skipNewlines();
    }

    return stmts;
  }

  private parseAnnotation(): void {
    const tok = this.advance(); // ANNOTATION token
    const raw = tok.value; // "//@version=6"
    const content = raw.slice(3); // strip "//@"
    const eqIdx = content.indexOf('=');
    if (eqIdx !== -1) {
      const key = content.slice(0, eqIdx).trim();
      const val = content.slice(eqIdx + 1).trim();
      if (key === 'version') {
        this.version = parseInt(val, 10) || 6;
      } else {
        this.metadata[key] = val;
      }
    }
    if (this.check(TokenType.NEWLINE)) this.advance();
  }

  private parseStatementSafe(): Statement | null {
    try {
      return this.parseStatement();
    } catch {
      this.synchronize();
      return null;
    }
  }

  /**
   * Look ahead to determine if `[IDENT, IDENT, ...] =` pattern (tuple destructure)
   * vs an array literal expression.
   */
  private isTupleDestructurePattern(): boolean {
    let i = this.pos;
    if (this.tokens[i]?.type !== TokenType.LBRACKET) return false;
    i++;
    // Expect one or more identifiers separated by commas
    while (i < this.tokens.length) {
      if (this.tokens[i]?.type !== TokenType.IDENTIFIER) return false;
      i++;
      if (this.tokens[i]?.type === TokenType.RBRACKET) { i++; break; }
      if (this.tokens[i]?.type !== TokenType.COMMA) return false;
      i++;
    }
    // After ] must be =
    return this.tokens[i]?.type === TokenType.ASSIGN;
  }

  private synchronize(): void {
    // Always advance at least one token to guarantee progress
    if (!this.isAtEnd()) this.advance();
    while (!this.isAtEnd()) {
      const t = this.peek().type;
      if (t === TokenType.NEWLINE || t === TokenType.DEDENT) { this.advance(); return; }
      if (t === TokenType.IF || t === TokenType.FOR || t === TokenType.WHILE ||
          t === TokenType.RETURN || t === TokenType.VAR || t === TokenType.VARIP ||
          t === TokenType.TYPE || t === TokenType.ENUM || t === TokenType.IMPORT ||
          t === TokenType.EXPORT) return;
      this.advance();
    }
  }

  // ── Statements ───────────────────────────────────────────────────────────

  private parseStatement(): Statement {
    const cur = this.peek();

    switch (cur.type) {
      case TokenType.VAR:
      case TokenType.VARIP:
        return this.parseVarDecl();

      case TokenType.IF:
        return this.parseIfStmt();

      case TokenType.FOR:
        return this.parseForStmt();

      case TokenType.WHILE:
        return this.parseWhileStmt();

      case TokenType.SWITCH:
        return this.parseSwitchStmt();

      case TokenType.RETURN:
        return this.parseReturnStmt();

      case TokenType.BREAK: {
        const loc = this.advance().loc;
        this.consumeNewline();
        return { kind: 'BreakStatement', loc } as BreakStatement;
      }

      case TokenType.CONTINUE: {
        const loc = this.advance().loc;
        this.consumeNewline();
        return { kind: 'ContinueStatement', loc } as ContinueStatement;
      }

      case TokenType.IMPORT:
        return this.parseImportStmt();

      case TokenType.EXPORT:
        return this.parseExportStmt();

      case TokenType.TYPE:
        return this.parseTypeDecl();

      case TokenType.ENUM:
        return this.parseEnumDecl();

      case TokenType.METHOD:
        return this.parseMethodDecl();

      case TokenType.LBRACKET:
        // Only treat as tuple destructure if pattern is [IDENT, ...] =
        if (this.isTupleDestructurePattern()) {
          return this.parseTupleDestructure();
        }
        return this.parseExprOrAssign();

      default:
        return this.parseAmbiguousStmt();
    }
  }

  /**
   * Dispatches ambiguous statements:
   * - type-annotated var declaration: `int x = expr`
   * - function declaration: `name(params) => expr` or `name(params)\n  INDENT body DEDENT`
   * - assignment: `x := expr`, `x += expr`
   * - expression statement
   */
  private parseAmbiguousStmt(): Statement {
    // Check for type-annotated declaration (no var/varip modifier):
    // e.g. `int x = 1` or `series<float> x = close`
    if (this.isTypeAnnotationStart()) {
      const saved = this.pos;
      try {
        const typeAnn = this.parseTypeAnnotation();
        if (this.check(TokenType.IDENTIFIER)) {
          const nameTok = this.advance();
          if (this.check(TokenType.ASSIGN)) {
            this.advance(); // consume =
            const value = this.parseExpression();
            this.consumeNewline();
            return {
              kind: 'VariableDeclaration',
              modifier: null,
              typeAnnotation: typeAnn,
              name: nameTok.value,
              value,
              isTupleDestructure: false,
              tupleNames: null,
              loc: nameTok.loc,
            } as VariableDeclaration;
          }
          // Not an assignment after type+name — restore
          this.pos = saved;
        } else {
          this.pos = saved;
        }
      } catch {
        this.pos = saved;
      }
    }

    // Check for function declaration: IDENT LPAREN ...
    if (this.check(TokenType.IDENTIFIER)) {
      const kind = this.sniffFunctionDecl();
      if (kind === 'funcDecl') {
        return this.parseFunctionDecl();
      }
    }

    // Expression or assignment
    return this.parseExprOrAssign();
  }

  /**
   * Look ahead from current IDENTIFIER token to decide if this is a function
   * declaration (name(params) => | name(params)\nINDENT) vs a call expression.
   * Returns 'funcDecl' or 'other'.
   */
  private sniffFunctionDecl(): 'funcDecl' | 'other' {
    if (this.peekAt(0).type !== TokenType.IDENTIFIER) return 'other';
    if (this.peekAt(1).type !== TokenType.LPAREN) return 'other';

    // Scan forward past the parameter list
    let i = this.pos + 1; // pointing at LPAREN
    let depth = 0;

    while (i < this.tokens.length) {
      const t = this.tokens[i].type;
      if (t === TokenType.LPAREN) depth++;
      else if (t === TokenType.RPAREN) {
        depth--;
        if (depth === 0) { i++; break; }
      } else if (t === TokenType.EOF) break;
      i++;
    }

    // Skip optional `-> type` return annotation
    if (i < this.tokens.length && this.tokens[i].type === TokenType.THIN_ARROW) {
      i++;
      while (i < this.tokens.length) {
        const t = this.tokens[i].type;
        if (t === TokenType.IDENTIFIER || BASE_TYPE_KWS.has(t) ||
            TYPE_QUALIFIERS.has(t) || t === TokenType.LT || t === TokenType.GT || t === TokenType.COMMA) {
          i++;
        } else break;
      }
    }

    if (i >= this.tokens.length) return 'other';
    const next = this.tokens[i].type;

    if (next === TokenType.ARROW) return 'funcDecl';
    // NEWLINE followed by INDENT means a block body
    if (next === TokenType.NEWLINE) {
      const afterNewline = this.tokens[i + 1]?.type;
      return afterNewline === TokenType.INDENT ? 'funcDecl' : 'other';
    }
    if (next === TokenType.INDENT) return 'funcDecl';
    return 'other';
  }

  private parseExprOrAssign(): Statement {
    const expr = this.parseExpression();

    if (ASSIGN_OPS.has(this.peek().type)) {
      const opTok = this.advance();
      const op = opTok.value as AssignmentStatement['operator'];
      const value = this.parseExpression();
      this.consumeNewline();
      return {
        kind: 'AssignmentStatement',
        target: expr,
        operator: op,
        value,
        loc: expr.loc,
      } as AssignmentStatement;
    }

    this.consumeNewline();
    return {
      kind: 'ExpressionStatement',
      expression: expr,
      loc: expr.loc,
    } as ExpressionStatement;
  }

  // ── Variable Declaration ─────────────────────────────────────────────────

  private parseVarDecl(): VariableDeclaration {
    const loc = this.peek().loc;
    const modTok = this.advance(); // var / varip
    const modifier = modTok.value as 'var' | 'varip';

    // Optional type annotation before name
    let typeAnnotation: TypeAnnotation | null = null;
    if (this.isTypeAnnotationStart()) {
      const saved = this.pos;
      try {
        const ann = this.parseTypeAnnotation();
        if (this.check(TokenType.IDENTIFIER)) {
          typeAnnotation = ann;
        } else {
          this.pos = saved;
        }
      } catch {
        this.pos = saved;
      }
    }

    const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected variable name');
    this.expect(TokenType.ASSIGN, 'Expected = after variable name');
    const value = this.parseExpression();
    this.consumeNewline();

    return {
      kind: 'VariableDeclaration',
      modifier,
      typeAnnotation,
      name: nameTok.value,
      value,
      isTupleDestructure: false,
      tupleNames: null,
      loc,
    };
  }

  // ── Tuple Destructure ────────────────────────────────────────────────────

  private parseTupleDestructure(): VariableDeclaration {
    const loc = this.peek().loc;
    this.expect(TokenType.LBRACKET, 'Expected [');
    const names: string[] = [];

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected identifier in tuple');
      names.push(nameTok.value);
      if (!this.check(TokenType.RBRACKET)) {
        this.expect(TokenType.COMMA, 'Expected , between tuple names');
      }
    }

    this.expect(TokenType.RBRACKET, 'Expected ]');
    this.expect(TokenType.ASSIGN, 'Expected = after tuple');
    const value = this.parseExpression();
    this.consumeNewline();

    return {
      kind: 'VariableDeclaration',
      modifier: null,
      typeAnnotation: null,
      name: names[0] ?? '_',
      value,
      isTupleDestructure: true,
      tupleNames: names,
      loc,
    };
  }

  // ── Function Declaration ─────────────────────────────────────────────────

  private parseFunctionDecl(): FunctionDeclaration {
    const loc = this.peek().loc;
    const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected function name');
    this.expect(TokenType.LPAREN, 'Expected (');
    const params = this.parseFunctionParams();
    this.expect(TokenType.RPAREN, 'Expected )');

    let returnType: TypeAnnotation | null = null;
    if (this.check(TokenType.THIN_ARROW)) {
      this.advance();
      returnType = this.parseTypeAnnotation();
    }

    let body: Statement[] | Expression;

    if (this.check(TokenType.ARROW)) {
      this.advance(); // consume =>
      body = this.parseExpression();
      this.consumeNewline();
    } else {
      this.consumeNewline();
      body = this.parseBlock();
    }

    return { kind: 'FunctionDeclaration', name: nameTok.value, params, returnType, body, loc };
  }

  private parseFunctionParams(): FunctionParam[] {
    const params: FunctionParam[] = [];

    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      let typeAnnotation: TypeAnnotation | null = null;
      if (this.isTypeAnnotationStart()) {
        const saved = this.pos;
        try {
          const ann = this.parseTypeAnnotation();
          if (this.check(TokenType.IDENTIFIER)) {
            typeAnnotation = ann;
          } else {
            this.pos = saved;
          }
        } catch {
          this.pos = saved;
        }
      }

      const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected parameter name');

      let defaultValue: Expression | null = null;
      if (this.check(TokenType.ASSIGN)) {
        this.advance();
        defaultValue = this.parseExpression();
      }

      params.push({ name: nameTok.value, typeAnnotation, defaultValue });

      if (!this.check(TokenType.RPAREN)) {
        this.expect(TokenType.COMMA, 'Expected , between parameters');
      }
    }

    return params;
  }

  // ── Method Declaration ───────────────────────────────────────────────────

  private parseMethodDecl(): MethodDeclaration {
    const loc = this.peek().loc;
    this.advance(); // consume 'method'
    const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected method name');
    this.expect(TokenType.LPAREN, 'Expected (');
    const params = this.parseFunctionParams();
    this.expect(TokenType.RPAREN, 'Expected )');

    let returnType: TypeAnnotation | null = null;
    if (this.check(TokenType.THIN_ARROW)) {
      this.advance();
      returnType = this.parseTypeAnnotation();
    }

    const thisType = params.length > 0 ? (params[0].typeAnnotation?.baseType ?? 'unknown') : 'unknown';
    const restParams = params.slice(1);

    let body: Statement[] | Expression;
    if (this.check(TokenType.ARROW)) {
      this.advance();
      body = this.parseExpression();
      this.consumeNewline();
    } else {
      this.consumeNewline();
      body = this.parseBlock();
    }

    return { kind: 'MethodDeclaration', name: nameTok.value, thisType, params: restParams, returnType, body, loc };
  }

  // ── Type Declaration ─────────────────────────────────────────────────────

  private parseTypeDecl(): TypeDeclaration {
    const loc = this.peek().loc;
    this.advance(); // consume 'type'
    const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected type name');
    this.consumeNewline();
    this.expect(TokenType.INDENT, 'Expected indent after type declaration');

    const fields: TypeField[] = [];
    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check(TokenType.DEDENT)) break;
      const typeAnn = this.parseTypeAnnotation();
      const fieldName = this.expect(TokenType.IDENTIFIER, 'Expected field name');
      let defaultValue: Expression | null = null;
      if (this.check(TokenType.ASSIGN)) {
        this.advance();
        defaultValue = this.parseExpression();
      }
      fields.push({ name: fieldName.value, typeAnnotation: typeAnn, defaultValue });
      this.consumeNewline();
    }

    this.expect(TokenType.DEDENT, 'Expected dedent after type body');
    return { kind: 'TypeDeclaration', name: nameTok.value, fields, loc };
  }

  // ── Enum Declaration ─────────────────────────────────────────────────────

  private parseEnumDecl(): EnumDeclaration {
    const loc = this.peek().loc;
    this.advance(); // consume 'enum'
    const nameTok = this.expect(TokenType.IDENTIFIER, 'Expected enum name');
    this.consumeNewline();
    this.expect(TokenType.INDENT, 'Expected indent after enum');

    const members: string[] = [];
    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check(TokenType.DEDENT)) break;
      const memberTok = this.expect(TokenType.IDENTIFIER, 'Expected enum member');
      members.push(memberTok.value);
      this.consumeNewline();
    }

    this.expect(TokenType.DEDENT, 'Expected dedent after enum body');
    return { kind: 'EnumDeclaration', name: nameTok.value, members, loc };
  }

  // ── Import / Export ──────────────────────────────────────────────────────

  private parseImportStmt(): ImportStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'import'

    const parts: string[] = [];
    parts.push(this.expect(TokenType.IDENTIFIER, 'Expected library path').value);

    let version: number | null = null;

    // Accept slash-separated path like username/library/version
    while (this.check(TokenType.SLASH)) {
      this.advance();
      if (this.check(TokenType.INTEGER)) {
        version = parseInt(this.advance().value, 10);
        break;
      } else {
        parts.push(this.expect(TokenType.IDENTIFIER, 'Expected path segment').value);
      }
    }

    const source = parts.join('/');
    let alias = '';

    if (this.check(TokenType.AS)) {
      this.advance();
      alias = this.expect(TokenType.IDENTIFIER, 'Expected alias').value;
    }

    this.consumeNewline();
    return { kind: 'ImportStatement', source, alias, version, loc };
  }

  private parseExportStmt(): ExportStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'export'

    let declaration: ExportStatement['declaration'];

    if (this.check(TokenType.TYPE)) {
      declaration = this.parseTypeDecl();
    } else if (this.check(TokenType.VAR) || this.check(TokenType.VARIP)) {
      declaration = this.parseVarDecl();
    } else {
      declaration = this.parseFunctionDecl();
    }

    return { kind: 'ExportStatement', declaration, loc };
  }

  // ── If Statement ─────────────────────────────────────────────────────────

  private parseIfStmt(): IfStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'if'
    const condition = this.parseExpression();
    this.consumeNewline();
    const thenBlock = this.parseBlock();

    let elseBlock: Statement[] | IfStatement | null = null;

    if (this.check(TokenType.ELSE)) {
      this.advance(); // consume 'else'
      if (this.check(TokenType.IF)) {
        elseBlock = this.parseIfStmt();
      } else {
        this.consumeNewline();
        elseBlock = this.parseBlock();
      }
    }

    return { kind: 'IfStatement', condition, thenBlock, elseBlock, loc };
  }

  // ── For / ForIn Statement ────────────────────────────────────────────────

  private parseForStmt(): ForStatement | ForInStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'for'

    // Check for destructuring: for [index, value] in iterable
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // consume [
      const indexTok = this.expect(TokenType.IDENTIFIER, 'Expected index variable');
      this.expect(TokenType.COMMA, 'Expected , in for destructuring');
      const valueTok = this.expect(TokenType.IDENTIFIER, 'Expected value variable');
      this.expect(TokenType.RBRACKET, 'Expected ]');
      this.expect(TokenType.IN, 'Expected in after for destructuring');
      const iterable = this.parseExpression();
      this.consumeNewline();
      const body = this.parseBlock();
      return {
        kind: 'ForInStatement',
        variable: valueTok.value,
        indexVariable: indexTok.value,
        iterable,
        body,
        loc,
      } as ForInStatement;
    }

    const varTok = this.expect(TokenType.IDENTIFIER, 'Expected variable name');

    if (this.check(TokenType.IN)) {
      this.advance(); // consume 'in'
      const iterable = this.parseExpression();
      this.consumeNewline();
      const body = this.parseBlock();
      return { kind: 'ForInStatement', variable: varTok.value, indexVariable: null, iterable, body, loc } as ForInStatement;
    }

    // for i = start to end [by step]
    this.expect(TokenType.ASSIGN, 'Expected = in for loop');
    const start = this.parseExpression();
    this.expect(TokenType.TO, 'Expected to in for loop');
    const end = this.parseExpression();

    let step: Expression | null = null;
    if (this.check(TokenType.BY)) {
      this.advance();
      step = this.parseExpression();
    }

    this.consumeNewline();
    const body = this.parseBlock();

    return { kind: 'ForStatement', variable: varTok.value, start, end, step, body, loc };
  }

  // ── While Statement ──────────────────────────────────────────────────────

  private parseWhileStmt(): WhileStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'while'
    const condition = this.parseExpression();
    this.consumeNewline();
    const body = this.parseBlock();
    return { kind: 'WhileStatement', condition, body, loc };
  }

  // ── Switch Statement ─────────────────────────────────────────────────────

  private parseSwitchStmt(): SwitchStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'switch'

    let discriminant: Expression | null = null;
    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.INDENT) && !this.isAtEnd()) {
      discriminant = this.parseExpression();
    }

    this.consumeNewline();
    this.expect(TokenType.INDENT, 'Expected indent after switch');

    const cases: SwitchCase[] = [];
    let defaultCase: Statement[] | null = null;

    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check(TokenType.DEDENT)) break;

      if (this.check(TokenType.ARROW)) {
        // Default case: => body
        this.advance();
        this.consumeNewline();
        defaultCase = this.parseBlock();
      } else {
        const values: Expression[] = [this.parseExpression()];
        while (this.check(TokenType.COMMA)) {
          this.advance();
          values.push(this.parseExpression());
        }
        this.expect(TokenType.ARROW, 'Expected => after case values');
        this.consumeNewline();
        const body = this.parseBlock();
        cases.push({ values, body });
      }
    }

    this.expect(TokenType.DEDENT, 'Expected dedent after switch body');
    return { kind: 'SwitchStatement', discriminant, cases, defaultCase, loc };
  }

  // ── Return ───────────────────────────────────────────────────────────────

  private parseReturnStmt(): ReturnStatement {
    const loc = this.peek().loc;
    this.advance(); // consume 'return'

    let value: Expression | null = null;
    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      value = this.parseExpression();
    }

    this.consumeNewline();
    return { kind: 'ReturnStatement', value, loc };
  }

  // ── Block ────────────────────────────────────────────────────────────────

  private parseBlock(): Statement[] {
    this.expect(TokenType.INDENT, 'Expected indent');
    const stmts: Statement[] = [];
    this.skipNewlines();

    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      if (this.check(TokenType.ANNOTATION)) {
        this.parseAnnotation();
        this.skipNewlines();
        continue;
      }
      const stmt = this.parseStatementSafe();
      if (stmt) stmts.push(stmt);
      this.skipNewlines();
    }

    this.expect(TokenType.DEDENT, 'Expected dedent');
    return stmts;
  }

  // ── Expressions (Pratt-style) ────────────────────────────────────────────

  parseExpression(minPrec: number = Precedence.NONE): Expression {
    let left = this.parseUnary();

    while (true) {
      const cur = this.peek();
      const info = getInfixInfo(cur.type);
      if (!info || info.precedence <= minPrec) break;

      if (cur.type === TokenType.QUESTION) {
        // Ternary: expr ? consequent : alternate
        this.advance(); // consume ?
        const consequent = this.parseExpression(Precedence.NONE);
        this.expect(TokenType.COLON, 'Expected : in ternary expression');
        const alternate = this.parseExpression(Precedence.NONE);
        left = {
          kind: 'ConditionalExpression',
          condition: left,
          consequent,
          alternate,
          loc: left.loc,
        } as ConditionalExpression;
        continue;
      }

      const opTok = this.advance();
      const nextMinPrec = info.associativity === 'right'
        ? info.precedence - 1
        : info.precedence;

      const right = this.parseExpression(nextMinPrec);
      left = {
        kind: 'BinaryExpression',
        operator: opTok.value,
        left,
        right,
        loc: left.loc,
      } as BinaryExpression;
    }

    return left;
  }

  private parseUnary(): Expression {
    const cur = this.peek();

    if (cur.type === TokenType.NOT) {
      const loc = cur.loc;
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'UnaryExpression', operator: 'not', operand, prefix: true, loc } as UnaryExpression;
    }

    if (cur.type === TokenType.MINUS || cur.type === TokenType.PLUS) {
      const loc = cur.loc;
      const op = this.advance().value;
      const operand = this.parsePostfix(); // parse postfix, not another unary, to avoid ambiguity with binary
      return { kind: 'UnaryExpression', operator: op, operand, prefix: true, loc } as UnaryExpression;
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.check(TokenType.LPAREN)) {
        // Function/method call
        this.advance(); // consume (
        const args = this.parseCallArgs();
        this.expect(TokenType.RPAREN, 'Expected )');
        expr = { kind: 'CallExpression', callee: expr, args, loc: expr.loc } as CallExpression;

        // Extract indicator/strategy metadata
        const ce = expr as CallExpression;
        if (ce.callee.kind === 'IdentifierExpression') {
          const name = (ce.callee as IdentifierExpression).name;
          if (name === 'indicator' || name === 'strategy') {
            this.extractMetadata(ce);
          }
        }
      } else if (this.check(TokenType.DOT)) {
        this.advance(); // consume .
        const propTok = this.expect(TokenType.IDENTIFIER, 'Expected property name');
        expr = { kind: 'MemberExpression', object: expr, property: propTok.value, loc: expr.loc } as MemberExpression;
      } else if (this.check(TokenType.LBRACKET)) {
        this.advance(); // consume [
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET, 'Expected ]');
        expr = { kind: 'IndexExpression', object: expr, index, loc: expr.loc } as IndexExpression;
      } else {
        break;
      }
    }

    return expr;
  }

  private parseCallArgs(): CallArgument[] {
    const args: CallArgument[] = [];

    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      // Named arg: IDENTIFIER = expr (but not IDENTIFIER == expr or IDENTIFIER := expr)
      // Also handle type keywords used as param names (e.g. color=color.blue)
      let name: string | null = null;
      const isNamedArgStart = (
        this.check(TokenType.IDENTIFIER) ||
        this.check(TokenType.COLOR_TYPE) ||
        this.check(TokenType.INT) ||
        this.check(TokenType.FLOAT_TYPE) ||
        this.check(TokenType.BOOL_TYPE) ||
        this.check(TokenType.STRING_TYPE) ||
        this.check(TokenType.INPUT)
      ) && this.peekAt(1).type === TokenType.ASSIGN;
      if (isNamedArgStart) {
        name = this.advance().value;
        this.advance(); // consume =
      }

      const value = this.parseExpression();
      args.push({ name, value });

      if (!this.check(TokenType.RPAREN)) {
        this.expect(TokenType.COMMA, 'Expected , between arguments');
      }
    }

    return args;
  }

  private extractMetadata(call: CallExpression): void {
    for (const arg of call.args) {
      if (arg.name && arg.value.kind === 'LiteralExpression') {
        this.metadata[arg.name] = String((arg.value as LiteralExpression).value);
      }
    }
  }

  private parsePrimary(): Expression {
    const cur = this.peek();

    switch (cur.type) {
      case TokenType.INTEGER:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'int', value: parseInt(cur.value, 10), loc: cur.loc } as LiteralExpression;

      case TokenType.FLOAT:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'float', value: parseFloat(cur.value), loc: cur.loc } as LiteralExpression;

      case TokenType.STRING:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'string', value: cur.value, loc: cur.loc } as LiteralExpression;

      case TokenType.TRUE:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'bool', value: true, loc: cur.loc } as LiteralExpression;

      case TokenType.FALSE:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'bool', value: false, loc: cur.loc } as LiteralExpression;

      case TokenType.COLOR:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'color', value: cur.value, loc: cur.loc } as LiteralExpression;

      case TokenType.NA:
        this.advance();
        return { kind: 'LiteralExpression', valueType: 'na', value: null, loc: cur.loc } as LiteralExpression;

      case TokenType.IDENTIFIER:
      // Type keywords used as namespace identifiers (e.g. color.red, int as function param name)
      case TokenType.COLOR_TYPE:
      case TokenType.INT:
      case TokenType.FLOAT_TYPE:
      case TokenType.BOOL_TYPE:
      case TokenType.STRING_TYPE:
      case TokenType.INPUT:
        this.advance();
        return { kind: 'IdentifierExpression', name: cur.value, loc: cur.loc } as IdentifierExpression;

      case TokenType.LPAREN: {
        this.advance(); // consume (
        const expr = this.parseExpression();
        this.expect(TokenType.RPAREN, 'Expected )');
        return { kind: 'GroupExpression', expression: expr, loc: cur.loc } as GroupExpression;
      }

      case TokenType.LBRACKET: {
        // Array literal
        this.advance(); // consume [
        const elements: Expression[] = [];
        while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
          elements.push(this.parseExpression());
          if (!this.check(TokenType.RBRACKET)) {
            this.expect(TokenType.COMMA, 'Expected , in array literal');
          }
        }
        this.expect(TokenType.RBRACKET, 'Expected ]');
        return { kind: 'ArrayLiteralExpression', elements, loc: cur.loc } as ArrayLiteralExpression;
      }

      case TokenType.IF:
        return this.parseIfExpr();

      case TokenType.SWITCH:
        return this.parseSwitchExpr();

      default: {
        this.reporter.error(`Unexpected token '${cur.value}' (${cur.type})`, cur.loc);
        this.advance(); // avoid infinite loop
        return { kind: 'LiteralExpression', valueType: 'na', value: null, loc: cur.loc } as LiteralExpression;
      }
    }
  }

  // ── If Expression ────────────────────────────────────────────────────────

  private parseIfExpr(): IfExpression {
    const loc = this.peek().loc;
    this.advance(); // consume 'if'
    const condition = this.parseExpression();
    this.consumeNewline();
    this.expect(TokenType.INDENT, 'Expected indent in if expression');
    this.skipNewlines();
    const thenBranch = this.parseExpression();
    this.consumeNewline();
    this.skipNewlines();
    this.expect(TokenType.DEDENT, 'Expected dedent after then branch');

    let elseBranch: Expression | null = null;
    if (this.check(TokenType.ELSE)) {
      this.advance(); // consume 'else'
      this.consumeNewline();
      this.expect(TokenType.INDENT, 'Expected indent in else branch');
      this.skipNewlines();
      elseBranch = this.parseExpression();
      this.consumeNewline();
      this.skipNewlines();
      this.expect(TokenType.DEDENT, 'Expected dedent after else branch');
    }

    return { kind: 'IfExpression', condition, thenBranch, elseBranch, loc };
  }

  // ── Switch Expression ────────────────────────────────────────────────────

  private parseSwitchExpr(): SwitchExpression {
    const loc = this.peek().loc;
    this.advance(); // consume 'switch'

    let discriminant: Expression | null = null;
    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.INDENT) && !this.isAtEnd()) {
      discriminant = this.parseExpression();
    }

    this.consumeNewline();
    this.expect(TokenType.INDENT, 'Expected indent after switch');

    const cases: SwitchExprCase[] = [];
    let defaultCase: Expression | null = null;

    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check(TokenType.DEDENT)) break;

      if (this.check(TokenType.ARROW)) {
        this.advance(); // consume =>
        this.consumeNewline();
        this.expect(TokenType.INDENT, 'Expected indent in default case');
        this.skipNewlines();
        defaultCase = this.parseExpression();
        this.consumeNewline();
        this.skipNewlines();
        this.expect(TokenType.DEDENT, 'Expected dedent');
      } else {
        const values: Expression[] = [this.parseExpression()];
        while (this.check(TokenType.COMMA)) {
          this.advance();
          values.push(this.parseExpression());
        }
        this.expect(TokenType.ARROW, 'Expected => in switch case');
        this.consumeNewline();
        this.expect(TokenType.INDENT, 'Expected indent in switch case');
        this.skipNewlines();
        const body = this.parseExpression();
        this.consumeNewline();
        this.skipNewlines();
        this.expect(TokenType.DEDENT, 'Expected dedent');
        cases.push({ values, body });
      }
    }

    this.expect(TokenType.DEDENT, 'Expected dedent after switch');
    return { kind: 'SwitchExpression', discriminant, cases, defaultCase, loc };
  }

  // ── Type Annotation ──────────────────────────────────────────────────────

  // Drawing object and other types that can appear as type annotations
  private static readonly DRAWING_TYPE_NAMES = new Set(['line', 'label', 'box', 'table', 'linefill', 'polyline', 'chart']);

  /**
   * Returns true if the current token can start a type annotation.
   * We detect non-IDENTIFIER base types (int, float, bool, string, color),
   * qualifiers (const, input, simple, series), and drawing object type names
   * (line, label, box, table) when followed by an identifier.
   */
  private isTypeAnnotationStart(): boolean {
    const t = this.peek().type;
    if (TYPE_QUALIFIERS.has(t) || BASE_TYPE_KWS.has(t)) return true;
    // Check for drawing object type names (these are IDENTIFIER tokens)
    if (t === TokenType.IDENTIFIER && Parser.DRAWING_TYPE_NAMES.has(this.peek().value)) {
      // Only if followed by another identifier (the variable name)
      // Also handle array types: line[] myVar
      const next = this.peekAt(1);
      if (next.type === TokenType.IDENTIFIER) return true;
      if (next.type === TokenType.LBRACKET && this.peekAt(2).type === TokenType.RBRACKET) return true;
    }
    return false;
  }

  private parseTypeAnnotation(): TypeAnnotation {
    let qualifier: TypeAnnotation['qualifier'] = null;

    if (TYPE_QUALIFIERS.has(this.peek().type)) {
      const qualTok = this.advance();
      switch (qualTok.type) {
        case TokenType.CONST:  qualifier = 'const'; break;
        case TokenType.INPUT:  qualifier = 'input'; break;
        case TokenType.SIMPLE: qualifier = 'simple'; break;
        case TokenType.SERIES: qualifier = 'series'; break;
      }
    }

    // Base type
    let baseType: string;
    const cur = this.peek();
    if (BASE_TYPE_KWS.has(cur.type) || cur.type === TokenType.IDENTIFIER) {
      baseType = this.advance().value;
    } else {
      throw new Error(`Expected type name, got ${cur.type}`);
    }

    // Generic: array<float>, map<string, int>, etc.
    const typeArgs: TypeAnnotation[] = [];
    if (this.check(TokenType.LT)) {
      this.advance(); // consume <
      typeArgs.push(this.parseTypeAnnotation());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        typeArgs.push(this.parseTypeAnnotation());
      }
      this.expect(TokenType.GT, 'Expected > after type arguments');
    }

    // Array shorthand: float[], int[], line[], etc. → wrap as array<baseType>
    if (this.check(TokenType.LBRACKET) && this.peekAt(1).type === TokenType.RBRACKET) {
      this.advance(); // consume [
      this.advance(); // consume ]
      return {
        qualifier,
        baseType: 'array',
        typeArgs: [{ qualifier: null, baseType, typeArgs }],
      };
    }

    return { qualifier, baseType, typeArgs };
  }
}
