# 06 — Runtime: Time Functions

> **Status**: NOT STARTED
> **Priority**: P0 (used extensively in benchmark for session detection)
> **File to create**: `src/runtime/builtins/time-functions.ts`

---

## What Exists

- `timeframe.*` module exists (period, multiplier, isdwm, isintraday, etc.)
- `time` built-in series exists (Unix timestamp per bar)
- `bar_index` built-in exists

---

## What's Missing

### 1. `hour(time, timezone)` — P0

**Pine Script syntax:**
```pine
h = hour               // hour of current bar (0-23)
h = hour(time)         // hour from timestamp
h = hour(time, "America/New_York")  // hour in specific timezone
```

**Benchmark usage:** Extensively used for session time detection.

**Implementation:**
```typescript
function hour(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = timezone
        ? new Date(new Date(ts).toLocaleString('en-US', { timeZone: timezone }))
        : new Date(ts);
    return date.getHours();
}
```

**Note:** For timezone support, use `Intl.DateTimeFormat` with `timeZone` option (available in all modern browsers and Node.js).

---

### 2. `minute(time, timezone)` — P0

**Pine Script syntax:**
```pine
m = minute
m = minute(time)
m = minute(time, "America/New_York")
```

**Implementation:**
```typescript
function minute(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = timezone
        ? new Date(new Date(ts).toLocaleString('en-US', { timeZone: timezone }))
        : new Date(ts);
    return date.getMinutes();
}
```

---

### 3. `second(time, timezone)` — P1

```typescript
function second(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = resolveTimezone(ts, timezone);
    return date.getSeconds();
}
```

---

### 4. `dayofweek(time, timezone)` — P0

**Pine Script syntax:**
```pine
dow = dayofweek          // 1=Sunday, 7=Saturday
dow = dayofweek(time)
dow = dayofweek(time, "America/New_York")
```

**Benchmark usage:** Used for day-of-week filtering (`SessionDay` input).

**Pine Script constants:**
- `dayofweek.sunday = 1`
- `dayofweek.monday = 2`
- `dayofweek.tuesday = 3`
- `dayofweek.wednesday = 4`
- `dayofweek.thursday = 5`
- `dayofweek.friday = 6`
- `dayofweek.saturday = 7`

**Implementation:**
```typescript
function dayofweek(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = resolveTimezone(ts, timezone);
    // JS: 0=Sunday, 6=Saturday → Pine: 1=Sunday, 7=Saturday
    return date.getDay() + 1;
}
```

---

### 5. `dayofmonth(time, timezone)` — P1

```typescript
function dayofmonth(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = resolveTimezone(ts, timezone);
    return date.getDate();
}
```

---

### 6. `month(time, timezone)` — P1

```typescript
function month(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = resolveTimezone(ts, timezone);
    return date.getMonth() + 1; // Pine: 1-12
}
```

---

### 7. `year(time, timezone)` — P1

```typescript
function year(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = resolveTimezone(ts, timezone);
    return date.getFullYear();
}
```

---

### 8. `weekofyear(time, timezone)` — P2

```typescript
function weekofyear(timestamp?: number, timezone?: string): number {
    const ts = timestamp ?? currentBarTime;
    const date = resolveTimezone(ts, timezone);
    // ISO week number calculation
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
    return Math.ceil((days + jan1.getDay() + 1) / 7);
}
```

---

### 9. `time_close` — P0

**Pine Script syntax:**
```pine
tc = time_close  // Closing time of the current bar
```

**Benchmark usage:** 10+ references to `tfClose[1]` (timeframe close values).

**Implementation:**
- Add `time_close` as a built-in variable alongside `time`
- Calculate from bar time + timeframe duration
- For intraday bars: `time_close = time + (timeframe_minutes * 60 * 1000)`

**Files to modify:**
- `src/runtime/builtins/variables.ts` — add `time_close` Series
- `src/runtime/engine.ts` — populate `time_close` per bar
- `src/runtime/context.ts` — expose `time_close`

---

### 10. `timenow` — P1

**Pine Script syntax:**
```pine
tn = timenow  // Current real-world time in ms
```

**Implementation:**
- Simple: `Date.now()` on each bar execution
- For historical bars, this is the current wall clock time (not the bar time)

---

### 11. `timestamp(year, month, day, hour, minute, second)` — P1

**Pine Script syntax:**
```pine
ts = timestamp(2024, 1, 15, 9, 30, 0)
ts = timestamp("America/New_York", 2024, 1, 15, 9, 30, 0)
```

**Implementation:**
```typescript
function timestamp(
    yearOrTz: number | string,
    monthOrYear?: number,
    ...rest
): number {
    let tz: string | undefined;
    let y: number, mo: number, d: number, h: number, mi: number, s: number;

    if (typeof yearOrTz === 'string') {
        tz = yearOrTz;
        [y, mo, d, h, mi, s] = [monthOrYear!, ...rest];
    } else {
        [y, mo, d, h, mi, s] = [yearOrTz, monthOrYear!, ...rest];
    }

    // Create date and convert to ms
    const date = new Date(y, mo - 1, d, h ?? 0, mi ?? 0, s ?? 0);
    return date.getTime();
}
```

---

### 12. `timeframe.in_seconds()` — P0

**Pine Script syntax:**
```pine
secs = timeframe.in_seconds()        // Current timeframe in seconds
secs = timeframe.in_seconds("60")    // 60-min timeframe = 3600
secs = timeframe.in_seconds("D")     // Daily = 86400
```

**Benchmark usage:** 5 calls.

**Implementation:**
```typescript
function inSeconds(tf?: string): number {
    const period = tf ?? currentTimeframe.period;
    if (period === 'D') return 86400;
    if (period === 'W') return 604800;
    if (period === 'M') return 2592000; // 30 days approx
    const minutes = parseInt(period, 10);
    if (!isNaN(minutes)) return minutes * 60;
    return 0;
}
```

**Files to modify:**
- `src/runtime/builtins/timeframe.ts` — add `inSeconds()` method

---

### 13. `time(timeframe, session, timezone)` — P1

**Pine Script syntax:**
```pine
inSession = time("60", "0930-1600", "America/New_York")
// Returns the bar time if the bar is within the session, na otherwise
```

**Implementation:**
```typescript
function time(timeframe: string, session?: string, timezone?: string): number | typeof NA {
    // Check if current bar falls within the specified session
    // Parse session string "HHMM-HHMM" format
    // Return bar time if in session, NA if not
}
```

---

## Helper Function

```typescript
function resolveTimezone(timestampMs: number, timezone?: string): Date {
    if (!timezone) return new Date(timestampMs);
    // Use Intl.DateTimeFormat to get components in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false,
    });
    const parts = formatter.formatToParts(new Date(timestampMs));
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
    return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}
```

---

## Integration

### Codegen (function-mapper.ts)
Add mappings:
```typescript
'hour': '__rt.hour',
'minute': '__rt.minute',
'second': '__rt.second',
'dayofweek': '__rt.dayofweek',
'dayofmonth': '__rt.dayofmonth',
'month': '__rt.month',
'year': '__rt.year',
'weekofyear': '__rt.weekofyear',
'timestamp': '__rt.timestamp',
'timeframe.in_seconds': '__rt.timeframe.inSeconds',
```

Also add `time_close` and `timenow` to `BUILTIN_VARS` and handle in `genIdentifier()`.

### Codegen — `dayofweek.*` Constants
```typescript
// In genMember():
if (objStr === 'dayofweek') return `__rt.dayofweek.${prop}`;
```

Runtime constants:
```typescript
dayofweek: {
    sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
    thursday: 5, friday: 6, saturday: 7,
}
```

### Context (context.ts)
- Add time functions to RuntimeContext
- Wire `time_close` as a built-in variable

---

## Acceptance Criteria

1. `hour(1704067200000)` returns correct hour (0-23) for UTC
2. `hour(1704067200000, "America/New_York")` returns correct EST hour
3. `minute(time)` returns 0-59
4. `dayofweek(time)` returns 1-7 (1=Sunday)
5. `dayofweek.monday` resolves to `2`
6. `time_close` returns bar close time
7. `timenow` returns current wall clock time
8. `timestamp(2024, 1, 15, 9, 30, 0)` returns correct epoch ms
9. `timeframe.in_seconds("60")` returns `3600`
10. `timeframe.in_seconds("D")` returns `86400`
11. At least 15 tests covering all time functions with timezone support
