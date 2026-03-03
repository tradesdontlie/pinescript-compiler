import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Bar } from '../data/types';

export function renderCandlesticks(
  chart: IChartApi,
  bars: Bar[]
): ISeriesApi<'Candlestick'> {
  const series = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });

  const data = bars.map(bar => ({
    time: bar.time as UTCTimestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));

  // Sort by time to ensure LC doesn't reject out-of-order data
  data.sort((a, b) => (a.time as number) - (b.time as number));

  series.setData(data);
  return series;
}
