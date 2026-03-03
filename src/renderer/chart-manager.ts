import { createChart as lcCreateChart, IChartApi, ColorType, CrosshairMode } from 'lightweight-charts';

const DARK_THEME = {
  background: { type: ColorType.Solid, color: '#0d1117' },
  textColor: '#9ca3af',
  grid: {
    vertLines: { color: '#1e2530', style: 0 },
    horzLines: { color: '#1e2530', style: 0 },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: '#4b5563',
      labelBackgroundColor: '#1f2937',
    },
    horzLine: {
      color: '#4b5563',
      labelBackgroundColor: '#1f2937',
    },
  },
  timeScale: {
    borderColor: '#1e2530',
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 8,
    barSpacing: 8,
    fixLeftEdge: false,
    fixRightEdge: false,
  },
  rightPriceScale: {
    borderColor: '#1e2530',
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
};

export function createChart(container: HTMLElement): IChartApi {
  const chart = lcCreateChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: DARK_THEME.background,
      textColor: DARK_THEME.textColor,
    },
    grid: DARK_THEME.grid,
    crosshair: DARK_THEME.crosshair,
    timeScale: DARK_THEME.timeScale,
    rightPriceScale: DARK_THEME.rightPriceScale,
  });

  // Resize observer to keep chart filling container
  const resizeObserver = new ResizeObserver(() => {
    chart.applyOptions({
      width: container.clientWidth,
      height: container.clientHeight,
    });
  });
  resizeObserver.observe(container);

  // Store cleanup reference on the container for later
  (container as any).__lcResizeObserver = resizeObserver;

  return chart;
}
