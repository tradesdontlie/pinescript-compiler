import { Bar } from '../../data/types';
import { Series } from '../types/series';

export interface BuiltinVariables {
  open: Series<number>;
  high: Series<number>;
  low: Series<number>;
  close: Series<number>;
  volume: Series<number>;
  time: Series<number>;
  bar_index: Series<number>;
  hl2: Series<number>;
  hlc3: Series<number>;
  ohlc4: Series<number>;
}

export function createBuiltinVariables(bars: Bar[]): BuiltinVariables {
  const open = new Series<number>(bars.length + 10);
  const high = new Series<number>(bars.length + 10);
  const low = new Series<number>(bars.length + 10);
  const close = new Series<number>(bars.length + 10);
  const volume = new Series<number>(bars.length + 10);
  const time = new Series<number>(bars.length + 10);
  const bar_index = new Series<number>(bars.length + 10);
  const hl2 = new Series<number>(bars.length + 10);
  const hlc3 = new Series<number>(bars.length + 10);
  const ohlc4 = new Series<number>(bars.length + 10);

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    open.push(bar.open);
    high.push(bar.high);
    low.push(bar.low);
    close.push(bar.close);
    volume.push(bar.volume);
    time.push(bar.time);
    bar_index.push(i);
    hl2.push((bar.high + bar.low) / 2);
    hlc3.push((bar.high + bar.low + bar.close) / 3);
    ohlc4.push((bar.open + bar.high + bar.low + bar.close) / 4);
  }

  return { open, high, low, close, volume, time, bar_index, hl2, hlc3, ohlc4 };
}
