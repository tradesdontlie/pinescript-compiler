# 02 — Parser Gaps

> **Status**: PARTIAL
> **Priority**: Mixed (P0–P2)
> **File**: `src/compiler/parser/parser.ts`

---

## What Exists

The parser handles:
- All statement types (variable declarations, functions, types, methods, enums, if/for/while/switch, return/break/continue, assignments)
- Expression parsing with Pratt precedence (binary, unary, ternary, call, member, index, array literal, lambda, if/switch expressions)
- Named and positional function arguments
- Tuple destructuring `[a, b] = fn()`
- Type annotations with qualifiers (`series float`, `simple int`)

---

## What's Missing

### 1. Typed Array Declarations — P0

**Pine Script syntax:**
```pine
var float[] myArray = array.new_float(0)
var line[] myLines = array.new_line(0)
var label[] myLabels = array.new_label(0)
int[] sizes = array.new_int(10, 0)
```

**Benchmark usage:** 20+ typed array declarations with `float[]`, `int[]`, `bool[]`, `line[]`, `label[]`, `box[]`, `string[]`.

**Current behavior:** The parser sees `float` as `FLOAT_TYPE` keyword, then `[` as `LBRACKET`, and likely fails to parse this as a type annotation.

**Implementation:**
- In type annotation parsing, after parsing a base type (`float`, `int`, `bool`, `string`, `color`, `line`, `label`, `box`, `table`), check for `[]` suffix
- If found, wrap the type as an array type: `{ baseType: 'array', typeArgs: [{ baseType: 'float', ... }] }`
- This applies to variable declarations, function parameters, and return types

**Files to modify:**
- `src/compiler/parser/parser.ts` — extend type annotation parsing

---

### 2. Method Call Syntax on Variables — P0

**Pine Script syntax:**
```pine
a = array.new_float(0)
a.push(1.5)          // method syntax: equivalent to array.push(a, 1.5)
s = a.size()          // method syntax: equivalent to array.size(a)
m = a.median()        // method syntax
a.shift()             // method syntax
```

**Benchmark usage:** 451+ method-style calls (`.push()`, `.size()`, `.get()`, `.shift()`, `.median()`, `.set()`, `.sort()`, `.clear()`).

**Current behavior:** The parser correctly parses `a.push(1.5)` as a `CallExpression` with callee being `MemberExpression(a, push)`. However, the **codegen** doesn't know to rewrite this as `__rt.array.push(a, 1.5)`.

**Implementation:**
- This is primarily a codegen issue (see spec 12), but the parser must ensure:
  1. `a.push(1.5)` parses as `CallExpression { callee: MemberExpression { object: Identifier("a"), property: "push" }, args: [1.5] }`
  2. This already works. No parser changes needed for basic method calls.

**Files to modify:**
- None for parser; see spec 12 for codegen changes

---

### 3. Drawing Object Type Names in Declarations — P0

**Pine Script syntax:**
```pine
var line myLine = na
var label myLabel = na
var box myBox = na
var table myTable = na
```

**Current behavior:** `line`, `label`, `box`, `table` are plain identifiers. The parser should accept them as type names in variable declarations.

**Implementation:**
- In type annotation parsing, recognize `line`, `label`, `box`, `table`, `polyline`, `linefill` as valid base types
- These don't need to be keywords — they can be recognized by the type annotation parser as known type identifiers

**Files to modify:**
- `src/compiler/parser/parser.ts` — extend known type identifiers list

---

### 4. `input.session()` Parsing — P1

**Pine Script syntax:**
```pine
ses = input.session("0930-1600", "Session", group="Times")
```

**Benchmark usage:** 8 calls to `input.session`.

**Current behavior:** `input` is tokenized as `INPUT` keyword. The parser may not handle `INPUT.session(...)` because it expects `INPUT` to be a type keyword, not an expression.

**Implementation:**
- In expression parsing, when encountering the `INPUT` keyword, check if followed by `.`
- If so, treat `input` as a namespace identifier and parse the member access
- Same treatment should apply to `color` (already handled per MEMORY.md) and potentially other type keywords used as namespaces

**Files to modify:**
- `src/compiler/parser/parser.ts` — extend primary expression parsing for `INPUT` token

---

### 5. `for [index, value] in` Destructuring — P1

**Pine Script syntax:**
```pine
for [i, val] in myArray
    // i is the index, val is the value
```

**Current behavior:** The ForInStatement only supports a single variable. Destructuring in for-in is not supported.

**Implementation:**
- Extend ForInStatement AST node to support tuple destructuring: add `indexVariable: string | null` field
- In the parser, check for `[` after `for` to detect destructuring form
- Parse `[ident, ident]` and store both variable names

**Files to modify:**
- `src/compiler/ast/nodes.ts` — add `indexVariable` to ForInStatement
- `src/compiler/parser/parser.ts` — extend for-in parsing

---

### 6. `indicator()` / `strategy()` Additional Parameters — P1

**Pine Script syntax:**
```pine
indicator("Title", overlay=true, max_lines_count=500, max_labels_count=500,
          max_boxes_count=500, dynamic_requests=true, max_bars_back=5000)
```

**Benchmark usage:** The first line uses `max_lines_count`, `max_labels_count`, `max_boxes_count`, `dynamic_requests`, `max_bars_back`.

**Current behavior:** The codegen extracts `title`, `shorttitle`, and `overlay`. Other parameters are ignored.

**Implementation:**
- Add these fields to `ScriptMetadata`: `maxLinesCount`, `maxLabelsCount`, `maxBoxesCount`, `maxBarsBack`, `dynamicRequests`
- Extract them in `extractIndicatorMeta()` / `extractStrategyMeta()`

**Files to modify:**
- `src/compiler/index.ts` — extend `ScriptMetadata`
- `src/compiler/codegen/generator.ts` — extend metadata extraction

---

### 7. Implicit Continuation After Binary Operators and Commas — P1

**Pine Script syntax:**
```pine
x = a +
    b +
    c

f(arg1,
  arg2,
  arg3)
```

**Current behavior:** After a binary operator or comma at the end of a line, the parser emits NEWLINE and may treat the next line as a new statement.

**Implementation:**
- Option A: In the lexer, suppress NEWLINE after tokens that expect a continuation: `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `,`, `(`, `[`, `and`, `or`, `not`, `?`
- Option B: In the parser, when parsing an expression and encountering NEWLINE, check if the expression is incomplete (e.g., after a binary operator)

**Files to modify:**
- `src/compiler/lexer/lexer.ts` or `src/compiler/parser/parser.ts`

---

### 8. `na` as Default Parameter Value — P1

**Pine Script syntax:**
```pine
f(x, color c = na) =>
    // ...
```

**Current behavior:** `na` is recognized as the `NA` token type. The default value parser may not handle this correctly in all contexts (e.g., when the parameter has a type annotation).

**Implementation:**
- Ensure the expression parser handles `NA` token as a primary expression returning `LiteralExpression { valueType: 'na', value: null }`
- Verify this works in function parameter default values

---

## Acceptance Criteria

1. `var float[] a = array.new_float(0)` parses without errors
2. `var line myLine = na` parses with `line` recognized as a type
3. `input.session(...)` parses as a function call
4. `for [i, val] in arr` parses with both variables captured
5. `indicator(... max_lines_count=500 ...)` extracts all parameters
6. Multi-line expressions with continuation parse correctly
7. All 68 existing parser tests continue to pass
8. At least 10 new tests covering the above gaps
