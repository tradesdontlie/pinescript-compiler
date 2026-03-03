// Pine Script v6 string built-in functions

export const str = {
  /**
   * Convert any value to its string representation.
   * Optionally accepts a format string (e.g. "#.##" for number formatting).
   */
  tostring(value: any, format?: string): string {
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      return 'NaN';
    }
    if (format !== undefined && typeof value === 'number') {
      // Handle Pine-style format strings like "#.##", "0.00", etc.
      const match = format.match(/[#0]*\.([#0]+)/);
      if (match) {
        const decimals = match[1].length;
        return value.toFixed(decimals);
      }
      return String(value);
    }
    return String(value);
  },

  /**
   * Parse a string to a number.  Returns NaN if parsing fails.
   */
  tonumber(s: string): number {
    if (s === null || s === undefined) return NaN;
    const n = Number(s);
    return n;
  },

  /** Return the length of a string. */
  length(s: string): number {
    if (s === null || s === undefined) return 0;
    return s.length;
  },

  /** Convert to lowercase. */
  lower(s: string): string {
    if (s === null || s === undefined) return '';
    return s.toLowerCase();
  },

  /** Convert to uppercase. */
  upper(s: string): string {
    if (s === null || s === undefined) return '';
    return s.toUpperCase();
  },

  /** Check if the string contains the given substring. */
  contains(s: string, substr: string): boolean {
    if (s === null || s === undefined || substr === null || substr === undefined) return false;
    return s.includes(substr);
  },

  /** Check if the string starts with the given prefix. */
  startswith(s: string, prefix: string): boolean {
    if (s === null || s === undefined || prefix === null || prefix === undefined) return false;
    return s.startsWith(prefix);
  },

  /** Check if the string ends with the given suffix. */
  endswith(s: string, suffix: string): boolean {
    if (s === null || s === undefined || suffix === null || suffix === undefined) return false;
    return s.endsWith(suffix);
  },

  /** Extract a substring. */
  substring(s: string, begin: number, end?: number): string {
    if (s === null || s === undefined) return '';
    if (end === undefined) return s.substring(begin);
    return s.substring(begin, end);
  },

  /** Split a string by a separator. */
  split(s: string, sep: string): string[] {
    if (s === null || s === undefined) return [];
    return s.split(sep);
  },

  /** Trim whitespace from both ends. */
  trim(s: string): string {
    if (s === null || s === undefined) return '';
    return s.trim();
  },

  /** Replace the first occurrence of target with replacement. */
  replace(s: string, target: string, replacement: string): string {
    if (s === null || s === undefined) return '';
    return s.replace(target, replacement);
  },

  /** Replace all occurrences of target with replacement. */
  replaceAll(s: string, target: string, replacement: string): string {
    if (s === null || s === undefined) return '';
    // Use split/join for broad compatibility
    return s.split(target).join(replacement);
  },

  /**
   * Test if the string matches the given regex pattern.
   * Returns true if the pattern matches anywhere in the string.
   */
  match(s: string, regex: string): boolean {
    if (s === null || s === undefined || regex === null || regex === undefined) return false;
    try {
      return new RegExp(regex).test(s);
    } catch {
      return false;
    }
  },

  /**
   * Find the position of the first occurrence of substr in s.
   * Returns -1 if not found (Pine returns na, but we use -1 for JS compat).
   */
  pos(s: string, substr: string): number {
    if (s === null || s === undefined || substr === null || substr === undefined) return -1;
    return s.indexOf(substr);
  },

  /**
   * Pine-style str.format: "{0} is {1}" with positional placeholders.
   */
  format(template: string, ...args: any[]): string {
    if (template === null || template === undefined) return '';
    return template.replace(/\{(\d+)\}/g, (_, idx) => {
      const i = parseInt(idx, 10);
      return i < args.length ? String(args[i]) : `{${idx}}`;
    });
  },
};
