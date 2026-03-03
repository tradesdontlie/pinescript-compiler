import { IChartApi, ISeriesApi, LineType, UTCTimestamp } from 'lightweight-charts';
import { PlotData } from './index';

type AnySeriesApi = ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | ISeriesApi<'Area'>;

export function renderPlot(
  chart: IChartApi,
  plotData: PlotData,
  priceScaleId: string = 'right'
): AnySeriesApi {
  const color = plotData.color || '#2196f3';
  const lineWidth = (plotData.linewidth || 1) as 1 | 2 | 3 | 4;
  let series: AnySeriesApi;

  switch (plotData.style) {
    case 'histogram':
      series = chart.addHistogramSeries({
        color,
        priceScaleId,
        priceFormat: { type: 'price' },
      });
      break;

    case 'area':
      series = chart.addAreaSeries({
        lineColor: color,
        topColor: `${color}40`,
        bottomColor: `${color}00`,
        lineWidth,
        priceScaleId,
      });
      break;

    case 'circles':
      series = chart.addLineSeries({
        color,
        lineWidth,
        pointMarkersVisible: true,
        lineVisible: false,
        priceScaleId,
      });
      break;

    case 'stepline':
      series = chart.addLineSeries({
        color,
        lineWidth,
        lineType: LineType.WithSteps,
        priceScaleId,
      });
      break;

    case 'cross':
      series = chart.addLineSeries({
        color,
        lineWidth,
        pointMarkersVisible: true,
        lineVisible: false,
        priceScaleId,
      });
      break;

    case 'line':
    default:
      series = chart.addLineSeries({
        color,
        lineWidth,
        priceScaleId,
      });
      break;
  }

  const data = plotData.values
    .filter(v => v.value !== null)
    .map(v => ({
      time: v.time as UTCTimestamp,
      value: v.value as number,
    }));

  data.sort((a, b) => (a.time as number) - (b.time as number));
  series.setData(data);

  return series;
}
