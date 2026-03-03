# 02 — Parser Gaps

> **Status**: P0 COMPLETE — All P0 items implemented and tested
> **Priority**: P1–P2 items remain
> **File**: `src/compiler/parser/parser.ts`
> **Tests**: 68 passing (part of 480 total)

---

## What Exists

The parser fully handles:
- All statement types (variable declarations, functions, types, methods, enums, if/for/while/switch, return/break/continue, assignments)
- Expression parsing with Pratt precedence (binary, unary, ternary, call, member, index, array literal, lambda, if/switch expressions)
- Named and positional function arguments (including type-keyword named args like `color=color.blue`)
- Tuple destructuring `[a, b] = fn()`
- Type annotations with qualifiers (`series float`, `simple int`)
- Typed array declarations `var float[] myArr = ...` — **P0 DONE**
- Drawing type names in declarations (`var line myLine = na`) — **P0 DONE**
- `for [i, v] in` destructuring — **P0 DONE**
- Method call syntax on variables (`a.push(x)`) — already parsed correctly as `CallExpression { callee: MemberExpression }` — **P0 DONE** (codegen handles dispatch; see spec 12)

---

## Completed P0 Items

### 1. Typed Array Declarations — DONE

**Implementation applied:**
- `parseTypeAnnotation()` checks for `[]` suffix after any base type
- Wraps as `{ baseType: 'array', elementType: { baseType: 'float', ... } }`
- Works in variable declarations, function parameters, and return types
- Handles all element types: `float[]`, `int[]`, `bool[]`, `string[]`, `color[]`, `line[]`, `label[]`, `box[]`, `table[]`

**AST change:** `TypeAnnotation` node gained an optional `elementType` field when `baseType === 'array'`.

---

### 2. Drawing Object Type Names in Declarations — DONE

**Implementation applied:**
- `parseTypeAnnotation()` recognizes `line`, `label`, `box`, `table`, `polyline`, `linefill` as valid base types
- These identifiers are not keywords — they are handled by the type-annotation parser recognizing them by name
- Combined with item 1, `var line[] myLines = na` parses correctly

---

### 3. `for [index, value] in` Destructuring — DONE

**Implementation applied:**
- After `for`, the parser checks for `[` to detect the destructuring form
- Parses `[ident, ident]` and stores both identifiers
- `ForInStatement` AST node gained `indexVariable: string | null` field alongside existing `variable: string`
- Codegen generates: `for (let __i = 0; __i < arr.length; __i++) { const i = __i; const v = arr[__i]; ... }`

**AST change:** `src/compiler/ast/nodes.ts` — `ForInStatement.indexVariable: string | null`

---

### 4. Method Call Syntax — DONE (no parser change required)

The parser correctly parses `a.push(1.5)` as:
```
CallExpression {
  callee: MemberExpression { object: Identifier("a"), property: "push" },
  args: [NumberLiteral(1.5)]
}
```
The codegen (spec 12) is responsible for rewriting this to `__rt.array.push(a, 1.5)`. No parser changes were needed.

---

## Remaining P1 Items

### 5. `input.session()` Parsing — P1

**Pine Script syntax:**
```pine
ses = input.session("0930-1600", "Session")
ses = input.session("0930-1600", "Session", group="Times", confirm=false)
```

**Benchmark usage:** 8 calls to `input.session`.

**Current behavior:** `input` is tokenized as `INPUT` (keyword). In the primary expression parser, `INPUT` is not handled as a namespace expression, so `input.session(...)` may fail or produce incorrect output.

**Fix:**
In `parsePrimary()`, when encountering the `INPUT` token, check if the next token is `.`. If so, treat `input` as a namespace identifier and continue parsing the member access chain normally. This is the same approach used for `color` (which is tokenized as `COLOR_TYPE` but treated as an identifier for namespace access like `color.red`).

```ts
case TokenType.INPUT:
    if (this.peek().type === TokenType.DOT) {
        // treat as namespace identifier, fall through to member access
        return this.parseIdentifierWithMemberAccess('input');
    }
    // otherwise: type annotation context
    return this.parseTypeAnnotation();
```

**Files to modify:**
- `src/compiler/parser/parser.ts` — extend `parsePrimary()` for `INPUT` token

**Tests to add:**
- `input.session("0930-1600", "Session")` parses as `CallExpression` with callee `MemberExpression(input, session)`
- `input.session("0930-1600", "Session", group="Times")` parses with named arg
- Existing `input.int(...)`, `input.float(...)` still parse correctly

---

### 6. `indicator()` / `strategy()` Additional Parameters — P1

**Pine Script syntax:**
```pine
indicator("Title", overlay=true, max_lines_count=500, max_labels_count=500,
          max_boxes_count=500, dynamic_requests=true, max_bars_back=5000)
```

**Benchmark usage:** The benchmark's first line uses all of these parameters.

**Current behavior:** The codegen extracts `title`, `shorttitle`, and `overlay`. The parameters `max_lines_count`, `max_labels_count`, `max_boxes_count`, `max_bars_back`, and `dynamic_requests` are parsed (the parser handles named args), but the codegen's `extractIndicatorMeta()` does not store them.

**Fix:**
Add these fields to `ScriptMetadata` and extract them in `extractIndicatorMeta()` / `extractStrategyMeta()`.

```ts
export interface ScriptMetadata {
    title: string;
    shorttitle?: string;
    overlay: boolean;
    // P1 additions:
    maxLinesCount?: number;
    maxLabelsCount?: number;
    maxBoxesCount?: number;
    maxBarsBack?: number;
    dynamicRequests?: boolean;
    // strategy-only:
    initialCapital?: number;
    defaultQtyType?: string;
    defaultQtyValue?: number;
    commission?: number;
    pyramiding?: number;
}
```

**Files to modify:**
- `src/compiler/index.ts` — extend `ScriptMetadata`
- `src/compiler/codegen/generator.ts` — extend `extractIndicatorMeta()` and `extractStrategyMeta()`

**Tests to add:**
- `indicator("Title", max_lines_count=500)` extracts `maxLinesCount: 500`
- `strategy("Title", initial_capital=10000, commission_value=0.1)` extracts strategy params

---

### 7. `na` as Default Parameter Value — P1

**Pine Script syntax:**
```pine
f(x, color c = na) =>
    // ...
myLine = line.new(x1, y1, x2, y2, color=na)
```

**Current behavior:** `na` is tokenized as the `NA` token. `parsePrimary()` handles `NA` and returns `LiteralExpression { valueType: 'na', value: null }`. This mostly works, but there may be edge cases when `na` appears as a default value for a typed parameter.

**Fix:**
Verify that `NA` is handled in all expression contexts:
1. In function call default values: `f(x = na)` — named arg with `na` value
2. In variable declarations: `var line myLine = na`
3. In ternary: `x ? val : na`

In codegen, `na` should emit `__rt.NA`.

**Files to modify:**
- `src/compiler/parser/parser.ts` — verify `NA` in all primary expression positions
- `src/compiler/codegen/generator.ts` — verify `NA` literal codegen

---

### 8. Matrix and Map Type Declarations — P2

**Pine Script syntax:**
```pine
m = matrix.new<float>(3, 3, 0.0)
d = map.new<string, float>()
```

**Current behavior:** `matrix<float>` and `map<string, float>` are not parsed. The `<` would be interpreted as a less-than operator.

**Fix (when P2 is addressed):**
- In type annotation parsing, after recognizing `matrix` or `map` as a type name, check for `<`
- Parse generic type arguments until `>`
- This requires a one-token lookahead to disambiguate `<` (generic) from `<` (comparison)

**Files to modify:**
- `src/compiler/parser/parser.ts` — add generic type parameter parsing

---

## Acceptance Criteria

1. `var float[] a = array.new_float(0)` — parses without errors, type is `{ baseType: 'array', elementType: { baseType: 'float' } }`
2. `var line myLine = na` — parses with `line` as a recognized type name
3. `for [i, val] in arr` — parses with `indexVariable: 'i'`, `variable: 'val'`
4. `input.session("0930-1600", "Session")` — parses as a `CallExpression` (**P1**)
5. `indicator("Title", max_lines_count=500)` — `ScriptMetadata.maxLinesCount === 500` (**P1**)
6. All 68 existing parser tests continue to pass
7. `tsc --noEmit` — zero errors in `parser.ts` and `nodes.ts`
