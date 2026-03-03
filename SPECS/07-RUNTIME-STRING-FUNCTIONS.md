# 07 — Runtime: String Functions

> **Status**: COMPLETE (P0 DONE — 17 functions including str.format_time)
> **Priority**: P0 DONE
> **File**: `src/runtime/builtins/str.ts`

---

## What's Implemented

All string functions are on the `str` export object.

### Implemented Functions (17)

| Function | Description |
|----------|-------------|
| `str.tostring(val, fmt?)` | Convert value to string; supports `#.##` decimal format |
| `str.tonumber(s)` | Parse string to number; returns NaN on failure |
| `str.length(s)` | String length |
| `str.lower(s)` | Lowercase |
| `str.upper(s)` | Uppercase |
| `str.contains(s, sub)` | Substring presence check |
| `str.startswith(s, prefix)` | Prefix check |
| `str.endswith(s, suffix)` | Suffix check |
| `str.substring(s, begin, end?)` | Extract substring |
| `str.split(s, sep)` | Split into array |
| `str.trim(s)` | Trim whitespace |
| `str.replace(s, target, repl)` | Replace first occurrence |
| `str.replaceAll(s, target, repl)` | Replace all occurrences |
| `str.match(s, regex)` | Regex test (returns bool) |
| `str.pos(s, substr)` | Index of first occurrence (-1 if not found) |
| `str.format(template, ...args)` | Positional `{0}`, `{1}` placeholder formatting |
| `str.formatTime(ts, fmt, tz?)` | Format timestamp with Java-style tokens |

---

### `str.formatTime` — DONE

Formats a Unix millisecond timestamp using Java SimpleDateFormat-style tokens.

**Supported tokens** (longer tokens replaced first to avoid partial matches):

| Token | Meaning | Example |
|-------|---------|---------|
| `yyyy` | 4-digit year | `2024` |
| `yy` | 2-digit year | `24` |
| `EEEE` | Full weekday name | `Monday` |
| `EEE` | Short weekday name | `Mon` |
| `MM` | Month (01-12) | `03` |
| `dd` | Day of month (01-31) | `15` |
| `HH` | Hour 24h (00-23) | `14` |
| `hh` | Hour 12h (01-12) | `02` |
| `mm` | Minute (00-59) | `30` |
| `ss` | Second (00-59) | `45` |
| `a` | AM/PM | `PM` |

**Timezone handling:** When `tz` is provided, uses `Intl.DateTimeFormat` to extract correct local-time components. Without tz, falls back to UTC methods.

**Edge case:** `hour12: false` can return `24` for midnight in some locales — normalized to `0`.

---

## Acceptance Criteria — ALL MET

- [x] `str.format_time(1704067200000, "HH:mm", "UTC")` returns `"00:00"`
- [x] `str.format_time(ts, "yyyy-MM-dd")` returns `"2024-01-01"` for Jan 1 2024 UTC
- [x] `str.format_time(ts, "EEE")` returns short weekday name
- [x] `str.format_time(ts, "hh:mm a")` returns 12-hour format with AM/PM
- [x] `str.format_time(ts, "HH:mm", "America/New_York")` returns correct EST time
- [x] All 16 previously-existing str tests continue to pass

---

## P1 Remaining Work

### 1. `str.repeat(s, count)` — P1

Not yet implemented:
```pine
dashes = str.repeat("-", 10)  // "----------"
```

**Implementation:**
```typescript
repeat(s: string, count: number): string {
  if (!s || count <= 0) return '';
  return s.repeat(Math.floor(count));
}
```

**Function mapper entry needed:**
```typescript
'str.repeat': '__rt.str.repeat',
```

### 2. Enhanced `str.tostring()` Named Format Specifiers — P1

The current implementation handles `#.##` style decimal formats. Missing named formats:

**`format.mintick`** — format to symbol's minimum tick precision:
```typescript
if (format === 'format.mintick') {
  // Use syminfo.mintick precision; default 2 decimals
  return typeof value === 'number' ? value.toFixed(2) : String(value);
}
```

**`format.volume`** — K/M/B suffix notation:
```typescript
if (format === 'format.volume') {
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  return String(Math.round(value));
}
```

**`format.percent`** — percentage with 2 decimals:
```typescript
if (format === 'format.percent') {
  return typeof value === 'number' ? value.toFixed(2) + '%' : String(value);
}
```

These `format.*` constants must also be routed by codegen. Add to `genMember()`:
```typescript
if (objStr === 'format') return JSON.stringify(`format.${prop}`);
```

### 3. `str.replace_all` Function Mapper Name — P1

Pine's function is `str.replace_all` (with underscore). The runtime implements it as `replaceAll` (camelCase). The function mapper should map:
```typescript
'str.replace_all': '__rt.str.replaceAll',
```
(This may already be present; verify in `function-mapper.ts`.)

### 4. `str.match` Return Value — P1

Pine's `str.match` can return the matched substring (not just a boolean) in some overloads. Current implementation returns `boolean`. Consider returning the matched string or `na` to be fully spec-compliant:

```pine
matchedStr = str.match(source, "\\d+")  // returns first match as string
```

**Updated implementation:**
```typescript
match(s: string, regex: string): string | typeof NA {
  if (!s || !regex) return NA;
  try {
    const m = s.match(new RegExp(regex));
    return m ? m[0] : NA;
  } catch {
    return NA;
  }
}
```

---

## P2 Remaining Work

### `str.format` Named Placeholders — P2

Pine v6 `str.format` supports both positional `{0}` and named `{name}` placeholders. Current implementation only handles positional. Named placeholder support would require a map argument, which is not commonly used.
