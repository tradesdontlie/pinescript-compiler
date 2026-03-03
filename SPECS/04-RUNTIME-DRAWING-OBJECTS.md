# 04 — Runtime: Drawing Objects

> **Status**: COMPLETE (P0 DONE)
> **Priority**: P0 DONE — All drawing objects implemented
> **Files**: `src/runtime/builtins/line.ts`, `src/runtime/builtins/label.ts`, `src/runtime/builtins/box.ts`, `src/runtime/builtins/table.ts`

---

## What's Implemented

All four drawing object types are fully implemented with factory functions, mutable properties, getters/setters, copy, and soft-delete via `_deleted` flag.

### line.ts — DONE

**Interface:**
```typescript
interface LineObject {
  id: number;
  x1, y1, x2, y2: number;
  xloc: string;       // 'bar_index' | 'bar_time'
  extend: string;     // 'none' | 'left' | 'right' | 'both'
  color: string;
  style: string;      // 'solid' | 'dotted' | 'dashed' | ...
  width: number;
  _deleted: boolean;
}
```

**Methods implemented:** `new`, `delete`, `set_x1`, `set_y1`, `set_x2`, `set_y2`, `set_xy1`, `set_xy2`, `set_xloc`, `set_extend`, `set_color`, `set_style`, `set_width`, `get_x1`, `get_y1`, `get_x2`, `get_y2`, `get_price`, `copy`

**Getter:** `all` — returns active (non-deleted) lines array for renderer.

**Defaults:** xloc=`bar_index`, extend=`none`, color=`#2962FF`, style=`solid`, width=1.

---

### label.ts — DONE

**Interface:**
```typescript
interface LabelObject {
  id: number;
  x, y: number;
  xloc, yloc: string;   // yloc: 'price' | 'abovebar' | 'belowbar'
  text, tooltip: string;
  color, textcolor: string;
  style: string;         // 'label_down' | 'label_up' | 'label_left' | 'label_right' | etc.
  size: string;          // 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto'
  textalign: string;     // 'left' | 'center' | 'right'
  _deleted: boolean;
}
```

**Methods implemented:** `new`, `delete`, `set_x`, `set_y`, `set_xy`, `set_xloc`, `set_yloc`, `set_text`, `set_tooltip`, `set_color`, `set_textcolor`, `set_style`, `set_size`, `set_textalign`, `get_x`, `get_y`, `get_text`, `copy`

**Defaults:** xloc=`bar_index`, yloc=`price`, color=`#2962FF`, textcolor=`#FFFFFF`, style=`label_down`, size=`normal`, textalign=`center`.

---

### box.ts — DONE

**Interface:**
```typescript
interface BoxObject {
  id: number;
  left, top, right, bottom: number;
  xloc, extend: string;
  bgcolor, border_color: string;
  border_width: number;
  border_style: string;
  text, text_color, text_size, text_halign, text_valign: string;
  _deleted: boolean;
}
```

**Methods implemented:** `new`, `delete`, `set_left`, `set_top`, `set_right`, `set_bottom`, `set_lefttop`, `set_rightbottom`, `set_bgcolor`, `set_border_color`, `set_border_width`, `set_border_style`, `set_extend`, `set_text`, `set_text_color`, `set_text_size`, `set_text_halign`, `set_text_valign`, `get_left`, `get_top`, `get_right`, `get_bottom`, `copy`

**Defaults:** xloc=`bar_index`, extend=`none`, bgcolor=`#2962FF33`, border_color=`#2962FF`, border_width=1, border_style=`solid`, text=`''`, text_color=`#000000`, text_size=`auto`.

---

### table.ts — DONE

**Interfaces:**
```typescript
interface TableCell {
  text, bgcolor, text_color, text_size, text_halign, text_valign, tooltip: string;
  colspan, rowspan: number;
}

interface TableObject {
  id: number;
  position: string;
  columns, rows: number;
  bgcolor, border_color: string;
  border_width: number;
  frame_color: string;
  frame_width: number;
  cells: (TableCell | null)[][];
  _deleted: boolean;
}
```

**Methods implemented:** `new`, `cell` (set cell text+style), `merge_cells`, `delete`, `clear`, `set_bgcolor`, `set_border_color`, `set_border_width`, `set_frame_color`, `set_frame_width`, `set_position`, `cell_set_text`, `cell_set_bgcolor`, `cell_set_text_color`, `cell_set_text_size`, `cell_set_text_halign`, `cell_set_text_valign`, `cell_set_tooltip`

**Getter:** `all` — returns active tables for renderer.

**Cell management:** Lazy cell creation via `ensureCell()`. Out-of-bounds throws a descriptive error. `merge_cells()` sets colspan/rowspan on start cell and nulls merged cells.

---

## Acceptance Criteria — ALL MET

- [x] `line.new(x1, y1, x2, y2)` creates a line with correct properties
- [x] `line.set_y1(l, y)` modifies the line's y1 coordinate
- [x] `line.delete(l)` marks the line deleted (not returned by `all`)
- [x] `line.get_x1(l)` returns the correct x1 value
- [x] `label.new(x, y, "Hello")` creates a label with correct text
- [x] `box.new(left, top, right, bottom)` creates a box with correct bounds
- [x] `table.new(position, cols, rows)` creates a table with correct dimensions
- [x] `table.cell(t, col, row, text="X")` sets cell content
- [x] Drawing objects persist across bars until explicitly deleted
- [x] 20+ tests covering line, label, box, and table operations

---

## P1 Remaining Work

### 1. `line.get_price(line, x)` — DONE
Already implemented: interpolates y from x using the line equation.

### 2. `table.cell_set_width` / `cell_set_height` — P1 (not in Pine v5, added in v6)

Pine v6 adds per-cell width/height:
```pine
table.cell_set_width(myTable, col, row, width)
table.cell_set_height(myTable, col, row, height)
```

**Implementation:** Add `width` and `height` fields to `TableCell` (already have `colspan`/`rowspan`). Add `cell_set_width` and `cell_set_height` methods to the table module.

### 3. `line.style_*` / `label.style_*` Constants — P1 (codegen)

The enum constants for drawing styles need to be routed in codegen:
```typescript
// In genMember():
if (objStr === 'line') {
  // style constants: line.style_solid → 'solid', line.style_dashed → 'dashed', etc.
  if (prop.startsWith('style_')) return JSON.stringify(prop.replace('style_', ''));
}
if (objStr === 'label') {
  if (prop.startsWith('style_')) return JSON.stringify(prop.replace('style_', ''));
}
```

### 4. Drawing Object Reset Per Run — P1

Currently the factory functions use closures with persistent state. The engine must reset drawing objects between script executions. Either:
- Call a `reset()` method exposed from each module, or
- Re-create the modules via factory functions on each run.

**Recommendation:** Add explicit `reset()` to each module factory return. Wire in `engine.ts` before each execution.

### 5. Max Lines/Labels/Boxes Limit — P2

Pine enforces max 500 lines, 500 labels, 500 boxes per chart. Currently no limit is enforced. Add optional `maxObjects` parameter to each factory for spec compliance.

---

## Notes on Architecture

- Modules use factory-function pattern (`createLineModule()`) rather than singleton objects. This simplifies reset between runs.
- `_deleted` flag instead of immediate removal allows the renderer to detect deletions in the same bar they occur.
- The `all` getter filters deleted objects — renderer should use this after each bar.
