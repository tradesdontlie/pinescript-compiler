export enum TokenType {
  // Literals
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  BOOL = 'BOOL',
  COLOR = 'COLOR',
  NA = 'NA',

  // Identifiers
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  VAR = 'VAR',
  VARIP = 'VARIP',
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  TO = 'TO',
  BY = 'BY',
  IN = 'IN',
  WHILE = 'WHILE',
  SWITCH = 'SWITCH',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  RETURN = 'RETURN',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  AS = 'AS',
  TYPE = 'TYPE',
  METHOD = 'METHOD',
  ENUM = 'ENUM',
  NOT = 'NOT',
  AND = 'AND',
  OR = 'OR',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Type keywords
  INT = 'INT',
  FLOAT_TYPE = 'FLOAT_TYPE',
  BOOL_TYPE = 'BOOL_TYPE',
  STRING_TYPE = 'STRING_TYPE',
  COLOR_TYPE = 'COLOR_TYPE',
  SERIES = 'SERIES',
  SIMPLE = 'SIMPLE',
  CONST = 'CONST',
  INPUT = 'INPUT',

  // Operators
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  STAR = 'STAR',           // *
  SLASH = 'SLASH',         // /
  PERCENT = 'PERCENT',     // %
  EQ = 'EQ',               // ==
  NEQ = 'NEQ',             // !=
  LT = 'LT',              // <
  LTE = 'LTE',            // <=
  GT = 'GT',               // >
  GTE = 'GTE',            // >=

  // Assignment
  ASSIGN = 'ASSIGN',       // =
  REASSIGN = 'REASSIGN',   // :=
  PLUS_ASSIGN = 'PLUS_ASSIGN',     // +=
  MINUS_ASSIGN = 'MINUS_ASSIGN',   // -=
  STAR_ASSIGN = 'STAR_ASSIGN',     // *=
  SLASH_ASSIGN = 'SLASH_ASSIGN',   // /=
  PERCENT_ASSIGN = 'PERCENT_ASSIGN', // %=

  // Delimiters
  QUESTION = 'QUESTION',   // ?
  COLON = 'COLON',         // :
  ARROW = 'ARROW',         // =>
  THIN_ARROW = 'THIN_ARROW', // ->
  LBRACKET = 'LBRACKET',   // [
  RBRACKET = 'RBRACKET',   // ]
  LPAREN = 'LPAREN',       // (
  RPAREN = 'RPAREN',       // )
  COMMA = 'COMMA',         // ,
  DOT = 'DOT',             // .

  // Structural
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  ANNOTATION = 'ANNOTATION', // //@version, //@description, etc.
  COMMENT = 'COMMENT',       // // single-line comments
  EOF = 'EOF',
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

export const KEYWORDS: Record<string, TokenType> = {
  'var': TokenType.VAR,
  'varip': TokenType.VARIP,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'for': TokenType.FOR,
  'to': TokenType.TO,
  'by': TokenType.BY,
  'in': TokenType.IN,
  'while': TokenType.WHILE,
  'switch': TokenType.SWITCH,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'return': TokenType.RETURN,
  'import': TokenType.IMPORT,
  'export': TokenType.EXPORT,
  'as': TokenType.AS,
  'type': TokenType.TYPE,
  'method': TokenType.METHOD,
  'enum': TokenType.ENUM,
  'not': TokenType.NOT,
  'and': TokenType.AND,
  'or': TokenType.OR,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'na': TokenType.NA,
  'int': TokenType.INT,
  'float': TokenType.FLOAT_TYPE,
  'bool': TokenType.BOOL_TYPE,
  'string': TokenType.STRING_TYPE,
  'color': TokenType.COLOR_TYPE,
  'series': TokenType.SERIES,
  'simple': TokenType.SIMPLE,
  'const': TokenType.CONST,
  'input': TokenType.INPUT,
};
