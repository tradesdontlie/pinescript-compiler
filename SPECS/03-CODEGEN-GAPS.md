# 03 — Code Generator Gaps

> **Status**: P0 COMPLETE — All P0 items implemented and tested
> **Priority**: P1 items remain (UDT codegen, MethodDecl codegen, display.* constants)
> **Files**: `src/compiler/codegen/generator.ts`, `src/compiler/codegen/function-mapper.ts`
> **Tests**: 65 passing (part of 480 total)

---

## What Exists

The code generator fully handles:
- IIFE output format with `__rt.setMetadata()`, `__rt.setInit()`, `__rt.setExecute()`
- var/varip state management via `__rt.state` / `__rt.persistentState`
- All statement types (if, for, while, switch, return, break, continue, assignments)
- All expression types (binary, unary, ternary, call, member, index, array literal, lambda, if/switch expressions)
- Metadata extraction for `indicator()` / `strategy()`
- Input call generation → `__rt.getInput(id)`
- Plot/hline/fill/bgcolor/barcolor/plotshape/plotchar/plotarrow/plotcandle/plotbar
- Full function mapping for ta.*, math.*, str.*, array.*, color.*, strategy.*, barstate.*
- Built-in variable mapping (open, high, low, close, volume, time, bar_index, hl2, hlc3, ohlc4)
- Series history for builtin variables: `close[1]` → `__rt.series("close").get(1)`
- Series history for user variables: `myVar[1]` → `__rt.userSeries("myVar").get(1)` — **P0 DONE**
- Drawing object codegen: `line.new()` → `__rt.line.new()` — **P0 DONE**
- Method-syntax dispatch: `a.push(x)` → `__rt.array.push(a, x)` — **P0 DONE**
- Enum constant mapping (30+ namespaces) — **P0 DONE**
- Time function codegen (`hour`, `minute`, `dayofweek`, etc.) — **P0 DONE**
- `str.format_time()` codegen — **P0 DONE**
- `timeframe.in_seconds()` codegen — **P0 DONE**
- `request.security()` codegen — **P0 DONE**
- `barmerge.*` constants — **P0 DONE**

---

## Completed P0 Items

### 1. Drawing Object Codegen — DONE

**Implementation applied:**
- `genMember()` routes `line.*`, `label.*`, `box.*`, `table.*` namespaces to `__rt.line.*`, `__rt.label.*`, etc.
- `function-mapper.ts` contains mappings for all drawing functions:
  - `line.new`, `line.delete`, `line.set_y1`, `line.set_y2`, `line.set_x1`, `line.set_x2`, `line.set_xy1`, `line.set_xy2`, `line.set_color`, `line.set_width`, `line.set_style`, `line.set_extend`, `line.get_x1`, `line.get_x2`, `line.get_y1`, `line.get_y2`, `line.get_price`
  - Full `label.*`, `box.*`, `table.*` equivalents
- Named arguments are handled by passing an options object to drawing constructors (avoids positional ordering issues)

---

### 2. User Variable Series History — DONE

**Implementation applied:**
- In `genIndex()`, the codegen detects `IndexExpression` where the object is a user-defined `Identifier` (not a builtin)
- Generates `__rt.userSeriesGet("myVar", n)` for read access
- Assignment to `myVar` becomes `__rt.userSeriesSet("myVar", value)` so the runtime can track history
- The runtime's user series storage is a per-variable `Series<T>` ring buffer keyed by variable name

**Key detail:** The codegen identifies user variables by checking whether the identifier is in the builtins map. If not found there, it is treated as a user variable and uses the user-series API.

---

### 3. Method-Syntax Dispatch — DONE

**Implementation applied (see also spec 12):**
- `genCall()` detects `CallExpression` where `callee` is `MemberExpression { object: Identifier, property: methodName }`
- Looks up the runtime type of the object by checking if it was declared as an array (`float[]`, `line[]`, etc.)
- Routes to the appropriate namespace: `__rt.array.push(obj, ...args)`, `__rt.line.setY1(obj, ...args)`, etc.
- Fallback: if no namespace match found, pass through as-is (user-defined method)

---

### 4. Enum Constant Mapping — DONE

**Implementation applied (see also spec 10):**
- 30+ enum namespaces mapped in `function-mapper.ts` constants section:
  - `line.style_solid`, `line.style_dashed`, `line.style_dotted`, `line.style_arrow_left`, `line.style_arrow_right`, `line.style_arrow_both`
  - `xloc.bar_index`, `xloc.bar_time`
  - `yloc.price`, `yloc.abovebar`, `yloc.belowbar`
  - `extend.none`, `extend.left`, `extend.right`, `extend.both`
  - `label.style_*` (20+ variants)
  - `box.style_*`
  - `size.*` (size.tiny, size.small, size.normal, size.large, size.huge, size.auto)
  - `text.*` (text.align_left, text.align_right, text.align_center, text.align_top, text.align_bottom, text.align_middle)
  - `barmerge.gaps_on`, `barmerge.gaps_off`, `barmerge.lookahead_on`, `barmerge.lookahead_off`
  - `color.*` named colors (color.red, color.blue, etc.)
  - `shape.*` (shape.circle, shape.triangleup, etc.)
  - `location.*`
  - `strategy.direction.*`, `strategy.oca.*`

---

### 5. Time Function Codegen — DONE

**Implementation applied:**
- `function-mapper.ts` mappings added:
  - `'hour'` → `'__rt.hour'`
  - `'minute'` → `'__rt.minute'`
  - `'second'` → `'__rt.second'`
  - `'dayofweek'` → `'__rt.dayofweek'`
  - `'dayofmonth'` → `'__rt.dayofmonth'`
  - `'month'` → `'__rt.month'`
  - `'year'` → `'__rt.year'`
  - `'weekofyear'` → `'__rt.weekofyear'`
  - `'timestamp'` → `'__rt.timestamp'`
  - `'timeframe.in_seconds'` → `'__rt.timeframe.inSeconds'`
  - `'str.format_time'` → `'__rt.str.formatTime'`
- `genIdentifier()` maps `time_close` → `__rt.timeClose` (builtin variable)

---

### 6. `request.security()` Codegen — DONE

**Implementation applied:**
- `'request.security'` → `'__rt.request.security'`
- Tuple returns from `request.security` are handled via destructuring codegen
- The runtime's `__rt.request.security(symbol, timeframe, expression, barmerge)` resamples to a higher timeframe

---

## Remaining P1 Items

### 7. TypeDeclaration Codegen — P1

**Pine Script syntax:**
```pine
type PriceLevel
    float price = 0.0
    string label_text = ""
    color clr = color.blue

lvl = PriceLevel.new(price=100.0, label_text="Support")
lvl.price := 105.0
inner = lvl.price
```

**Current behavior:** `TypeDeclaration` is in the AST but `generateStatement()` falls through to `default: break`, emitting nothing. `PriceLevel.new(...)` would then fail at runtime because `PriceLevel` is undefined.

**Implementation plan (see spec 17 for full detail):**

Generate a factory function for each UDT:
```js
// Generated output for "type PriceLevel ... end"
function PriceLevel({ price = 0.0, label_text = "", clr = __rt.color.blue } = {}) {
    return { __type: 'PriceLevel', price, label_text, clr };
}
PriceLevel.new = function(opts) { return PriceLevel(opts); };
```

- `PriceLevel.new(price=100.0, label_text="Support")` calls the factory
- `lvl.price` is plain JS property access — already works
- `lvl.price := 105.0` assigns `lvl.price = 105.0` — already works through assignment codegen

**Codegen steps:**
1. Add `genTypeDecl(node: TypeDeclaration): string` method
2. Emit the factory function with destructuring defaults
3. Emit `TypeName.new = function(opts) { return TypeName(opts); };`
4. In `genCall()`, detect `TypeName.new(...)` calls and rewrite named args to an options object

**Files to modify:**
- `src/compiler/codegen/generator.ts` — implement `genTypeDecl()`
- `src/compiler/codegen/function-mapper.ts` — no changes needed (UDT constructors are dynamic)

**Tests to add (minimum 5):**
1. UDT declaration generates factory function
2. `PriceLevel.new()` with no args uses all defaults
3. `PriceLevel.new(price=100.0)` passes price, other fields default
4. Field access `lvl.price` resolves correctly
5. Field mutation `lvl.price := 105.0` assigns correctly
6. Nested UDT (UDT with a UDT field)

---

### 8. MethodDeclaration Codegen — P1

**Pine Script syntax:**
```pine
method push_capped(float[] self, float val, int maxLen) =>
    self.push(val)
    if self.size() > maxLen
        self.shift()

myArr.push_capped(1.5, 100)
```

**Current behavior:** `MethodDeclaration` AST nodes are skipped by codegen. The user-defined method call `myArr.push_capped(...)` would then fail with "push_capped is not a function" since it was never defined.

**Implementation plan:**

1. Generate a named function where `self` is the first positional parameter:
   ```js
   function push_capped(self, val, maxLen) {
       __rt.array.push(self, val);
       if (__rt.array.size(self) > maxLen) {
           __rt.array.shift(self);
       }
   }
   ```

2. Register the method name in a dispatch table so `obj.push_capped(val, maxLen)` is recognized as a user-defined method:
   ```js
   __rt.registerMethod('push_capped', push_capped);
   ```

3. In `genCall()`, when a `CallExpression` has a `MemberExpression` callee and the method name is in the user method registry, rewrite to:
   ```js
   push_capped(obj, val, maxLen)
   ```

**Files to modify:**
- `src/compiler/codegen/generator.ts` — implement `genMethodDecl()`; extend `genCall()` dispatch
- `src/runtime/engine.ts` — add `registerMethod()` and user method registry

**Tests to add (minimum 3):**
1. `method` declaration generates named function
2. Call `obj.userMethod(arg)` is rewritten correctly
3. `self` inside method body correctly resolves to first arg

---

### 9. `display.*` Constants — P1

**Pine Script syntax:**
```pine
plot(close, display=display.all)
plot(close, display=display.none)
plot(close, display=display.status_line)
plot(close, display=display.pane)
plot(close, display=display.price_scale)
plot(close, display=display.data_window)
```

**Current behavior:** `display.*` constants are not in the enum constant map. They would generate `display.all` literally, which is `undefined.all` at runtime.

**Implementation:**
Add to `function-mapper.ts` constants section:
```ts
'display.all':          '__rt.display.all',
'display.none':         '__rt.display.none',
'display.status_line':  '__rt.display.statusLine',
'display.pane':         '__rt.display.pane',
'display.price_scale':  '__rt.display.priceScale',
'display.data_window':  '__rt.display.dataWindow',
```

Add to runtime:
```ts
// src/runtime/builtins/display.ts
export const display = {
    all:          0b111111,
    none:         0b000000,
    status_line:  0b000001,
    pane:         0b000010,
    price_scale:  0b000100,
    data_window:  0b001000,
};
```

**Files to modify:**
- `src/compiler/codegen/function-mapper.ts` — add `display.*` mappings
- `src/runtime/builtins/display.ts` — new file for display constants
- `src/runtime/engine.ts` — expose `display` on `__rt`

**Tests to add:**
1. `display.all` compiles to a numeric constant
2. `display.none` compiles correctly
3. `plot()` call with `display=display.all` passes through without error

---

### 10. Named Argument Reordering for Drawing Constructors — P1

**Pine Script syntax:**
```pine
// Named args passed in arbitrary order:
b = box.new(left=bar_index, top=high, right=bar_index+10, bottom=low,
            border_color=color.red, bgcolor=color.new(color.green, 90))
```

**Current behavior:** Named args are stripped of their names and passed positionally:
```ts
private genArgs(args: CallArgument[]): string {
    return args.map(arg => this.genExpr(arg.value)).join(', ');
}
```

If all required positional args are present and in the correct order, this works. But if named args are passed out-of-order or mixed with positional args, the wrong values end up in the wrong parameters.

**Implementation:**

For drawing constructors (`line.new`, `label.new`, `box.new`, `table.new`), define canonical parameter orders:

```ts
const DRAWING_PARAM_ORDERS: Record<string, string[]> = {
    'line.new':   ['x1', 'y1', 'x2', 'y2', 'xloc', 'extend', 'color', 'style', 'width'],
    'label.new':  ['x', 'y', 'text', 'xloc', 'yloc', 'color', 'style', 'textcolor', 'size', 'textalign', 'tooltip', 'point'],
    'box.new':    ['left', 'top', 'right', 'bottom', 'border_color', 'border_width', 'border_style', 'extend', 'xloc', 'bgcolor', 'text', 'text_size', 'text_color', 'text_halign', 'text_valign', 'text_wrap', 'text_font_family'],
    'table.new':  ['position', 'columns', 'rows', 'bgcolor', 'border_color', 'border_width', 'frame_color', 'frame_width'],
};
```

When generating a call to one of these functions:
1. Build a map of `name → value` from the call args
2. Reorder to match the canonical parameter order
3. Fill missing optional args with `undefined`

**Files to modify:**
- `src/compiler/codegen/generator.ts` — add `genDrawingCall()` with named-arg reordering
- `src/compiler/codegen/function-mapper.ts` — add `DRAWING_PARAM_ORDERS` table

---

## Acceptance Criteria

### P0 (All verified)
1. `line.new(x1, y1, x2, y2)` generates `__rt.line.new(x1, y1, x2, y2)`
2. `line.delete(l)` generates `__rt.line.delete(l)`
3. `myVar[1]` generates `__rt.userSeriesGet("myVar", 1)`
4. `hour(time, tz)` generates `__rt.hour(time, tz)`
5. `str.format_time(t, fmt, tz)` generates `__rt.str.formatTime(t, fmt, tz)`
6. `timeframe.in_seconds()` generates `__rt.timeframe.inSeconds()`
7. `a.push(x)` (where `a` is `float[]`) generates `__rt.array.push(a, x)`
8. `line.style_solid` generates the correct constant value
9. `barmerge.gaps_on` generates the correct constant value
10. All 65 existing codegen tests continue to pass

### P1 (To be verified)
11. `type MyType ... end` generates a factory function
12. `MyType.new(field=value)` calls the factory with defaults
13. `method myMethod(self, arg) => ...` generates a named function
14. `obj.myMethod(arg)` rewrites to `myMethod(obj, arg)`
15. `display.all` generates a numeric bit-flag constant
16. `box.new(left=l, top=t, right=r, bottom=b)` reorders named args correctly
17. `tsc --noEmit` — zero errors in `generator.ts` and `function-mapper.ts`
