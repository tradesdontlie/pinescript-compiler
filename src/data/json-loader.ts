import { Bar } from './types';

function normalizeTime(raw: unknown): number {
  if (typeof raw === 'number') {
    // If value looks like milliseconds (> year 3000 in seconds), convert to seconds
    return raw > 9_999_999_999 ? Math.floor(raw / 1000) : raw;
  }
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (isNaN(parsed)) throw new Error(`Invalid time value: ${raw}`);
    return Math.floor(parsed / 1000);
  }
  throw new Error(`Unexpected time type: ${typeof raw}`);
}

export function loadJSON(content: string): Bar[] {
  const data = JSON.parse(content);
  const rows: unknown[] = Array.isArray(data) ? data : data.bars ?? data.data ?? data.candles;

  if (!Array.isArray(rows)) {
    throw new Error('JSON must contain an array or an object with a bars/data/candles array');
  }

  return rows.map((row: any, i) => {
    const time = normalizeTime(row.time ?? row.timestamp ?? row.t ?? row.date);
    const open = Number(row.open ?? row.o);
    const high = Number(row.high ?? row.h);
    const low = Number(row.low ?? row.l);
    const close = Number(row.close ?? row.c);
    const volume = Number(row.volume ?? row.v ?? 0);

    if ([open, high, low, close].some(isNaN)) {
      throw new Error(`Invalid OHLC values at row ${i}`);
    }

    return { time, open, high, low, close, volume };
  });
}
