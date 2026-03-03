# 17 — User-Defined Type (UDT) Compilation

> **Status**: NOT STARTED (P1)
> **Priority**: P1 — needed for full Pine Script v6 parity
> **Files to modify**:
> - `src/compiler/codegen/generator.ts` — add `genTypeDecl`, `genMethodDecl`, UDT constructor calls
> - `src/compiler/parser/parser.ts` — verify TypeDeclaration and MethodDeclaration parsing (may already exist)
> **Estimated LOC**: ~180 codegen (generator.ts) + ~30 test cases

---

## Current State

The AST nodes for UDTs already exist (`TypeDeclaration`, `MethodDeclaration`, `TypeField` in
`src/compiler/ast/nodes.ts`). The `generateStatement` switch in `generator.ts` has a `default`
case that silently skips `TypeDeclaration` and `MethodDeclaration` nodes (line 324–326):
```typescript
// Skip TypeDeclaration, MethodDeclaration, EnumDeclaration, ImportStatement, ExportStatement
default:
  break;
```

UDT constructor calls (`MyType.new(...)`) are emitted as unknown function calls and fall through
to the last-resort passthrough in `genCall`. No JS class is emitted, so field access throws at
runtime.

---

## Pine Script UDT Syntax Reference

### Type Declaration
```pine
type Point
    float x = 0.0
    float y = 0.0
    string label = "default"
```

### Constructor Call
```pine
p = Point.new(x=1.0, y=2.0)
p2 = Point.new(1.0, 2.0, "custom")  // positional args
p3 = Point.new()                     // all defaults
```

### Field Access and Assignment
```pine
xVal = p.x            // getter: MemberExpression
p.x := 5.0            // setter: AssignmentStatement with MemberExpression target
```

### Method Declaration
```pine
method getLabel(self Point) =>
    self.label

method setX(self Point, newX float) =>
    self.x := newX
```

### Method Call
```pine
lbl = p.getLabel()          // obj.method() syntax
p.setX(3.14)                // method with args
```

### Nested UDTs
```pine
type Line
    Point start = Point.new()
    Point end   = Point.new()
```

---

## Target JavaScript Output

### Type Declaration → JS Class

**Input Pine:**
```pine
type Point
    float x = 0.0
    float y = 0.0
    string label = "default"
```

**Output JS:**
```javascript
function Point(fields) {
    fields = fields || {};
    this.x = (fields.x !== undefined) ? fields.x : 0.0;
    this.y = (fields.y !== undefined) ? fields.y : 0.0;
    this.label = (fields.label !== undefined) ? fields.label : "default";
}
Point.new = function(fields) { return new Point(fields); };
```

**Rationale:**
- Uses a plain constructor function (not ES6 `class`) for maximum compatibility with the IIFE runtime.
- `fields` object pattern allows both positional and named argument passing after codegen resolves them.
- Static `.new()` factory method maps the Pine `Point.new(...)` call pattern.
- Default field values are Pine expressions — must be evaluated at construction time.

---

### Constructor Call → JS Object Instantiation

**Input Pine:**
```pine
p = Point.new(x=1.0, y=2.0)
p2 = Point.new(1.5, 2.5, "hi")
p3 = Point.new()
```

**Output JS:**
```javascript
var p  = Point.new({x: 1.0, y: 2.0});
var p2 = Point.new({x: 1.5, y: 2.5, label: "hi"});
var p3 = Point.new({});
```

**Key rule:** Positional args are matched to field declaration order. Named args (`x=1.0`) are
passed directly. Mixed positional+named is not supported in Pine; positional fills in order.

---

### Field Access → Property Access

**Input Pine:**
```pine
xVal = p.x
```

**Output JS:**
```javascript
var xVal = p.x;
```

No special transformation needed — `MemberExpression` on a non-namespace identifier already
emits `obj.prop` via the existing `genMember` path.

**However**, method dispatch in `genCall` currently intercepts `obj.method()` calls on
non-namespace identifiers and tries to route them via `__rt.{ns}.method(obj, ...)` (lines 787–838).
UDT method calls must bypass this routing. See Method Declaration section below.

---

### Field Assignment → Property Assignment

**Input Pine:**
```pine
p.x := 5.0
```

**Output JS:**
```javascript
p.x = 5.0;
```

The existing `genAssignment` handles `MemberExpression` targets via the else-branch `genExpr(target)`,
which calls `genMember`. This already works correctly for plain property assignment.

---

### Method Declaration → Prototype Method

**Input Pine:**
```pine
method getLabel(self Point) =>
    self.label

method setX(self Point, newX float) =>
    self.x := newX
    self
```

**Output JS:**
```javascript
Point.prototype.getLabel = function() {
    var self = this;
    return self.label;
};

Point.prototype.setX = function(newX) {
    var self = this;
    self.x = newX;
    return self;
};
```

**Key rules:**
- `self` parameter is dropped from the JS parameter list (it becomes `this`).
- `var self = this;` is injected as the first line of the method body.
- All references to `self` inside the body remain as-is (they resolve to `var self = this`).
- The method is emitted immediately after the `Point` constructor function in the output.
- Methods must be grouped with their type — emit them right after the type they extend.

---

### Method Call → Prototype Method Call

**Input Pine:**
```pine
lbl = p.getLabel()
p.setX(3.14)
```

**Output JS:**
```javascript
var lbl = p.getLabel();
p.setX(3.14);
```

The existing method-dispatch path (lines 787–838 in `generator.ts`) intercepts all
`obj.method()` calls on non-namespace identifiers and routes them to `__rt.ns.method(obj, ...)`.
This must NOT apply to UDT method calls.

**Fix required in `genCall`:**
When the object variable has a registered UDT type, skip the `__rt` dispatch and emit direct
method call instead.

---

## Implementation Plan

### Step 1: Track UDT Type Names

In `CodeGenerator`, add a `Set<string>` of declared UDT type names:
```typescript
private udtTypes: Set<string> = new Set();
```

Populate during the first pass when processing `TypeDeclaration` nodes.

### Step 2: Emit TypeDeclaration

Add `case 'TypeDeclaration':` to `generateStatement`:
```typescript
case 'TypeDeclaration':
    this.genTypeDecl(stmt as TypeDeclaration, out);
    break;
```

**`genTypeDecl` implementation:**
```typescript
private genTypeDecl(decl: TypeDeclaration, out: string[]): void {
    const name = decl.name;
    this.udtTypes.add(name);

    // Constructor function
    out.push(this.indent() + `function ${name}(fields) {`);
    this.indentLevel++;
    out.push(this.indent() + 'fields = fields || {};');
    for (const field of decl.fields) {
        const defVal = field.defaultValue
            ? this.genExpr(field.defaultValue)
            : this.defaultForType(field.typeAnnotation.baseType);
        out.push(this.indent() +
            `this.${field.name} = (fields.${field.name} !== undefined) ? fields.${field.name} : ${defVal};`
        );
    }
    this.indentLevel--;
    out.push(this.indent() + '}');

    // Static .new() factory
    out.push(this.indent() + `${name}.new = function(fields) { return new ${name}(fields || {}); };`);
}
```

**`defaultForType` helper:**
```typescript
private defaultForType(baseType: string): string {
    switch (baseType) {
        case 'float': return '__rt.na';
        case 'int':   return '__rt.na';
        case 'bool':  return 'false';
        case 'string': return '__rt.na';
        case 'color':  return '__rt.na';
        default:       return 'null'; // nested UDT: default na
    }
}
```

**Note:** Pine v6 field defaults are `na` for numeric/string/color types unless explicitly
specified. `bool` defaults to `false` (no `na` for bool).

### Step 3: Emit MethodDeclaration

Add `case 'MethodDeclaration':` to `generateStatement`:
```typescript
case 'MethodDeclaration':
    this.genMethodDecl(stmt as MethodDeclaration, out);
    break;
```

**`genMethodDecl` implementation:**
```typescript
private genMethodDecl(decl: MethodDeclaration, out: string[]): void {
    const typeName = decl.thisType;
    // Remaining params (skip the 'self' param — it's the first param by convention)
    // In Pine, the first param of a method is the `self` param
    const params = decl.params
        .filter(p => p.name !== 'self')
        .map(p => p.name)
        .join(', ');

    out.push(this.indent() + `${typeName}.prototype.${decl.name} = function(${params}) {`);
    this.indentLevel++;
    out.push(this.indent() + 'var self = this;');
    if (Array.isArray(decl.body)) {
        this.generateBody(decl.body, out);
    } else {
        out.push(this.indent() + `return ${this.genExpr(decl.body)};`);
    }
    this.indentLevel--;
    out.push(this.indent() + '};');
}
```

### Step 4: Emit Constructor Calls (`TypeName.new(...)`)

In `genCall`, detect the `TypeName.new(...)` pattern before the BUILTIN_FUNCTIONS mapper lookup:

```typescript
// UDT constructor call: TypeName.new(...)
if (call.callee.kind === 'MemberExpression') {
    const mem = call.callee as MemberExpression;
    if (mem.property === 'new' &&
        mem.object.kind === 'IdentifierExpression') {
        const typeName = (mem.object as IdentifierExpression).name;
        if (this.udtTypes.has(typeName)) {
            return this.genUdtConstructor(typeName, call);
        }
    }
}
```

**`genUdtConstructor` implementation:**
```typescript
private genUdtConstructor(typeName: string, call: CallExpression): string {
    // Get field order from the stored type declaration
    const fieldNames = this.udtFieldOrder.get(typeName) ?? [];
    const parts: string[] = [];

    for (let i = 0; i < call.args.length; i++) {
        const arg = call.args[i];
        const key = arg.name ?? fieldNames[i];
        if (key !== undefined) {
            parts.push(`${key}: ${this.genExpr(arg.value)}`);
        }
    }

    return `${typeName}.new({${parts.join(', ')}})`;
}
```

Add a field order map to `CodeGenerator`:
```typescript
private udtFieldOrder: Map<string, string[]> = new Map();
```

Populate in `genTypeDecl`:
```typescript
this.udtFieldOrder.set(name, decl.fields.map(f => f.name));
```

### Step 5: Fix Method-Dispatch to Skip UDT Methods

In the method-dispatch section of `genCall` (lines 787–838), add a guard:

```typescript
// Only dispatch through __rt if the object type is NOT a UDT type
const objVarType = this.varTypes.get(objName);
if (objVarType && this.udtTypes.has(objVarType)) {
    // UDT method call — emit as direct prototype method call
    const objExpr = this.genExpr(mem.object);
    const argsStr = call.args.length > 0 ? this.genArgs(call.args) : '';
    return `${objExpr}.${method}(${argsStr})`;
}
```

**Type tracking for UDT variables:**
Extend `inferTypeFromCall` to handle `TypeName.new(...)` calls:
```typescript
// In inferTypeFromCall:
if (calleeName.endsWith('.new')) {
    const typeName = calleeName.slice(0, -4); // strip '.new'
    if (this.udtTypes.has(typeName)) return typeName;
}
```

### Step 6: Ordering — Types Before Methods

Pine allows `MethodDeclaration` nodes to appear anywhere in the program after their `TypeDeclaration`.
The codegen must emit type constructor functions before any method declarations.

**Two-pass strategy:**
1. Collect all `TypeDeclaration` nodes in first pass; emit them at the top of the execute body.
2. Collect all `MethodDeclaration` nodes and emit them grouped after their type's constructor.

**Implementation approach:**
In `firstPass`, pre-collect types in declaration order. In `generateBody`, emit deferred type/method blocks at the start of the top-level body before processing other statements.

Alternatively (simpler): `TypeDeclaration` and `MethodDeclaration` nodes are always at the top of a Pine Script (by convention). Emit them in-order as they appear. If a `MethodDeclaration` for `Point` appears before `Point` is declared (unusual), the JS prototype assignment still works at runtime because JS hoists function declarations.

**Chosen approach:** Emit in-order. Document that TypeDeclaration must precede MethodDeclaration in Pine source (matches Pine language spec).

---

## Full Example: Input → Output

**Input Pine Script:**
```pine
//@version=6
indicator("UDT Demo")

type Candle
    float open  = na
    float high  = na
    float low   = na
    float close = na

method range(self Candle) =>
    self.high - self.low

method isGreen(self Candle) =>
    self.close > self.open

c = Candle.new(open=open, high=high, low=low, close=close)
r = c.range()
green = c.isGreen()
plot(r, "Range")
```

**Output JS (execute body):**
```javascript
function Candle(fields) {
    fields = fields || {};
    this.open  = (fields.open  !== undefined) ? fields.open  : __rt.na;
    this.high  = (fields.high  !== undefined) ? fields.high  : __rt.na;
    this.low   = (fields.low   !== undefined) ? fields.low   : __rt.na;
    this.close = (fields.close !== undefined) ? fields.close : __rt.na;
}
Candle.new = function(fields) { return new Candle(fields || {}); };

Candle.prototype.range = function() {
    var self = this;
    return self.high - self.low;
};

Candle.prototype.isGreen = function() {
    var self = this;
    return self.close > self.open;
};

var c = Candle.new({open: __rt.open.get(0), high: __rt.high.get(0), low: __rt.low.get(0), close: __rt.close.get(0)});
var r = c.range();
var green = c.isGreen();
__rt.plot(0, r, {title:"Range",color:"#2962FF",linewidth:1,style:"line"});
```

---

## AST Nodes Used (existing, no changes needed)

From `src/compiler/ast/nodes.ts`:

```typescript
interface TypeDeclaration {
    kind: 'TypeDeclaration';
    name: string;           // "Point"
    fields: TypeField[];
}

interface TypeField {
    name: string;                  // "x"
    typeAnnotation: TypeAnnotation; // { baseType: "float", ... }
    defaultValue: Expression | null; // LiteralExpression(0.0) or null
}

interface MethodDeclaration {
    kind: 'MethodDeclaration';
    name: string;           // "getLabel"
    thisType: string;       // "Point"  <- the type being extended
    params: FunctionParam[]; // includes self as first param? Or excluded?
    returnType: TypeAnnotation | null;
    body: Statement[] | Expression;
}
```

**Clarification needed on `thisType` vs params:**
The `MethodDeclaration` node has a `thisType: string` field. Whether the parser includes the
`self` parameter as a `FunctionParam` in `params` or excludes it must be verified.

**Recommendation:** Read `src/compiler/parser/parser.ts` to confirm how `method` is parsed before
implementing `genMethodDecl`. If `self` is in `params`, filter it out. If not, no filtering needed.

---

## Test Cases

### Test 1: Basic UDT declaration and instantiation
```typescript
// Input
const pine = `
type Point
    float x = 0.0
    float y = 0.0
p = Point.new(x=1.0, y=2.0)
`;
// Expected output contains:
// function Point(fields) { ... }
// Point.new = function(fields) { ... };
// var p = Point.new({x: 1.0, y: 2.0});
```

### Test 2: Default field values
```typescript
// type with no explicit defaults: fields default to __rt.na
const pine = `
type Bar
    float o
    float h
b = Bar.new()
`;
// Expected: this.o = (fields.o !== undefined) ? fields.o : __rt.na;
// var b = Bar.new({});
```

### Test 3: Method declaration
```typescript
const pine = `
type Rect
    float w = 1.0
    float h = 1.0
method area(self Rect) =>
    self.w * self.h
r = Rect.new(w=3.0, h=4.0)
a = r.area()
`;
// Expected:
// Rect.prototype.area = function() {
//     var self = this;
//     return self.w * self.h;
// };
// var a = r.area();
```

### Test 4: Method with parameters
```typescript
const pine = `
type Counter
    int count = 0
method increment(self Counter, by int) =>
    self.count := self.count + by
c = Counter.new(count=0)
c.increment(5)
`;
// Expected:
// Counter.prototype.increment = function(by) {
//     var self = this;
//     self.count = self.count + by;
// };
// c.increment(5);
```

### Test 5: Field assignment (setter pattern)
```typescript
const pine = `
type Box
    float x = 0.0
b = Box.new()
b.x := 10.0
`;
// Expected: b.x = 10.0;
```

### Test 6: Positional constructor args
```typescript
const pine = `
type Vec2
    float x = 0.0
    float y = 0.0
v = Vec2.new(1.0, 2.0)
`;
// Expected: var v = Vec2.new({x: 1.0, y: 2.0});
```

### Test 7: UDT field access in expression
```typescript
const pine = `
type Point
    float x = 0.0
p = Point.new(x=5.0)
val = p.x + 1.0
`;
// Expected: var val = p.x + 1.0;
```

### Test 8: Nested UDT
```typescript
const pine = `
type Inner
    float v = 0.0
type Outer
    Inner inner = Inner.new()
o = Outer.new()
`;
// Expected: Inner.new and Outer.new both emit constructor functions
// Outer field default calls Inner.new()
```

### Test 9: Method call NOT misrouted to __rt
```typescript
const pine = `
type Thing
    float val = 0.0
method getValue(self Thing) =>
    self.val
t = Thing.new(val=42.0)
x = t.getValue()
`;
// Expected: var x = t.getValue();
// NOT: var x = __rt.thing.getValue(t);  ← this would be WRONG
```

### Test 10: Integration — UDT with plot
```typescript
const pine = `
//@version=6
indicator("UDT test")
type Bar
    float h = na
    float l = na
method hl2(self Bar) =>
    (self.h + self.l) / 2
b = Bar.new(h=high, l=low)
plot(b.hl2())
`;
// Expected: full working IIFE with type + method + plot
```

---

## Edge Cases to Handle

### `na` as UDT value
Pine allows a UDT variable to be `na`:
```pine
p = na
if condition
    p := Point.new(x=1.0)
```
In JS: `var p = __rt.na;` then later `p = Point.new({x: 1.0})`.
No special handling needed — `na` is just `undefined`-like in the runtime.

### Type name collision with built-in namespace
Unlikely but possible: user names a type `line` or `array`. The codegen should register
user-defined type names in `KNOWN_NAMESPACES` check — or more precisely, in `udtTypes` and
detect them before the namespace routing.

### `export type` / `import` (library scripts)
The `ExportStatement` wrapping a `TypeDeclaration` should unwrap and emit the type normally.
Not a P1 concern; note for future.

---

## Files Modified

| File | Change |
|------|--------|
| `src/compiler/codegen/generator.ts` | Add `genTypeDecl`, `genMethodDecl`, `genUdtConstructor`; handle UDT cases in `generateStatement` and `genCall`; add `udtTypes` and `udtFieldOrder` state |
| `src/compiler/codegen/generator.ts` | In `inferTypeFromCall`, handle `TypeName.new(...)` pattern |
| No parser changes expected | TypeDeclaration/MethodDeclaration AST nodes already exist |

---

## LOC Estimate

| Section | Lines |
|---------|-------|
| `genTypeDecl` | ~20 |
| `genMethodDecl` | ~18 |
| `genUdtConstructor` | ~15 |
| `defaultForType` helper | ~12 |
| UDT type tracking state + reset | ~6 |
| `generateStatement` case additions | ~6 |
| `genCall` UDT constructor guard | ~8 |
| Method-dispatch UDT bypass | ~8 |
| `inferTypeFromCall` UDT extension | ~5 |
| **Total** | **~98 lines** |

Test file additions: ~200 lines (10 test cases × ~20 lines each).

**Grand total: ~300 LOC**
