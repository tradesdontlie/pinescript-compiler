import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Bar } from '../data/types';
import { ScriptMetadata } from '../compiler/index';
import { createChart } from './chart-manager';
import { renderCandlesticks } from './candlestick-renderer';
import { renderPlot } from './series-renderer';

// Runtime result interfaces — defined here until runtime package is written
export interface ExecutionResult {
  metadata: ScriptMetadata | null;
  plots: PlotData[];
  hlines: HlineData[];
  fills: FillData[];
  bgcolors: BgColorData[];
  barcolors: BarColorData[];
}

export interface PlotData {
  index: number;
  title: string;
  color: string;
  linewidth: number;
  style: string;
  values: { time: number; value: number | null }[];
}

export interface HlineData {
  index: number;
  price: number;
  title: string;
  color: string;
}

export interface FillData {
  plot1: number;
  plot2: number;
  color: string;
}

export interface BgColorData {
  time: number;
  color: string;
}

export interface BarColorData {
  time: number;
  color: string;
}

// Tracks the active chart so we can destroy it before re-rendering
let activeChart: IChartApi | null = null;

export function renderResults(
  container: HTMLElement,
  bars: Bar[],
  results: ExecutionResult
): void {
  // Destroy previous chart if any
  if (activeChart) {
    activeChart.remove();
    activeChart = null;
  }
  container.innerHTML = '';

  const overlay = results.metadata?.overlay ?? true;
  const chart = createChart(container);
  activeChart = chart;

  // Always render candlesticks
  const candleSeries = renderCandlesticks(chart, bars);

  // Render plots
  const plotSeriesMap = new Map<number, ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | ISeriesApi<'Area'>>();
  for (const plotData of results.plots) {
    const priceScaleId = overlay ? 'right' : `plot-${plotData.index}`;
    const series = renderPlot(chart, plotData, priceScaleId);
    plotSeriesMap.set(plotData.index, series as any);
  }

  // Render horizontal lines as price lines on the candlestick series
  if (results.hlines.length > 0) {
    for (const hline of results.hlines) {
      candleSeries.createPriceLine({
        price: hline.price,
        color: hline.color || '#888888',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: hline.title,
      });
    }
  }

  chart.timeScale().fitContent();
  void plotSeriesMap; // suppress unused warning until fills are wired
}

export function clearChart(container: HTMLElement): void {
  if (activeChart) {
    activeChart.remove();
    activeChart = null;
  }
  container.innerHTML = '';
}
