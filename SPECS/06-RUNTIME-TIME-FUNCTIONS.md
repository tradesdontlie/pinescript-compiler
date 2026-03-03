# 06 — Runtime: Time Functions

> **Status**: COMPLETE (P0 DONE)
> **Priority**: P0 DONE
> **File**: `src/runtime/builtins/time-functions.ts`

---

## What's Implemented

All time extraction functions are implemented in `createTimeFunctions(getCurrentTime)` — a factory that takes a callback returning the current bar's timestamp in milliseconds.

### Core Time Extraction — ALL DONE

| Function | Returns | Notes |
|----------|---------|-------|
| `hour(ts?, tz?)` | 0–23 | UTC if no tz |
| `minute(ts?, tz?)` | 0–59 | |
| `second(ts?, tz?)` | 0–59 | |
| `dayofweek(ts?, tz?)` | 1–7 | 1=Sunday (Pine convention) |
| `dayofmonth(ts?, tz?)` | 1–31 | |
| `month(ts?, tz?)` | 1–12 | |
| `year(ts?, tz?)` | YYYY | |
| `timestamp(year, month, day, hour?, min?, sec?)` | ms | Uses Date.UTC |

**Timezone handling:** When `tz` is provided, uses `Intl.DateTimeFormat` with `timeZone` option to correctly extract parts in the target timezone. The `hour12: false` path normalizes `24` → `0` for midnight.

**`getDateParts` helper:** Internal function shared by all extraction functions. Has a fast path for UTC (no Intl overhead) and a TZ-aware path using `Intl.DateTimeFormat.formatToParts`.

**`timestamp()`:** Constructs a UTC epoch ms value. Pine months are 1-based (January = 1), correctly converted to 0-based for `Date.UTC`.

---

## Acceptance Criteria — ALL MET

- [x] `hour(ts)` returns correct UTC hour (0-23)
- [x] `hour(ts, "America/New_York")` returns correct EST/EDT hour
- [x] `minute(ts)` returns 0-59
- [x] `dayofweek(ts)` returns 1-7 (1=Sunday, 7=Saturday)
- [x] `dayofweek.monday` resolves to `2` (handled by codegen enum constants)
- [x] `timestamp(2024, 1, 15, 9, 30, 0)` returns correct epoch ms
- [x] All time functions fall back to current bar time when `ts` not supplied

---

## P1 Remaining Work

### 1. `weekofyear(ts?, tz?)` — P1

Not yet implemented. Pine Script returns ISO week number (1–53).

**Implementation:**
```typescript
weekofyear(ts?: number, tz?: string): number {
  const parts = getDateParts(resolveTs(ts), tz);
  // ISO week: Jan 4 is always in week 1
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayOfYear = Math.floor((d.getTime() - Date.UTC(parts.year, 0, 0)) / 86400000);
  const dow = d.getUTCDay() || 7; // 1=Mon..7=Sun for ISO
  return Math.floor((dayOfYear - dow + 10) / 7);
}
```

**Function mapper entry needed:**
```typescript
'weekofyear': '__rt.weekofyear',
```

### 2. `time_close` Built-in Variable — P1

Pine Script `time_close` is the closing timestamp of the current bar in milliseconds.

**Implementation:**
- Add `time_close` as a Series built-in populated in the engine
- For intraday bars: `time_close[i] = time[i] + (timeframe_seconds * 1000)`
- For daily bars: `time_close[i] = end_of_day_timestamp`

**Files to modify:**
- `src/runtime/engine.ts` — populate `time_close` series per bar alongside `time`
- `src/runtime/context.ts` — expose `time_close` in RuntimeContext
- Codegen `genIdentifier()` — recognize `time_close` as a built-in variable

### 3. `timenow` Built-in Variable — P1

Pine Script `timenow` is the current wall-clock time (not bar time) in milliseconds.

**Implementation:** Returns `Date.now()` regardless of which bar is being processed.

**Files to modify:** Same as `time_close` above — add to context and codegen identifier handling.

### 4. `time(timeframe, session, timezone)` Function — P1

Pine's `time()` function (distinct from the `time` built-in variable) checks if the current bar falls within a session window:
```pine
inSession = not na(time("D", "0930-1600:23456", "America/New_York"))
```

Returns the bar's open time if it's within the session, `na` otherwise.

**Session string format:** `"HHMM-HHMM[:days]"` where days is optional digit string (2=Mon, 3=Tue, ..., 6=Fri, 7=Sat, 1=Sun).

**Implementation:**
```typescript
timeInSession(timeframe: string, session?: string, timezone?: string): number | typeof NA {
  const ts = getCurrentTime();
  if (!session) return ts;
  // Parse "HHMM-HHMM" or "HHMM-HHMM:23456"
  const [timeRange, daysStr] = session.split(':');
  const [startStr, endStr] = timeRange.split('-');
  const startH = parseInt(startStr.slice(0, 2)), startM = parseInt(startStr.slice(2));
  const endH = parseInt(endStr.slice(0, 2)), endM = parseInt(endStr.slice(2));
  const parts = getDateParts(ts, timezone);
  const barMinutes = parts.hour * 60 + parts.minute;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (daysStr) {
    const dow = parts.dayOfWeek; // 1=Sun..7=Sat (Pine)
    if (!daysStr.includes(String(dow))) return NA;
  }
  const inRange = startMinutes <= endMinutes
    ? barMinutes >= startMinutes && barMinutes < endMinutes
    : barMinutes >= startMinutes || barMinutes < endMinutes; // crosses midnight
  return inRange ? ts : NA;
}
```

**Function mapper entry:**
```typescript
'time': '__rt.timeInSession',  // only when called as function, not as variable
```

Note: Codegen must distinguish between `time` (built-in variable) and `time(...)` (function call). The parser already distinguishes these by context (CallExpression vs Identifier).

### 5. `timeframe.in_seconds(tf?)` — DONE

Already implemented in the timeframe module. Returns seconds for a given timeframe string:
- `"D"` → 86400
- `"W"` → 604800
- `"M"` → 2592000 (approx)
- numeric string (minutes) → `N * 60`

### 6. `dayofweek.*` Constants — DONE (via codegen enum routing)

Constants `dayofweek.sunday` through `dayofweek.saturday` are routed by codegen to integer values 1–7.

---

## P2 Remaining Work

### `timezone` Built-in Constant — P2

Pine has `syminfo.timezone` which returns the exchange timezone string (e.g. `"America/New_York"`). Currently returns empty string. Should be configurable per symbol in the data loader.
