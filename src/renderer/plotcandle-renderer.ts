import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { PlotCandleData, PlotBarData } from '../runtime/index';

/**
 * Render plotcandle data as additional candlestick series overlaid on the chart.
 */
export function renderPlotcandles(
  chart: IChartApi,
  plotcandles: PlotCandleData[],
): ISeriesApi<'Candlestick'>[] {
  const seriesList: ISeriesApi<'Candlestick'>[] = [];
  for (const pc of plotcandles) {
    const upColor = pc.color || '#26a69a';
    const downColor = pc.color || '#ef5350';
    const series = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: pc.bordercolor || upColor,
      borderDownColor: pc.bordercolor || downColor,
      wickUpColor: pc.wickcolor || '#26a69a',
      wickDownColor: pc.wickcolor || '#ef5350',
      priceScaleId: 'right',
      lastValueVisible: false,
    });

    const data = pc.values
      .filter(v => v.open != null && v.high != null && v.low != null && v.close != null)
      .map(v => ({
        time: v.time as UTCTimestamp,
        open: v.open,
        high: v.high,
        low: v.low,
        close: v.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    series.setData(data as any);
    seriesList.push(series);
  }
  return seriesList;
}

/**
 * Render plotbar data as additional bar series overlaid on the chart.
 */
export function renderPlotbars(
  chart: IChartApi,
  plotbars: PlotBarData[],
): ISeriesApi<'Bar'>[] {
  const seriesList: ISeriesApi<'Bar'>[] = [];
  for (const pb of plotbars) {
    const series = chart.addBarSeries({
      upColor: pb.color || '#26a69a',
      downColor: pb.color || '#ef5350',
      priceScaleId: 'right',
      lastValueVisible: false,
    });

    const data = pb.values
      .filter(v => v.open != null && v.high != null && v.low != null && v.close != null)
      .map(v => ({
        time: v.time as UTCTimestamp,
        open: v.open,
        high: v.high,
        low: v.low,
        close: v.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    series.setData(data as any);
    seriesList.push(series);
  }
  return seriesList;
}
