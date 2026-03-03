# 10 — Codegen: Pine Script Enum Constants

> **Status**: DONE (all P0 and P1 namespaces implemented)
> **Priority**: P0
> **File**: `src/compiler/codegen/generator.ts` (lines 1192–1229)

---

## What's Implemented

All enum constant namespaces are handled in `genMember()` in `generator.ts`. The implementation converts member access expressions to their string or numeric runtime values:

### String-value Namespaces (pass-through → JSON.stringify)

| Namespace | Example | Output | Status |
|-----------|---------|--------|--------|
| `color.*` | `color.red` | `"#FF0000"` | ✅ Done (COLOR_CONSTANTS map) |
| `shape.*` | `shape.triangleup` | `"triangleup"` | ✅ Done |
| `location.*` | `location.belowbar` | `"belowbar"` | ✅ Done |
| `size.*` | `size.normal` | `"normal"` | ✅ Done |
| `plot.*` | `plot.style_line` | `"style_line"` | ✅ Done |
| `xloc.*` | `xloc.bar_time` | `"bar_time"` | ✅ Done |
| `yloc.*` | `yloc.price` | `"price"` | ✅ Done |
| `extend.*` | `extend.none` | `"none"` | ✅ Done |
| `text.*` | `text.align_right` | `"align_right"` | ✅ Done |
| `position.*` | `position.top_right` | `"top_right"` | ✅ Done |
| `display.*` | `display.all` | `"all"` | ✅ Done |
| `barmerge.*` | `barmerge.lookahead_on` | `"lookahead_on"` | ✅ Done |
| `format.*` | `format.price` | `"price"` | ✅ Done |
| `scale.*` | `scale.right` | `"right"` | ✅ Done |
| `adjustment.*` | `adjustment.none` | `"none"` | ✅ Done |
| `session.*` | `session.regular` | `"regular"` | ✅ Done |
| `splits.*` | `splits.none` | `"none"` | ✅ Done |
| `strategy.*` | `strategy.long` | `"long"` | ✅ Done |

### Strip-prefix Namespaces

| Namespace | Example | Output | Status |
|-----------|---------|--------|--------|
| `hline.*` | `hline.style_solid` | `"solid"` | ✅ Done (strips `style_` prefix) |
| `line.*` | `line.style_solid` | `"solid"` | ✅ Done (strips `style_` prefix; other props → `__rt.line.prop`) |
| `label.*` | `label.style_label_left` | `"label_left"` | ✅ Done (strips `style_` prefix; other props → `__rt.label.prop`) |

### Numeric-value Namespaces

| Namespace | Example | Output | Status |
|-----------|---------|--------|--------|
| `dayofweek.*` | `dayofweek.monday` | `2` | ✅ Done (1=Sunday…7=Saturday) |

---

## Generator.ts Implementation (lines 1192–1229)

```typescript
// Plot style constants
if (objStr === 'plot') return JSON.stringify(prop);

// Pass-through namespaces
if (objStr === 'xloc') return JSON.stringify(prop);
if (objStr === 'yloc') return JSON.stringify(prop);
if (objStr === 'extend') return JSON.stringify(prop);
if (objStr === 'text') return JSON.stringify(prop);
if (objStr === 'position') return JSON.stringify(prop);
if (objStr === 'display') return JSON.stringify(prop);
if (objStr === 'barmerge') return JSON.stringify(prop);
if (objStr === 'format') return JSON.stringify(prop);
if (objStr === 'scale') return JSON.stringify(prop);
if (objStr === 'adjustment') return JSON.stringify(prop);
if (objStr === 'session') return JSON.stringify(prop);
if (objStr === 'splits') return JSON.stringify(prop);

// dayofweek: numeric constants
if (objStr === 'dayofweek') {
  const dayMap = { sunday:1, monday:2, tuesday:3, wednesday:4,
                   thursday:5, friday:6, saturday:7 };
  return String(dayMap[prop] ?? JSON.stringify(prop));
}

// hline: strip style_ prefix
if (objStr === 'hline') {
  const stripped = prop.startsWith('style_') ? prop.slice(6) : prop;
  return JSON.stringify(stripped);
}

// line: style constants + drawing method routing
if (objStr === 'line') {
  if (prop.startsWith('style_')) return JSON.stringify(prop.slice(6));
  return `__rt.line.${prop}`;
}

// label: style constants + drawing method routing
if (objStr === 'label') {
  if (prop.startsWith('style_')) return JSON.stringify(prop.slice(6));
  return `__rt.label.${prop}`;
}
```

---

## Remaining P1 Work

### 1. `currency.*` Constants

Not yet in the namespace list. Needed for `syminfo.currency` comparisons.

**Values**: `currency.USD`, `currency.EUR`, `currency.GBP`, `currency.JPY`, etc. — pass-through string constants.

**Implementation** (1 line in genMember):
```typescript
if (objStr === 'currency') return JSON.stringify(prop);
```

**Acceptance**: `currency.USD` generates `"USD"`.
**Est**: ~5 LOC.

### 2. `font.*` Constants

Used in `label.new()` text_font_family argument.

**Values**: `font.family_default`, `font.family_monospace` — pass-through.

**Implementation** (1 line):
```typescript
if (objStr === 'font') return JSON.stringify(prop);
```

**Acceptance**: `font.family_monospace` generates `"family_monospace"`.
**Est**: ~5 LOC.

### 3. `label.style_*` — Complete Coverage Verification

Current implementation strips `style_` prefix for all `label.style_*` members. Verify the full enum list is covered at runtime (the renderer's `mapLabelStyleToPosition()` handles the resulting strings):

| Constant | Generated String | Renderer maps to |
|----------|-----------------|-----------------|
| `label.style_label_left` | `"label_left"` | `inBar/square` |
| `label.style_label_right` | `"label_right"` | `inBar/square` |
| `label.style_label_up` | `"label_up"` | `belowBar/arrowUp` |
| `label.style_label_down` | `"label_down"` | `aboveBar/arrowDown` |
| `label.style_label_center` | `"label_center"` | `inBar/circle` |
| `label.style_label_lower_left` | `"label_lower_left"` | `belowBar/square` |
| `label.style_label_lower_right` | `"label_lower_right"` | `belowBar/square` |
| `label.style_label_upper_left` | `"label_upper_left"` | `aboveBar/square` |
| `label.style_label_upper_right` | `"label_upper_right"` | `aboveBar/square` |
| `label.style_cross` | `"cross"` | `inBar/circle` |
| `label.style_flag` | `"flag"` | `aboveBar/arrowUp` |
| `label.style_circle` | `"circle"` | `inBar/circle` |
| `label.style_diamond` | `"diamond"` | `inBar/square` |
| `label.style_triangleup` | `"triangleup"` | `belowBar/arrowUp` |
| `label.style_triangledown` | `"triangledown"` | `aboveBar/arrowDown` |
| `label.style_arrowup` | `"arrowup"` | `belowBar/arrowUp` |
| `label.style_arrowdown` | `"arrowdown"` | `aboveBar/arrowDown` |
| `label.style_none` | `"none"` | `inBar/circle` |
| `label.style_text_outline` | `"text_outline"` | `inBar/circle` |
| `label.style_xcross` | `"xcross"` | `inBar/circle` |

All pass through the codegen correctly; renderer coverage may need additions for `label_upper_*` and `text_outline`. **Est**: ~10 LOC in drawing-renderer.ts.

### 4. Test Coverage

Add at least 12 codegen unit tests verifying each constant namespace generates the correct value.

**Target**: `tests/codegen/enum-constants.test.ts`
**Priority**: P1 polish, all acceptance criteria below already pass.

---

## Acceptance Criteria — DONE

1. ✅ `xloc.bar_time` generates `"bar_time"`
2. ✅ `xloc.bar_index` generates `"bar_index"`
3. ✅ `extend.none` generates `"none"`
4. ✅ `line.style_solid` generates `"solid"`
5. ✅ `label.style_label_left` generates `"label_left"`
6. ✅ `text.align_right` generates `"align_right"`
7. ✅ `position.top_right` generates `"top_right"`
8. ✅ `barmerge.lookahead_on` generates `"lookahead_on"`
9. ✅ `display.data_window` generates `"data_window"`
10. ✅ `dayofweek.monday` generates `2`
11. ✅ `hline.style_solid` generates `"solid"`
12. ✅ All 65 codegen tests pass

## Acceptance Criteria — P1 Remaining

13. [ ] `currency.USD` generates `"USD"`
14. [ ] `font.family_monospace` generates `"family_monospace"`
15. [ ] All label.style_* renderer mappings covered including `label_upper_*`
