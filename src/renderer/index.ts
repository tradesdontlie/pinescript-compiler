import { IChartApi } from 'lightweight-charts';
import { Bar } from '../data/types';
import { ExecutionResult } from '../runtime/index';
import { createChart } from './chart-manager';
import { renderSingleChart } from './single-pane';
import { renderMultiPane } from './multi-pane';

// Re-export runtime types for downstream consumers
export type {
  ExecutionResult,
  PlotData,
  HlineData,
  FillData,
  BgColorData,
  BarColorData,
  PlotShapeData,
  PlotCharData,
  PlotArrowData,
  PlotCandleData,
  PlotBarData,
} from '../runtime/index';

// Re-export renderSingleChart for multi-pane and other consumers
export { renderSingleChart } from './single-pane';

// Tracks the active chart(s) so we can destroy them before re-rendering
let activeCharts: IChartApi[] = [];

export function renderResults(
  container: HTMLElement,
  bars: Bar[],
  results: ExecutionResult
): void {
  // Destroy previous charts
  for (const c of activeCharts) {
    c.remove();
  }
  activeCharts = [];
  container.innerHTML = '';

  const overlay = results.metadata?.overlay ?? true;
  const hasNonOverlayPlots = results.plots.length > 0 && !overlay;

  if (hasNonOverlayPlots) {
    // Multi-pane path: candlesticks on top, indicator below
    const charts = renderMultiPane(container, bars, results);
    activeCharts = charts;
  } else {
    // Single chart path
    const chart = createChart(container);
    activeCharts = [chart];
    renderSingleChart(chart, container, bars, results, 'right');
  }
}

export function clearChart(container: HTMLElement): void {
  for (const c of activeCharts) {
    c.remove();
  }
  activeCharts = [];
  container.innerHTML = '';
}
