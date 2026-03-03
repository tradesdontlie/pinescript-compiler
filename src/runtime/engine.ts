import { Bar } from '../data/types';
import { createBuiltinVariables } from './builtins/variables';
import { createTaModule } from './builtins/ta';
import { createContext } from './context';
import { ExecutionResult, PlotData, HlineData, FillData, BgColorData, BarColorData, PlotShapeData, PlotCharData, PlotArrowData, PlotCandleData, PlotBarData } from './index';
import { ScriptMetadata } from '../compiler/index';
import { StrategyResult } from './builtins/strategy';
import { createRequestModule } from './builtins/request';

export interface Engine {
  execute(compiledCode: string): ExecutionResult;
}

export function createEngine(bars: Bar[]): Engine {
  return {
    execute(compiledCode: string): ExecutionResult {
      const builtins = createBuiltinVariables(bars);

      // Create a windowed view of builtins (we pre-push all, but we need bar-by-bar access)
      // Re-create builtins for bar-by-bar execution using ring buffer slicing
      const windowedBuiltins = createWindowedBuiltins(bars);

      let currentBarIdx = 0;
      const ta = createTaModule(
        () => currentBarIdx,
        () => windowedBuiltins.high,
        () => windowedBuiltins.low,
        () => windowedBuiltins.close,
        () => windowedBuiltins.volume
      );

      const contextInternals = createContext(builtins, ta, bars.length);
      const { ctx, plots, hlines, fills, bgcolors, barcolors, updateBar } = contextInternals;

      // Evaluate the compiled code
      // Supports both formats:
      // 1. IIFE: (function(__rt) { ... }) — from code generator
      // 2. Direct body: __rt.setMetadata(...); — from tests
      try {
        const trimmed = compiledCode.trim();
        if (trimmed.startsWith('(function')) {
          const wrappedCode = `return (${compiledCode})(__rt);`;
          const fn = new Function('__rt', wrappedCode);
          fn(ctx);
        } else {
          const fn = new Function('__rt', compiledCode);
          fn(ctx);
        }
      } catch (e) {
        throw new Error(`Failed to evaluate compiled code: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Call init
      if (contextInternals.initFn) {
        try {
          contextInternals.initFn();
        } catch (e) {
          throw new Error(`Init function error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Create fresh context using windowed builtins for bar-by-bar execution
      const windowedContext = createContext(windowedBuiltins, ta, bars.length);
      const winCtx = windowedContext.ctx;

      // Wire request.security with full bars data
      const requestModule = createRequestModule(
        bars,
        () => currentBarIdx,
        () => 'D' // default timeframe
      );
      winCtx.request = requestModule;

      // Re-register init/execute on windowed context
      try {
        const trimmed = compiledCode.trim();
        if (trimmed.startsWith('(function')) {
          const wrappedCode = `return (${compiledCode})(__rt);`;
          const fn2 = new Function('__rt', wrappedCode);
          fn2(winCtx);
        } else {
          const fn2 = new Function('__rt', compiledCode);
          fn2(winCtx);
        }
      } catch (e) {
        throw new Error(`Failed to re-evaluate compiled code: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Call init on windowed context (initializes var/varip state)
      if (windowedContext.initFn) {
        try {
          windowedContext.initFn();
        } catch (e) {
          throw new Error(`Windowed init function error: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Run bar-by-bar
      const lastIndex = bars.length - 1;
      for (let i = 0; i < bars.length; i++) {
        currentBarIdx = i;
        windowedContext.updateBar(i, windowedBuiltins, lastIndex);
        // Update windowed series to point at bar i
        updateWindowedBuiltins(windowedBuiltins, bars, i);

        // Process strategy orders at the start of each bar
        const bar = bars[i];
        windowedContext.strategyEngine.processBar(
          i, bar.open, bar.high, bar.low, bar.close, bar.time
        );

        if (windowedContext.executeFn) {
          try {
            windowedContext.executeFn();
          } catch (e) {
            // Continue on per-bar errors
          }
        }
      }

      const defaultMeta: ScriptMetadata = {
        type: 'indicator',
        title: 'Unnamed Script',
        shorttitle: '',
        overlay: false,
        inputs: [],
        plots: [],
      };

      const meta = windowedContext.metadata ?? defaultMeta;

      // Convert plots map to array
      const plotsArray: PlotData[] = Array.from(windowedContext.plots.values());

      // Get strategy results if this is a strategy script
      let strategyResult: StrategyResult | undefined;
      if (meta.type === 'strategy') {
        strategyResult = windowedContext.strategyEngine.getResult();
      }

      // Collect drawing objects from runtime context
      const lines = winCtx.line?.all ?? [];
      const labels = winCtx.label?.all ?? [];
      const boxes = winCtx.box?.all ?? [];
      const tables = winCtx.table?.all ?? [];

      return {
        metadata: meta,
        plots: plotsArray,
        hlines: windowedContext.hlines,
        fills: windowedContext.fills,
        bgcolors: windowedContext.bgcolors,
        barcolors: windowedContext.barcolors,
        plotshapes: Array.from(windowedContext.plotshapes.values()),
        plotchars: Array.from(windowedContext.plotchars.values()),
        plotarrows: Array.from(windowedContext.plotarrows.values()),
        plotcandles: Array.from(windowedContext.plotcandles.values()),
        plotbars: Array.from(windowedContext.plotbars.values()),
        strategy: strategyResult,
        lines,
        labels,
        boxes,
        tables,
      };
    },
  };
}

// Windowed builtins use a Series with only 1 bar slot replaced each iteration
import { Series } from './types/series';
import { BuiltinVariables } from './builtins/variables';

function createWindowedBuiltins(bars: Bar[]): BuiltinVariables {
  const size = Math.max(bars.length + 10, 510);
  return {
    open: new Series<number>(size),
    high: new Series<number>(size),
    low: new Series<number>(size),
    close: new Series<number>(size),
    volume: new Series<number>(size),
    time: new Series<number>(size),
    bar_index: new Series<number>(size),
    hl2: new Series<number>(size),
    hlc3: new Series<number>(size),
    ohlc4: new Series<number>(size),
  };
}

function updateWindowedBuiltins(wb: BuiltinVariables, bars: Bar[], i: number): void {
  const bar = bars[i];
  wb.open.push(bar.open);
  wb.high.push(bar.high);
  wb.low.push(bar.low);
  wb.close.push(bar.close);
  wb.volume.push(bar.volume);
  wb.time.push(bar.time);
  wb.bar_index.push(i);
  wb.hl2.push((bar.high + bar.low) / 2);
  wb.hlc3.push((bar.high + bar.low + bar.close) / 3);
  wb.ohlc4.push((bar.open + bar.high + bar.low + bar.close) / 4);
}
