import { SourceLocation } from '../lexer/token';

// ===== Base =====
export interface BaseNode {
  kind: string;
  loc: SourceLocation;
}

// ===== Program =====
export interface Program extends BaseNode {
  kind: 'Program';
  body: Statement[];
}

// ===== Statements =====
export type Statement =
  | VariableDeclaration
  | FunctionDeclaration
  | TypeDeclaration
  | MethodDeclaration
  | EnumDeclaration
  | ImportStatement
  | ExportStatement
  | IfStatement
  | ForStatement
  | ForInStatement
  | WhileStatement
  | SwitchStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ExpressionStatement
  | AssignmentStatement;

export interface VariableDeclaration extends BaseNode {
  kind: 'VariableDeclaration';
  modifier: 'var' | 'varip' | null;
  typeAnnotation: TypeAnnotation | null;
  name: string;
  value: Expression;
  isTupleDestructure: boolean;
  tupleNames: string[] | null;
}

export interface FunctionDeclaration extends BaseNode {
  kind: 'FunctionDeclaration';
  name: string;
  params: FunctionParam[];
  returnType: TypeAnnotation | null;
  body: Statement[] | Expression;
}

export interface FunctionParam {
  name: string;
  typeAnnotation: TypeAnnotation | null;
  defaultValue: Expression | null;
}

export interface TypeDeclaration extends BaseNode {
  kind: 'TypeDeclaration';
  name: string;
  fields: TypeField[];
}

export interface TypeField {
  name: string;
  typeAnnotation: TypeAnnotation;
  defaultValue: Expression | null;
}

export interface MethodDeclaration extends BaseNode {
  kind: 'MethodDeclaration';
  name: string;
  thisType: string;
  params: FunctionParam[];
  returnType: TypeAnnotation | null;
  body: Statement[] | Expression;
}

export interface EnumDeclaration extends BaseNode {
  kind: 'EnumDeclaration';
  name: string;
  members: string[];
}

export interface ImportStatement extends BaseNode {
  kind: 'ImportStatement';
  source: string;
  alias: string;
  version: number | null;
}

export interface ExportStatement extends BaseNode {
  kind: 'ExportStatement';
  declaration: FunctionDeclaration | TypeDeclaration | VariableDeclaration;
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Expression;
  thenBlock: Statement[];
  elseBlock: Statement[] | IfStatement | null;
}

export interface ForStatement extends BaseNode {
  kind: 'ForStatement';
  variable: string;
  start: Expression;
  end: Expression;
  step: Expression | null;
  body: Statement[];
}

export interface ForInStatement extends BaseNode {
  kind: 'ForInStatement';
  variable: string;
  iterable: Expression;
  body: Statement[];
}

export interface WhileStatement extends BaseNode {
  kind: 'WhileStatement';
  condition: Expression;
  body: Statement[];
}

export interface SwitchStatement extends BaseNode {
  kind: 'SwitchStatement';
  discriminant: Expression | null;
  cases: SwitchCase[];
  defaultCase: Statement[] | null;
}

export interface SwitchCase {
  values: Expression[];
  body: Statement[];
}

export interface ReturnStatement extends BaseNode {
  kind: 'ReturnStatement';
  value: Expression | null;
}

export interface BreakStatement extends BaseNode {
  kind: 'BreakStatement';
}

export interface ContinueStatement extends BaseNode {
  kind: 'ContinueStatement';
}

export interface ExpressionStatement extends BaseNode {
  kind: 'ExpressionStatement';
  expression: Expression;
}

export interface AssignmentStatement extends BaseNode {
  kind: 'AssignmentStatement';
  target: Expression;
  operator: '=' | ':=' | '+=' | '-=' | '*=' | '/=' | '%=';
  value: Expression;
}

// ===== Expressions =====
export type Expression =
  | BinaryExpression
  | UnaryExpression
  | ConditionalExpression
  | CallExpression
  | MemberExpression
  | IndexExpression
  | IdentifierExpression
  | LiteralExpression
  | ArrayLiteralExpression
  | LambdaExpression
  | GroupExpression
  | TupleExpression
  | IfExpression
  | SwitchExpression;

export interface BinaryExpression extends BaseNode {
  kind: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  kind: 'UnaryExpression';
  operator: string;
  operand: Expression;
  prefix: boolean;
}

export interface ConditionalExpression extends BaseNode {
  kind: 'ConditionalExpression';
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface CallExpression extends BaseNode {
  kind: 'CallExpression';
  callee: Expression;
  args: CallArgument[];
}

export interface CallArgument {
  name: string | null;
  value: Expression;
}

export interface MemberExpression extends BaseNode {
  kind: 'MemberExpression';
  object: Expression;
  property: string;
}

export interface IndexExpression extends BaseNode {
  kind: 'IndexExpression';
  object: Expression;
  index: Expression;
}

export interface IdentifierExpression extends BaseNode {
  kind: 'IdentifierExpression';
  name: string;
}

export interface LiteralExpression extends BaseNode {
  kind: 'LiteralExpression';
  valueType: 'int' | 'float' | 'string' | 'bool' | 'color' | 'na';
  value: number | string | boolean | null;
}

export interface ArrayLiteralExpression extends BaseNode {
  kind: 'ArrayLiteralExpression';
  elements: Expression[];
}

export interface LambdaExpression extends BaseNode {
  kind: 'LambdaExpression';
  params: FunctionParam[];
  body: Expression;
}

export interface GroupExpression extends BaseNode {
  kind: 'GroupExpression';
  expression: Expression;
}

export interface TupleExpression extends BaseNode {
  kind: 'TupleExpression';
  elements: Expression[];
}

export interface IfExpression extends BaseNode {
  kind: 'IfExpression';
  condition: Expression;
  thenBranch: Expression;
  elseBranch: Expression | null;
}

export interface SwitchExpression extends BaseNode {
  kind: 'SwitchExpression';
  discriminant: Expression | null;
  cases: SwitchExprCase[];
  defaultCase: Expression | null;
}

export interface SwitchExprCase {
  values: Expression[];
  body: Expression;
}

// ===== Type Annotations =====
export interface TypeAnnotation {
  qualifier: 'const' | 'input' | 'simple' | 'series' | null;
  baseType: string;
  typeArgs: TypeAnnotation[];
}
