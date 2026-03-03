# 10 — Codegen: Pine Script Enum Constants

> **Status**: PARTIAL (color.*, shape.*, location.*, size.*, plot.*, strategy.* handled)
> **Priority**: P0 (76+ xloc.bar_time references in benchmark alone)
> **File**: `src/compiler/codegen/generator.ts`

---

## What Exists

The codegen handles these namespaced constants by converting member access to string literals:

```typescript
// In genMember():
if (objStr === 'shape') return JSON.stringify(prop);      // shape.triangleup → "triangleup"
if (objStr === 'location') return JSON.stringify(prop);    // location.belowbar → "belowbar"
if (objStr === 'size') return JSON.stringify(prop);        // size.normal → "normal"
if (objStr === 'plot') return JSON.stringify(prop);        // plot.style_line → "style_line"
if (objStr === 'strategy') {
    if (prop === 'long' || prop === 'short') return JSON.stringify(prop);
}
```

Color constants are mapped to hex values via `COLOR_CONSTANTS`.

---

## What's Missing

### 1. `xloc.*` Constants — P0

**Pine Script syntax:**
```pine
line.new(x1, y1, x2, y2, xloc=xloc.bar_time)
line.new(x1, y1, x2, y2, xloc=xloc.bar_index)
```

**Benchmark usage:** 76 references to `xloc.bar_time`.

**Values:**
| Constant | String Value |
|----------|-------------|
| `xloc.bar_index` | `"bar_index"` |
| `xloc.bar_time` | `"bar_time"` |

**Implementation:**
```typescript
if (objStr === 'xloc') return JSON.stringify(prop);
```

---

### 2. `yloc.*` Constants — P0

**Values:**
| Constant | String Value |
|----------|-------------|
| `yloc.price` | `"price"` |
| `yloc.abovebar` | `"abovebar"` |
| `yloc.belowbar` | `"belowbar"` |

**Implementation:**
```typescript
if (objStr === 'yloc') return JSON.stringify(prop);
```

---

### 3. `extend.*` Constants — P0

**Pine Script syntax:**
```pine
line.new(x1, y1, x2, y2, extend=extend.none)
line.new(x1, y1, x2, y2, extend=extend.right)
```

**Benchmark usage:** 6 references to `extend.none`.

**Values:**
| Constant | String Value |
|----------|-------------|
| `extend.none` | `"none"` |
| `extend.left` | `"left"` |
| `extend.right` | `"right"` |
| `extend.both` | `"both"` |

**Implementation:**
```typescript
if (objStr === 'extend') return JSON.stringify(prop);
```

---

### 4. `line.style_*` Constants — P0

**Pine Script syntax:**
```pine
line.new(x1, y1, x2, y2, style=line.style_solid)
line.new(x1, y1, x2, y2, style=line.style_dashed)
```

**Benchmark usage:** `line.style_solid` (27), `line.style_dotted` (25), `line.style_dashed` (19).

**Values:**
| Constant | String Value |
|----------|-------------|
| `line.style_solid` | `"solid"` |
| `line.style_dotted` | `"dotted"` |
| `line.style_dashed` | `"dashed"` |
| `line.style_arrow_left` | `"arrow_left"` |
| `line.style_arrow_right` | `"arrow_right"` |
| `line.style_arrow_both` | `"arrow_both"` |

**Current issue:** `line` is not recognized as a constant namespace in `genMember()`. It gets passed through literally.

**Implementation:**
```typescript
// In genMember(), check for line style constants:
if (objStr === 'line' && prop.startsWith('style_')) {
    return JSON.stringify(prop.replace('style_', ''));
}
```

Or more cleanly, define a set of known line constants:
```typescript
const LINE_CONSTANTS: Record<string, string> = {
    'line.style_solid': 'solid',
    'line.style_dotted': 'dotted',
    'line.style_dashed': 'dashed',
    'line.style_arrow_left': 'arrow_left',
    'line.style_arrow_right': 'arrow_right',
    'line.style_arrow_both': 'arrow_both',
};
```

---

### 5. `label.style_*` Constants — P0

**Benchmark usage:** `label.style_label_left` (6), `label.style_label_up` (2), `label.style_label_right` (1), `label.style_label_down` (1).

**Values:**
| Constant | String Value |
|----------|-------------|
| `label.style_none` | `"none"` |
| `label.style_label_left` | `"label_left"` |
| `label.style_label_right` | `"label_right"` |
| `label.style_label_up` | `"label_up"` |
| `label.style_label_down` | `"label_down"` |
| `label.style_label_center` | `"label_center"` |
| `label.style_label_lower_left` | `"label_lower_left"` |
| `label.style_label_lower_right` | `"label_lower_right"` |
| `label.style_cross` | `"cross"` |
| `label.style_flag` | `"flag"` |
| `label.style_circle` | `"circle"` |
| `label.style_square` | `"square"` |
| `label.style_diamond` | `"diamond"` |
| `label.style_triangleup` | `"triangleup"` |
| `label.style_triangledown` | `"triangledown"` |
| `label.style_arrowup` | `"arrowup"` |
| `label.style_arrowdown` | `"arrowdown"` |
| `label.style_text_outline` | `"text_outline"` |
| `label.style_xcross` | `"xcross"` |

---

### 6. `text.align_*` Constants — P0

**Benchmark usage:** `text.align_right` (42), `text.align_center` (10).

**Values:**
| Constant | String Value |
|----------|-------------|
| `text.align_left` | `"left"` |
| `text.align_center` | `"center"` |
| `text.align_right` | `"right"` |

**Implementation:**
```typescript
if (objStr === 'text') return JSON.stringify(prop.replace('align_', ''));
```

---

### 7. `position.*` Constants — P1

**Pine Script syntax:**
```pine
t = table.new(position.top_right, 5, 10)
```

**Values:**
| Constant | String Value |
|----------|-------------|
| `position.top_left` | `"top_left"` |
| `position.top_center` | `"top_center"` |
| `position.top_right` | `"top_right"` |
| `position.middle_left` | `"middle_left"` |
| `position.middle_center` | `"middle_center"` |
| `position.middle_right` | `"middle_right"` |
| `position.bottom_left` | `"bottom_left"` |
| `position.bottom_center` | `"bottom_center"` |
| `position.bottom_right` | `"bottom_right"` |

**Implementation:**
```typescript
if (objStr === 'position') return JSON.stringify(prop);
```

---

### 8. `display.*` Constants — P1

**Benchmark usage:** `display.data_window` (11).

**Values:**
| Constant | String Value |
|----------|-------------|
| `display.none` | `"none"` |
| `display.all` | `"all"` |
| `display.data_window` | `"data_window"` |
| `display.pane` | `"pane"` |
| `display.price_scale` | `"price_scale"` |
| `display.status_line` | `"status_line"` |

**Implementation:**
```typescript
if (objStr === 'display') return JSON.stringify(prop);
```

---

### 9. `barmerge.*` Constants — P0

**Benchmark usage:** `barmerge.lookahead_on` (7).

**Values:**
| Constant | String Value |
|----------|-------------|
| `barmerge.lookahead_on` | `"lookahead_on"` |
| `barmerge.lookahead_off` | `"lookahead_off"` |
| `barmerge.gaps_on` | `"gaps_on"` |
| `barmerge.gaps_off` | `"gaps_off"` |

**Implementation:**
```typescript
if (objStr === 'barmerge') return JSON.stringify(prop);
```

---

### 10. `hline.style_*` Constants — P1

**Values:**
| Constant | String Value |
|----------|-------------|
| `hline.style_solid` | `"solid"` |
| `hline.style_dotted` | `"dotted"` |
| `hline.style_dashed` | `"dashed"` |

---

### 11. `dayofweek.*` Constants — P0

**Values:**
| Constant | Numeric Value |
|----------|--------------|
| `dayofweek.sunday` | `1` |
| `dayofweek.monday` | `2` |
| `dayofweek.tuesday` | `3` |
| `dayofweek.wednesday` | `4` |
| `dayofweek.thursday` | `5` |
| `dayofweek.friday` | `6` |
| `dayofweek.saturday` | `7` |

**Implementation:**
```typescript
const DAYOFWEEK_CONSTANTS: Record<string, number> = {
    'dayofweek.sunday': 1, 'dayofweek.monday': 2, 'dayofweek.tuesday': 3,
    'dayofweek.wednesday': 4, 'dayofweek.thursday': 5,
    'dayofweek.friday': 6, 'dayofweek.saturday': 7,
};
if (objStr === 'dayofweek') return String(DAYOFWEEK_CONSTANTS[fullName] ?? 0);
```

---

## Unified Implementation

Add a single check in `genMember()` for all constant namespaces:

```typescript
const CONSTANT_NAMESPACES = new Set([
    'xloc', 'yloc', 'extend', 'position', 'display',
    'barmerge', 'text', 'hline',
]);

if (CONSTANT_NAMESPACES.has(objStr)) {
    return JSON.stringify(prop);
}

// Special: line.style_*, label.style_* (strip prefix for cleaner values)
if (objStr === 'line' && prop.startsWith('style_')) {
    return JSON.stringify(prop.replace('style_', ''));
}
if (objStr === 'label' && prop.startsWith('style_')) {
    return JSON.stringify(prop.replace('style_', ''));
}

// Numeric constants
if (objStr === 'dayofweek') {
    const val = { sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
                  thursday: 5, friday: 6, saturday: 7 }[prop];
    return String(val ?? 0);
}
```

---

## Acceptance Criteria

1. `xloc.bar_time` generates `"bar_time"`
2. `xloc.bar_index` generates `"bar_index"`
3. `extend.none` generates `"none"`
4. `line.style_solid` generates `"solid"`
5. `label.style_label_left` generates `"label_left"`
6. `text.align_right` generates `"right"`
7. `position.top_right` generates `"top_right"`
8. `barmerge.lookahead_on` generates `"lookahead_on"`
9. `display.data_window` generates `"data_window"`
10. `dayofweek.monday` generates `2`
11. All 65 existing codegen tests continue to pass
12. At least 12 new tests covering all constant namespaces
