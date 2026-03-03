import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Bar } from '../data/types';
import { ExecutionResult } from '../runtime/index';
import { renderCandlesticks } from './candlestick-renderer';
import { renderPlot } from './series-renderer';
import { renderFill } from './fill-renderer';
import {
  renderLines,
  renderBoxes,
  renderTables,
  collectLabelMarkers,
  collectPlotshapeMarkers,
  collectPlotarrowMarkers,
  collectPlotcharMarkers,
  LineDrawing,
  LabelDrawing,
  BoxDrawing,
  TableDrawing,
} from './drawing-renderer';
import { renderPlotcandles, renderPlotbars } from './plotcandle-renderer';
import { collectStrategyMarkers } from './strategy-renderer';

/**
 * Renders a complete Pine Script execution result into a single lightweight-charts instance.
 * Called by both the single-chart path and each pane of the multi-pane layout.
 */
export function renderSingleChart(
  chart: IChartApi,
  container: HTMLElement,
  bars: Bar[],
  results: ExecutionResult,
  priceScaleId: string,
): void {
  // 1. Candlesticks (with optional barcolor override)
  const candleSeries = renderCandlesticks(chart, bars, results.barcolors);

  // 2. Plot series
  const plotSeriesMap = new Map<number, ISeriesApi<any>>();
  for (const plotData of results.plots) {
    const series = renderPlot(chart, plotData, priceScaleId);
    plotSeriesMap.set(plotData.index, series as any);
  }
  void plotSeriesMap;

  // 3. Horizontal lines as price lines on the candlestick series
  for (const hline of results.hlines ?? []) {
    candleSeries.createPriceLine({
      price: hline.price,
      color: hline.color || '#888888',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: hline.title,
    });
  }

  // 4. Fills between plots
  for (const fill of results.fills ?? []) {
    renderFill(chart, fill, results.plots);
  }

  // 5. Drawing objects
  if (results.lines?.length) {
    renderLines(chart, results.lines as LineDrawing[]);
  }
  if (results.boxes?.length) {
    renderBoxes(chart, results.boxes as BoxDrawing[]);
  }
  if (results.tables?.length) {
    renderTables(container, results.tables as TableDrawing[]);
  }

  // 6. plotcandle / plotbar overlays
  if (results.plotcandles?.length) {
    renderPlotcandles(chart, results.plotcandles);
  }
  if (results.plotbars?.length) {
    renderPlotbars(chart, results.plotbars);
  }

  // 7. Collect and merge all markers in a single setMarkers call (avoids overwrites)
  const allMarkers: any[] = [];

  if (results.labels?.length) {
    allMarkers.push(...collectLabelMarkers(results.labels as LabelDrawing[]));
  }
  if (results.plotshapes?.length) {
    allMarkers.push(...collectPlotshapeMarkers(results.plotshapes));
  }
  if (results.plotarrows?.length) {
    allMarkers.push(...collectPlotarrowMarkers(results.plotarrows));
  }
  if (results.plotchars?.length) {
    allMarkers.push(...collectPlotcharMarkers(results.plotchars));
  }
  if (results.strategy?.trades?.length) {
    allMarkers.push(...collectStrategyMarkers(results.strategy));
  }

  if (allMarkers.length > 0) {
    allMarkers.sort((a, b) => (a.time as number) - (b.time as number));
    candleSeries.setMarkers(allMarkers);
  }

  chart.timeScale().fitContent();
}
