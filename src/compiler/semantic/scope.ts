import { PineType, UNKNOWN_TYPE } from './types';
import { SourceLocation } from '../lexer/token';

export interface SymbolInfo {
  name: string;
  type: PineType;
  /** true for `var`/`varip`/normal mutable, false for `const` inputs */
  mutable: boolean;
  /** Whether this symbol has been read at least once */
  used: boolean;
  loc: SourceLocation;
  /** true for built-in symbols (never warn as unused) */
  builtin: boolean;
  /** true if this is an input variable — cannot be reassigned */
  isInput: boolean;
}

/**
 * Single lexical scope frame.  Pine Script uses function-level scoping
 * (variables declared inside if/for/while ARE visible outside those blocks
 * within the same function), but we still layer scopes for correctness —
 * a lookup that finds nothing in the current frame bubbles up to parent.
 */
export class Scope {
  private symbols: Map<string, SymbolInfo> = new Map();
  readonly parent: Scope | null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  /** Declare a symbol in this scope. Returns false if already declared here. */
  declare(info: SymbolInfo): boolean {
    if (this.symbols.has(info.name)) return false;
    this.symbols.set(info.name, info);
    return true;
  }

  /** Look up a symbol, walking parent chain. Returns undefined if not found. */
  lookup(name: string): SymbolInfo | undefined {
    const sym = this.symbols.get(name);
    if (sym !== undefined) return sym;
    return this.parent?.lookup(name);
  }

  /** Mark a symbol as used (walks parent chain). */
  markUsed(name: string): void {
    const sym = this.symbols.get(name);
    if (sym) {
      sym.used = true;
      return;
    }
    this.parent?.markUsed(name);
  }

  /** Get all symbols declared directly in this scope (not parents). */
  ownSymbols(): SymbolInfo[] {
    return [...this.symbols.values()];
  }
}

/**
 * Manages a stack of scopes throughout analysis.
 */
export class ScopeManager {
  private stack: Scope[] = [];

  constructor() {
    this.push(); // global scope
  }

  get current(): Scope {
    return this.stack[this.stack.length - 1];
  }

  push(): Scope {
    const scope = new Scope(this.stack.length > 0 ? this.current : null);
    this.stack.push(scope);
    return scope;
  }

  pop(): Scope {
    if (this.stack.length === 1) throw new Error('Cannot pop global scope');
    return this.stack.pop()!;
  }

  lookup(name: string): SymbolInfo | undefined {
    return this.current.lookup(name);
  }

  declare(info: SymbolInfo): boolean {
    return this.current.declare(info);
  }

  markUsed(name: string): void {
    this.current.markUsed(name);
  }

  /** Collect all own symbols from the current scope (for unused-var checking). */
  ownSymbols(): SymbolInfo[] {
    return this.current.ownSymbols();
  }

  isGlobal(): boolean {
    return this.stack.length === 1;
  }

  /** Depth of the scope stack (1 = global). */
  depth(): number {
    return this.stack.length;
  }

  /** Declare a built-in symbol in the global scope. */
  declareBuiltin(name: string, type: PineType): void {
    const dummyLoc: SourceLocation = { line: 0, column: 0, offset: 0 };
    this.stack[0].declare({
      name,
      type,
      mutable: false,
      used: true,
      loc: dummyLoc,
      builtin: true,
      isInput: false,
    });
  }

  /** Re-declare a symbol (update its type) — used for reassignment narrowing. */
  update(name: string, type: PineType): void {
    // Walk from innermost scope outward, update first match
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const sym = this.stack[i].ownSymbols().find(s => s.name === name);
      if (sym) {
        sym.type = type;
        return;
      }
    }
  }
}

/** Create a SymbolInfo for a user-defined variable */
export function makeSymbol(
  name: string,
  type: PineType,
  loc: SourceLocation,
  options: Partial<Pick<SymbolInfo, 'mutable' | 'isInput' | 'builtin'>> = {},
): SymbolInfo {
  return {
    name,
    type,
    mutable: options.mutable ?? true,
    used: false,
    loc,
    builtin: options.builtin ?? false,
    isInput: options.isInput ?? false,
  };
}
