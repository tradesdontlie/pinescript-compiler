# 07 — Runtime: String Functions Gaps

> **Status**: PARTIAL (16 of ~18 functions)
> **Priority**: P0 for `str.format_time`
> **File**: `src/runtime/builtins/str.ts`

---

## What Exists

### Implemented (16 functions)
- `str.tostring(value, format?)` — with basic number format support
- `str.tonumber(s)` — parse string to number
- `str.length(s)`, `str.lower(s)`, `str.upper(s)`
- `str.contains(s, substr)`, `str.startswith(s, prefix)`, `str.endswith(s, suffix)`
- `str.substring(s, begin, end?)`, `str.split(s, sep)`, `str.trim(s)`
- `str.replace(s, target, replacement)`, `str.replace_all(s, target, replacement)`
- `str.match(s, regex)`, `str.pos(s, substr)`
- `str.format(template, ...args)` — positional `{0}`, `{1}` placeholders

---

## What's Missing

### 1. `str.format_time(time, format, timezone)` — P0

**Pine Script syntax:**
```pine
timeStr = str.format_time(time, "HH:mm", "America/New_York")
timeStr = str.format_time(time, "yyyy-MM-dd HH:mm:ss")
timeStr = str.format_time(time, "EEE")  // Day name (Mon, Tue, etc.)
```

**Benchmark usage:** 10 calls — used for displaying session times in labels and tables.

**Format tokens (Java SimpleDateFormat style):**
| Token | Meaning | Example |
|-------|---------|---------|
| `yyyy` | 4-digit year | `2024` |
| `yy` | 2-digit year | `24` |
| `MM` | Month (01-12) | `03` |
| `MMM` | Month short name | `Mar` |
| `dd` | Day of month (01-31) | `15` |
| `EEE` | Day name short | `Mon` |
| `EEEE` | Day name full | `Monday` |
| `HH` | Hour 24h (00-23) | `14` |
| `hh` | Hour 12h (01-12) | `02` |
| `mm` | Minute (00-59) | `30` |
| `ss` | Second (00-59) | `45` |
| `a` | AM/PM | `PM` |

**Implementation:**
```typescript
formatTime(timestamp: number, format: string, timezone?: string): string {
    if (timestamp === null || timestamp === undefined || isNaN(timestamp)) return '';

    const date = timezone
        ? resolveTimezoneDate(timestamp, timezone)
        : new Date(timestamp);

    const pad = (n: number, len = 2) => String(n).padStart(len, '0');

    const h24 = date.getHours();
    const h12 = h24 % 12 || 12;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let result = format;
    result = result.replace(/yyyy/g, String(date.getFullYear()));
    result = result.replace(/yy/g, String(date.getFullYear()).slice(-2));
    result = result.replace(/MMMM/g, monthNames[date.getMonth()]);
    result = result.replace(/MMM/g, monthNamesShort[date.getMonth()]);
    result = result.replace(/MM/g, pad(date.getMonth() + 1));
    result = result.replace(/dd/g, pad(date.getDate()));
    result = result.replace(/EEEE/g, dayNames[date.getDay()]);
    result = result.replace(/EEE/g, dayNamesShort[date.getDay()]);
    result = result.replace(/HH/g, pad(h24));
    result = result.replace(/hh/g, pad(h12));
    result = result.replace(/mm/g, pad(date.getMinutes()));
    result = result.replace(/ss/g, pad(date.getSeconds()));
    result = result.replace(/a/g, h24 < 12 ? 'AM' : 'PM');

    return result;
}
```

**Timezone helper:**
```typescript
function resolveTimezoneDate(timestampMs: number, timezone: string): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false, weekday: 'long',
    });
    const parts = formatter.formatToParts(new Date(timestampMs));
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const getNum = (type: string) => parseInt(get(type)) || 0;

    // Construct a Date in the target timezone for field access
    return new Date(getNum('year'), getNum('month') - 1, getNum('day'),
                    getNum('hour'), getNum('minute'), getNum('second'));
}
```

---

### 2. `str.repeat(s, count)` — P2

**Pine Script syntax:**
```pine
dashes = str.repeat("-", 10)  // "----------"
```

**Implementation:**
```typescript
repeat(s: string, count: number): string {
    if (s === null || s === undefined || count <= 0) return '';
    return s.repeat(count);
}
```

---

### 3. Enhanced `str.tostring()` Format Specifiers — P1

The current implementation handles `#.##` style formats. Pine Script also supports:
- `"#.########"` — 8 decimal places
- `"#"` — integer (no decimals)
- `"0.00"` — zero-padded
- Named formats: `format.mintick`, `format.volume`, `format.percent`

**Implementation:**
```typescript
// Add named format handling:
if (format === 'format.mintick') {
    // Format to the symbol's minimum tick precision
    return value.toFixed(2); // default, should use syminfo.mintick
}
if (format === 'format.volume') {
    // Format with K/M/B suffixes
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return String(value);
}
if (format === 'format.percent') {
    return value.toFixed(2) + '%';
}
```

---

## Codegen Integration

Add to `function-mapper.ts`:
```typescript
'str.format_time': '__rt.str.formatTime',
'str.repeat': '__rt.str.repeat',
```

---

## Acceptance Criteria

1. `str.format_time(1704067200000, "HH:mm", "UTC")` returns `"00:00"` (or correct UTC time)
2. `str.format_time(ts, "yyyy-MM-dd")` returns `"2024-01-01"` (for Jan 1 2024 UTC)
3. `str.format_time(ts, "EEE")` returns `"Mon"` for a Monday
4. `str.format_time(ts, "hh:mm a")` returns `"02:30 PM"` for 14:30
5. `str.format_time(ts, "HH:mm", "America/New_York")` returns correct EST time
6. `str.repeat("-", 5)` returns `"-----"`
7. `str.tostring(1234567, "format.volume")` returns `"1.23M"`
8. All 16 existing str tests continue to pass
9. At least 10 new tests for format_time with various formats and timezones
