import { Bar } from './types';

function findCol(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase() === candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalizeTime(raw: string): number {
  const trimmed = raw.trim();
  // Try numeric (unix seconds or ms)
  const asNum = Number(trimmed);
  if (!isNaN(asNum) && asNum > 0) {
    return asNum > 9_999_999_999 ? Math.floor(asNum / 1000) : asNum;
  }
  // Try ISO / date string
  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) throw new Error(`Invalid time value: "${trimmed}"`);
  return Math.floor(parsed / 1000);
}

export function loadCSV(content: string): Bar[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const timeIdx = findCol(headers, ['time', 'timestamp', 'date', 'datetime', 'Date', 'Time', 'Datetime']);
  const openIdx = findCol(headers, ['open', 'Open', 'o']);
  const highIdx = findCol(headers, ['high', 'High', 'h']);
  const lowIdx = findCol(headers, ['low', 'Low', 'l']);
  const closeIdx = findCol(headers, ['close', 'Close', 'c', 'Adj Close', 'adj close']);
  const volumeIdx = findCol(headers, ['volume', 'Volume', 'v', 'vol']);

  if (timeIdx === -1) throw new Error('CSV missing time/date column');
  if (openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    throw new Error('CSV missing OHLC columns');
  }

  const bars: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    const time = normalizeTime(cols[timeIdx]);
    const open = Number(cols[openIdx]);
    const high = Number(cols[highIdx]);
    const low = Number(cols[lowIdx]);
    const close = Number(cols[closeIdx]);
    const volume = volumeIdx !== -1 ? Number(cols[volumeIdx]) : 0;

    if ([open, high, low, close].some(isNaN)) continue;

    bars.push({ time, open, high, low, close, volume });
  }

  return bars;
}
