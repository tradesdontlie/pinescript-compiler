import { TokenType } from '../lexer/token';

// Precedence levels (higher = tighter binding)
export const enum Precedence {
  NONE       = 0,
  TERNARY    = 1,  // ?:  right-assoc
  OR         = 2,  // or
  AND        = 3,  // and
  EQUALITY   = 5,  // == !=
  COMPARISON = 6,  // < <= > >=
  TERM       = 7,  // + -
  FACTOR     = 8,  // * / %
  // Level 4 (NOT) and Level 9 (unary -/+) are prefix, handled in parsePrimary/parseUnary
  // Level 10 ([] . ()) are postfix, handled in parsePostfix
}

export type Associativity = 'left' | 'right';

export interface OperatorInfo {
  precedence: Precedence;
  associativity: Associativity;
}

// Map from TokenType to infix operator info
export const INFIX_OPERATORS: Partial<Record<TokenType, OperatorInfo>> = {
  [TokenType.QUESTION]:  { precedence: Precedence.TERNARY,    associativity: 'right' },
  [TokenType.OR]:        { precedence: Precedence.OR,          associativity: 'left'  },
  [TokenType.AND]:       { precedence: Precedence.AND,         associativity: 'left'  },
  [TokenType.EQ]:        { precedence: Precedence.EQUALITY,    associativity: 'left'  },
  [TokenType.NEQ]:       { precedence: Precedence.EQUALITY,    associativity: 'left'  },
  [TokenType.LT]:        { precedence: Precedence.COMPARISON,  associativity: 'left'  },
  [TokenType.LTE]:       { precedence: Precedence.COMPARISON,  associativity: 'left'  },
  [TokenType.GT]:        { precedence: Precedence.COMPARISON,  associativity: 'left'  },
  [TokenType.GTE]:       { precedence: Precedence.COMPARISON,  associativity: 'left'  },
  [TokenType.PLUS]:      { precedence: Precedence.TERM,        associativity: 'left'  },
  [TokenType.MINUS]:     { precedence: Precedence.TERM,        associativity: 'left'  },
  [TokenType.STAR]:      { precedence: Precedence.FACTOR,      associativity: 'left'  },
  [TokenType.SLASH]:     { precedence: Precedence.FACTOR,      associativity: 'left'  },
  [TokenType.PERCENT]:   { precedence: Precedence.FACTOR,      associativity: 'left'  },
};

export function getInfixInfo(type: TokenType): OperatorInfo | null {
  return INFIX_OPERATORS[type] ?? null;
}
