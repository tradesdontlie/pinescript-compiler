import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';

// Drawing object interfaces (mirroring runtime types)
export interface LineDrawing {
  id: number;
  x1: number; y1: number; x2: number; y2: number;
  color: string; style: string; width: number;
  _deleted: boolean;
}

export interface LabelDrawing {
  id: number;
  x: number; y: number;
  text: string; color: string; textcolor: string; style: string; size: string;
  _deleted: boolean;
}

export interface BoxDrawing {
  id: number;
  left: number; top: number; right: number; bottom: number;
  bgcolor: string; border_color: string; border_width: number;
  _deleted: boolean;
}

export interface TableDrawing {
  id: number;
  position: string;
  columns: number; rows: number;
  bgcolor: string; border_color: string; border_width: number;
  frame_color: string; frame_width: number;
  cells: ({ text: string; bgcolor: string; text_color: string; text_size: string } | null)[][];
  _deleted: boolean;
}

/**
 * Render line drawing objects as lightweight-charts line series with two data points each.
 */
export function renderLines(
  chart: IChartApi,
  lines: LineDrawing[],
): ISeriesApi<'Line'>[] {
  const seriesList: ISeriesApi<'Line'>[] = [];
  for (const line of lines) {
    if (line._deleted) continue;
    const series = chart.addLineSeries({
      color: line.color || '#2962FF',
      lineWidth: (Math.min(line.width || 1, 4)) as 1 | 2 | 3 | 4,
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const data = [
      { time: line.x1 as UTCTimestamp, value: line.y1 },
      { time: line.x2 as UTCTimestamp, value: line.y2 },
    ].sort((a, b) => (a.time as number) - (b.time as number));
    series.setData(data);
    seriesList.push(series);
  }
  return seriesList;
}

/**
 * Collect label drawing objects as markers (does not call setMarkers).
 */
export function collectLabelMarkers(
  labels: LabelDrawing[],
): any[] {
  return labels
    .filter(l => !l._deleted)
    .map(l => {
      const pos = mapLabelStyleToPosition(l.style);
      return {
        time: l.x as UTCTimestamp,
        position: pos.position as 'aboveBar' | 'belowBar' | 'inBar',
        color: l.textcolor || l.color || '#2962FF',
        shape: pos.shape as 'circle' | 'square' | 'arrowUp' | 'arrowDown',
        text: l.text || '',
      };
    });
}

/**
 * @deprecated Use collectLabelMarkers + single setMarkers call instead.
 */
export function renderLabels(
  candleSeries: ISeriesApi<'Candlestick'>,
  labels: LabelDrawing[],
): void {
  const markers = collectLabelMarkers(labels)
    .sort((a, b) => (a.time as number) - (b.time as number));
  if (markers.length > 0) {
    candleSeries.setMarkers(markers);
  }
}

function mapLabelStyleToPosition(style: string): { position: string; shape: string } {
  switch (style) {
    case 'label_up': return { position: 'belowBar', shape: 'arrowUp' };
    case 'label_down': return { position: 'aboveBar', shape: 'arrowDown' };
    case 'label_left': return { position: 'inBar', shape: 'square' };
    case 'label_right': return { position: 'inBar', shape: 'square' };
    case 'label_center': return { position: 'inBar', shape: 'circle' };
    case 'label_lower_left': return { position: 'belowBar', shape: 'square' };
    case 'label_lower_right': return { position: 'belowBar', shape: 'square' };
    case 'label_upper_left': return { position: 'aboveBar', shape: 'square' };
    case 'label_upper_right': return { position: 'aboveBar', shape: 'square' };
    case 'cross': return { position: 'inBar', shape: 'circle' };
    case 'diamond': return { position: 'inBar', shape: 'square' };
    case 'circle': return { position: 'inBar', shape: 'circle' };
    case 'flag': return { position: 'aboveBar', shape: 'arrowUp' };
    case 'triangleup': return { position: 'belowBar', shape: 'arrowUp' };
    case 'triangledown': return { position: 'aboveBar', shape: 'arrowDown' };
    case 'arrowup': return { position: 'belowBar', shape: 'arrowUp' };
    case 'arrowdown': return { position: 'aboveBar', shape: 'arrowDown' };
    case 'xcross': return { position: 'inBar', shape: 'circle' };
    default: return { position: 'aboveBar', shape: 'circle' };
  }
}

/**
 * Render box drawing objects as area series pairs.
 */
export function renderBoxes(
  chart: IChartApi,
  boxes: BoxDrawing[],
): void {
  for (const box of boxes) {
    if (box._deleted) continue;
    const series = chart.addAreaSeries({
      lineColor: box.border_color || '#2962FF',
      topColor: (box.bgcolor || '#2962FF') + '40',
      bottomColor: (box.bgcolor || '#2962FF') + '10',
      lineWidth: Math.min(box.border_width || 1, 4) as 1 | 2 | 3 | 4,
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const data = [
      { time: box.left as UTCTimestamp, value: box.top },
      { time: box.right as UTCTimestamp, value: box.top },
    ].sort((a, b) => (a.time as number) - (b.time as number));
    series.setData(data);
  }
}

/**
 * Render table objects as absolute-positioned HTML overlays on the chart container.
 */
export function renderTables(
  container: HTMLElement,
  tables: TableDrawing[],
): void {
  for (const table of tables) {
    if (table._deleted) continue;

    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.zIndex = '10';
    el.style.pointerEvents = 'none';
    el.style.fontFamily = 'monospace';
    el.style.fontSize = '11px';

    const pos = table.position || 'top_right';
    if (pos.includes('top')) el.style.top = '8px';
    if (pos.includes('bottom')) el.style.bottom = '32px';
    if (pos.includes('middle')) { el.style.top = '50%'; el.style.transform = 'translateY(-50%)'; }
    if (pos.includes('left')) el.style.left = '8px';
    if (pos.includes('right')) el.style.right = '8px';
    if (pos.includes('center') && !pos.includes('top') && !pos.includes('bottom')) {
      el.style.top = '50%';
      el.style.left = '50%';
      el.style.transform = 'translate(-50%, -50%)';
    }

    const tbl = document.createElement('table');
    tbl.style.borderCollapse = 'collapse';
    tbl.style.backgroundColor = table.bgcolor || 'rgba(0,0,0,0.7)';
    if (table.frame_width > 0) {
      tbl.style.border = `${table.frame_width}px solid ${table.frame_color || '#333'}`;
    }

    for (let r = 0; r < table.rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < table.columns; c++) {
        const cell = table.cells?.[r]?.[c];
        const td = document.createElement('td');
        td.style.padding = '2px 4px';
        if (table.border_width > 0) {
          td.style.border = `${table.border_width}px solid ${table.border_color || '#555'}`;
        }
        if (cell) {
          td.textContent = cell.text || '';
          if (cell.bgcolor) td.style.backgroundColor = cell.bgcolor;
          if (cell.text_color) td.style.color = cell.text_color;
          if (cell.text_size) td.style.fontSize = cell.text_size === 'large' ? '14px' : cell.text_size === 'small' ? '9px' : '11px';
        }
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
    }
    el.appendChild(tbl);
    container.appendChild(el);
  }
}

/**
 * Collect plotshape data as markers (does not call setMarkers).
 */
export function collectPlotshapeMarkers(
  plotshapes: { style: string; location: string; color: string; values: { time: number; value: number | null; text?: string }[] }[],
): any[] {
  const allMarkers: any[] = [];
  for (const ps of plotshapes) {
    for (const v of ps.values) {
      if (v.value === null) continue;
      const shape = mapShapeToMarker(ps.style);
      const position = ps.location === 'belowbar' ? 'belowBar' :
        ps.location === 'abovebar' ? 'aboveBar' : 'inBar';
      allMarkers.push({
        time: v.time as UTCTimestamp,
        position,
        color: ps.color || '#2962FF',
        shape: shape as 'circle' | 'square' | 'arrowUp' | 'arrowDown',
        text: v.text || '',
      });
    }
  }
  return allMarkers;
}

/**
 * @deprecated Use collectPlotshapeMarkers + single setMarkers call instead.
 */
export function renderPlotshapeMarkers(
  candleSeries: ISeriesApi<'Candlestick'>,
  plotshapes: { style: string; location: string; color: string; values: { time: number; value: number | null; text?: string }[] }[],
): void {
  const allMarkers = collectPlotshapeMarkers(plotshapes);
  if (allMarkers.length > 0) {
    allMarkers.sort((a: any, b: any) => (a.time as number) - (b.time as number));
    const existing = candleSeries.markers?.() ?? [];
    candleSeries.setMarkers([...existing, ...allMarkers]);
  }
}

function mapShapeToMarker(shape: string): string {
  switch (shape) {
    case 'triangleup': return 'arrowUp';
    case 'triangledown': return 'arrowDown';
    case 'arrowup': return 'arrowUp';
    case 'arrowdown': return 'arrowDown';
    case 'circle': return 'circle';
    case 'cross': return 'circle';
    case 'xcross': return 'circle';
    case 'diamond': return 'square';
    case 'square': return 'square';
    case 'flag': return 'arrowUp';
    default: return 'circle';
  }
}

/**
 * Collect plotarrow data as markers (does not call setMarkers).
 */
export function collectPlotarrowMarkers(
  plotarrows: { colorup: string; colordown: string; values: { time: number; value: number | null }[] }[],
): any[] {
  const allMarkers: any[] = [];
  for (const pa of plotarrows) {
    for (const v of pa.values) {
      if (v.value === null || v.value === 0) continue;
      const isUp = v.value > 0;
      allMarkers.push({
        time: v.time as UTCTimestamp,
        position: isUp ? 'belowBar' : 'aboveBar',
        color: isUp ? (pa.colorup || '#4CAF50') : (pa.colordown || '#FF5252'),
        shape: isUp ? 'arrowUp' : 'arrowDown',
        text: '',
      });
    }
  }
  return allMarkers;
}

/**
 * @deprecated Use collectPlotarrowMarkers + single setMarkers call instead.
 */
export function renderPlotarrowMarkers(
  candleSeries: ISeriesApi<'Candlestick'>,
  plotarrows: { colorup: string; colordown: string; values: { time: number; value: number | null }[] }[],
): void {
  const allMarkers = collectPlotarrowMarkers(plotarrows);
  if (allMarkers.length > 0) {
    allMarkers.sort((a: any, b: any) => (a.time as number) - (b.time as number));
    const existing = candleSeries.markers?.() ?? [];
    candleSeries.setMarkers([...existing, ...allMarkers]);
  }
}

/**
 * Collect plotchar data as markers (does not call setMarkers).
 * Renders the char as the marker text label with a circle anchor shape.
 */
export function collectPlotcharMarkers(
  plotchars: { char: string; location: string; color: string; values: { time: number; value: number | null; text?: string }[] }[],
): any[] {
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
        text: pc.char || v.text || '•',
      });
    }
  }
  return allMarkers;
}

/**
 * @deprecated Use collectPlotcharMarkers + single setMarkers call instead.
 */
export function renderPlotcharMarkers(
  candleSeries: ISeriesApi<'Candlestick'>,
  plotchars: { char: string; location: string; color: string; values: { time: number; value: number | null; text?: string }[] }[],
): void {
  const allMarkers = collectPlotcharMarkers(plotchars);
  if (allMarkers.length > 0) {
    allMarkers.sort((a: any, b: any) => (a.time as number) - (b.time as number));
    const existing = candleSeries.markers?.() ?? [];
    candleSeries.setMarkers([...existing, ...allMarkers]);
  }
}
