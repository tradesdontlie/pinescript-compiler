# 12 — Method Syntax Dispatch

> **Status**: NOT STARTED
> **Priority**: P0 (451+ method-style calls in benchmark)
> **Files to modify**: `src/compiler/codegen/generator.ts`

---

## What Exists

The **parser** already handles method syntax correctly:
```pine
a.push(1.5)
```
Parses as:
```
CallExpression {
    callee: MemberExpression { object: Identifier("a"), property: "push" },
    args: [Literal(1.5)]
}
```

The **codegen** currently emits this verbatim as `a.push(1.5)` in JavaScript. This works when `a` is an actual JS array (since JS arrays have `.push()`), but:
1. It doesn't match Pine Script semantics for methods like `.size()` (Pine uses `array.size(a)` — a function, not a method)
2. It fails for methods that don't exist on JS arrays (e.g., `.median()`, `.shift()` as a no-arg call)
3. It fails for drawing objects (`.set_y1()`, `.delete()`)

---

## What's Missing

### The Core Problem

Pine Script has two equivalent syntaxes:
```pine
// Function syntax
array.push(myArray, value)
array.size(myArray)
array.median(myArray)

// Method syntax (syntactic sugar for the above)
myArray.push(value)
myArray.size()
myArray.median()
```

The method syntax prepends the object as the first argument to the corresponding `namespace.method()` function call. The codegen must detect method-style calls and rewrite them.

### Benchmark Usage

| Method | Count | Equivalent Function |
|--------|-------|-------------------|
| `.size()` | 130+ | `array.size(obj)` |
| `.get()` | 92+ | `array.get(obj, idx)` |
| `.push()` | 51+ | `array.push(obj, val)` |
| `.shift()` | 42+ | `array.shift(obj)` |
| `.set()` | 7+ | `array.set(obj, idx, val)` |
| `.delete()` | 108+ | `line.delete(obj)` / `label.delete(obj)` / `box.delete(obj)` |
| `.set_y1()` | 38+ | `line.set_y1(obj, y)` |
| `.set_x1()` | 32+ | `line.set_x1(obj, x)` |
| `.median()` | 2 | `array.median(obj)` |
| `.new()` | 34+ (box) | `box.new(...)` |
| `.cell()` | 92 | `table.cell(obj, ...)` |
| `.merge_cells()` | 8 | `table.merge_cells(obj, ...)` |

---

## Implementation Plan

### Approach: Type-Aware Method Dispatch in Codegen

The codegen cannot always know the type of a variable. We need heuristics:

#### Strategy 1: Known-Method Table (Recommended)

Build a lookup table of known method names and their corresponding namespace:

```typescript
const METHOD_DISPATCH: Record<string, string> = {
    // Array methods
    'push': 'array',
    'pop': 'array',
    'get': 'array',
    'set': 'array',
    'size': 'array',
    'shift': 'array',
    'unshift': 'array',
    'insert': 'array',
    'remove': 'array',
    'clear': 'array',
    'copy': 'array',
    'reverse': 'array',
    'sort': 'array',
    'join': 'array',
    'slice': 'array',
    'includes': 'array',
    'indexof': 'array',
    'lastindexof': 'array',
    'sum': 'array',
    'avg': 'array',
    'max': 'array',
    'min': 'array',
    'median': 'array',
    'stdev': 'array',
    'variance': 'array',
    'range': 'array',
    'first': 'array',
    'last': 'array',
    'concat': 'array',
    'from': 'array',

    // Line methods
    'set_y1': 'line',
    'set_y2': 'line',
    'set_x1': 'line',
    'set_x2': 'line',
    'set_xy1': 'line',
    'set_xy2': 'line',
    'get_x1': 'line',
    'get_x2': 'line',
    'get_y1': 'line',
    'get_y2': 'line',
    'set_extend': 'line',
    'set_style': 'line', // ambiguous — could be line or label
    'set_width': 'line',

    // Label methods
    'set_xy': 'label',
    'set_text': 'label',
    'set_textcolor': 'label',
    'set_tooltip': 'label',
    'set_textalign': 'label',
    'set_size': 'label',

    // Box methods
    'set_right': 'box',
    'set_left': 'box',
    'set_top': 'box',
    'set_bottom': 'box',
    'set_bgcolor': 'box',
    'set_border_color': 'box',
    'get_left': 'box',
    'get_right': 'box',
    'get_top': 'box',
    'get_bottom': 'box',

    // Table methods
    'cell': 'table',
    'merge_cells': 'table',

    // String methods (when called on string variables)
    // These are trickier — str.length(s) vs s.length()
};
```

#### Strategy 2: Track Variable Types (Better long-term)

Track the type of each variable at codegen time:
```typescript
private varTypes = new Map<string, string>(); // name → 'array' | 'line' | 'label' | 'box' | 'table'

// When we see: var line myLine = ...
// Record: varTypes.set('myLine', 'line')
// When we see: myLines = array.new_line(0)
// Record: varTypes.set('myLines', 'array')
```

Then in method dispatch:
```typescript
private genCall(call: CallExpression): string {
    if (call.callee.kind === 'MemberExpression') {
        const mem = call.callee as MemberExpression;
        if (mem.object.kind === 'IdentifierExpression') {
            const objName = (mem.object as IdentifierExpression).name;
            const method = mem.property;
            const type = this.varTypes.get(objName);

            if (type) {
                // Rewrite: obj.method(args) → __rt.TYPE.method(obj, args)
                const objExpr = this.genExpr(mem.object);
                const argsStr = this.genArgs(call.args);
                const sep = argsStr ? `, ${argsStr}` : '';
                return `__rt.${type}.${method}(${objExpr}${sep})`;
            }
        }
    }
    // ... existing call handling
}
```

### Recommendation: Hybrid Approach

1. Use **type tracking** when type is known (from declarations, `array.new_*`, drawing constructors)
2. Fall back to **method name lookup** when type is unknown
3. If neither works, emit as-is (may work for JS native methods)

---

### Handling `delete()` and `new()` — Special Cases

#### `.delete()` — Ambiguous
```pine
line.delete(myLine)    // function syntax — already works
myLine.delete()        // method syntax — needs rewrite
```

`delete` could apply to `line`, `label`, `box`, or `table`. Use type tracking or method lookup.

#### `.new()` — Static Constructor
```pine
box.new(...)           // Already works as namespace.method
PriceLevel.new(...)    // UDT constructor — different handling
```

`.new()` on a UDT should map to the constructor. On a drawing type namespace, it's a static function (already handled by codegen).

---

### Handling Method Chains
```pine
myArray.push(1).push(2)  // Unlikely in Pine, but handle gracefully
```

Pine Script does not support method chaining (void methods return nothing). No special handling needed.

---

## Implementation in genCall()

```typescript
private genCall(call: CallExpression): string {
    const calleeName = this.calleeToString(call.callee);

    // ... existing special cases ...

    // Method syntax dispatch
    if (call.callee.kind === 'MemberExpression') {
        const mem = call.callee as MemberExpression;
        const method = mem.property;
        const objExpr = this.genExpr(mem.object);

        // Check if this is a known method that needs dispatch
        const namespace = this.resolveMethodNamespace(mem.object, method);
        if (namespace) {
            const argsStr = this.genArgs(call.args);
            const sep = argsStr ? `, ${argsStr}` : '';
            const mappedMethod = this.mapper.mapFunction(`${namespace}.${method}`);
            if (mappedMethod) {
                return `${mappedMethod}(${objExpr}${sep})`;
            }
        }
    }

    // ... fall through to existing handling ...
}

private resolveMethodNamespace(obj: Expression, method: string): string | null {
    // 1. Check variable type tracking
    if (obj.kind === 'IdentifierExpression') {
        const name = (obj as IdentifierExpression).name;
        const type = this.varTypes.get(name);
        if (type) return type;
    }

    // 2. Fall back to method name lookup
    return METHOD_DISPATCH[method] ?? null;
}
```

---

## Acceptance Criteria

1. `a.push(1.5)` generates `__rt.array.push(a, 1.5)` (not `a.push(1.5)`)
2. `a.size()` generates `__rt.array.size(a)` (not `a.size()`)
3. `a.median()` generates `__rt.array.median(a)`
4. `myLine.delete()` generates `__rt.line.delete(myLine)`
5. `myLine.set_y1(100)` generates `__rt.line.setY1(myLine, 100)`
6. `myBox.set_right(newRight)` generates `__rt.box.setRight(myBox, newRight)`
7. `myTable.cell(0, 0, text="Hi")` generates `__rt.table.cell(myTable, 0, 0, ...)`
8. `a.shift()` generates `__rt.array.shift(a)`
9. Regular namespace function calls still work: `array.push(a, 1.5)` → `__rt.array.push(a, 1.5)`
10. All 329 existing tests continue to pass
11. At least 15 new tests covering method syntax dispatch for arrays, lines, labels, boxes, tables
