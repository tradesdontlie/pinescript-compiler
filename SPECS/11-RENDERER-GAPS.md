# 11 — Renderer Gaps

> **Status**: P0 COMPLETE — drawing-renderer.ts wired; lines/labels/boxes/tables/plotshape/plotarrow/bgcolor/barcolor render.  P1 items (plotchar, plotcandle, plotbar, fill, multi-pane, strategy markers) remain.
> **Priority**: P1 for remaining visualization
> **Files**: `src/renderer/index.ts`, `src/renderer/drawing-renderer.ts`, `src/renderer/fill-renderer.ts`, `src/renderer/candlestick-renderer.ts`

---

## What Exists

### Fully Implemented and Wired Modules

| File | What it does | Status |
|------|-------------|--------|
| `drawing-renderer.ts` | `renderLines`, `renderLabels`, `renderBoxes`, `renderTables`, `renderPlotshapeMarkers`, `renderPlotarrowMarkers` | ✅ Implemented and wired (P0 DONE) |
| `fill-renderer.ts` | `renderFill` — area series approximation between two plots | ✅ Implemented — NOT wired (P1) |
| `candlestick-renderer.ts` | `renderCandlesticks` with optional barcolor override | ✅ Wired (P0 DONE) |
| `series-renderer.ts` | `renderPlot` — line/histogram/area/circles/stepline/cross styles | ✅ Wired |

### Runtime Data Consumption Status

The `ExecutionResult` from `src/runtime/index.ts` is imported by `src/renderer/index.ts` (unified type — no longer duplicated):

| Field | Type | Renderer Status |
|-------|------|-------|
| `plots` | `PlotData[]` | ✅ Wired (series-renderer.ts) |
| `hlines` | `HlineData[]` | ✅ Wired (priceLine API) |
| `fills` | `FillData[]` | NOT wired (P1) |
| `bgcolors` | `BgColorData[]` | ✅ Wired (bgcolor-renderer.ts, histogram approach) |
| `barcolors` | `BarColorData[]` | ✅ Wired (candlestick-renderer.ts per-bar color) |
| `plotshapes` | `PlotShapeData[]` | ✅ Wired (drawing-renderer.ts markers) |
| `plotchars` | `PlotCharData[]` | NOT wired (P1) |
| `plotarrows` | `PlotArrowData[]` | ✅ Wired (drawing-renderer.ts markers) |
| `plotcandles` | `PlotCandleData[]` | NOT wired (P1) |
| `plotbars` | `PlotBarData[]` | NOT wired (P1) |
| `lines` | `LineObject[]` | ✅ Wired (drawing-renderer.ts) |
| `labels` | `LabelObject[]` | ✅ Wired (drawing-renderer.ts) |
| `boxes` | `BoxObject[]` | ✅ Wired (drawing-renderer.ts) |
| `tables` | `TableObject[]` | ✅ Wired (drawing-renderer.ts HTML overlay) |

---

## Completed P0 Work

### Task 1: Reconcile ExecutionResult Interface — DONE

**File**: `src/renderer/index.ts`

**Done**: The local `ExecutionResult` duplicate was removed. `src/renderer/index.ts` now imports the unified type from `src/runtime/index.ts` and re-exports it for downstream consumers. All 14 fields are accessible in `renderResults()`.

---

### Task 2: Wire Drawing Objects (Lines, Labels, Boxes, Tables) — DONE

**File**: `src/renderer/index.ts`

**Done**: `drawing-renderer.ts` is imported and called in `renderResults()`. Drawing objects with `xloc === 'bar_index'` map to bar timestamps from the bars array. Marker consolidation (`setMarkers` called once) avoids overwrites between labels, plotshape, and plotarrow markers.

**Implementation**:

```typescript
import {
  renderLines, renderLabels, renderBoxes, renderTables,
  renderPlotshapeMarkers, renderPlotarrowMarkers,
  LineDrawing, LabelDrawing, BoxDrawing, TableDrawing,
} from './drawing-renderer';
import { renderFill } from './fill-renderer';

export function renderResults(
  container: HTMLElement,
  bars: Bar[],
  results: ExecutionResult
): void {
  if (activeChart) { activeChart.remove(); activeChart = null; }
  container.innerHTML = '';

  const chart = createChart(container);
  activeChart = chart;
  const overlay = results.metadata?.overlay ?? true;

  // 1. Candlesticks (with optional barcolor override)
  const candleSeries = renderCandlesticks(chart, bars, results.barcolors);

  // 2. Plot series
  const plotSeriesMap = new Map<number, ISeriesApi<any>>();
  for (const plotData of results.plots) {
    const priceScaleId = overlay ? 'right' : `plot-${plotData.index}`;
    const series = renderPlot(chart, plotData, priceScaleId);
    plotSeriesMap.set(plotData.index, series);
  }

  // 3. Horizontal lines
  for (const hline of results.hlines) {
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
  if (results.labels?.length) {
    renderLabels(candleSeries, results.labels as LabelDrawing[]);
  }
  if (results.boxes?.length) {
    renderBoxes(chart, results.boxes as BoxDrawing[]);
  }
  if (results.tables?.length) {
    renderTables(container, results.tables as TableDrawing[]);
  }

  // 6. Plot markers (shapes and arrows)
  if (results.plotshapes?.length) {
    renderPlotshapeMarkers(candleSeries, results.plotshapes);
  }
  if (results.plotarrows?.length) {
    renderPlotarrowMarkers(candleSeries, results.plotarrows);
  }

  // 7. bgcolor (P1 — see below)
  // 8. plotchar (P1 — see below)

  chart.timeScale().fitContent();
}
```

**Status**: All drawing object types render correctly on the chart.

---

### Task 3: Fix barcolor Rendering — DONE

**File**: `src/renderer/candlestick-renderer.ts`

**Done**: `renderCandlesticks` accepts optional `barcolors` param. A time→color map is built from `BarColorData[]`; per-bar `color`, `wickColor`, and `borderColor` are injected into `CandlestickData` for each bar that has an override. Lightweight-charts v4 per-bar color fields are used.

---

## Remaining P1 Work: fill, plotchar, plotcandle/plotbar, multi-pane, strategy markers

### Task 4: Fill Rendering Between Plots — P1

**File**: `src/renderer/fill-renderer.ts` (already implemented but not wired into `index.ts`).

**Current gap**: `fill-renderer.ts` implements `renderFill()` using an AreaSeries approximation between two plots. It is not called from `renderResults()`.

**Fix**: Wire in `index.ts`:
```typescript
for (const fill of results.fills ?? []) {
    renderFill(chart, fill, results.plots);
}
```

**Acceptance**: `fill(plot1, plot2, color=color.new(color.blue, 90))` renders a shaded band between the two plot series.
**Est**: ~5 LOC in index.ts.

---

### Task 5: bgcolor Rendering — P1

**File**: `src/renderer/bgcolor-renderer.ts` (already partially specified).

**Problem**: Lightweight-charts has no native per-bar background color API. Must approximate.

**Technical Approach — Histogram Overlay**:

Create a histogram series at max price scale with near-zero opacity border, using the bgcolor color fill. The series will span the full visible price range via `autoscaleInfoProvider`:

```typescript
export function renderBgcolors(
  chart: IChartApi,
  bgcolors: BgColorData[],
  bars: Bar[],
): ISeriesApi<'Histogram'> | null {
  if (!bgcolors.length) return null;

  // Build a map time → color
  const colorMap = new Map<number, string>();
  for (const bg of bgcolors) {
    colorMap.set(bg.time, bg.color);
  }

  // Create one histogram entry per bar that has a bgcolor
  // Use a custom series with autoscaleInfoProvider to fill full height
  const series = chart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: 'bgcolor',   // Separate scale so it doesn't affect price scale
    lastValueVisible: false,
    priceLineVisible: false,
  });

  // Attach to the left side with 0..1 scale (full height)
  chart.priceScale('bgcolor').applyOptions({
    scaleMargins: { top: 0, bottom: 0 },
    visible: false,
  });

  const data = bars
    .filter(b => colorMap.has(b.time))
    .map(b => ({
      time: b.time as UTCTimestamp,
      value: 1,
      color: colorMap.get(b.time)!,
    }))
    .sort((a, b) => (a.time as number) - (b.time as number));

  series.setData(data);
  return series;
}
```

**Limitation**: The histogram approach produces bar-width colored columns, not full-height background shading. A full solution requires the Lightweight Charts Primitives API (v4.1+). See note on primitives below.

**Lightweight Charts Primitives API Alternative** (preferred for v4.1+):
```typescript
// Use ISeriesPrimitive to draw custom canvas elements per bar
// This gives full control over background rendering
// Requires implementing the ISeriesPrimitive interface
```

**Acceptance**: `bgcolor(close > open ? color.new(color.green, 90) : na)` colors the chart background green on bullish bars.
**Est**: ~80 LOC (histogram approach); ~150 LOC (primitives approach).
**Recommendation**: Implement histogram approach first (P1), primitives approach as P2.

### Task 6: plotchar Rendering — P1

**File**: `src/renderer/drawing-renderer.ts`

**Current gap**: `renderPlotshapeMarkers` handles `plotshape` data. No equivalent for `plotchar`. PlotChar uses a custom Unicode character (e.g., `★`, `↑`), but lightweight-charts markers only support 4 shapes: circle, square, arrowUp, arrowDown.

**Approach**: Use the `text` field of a marker to display the character; use `circle` shape as a minimal marker anchor:

```typescript
export function renderPlotcharMarkers(
  candleSeries: ISeriesApi<'Candlestick'>,
  plotchars: PlotCharData[],
): void {
  const allMarkers: any[] = [];
  for (const pc of plotchars) {
    for (const v of pc.values) {
      if (v.value === null) continue;
      const position = pc.location === 'belowbar' ? 'belowBar' :
                       pc.location === 'abovebar' ? 'aboveBar' : 'inBar';
      allMarkers.push({
        time: v.time as UTCTimestamp,
        position,
        color: pc.color || '#2962FF',
        shape: 'circle' as const,
        text: pc.char || '•',
      });
    }
  }
  if (allMarkers.length > 0) {
    allMarkers.sort((a, b) => (a.time as number) - (b.time as number));
    const existing = candleSeries.markers?.() ?? [];
    candleSeries.setMarkers([...existing, ...allMarkers]);
  }
}
```

**Wire in index.ts**:
```typescript
if (results.plotchars?.length) {
  renderPlotcharMarkers(candleSeries, results.plotchars);
}
```

**Limitation**: The `char` is shown as the marker text label, not as a custom glyph. Positioning may vary by character width.
**Acceptance**: `plotchar(crossover, char="★", location=location.belowbar)` renders a star below bars on crossover.
**Est**: ~40 LOC in drawing-renderer.ts + ~5 LOC in index.ts.

### Task 7: plotcandle / plotbar Rendering — P1

**File**: New `src/renderer/plotcandle-renderer.ts` or inline in `drawing-renderer.ts`.

**Approach**: Each `plotcandle` or `plotbar` call creates a separate candlestick/bar series layered on top of the main chart:

```typescript
export function renderPlotcandles(
  chart: IChartApi,
  plotcandles: PlotCandleData[],
): ISeriesApi<'Candlestick'>[] {
  const seriesList: ISeriesApi<'Candlestick'>[] = [];
  for (const pc of plotcandles) {
    const series = chart.addCandlestickSeries({
      upColor: pc.color || '#26a69a',
      downColor: pc.color || '#ef5350',
      borderUpColor: pc.bordercolor || pc.color || '#26a69a',
      borderDownColor: pc.bordercolor || pc.color || '#ef5350',
      wickUpColor: pc.wickcolor || '#26a69a',
      wickDownColor: pc.wickcolor || '#ef5350',
      priceScaleId: 'right',
      lastValueVisible: false,
    });
    const data = pc.values
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
```

**Wire in index.ts**:
```typescript
if (results.plotcandles?.length) renderPlotcandles(chart, results.plotcandles);
if (results.plotbars?.length) renderPlotbars(chart, results.plotbars);
```

**Acceptance**: `plotcandle(open, high, low, close)` renders a secondary candlestick series overlaid on the main chart.
**Est**: ~60 LOC in new file + ~10 LOC in index.ts.

### Task 8: Multi-Pane Layout — P1

**File**: New `src/renderer/multi-pane.ts` + changes to `index.ts` and `chart-manager.ts`.

**Problem**: When `overlay=false`, all non-overlay plots currently render on the same price scale as the main candlestick chart — they share the price axis and may cause scale distortion (e.g., RSI 0-100 overlaid on AAPL price 150-200).

**Desired behavior**: Non-overlay scripts render in a separate chart pane stacked vertically below the price chart, with synchronized time scales.

**Technical Approach**:

Lightweight-charts does not support true multi-pane charts in a single chart instance. Each pane requires a separate `IChartApi` instance. They are synchronized via `.timeScale().subscribeVisibleLogicalRangeChange()`.

```typescript
// src/renderer/multi-pane.ts

export interface PaneConfig {
  container: HTMLElement;
  heightRatio: number; // 0..1 fraction of total height
}

export function createSyncedPanes(
  outerContainer: HTMLElement,
  paneConfigs: PaneConfig[],
): IChartApi[] {
  const charts: IChartApi[] = [];
  const totalHeight = outerContainer.clientHeight || 600;

  for (const config of paneConfigs) {
    const div = document.createElement('div');
    div.style.height = `${Math.round(totalHeight * config.heightRatio)}px`;
    outerContainer.appendChild(div);
    const chart = createChartInstance(div);
    charts.push(chart);
  }

  // Sync time scales across all panes
  for (let i = 0; i < charts.length; i++) {
    charts[i].timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range === null) return;
      for (let j = 0; j < charts.length; j++) {
        if (i !== j) charts[j].timeScale().setVisibleLogicalRange(range);
      }
    });
  }

  return charts;
}
```

**Layout strategy in renderResults()**:
- If `metadata.overlay === true` OR no plots present: single chart with candlesticks
- If `metadata.overlay === false`: two charts — top (70% height) has candlesticks only, bottom (30%) has indicator plots
- If script has BOTH overlay and non-overlay plots (e.g., MA on price + RSI below): three sections

**Data flow**:
```typescript
export function renderResults(
  container: HTMLElement,
  bars: Bar[],
  results: ExecutionResult
): void {
  const hasOverlayPlots = results.plots.some(p => results.metadata?.overlay);
  const hasNonOverlayPlots = results.plots.length > 0 && !results.metadata?.overlay;

  if (!hasNonOverlayPlots) {
    // Single chart path (current behavior)
    renderSingleChart(container, bars, results);
  } else {
    // Multi-pane path
    renderMultiPane(container, bars, results);
  }
}
```

**Acceptance**:
- RSI script renders in pane below price chart with 0-100 scale, not mixed with price
- Time scales scroll and zoom in sync across all panes
- Crosshair moves in sync across panes (requires additional sync: `subscribeCrosshairMove`)
**Est**: ~150 LOC in multi-pane.ts + ~40 LOC refactor in index.ts.

### Task 9: Strategy Trade Markers — P1

**File**: `src/renderer/drawing-renderer.ts` or new `src/renderer/strategy-renderer.ts`.

**When**: `results.strategy` has trades with entry/exit times and prices.

**Approach**: Render entry markers as arrowUp/green below bars, exit markers as arrowDown/red above bars. Add text with price.

```typescript
import type { StrategyResult } from '../runtime/builtins/strategy';

export function renderStrategyMarkers(
  candleSeries: ISeriesApi<'Candlestick'>,
  strategy: StrategyResult,
): void {
  const markers: any[] = [];

  for (const trade of strategy.closedTrades ?? []) {
    // Entry marker
    markers.push({
      time: (trade.entryTime / 1000) as UTCTimestamp,
      position: trade.direction === 'long' ? 'belowBar' : 'aboveBar',
      color: trade.direction === 'long' ? '#4CAF50' : '#FF5252',
      shape: trade.direction === 'long' ? 'arrowUp' : 'arrowDown',
      text: `${trade.direction === 'long' ? 'L' : 'S'} ${trade.entryPrice.toFixed(2)}`,
    });
    // Exit marker
    if (trade.exitTime) {
      const pnl = trade.profit ?? 0;
      markers.push({
        time: (trade.exitTime / 1000) as UTCTimestamp,
        position: trade.direction === 'long' ? 'aboveBar' : 'belowBar',
        color: pnl >= 0 ? '#4CAF50' : '#FF5252',
        shape: pnl >= 0 ? 'arrowDown' : 'arrowUp',
        text: `X ${trade.exitPrice?.toFixed(2) ?? ''}`,
      });
    }
  }

  if (markers.length > 0) {
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    const existing = candleSeries.markers?.() ?? [];
    candleSeries.setMarkers([...existing, ...markers]);
  }
}
```

**Wire in index.ts**:
```typescript
if (results.strategy?.closedTrades?.length) {
  renderStrategyMarkers(candleSeries, results.strategy);
}
```

**Acceptance**: A strategy script shows green/red entry/exit arrows on the chart at the correct bars with price labels.
**Est**: ~50 LOC in strategy-renderer.ts + ~5 LOC in index.ts.

### Task 10: Marker Merge Correctness — P1 (if needed)

**Current issue**: `renderLabels`, `renderPlotshapeMarkers`, and `renderPlotarrowMarkers` each call `candleSeries.setMarkers()`. The last call wins — earlier markers are overwritten.

**Fix**: Collect all markers into a single array before calling `setMarkers` once:

```typescript
// In renderResults(), after all series are created:
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
if (results.strategy?.closedTrades?.length) {
  allMarkers.push(...collectStrategyMarkers(results.strategy));
}

// Single setMarkers call
if (allMarkers.length > 0) {
  allMarkers.sort((a, b) => (a.time as number) - (b.time as number));
  candleSeries.setMarkers(allMarkers);
}
```

Refactor drawing-renderer.ts functions to be `collect*` (return arrays) rather than `render*` (call setMarkers directly).

**Acceptance**: A script with both `plotshape` and `label.new()` calls shows both sets of markers simultaneously.
**Est**: ~40 LOC refactor in drawing-renderer.ts + index.ts.

---

## Updated ExecutionResult for Renderer

`src/renderer/index.ts` should import and re-export from `src/runtime/index.ts`:

```typescript
// src/renderer/index.ts — remove local type definitions, import from runtime:
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
```

Drawing types (`LineDrawing`, `LabelDrawing`, `BoxDrawing`, `TableDrawing`) remain in `drawing-renderer.ts` as renderer-level interfaces.

---

## Implementation Priority

| Task | Priority | LOC Est | Status |
|------|----------|---------|--------|
| 1. Reconcile ExecutionResult | P0 | ~20 | ✅ Done |
| 2. Wire drawing objects | P0 | ~60 | ✅ Done |
| 3. barcolor rendering | P0 | ~30 | ✅ Done |
| bgcolor rendering | P0 | ~80 | ✅ Done |
| Marker merge fix | P0 | ~40 | ✅ Done |
| 4. Fill rendering (wiring) | P1 | ~5 | Remaining |
| 6. plotchar rendering | P1 | ~45 | Remaining |
| 7. plotcandle/plotbar | P1 | ~70 | Remaining |
| 8. Strategy markers | P1 | ~55 | Remaining |
| Multi-pane layout | P1 | ~190 | Remaining |
| **Total P1 remaining** | | **~365** | |

---

## Acceptance Criteria

### P0 — All verified ✅

1. ✅ `renderLines` wired — lines render as LineSeries with two price endpoints
2. ✅ `renderLabels` wired — labels render as markers on candleSeries
3. ✅ `renderBoxes` wired — boxes render as AreaSeries approximation (top/bottom edges)
4. ✅ `renderTables` wired — tables render as positioned HTML overlay with correct cell styling
5. ✅ `renderPlotshapeMarkers` wired — shape→arrowUp/Down/circle/square mapping
6. ✅ `renderPlotarrowMarkers` wired — positive→arrowUp green, negative→arrowDown red
7. ✅ Drawing objects (lines/labels/boxes/tables) render when script uses them
8. ✅ plotshape/plotarrow/label markers merged into single `setMarkers` call (no overwrite)
9. ✅ barcolor overrides individual candlestick colors per-bar
10. ✅ bgcolor renders colored histogram columns per bar
11. ✅ TypeScript compiles cleanly with unified ExecutionResult type

### P1 — Remaining

12. [ ] `fill(p1, p2)` renders shaded area between two plot series (fill-renderer.ts wiring)
13. [ ] plotchar renders Unicode characters as marker text at correct bar positions
14. [ ] plotcandle renders secondary candlestick overlay series on main chart
15. [ ] plotbar renders secondary bar overlay series on main chart
16. [ ] RSI/MACD non-overlay indicators render in separate pane below price chart
17. [ ] Time scales sync across all panes on scroll/zoom
18. [ ] Strategy entry/exit trades shown as arrow markers with price labels
