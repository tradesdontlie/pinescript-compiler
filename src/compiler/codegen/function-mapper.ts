// Maps Pine Script built-in function/variable names to runtime calls

export const BUILTIN_VARS = new Set([
  'open', 'high', 'low', 'close', 'volume', 'time',
  'bar_index', 'hl2', 'hlc3', 'ohlc4',
  'time_close', 'timenow',
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

  // P1 ta.* additions
  'ta.hma':      '__rt.ta.hma',
  'ta.kc':       '__rt.ta.kc',
  'ta.donchian': '__rt.ta.donchian',
  'ta.linreg':   '__rt.ta.linreg',
  'ta.median':   '__rt.ta.median',
  'ta.sar':      '__rt.ta.sar',
  'ta.tsi':      '__rt.ta.tsi',
  'ta.percentile_linear_interpolation': '__rt.ta.percentileLinearInterpolation',
  'ta.percentile_nearest_rank':         '__rt.ta.percentileNearestRank',
  'ta.williamsr':  '__rt.ta.williamsr',
  'ta.cmo':        '__rt.ta.cmo',
  'ta.covariance': '__rt.ta.covariance',

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
  'math.avg': '__rt.math.avg',
  'math.sum': '__rt.math.sum',

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

  // Drawing: line
  'line.new': '__rt.line.new',
  'line.delete': '__rt.line.delete',
  'line.set_x1': '__rt.line.set_x1',
  'line.set_y1': '__rt.line.set_y1',
  'line.set_x2': '__rt.line.set_x2',
  'line.set_y2': '__rt.line.set_y2',
  'line.set_xy1': '__rt.line.set_xy1',
  'line.set_xy2': '__rt.line.set_xy2',
  'line.set_xloc': '__rt.line.set_xloc',
  'line.set_extend': '__rt.line.set_extend',
  'line.set_color': '__rt.line.set_color',
  'line.set_style': '__rt.line.set_style',
  'line.set_width': '__rt.line.set_width',
  'line.get_x1': '__rt.line.get_x1',
  'line.get_y1': '__rt.line.get_y1',
  'line.get_x2': '__rt.line.get_x2',
  'line.get_y2': '__rt.line.get_y2',
  'line.get_price': '__rt.line.get_price',
  'line.copy': '__rt.line.copy',
  'line.all': '__rt.line.all',

  // Drawing: label
  'label.new': '__rt.label.new',
  'label.delete': '__rt.label.delete',
  'label.set_x': '__rt.label.set_x',
  'label.set_y': '__rt.label.set_y',
  'label.set_xy': '__rt.label.set_xy',
  'label.set_xloc': '__rt.label.set_xloc',
  'label.set_yloc': '__rt.label.set_yloc',
  'label.set_text': '__rt.label.set_text',
  'label.set_tooltip': '__rt.label.set_tooltip',
  'label.set_color': '__rt.label.set_color',
  'label.set_textcolor': '__rt.label.set_textcolor',
  'label.set_style': '__rt.label.set_style',
  'label.set_size': '__rt.label.set_size',
  'label.set_textalign': '__rt.label.set_textalign',
  'label.get_x': '__rt.label.get_x',
  'label.get_y': '__rt.label.get_y',
  'label.get_text': '__rt.label.get_text',
  'label.copy': '__rt.label.copy',
  'label.all': '__rt.label.all',

  // Drawing: box
  'box.new': '__rt.box.new',
  'box.delete': '__rt.box.delete',
  'box.set_left': '__rt.box.set_left',
  'box.set_top': '__rt.box.set_top',
  'box.set_right': '__rt.box.set_right',
  'box.set_bottom': '__rt.box.set_bottom',
  'box.set_lefttop': '__rt.box.set_lefttop',
  'box.set_rightbottom': '__rt.box.set_rightbottom',
  'box.set_bgcolor': '__rt.box.set_bgcolor',
  'box.set_border_color': '__rt.box.set_border_color',
  'box.set_border_width': '__rt.box.set_border_width',
  'box.set_border_style': '__rt.box.set_border_style',
  'box.set_extend': '__rt.box.set_extend',
  'box.set_text': '__rt.box.set_text',
  'box.set_text_color': '__rt.box.set_text_color',
  'box.set_text_size': '__rt.box.set_text_size',
  'box.set_text_halign': '__rt.box.set_text_halign',
  'box.set_text_valign': '__rt.box.set_text_valign',
  'box.get_left': '__rt.box.get_left',
  'box.get_top': '__rt.box.get_top',
  'box.get_right': '__rt.box.get_right',
  'box.get_bottom': '__rt.box.get_bottom',
  'box.copy': '__rt.box.copy',
  'box.all': '__rt.box.all',

  // Drawing: table
  'table.new': '__rt.table.new',
  'table.cell': '__rt.table.cell',
  'table.merge_cells': '__rt.table.merge_cells',
  'table.delete': '__rt.table.delete',
  'table.clear': '__rt.table.clear',
  'table.set_bgcolor': '__rt.table.set_bgcolor',
  'table.set_border_color': '__rt.table.set_border_color',
  'table.set_border_width': '__rt.table.set_border_width',
  'table.set_frame_color': '__rt.table.set_frame_color',
  'table.set_frame_width': '__rt.table.set_frame_width',
  'table.set_position': '__rt.table.set_position',
  'table.cell_set_text': '__rt.table.cell_set_text',
  'table.cell_set_bgcolor': '__rt.table.cell_set_bgcolor',
  'table.cell_set_text_color': '__rt.table.cell_set_text_color',
  'table.cell_set_text_size': '__rt.table.cell_set_text_size',
  'table.cell_set_text_halign': '__rt.table.cell_set_text_halign',
  'table.cell_set_text_valign': '__rt.table.cell_set_text_valign',
  'table.cell_set_tooltip': '__rt.table.cell_set_tooltip',

  // Time functions
  'hour': '__rt.hour',
  'minute': '__rt.minute',
  'second': '__rt.second',
  'dayofweek': '__rt.dayofweek',
  'dayofmonth': '__rt.dayofmonth',
  'month': '__rt.month',
  'year': '__rt.year',
  'timestamp': '__rt.timestamp',
  'weekofyear': '__rt.weekofyear',
  'timeframe.in_seconds': '__rt.timeframe.inSeconds',
  'str.format_time': '__rt.str.formatTime',
  'str.repeat': '__rt.str.repeat',

  // Missing array methods
  'array.shift': '__rt.array.shift',
  'array.unshift': '__rt.array.unshift',
  'array.median': '__rt.array.median',
  'array.stdev': '__rt.array.stdev',
  'array.variance': '__rt.array.variance',
  'array.range': '__rt.array.range',
  'array.first': '__rt.array.first',
  'array.last': '__rt.array.last',
  'array.concat': '__rt.array.concat',
  'array.new_line': '__rt.array.newLine',
  'array.new_label': '__rt.array.newLabel',
  'array.new_box': '__rt.array.newBox',
  'array.new_table': '__rt.array.newTable',
  'array.new_color': '__rt.array.newColor',
  'array.abs': '__rt.array.abs',
  'array.binary_search': '__rt.array.binarySearch',
  'array.binary_search_leftmost': '__rt.array.binarySearchLeftmost',
  'array.binary_search_rightmost': '__rt.array.binarySearchRightmost',
  'array.every': '__rt.array.every',
  'array.some': '__rt.array.some',
  'array.fill': '__rt.array.fill',
  'array.covariance': '__rt.array.covariance',
  'array.mode': '__rt.array.mode',
  'array.percentile_linear_interpolation': '__rt.array.percentileLinearInterpolation',
  'array.percentile_nearest_rank': '__rt.array.percentileNearestRank',
  'array.percentrank': '__rt.array.percentrank',
  'array.standardize': '__rt.array.standardize',

  // Map functions -> __rt.map.*
  'map.new':      '__rt.map.new',
  'map.put':      '__rt.map.put',
  'map.get':      '__rt.map.get',
  'map.contains': '__rt.map.contains',
  'map.remove':   '__rt.map.remove',
  'map.clear':    '__rt.map.clear',
  'map.keys':     '__rt.map.keys',
  'map.values':   '__rt.map.values',
  'map.size':     '__rt.map.size',
  'map.copy':     '__rt.map.copy',

  // Matrix functions -> __rt.matrix.*
  'matrix.new':        '__rt.matrix.new',
  'matrix.get':        '__rt.matrix.get',
  'matrix.set':        '__rt.matrix.set',
  'matrix.rows':       '__rt.matrix.rows',
  'matrix.columns':    '__rt.matrix.columns',
  'matrix.add_row':    '__rt.matrix.addRow',
  'matrix.add_col':    '__rt.matrix.addCol',
  'matrix.remove_row': '__rt.matrix.removeRow',
  'matrix.remove_col': '__rt.matrix.removeCol',
  'matrix.copy':       '__rt.matrix.copy',
  'matrix.fill':       '__rt.matrix.fill',
  'matrix.sum':        '__rt.matrix.sum',
  'matrix.avg':        '__rt.matrix.avg',
  'matrix.max':        '__rt.matrix.max',
  'matrix.min':        '__rt.matrix.min',
  'matrix.transpose':  '__rt.matrix.transpose',
  'matrix.reverse':    '__rt.matrix.reverse',
  'matrix.sort':       '__rt.matrix.sort',
  'matrix.reshape':    '__rt.matrix.reshape',
  'matrix.row':        '__rt.matrix.row',
  'matrix.col':        '__rt.matrix.col',
  'matrix.submatrix':  '__rt.matrix.submatrix',
  'matrix.new_float':  '__rt.matrix.newFloat',
  'matrix.new_int':    '__rt.matrix.newInt',
  'matrix.new_bool':   '__rt.matrix.newBool',

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
