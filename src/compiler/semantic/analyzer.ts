/**
 * Pine Script v6 Semantic Analyzer
 *
 * Walks the AST produced by the parser and:
 *  - Checks type compatibility in assignments and expressions
 *  - Validates scope (undeclared variables, shadowing)
 *  - Enforces qualifier rules (const / input / simple / series)
 *  - Warns about unused variables
 *  - Validates return types within user-defined functions
 *
 * The analyzer is NON-BLOCKING: it only appends to DiagnosticReporter and
 * never throws.  Compilation continues even when errors are found.
 */

import {
  Program,
  Statement,
  Expression,
  VariableDeclaration,
  FunctionDeclaration,
  IfStatement,
  ForStatement,
  ForInStatement,
  WhileStatement,
  SwitchStatement,
  ReturnStatement,
  AssignmentStatement,
  ExpressionStatement,
  TypeDeclaration,
  MethodDeclaration,
  EnumDeclaration,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  MemberExpression,
  IndexExpression,
  IdentifierExpression,
  LiteralExpression,
  ArrayLiteralExpression,
  ConditionalExpression,
  IfExpression,
  SwitchExpression,
  LambdaExpression,
  TupleExpression,
  GroupExpression,
  TypeAnnotation,
} from '../ast/nodes';
import { DiagnosticReporter } from '../diagnostics/diagnostic';
import { SourceLocation } from '../lexer/token';
import { ScopeManager, makeSymbol } from './scope';
import {
  PineType,
  PineQualifier,
  PineBaseType,
  FLOAT_SERIES,
  INT_SERIES,
  BOOL_SERIES,
  STRING_SERIES,
  COLOR_SERIES,
  NA_TYPE,
  VOID_TYPE,
  UNKNOWN_TYPE,
  makePineType,
  typesCompatible,
  qualifierCompatible,
  widenTypes,
  typeToString,
  baseTypesCompatible,
} from './types';

// ── Built-in variable types ──────────────────────────────────────────────────
const BUILTIN_VARS: Record<string, PineType> = {
  open: FLOAT_SERIES,
  high: FLOAT_SERIES,
  low: FLOAT_SERIES,
  close: FLOAT_SERIES,
  volume: FLOAT_SERIES,
  time: INT_SERIES,
  bar_index: makePineType('int', 'series'),
  last_bar_index: makePineType('int', 'simple'),
  timenow: makePineType('int', 'simple'),
  hl2: FLOAT_SERIES,
  hlc3: FLOAT_SERIES,
  ohlc4: FLOAT_SERIES,
  hlcc4: FLOAT_SERIES,
  na: NA_TYPE,
  true: makePineType('bool', 'const', false),
  false: makePineType('bool', 'const', false),
};

// ── Namespace return types (simplified) ────────────────────────────────────
const NAMESPACE_RETURN_TYPES: Record<string, PineType> = {
  // ta.*
  'ta.sma': FLOAT_SERIES,
  'ta.ema': FLOAT_SERIES,
  'ta.rsi': FLOAT_SERIES,
  'ta.macd': FLOAT_SERIES,
  'ta.bbands': FLOAT_SERIES,
  'ta.atr': FLOAT_SERIES,
  'ta.stoch': FLOAT_SERIES,
  'ta.cross': BOOL_SERIES,
  'ta.crossover': BOOL_SERIES,
  'ta.crossunder': BOOL_SERIES,
  'ta.highest': FLOAT_SERIES,
  'ta.lowest': FLOAT_SERIES,
  'ta.valuewhen': FLOAT_SERIES,
  'ta.barssince': INT_SERIES,
  // math.*
  'math.abs': FLOAT_SERIES,
  'math.ceil': INT_SERIES,
  'math.floor': INT_SERIES,
  'math.round': INT_SERIES,
  'math.sqrt': FLOAT_SERIES,
  'math.log': FLOAT_SERIES,
  'math.log10': FLOAT_SERIES,
  'math.exp': FLOAT_SERIES,
  'math.pow': FLOAT_SERIES,
  'math.max': FLOAT_SERIES,
  'math.min': FLOAT_SERIES,
  'math.sign': INT_SERIES,
  'math.pi': makePineType('float', 'const', false),
  'math.phi': makePineType('float', 'const', false),
  'math.e': makePineType('float', 'const', false),
  // str.*
  'str.tostring': STRING_SERIES,
  'str.tofloat': FLOAT_SERIES,
  'str.toint': INT_SERIES,
  'str.contains': BOOL_SERIES,
  'str.startswith': BOOL_SERIES,
  'str.endswith': BOOL_SERIES,
  'str.length': INT_SERIES,
  'str.lower': STRING_SERIES,
  'str.upper': STRING_SERIES,
  'str.trim': STRING_SERIES,
  'str.replace': STRING_SERIES,
  'str.split': makePineType('array', 'series', true, [STRING_SERIES]),
  'str.format': STRING_SERIES,
  'str.formatTime': STRING_SERIES,
  // input.*
  'input.int': makePineType('int', 'input'),
  'input.float': makePineType('float', 'input'),
  'input.bool': makePineType('bool', 'input'),
  'input.string': makePineType('string', 'input'),
  'input.color': makePineType('color', 'input'),
  'input': makePineType('float', 'input'),
  // array.*
  'array.new_float': makePineType('array', 'series', true, [FLOAT_SERIES]),
  'array.new_int': makePineType('array', 'series', true, [INT_SERIES]),
  'array.new_bool': makePineType('array', 'series', true, [BOOL_SERIES]),
  'array.new_string': makePineType('array', 'series', true, [STRING_SERIES]),
  'array.from': makePineType('array', 'series'),
  'array.size': INT_SERIES,
  'array.get': FLOAT_SERIES,
  'array.set': VOID_TYPE,
  'array.push': VOID_TYPE,
  'array.pop': FLOAT_SERIES,
  'array.shift': FLOAT_SERIES,
  'array.unshift': VOID_TYPE,
  'array.sum': FLOAT_SERIES,
  'array.avg': FLOAT_SERIES,
  'array.max': FLOAT_SERIES,
  'array.min': FLOAT_SERIES,
  'array.sort': VOID_TYPE,
  'array.reverse': VOID_TYPE,
  'array.includes': BOOL_SERIES,
  'array.indexof': INT_SERIES,
  'array.slice': makePineType('array', 'series'),
  'array.join': STRING_SERIES,
  'array.copy': makePineType('array', 'series'),
  'array.clear': VOID_TYPE,
  'array.insert': VOID_TYPE,
  'array.remove': FLOAT_SERIES,
  'array.fill': VOID_TYPE,
  'array.concat': makePipeType('array', 'series'),
  // drawing
  'line.new': makePineType('line', 'series'),
  'label.new': makePineType('label', 'series'),
  'box.new': makePineType('box', 'series'),
  'table.new': makePineType('table', 'series'),
  // request
  'request.security': FLOAT_SERIES,
  // strategy
  'strategy.entry': VOID_TYPE,
  'strategy.close': VOID_TYPE,
  'strategy.exit': VOID_TYPE,
  // timeframe
  'timeframe.inSeconds': INT_SERIES,
  // barstate
  'barstate.islast': makePineType('bool', 'series'),
  'barstate.isfirst': makePineType('bool', 'series'),
  'barstate.isrealtime': makePineType('bool', 'series'),
  'barstate.ishistory': makePineType('bool', 'series'),
  // plot fns (void)
  plot: VOID_TYPE,
  plotshape: VOID_TYPE,
  plotarrow: VOID_TYPE,
  plotcandle: VOID_TYPE,
  plotbar: VOID_TYPE,
  plotchar: VOID_TYPE,
  fill: VOID_TYPE,
  bgcolor: VOID_TYPE,
  barcolor: VOID_TYPE,
  hline: VOID_TYPE,
  indicator: VOID_TYPE,
  strategy: VOID_TYPE,
  library: VOID_TYPE,
};

// Helper to handle typo in the lookup table above
function makePipeType(base: PineBaseType, qualifier: PineQualifier, nullable = true): PineType {
  return makePineType(base, qualifier, nullable);
}

// ── Operator result types ───────────────────────────────────────────────────
function binaryResultType(op: string, leftType: PineType, rightType: PineType): PineType {
  const qual: PineQualifier =
    leftType.qualifier === 'series' || rightType.qualifier === 'series'
      ? 'series'
      : leftType.qualifier === 'simple' || rightType.qualifier === 'simple'
      ? 'simple'
      : leftType.qualifier === 'input' || rightType.qualifier === 'input'
      ? 'input'
      : 'const';

  switch (op) {
    case '+':
    case '-':
    case '*':
    case '/':
    case '%':
      if (leftType.base === 'string' || rightType.base === 'string') {
        return makePineType('string', qual);
      }
      if (leftType.base === 'float' || rightType.base === 'float') {
        return makePineType('float', qual);
      }
      return makePineType('int', qual);
    case '==':
    case '!=':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return makePineType('bool', qual);
    case 'and':
    case 'or':
      return makePineType('bool', qual);
    default:
      return UNKNOWN_TYPE;
  }
}

// ── Convert TypeAnnotation → PineType ───────────────────────────────────────
function annotationToType(ann: TypeAnnotation): PineType {
  const qualifier = (ann.qualifier ?? 'series') as PineQualifier;
  const base = mapBaseType(ann.baseType);
  const typeArgs = ann.typeArgs?.map(annotationToType);
  return { qualifier, base, nullable: true, typeArgs, udtName: base === 'udt' ? ann.baseType : undefined };
}

function mapBaseType(name: string): PineBaseType {
  switch (name) {
    case 'int': return 'int';
    case 'float': return 'float';
    case 'bool': return 'bool';
    case 'string': return 'string';
    case 'color': return 'color';
    case 'void': return 'void';
    case 'na': return 'na';
    case 'line': return 'line';
    case 'label': return 'label';
    case 'box': return 'box';
    case 'table': return 'table';
    case 'array': return 'array';
    case 'map': return 'map';
    case 'matrix': return 'matrix';
    default: return 'udt';
  }
}

// ── Main Analyzer Class ──────────────────────────────────────────────────────
export class SemanticAnalyzer {
  private reporter: DiagnosticReporter;
  private scopes: ScopeManager;
  /** Stack of expected return types for nested function declarations */
  private returnTypeStack: (PineType | null)[] = [];
  /** Names of UDTs declared in the script */
  private udtNames: Set<string> = new Set();

  constructor(reporter: DiagnosticReporter) {
    this.reporter = reporter;
    this.scopes = new ScopeManager();
  }

  analyze(program: Program): void {
    this.registerBuiltins();

    // First pass: register top-level function and type declarations for
    // forward-reference support
    for (const stmt of program.body) {
      if (stmt.kind === 'FunctionDeclaration') {
        this.scopes.declareBuiltin(stmt.name, makePineType('unknown', 'series'));
      } else if (stmt.kind === 'TypeDeclaration') {
        this.udtNames.add(stmt.name);
        this.scopes.declareBuiltin(stmt.name, makePineType('udt', 'const', false));
      } else if (stmt.kind === 'EnumDeclaration') {
        this.scopes.declareBuiltin(stmt.name, makePineType('unknown', 'const', false));
      }
    }

    for (const stmt of program.body) {
      this.analyzeStatement(stmt);
    }

    // Warn about unused user variables at top level
    this.checkUnusedVariables();
  }

  // ── Statements ─────────────────────────────────────────────────────────────

  private analyzeStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case 'VariableDeclaration':
        this.analyzeVarDecl(stmt);
        break;
      case 'FunctionDeclaration':
        this.analyzeFuncDecl(stmt);
        break;
      case 'MethodDeclaration':
        this.analyzeMethodDecl(stmt);
        break;
      case 'TypeDeclaration':
        this.analyzeTypeDecl(stmt);
        break;
      case 'EnumDeclaration':
        this.analyzeEnumDecl(stmt);
        break;
      case 'IfStatement':
        this.analyzeIfStmt(stmt);
        break;
      case 'ForStatement':
        this.analyzeForStmt(stmt);
        break;
      case 'ForInStatement':
        this.analyzeForInStmt(stmt);
        break;
      case 'WhileStatement':
        this.analyzeWhileStmt(stmt);
        break;
      case 'SwitchStatement':
        this.analyzeSwitchStmt(stmt);
        break;
      case 'ReturnStatement':
        this.analyzeReturnStmt(stmt);
        break;
      case 'AssignmentStatement':
        this.analyzeAssignStmt(stmt);
        break;
      case 'ExpressionStatement':
        this.analyzeExprStmt(stmt);
        break;
      case 'ImportStatement':
      case 'ExportStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
        break; // nothing to check
    }
  }

  private analyzeVarDecl(decl: VariableDeclaration): void {
    const valueType = this.inferType(decl.value);

    // Resolve declared type from annotation if present
    let declaredType: PineType;
    if (decl.typeAnnotation) {
      declaredType = annotationToType(decl.typeAnnotation);
      if (!typesCompatible(valueType, declaredType)) {
        this.reporter.warning(
          `Type mismatch: cannot assign '${typeToString(valueType)}' to '${typeToString(declaredType)}'`,
          decl.loc,
        );
      }
    } else {
      declaredType = valueType;
    }

    // const requires compile-time constant value
    if (decl.typeAnnotation?.qualifier === 'const' && valueType.qualifier !== 'const') {
      this.reporter.error(
        `'const' variable '${decl.name}' must be initialized with a compile-time constant`,
        decl.loc,
      );
    }

    const mutable = decl.modifier !== null || decl.typeAnnotation?.qualifier !== 'const';

    if (decl.isTupleDestructure && decl.tupleNames) {
      // Declare each element of the tuple
      for (const name of decl.tupleNames) {
        this.declareVar(name, UNKNOWN_TYPE, decl.loc, { mutable });
      }
    } else {
      this.declareVar(decl.name, declaredType, decl.loc, { mutable });
    }
  }

  private analyzeFuncDecl(decl: FunctionDeclaration): void {
    const returnType = decl.returnType ? annotationToType(decl.returnType) : null;

    this.scopes.push();
    this.returnTypeStack.push(returnType);

    for (const param of decl.params) {
      const paramType = param.typeAnnotation
        ? annotationToType(param.typeAnnotation)
        : UNKNOWN_TYPE;
      this.declareVar(param.name, paramType, decl.loc, { mutable: false });
    }

    if (Array.isArray(decl.body)) {
      for (const stmt of decl.body) {
        this.analyzeStatement(stmt);
      }
    } else {
      this.inferType(decl.body);
    }

    // Check unused locals in function scope
    this.checkUnusedVariables();
    this.returnTypeStack.pop();
    this.scopes.pop();
  }

  private analyzeMethodDecl(decl: MethodDeclaration): void {
    this.scopes.push();
    this.returnTypeStack.push(decl.returnType ? annotationToType(decl.returnType) : null);

    // 'this' parameter
    const thisType = makePineType('udt', 'series', true);
    thisType.udtName = decl.thisType;
    this.declareVar('this', thisType, decl.loc, { mutable: false });

    for (const param of decl.params) {
      const paramType = param.typeAnnotation
        ? annotationToType(param.typeAnnotation)
        : UNKNOWN_TYPE;
      this.declareVar(param.name, paramType, decl.loc, { mutable: false });
    }

    if (Array.isArray(decl.body)) {
      for (const stmt of decl.body) {
        this.analyzeStatement(stmt);
      }
    } else {
      this.inferType(decl.body);
    }

    this.checkUnusedVariables();
    this.returnTypeStack.pop();
    this.scopes.pop();
  }

  private analyzeTypeDecl(decl: TypeDeclaration): void {
    this.udtNames.add(decl.name);
  }

  private analyzeEnumDecl(_decl: EnumDeclaration): void {
    // Nothing to check semantically — codegen handles enum constant mapping
  }

  private analyzeIfStmt(stmt: IfStatement): void {
    const condType = this.inferType(stmt.condition);
    if (!baseTypesCompatible(condType.base, 'bool') && condType.base !== 'unknown') {
      this.reporter.warning(
        `Condition should be bool, got '${typeToString(condType)}'`,
        stmt.condition.loc,
      );
    }

    this.scopes.push();
    for (const s of stmt.thenBlock) this.analyzeStatement(s);
    this.scopes.pop();

    if (stmt.elseBlock) {
      this.scopes.push();
      if (Array.isArray(stmt.elseBlock)) {
        for (const s of stmt.elseBlock) this.analyzeStatement(s);
      } else {
        this.analyzeStatement(stmt.elseBlock);
      }
      this.scopes.pop();
    }
  }

  private analyzeForStmt(stmt: ForStatement): void {
    this.inferType(stmt.start);
    this.inferType(stmt.end);
    if (stmt.step) this.inferType(stmt.step);

    this.scopes.push();
    this.declareVar(stmt.variable, INT_SERIES, stmt.loc, { mutable: false });
    for (const s of stmt.body) this.analyzeStatement(s);
    this.scopes.pop();
  }

  private analyzeForInStmt(stmt: ForInStatement): void {
    const iterType = this.inferType(stmt.iterable);

    this.scopes.push();
    // Declare loop variable — element type if array, else unknown
    const elemType =
      iterType.base === 'array' && iterType.typeArgs?.[0]
        ? iterType.typeArgs[0]
        : UNKNOWN_TYPE;
    this.declareVar(stmt.variable, elemType, stmt.loc, { mutable: false });
    if (stmt.indexVariable) {
      this.declareVar(stmt.indexVariable, INT_SERIES, stmt.loc, { mutable: false });
    }
    for (const s of stmt.body) this.analyzeStatement(s);
    this.scopes.pop();
  }

  private analyzeWhileStmt(stmt: WhileStatement): void {
    this.inferType(stmt.condition);
    this.scopes.push();
    for (const s of stmt.body) this.analyzeStatement(s);
    this.scopes.pop();
  }

  private analyzeSwitchStmt(stmt: SwitchStatement): void {
    if (stmt.discriminant) this.inferType(stmt.discriminant);
    for (const c of stmt.cases) {
      for (const v of c.values) this.inferType(v);
      this.scopes.push();
      for (const s of c.body) this.analyzeStatement(s);
      this.scopes.pop();
    }
    if (stmt.defaultCase) {
      this.scopes.push();
      for (const s of stmt.defaultCase) this.analyzeStatement(s);
      this.scopes.pop();
    }
  }

  private analyzeReturnStmt(stmt: ReturnStatement): void {
    const expected = this.returnTypeStack[this.returnTypeStack.length - 1];
    if (!stmt.value) return;
    const actual = this.inferType(stmt.value);
    if (expected && !typesCompatible(actual, expected)) {
      this.reporter.warning(
        `Return type mismatch: expected '${typeToString(expected)}', got '${typeToString(actual)}'`,
        stmt.loc,
      );
    }
  }

  private analyzeAssignStmt(stmt: AssignmentStatement): void {
    const valueType = this.inferType(stmt.value);

    if (stmt.operator === '=') {
      // Initial assignment — this DECLARES the variable in Pine Script.
      // Declare it, then mark it "used" to avoid false unused warnings
      // if the value expression references it.
      if (stmt.target.kind === 'IdentifierExpression') {
        const name = stmt.target.name;
        // Detect if value is an input call → mark as input
        const isInput = this.isInputCall(stmt.value);
        this.declareVar(name, valueType, stmt.loc, { mutable: true, isInput });
        // Don't re-infer the target (it was just declared, inferType would error)
        return;
      }
      // Non-identifier target (e.g. array index) — just check types
      const targetType = this.inferType(stmt.target);
      if (
        targetType.base !== 'unknown' &&
        valueType.base !== 'unknown' &&
        !typesCompatible(valueType, targetType)
      ) {
        this.reporter.warning(
          `Assignment type mismatch: target is '${typeToString(targetType)}', value is '${typeToString(valueType)}'`,
          stmt.loc,
        );
      }
      return;
    }

    // Compound or reassign operators (:=, +=, -=, etc.)
    if (stmt.target.kind === 'IdentifierExpression') {
      const name = stmt.target.name;
      const sym = this.scopes.lookup(name);

      if (!sym) {
        this.reporter.error(`Undeclared variable '${name}'`, stmt.target.loc);
        return;
      }

      this.scopes.markUsed(name);

      if (stmt.operator === ':=') {
        if (!sym.mutable && !sym.builtin) {
          this.reporter.error(
            `Cannot reassign immutable variable '${name}'`,
            stmt.loc,
          );
        }
        if (sym.isInput) {
          this.reporter.error(
            `Cannot reassign input variable '${name}'`,
            stmt.loc,
          );
        }
      }

      // Type compatibility
      if (
        sym.type.base !== 'unknown' &&
        valueType.base !== 'unknown' &&
        !typesCompatible(valueType, sym.type)
      ) {
        this.reporter.warning(
          `Assignment type mismatch: target is '${typeToString(sym.type)}', value is '${typeToString(valueType)}'`,
          stmt.loc,
        );
      }
    } else {
      // Non-identifier target
      const targetType = this.inferType(stmt.target);
      if (
        targetType.base !== 'unknown' &&
        valueType.base !== 'unknown' &&
        !typesCompatible(valueType, targetType)
      ) {
        this.reporter.warning(
          `Assignment type mismatch: target is '${typeToString(targetType)}', value is '${typeToString(valueType)}'`,
          stmt.loc,
        );
      }
    }
  }

  /** Returns true if the expression is a call to an input.* function */
  private isInputCall(expr: Expression): boolean {
    if (expr.kind !== 'CallExpression') return false;
    const name = this.resolveCalleeName(expr.callee);
    if (!name) return false;
    return name === 'input' || name.startsWith('input.');
  }

  private analyzeExprStmt(stmt: ExpressionStatement): void {
    this.inferType(stmt.expression);
  }

  // ── Expression type inference ───────────────────────────────────────────────

  private inferType(expr: Expression): PineType {
    switch (expr.kind) {
      case 'LiteralExpression':
        return this.inferLiteral(expr);
      case 'IdentifierExpression':
        return this.inferIdentifier(expr);
      case 'BinaryExpression':
        return this.inferBinary(expr);
      case 'UnaryExpression':
        return this.inferUnary(expr);
      case 'CallExpression':
        return this.inferCall(expr);
      case 'MemberExpression':
        return this.inferMember(expr);
      case 'IndexExpression':
        return this.inferIndex(expr);
      case 'ConditionalExpression':
        return this.inferConditional(expr);
      case 'IfExpression':
        return this.inferIfExpr(expr);
      case 'SwitchExpression':
        return this.inferSwitchExpr(expr);
      case 'ArrayLiteralExpression':
        return this.inferArrayLiteral(expr);
      case 'TupleExpression':
        return this.inferTuple(expr);
      case 'LambdaExpression':
        return this.inferLambda(expr);
      case 'GroupExpression':
        return this.inferType(expr.expression);
      default:
        return UNKNOWN_TYPE;
    }
  }

  private inferLiteral(expr: LiteralExpression): PineType {
    switch (expr.valueType) {
      case 'int': return makePineType('int', 'const', false);
      case 'float': return makePineType('float', 'const', false);
      case 'string': return makePineType('string', 'const', false);
      case 'bool': return makePineType('bool', 'const', false);
      case 'color': return makePineType('color', 'const', false);
      case 'na': return NA_TYPE;
      default: return UNKNOWN_TYPE;
    }
  }

  private inferIdentifier(expr: IdentifierExpression): PineType {
    const sym = this.scopes.lookup(expr.name);
    if (!sym) {
      // Only report if it doesn't look like a namespace identifier
      if (!this.isKnownNamespace(expr.name)) {
        this.reporter.error(
          `Undeclared variable '${expr.name}'`,
          expr.loc,
        );
      }
      return UNKNOWN_TYPE;
    }
    this.scopes.markUsed(expr.name);
    return sym.type;
  }

  private inferBinary(expr: BinaryExpression): PineType {
    const left = this.inferType(expr.left);
    const right = this.inferType(expr.right);
    return binaryResultType(expr.operator, left, right);
  }

  private inferUnary(expr: UnaryExpression): PineType {
    const operand = this.inferType(expr.operand);
    if (expr.operator === 'not') return makePineType('bool', operand.qualifier);
    if (expr.operator === '-' || expr.operator === '+') return operand;
    return UNKNOWN_TYPE;
  }

  private inferCall(expr: CallExpression): PineType {
    // Evaluate all args regardless
    for (const arg of expr.args) {
      this.inferType(arg.value);
    }

    // Resolve callee name
    const calleeName = this.resolveCalleeName(expr.callee);
    if (calleeName) {
      // Check if it's a known namespace function
      const rt = NAMESPACE_RETURN_TYPES[calleeName];
      if (rt) return rt;

      // Check if it's a user-defined function
      const sym = this.scopes.lookup(calleeName);
      if (sym) {
        this.scopes.markUsed(calleeName);
        return sym.type;
      }

      // input() shorthand
      if (calleeName === 'input') return makePineType('float', 'input');
    }

    return UNKNOWN_TYPE;
  }

  private inferMember(expr: MemberExpression): PineType {
    this.inferType(expr.object);
    // Try to resolve namespace.member
    const objName = expr.object.kind === 'IdentifierExpression' ? expr.object.name : null;
    if (objName) {
      const key = `${objName}.${expr.property}`;
      const rt = NAMESPACE_RETURN_TYPES[key];
      if (rt) return rt;
    }
    return UNKNOWN_TYPE;
  }

  private inferIndex(expr: IndexExpression): PineType {
    const objType = this.inferType(expr.object);
    this.inferType(expr.index);
    // array[n] -> element type
    if (objType.base === 'array' && objType.typeArgs?.[0]) {
      return objType.typeArgs[0];
    }
    // series history access myVar[n]
    return FLOAT_SERIES;
  }

  private inferConditional(expr: ConditionalExpression): PineType {
    this.inferType(expr.condition);
    const thenType = this.inferType(expr.consequent);
    const elseType = this.inferType(expr.alternate);
    return widenTypes(thenType, elseType);
  }

  private inferIfExpr(expr: IfExpression): PineType {
    this.inferType(expr.condition);
    const thenType = this.inferType(expr.thenBranch);
    const elseType = expr.elseBranch ? this.inferType(expr.elseBranch) : NA_TYPE;
    return widenTypes(thenType, elseType);
  }

  private inferSwitchExpr(expr: SwitchExpression): PineType {
    if (expr.discriminant) this.inferType(expr.discriminant);
    const types: PineType[] = [];
    for (const c of expr.cases) {
      for (const v of c.values) this.inferType(v);
      types.push(this.inferType(c.body));
    }
    if (expr.defaultCase) types.push(this.inferType(expr.defaultCase));
    return types.reduce(widenTypes, NA_TYPE);
  }

  private inferArrayLiteral(expr: ArrayLiteralExpression): PineType {
    const elemTypes = expr.elements.map(e => this.inferType(e));
    const elemType = elemTypes.reduce(widenTypes, NA_TYPE);
    return makePineType('array', 'series', true, [elemType]);
  }

  private inferTuple(_expr: TupleExpression): PineType {
    return UNKNOWN_TYPE; // tuples don't have a single type
  }

  private inferLambda(expr: LambdaExpression): PineType {
    this.scopes.push();
    for (const p of expr.params) {
      const pt = p.typeAnnotation ? annotationToType(p.typeAnnotation) : UNKNOWN_TYPE;
      this.declareVar(p.name, pt, expr.loc, { mutable: false });
    }
    const rt = this.inferType(expr.body);
    this.scopes.pop();
    return rt;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private resolveCalleeName(callee: Expression): string | null {
    if (callee.kind === 'IdentifierExpression') return callee.name;
    if (callee.kind === 'MemberExpression') {
      const obj = this.resolveCalleeName(callee.object);
      if (obj) return `${obj}.${callee.property}`;
    }
    return null;
  }

  private isKnownNamespace(name: string): boolean {
    return [
      'ta', 'math', 'str', 'array', 'matrix', 'map',
      'color', 'syminfo', 'timeframe', 'barstate',
      'strategy', 'request', 'line', 'label', 'box', 'table',
      'input', 'alert', 'runtime',
    ].includes(name);
  }

  private declareVar(
    name: string,
    type: PineType,
    loc: SourceLocation,
    options: { mutable?: boolean; isInput?: boolean } = {},
  ): void {
    const sym = makeSymbol(name, type, loc, {
      mutable: options.mutable ?? true,
      isInput: options.isInput ?? false,
    });
    const ok = this.scopes.declare(sym);
    if (!ok) {
      // Redeclaration — not necessarily an error in Pine (e.g. var redeclaration is allowed)
      // Just update the type
      this.scopes.update(name, type);
    }
  }

  private checkUnusedVariables(): void {
    for (const sym of this.scopes.ownSymbols()) {
      if (!sym.used && !sym.builtin && sym.mutable) {
        this.reporter.warning(
          `Variable '${sym.name}' is declared but never used`,
          sym.loc,
        );
      }
    }
  }

  private registerBuiltins(): void {
    for (const [name, type] of Object.entries(BUILTIN_VARS)) {
      this.scopes.declareBuiltin(name, type);
    }
    // Register namespace identifiers so they don't trigger "undeclared"
    for (const ns of [
      'ta', 'math', 'str', 'array', 'matrix', 'map',
      'color', 'syminfo', 'timeframe', 'barstate',
      'strategy', 'request', 'line', 'label', 'box', 'table',
      'input', 'alert', 'runtime',
    ]) {
      this.scopes.declareBuiltin(ns, UNKNOWN_TYPE);
    }
    // Built-in functions that appear as identifiers
    for (const fn of ['plot', 'plotshape', 'plotarrow', 'plotcandle', 'plotbar', 'plotchar',
                       'fill', 'bgcolor', 'barcolor', 'hline', 'indicator', 'strategy',
                       'library', 'na', 'nz', 'fixnan', 'not', 'and', 'or']) {
      if (!this.scopes.lookup(fn)) {
        this.scopes.declareBuiltin(fn, VOID_TYPE);
      }
    }
  }
}

/**
 * Convenience function: run semantic analysis on a parsed AST.
 * Returns the reporter so callers can inspect diagnostics.
 */
export function analyze(program: Program, reporter: DiagnosticReporter): void {
  const analyzer = new SemanticAnalyzer(reporter);
  analyzer.analyze(program);
}
