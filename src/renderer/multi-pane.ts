import { IChartApi } from 'lightweight-charts';
import { Bar } from '../data/types';
import { ExecutionResult } from '../runtime/index';
import { createChart } from './chart-manager';
import { renderSingleChart } from './single-pane';

/**
 * Render a multi-pane layout when overlay=false.
 * Top pane (70%): main candlestick chart.
 * Bottom pane (30%): indicator plots with synchronized time scale.
 *
 * Returns all created chart instances so they can be tracked and destroyed on re-render.
 */
export function renderMultiPane(
  outerContainer: HTMLElement,
  bars: Bar[],
  results: ExecutionResult,
): IChartApi[] {
  const totalHeight = outerContainer.clientHeight || 600;
  const mainHeight = Math.round(totalHeight * 0.7);
  const indicatorHeight = totalHeight - mainHeight;

  // Create wrapper divs
  const mainDiv = document.createElement('div');
  mainDiv.style.width = '100%';
  mainDiv.style.height = `${mainHeight}px`;
  mainDiv.style.position = 'relative';

  const indicatorDiv = document.createElement('div');
  indicatorDiv.style.width = '100%';
  indicatorDiv.style.height = `${indicatorHeight}px`;
  indicatorDiv.style.position = 'relative';

  outerContainer.style.display = 'flex';
  outerContainer.style.flexDirection = 'column';
  outerContainer.appendChild(mainDiv);
  outerContainer.appendChild(indicatorDiv);

  // Create top chart with candlesticks only (no plots)
  const mainChart = createChart(mainDiv);
  const candleOnlyResult: ExecutionResult = {
    ...results,
    plots: [],
    hlines: [],
    fills: [],
    bgcolors: [],
    plotshapes: [],
    plotchars: [],
    plotarrows: [],
    plotcandles: [],
    plotbars: [],
    lines: [],
    labels: [],
    boxes: [],
    tables: [],
    strategy: undefined,
  };
  renderSingleChart(mainChart, mainDiv, bars, candleOnlyResult, 'right');

  // Create bottom chart with indicator plots only (no candlesticks)
  const indicatorChart = createChart(indicatorDiv);
  renderSingleChart(indicatorChart, indicatorDiv, bars, results, 'right');

  // Sync time scales: when either chart scrolls/zooms, update the other
  syncTimeScales([mainChart, indicatorChart]);

  // Fit both charts
  mainChart.timeScale().fitContent();
  indicatorChart.timeScale().fitContent();

  return [mainChart, indicatorChart];
}

/**
 * Synchronize the visible logical range across multiple chart instances.
 */
export function syncTimeScales(charts: IChartApi[]): void {
  let isSyncing = false;

  for (let i = 0; i < charts.length; i++) {
    charts[i].timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (isSyncing || range === null) return;
      isSyncing = true;
      for (let j = 0; j < charts.length; j++) {
        if (i !== j) {
          charts[j].timeScale().setVisibleLogicalRange(range);
        }
      }
      isSyncing = false;
    });
  }
}
