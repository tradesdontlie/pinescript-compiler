// Pine Script v6 time extraction built-in functions
// All timestamps are in milliseconds (Unix epoch).

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
  };
}
