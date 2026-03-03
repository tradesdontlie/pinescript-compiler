// Pine Script v6 request.security() runtime module — multi-timeframe (MTF) analysis

import { Series } from '../types/series';
import { NA, isNa } from '../types/na';
import { Bar } from '../../data/types';

export interface RequestModule {
  security(symbol: string | any, timeframe: string, expression: any, gaps?: string, lookahead?: string): any;
}

interface ResampledBar {
  bar: Bar;
  startIdx: number;
  endIdx: number;
}

/** Group input bars into higher-TF periods and aggregate OHLCV. */
function getResampledBars(bars: Bar[], tf: string): ResampledBar[] {
  if (bars.length === 0) return [];

  const keyFn = periodKeyFn(tf);
  const result: ResampledBar[] = [];
  let group: Bar[] = [];
  let groupStartIdx = 0;
  let prevKey: string | null = null;

  for (let i = 0; i < bars.length; i++) {
    const key = keyFn(bars[i].time);
    if (prevKey !== null && key !== prevKey) {
      result.push(aggregateGroup(group, groupStartIdx, i - 1));
      group = [];
      groupStartIdx = i;
    }
    group.push(bars[i]);
    prevKey = key;
  }
  // flush last group
  if (group.length > 0) {
    result.push(aggregateGroup(group, groupStartIdx, bars.length - 1));
  }
  return result;
}

/** Return a function that maps a unix-seconds timestamp to a period key string. */
function periodKeyFn(tf: string): (ts: number) => string {
  if (tf === 'D') {
    return (ts) => {
      const d = new Date(ts * 1000);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    };
  }
  if (tf === 'W') {
    return (ts) => {
      const d = new Date(ts * 1000);
      // ISO week: floor to Monday
      const day = d.getUTCDay(); // 0=Sun
      const diff = (day + 6) % 7; // days since Monday
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - diff);
      return `${monday.getUTCFullYear()}-W${monday.getUTCMonth()}-${monday.getUTCDate()}`;
    };
  }
  if (tf === 'M') {
    return (ts) => {
      const d = new Date(ts * 1000);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    };
  }
  // Numeric = minutes.  Group bars into buckets of that many minutes.
  const minutes = parseInt(tf, 10);
  if (!isNaN(minutes) && minutes > 0) {
    const bucketSec = minutes * 60;
    return (ts) => String(Math.floor(ts / bucketSec));
  }
  // Fallback: treat as daily
  return (ts) => {
    const d = new Date(ts * 1000);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  };
}

/** Aggregate a group of bars into one higher-TF bar. */
function aggregateGroup(group: Bar[], startIdx: number, endIdx: number): ResampledBar {
  const bar: Bar = {
    time: group[0].time,
    open: group[0].open,
    high: -Infinity,
    low: Infinity,
    close: group[group.length - 1].close,
    volume: 0,
  };
  for (const b of group) {
    if (b.high > bar.high) bar.high = b.high;
    if (b.low < bar.low) bar.low = b.low;
    bar.volume += b.volume;
  }
  return { bar, startIdx, endIdx };
}

/** Build O(1) lookup: input-bar index -> resampled-bar index. */
function buildBarToResampledIndex(barsLen: number, resampled: ResampledBar[]): Int32Array {
  const map = new Int32Array(barsLen).fill(-1);
  for (let ri = 0; ri < resampled.length; ri++) {
    for (let i = resampled[ri].startIdx; i <= resampled[ri].endIdx; i++) {
      map[i] = ri;
    }
  }
  return map;
}

export function createRequestModule(
  bars: Bar[],
  getCurrentBarIndex: () => number,
  getCurrentTimeframe: () => string
): RequestModule {
  // Cache: timeframe -> { resampled bars, bar-index lookup }
  const cache = new Map<string, { resampled: ResampledBar[]; lookup: Int32Array }>();

  function ensureCached(tf: string) {
    if (!cache.has(tf)) {
      const resampled = getResampledBars(bars, tf);
      const lookup = buildBarToResampledIndex(bars.length, resampled);
      cache.set(tf, { resampled, lookup });
    }
    return cache.get(tf)!;
  }

  function resolveValue(reBar: Bar, expression: any): any {
    // Tuple / array → map each element to a resampled close
    if (Array.isArray(expression)) {
      return expression.map(() => reBar.close);
    }
    // Series or number → return resampled close
    return reBar.close;
  }

  function security(
    symbol: string | any,
    timeframe: string,
    expression: any,
    gaps: string = 'barmerge.gaps_off',
    lookahead: string = 'barmerge.lookahead_off',
  ): any {
    // Same timeframe → return expression as-is
    const currentTf = getCurrentTimeframe();
    if (timeframe === currentTf || timeframe === '') {
      if (expression instanceof Series) return (expression as Series<number>).get(0);
      return expression;
    }

    if (bars.length === 0) return NA;

    const { resampled, lookup } = ensureCached(timeframe);
    const barIdx = getCurrentBarIndex();
    if (barIdx < 0 || barIdx >= bars.length) return NA;

    const ri = lookup[barIdx];
    if (ri < 0) return NA;

    const gapsOn = gaps === 'barmerge.gaps_on';
    const lookaheadOn =
      lookahead === 'barmerge.lookahead_on' || lookahead === 'lookahead_on' || lookahead === true as any;

    if (lookaheadOn) {
      // Return the current period's value (future peeking allowed)
      if (gapsOn) {
        // Only emit on the first bar of this period
        if (barIdx !== resampled[ri].startIdx) return NA;
      }
      return resolveValue(resampled[ri].bar, expression);
    }

    // Default: no lookahead — return the *previous* completed period's value
    if (ri === 0) {
      // No completed period yet
      return NA;
    }

    // Previous completed period
    const prevRi = ri - 1;

    if (gapsOn) {
      // Only emit a value on the first bar of a new period
      if (barIdx !== resampled[ri].startIdx) return NA;
    }

    return resolveValue(resampled[prevRi].bar, expression);
  }

  return { security };
}
