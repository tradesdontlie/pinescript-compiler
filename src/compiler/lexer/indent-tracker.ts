import { Token, TokenType, SourceLocation } from './token';

export class IndentTracker {
  private stack: number[] = [0];

  /**
   * Given the indentation level at the start of a new non-blank line,
   * return any INDENT or DEDENT tokens that should be emitted.
   */
  process(indentLevel: number, loc: SourceLocation): Token[] {
    const tokens: Token[] = [];
    const current = this.stack[this.stack.length - 1];

    if (indentLevel > current) {
      this.stack.push(indentLevel);
      tokens.push({ type: TokenType.INDENT, value: '', loc });
    } else if (indentLevel < current) {
      while (this.stack.length > 1 && this.stack[this.stack.length - 1] > indentLevel) {
        this.stack.pop();
        tokens.push({ type: TokenType.DEDENT, value: '', loc });
      }
    }

    return tokens;
  }

  /**
   * At EOF, emit DEDENTs for all remaining open indent levels.
   */
  finalize(loc: SourceLocation): Token[] {
    const tokens: Token[] = [];
    while (this.stack.length > 1) {
      this.stack.pop();
      tokens.push({ type: TokenType.DEDENT, value: '', loc });
    }
    return tokens;
  }

  currentLevel(): number {
    return this.stack[this.stack.length - 1];
  }
}
