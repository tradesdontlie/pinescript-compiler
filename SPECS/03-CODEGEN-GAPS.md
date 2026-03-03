# 03 — Code Generator Gaps

> **Status**: PARTIAL
> **Priority**: Mixed (P0–P1)
> **File**: `src/compiler/codegen/generator.ts`, `src/compiler/codegen/function-mapper.ts`

---

## What Exists

The code generator handles:
- IIFE output format with `__rt.setMetadata()`, `__rt.setInit()`, `__rt.setExecute()`
- var/varip state management
- All statement types (if, for, while, switch, return, break, continue, assignments)
- All expression types (binary, unary, ternary, call, member, index, array literal, lambda, if/switch expressions)
- Metadata extraction for `indicator()` / `strategy()`
- Input call generation → `__rt.getInput(id)`
- Plot/hline/fill/bgcolor/barcolor/plotshape/plotchar/plotarrow/plotcandle/plotbar
- Full function mapping for ta.*, math.*, str.*, array.*, color.*, strategy.*, barstate.*
- Built-in variable mapping (open, high, low, close, volume, time, bar_index, hl2, hlc3, ohlc4)
- Series history for builtin variables: `close[1]` → `__rt.series("close").get(1)`

---

## What's Missing

### 1. Drawing Object Codegen — P0

**Pine Script syntax:**
```pine
myLine = line.new(x1, y1, x2, y2, xloc=xloc.bar_time, color=color.red)
line.delete(myLine)
line.set_y1(myLine, newY)
line.set_xy1(myLine, newX, newY)
```

**Benchmark usage:** 171 drawing object calls (line.new, line.delete, line.set_*, label.new, label.delete, box.new, box.delete, box.set_*).

**Current behavior:** `line.new(...)` gets mapped as a generic member expression call since `line` is not a recognized namespace in `genMember()`. It would generate `line.new(...)` literally, which fails at runtime.

**Implementation:**
- In `genMember()`, add handlers for `line`, `label`, `box`, `table` namespaces → `__rt.line.*`, `__rt.label.*`, `__rt.box.*`, `__rt.table.*`
- In `function-mapper.ts`, add function mappings:
  ```
  'line.new': '__rt.line.new',
  'line.delete': '__rt.line.delete',
  'line.set_y1': '__rt.line.setY1',
  'line.set_y2': '__rt.line.setY2',
  'line.set_x1': '__rt.line.setX1',
  'line.set_x2': '__rt.line.setX2',
  'line.set_xy1': '__rt.line.setXy1',
  'line.set_xy2': '__rt.line.setXy2',
  'line.get_x1': '__rt.line.getX1',
  'line.get_x2': '__rt.line.getX2',
  // ... similar for label, box, table
  ```

**Files to modify:**
- `src/compiler/codegen/generator.ts` — add `line`, `label`, `box`, `table` namespace handling in `genMember()`
- `src/compiler/codegen/function-mapper.ts` — add all drawing function mappings

---

### 2. User Variable Series History — P0

**Pine Script syntax:**
```pine
myVar = close * 2
prevMyVar = myVar[1]    // history reference on user variable
delta = myVar - myVar[1]
```

**Benchmark usage:** 100+ history references on user variables (`ses[1]`, `tfClose[1]`, `time[1]`, custom variables).

**Current behavior:** In `genIndex()`, only builtin variables (`open`, `close`, etc.) are recognized for series access via `__rt.series("name").get(n)`. User variable `myVar[1]` generates `myVar[1]`, which is a JS array index — not series history.

**Implementation:**
- This requires the codegen to wrap user variables that use history access in Series objects
- See spec 09 for full implementation plan
- Codegen changes: detect `IndexExpression` where object is a user variable, generate `__rt.userSeries("myVar").get(n)`

**Files to modify:**
- `src/compiler/codegen/generator.ts` — extend `genIndex()` for user variable history

---

### 3. TypeDeclaration Codegen — P1

**Pine Script syntax:**
```pine
type PriceLevel
    float price = 0.0
    string label_text = ""
    color clr = color.blue

lvl = PriceLevel.new(price=100.0, label_text="Support")
lvl.price := 105.0
```

**Current behavior:** TypeDeclaration is in the AST but the codegen skips it (`default: break` in `generateStatement()`).

**Implementation:**
- Generate a constructor function for UDTs:
  ```js
  function PriceLevel(price, label_text, clr) {
      return { price: price !== undefined ? price : 0.0, label_text: ..., clr: ... };
  }
  ```
- `PriceLevel.new(...)` should map to the constructor
- Field access generates normal JS property access

**Files to modify:**
- `src/compiler/codegen/generator.ts` — implement `genTypeDecl()`

---

### 4. MethodDeclaration Codegen — P1

**Pine Script syntax:**
```pine
method myMethod(float[] self, float val) =>
    self.push(val)
```

**Current behavior:** MethodDeclaration is in the AST but skipped by codegen.

**Implementation:**
- Generate as a function that takes `self` as first parameter:
  ```js
  function myMethod(self, val) {
      __rt.array.push(self, val);
  }
  ```
- Register the method for method-syntax dispatch (see spec 12)

**Files to modify:**
- `src/compiler/codegen/generator.ts` — implement `genMethodDecl()`

---

### 5. Time Function Codegen — P0

**Pine Script syntax:**
```pine
h = hour(time, "America/New_York")
m = minute(time)
dow = dayofweek(time)
tc = time_close
```

**Benchmark usage:** Extensive use of `hour()`, `minute()`, `dayofweek()` for session detection.

**Current behavior:** `hour`, `minute`, `dayofweek` are not in the function mapper. They would be emitted as-is, which fails at runtime.

**Implementation:**
- Add function mappings:
  ```
  'hour': '__rt.hour',
  'minute': '__rt.minute',
  'second': '__rt.second',
  'dayofweek': '__rt.dayofweek',
  'dayofmonth': '__rt.dayofmonth',
  'month': '__rt.month',
  'year': '__rt.year',
  'timestamp': '__rt.timestamp',
  ```
- Add `time_close` and `timenow` as builtin variables

**Files to modify:**
- `src/compiler/codegen/function-mapper.ts` — add time function and variable mappings
- `src/compiler/codegen/generator.ts` — potentially handle `time_close` in `genIdentifier()`

---

### 6. `str.format_time()` Codegen — P0

**Pine Script syntax:**
```pine
str.format_time(time, "HH:mm", "America/New_York")
```

**Benchmark usage:** 10 calls.

**Current behavior:** `str.format_time` is not in the function mapper.

**Implementation:**
- Add to function-mapper.ts: `'str.format_time': '__rt.str.formatTime'`

**Files to modify:**
- `src/compiler/codegen/function-mapper.ts`

---

### 7. `timeframe.in_seconds()` Codegen — P0

**Pine Script syntax:**
```pine
tfSeconds = timeframe.in_seconds()
tfSeconds = timeframe.in_seconds("60")
```

**Benchmark usage:** 5 calls.

**Current behavior:** `timeframe.in_seconds` is not in the function mapper.

**Implementation:**
- Add: `'timeframe.in_seconds': '__rt.timeframe.inSeconds'`

**Files to modify:**
- `src/compiler/codegen/function-mapper.ts`

---

### 8. Named Arguments Dropped in genArgs — P1

**Current behavior:** The `genArgs()` method discards named argument names:
```ts
private genArgs(args: CallArgument[]): string {
    return args.map(arg => this.genExpr(arg.value)).join(', ');
}
```

This means `line.new(x1=bar_index, y1=close, ...)` passes values positionally. This works for most builtins where argument order is consistent, but fails when named args are passed out of order.

**Implementation:**
- For drawing object constructors and other functions with many parameters, preserve named args or reorder to match expected positional order
- Alternatively, pass as an options object: `__rt.line.new({ x1: ..., y1: ..., x2: ..., y2: ... })`

**Files to modify:**
- `src/compiler/codegen/generator.ts` — modify drawing call generation to preserve names

---

## Acceptance Criteria

1. `line.new(x1, y1, x2, y2)` generates `__rt.line.new(x1, y1, x2, y2)`
2. `line.delete(l)` generates `__rt.line.delete(l)`
3. `myVar[1]` generates proper series history access
4. `type MyType ... end` generates a constructor function
5. `hour(time, tz)` generates `__rt.hour(time, tz)`
6. `str.format_time(...)` generates `__rt.str.formatTime(...)`
7. `timeframe.in_seconds()` generates `__rt.timeframe.inSeconds()`
8. All 65 existing codegen tests continue to pass
9. At least 10 new tests for drawing object and time function codegen
