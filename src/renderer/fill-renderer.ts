import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { FillData, PlotData } from './index';

/**
 * Renders fills between two plot series using an area series approximation.
 * Phase 1 implementation: creates an area series between the two plots.
 * Full fill support requires the lightweight-charts SeriesMarker or custom series API.
 */
export function renderFill(
  chart: IChartApi,
  fill: FillData,
  plots: PlotData[]
): ISeriesApi<'Area'> | null {
  const plot1 = plots.find(p => p.index === fill.plot1);
  const plot2 = plots.find(p => p.index === fill.plot2);

  if (!plot1 || !plot2) return null;

  // Build a map from time -> value for plot2 to calculate midpoints
  const plot2Map = new Map<number, number>();
  for (const v of plot2.values) {
    if (v.value !== null) plot2Map.set(v.time, v.value);
  }

  // Use plot1 as the line, shade toward plot2 values
  // This is a simplified approximation; true fill requires custom series
  const color = fill.color || 'rgba(33, 150, 243, 0.2)';

  const series = chart.addAreaSeries({
    lineColor: 'transparent',
    topColor: color,
    bottomColor: `${color.replace(/[\d.]+\)$/, '0)')}`,
    lineWidth: 1,
    priceScaleId: 'right',
  });

  const data = plot1.values
    .filter(v => v.value !== null)
    .map(v => ({
      time: v.time as UTCTimestamp,
      value: v.value as number,
    }))
    .sort((a, b) => (a.time as number) - (b.time as number));

  series.setData(data);
  return series;
}
