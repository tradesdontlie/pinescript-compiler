/**
 * Pine Script v6 language definition for CodeMirror 6.
 *
 * Provides:
 *  - StreamLanguage-based syntax highlighting (tokenizer)
 *  - Keyword/builtin autocomplete
 *  - Namespace member completions (ta.*, math.*, etc.)
 *
 * NOTE: This file requires @codemirror/language and @codemirror/autocomplete.
 * Install with: npm install @codemirror/language @codemirror/autocomplete
 *
 * The token tables below are self-contained and can be tested without CM6.
 */

// ── Token tables ─────────────────────────────────────────────────────────────

export const PINE_KEYWORDS = [
  'var', 'varip', 'if', 'else', 'for', 'to', 'by', 'in',
  'while', 'switch', 'break', 'continue', 'return',
  'import', 'export', 'as', 'type', 'method', 'enum',
  'not', 'and', 'or', 'true', 'false', 'na',
] as const;

export const PINE_TYPE_KEYWORDS = [
  'int', 'float', 'bool', 'string', 'color',
  'series', 'simple', 'const', 'input',
] as const;

export const PINE_BUILTIN_VARS = [
  'open', 'high', 'low', 'close', 'volume', 'time',
  'bar_index', 'last_bar_index', 'timenow',
  'hl2', 'hlc3', 'ohlc4', 'hlcc4',
] as const;

export const PINE_NAMESPACES = [
  'ta', 'math', 'str', 'array', 'matrix', 'map',
  'color', 'syminfo', 'timeframe', 'barstate',
  'strategy', 'request', 'line', 'label', 'box', 'table',
  'input', 'alert', 'runtime',
] as const;

/** Namespace member lookup for autocomplete */
export const PINE_NAMESPACE_MEMBERS: Record<string, string[]> = {
  ta: [
    'sma', 'ema', 'rma', 'wma', 'vwma', 'swma',
    'rsi', 'macd', 'bbands', 'atr', 'tr',
    'stoch', 'cci', 'mfi', 'mom', 'roc', 'cmo',
    'cross', 'crossover', 'crossunder',
    'highest', 'lowest', 'highestbars', 'lowestbars',
    'valuewhen', 'barssince', 'rising', 'falling',
    'pivothigh', 'pivotlow', 'supertrend', 'vwap',
    'correlation', 'percentrank', 'change', 'linreg',
    'cum', 'median', 'mode', 'percentile_linear_interpolation',
    'percentile_nearest_rank',
  ],
  math: [
    'abs', 'ceil', 'floor', 'round', 'sqrt',
    'log', 'log10', 'exp', 'pow',
    'max', 'min', 'sign', 'avg',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'pi', 'phi', 'e', 'rphi',
    'random', 'sum', 'todegrees', 'toradians',
  ],
  str: [
    'tostring', 'tofloat', 'toint',
    'contains', 'startswith', 'endswith',
    'length', 'lower', 'upper', 'trim',
    'replace', 'replace_all', 'split', 'join',
    'format', 'formatTime', 'substring',
    'pos', 'match',
  ],
  array: [
    'new_float', 'new_int', 'new_bool', 'new_string', 'new_color',
    'new_line', 'new_label', 'new_box', 'new_table',
    'from', 'copy', 'slice', 'concat', 'join',
    'size', 'get', 'set', 'push', 'pop', 'shift', 'unshift',
    'insert', 'remove', 'clear', 'fill',
    'sort', 'sort_indices', 'reverse',
    'includes', 'indexof', 'lastindexof',
    'sum', 'avg', 'max', 'min', 'median', 'mode',
    'stdev', 'variance', 'range',
    'covariance', 'correlation',
    'percentile_linear_interpolation', 'percentile_nearest_rank',
    'binary_search', 'binary_search_leftmost', 'binary_search_rightmost',
  ],
  matrix: [
    'new', 'get', 'set', 'row', 'col', 'rows', 'columns',
    'add_row', 'add_col', 'remove_row', 'remove_col',
    'swap_rows', 'swap_columns', 'fill', 'copy', 'submatrix',
    'reverse', 'transpose', 'invert', 'pinv', 'det',
    'eigenvalues', 'eigenvectors', 'mult', 'sum', 'avg',
    'min', 'max', 'median', 'mode', 'variance', 'stdev',
    'is_zero', 'is_identity', 'is_binary', 'is_symmetric',
    'is_antisymmetric', 'is_diagonal', 'is_antidiagonal',
    'kron', 'concat', 'reshape',
  ],
  map: [
    'new', 'get', 'set', 'contains', 'remove', 'clear', 'copy',
    'keys', 'values', 'size',
    'put_all', 'get_or_default',
  ],
  color: [
    'new', 'rgb', 'from_gradient',
    'r', 'g', 'b', 't',
    'red', 'green', 'blue', 'white', 'black', 'yellow',
    'orange', 'purple', 'silver', 'gray', 'maroon', 'olive',
    'lime', 'aqua', 'teal', 'navy', 'fuchsia',
    'new_transparent',
  ],
  syminfo: [
    'ticker', 'tickerid', 'prefix', 'root', 'currency', 'basecurrency',
    'description', 'type', 'timezone', 'session', 'mintick',
    'pointvalue', 'pricescale', 'volumetype',
  ],
  timeframe: [
    'period', 'multiplier', 'isdwm', 'isintraday', 'isminutes',
    'isseconds', 'isweekly', 'ismonthly', 'isdaily',
    'in_seconds', 'change',
  ],
  barstate: [
    'islast', 'isfirst', 'isrealtime', 'ishistory',
    'islastconfirmedhistory', 'isnew', 'isconfirmed',
  ],
  strategy: [
    'entry', 'close', 'exit', 'cancel', 'cancel_all', 'order',
    'position_size', 'position_avg_price', 'position_entry_name',
    'opentrades', 'closedtrades', 'eventrades',
    'netprofit', 'equity', 'grossprofit', 'grossloss',
    'max_drawdown', 'max_runup', 'account_currency',
    'initial_capital', 'margin_liquid_ratio', 'oca_cancel', 'oca_reduce',
  ],
  request: [
    'security', 'security_lower_tf', 'quandl', 'financial',
    'dividends', 'splits', 'earnings', 'currency_rate',
    'seed',
  ],
  line: [
    'new', 'delete', 'set_x1', 'set_x2', 'set_y1', 'set_y2',
    'set_xy1', 'set_xy2', 'set_color', 'set_width', 'set_style',
    'set_extend', 'get_x1', 'get_x2', 'get_y1', 'get_y2',
    'get_price', 'copy', 'all',
    'style_solid', 'style_dashed', 'style_dotted',
    'extend_none', 'extend_left', 'extend_right', 'extend_both',
  ],
  label: [
    'new', 'delete', 'set_x', 'set_y', 'set_xy', 'set_text',
    'set_color', 'set_textcolor', 'set_size', 'set_style',
    'set_xloc', 'set_yloc', 'set_tooltip',
    'get_x', 'get_y', 'get_text', 'copy', 'all',
    'style_label_up', 'style_label_down', 'style_label_left',
    'style_label_right', 'style_label_center', 'style_label_lower_left',
    'style_label_lower_right', 'style_label_upper_left', 'style_label_upper_right',
    'style_label_no_arrow', 'style_arrowup', 'style_arrowdown',
    'style_circle', 'style_cross', 'style_diamond', 'style_flag',
    'style_none', 'style_square', 'style_triangledown', 'style_triangleup',
    'style_xcross',
  ],
  box: [
    'new', 'delete', 'set_left', 'set_right', 'set_top', 'set_bottom',
    'set_lefttop', 'set_rightbottom',
    'set_border_color', 'set_border_width', 'set_border_style',
    'set_bgcolor', 'set_extend', 'set_text', 'set_text_color',
    'set_text_halign', 'set_text_valign', 'set_text_size', 'set_text_wrap',
    'set_xloc', 'get_left', 'get_right', 'get_top', 'get_bottom',
    'copy', 'all',
    'style_solid', 'style_dashed', 'style_dotted',
  ],
  table: [
    'new', 'delete', 'clear', 'cell', 'cell_set_text',
    'cell_set_tooltip', 'cell_set_bgcolor', 'cell_set_text_color',
    'cell_set_text_size', 'cell_set_text_halign', 'cell_set_text_valign',
    'cell_set_width', 'cell_set_height', 'cell_merge', 'set_border_color',
    'set_border_width', 'set_frame_color', 'set_frame_width', 'set_bgcolor',
    'set_position',
    'position_top_left', 'position_top_center', 'position_top_right',
    'position_middle_left', 'position_middle_center', 'position_middle_right',
    'position_bottom_left', 'position_bottom_center', 'position_bottom_right',
  ],
  input: [
    'int', 'float', 'bool', 'string', 'color', 'source', 'timeframe',
    'symbol', 'session', 'text_area', 'price', 'time', 'enum',
  ],
  alert: ['alert', 'alertcondition', 'frequency_once_per_bar', 'frequency_once_per_bar_close'],
  runtime: ['error'],
};

/** Top-level built-in function names for autocompletion */
export const PINE_GLOBAL_FUNCTIONS = [
  'indicator', 'strategy', 'library',
  'plot', 'plotshape', 'plotarrow', 'plotcandle', 'plotbar', 'plotchar',
  'fill', 'bgcolor', 'barcolor', 'hline',
  'na', 'nz', 'fixnan',
  'alert', 'alertcondition',
  'log', 'runtime',
] as const;

// ── Stream parser token function ─────────────────────────────────────────────

export type TokenTag =
  | 'comment'
  | 'string'
  | 'number'
  | 'color'
  | 'keyword'
  | 'typeName'
  | 'namespace'
  | 'builtinVar'
  | 'variableName'
  | 'operator'
  | null;

interface StreamInterface {
  match(pattern: string | RegExp, consume?: boolean): boolean | RegExpMatchArray | null;
  skipToEnd(): void;
  next(): string | null;
  peek(): string | null;
  eatWhile(match: RegExp): boolean;
  sol(): boolean;
  eol(): boolean;
  pos: number;
}

interface StreamState {
  inBlockComment: boolean;
}

const KEYWORD_SET = new Set<string>(PINE_KEYWORDS);
const TYPE_KEYWORD_SET = new Set<string>(PINE_TYPE_KEYWORDS);
const BUILTIN_VAR_SET = new Set<string>(PINE_BUILTIN_VARS);
const NAMESPACE_SET = new Set<string>(PINE_NAMESPACES);

/**
 * Core tokenizer logic — separated from CM6 dependency so it can be unit tested.
 * Returns the token tag or null if the character should advance without tagging.
 */
export function pineToken(stream: StreamInterface, state: StreamState): TokenTag {
  // Block comment continuation
  if (state.inBlockComment) {
    while (!stream.eol()) {
      if (stream.match('*/')) {
        state.inBlockComment = false;
        break;
      }
      stream.next();
    }
    return 'comment';
  }

  // Block comment start
  if (stream.match('/*')) {
    state.inBlockComment = true;
    while (!stream.eol()) {
      if (stream.match('*/')) {
        state.inBlockComment = false;
        break;
      }
      stream.next();
    }
    return 'comment';
  }

  // Line comment
  if (stream.match('//')) {
    stream.skipToEnd();
    return 'comment';
  }

  // Strings
  const quote = stream.peek();
  if (quote === '"' || quote === "'") {
    stream.next();
    while (!stream.eol()) {
      const ch = stream.next();
      if (ch === '\\') { stream.next(); continue; }
      if (ch === quote) break;
    }
    return 'string';
  }

  // Color literals (#rrggbb or #rrggbbaa)
  if (stream.match(/^#[0-9a-fA-F]{3,8}/)) return 'color';

  // Scientific notation / numbers
  if (stream.match(/^[0-9]+\.?[0-9]*([eE][+\-]?[0-9]+)?/)) return 'number';
  if (stream.match(/^\.[0-9]+/)) return 'number';

  // Identifiers and keywords
  if (stream.match(/^[a-zA-Z_]\w*/)) {
    const word = (stream as unknown as { current(): string }).current?.() ?? '';
    if (KEYWORD_SET.has(word)) return 'keyword';
    if (TYPE_KEYWORD_SET.has(word)) return 'typeName';
    if (NAMESPACE_SET.has(word)) return 'namespace';
    if (BUILTIN_VAR_SET.has(word)) return 'builtinVar';
    return 'variableName';
  }

  // Operators
  if (stream.match(/^(:=|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|=>|->|[+\-*/%=!<>&|?:])/)) {
    return 'operator';
  }

  stream.next();
  return null;
}

/** State factory for the stream parser */
export function makePineState(): StreamState {
  return { inBlockComment: false };
}

// ── CodeMirror 6 language setup ──────────────────────────────────────────────

/**
 * Returns a CM6 LanguageSupport extension for Pine Script.
 * Dynamically imports CM6 packages so the module is importable even if
 * @codemirror packages are not installed.
 */
export async function createPineLanguage(): Promise<unknown> {
  try {
    const { StreamLanguage } = await import('@codemirror/language' as never);
    const { autocompletion } = await import('@codemirror/autocomplete' as never);

    // Build the stream language
    const pineStreamLang = (StreamLanguage as any).define({
      startState: makePineState,
      token: pineToken,
      blankLine(_state: StreamState): void {
        // no-op
      },
      copyState(state: StreamState): StreamState {
        return { ...state };
      },
      languageData: {
        commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
        indentOnInput: /^\s*(else|for|while|if|switch|return)\b/,
        closeBrackets: { brackets: ['(', '[', '"', "'"] },
      },
    });

    // Autocomplete provider
    const completionProvider = buildCompletionProvider();

    return [pineStreamLang, autocompletion({ override: [completionProvider] })];
  } catch {
    return []; // CM6 not installed
  }
}

function buildCompletionProvider(): (context: unknown) => unknown {
  return (context: unknown) => {
    const ctx = context as {
      matchBefore: (re: RegExp) => { from: number; to: number; text: string } | null;
      explicit?: boolean;
    };

    // Namespace member completion: after "ta.", "math.", etc.
    const nsBefore = ctx.matchBefore(/\w+\.\w*/);
    if (nsBefore) {
      const dotIdx = nsBefore.text.indexOf('.');
      const ns = nsBefore.text.substring(0, dotIdx);
      const members = PINE_NAMESPACE_MEMBERS[ns];
      if (members) {
        return {
          from: nsBefore.from + dotIdx + 1,
          options: members.map(m => ({ label: m, type: 'function', detail: ns })),
        };
      }
    }

    // General keyword/builtin completion
    const word = ctx.matchBefore(/\w+/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;

    const options = [
      ...PINE_KEYWORDS.map(k => ({ label: k, type: 'keyword' })),
      ...PINE_TYPE_KEYWORDS.map(k => ({ label: k, type: 'type' })),
      ...PINE_BUILTIN_VARS.map(v => ({ label: v, type: 'variable', detail: 'built-in' })),
      ...PINE_NAMESPACES.map(n => ({ label: n, type: 'namespace' })),
      ...PINE_GLOBAL_FUNCTIONS.map(f => ({ label: f, type: 'function' })),
    ];

    return { from: word.from, options };
  };
}
