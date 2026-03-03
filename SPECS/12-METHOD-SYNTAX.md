# 12 — Method Syntax Dispatch

> **Status**: DONE
> **Priority**: P0 (451+ method-style calls in benchmark)
> **File**: `src/compiler/codegen/generator.ts`

---

## What's Implemented

Method syntax dispatch is fully implemented in `generator.ts` using a hybrid approach:

### 1. Known Namespace Exclusion (`KNOWN_NAMESPACES`)

Lines 24–27: Namespaces that should NOT be treated as method-call objects are excluded:

```typescript
const KNOWN_NAMESPACES = new Set([
  'ta', 'math', 'str', 'array', 'color', 'line', 'label', 'box', 'table',
  'request', 'syminfo', 'timeframe', 'barstate', 'strategy', 'log', 'ticker',
  'map', 'matrix', 'input', 'chart', 'runtime',
]);
```

When a member call like `array.push(a, v)` is seen, `array` is in `KNOWN_NAMESPACES` so it passes through directly as `__rt.array.push(a, v)`.

### 2. Variable Type Tracking (`varTypes`)

Line 42: `private varTypes: Map<string, string> = new Map()` tracks declared variable types. When the codegen sees a drawing constructor assignment, it records the type:

```typescript
// var line myLine = line.new(...) → varTypes.set("myLine", "line")
// var label lbl = label.new(...) → varTypes.set("lbl", "label")
```

### 3. Method Dispatch in `genCall()`

Lines 789–851: When a `CallExpression` has a `MemberExpression` callee where the object is NOT in `KNOWN_NAMESPACES`, the codegen:

1. Checks `varTypes.get(objName)` for a tracked type
2. Falls back to method name lookup against known method sets (array methods, drawing methods, table methods)
3. Rewrites `obj.method(args)` → `__rt.NAMESPACE.method(obj, args)`

```typescript
// Method sets used for fallback dispatch:
const arrayMethods = new Set(['push', 'pop', 'shift', 'unshift', 'get', 'set',
  'size', 'remove', 'insert', 'clear', 'copy', 'reverse', 'sort', 'join',
  'slice', 'includes', 'indexof', 'lastindexof', 'sum', 'avg', 'max',
  'min', 'median', 'stdev', 'variance', 'range', 'first', 'last',
  'concat', 'from', 'fill', 'new_float', 'new_int', 'new_bool',
  'new_string', 'new_color', 'new_line', 'new_label', 'new_box',
  'new_table',
]);

const drawingMethods = new Set([
  'delete', 'copy', 'set_x1', 'set_y1', 'set_x2', 'set_y2',
  'set_xy1', 'set_xy2', 'set_xloc', 'set_yloc', 'set_extend',
  'set_color', 'set_style', 'set_width', 'set_text', 'set_tooltip',
  'set_textcolor', 'set_size', 'set_textalign',
  'set_x', 'set_y', 'set_xy',
  'set_left', 'set_right', 'set_top', 'set_bottom',
  'set_bgcolor', 'set_border_color', 'set_border_width',
  'get_x1', 'get_x2', 'get_y1', 'get_y2',
  'get_left', 'get_top', 'get_right', 'get_bottom',
]);

const tableMethods = new Set([
  'cell', 'merge_cells', 'clear', 'set_position',
  'set_frame_color', 'set_frame_width',
  'cell_set_text', 'cell_set_bgcolor', 'cell_set_text_color',
  'cell_set_text_size', 'cell_set_text_halign', 'cell_set_text_valign',
]);
```

**Rewrite logic**: If a match is found, generates:
```typescript
// obj.method(args) → __rt.NAMESPACE.method(obj, args)
const sep = argsStr ? `, ${argsStr}` : '';
return `__rt.${ns}.${method}(${objExpr}${sep})`;
```

---

## Dispatch Coverage by Method

| Method | Dispatch Source | Generated Output | Status |
|--------|---------------|-----------------|--------|
| `a.push(v)` | arrayMethods | `__rt.array.push(a, v)` | ✅ |
| `a.pop()` | arrayMethods | `__rt.array.pop(a)` | ✅ |
| `a.size()` | arrayMethods | `__rt.array.size(a)` | ✅ |
| `a.get(i)` | arrayMethods | `__rt.array.get(a, i)` | ✅ |
| `a.set(i, v)` | arrayMethods | `__rt.array.set(a, i, v)` | ✅ |
| `a.shift()` | arrayMethods | `__rt.array.shift(a)` | ✅ |
| `a.median()` | arrayMethods | `__rt.array.median(a)` | ✅ |
| `myLine.delete()` | varTypes or drawingMethods | `__rt.line.delete(myLine)` | ✅ |
| `myLine.set_y1(y)` | varTypes or drawingMethods | `__rt.line.set_y1(myLine, y)` | ✅ |
| `myBox.set_right(x)` | varTypes or drawingMethods | `__rt.box.set_right(myBox, x)` | ✅ |
| `myTable.cell(r, c)` | varTypes or tableMethods | `__rt.table.cell(myTable, r, c)` | ✅ |
| `myTable.merge_cells(...)` | varTypes or tableMethods | `__rt.table.merge_cells(...)` | ✅ |

---

## Remaining P1 Work

### 1. `delete()` Disambiguation for Untyped Variables

**Problem**: When `varTypes` has no entry for a variable (e.g., a line was stored as `var myLine = line.new(...)` but the type wasn't recorded), and the method is `delete`, the dispatch defaults to the `drawingMethods` set — but the codegen doesn't know whether to route to `__rt.line`, `__rt.label`, or `__rt.box`.

**Current behavior**: Falls through to raw `obj.delete()` which is a JS syntax error.

**Fix**: Ensure `varTypes` is populated when any drawing constructor is called. When parsing a declaration like:
```pine
var line myLine = line.new(...)
```
The type annotation (`line`) should be recorded in `varTypes`. When no type annotation is present:
```pine
myLine = line.new(...)
```
Track the return type from known drawing constructors:
```typescript
// In genDeclaration / genAssignment, when RHS is a call to line.new / label.new / box.new / table.new:
if (calleeStr === '__rt.line.new')  this.varTypes.set(name, 'line');
if (calleeStr === '__rt.label.new') this.varTypes.set(name, 'label');
if (calleeStr === '__rt.box.new')   this.varTypes.set(name, 'box');
if (calleeStr === '__rt.table.new') this.varTypes.set(name, 'table');
```

**Acceptance**: `myLine = line.new(...); myLine.delete()` → `__rt.line.delete(myLine)` even without type annotation.
**Est**: ~30 LOC in generator.ts.

### 2. String Method Dispatch (`str.*`)

Pine Script supports method syntax on string variables:
```pine
myStr = "hello"
len = myStr.length()     // str.length(myStr)
upper = myStr.upper()    // str.upper(myStr)
```

**Current limitation**: String variables are not tracked in `varTypes`, so `myStr.length()` passes through as `myStr.length()` — which works in JS but invokes the native string `.length` property (not a function), causing a runtime error.

**Fix**: Add string methods to the dispatch table:
```typescript
const strMethods = new Set([
  'length', 'upper', 'lower', 'contains', 'startswith', 'endswith',
  'substring', 'replace', 'replace_all', 'split', 'trim',
  'pos', 'match', 'format',
]);

// In dispatch logic:
if (strMethods.has(method)) {
  const argsStr = this.genArgs(call.args);
  const sep = argsStr ? `, ${argsStr}` : '';
  return `__rt.str.${method}(${objExpr}${sep})`;
}
```

Note: This is a heuristic — any variable whose method name matches a str.* method will be dispatched to `__rt.str.*`. This is correct for string variables and unlikely to conflict with arrays.

**Acceptance**: `myStr.upper()` → `__rt.str.upper(myStr)`.
**Est**: ~15 LOC.

### 3. UDT Method Dispatch

When User-Defined Types (UDTs) with methods are implemented (see spec 17), the method dispatch must support:
```pine
type Point
    float x
    float y
    method distance(Point other) => ...

p = Point.new(1, 2)
d = p.distance(q)
```

**Fix**: UDT method names will need to be registered in a per-type dispatch table at codegen time. The hybrid approach in place will need to check UDT types via `varTypes` before checking built-in method sets.

**Est**: Deferred — depends on spec 17 (UDT codegen).

### 4. Method Chaining Guard

Pine Script does not support method chaining. If a user writes:
```pine
a.push(1).push(2)
```

The codegen would attempt to dispatch twice, but `__rt.array.push(a, 1)` returns void/undefined, so `.push(2)` would fail.

**Current behavior**: The codegen dispatches the outer call correctly; the inner result is undefined and `.push(2)` throws a runtime error.

**Fix**: No codegen change needed. The runtime `array.push` should return `void`/`undefined`, and user code will get a natural runtime error. Add a test confirming the error is clear.

**Est**: ~5 LOC test only.

### 5. Test Coverage

Add at least 15 unit tests in `tests/codegen/method-syntax.test.ts` covering:
- Array methods: push, pop, size, get, set, shift, median
- Drawing object methods: delete, set_y1, set_x1, set_xy1
- Box methods: set_right, set_left, set_top, set_bottom
- Table methods: cell, merge_cells
- Known namespace passthrough (array.push still works)

---

## Acceptance Criteria — DONE

1. ✅ `a.push(1.5)` generates `__rt.array.push(a, 1.5)`
2. ✅ `a.size()` generates `__rt.array.size(a)`
3. ✅ `a.median()` generates `__rt.array.median(a)`
4. ✅ `myLine.delete()` generates `__rt.line.delete(myLine)` (when type tracked)
5. ✅ `myLine.set_y1(100)` generates `__rt.line.set_y1(myLine, 100)`
6. ✅ `myBox.set_right(newRight)` generates `__rt.box.set_right(myBox, newRight)`
7. ✅ `myTable.cell(0, 0, text="Hi")` generates `__rt.table.cell(myTable, 0, 0, ...)`
8. ✅ `a.shift()` generates `__rt.array.shift(a)`
9. ✅ `array.push(a, 1.5)` still generates `__rt.array.push(a, 1.5)` (namespace passthrough)
10. ✅ All 480 tests pass

## Acceptance Criteria — P1 Remaining

11. [ ] `myLine.delete()` without type annotation → `__rt.line.delete(myLine)` (varTypes from constructor)
12. [ ] `myStr.upper()` → `__rt.str.upper(myStr)`
13. [ ] `myStr.length()` → `__rt.str.length(myStr)` (not JS native `.length`)
14. [ ] At least 15 new method syntax codegen tests
