# 13 — Semantic Analyzer

> **Status**: NOT STARTED
> **Priority**: P2 (does not block compilation — enhances error reporting)
> **File to create**: `src/compiler/semantic/analyzer.ts`

---

## What Exists

The compiler currently goes directly from Parser → Codegen with no intermediate semantic analysis. The parser does minimal validation (syntax only). The codegen silently generates potentially incorrect code for some patterns.

---

## What a Semantic Analyzer Would Provide

### 1. Type Checking — P2

**What**: Verify type compatibility in assignments, function arguments, and expressions.

```pine
// Should error: assigning string to int variable
int x = "hello"

// Should error: passing wrong type to function
ta.sma("not a series", 20)

// Should warn: comparing incompatible types
if close == "hello"
    // ...
```

**Implementation:**
- Build a type inference engine that walks the AST
- Infer types from literals, function return types, and operator results
- Report type mismatches as diagnostics

---

### 2. Scope Validation — P2

**What**: Verify that variables are declared before use and respect scope boundaries.

```pine
// Should error: x not declared
y = x + 1

// Should error: x not accessible outside if block (Pine Script has function-level scope)
if condition
    x = 1
// In Pine, x IS accessible here (Pine Script scoping is function-level, not block-level)
```

**Pine Script scoping rules:**
- Variables declared in a function are visible throughout the function (including before declaration — hoisting)
- Variables declared in if/for/while blocks ARE visible outside those blocks
- Variables declared at top level are global

---

### 3. Qualifier Enforcement — P2

**What**: Verify qualifier rules (const, input, simple, series).

```pine
// Should error: can't use series value where simple is required
length = ta.sma(close, 20)  // length must be simple int
ta.sma(close, length)        // ERROR: series int where simple int expected

// const must be compile-time constant
const x = close  // ERROR: close is series, not const

// input values are set once at script start
input_val = input.int(20)
input_val := 30  // ERROR: can't reassign input
```

**Qualifier hierarchy:**
```
const < input < simple < series
```
A value of qualifier Q can be used where qualifier Q' is expected only if Q <= Q'.

---

### 4. Function Overload Resolution — P2

**What**: Select the correct overload when multiple signatures exist.

```pine
// math.round has multiple overloads:
// math.round(number) -> int
// math.round(number, precision) -> float
x = math.round(3.14)       // -> 3 (int)
y = math.round(3.14, 2)    // -> 3.14 (float)
```

---

### 5. NA Type Narrowing — P2

**What**: Track when NA checks have been performed and narrow types accordingly.

```pine
x = ta.sma(close, 20)
// x could be na here
if not na(x)
    // x is guaranteed non-NA here
    plot(x)  // safe
```

---

### 6. Unused Variable Warnings — P2

**What**: Warn when declared variables are never used.

```pine
unused_var = close * 2  // WARNING: unused_var is never read
```

---

### 7. Return Type Validation — P2

**What**: Verify that all code paths in a function return a value of the consistent type.

```pine
f(x) =>
    if x > 0
        "positive"
    else
        42  // WARNING: inconsistent return types (string vs int)
```

---

## Implementation Architecture

```typescript
// src/compiler/semantic/analyzer.ts

import { Program, Statement, Expression } from '../ast/nodes';
import { DiagnosticReporter } from '../diagnostics/diagnostic';

interface TypeInfo {
    qualifier: 'const' | 'input' | 'simple' | 'series';
    baseType: 'int' | 'float' | 'bool' | 'string' | 'color' | 'na' | 'void' |
              'line' | 'label' | 'box' | 'table' | 'array' | 'map' | 'matrix' | 'unknown';
    typeArgs?: TypeInfo[];  // for array<float>, map<string, int>, etc.
    nullable: boolean;      // can be NA
}

interface SymbolInfo {
    name: string;
    type: TypeInfo;
    mutable: boolean;
    declared: boolean;
    used: boolean;
    loc: SourceLocation;
}

class SemanticAnalyzer {
    private reporter: DiagnosticReporter;
    private scopes: Map<string, SymbolInfo>[] = [];
    private currentFunctionReturnType: TypeInfo | null = null;

    constructor(reporter: DiagnosticReporter) {
        this.reporter = reporter;
    }

    analyze(program: Program): void {
        this.pushScope();
        this.registerBuiltins();
        for (const stmt of program.body) {
            this.analyzeStatement(stmt);
        }
        this.checkUnusedVariables();
        this.popScope();
    }

    private analyzeStatement(stmt: Statement): void { /* ... */ }
    private analyzeExpression(expr: Expression): TypeInfo { /* ... */ }
    private inferType(expr: Expression): TypeInfo { /* ... */ }
    private checkTypeCompatibility(expected: TypeInfo, actual: TypeInfo, loc: SourceLocation): void { /* ... */ }
    private pushScope(): void { /* ... */ }
    private popScope(): void { /* ... */ }
    private registerBuiltins(): void { /* ... */ }
    private checkUnusedVariables(): void { /* ... */ }
}
```

---

## Integration Points

### Compiler Pipeline
```
Lexer → Parser → **Semantic Analyzer** → Codegen → JS
```

The semantic analyzer runs between parsing and codegen. It receives the AST and the diagnostic reporter. It does NOT modify the AST — it only reports diagnostics.

### Files to modify:
- `src/compiler/index.ts` — add semantic analysis pass to compile pipeline
- Create `src/compiler/semantic/analyzer.ts`
- Create `src/compiler/semantic/types.ts` — type definitions
- Create `src/compiler/semantic/builtins.ts` — built-in function signatures

---

## Acceptance Criteria

1. Type mismatch in assignment produces an error diagnostic
2. Undeclared variable usage produces an error diagnostic
3. Qualifier violations produce error diagnostics
4. Unused variables produce warning diagnostics
5. The analyzer does not prevent compilation — it only adds diagnostics
6. All existing tests continue to pass (analyzer is additive)
7. At least 20 tests covering type checking, scope validation, and qualifier enforcement
