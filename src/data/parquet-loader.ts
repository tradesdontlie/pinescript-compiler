/**
 * Parquet file loader for Pine Script compiler.
 *
 * Uses the hyparquet library (pure-JS, browser-compatible).
 * If hyparquet is not installed the loader throws a helpful error message.
 *
 * Install: npm install hyparquet
 */

import { Bar } from './types';

export interface ParquetColumnMap {
  time?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
}

export interface ParquetLoadOptions {
  /** Override auto-detected column names */
  columns?: ParquetColumnMap;
  /** Maximum number of rows to load (default: unlimited) */
  maxRows?: number;
}

export interface ParquetLoadResult {
  bars: Bar[];
  warnings: string[];
  rowsSkipped: number;
}

// ── Column name resolution ───────────────────────────────────────────────────

const TIME_CANDIDATES  = ['time', 'Time', 'timestamp', 'Timestamp', 'date', 'Date', 'datetime', 'DateTime', 'ts'];
const OPEN_CANDIDATES  = ['open', 'Open', 'OPEN', 'o'];
const HIGH_CANDIDATES  = ['high', 'High', 'HIGH', 'h'];
const LOW_CANDIDATES   = ['low',  'Low',  'LOW',  'l'];
const CLOSE_CANDIDATES = ['close','Close','CLOSE','c'];
const VOL_CANDIDATES   = ['volume','Volume','VOLUME','vol','Vol','VOL','v'];

function resolveColumn(
  candidates: string[],
  available: string[],
  override?: string,
): string | null {
  if (override && available.includes(override)) return override;
  for (const c of candidates) {
    if (available.includes(c)) return c;
  }
  return null;
}

// ── Time resolution ──────────────────────────────────────────────────────────

function resolveTime(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') {
    // Unix seconds vs milliseconds heuristic
    return raw < 1e12 ? Math.round(raw) : Math.round(raw / 1000);
  }
  if (typeof raw === 'string') {
    const ms = Date.parse(raw);
    if (isNaN(ms)) return 0;
    return Math.round(ms / 1000);
  }
  if (raw instanceof Date) {
    return Math.round(raw.getTime() / 1000);
  }
  // BigInt — common in some Parquet encodings
  if (typeof raw === 'bigint') {
    const n = Number(raw);
    return n < 1e12 ? Math.round(n) : Math.round(n / 1000);
  }
  return 0;
}

// ── Data validation ──────────────────────────────────────────────────────────

function validateBars(bars: Bar[]): { valid: Bar[]; warnings: string[]; skipped: number } {
  const warnings: string[] = [];
  const valid: Bar[] = [];
  let skipped = 0;

  for (const bar of bars) {
    if (isNaN(bar.time) || bar.time <= 0) {
      warnings.push(`Bar with invalid timestamp skipped`);
      skipped++;
      continue;
    }
    if (isNaN(bar.open) || isNaN(bar.high) || isNaN(bar.low) || isNaN(bar.close)) {
      warnings.push(`Bar at ${new Date(bar.time * 1000).toISOString()} has NaN OHLC values, skipped`);
      skipped++;
      continue;
    }
    if (bar.high < bar.low) {
      warnings.push(`Bar at ${new Date(bar.time * 1000).toISOString()}: high (${bar.high}) < low (${bar.low})`);
      // Don't skip — just warn
    }
    if (isNaN(bar.volume)) {
      bar.volume = 0;
    }
    valid.push(bar);
  }

  return { valid, warnings, skipped };
}

// ── hyparquet-based loader ──────────────────────────────────────────────────

/**
 * Load a Parquet ArrayBuffer and return OHLCV bars.
 *
 * @param buffer   The raw Parquet file bytes.
 * @param options  Optional column override + row limit.
 */
export async function loadParquet(
  buffer: ArrayBuffer,
  options: ParquetLoadOptions = {},
): Promise<Bar[]> {
  const result = await loadParquetWithDetails(buffer, options);
  return result.bars;
}

/**
 * Load a Parquet ArrayBuffer and return bars plus warnings.
 */
export async function loadParquetWithDetails(
  buffer: ArrayBuffer,
  options: ParquetLoadOptions = {},
): Promise<ParquetLoadResult> {
  let hyparquet: {
    parquetRead: (opts: {
      file: ArrayBuffer;
      onComplete: (data: Record<string, unknown>[]) => void;
    }) => Promise<void>;
    parquetMetadata?: (file: ArrayBuffer) => unknown;
  };

  try {
    hyparquet = await import('hyparquet' as never) as typeof hyparquet;
  } catch {
    throw new Error(
      'hyparquet is not installed. Run: npm install hyparquet\n' +
      'Alternatively, convert your data to CSV or JSON format.',
    );
  }

  const rawRows: Record<string, unknown>[] = [];

  await hyparquet.parquetRead({
    file: buffer,
    onComplete: (data) => {
      rawRows.push(...data);
    },
  });

  if (rawRows.length === 0) {
    return { bars: [], warnings: ['Parquet file contained no rows'], rowsSkipped: 0 };
  }

  // Auto-detect columns from first row
  const availableCols = Object.keys(rawRows[0]);
  const cm = options.columns ?? {};

  const timeCol  = resolveColumn(TIME_CANDIDATES,  availableCols, cm.time);
  const openCol  = resolveColumn(OPEN_CANDIDATES,  availableCols, cm.open);
  const highCol  = resolveColumn(HIGH_CANDIDATES,  availableCols, cm.high);
  const lowCol   = resolveColumn(LOW_CANDIDATES,   availableCols, cm.low);
  const closeCol = resolveColumn(CLOSE_CANDIDATES, availableCols, cm.close);
  const volCol   = resolveColumn(VOL_CANDIDATES,   availableCols, cm.volume);

  const missing: string[] = [];
  if (!timeCol)  missing.push('time');
  if (!closeCol) missing.push('close');
  if (missing.length > 0) {
    throw new Error(
      `Could not find required columns: ${missing.join(', ')}.\n` +
      `Available columns: ${availableCols.join(', ')}`
    );
  }

  const maxRows = options.maxRows ?? Infinity;
  const bars: Bar[] = [];

  for (let i = 0; i < Math.min(rawRows.length, maxRows); i++) {
    const row = rawRows[i];
    bars.push({
      time:   resolveTime(row[timeCol!]),
      open:   openCol  ? Number(row[openCol])  : Number(row[closeCol!]),
      high:   highCol  ? Number(row[highCol])  : Number(row[closeCol!]),
      low:    lowCol   ? Number(row[lowCol])   : Number(row[closeCol!]),
      close:  Number(row[closeCol!]),
      volume: volCol   ? Number(row[volCol])   : 0,
    });
  }

  // Sort by time ascending
  bars.sort((a, b) => a.time - b.time);

  const { valid, warnings, skipped } = validateBars(bars);

  return { bars: valid, warnings, rowsSkipped: skipped };
}

/**
 * Read column names from a Parquet file without loading all data.
 * Useful for building column-mapping UI.
 */
export async function readParquetColumns(buffer: ArrayBuffer): Promise<string[]> {
  try {
    const hyparquet = await import('hyparquet' as never) as {
      parquetMetadata?: (buf: ArrayBuffer) => { row_groups: Array<{ columns: Array<{ meta_data: { path_in_schema: string[] } }> }> };
    };
    if (hyparquet.parquetMetadata) {
      const meta = hyparquet.parquetMetadata(buffer);
      const cols: Set<string> = new Set();
      for (const rg of meta.row_groups) {
        for (const col of rg.columns) {
          cols.add(col.meta_data.path_in_schema[0]);
        }
      }
      return [...cols];
    }
    // Fallback: load first row
    const rows: Record<string, unknown>[] = [];
    const mod = await import('hyparquet' as never) as { parquetRead: (o: { file: ArrayBuffer; rowEnd: number; onComplete: (d: Record<string, unknown>[]) => void }) => Promise<void> };
    await mod.parquetRead({ file: buffer, rowEnd: 1, onComplete: d => rows.push(...d) });
    return rows.length > 0 ? Object.keys(rows[0]) : [];
  } catch {
    return [];
  }
}
