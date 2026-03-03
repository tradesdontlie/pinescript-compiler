// Maps Pine Script built-in function/variable names to runtime calls

export const BUILTIN_VARS = new Set([
  'open', 'high', 'low', 'close', 'volume', 'time',
  'bar_index', 'hl2', 'hlc3', 'ohlc4',
]);

export const COLOR_CONSTANTS: Record<string, string> = {
  'color.red': '#FF5252',
  'color.green': '#4CAF50',
  'color.blue': '#2962FF',
  'color.orange': '#FF9800',
  'color.purple': '#9C27B0',
  'color.yellow': '#FFEB3B',
  'color.white': '#FFFFFF',
  'color.black': '#000000',
  'color.gray': '#787B86',
  'color.silver': '#B2B5BE',
  'color.lime': '#00E676',
  'color.teal': '#00897B',
  'color.navy': '#311B92',
  'color.fuchsia': '#E040FB',
  'color.aqua': '#00BCD4',
  'color.maroon': '#880E4F',
  'color.olive': '#808000',
};

// Pine built-in function names mapped to their __rt equivalents
// If mapped to null, it's handled specially by the generator
export const BUILTIN_FUNCTIONS: Record<string, string | null> = {
  // TA functions -> __rt.ta.*
  'ta.sma': '__rt.ta.sma',
  'ta.ema': '__rt.ta.ema',
  'ta.rsi': '__rt.ta.rsi',
  'ta.macd': '__rt.ta.macd',
  'ta.bb': '__rt.ta.bb',
  'ta.atr': '__rt.ta.atr',
  'ta.stoch': '__rt.ta.stoch',
  'ta.crossover': '__rt.ta.crossover',
  'ta.crossunder': '__rt.ta.crossunder',
  'ta.highest': '__rt.ta.highest',
  'ta.lowest': '__rt.ta.lowest',
  'ta.highestbars': '__rt.ta.highestbars',
  'ta.lowestbars': '__rt.ta.lowestbars',
  'ta.valuewhen': '__rt.ta.valuewhen',
  'ta.barssince': '__rt.ta.barssince',
  'ta.change': '__rt.ta.change',
  'ta.mom': '__rt.ta.mom',
  'ta.wma': '__rt.ta.wma',
  'ta.vwma': '__rt.ta.vwma',
  'ta.dmi': '__rt.ta.dmi',
  'ta.cci': '__rt.ta.cci',
  'ta.swma': '__rt.ta.swma',
  'ta.alma': '__rt.ta.alma',
  'ta.rma': '__rt.ta.rma',
  'ta.stdev': '__rt.ta.stdev',
  'ta.variance': '__rt.ta.variance',
  'ta.cum': '__rt.ta.cum',
  'ta.tr': '__rt.ta.tr',
  'ta.pivothigh': '__rt.ta.pivothigh',
  'ta.pivotlow': '__rt.ta.pivotlow',
  'ta.falling': '__rt.ta.falling',
  'ta.rising': '__rt.ta.rising',
  'ta.percentrank': '__rt.ta.percentrank',
  'ta.correlation': '__rt.ta.correlation',
  'ta.dev': '__rt.ta.dev',
  'ta.mfi': '__rt.ta.mfi',
  'ta.obv': '__rt.ta.obv',
  'ta.supertrend': '__rt.ta.supertrend',

  // Math functions -> __rt.math.*
  'math.abs': '__rt.math.abs',
  'math.ceil': '__rt.math.ceil',
  'math.floor': '__rt.math.floor',
  'math.round': '__rt.math.round',
  'math.max': '__rt.math.max',
  'math.min': '__rt.math.min',
  'math.pow': '__rt.math.pow',
  'math.sqrt': '__rt.math.sqrt',
  'math.log': '__rt.math.log',
  'math.log10': '__rt.math.log10',
  'math.exp': '__rt.math.exp',
  'math.sign': '__rt.math.sign',
  'math.sin': '__rt.math.sin',
  'math.cos': '__rt.math.cos',
  'math.tan': '__rt.math.tan',
  'math.asin': '__rt.math.asin',
  'math.acos': '__rt.math.acos',
  'math.atan': '__rt.math.atan',
  'math.random': '__rt.math.random',
  'math.todegrees': '__rt.math.todegrees',
  'math.toradians': '__rt.math.toradians',

  // Color functions -> __rt.color.*
  'color.new': '__rt.color.colorNew',
  'color.r': '__rt.color.r',
  'color.g': '__rt.color.g',
  'color.b': '__rt.color.b',
  'color.t': '__rt.color.t',
  'color.rgb': '__rt.color.rgb',
  'color.from_gradient': '__rt.color.fromGradient',

  // Math additional
  'math.round_to_mintick': '__rt.math.round_to_mintick',

  // Strategy -> __rt.strategy.*
  'strategy.entry': '__rt.strategy.entry',
  'strategy.close': '__rt.strategy.close',
  'strategy.order': '__rt.strategy.order',
  'strategy.exit': '__rt.strategy.exit',
  'strategy.cancel': '__rt.strategy.cancel',
  'strategy.cancel_all': '__rt.strategy.cancelAll',

  // Alert / log
  'alert': '__rt.alert',
  'alertcondition': '__rt.alertcondition',
  'log.info': '__rt.log.info',
  'log.warning': '__rt.log.warning',
  'log.error': '__rt.log.error',

  // Plot visualization functions (handled specially by codegen)
  'plotshape': null,
  'plotchar': null,
  'plotarrow': null,
  'plotcandle': null,
  'plotbar': null,

  // NA / utility
  'na': null,   // handled specially -> __rt.na
  'nz': '__rt.nz',
  'fixnan': '__rt.fixnan',
  'na.isna': '__rt.isNa',

  // Array
  'array.new_float': '__rt.array.newFloat',
  'array.new_int': '__rt.array.newInt',
  'array.new_bool': '__rt.array.newBool',
  'array.new_string': '__rt.array.newString',
  'array.push': '__rt.array.push',
  'array.pop': '__rt.array.pop',
  'array.get': '__rt.array.get',
  'array.set': '__rt.array.set',
  'array.size': '__rt.array.size',
  'array.sum': '__rt.array.sum',
  'array.avg': '__rt.array.avg',
  'array.max': '__rt.array.max',
  'array.min': '__rt.array.min',
  'array.insert': '__rt.array.insert',
  'array.remove': '__rt.array.remove',
  'array.clear': '__rt.array.clear',
  'array.copy': '__rt.array.copy',
  'array.reverse': '__rt.array.reverse',
  'array.sort': '__rt.array.sort',
  'array.join': '__rt.array.join',
  'array.slice': '__rt.array.slice',
  'array.includes': '__rt.array.includes',
  'array.indexof': '__rt.array.indexof',
  'array.lastindexof': '__rt.array.lastindexof',
  'array.from': '__rt.array.from',
  'array.new': '__rt.array.new',

  // String
  'str.tostring': '__rt.str.tostring',
  'str.tonumber': '__rt.str.tonumber',
  'str.length': '__rt.str.length',
  'str.lower': '__rt.str.lower',
  'str.upper': '__rt.str.upper',
  'str.contains': '__rt.str.contains',
  'str.startswith': '__rt.str.startswith',
  'str.endswith': '__rt.str.endswith',
  'str.substring': '__rt.str.substring',
  'str.split': '__rt.str.split',
  'str.trim': '__rt.str.trim',
  'str.replace': '__rt.str.replace',
  'str.replace_all': '__rt.str.replaceAll',
  'str.match': '__rt.str.match',
  'str.pos': '__rt.str.pos',
  'str.format': '__rt.str.format',

  // Misc
  'request.security': '__rt.request.security',
  'ticker.new': '__rt.ticker.new',
  'syminfo.ticker': '__rt.syminfo.ticker',
  'syminfo.tickerid': '__rt.syminfo.tickerid',
  'syminfo.prefix': '__rt.syminfo.prefix',
  'syminfo.root': '__rt.syminfo.root',
  'syminfo.mintick': '__rt.syminfo.mintick',
  'syminfo.pointvalue': '__rt.syminfo.pointvalue',
  'syminfo.timezone': '__rt.syminfo.timezone',
  'syminfo.type': '__rt.syminfo.type',
  'syminfo.session': '__rt.syminfo.session',
  'syminfo.basecurrency': '__rt.syminfo.basecurrency',
  'syminfo.currency': '__rt.syminfo.currency',
  'syminfo.description': '__rt.syminfo.description',
  'timeframe.period': '__rt.timeframe.period',
  'timeframe.multiplier': '__rt.timeframe.multiplier',
  'timeframe.isdwm': '__rt.timeframe.isdwm',
  'timeframe.isintraday': '__rt.timeframe.isintraday',
  'timeframe.isminutes': '__rt.timeframe.isminutes',
  'timeframe.ishours': '__rt.timeframe.ishours',
  'timeframe.isdaily': '__rt.timeframe.isdaily',
  'timeframe.isweekly': '__rt.timeframe.isweekly',
  'timeframe.ismonthly': '__rt.timeframe.ismonthly',

  // barstate
  'barstate.isfirst': '__rt.barstate.isfirst',
  'barstate.islast': '__rt.barstate.islast',
  'barstate.ishistory': '__rt.barstate.ishistory',
  'barstate.isrealtime': '__rt.barstate.isrealtime',
  'barstate.isconfirmed': '__rt.barstate.isconfirmed',
};

export class FunctionMapper {
  /**
   * Map a dotted name (e.g. "ta.sma") to its runtime equivalent.
   * Returns null if not found (user-defined or unmapped).
   */
  mapFunction(name: string): string | undefined {
    const mapped = BUILTIN_FUNCTIONS[name];
    if (mapped === undefined) return undefined;
    if (mapped === null) return undefined; // handled specially
    return mapped;
  }

  /**
   * Map a color constant (e.g. "color.blue") to its hex string.
   * Returns null if not a color constant.
   */
  mapColor(name: string): string | undefined {
    return COLOR_CONSTANTS[name];
  }

  /**
   * Check if an identifier is a built-in variable (open, close, etc.)
   */
  isBuiltinVar(name: string): boolean {
    return BUILTIN_VARS.has(name);
  }

  /**
   * Map a built-in var name to its runtime path.
   */
  mapBuiltinVar(name: string): string {
    return `__rt.${name}`;
  }

  /**
   * Map a series builtin accessed with index (e.g. close[1]) to seriesGet call.
   */
  mapSeriesGet(name: string, indexExpr: string): string {
    return `__rt.series("${name}").get(${indexExpr})`;
  }
}
