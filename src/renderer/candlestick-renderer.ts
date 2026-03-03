import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Bar } from '../data/types';
import { BarColorData } from '../runtime/index';

export function renderCandlesticks(
  chart: IChartApi,
  bars: Bar[],
  barcolors?: BarColorData[],
): ISeriesApi<'Candlestick'> {
  const series = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });

  // Build time→color map for barcolor overrides
  const colorMap = new Map<number, string>();
  if (barcolors?.length) {
    for (const bc of barcolors) {
      colorMap.set(bc.time, bc.color);
    }
  }

  const data = bars.map(bar => {
    const base = {
      time: bar.time as UTCTimestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    };
    const overrideColor = colorMap.get(bar.time);
    if (overrideColor) {
      return {
        ...base,
        color: overrideColor,
        wickColor: overrideColor,
        borderColor: overrideColor,
      };
    }
    return base;
  });

  data.sort((a, b) => (a.time as number) - (b.time as number));
  series.setData(data as any);
  return series;
}
