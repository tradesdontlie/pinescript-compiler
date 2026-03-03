// Pine Script v6 time extraction built-in functions
// All timestamps are in milliseconds (Unix epoch).

import { NA } from '../types/na';

// Internal alias so it doesn't conflict with the `NA` symbol type
const NA_SYMBOL = NA;

/**
 * Extract date/time parts from a timestamp, optionally in a specific timezone.
 * When no timezone is given, UTC is used.
 */
function getDateParts(
  ts: number,
  tz?: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number; // 1=Sunday .. 7=Saturday (Pine convention)
} {
  const d = new Date(ts);

  if (!tz) {
    // UTC path — no Intl overhead
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      dayOfWeek: d.getUTCDay() + 1, // JS 0=Sun → Pine 1=Sun
    };
  }

  // Timezone-aware path using Intl.DateTimeFormat
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = fmt.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  // Intl hour12:false can return "24" for midnight in some locales — normalise to 0
  let hourVal = parseInt(map.hour, 10);
  if (hourVal === 24) hourVal = 0;

  // Map short weekday name to Pine dayofweek number (1=Sun..7=Sat)
  const weekdayMap: Record<string, number> = {
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
    Sat: 7,
  };

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: hourVal,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    dayOfWeek: weekdayMap[map.weekday] ?? 1,
  };
}

/**
 * Create the set of Pine Script time-extraction functions.
 *
 * @param getCurrentTime  A callback that returns the current bar's timestamp
 *                        in milliseconds (Unix epoch).
 */
export function createTimeFunctions(getCurrentTime: () => number) {
  /** Resolve effective timestamp: use supplied value or fall back to current bar time. */
  function resolveTs(ts?: number | null): number {
    return ts != null ? ts : getCurrentTime();
  }

  return {
    /** Hour of the day (0-23). */
    hour(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).hour;
    },

    /** Minute of the hour (0-59). */
    minute(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).minute;
    },

    /** Second of the minute (0-59). */
    second(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).second;
    },

    /**
     * Day of the week.
     * 1 = Sunday, 2 = Monday, ... 7 = Saturday  (Pine Script convention).
     */
    dayofweek(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).dayOfWeek;
    },

    /** Day of the month (1-31). */
    dayofmonth(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).day;
    },

    /** Month of the year (1-12). */
    month(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).month;
    },

    /** Four-digit year. */
    year(ts?: number, tz?: string): number {
      return getDateParts(resolveTs(ts), tz).year;
    },

    /**
     * Build a UTC timestamp (milliseconds) from date/time components.
     *
     * Pine Script months are 1-based (January = 1), so we subtract 1 for the
     * JS Date.UTC constructor which expects 0-based months.
     */
    timestamp(
      year: number,
      month: number,
      day: number,
      hour: number = 0,
      minute: number = 0,
      second: number = 0
    ): number {
      return Date.UTC(year, month - 1, day, hour, minute, second);
    },

    /**
     * ISO week number of the year (1–53).
     * ISO 8601: Week 1 contains January 4.
     */
    weekofyear(ts?: number, tz?: string): number {
      const parts = getDateParts(resolveTs(ts), tz);
      const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
      const dayOfYear = Math.floor(
        (d.getTime() - Date.UTC(parts.year, 0, 0)) / 86400000
      );
      const dow = d.getUTCDay() || 7; // ISO: 1=Mon..7=Sun
      return Math.floor((dayOfYear - dow + 10) / 7);
    },

    /**
     * Returns the bar's open time (ms) if the bar falls within the given session
     * string, otherwise returns NA.
     *
     * Session string format: "HHMM-HHMM" or "HHMM-HHMM:days"
     * where days is a string of digit chars: 1=Sun, 2=Mon, ..., 7=Sat (Pine convention).
     *
     * @param timeframe  Timeframe string (e.g. "D") — currently unused in the check
     * @param session    Session window, e.g. "0930-1600:23456"
     * @param timezone   IANA timezone string, e.g. "America/New_York"
     */
    timeInSession(
      timeframe?: string,
      session?: string,
      timezone?: string
    ): number | symbol {
      const ts = resolveTs(undefined);
      if (!session) return ts;
      const [timeRange, daysStr] = session.split(':');
      const [startStr, endStr] = timeRange.split('-');
      const startH = parseInt(startStr.slice(0, 2), 10);
      const startM = parseInt(startStr.slice(2), 10);
      const endH = parseInt(endStr.slice(0, 2), 10);
      const endM = parseInt(endStr.slice(2), 10);
      const parts = getDateParts(ts, timezone);
      const barMinutes = parts.hour * 60 + parts.minute;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      if (daysStr) {
        const dow = parts.dayOfWeek; // 1=Sun..7=Sat (Pine)
        if (!daysStr.includes(String(dow))) return NA_SYMBOL;
      }
      const inRange =
        startMinutes <= endMinutes
          ? barMinutes >= startMinutes && barMinutes < endMinutes
          : barMinutes >= startMinutes || barMinutes < endMinutes;
      return inRange ? ts : NA_SYMBOL;
    },
  };
}
