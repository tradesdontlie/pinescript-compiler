# 04 — Runtime: Drawing Objects

> **Status**: NOT STARTED
> **Priority**: P0 (BIGGEST GAP — 443 calls in benchmark)
> **Files to create**: `src/runtime/builtins/line.ts`, `src/runtime/builtins/label.ts`, `src/runtime/builtins/box.ts`, `src/runtime/builtins/table.ts`

---

## What Exists

Nothing. Drawing objects (line, label, box, table) are entirely unimplemented in the runtime. The renderer has no support for drawing objects either.

---

## What's Missing

### Overview of Benchmark Usage

| Object | Calls | Operations |
|--------|-------|------------|
| line | 172 | new, delete, set_y1, set_y2, set_x1, set_x2, set_xy1, set_xy2, get_x1, get_x2, style_solid, style_dotted, style_dashed |
| label | 56 | new, delete, set_xy, set_text, style_label_left, style_label_right, style_label_up, style_label_down |
| box | 98 | new, delete, set_right, set_left, set_top, set_bottom, set_border_color, get_left |
| table | 102 | new, cell, merge_cells |

---

### 1. Line Object — P0

**Pine Script syntax:**
```pine
// Create
myLine = line.new(x1, y1, x2, y2, xloc=xloc.bar_time, extend=extend.none,
                  color=color.red, style=line.style_solid, width=1)

// Modify
line.set_y1(myLine, newY)
line.set_y2(myLine, newY)
line.set_x1(myLine, newX)
line.set_x2(myLine, newX)
line.set_xy1(myLine, newX, newY)
line.set_xy2(myLine, newX, newY)
line.set_color(myLine, color.blue)
line.set_style(myLine, line.style_dashed)
line.set_width(myLine, 2)
line.set_extend(myLine, extend.right)

// Query
x1Val = line.get_x1(myLine)
x2Val = line.get_x2(myLine)
y1Val = line.get_y1(myLine)
y2Val = line.get_y2(myLine)

// Delete
line.delete(myLine)

// Copy
newLine = line.copy(myLine)
```

**Implementation — `src/runtime/builtins/line.ts`:**

```typescript
interface LineObject {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  xloc: string;       // 'bar_index' | 'bar_time'
  extend: string;     // 'none' | 'left' | 'right' | 'both'
  color: string;
  style: string;      // 'solid' | 'dotted' | 'dashed' | 'arrow_left' | 'arrow_right' | 'arrow_both'
  width: number;
  deleted: boolean;
}

export const lineModule = {
  _lines: new Map<number, LineObject>(),
  _nextId: 0,

  new(x1, y1, x2, y2, opts?): LineObject { ... },
  delete(line: LineObject): void { ... },
  set_y1(line: LineObject, y: number): void { ... },
  set_y2(line: LineObject, y: number): void { ... },
  set_x1(line: LineObject, x: number): void { ... },
  set_x2(line: LineObject, x: number): void { ... },
  set_xy1(line: LineObject, x: number, y: number): void { ... },
  set_xy2(line: LineObject, x: number, y: number): void { ... },
  set_color(line: LineObject, clr: string): void { ... },
  set_style(line: LineObject, style: string): void { ... },
  set_width(line: LineObject, w: number): void { ... },
  set_extend(line: LineObject, ext: string): void { ... },
  get_x1(line: LineObject): number { ... },
  get_x2(line: LineObject): number { ... },
  get_y1(line: LineObject): number { ... },
  get_y2(line: LineObject): number { ... },
  copy(line: LineObject): LineObject { ... },

  // Internal: get all active lines for rendering
  getAll(): LineObject[] { ... },
  // Internal: reset between runs
  reset(): void { ... },
};
```

---

### 2. Label Object — P0

**Pine Script syntax:**
```pine
myLabel = label.new(x, y, text="Hello", xloc=xloc.bar_time,
                    yloc=yloc.price, color=color.blue,
                    style=label.style_label_left, textcolor=color.white,
                    size=size.small, textalign=text.align_center)

label.set_xy(myLabel, newX, newY)
label.set_text(myLabel, "New text")
label.set_color(myLabel, color.green)
label.set_textcolor(myLabel, color.black)
label.set_style(myLabel, label.style_label_up)
label.set_size(myLabel, size.normal)
label.set_tooltip(myLabel, "tooltip text")

label.delete(myLabel)
```

**Implementation — `src/runtime/builtins/label.ts`:**

```typescript
interface LabelObject {
  id: number;
  x: number;
  y: number;
  text: string;
  xloc: string;        // 'bar_index' | 'bar_time'
  yloc: string;        // 'price' | 'abovebar' | 'belowbar'
  color: string;
  style: string;       // 'label_left', 'label_right', 'label_up', 'label_down', etc.
  textcolor: string;
  size: string;        // 'tiny', 'small', 'normal', 'large', 'huge', 'auto'
  textalign: string;   // 'left', 'center', 'right'
  tooltip: string;
  deleted: boolean;
}

export const labelModule = {
  _labels: new Map<number, LabelObject>(),
  _nextId: 0,

  new(x, y, opts?): LabelObject { ... },
  delete(label: LabelObject): void { ... },
  set_xy(label, x, y): void { ... },
  set_x(label, x): void { ... },
  set_y(label, y): void { ... },
  set_text(label, text): void { ... },
  set_color(label, clr): void { ... },
  set_textcolor(label, clr): void { ... },
  set_style(label, style): void { ... },
  set_size(label, size): void { ... },
  set_tooltip(label, text): void { ... },
  set_textalign(label, align): void { ... },
  get_x(label): number { ... },
  get_y(label): number { ... },
  get_text(label): string { ... },
  copy(label): LabelObject { ... },

  getAll(): LabelObject[] { ... },
  reset(): void { ... },
};
```

---

### 3. Box Object — P0

**Pine Script syntax:**
```pine
myBox = box.new(left, top, right, bottom, border_color=color.blue,
                border_width=1, border_style=line.style_solid,
                bgcolor=color.new(color.blue, 80), xloc=xloc.bar_time,
                extend=extend.none, text="", text_size=size.auto,
                text_color=color.white, text_halign=text.align_center,
                text_valign=text.align_center)

box.set_right(myBox, newRight)
box.set_left(myBox, newLeft)
box.set_top(myBox, newTop)
box.set_bottom(myBox, newBottom)
box.set_border_color(myBox, color.red)
box.set_bgcolor(myBox, color.new(color.red, 80))
box.get_left(myBox)
box.get_right(myBox)
box.get_top(myBox)
box.get_bottom(myBox)

box.delete(myBox)
```

**Benchmark usage:** 98 box calls including `box.new` (34), `box.delete` (19), `box.set_right` (16), `box.get_left` (16), `box.set_top` (14), `box.set_bottom` (14), `box.set_left` (9), `box.set_border_color` (2).

**Implementation — `src/runtime/builtins/box.ts`:**

```typescript
interface BoxObject {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  border_color: string;
  border_width: number;
  border_style: string;
  bgcolor: string;
  xloc: string;
  extend: string;
  text: string;
  text_size: string;
  text_color: string;
  text_halign: string;
  text_valign: string;
  deleted: boolean;
}

export const boxModule = {
  // ... similar pattern to line/label
};
```

---

### 4. Table Object — P1

**Pine Script syntax:**
```pine
myTable = table.new(position.top_right, columns=5, rows=10,
                    bgcolor=color.black, border_width=1,
                    border_color=color.gray, frame_width=1,
                    frame_color=color.gray)

table.cell(myTable, column=0, row=0, text="Header",
           text_color=color.white, bgcolor=color.navy,
           text_halign=text.align_center, text_size=size.small)

table.merge_cells(myTable, start_column=0, start_row=0,
                  end_column=2, end_row=0)
```

**Benchmark usage:** 102 table calls (`table.new` 2, `table.cell` 92, `table.merge_cells` 8).

**Implementation — `src/runtime/builtins/table.ts`:**

```typescript
interface TableObject {
  id: number;
  position: string;
  columns: number;
  rows: number;
  bgcolor: string;
  border_width: number;
  border_color: string;
  frame_width: number;
  frame_color: string;
  cells: TableCell[][];
  merges: TableMerge[];
  deleted: boolean;
}

interface TableCell {
  text: string;
  text_color: string;
  text_size: string;
  text_halign: string;
  text_valign: string;
  bgcolor: string;
  tooltip: string;
  width: number;
  height: number;
}

interface TableMerge {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}
```

---

## Integration Requirements

### Runtime Context (src/runtime/context.ts)
- Add `line`, `label`, `box`, `table` modules to `RuntimeContext` interface
- Wire them in `createContext()`
- Expose `getAll()` methods for the renderer to collect drawing data

### Engine (src/runtime/engine.ts)
- Reset drawing object state before each execution
- Collect all active drawing objects in `ExecutionResult`
- Add to ExecutionResult interface: `lines: LineObject[]`, `labels: LabelObject[]`, `boxes: BoxObject[]`, `tables: TableObject[]`

### Codegen (src/compiler/codegen/)
- Add namespace handlers for `line`, `label`, `box`, `table` in `genMember()`
- Add all drawing functions to `function-mapper.ts`
- Handle named arguments properly for drawing constructors (many parameters with defaults)

### Renderer (src/renderer/)
- See spec 11 for rendering implementation

---

## Acceptance Criteria

1. `line.new(x1, y1, x2, y2)` creates a line object with correct properties
2. `line.set_y1(l, y)` modifies the line's y1 coordinate
3. `line.delete(l)` marks the line as deleted (not returned by `getAll()`)
4. `line.get_x1(l)` returns the correct x1 value
5. `label.new(x, y, text="Hello")` creates a label with correct text
6. `box.new(left, top, right, bottom)` creates a box with correct bounds
7. `table.new(position, cols, rows)` creates a table with correct dimensions
8. `table.cell(t, col, row, text="X")` sets cell content
9. Drawing objects persist across bars until explicitly deleted
10. At least 20 tests covering line, label, box, and table operations
