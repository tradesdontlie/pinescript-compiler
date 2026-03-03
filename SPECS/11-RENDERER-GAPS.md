# 11 — Renderer Gaps

> **Status**: PARTIAL (candlesticks + line plots + hlines)
> **Priority**: P0 for drawing objects, P1 for other plot types
> **File**: `src/renderer/index.ts`, `src/renderer/series-renderer.ts`, `src/renderer/fill-renderer.ts`, `src/renderer/chart-manager.ts`

---

## What Exists

### Working
- Candlestick chart rendering via `lightweight-charts`
- Line plot rendering (line, histogram, area styles)
- Horizontal lines (hline) rendered as price lines on the candlestick series
- Chart creation, destruction, and re-rendering
- `chart.timeScale().fitContent()` for auto-fitting

### Runtime Data Available (but not rendered)
The engine produces these data structures that the renderer doesn't yet consume:
- `fills: FillData[]` — fill between two plots
- `bgcolors: BgColorData[]` — background color per bar
- `barcolors: BarColorData[]` — bar color per bar
- `plotshapes: PlotShapeData[]` — shape markers
- `plotchars: PlotCharData[]` — character markers
- `plotarrows: PlotArrowData[]` — arrow markers
- `plotcandles: PlotCandleData[]` — custom candlestick overlays
- `plotbars: PlotBarData[]` — custom bar overlays

---

## What's Missing

### 1. Drawing Object Rendering — P0

**What**: Render `line`, `label`, `box` objects from the runtime onto the chart.

**Lightweight Charts support:**
- Lines → Use `createLineSeries()` with two-point data, or the built-in `createLine()` primitive
- Labels → Use markers API or custom HTML overlays
- Boxes → Use custom area series or HTML overlays

**Implementation approach:**

#### Lines
```typescript
function renderDrawingLines(chart: IChartApi, lines: LineObject[]): void {
    for (const line of lines) {
        if (line.deleted) continue;

        // Use lightweight-charts line primitive (v4+)
        // Or create a line series with just two points
        const lineSeries = chart.addLineSeries({
            color: line.color,
            lineWidth: line.width,
            lineStyle: mapLineStyle(line.style),
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const data = [];
        if (line.xloc === 'bar_time') {
            data.push({ time: line.x1 / 1000, value: line.y1 });
            data.push({ time: line.x2 / 1000, value: line.y2 });
        }
        // For xloc.bar_index, convert bar index to time
        lineSeries.setData(data);
    }
}

function mapLineStyle(style: string): number {
    // lightweight-charts LineStyle enum
    switch (style) {
        case 'solid': return 0;
        case 'dotted': return 1;
        case 'dashed': return 2;
        default: return 0;
    }
}
```

#### Labels
```typescript
function renderDrawingLabels(chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>, labels: LabelObject[]): void {
    const markers = labels
        .filter(l => !l.deleted)
        .map(l => ({
            time: (l.xloc === 'bar_time' ? l.x : l.x) / 1000 as any,
            position: mapLabelPosition(l.style),
            color: l.color,
            shape: mapLabelShape(l.style),
            text: l.text,
        }));

    candleSeries.setMarkers(markers);
}
```

#### Boxes
```typescript
function renderDrawingBoxes(chart: IChartApi, boxes: BoxObject[]): void {
    for (const box of boxes) {
        if (box.deleted) continue;
        // Use custom series or overlay
        // Lightweight Charts doesn't have native box support
        // Options:
        // 1. Use two horizontal lines + area fill
        // 2. Use custom HTML overlay
        // 3. Use the primitives API (v4.1+)
    }
}
```

**Files to create/modify:**
- `src/renderer/drawing-renderer.ts` — new file for line/label/box/table rendering
- `src/renderer/index.ts` — import and call drawing renderers

---

### 2. Fill Rendering — P1

**What**: Fill the area between two plot series with a color.

```typescript
function renderFills(chart: IChartApi, fills: FillData[], plotSeriesMap: Map<number, ISeriesApi<any>>): void {
    for (const fill of fills) {
        const s1 = plotSeriesMap.get(fill.plot1);
        const s2 = plotSeriesMap.get(fill.plot2);
        if (!s1 || !s2) continue;

        // Use lightweight-charts area between series
        // This requires creating a custom stacked area or using primitives
    }
}
```

**Alternative:** The existing `fill-renderer.ts` may already have partial support. Check and extend.

---

### 3. bgcolor Rendering — P1

**What**: Color the chart background for specific bars.

```typescript
function renderBgcolors(chart: IChartApi, bgcolors: BgColorData[]): void {
    // Lightweight Charts doesn't have per-bar background coloring
    // Options:
    // 1. Use a histogram series at the bottom with 100% height
    // 2. Use custom canvas rendering
    // 3. Use markers or watermarks per bar
}
```

**Practical approach:** Create a hidden histogram series that spans the full price range for each bar with the specified color and high opacity.

---

### 4. barcolor Rendering — P1

**What**: Change individual candlestick bar colors.

```typescript
function renderBarcolors(candleSeries: ISeriesApi<'Candlestick'>, bars: Bar[], barcolors: BarColorData[]): void {
    // Create a map of time → color
    const colorMap = new Map<number, string>();
    for (const bc of barcolors) {
        colorMap.set(bc.time, bc.color);
    }

    // Re-render candlesticks with per-bar coloring
    // Lightweight Charts supports per-bar colors via the data array
    const data = bars.map(bar => ({
        time: bar.time / 1000,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        ...(colorMap.has(bar.time) ? {
            color: colorMap.get(bar.time),
            borderColor: colorMap.get(bar.time),
            wickColor: colorMap.get(bar.time),
        } : {}),
    }));
    candleSeries.setData(data as any);
}
```

---

### 5. plotshape / plotchar / plotarrow Rendering — P1

**What**: Render shape/character/arrow markers on the chart.

```typescript
function renderPlotshapes(candleSeries: ISeriesApi<'Candlestick'>, shapes: PlotShapeData[]): void {
    const markers = [];
    for (const shape of shapes) {
        for (const point of shape.values) {
            if (point.value === null) continue;
            markers.push({
                time: point.time / 1000,
                position: mapShapeLocation(shape.location),
                color: shape.color,
                shape: mapShapeStyle(shape.style),
                text: point.text ?? '',
            });
        }
    }
    // Merge with existing markers (from labels) and set
    candleSeries.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
}

function mapShapeLocation(loc: string): string {
    switch (loc) {
        case 'abovebar': return 'aboveBar';
        case 'belowbar': return 'belowBar';
        case 'top': return 'aboveBar';
        case 'bottom': return 'belowBar';
        default: return 'aboveBar';
    }
}

function mapShapeStyle(style: string): string {
    // lightweight-charts marker shapes: 'circle', 'square', 'arrowUp', 'arrowDown'
    switch (style) {
        case 'triangleup': return 'arrowUp';
        case 'triangledown': return 'arrowDown';
        case 'circle': return 'circle';
        case 'cross': return 'square';
        case 'xcross': return 'square';
        default: return 'circle';
    }
}
```

---

### 6. plotcandle / plotbar Rendering — P1

**What**: Render custom OHLC data as additional candlestick/bar overlays.

```typescript
function renderPlotcandles(chart: IChartApi, plotcandles: PlotCandleData[]): void {
    for (const pc of plotcandles) {
        const series = chart.addCandlestickSeries({
            upColor: pc.color,
            downColor: pc.color,
            borderUpColor: pc.bordercolor,
            borderDownColor: pc.bordercolor,
            wickUpColor: pc.wickcolor,
            wickDownColor: pc.wickcolor,
        });
        series.setData(pc.values.map(v => ({
            time: v.time / 1000,
            open: v.open, high: v.high, low: v.low, close: v.close,
        })) as any);
    }
}
```

---

### 7. Table Rendering — P1

**What**: Render table overlays on the chart.

Tables in Pine Script are positioned HTML-like overlays on the chart (e.g., top-right corner). They are NOT part of the chart series data.

```typescript
function renderTables(container: HTMLElement, tables: TableObject[]): void {
    for (const table of tables) {
        if (table.deleted) continue;

        const tableEl = document.createElement('div');
        tableEl.className = `pine-table pine-table-${table.position}`;
        tableEl.style.position = 'absolute';
        tableEl.style.zIndex = '10';
        // Position based on table.position (top_right, bottom_left, etc.)
        positionTable(tableEl, table.position);

        const htmlTable = document.createElement('table');
        htmlTable.style.backgroundColor = table.bgcolor;
        htmlTable.style.borderCollapse = 'collapse';

        for (let r = 0; r < table.rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < table.columns; c++) {
                const cell = table.cells?.[r]?.[c];
                const td = document.createElement('td');
                td.textContent = cell?.text ?? '';
                td.style.color = cell?.text_color ?? '#FFFFFF';
                td.style.backgroundColor = cell?.bgcolor ?? 'transparent';
                td.style.fontSize = mapSize(cell?.text_size);
                td.style.textAlign = cell?.text_halign ?? 'center';
                td.style.padding = '2px 4px';
                td.style.border = `${table.border_width}px solid ${table.border_color}`;
                tr.appendChild(td);
            }
            htmlTable.appendChild(tr);
        }

        tableEl.appendChild(htmlTable);
        container.appendChild(tableEl);
    }
}
```

---

### 8. Multi-pane Layout — P1

**What**: When `overlay=false`, indicators should render in a separate pane below the price chart (like RSI, MACD).

**Current behavior:** All plots render on the price chart's right scale (if overlay) or on a plot-specific scale (not overlay), but always in the same chart pane.

**Implementation:**
- Create multiple `lightweight-charts` instances stacked vertically
- Top pane: price chart (candlesticks)
- Bottom pane(s): non-overlay indicator plots
- Sync time scales between panes

---

### 9. Strategy Trade Markers — P2

**What**: When a strategy script generates trades, render entry/exit markers on the chart.

```typescript
function renderStrategyMarkers(candleSeries: ISeriesApi<'Candlestick'>, strategy: StrategyResult): void {
    const markers = strategy.trades.map(trade => ({
        time: trade.entryTime / 1000,
        position: trade.direction === 'long' ? 'belowBar' : 'aboveBar',
        color: trade.direction === 'long' ? '#4CAF50' : '#FF5252',
        shape: trade.direction === 'long' ? 'arrowUp' : 'arrowDown',
        text: `${trade.direction === 'long' ? 'BUY' : 'SELL'} @ ${trade.entryPrice.toFixed(2)}`,
    }));
    candleSeries.setMarkers(markers);
}
```

---

## Updated ExecutionResult Interface

The `ExecutionResult` in `src/renderer/index.ts` needs to be updated to include new data:

```typescript
export interface ExecutionResult {
    metadata: ScriptMetadata | null;
    plots: PlotData[];
    hlines: HlineData[];
    fills: FillData[];
    bgcolors: BgColorData[];
    barcolors: BarColorData[];
    plotshapes: PlotShapeData[];
    plotchars: PlotCharData[];
    plotarrows: PlotArrowData[];
    plotcandles: PlotCandleData[];
    plotbars: PlotBarData[];
    lines: LineObject[];      // NEW
    labels: LabelObject[];    // NEW
    boxes: BoxObject[];       // NEW
    tables: TableObject[];    // NEW
    strategy?: StrategyResult;
}
```

---

## Acceptance Criteria

1. Lines render as two-point line series on the chart with correct style/color/width
2. Labels render as markers on the chart with correct text and position
3. Boxes render as colored rectangles between two price levels and two time points
4. Tables render as positioned HTML overlays on the chart
5. plotshape markers appear at correct locations with correct shapes
6. barcolor changes individual candlestick colors
7. bgcolor creates colored background sections on the chart
8. Fill creates a shaded area between two plot series
9. Multiple drawing objects render simultaneously without conflicts
10. Rendering performance is acceptable with 500+ drawing objects
