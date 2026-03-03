import { describe, it, expect } from 'vitest';
import {
  collectLabelMarkers,
  collectPlotshapeMarkers,
  collectPlotarrowMarkers,
  collectPlotcharMarkers,
  LabelDrawing,
  LineDrawing,
  BoxDrawing,
} from '../src/renderer/drawing-renderer';
import { collectStrategyMarkers } from '../src/renderer/strategy-renderer';
import type { StrategyResult } from '../src/runtime/builtins/strategy';
import type { BarColorData, PlotCandleData, PlotBarData } from '../src/runtime/index';

// ─── collectLabelMarkers ─────────────────────────────────────────────────────

describe('collectLabelMarkers', () => {
  it('converts label_up style to belowBar/arrowUp', () => {
    const labels: LabelDrawing[] = [
      { id: 1, x: 1000, y: 100, text: 'Buy', color: '#fff', textcolor: '#00ff00', style: 'label_up', size: 'normal', _deleted: false },
    ];
    const markers = collectLabelMarkers(labels);
    expect(markers).toHaveLength(1);
    expect(markers[0].position).toBe('belowBar');
    expect(markers[0].shape).toBe('arrowUp');
    expect(markers[0].text).toBe('Buy');
    expect(markers[0].time).toBe(1000);
  });

  it('converts label_down style to aboveBar/arrowDown', () => {
    const labels: LabelDrawing[] = [
      { id: 2, x: 2000, y: 200, text: 'Sell', color: '#fff', textcolor: '#ff0000', style: 'label_down', size: 'normal', _deleted: false },
    ];
    const markers = collectLabelMarkers(labels);
    expect(markers[0].position).toBe('aboveBar');
    expect(markers[0].shape).toBe('arrowDown');
  });

  it('skips deleted labels', () => {
    const labels: LabelDrawing[] = [
      { id: 3, x: 1000, y: 100, text: 'X', color: '#fff', textcolor: '#fff', style: 'label_up', size: 'normal', _deleted: true },
      { id: 4, x: 2000, y: 200, text: 'Y', color: '#fff', textcolor: '#fff', style: 'label_down', size: 'normal', _deleted: false },
    ];
    const markers = collectLabelMarkers(labels);
    expect(markers).toHaveLength(1);
    expect(markers[0].text).toBe('Y');
  });

  it('returns empty array for no labels', () => {
    expect(collectLabelMarkers([])).toEqual([]);
  });

  it('uses textcolor if available, else color', () => {
    const withTextcolor: LabelDrawing[] = [
      { id: 5, x: 1000, y: 100, text: 'A', color: '#aaa', textcolor: '#bbb', style: 'circle', size: 'normal', _deleted: false },
    ];
    const without: LabelDrawing[] = [
      { id: 6, x: 1000, y: 100, text: 'B', color: '#ccc', textcolor: '', style: 'circle', size: 'normal', _deleted: false },
    ];
    expect(collectLabelMarkers(withTextcolor)[0].color).toBe('#bbb');
    expect(collectLabelMarkers(without)[0].color).toBe('#ccc');
  });

  it('maps all style names correctly', () => {
    const styles: [string, string, string][] = [
      ['triangleup', 'belowBar', 'arrowUp'],
      ['triangledown', 'aboveBar', 'arrowDown'],
      ['arrowup', 'belowBar', 'arrowUp'],
      ['arrowdown', 'aboveBar', 'arrowDown'],
      ['circle', 'inBar', 'circle'],
      ['diamond', 'inBar', 'square'],
      ['label_lower_left', 'belowBar', 'square'],
      ['label_upper_right', 'aboveBar', 'square'],
    ];
    for (const [style, expectedPos, expectedShape] of styles) {
      const labels: LabelDrawing[] = [
        { id: 0, x: 1000, y: 100, text: '', color: '#fff', textcolor: '#fff', style, size: 'normal', _deleted: false },
      ];
      const markers = collectLabelMarkers(labels);
      expect(markers[0].position, `style=${style}`).toBe(expectedPos);
      expect(markers[0].shape, `style=${style}`).toBe(expectedShape);
    }
  });
});

// ─── collectPlotshapeMarkers ─────────────────────────────────────────────────

describe('collectPlotshapeMarkers', () => {
  it('converts triangleup to arrowUp below bar', () => {
    const shapes = [
      { style: 'triangleup', location: 'belowbar', color: '#0f0', values: [{ time: 1000, value: 1 }] },
    ];
    const markers = collectPlotshapeMarkers(shapes);
    expect(markers).toHaveLength(1);
    expect(markers[0].shape).toBe('arrowUp');
    expect(markers[0].position).toBe('belowBar');
    expect(markers[0].color).toBe('#0f0');
  });

  it('converts triangledown to arrowDown above bar', () => {
    const shapes = [
      { style: 'triangledown', location: 'abovebar', color: '#f00', values: [{ time: 2000, value: 1 }] },
    ];
    const markers = collectPlotshapeMarkers(shapes);
    expect(markers[0].shape).toBe('arrowDown');
    expect(markers[0].position).toBe('aboveBar');
  });

  it('skips null values', () => {
    const shapes = [
      { style: 'circle', location: 'abovebar', color: '#f00', values: [
        { time: 1000, value: null },
        { time: 2000, value: 1 },
      ]},
    ];
    const markers = collectPlotshapeMarkers(shapes);
    expect(markers).toHaveLength(1);
    expect(markers[0].time).toBe(2000);
  });

  it('includes text from value', () => {
    const shapes = [
      { style: 'circle', location: 'abovebar', color: '#f00', values: [{ time: 1000, value: 1, text: 'Signal' }] },
    ];
    const markers = collectPlotshapeMarkers(shapes);
    expect(markers[0].text).toBe('Signal');
  });

  it('maps all shape styles', () => {
    const shapeMap: [string, string][] = [
      ['triangleup', 'arrowUp'],
      ['triangledown', 'arrowDown'],
      ['arrowup', 'arrowUp'],
      ['arrowdown', 'arrowDown'],
      ['circle', 'circle'],
      ['cross', 'circle'],
      ['xcross', 'circle'],
      ['diamond', 'square'],
      ['square', 'square'],
      ['flag', 'arrowUp'],
    ];
    for (const [style, expectedShape] of shapeMap) {
      const shapes = [
        { style, location: 'abovebar', color: '#000', values: [{ time: 1000, value: 1 }] },
      ];
      const markers = collectPlotshapeMarkers(shapes);
      expect(markers[0].shape, `style=${style}`).toBe(expectedShape);
    }
  });

  it('handles multiple plotshape entries', () => {
    const shapes = [
      { style: 'circle', location: 'abovebar', color: '#f00', values: [{ time: 1000, value: 1 }, { time: 2000, value: 1 }] },
      { style: 'square', location: 'belowbar', color: '#0f0', values: [{ time: 3000, value: 1 }] },
    ];
    const markers = collectPlotshapeMarkers(shapes);
    expect(markers).toHaveLength(3);
  });
});

// ─── collectPlotarrowMarkers ─────────────────────────────────────────────────

describe('collectPlotarrowMarkers', () => {
  it('positive value → arrowUp below bar with colorup', () => {
    const arrows = [
      { colorup: '#4CAF50', colordown: '#FF5252', values: [{ time: 1000, value: 1 }] },
    ];
    const markers = collectPlotarrowMarkers(arrows);
    expect(markers).toHaveLength(1);
    expect(markers[0].shape).toBe('arrowUp');
    expect(markers[0].position).toBe('belowBar');
    expect(markers[0].color).toBe('#4CAF50');
  });

  it('negative value → arrowDown above bar with colordown', () => {
    const arrows = [
      { colorup: '#4CAF50', colordown: '#FF5252', values: [{ time: 2000, value: -1 }] },
    ];
    const markers = collectPlotarrowMarkers(arrows);
    expect(markers[0].shape).toBe('arrowDown');
    expect(markers[0].position).toBe('aboveBar');
    expect(markers[0].color).toBe('#FF5252');
  });

  it('skips null and zero values', () => {
    const arrows = [
      { colorup: '#4CAF50', colordown: '#FF5252', values: [
        { time: 1000, value: null },
        { time: 2000, value: 0 },
        { time: 3000, value: 1 },
      ]},
    ];
    const markers = collectPlotarrowMarkers(arrows);
    expect(markers).toHaveLength(1);
    expect(markers[0].time).toBe(3000);
  });

  it('uses default colors when none provided', () => {
    const arrows = [
      { colorup: '', colordown: '', values: [{ time: 1000, value: 2 }, { time: 2000, value: -2 }] },
    ];
    const markers = collectPlotarrowMarkers(arrows);
    expect(markers[0].color).toBe('#4CAF50');
    expect(markers[1].color).toBe('#FF5252');
  });
});

// ─── collectPlotcharMarkers ──────────────────────────────────────────────────

describe('collectPlotcharMarkers', () => {
  it('renders char as text with circle shape', () => {
    const plotchars = [
      { char: '★', location: 'belowbar', color: '#ff0', values: [{ time: 1000, value: 1 }] },
    ];
    const markers = collectPlotcharMarkers(plotchars);
    expect(markers).toHaveLength(1);
    expect(markers[0].shape).toBe('circle');
    expect(markers[0].text).toBe('★');
    expect(markers[0].position).toBe('belowBar');
    expect(markers[0].color).toBe('#ff0');
  });

  it('abovebar location → aboveBar position', () => {
    const plotchars = [
      { char: '↑', location: 'abovebar', color: '#0ff', values: [{ time: 1000, value: 1 }] },
    ];
    const markers = collectPlotcharMarkers(plotchars);
    expect(markers[0].position).toBe('aboveBar');
  });

  it('other location → inBar position', () => {
    const plotchars = [
      { char: '•', location: 'other', color: '#000', values: [{ time: 1000, value: 1 }] },
    ];
    const markers = collectPlotcharMarkers(plotchars);
    expect(markers[0].position).toBe('inBar');
  });

  it('skips null values', () => {
    const plotchars = [
      { char: '★', location: 'belowbar', color: '#ff0', values: [
        { time: 1000, value: null },
        { time: 2000, value: 1 },
      ]},
    ];
    const markers = collectPlotcharMarkers(plotchars);
    expect(markers).toHaveLength(1);
    expect(markers[0].time).toBe(2000);
  });

  it('falls back to bullet char when char is empty', () => {
    const plotchars = [
      { char: '', location: 'belowbar', color: '#ff0', values: [{ time: 1000, value: 1 }] },
    ];
    const markers = collectPlotcharMarkers(plotchars);
    expect(markers[0].text).toBe('•');
  });

  it('returns empty for no plotchars', () => {
    expect(collectPlotcharMarkers([])).toEqual([]);
  });
});

// ─── collectStrategyMarkers ──────────────────────────────────────────────────

describe('collectStrategyMarkers', () => {
  const makeTrade = (overrides = {}): any => ({
    id: 'trade1',
    direction: 'long',
    entryPrice: 100,
    exitPrice: 110,
    qty: 1,
    profit: 10,
    entryBar: 0,
    exitBar: 5,
    entryTime: 1000000,  // ms
    exitTime: 1300000,   // ms
    ...overrides,
  });

  it('emits entry and exit markers for a long trade', () => {
    const strategy: StrategyResult = {
      trades: [makeTrade()],
      equityCurve: [],
      netProfit: 10,
      totalTrades: 1,
      winRate: 1,
      profitFactor: 2,
      maxDrawdown: 0,
    };
    const markers = collectStrategyMarkers(strategy);
    expect(markers).toHaveLength(2);

    const entry = markers.find(m => m.text.startsWith('L '));
    const exit = markers.find(m => m.text.startsWith('X '));
    expect(entry).toBeDefined();
    expect(exit).toBeDefined();

    expect(entry!.shape).toBe('arrowUp');
    expect(entry!.position).toBe('belowBar');
    expect(entry!.color).toBe('#4CAF50');
    // entryTime 1000000ms → 1000 sec
    expect(entry!.time).toBe(1000);

    expect(exit!.shape).toBe('arrowDown'); // profit >= 0
    expect(exit!.position).toBe('aboveBar');
    // exitTime 1300000ms → 1300 sec
    expect(exit!.time).toBe(1300);
  });

  it('emits entry and exit markers for a short trade', () => {
    const strategy: StrategyResult = {
      trades: [makeTrade({ direction: 'short', entryPrice: 110, exitPrice: 100, profit: 10 })],
      equityCurve: [],
      netProfit: 10,
      totalTrades: 1,
      winRate: 1,
      profitFactor: 2,
      maxDrawdown: 0,
    };
    const markers = collectStrategyMarkers(strategy);
    const entry = markers.find(m => m.text.startsWith('S '));
    expect(entry!.shape).toBe('arrowDown');
    expect(entry!.position).toBe('aboveBar');
    expect(entry!.color).toBe('#FF5252');
  });

  it('losing trade exit marker is red arrowUp (long)', () => {
    const strategy: StrategyResult = {
      trades: [makeTrade({ profit: -5, exitPrice: 95 })],
      equityCurve: [],
      netProfit: -5,
      totalTrades: 1,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 5,
    };
    const markers = collectStrategyMarkers(strategy);
    const exit = markers.find(m => m.text.startsWith('X '));
    expect(exit!.color).toBe('#FF5252');
    expect(exit!.shape).toBe('arrowUp');
  });

  it('returns empty array for no trades', () => {
    const strategy: StrategyResult = {
      trades: [],
      equityCurve: [],
      netProfit: 0,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
    };
    expect(collectStrategyMarkers(strategy)).toEqual([]);
  });

  it('entry text contains entry price', () => {
    const strategy: StrategyResult = {
      trades: [makeTrade({ entryPrice: 123.45 })],
      equityCurve: [],
      netProfit: 0,
      totalTrades: 1,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
    };
    const markers = collectStrategyMarkers(strategy);
    const entry = markers.find(m => m.text.startsWith('L '));
    expect(entry!.text).toContain('123.45');
  });

  it('exit text contains exit price', () => {
    const strategy: StrategyResult = {
      trades: [makeTrade({ exitPrice: 150.00 })],
      equityCurve: [],
      netProfit: 0,
      totalTrades: 1,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
    };
    const markers = collectStrategyMarkers(strategy);
    const exit = markers.find(m => m.text.startsWith('X '));
    expect(exit!.text).toContain('150.00');
  });

  it('multiple trades produce 2 markers each', () => {
    const strategy: StrategyResult = {
      trades: [makeTrade(), makeTrade({ entryTime: 2000000, exitTime: 2300000 })],
      equityCurve: [],
      netProfit: 20,
      totalTrades: 2,
      winRate: 1,
      profitFactor: 2,
      maxDrawdown: 0,
    };
    const markers = collectStrategyMarkers(strategy);
    expect(markers).toHaveLength(4);
  });
});

// ─── BarColorData logic ──────────────────────────────────────────────────────

describe('BarColorData map construction', () => {
  it('builds time→color map correctly', () => {
    const barcolors: BarColorData[] = [
      { time: 1000, color: '#ff0000' },
      { time: 2000, color: '#00ff00' },
      { time: 3000, color: '#0000ff' },
    ];
    const colorMap = new Map<number, string>();
    for (const bc of barcolors) {
      colorMap.set(bc.time, bc.color);
    }
    expect(colorMap.get(1000)).toBe('#ff0000');
    expect(colorMap.get(2000)).toBe('#00ff00');
    expect(colorMap.get(3000)).toBe('#0000ff');
    expect(colorMap.get(4000)).toBeUndefined();
  });

  it('later entries overwrite earlier ones for same time', () => {
    const barcolors: BarColorData[] = [
      { time: 1000, color: '#ff0000' },
      { time: 1000, color: '#00ff00' },
    ];
    const colorMap = new Map<number, string>();
    for (const bc of barcolors) {
      colorMap.set(bc.time, bc.color);
    }
    expect(colorMap.get(1000)).toBe('#00ff00');
  });
});

// ─── PlotCandleData / PlotBarData structure ──────────────────────────────────

describe('PlotCandleData value filtering', () => {
  it('filters out null OHLC values', () => {
    const pc: PlotCandleData = {
      index: 0,
      title: 'test',
      color: '#26a69a',
      wickcolor: '#26a69a',
      bordercolor: '#26a69a',
      values: [
        { time: 1000, open: 100, high: 110, low: 90, close: 105 },
        { time: 2000, open: null as any, high: 110, low: 90, close: 105 },
      ],
    };
    const filtered = pc.values.filter(v => v.open != null && v.high != null && v.low != null && v.close != null);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].time).toBe(1000);
  });

  it('sorts by time', () => {
    const pc: PlotCandleData = {
      index: 0,
      title: 'test',
      color: '#26a69a',
      wickcolor: '#26a69a',
      bordercolor: '#26a69a',
      values: [
        { time: 3000, open: 100, high: 110, low: 90, close: 105 },
        { time: 1000, open: 100, high: 110, low: 90, close: 105 },
        { time: 2000, open: 100, high: 110, low: 90, close: 105 },
      ],
    };
    const sorted = [...pc.values].sort((a, b) => a.time - b.time);
    expect(sorted[0].time).toBe(1000);
    expect(sorted[1].time).toBe(2000);
    expect(sorted[2].time).toBe(3000);
  });
});

describe('PlotBarData value filtering', () => {
  it('filters out null OHLC values', () => {
    const pb: PlotBarData = {
      index: 0,
      title: 'test',
      color: '#26a69a',
      values: [
        { time: 1000, open: 100, high: 110, low: 90, close: 105 },
        { time: 2000, open: 100, high: null as any, low: 90, close: 105 },
      ],
    };
    const filtered = pb.values.filter(v => v.open != null && v.high != null && v.low != null && v.close != null);
    expect(filtered).toHaveLength(1);
  });
});

// ─── Multi-marker merge logic ─────────────────────────────────────────────────

describe('Marker merge (collect + sort pattern)', () => {
  it('merges markers from multiple sources sorted by time', () => {
    const labelMarkers = [
      { time: 3000, position: 'aboveBar', color: '#fff', shape: 'circle', text: 'Label' },
    ];
    const shapeMarkers = [
      { time: 1000, position: 'belowBar', color: '#0f0', shape: 'arrowUp', text: '' },
    ];
    const arrowMarkers = [
      { time: 2000, position: 'aboveBar', color: '#f00', shape: 'arrowDown', text: '' },
    ];

    const allMarkers = [...labelMarkers, ...shapeMarkers, ...arrowMarkers];
    allMarkers.sort((a, b) => a.time - b.time);

    expect(allMarkers).toHaveLength(3);
    expect(allMarkers[0].time).toBe(1000);
    expect(allMarkers[1].time).toBe(2000);
    expect(allMarkers[2].time).toBe(3000);
    expect(allMarkers[2].text).toBe('Label');
  });

  it('empty sources produce empty merged array', () => {
    const allMarkers = [...collectLabelMarkers([]), ...collectPlotshapeMarkers([]), ...collectPlotarrowMarkers([]), ...collectPlotcharMarkers([])];
    expect(allMarkers).toHaveLength(0);
  });
});

// ─── syncTimeScales logic ────────────────────────────────────────────────────

describe('syncTimeScales callback setup', () => {
  it('calls subscribeVisibleLogicalRangeChange on each chart', () => {
    let subscribeCount = 0;
    const mockChart = () => ({
      timeScale: () => ({
        subscribeVisibleLogicalRangeChange: (_cb: any) => { subscribeCount++; },
        setVisibleLogicalRange: (_range: any) => {},
      }),
    });

    const charts = [mockChart(), mockChart(), mockChart()];

    // Replicate syncTimeScales logic
    let isSyncing = false;
    for (let i = 0; i < charts.length; i++) {
      charts[i].timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
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

    expect(subscribeCount).toBe(3);
  });

  it('prevents recursive sync via isSyncing flag', () => {
    let setCount = 0;
    const callbacks: Array<((range: any) => void)> = [];

    const makeChart = (idx: number) => ({
      timeScale: () => ({
        subscribeVisibleLogicalRangeChange: (cb: any) => { callbacks[idx] = cb; },
        setVisibleLogicalRange: (_range: any) => {
          setCount++;
          // Simulate other chart trying to call back
          if (callbacks[1 - idx]) callbacks[1 - idx]({ from: 0, to: 10 });
        },
      }),
    });

    const charts = [makeChart(0), makeChart(1)] as any;
    let isSyncing = false;
    for (let i = 0; i < charts.length; i++) {
      charts[i].timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
        if (isSyncing || range === null) return;
        isSyncing = true;
        for (let j = 0; j < charts.length; j++) {
          if (i !== j) charts[j].timeScale().setVisibleLogicalRange(range);
        }
        isSyncing = false;
      });
    }

    // Trigger chart 0's callback — should set chart1 once, then chart1's setVisibleLogicalRange
    // tries to trigger chart0's callback but isSyncing flag prevents infinite loop
    callbacks[0]({ from: 0, to: 10 });
    // setCount should be 1 (only chart1.setVisibleLogicalRange called once)
    expect(setCount).toBe(1);
  });
});

// ─── fill renderer data transform ────────────────────────────────────────────

describe('FillData plot resolution', () => {
  it('finds plot1 and plot2 by index', () => {
    const plots = [
      { index: 0, title: 'plot0', color: '#f00', linewidth: 1, style: 'line', values: [{ time: 1000, value: 10 }] },
      { index: 1, title: 'plot1', color: '#0f0', linewidth: 1, style: 'line', values: [{ time: 1000, value: 20 }] },
    ];
    const fill = { plot1: 0, plot2: 1, color: 'rgba(33,150,243,0.2)' };
    const plot1 = plots.find(p => p.index === fill.plot1);
    const plot2 = plots.find(p => p.index === fill.plot2);
    expect(plot1).toBeDefined();
    expect(plot2).toBeDefined();
    expect(plot1!.index).toBe(0);
    expect(plot2!.index).toBe(1);
  });

  it('returns null when plot not found', () => {
    const plots = [
      { index: 0, title: 'plot0', color: '#f00', linewidth: 1, style: 'line', values: [] },
    ];
    const fill = { plot1: 0, plot2: 99, color: '#f00' };
    const plot2 = plots.find(p => p.index === fill.plot2);
    expect(plot2).toBeUndefined();
  });
});
