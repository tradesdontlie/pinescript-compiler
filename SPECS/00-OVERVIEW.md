# Pine Script v6 Parity — Master Overview

> **Goal**: 100% 1:1 compilation parity with TradingView Pine Script v6.
> **Benchmark**: `Hourly t&P with 05 box 1 05 percent lines.pine` (3,454 lines)
> **Current tests**: 329 passing | **Estimated feature parity**: ~60-65%

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| done | Implemented and tested |
| partial | Partially implemented |
| missing | Not yet implemented |

---

## Spec File Index

| # | File | Area | Status |
|---|------|------|--------|
| 01 | [01-LEXER-GAPS.md](01-LEXER-GAPS.md) | Lexer | partial |
| 02 | [02-PARSER-GAPS.md](02-PARSER-GAPS.md) | Parser | partial |
| 03 | [03-CODEGEN-GAPS.md](03-CODEGEN-GAPS.md) | Code Generator | partial |
| 04 | [04-RUNTIME-DRAWING-OBJECTS.md](04-RUNTIME-DRAWING-OBJECTS.md) | Drawing Objects | missing |
| 05 | [05-RUNTIME-COLLECTIONS.md](05-RUNTIME-COLLECTIONS.md) | Collections | partial |
| 06 | [06-RUNTIME-TIME-FUNCTIONS.md](06-RUNTIME-TIME-FUNCTIONS.md) | Time Functions | missing |
| 07 | [07-RUNTIME-STRING-FUNCTIONS.md](07-RUNTIME-STRING-FUNCTIONS.md) | String Functions | partial |
| 08 | [08-RUNTIME-REQUEST-SECURITY.md](08-RUNTIME-REQUEST-SECURITY.md) | request.security() | missing |
| 09 | [09-RUNTIME-SERIES-HISTORY.md](09-RUNTIME-SERIES-HISTORY.md) | Series History | partial |
| 10 | [10-CODEGEN-ENUM-CONSTANTS.md](10-CODEGEN-ENUM-CONSTANTS.md) | Enum Constants | partial |
| 11 | [11-RENDERER-GAPS.md](11-RENDERER-GAPS.md) | Renderer | partial |
| 12 | [12-METHOD-SYNTAX.md](12-METHOD-SYNTAX.md) | Method Dispatch | missing |
| 13 | [13-SEMANTIC-ANALYZER.md](13-SEMANTIC-ANALYZER.md) | Semantic Analysis | missing |
| 14 | [14-EDITOR-CODEMIRROR.md](14-EDITOR-CODEMIRROR.md) | Editor | missing |
| 15 | [15-PARQUET-DATA.md](15-PARQUET-DATA.md) | Data Loading | partial |

---

## Feature Checklist by Category

### A. Lexer (src/compiler/lexer/)

- [x] Single-line comments `// ...`
- [ ] Block comments `/* ... */` — **P1**
- [x] String literals (single/double quotes, escape sequences)
- [ ] Multi-line strings — **P2**
- [ ] Scientific notation (`1e5`, `1.5e-3`) — **P1**
- [x] Color literals `#RRGGBB` / `#RRGGBBAA`
- [x] Integer and float literals
- [x] All operators (`+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`)
- [x] Assignment operators (`=`, `:=`, `+=`, `-=`, `*=`, `/=`, `%=`)
- [x] Delimiters (`(`, `)`, `[`, `]`, `,`, `.`, `:`, `?`, `=>`, `->`)
- [x] Keywords (var, varip, if, else, for, to, by, in, while, switch, break, continue, return, import, export, as, type, method, enum, not, and, or)
- [x] Type keywords (int, float, bool, string, color, series, simple, const, input)
- [x] Indentation tracking (INDENT/DEDENT tokens)
- [x] Annotations (`//@version`, `//@description`)
- [ ] Line continuation (backslash `\` at end of line) — **P2**

### B. Parser (src/compiler/parser/)

- [x] Variable declarations (plain, var, varip)
- [x] Type annotations with qualifiers
- [x] Function declarations (block body and expression body)
- [x] Type declarations (UDTs) with fields
- [x] Method declarations
- [x] Enum declarations
- [x] Import/export statements
- [x] If/else statements and expressions
- [x] For/to/by loops
- [x] For...in loops
- [x] While loops
- [x] Switch statements and expressions
- [x] Tuple destructuring `[a, b] = fn()`
- [x] Binary expressions with Pratt precedence
- [x] Unary expressions
- [x] Ternary (`? :`) expressions
- [x] Function calls with positional and named arguments
- [x] Member access (`a.b`)
- [x] Index/history access (`a[1]`)
- [x] Array literals
- [x] Lambda expressions
- [ ] Typed array declarations `var float[] a = ...` — **P0**
- [ ] Matrix declarations `matrix<float>` — **P2**
- [ ] Map declarations `map<string, float>` — **P2**
- [ ] Method call chaining as first-class syntax — **P0** (see spec 12)
- [ ] Multiple return type annotations — **P2**
- [ ] `input.session()` parsing — **P1**

### C. Code Generator (src/compiler/codegen/)

- [x] IIFE output format `(function(__rt) { ... })`
- [x] var/varip → `__rt.state` / `__rt.persistentState`
- [x] indicator() / strategy() metadata extraction
- [x] input.*() → `__rt.getInput(id)`
- [x] plot() / hline() / fill() / bgcolor() / barcolor()
- [x] plotshape() / plotchar() / plotarrow() / plotcandle() / plotbar()
- [x] ta.* function mapping (37 functions)
- [x] math.* function mapping
- [x] str.* function mapping
- [x] array.* function mapping
- [x] color.* function mapping
- [x] Built-in variable mapping (open, high, low, close, volume, time, bar_index, hl2, hlc3, ohlc4)
- [x] Series history for builtins: `close[1]` → `__rt.series("close").get(1)`
- [ ] Series history for user variables: `myVar[1]` — **P0** (see spec 09)
- [ ] Drawing object codegen: `line.new()` → `__rt.line.new()` — **P0**
- [ ] Table codegen: `table.new()` / `table.cell()` — **P1**
- [ ] Method-syntax dispatch: `a.push(x)` → `__rt.array.push(a, x)` — **P0** (see spec 12)
- [ ] Enum constant mapping (line.style_*, xloc.*, yloc.*, extend.*, etc.) — **P0** (see spec 10)
- [ ] TypeDeclaration codegen (UDT → JS class/object) — **P1**
- [ ] MethodDeclaration codegen — **P1**
- [ ] `request.security()` codegen — **P0**
- [ ] Time function codegen (`hour()`, `minute()`, `dayofweek()`) — **P0**
- [ ] `timeframe.in_seconds()` codegen — **P0**
- [ ] `str.format_time()` codegen — **P0**
- [ ] `display.*` constants — **P1**
- [ ] `barmerge.*` constants — **P0**

### D. Runtime — Core (src/runtime/)

- [x] Bar-by-bar execution engine
- [x] Series<T> ring buffer with `push()` / `get(n)` / `valueOf()`
- [x] NA propagation (`NA`, `isNa()`, `nz()`, `fixnan()`)
- [x] State management (var/varip)
- [x] Barstate properties (isfirst, islast, ishistory, isrealtime, isconfirmed)
- [x] Input system with defaults
- [ ] User variable series history tracking — **P0**
- [ ] UDT instantiation and field access — **P1**
- [ ] `last_bar_index` / `last_bar_time` — **P1**
- [ ] `timenow` — **P1**

### E. Runtime — Technical Analysis (src/runtime/builtins/ta.ts)

- [x] ta.sma, ta.ema, ta.rsi, ta.macd, ta.bb
- [x] ta.atr, ta.stoch, ta.crossover, ta.crossunder
- [x] ta.highest, ta.lowest, ta.highestbars, ta.lowestbars
- [x] ta.valuewhen, ta.barssince, ta.change, ta.mom
- [x] ta.wma, ta.vwma, ta.dmi, ta.cci, ta.swma, ta.alma
- [x] ta.rma, ta.stdev, ta.variance, ta.cum, ta.tr
- [x] ta.pivothigh, ta.pivotlow, ta.falling, ta.rising
- [x] ta.percentrank, ta.correlation, ta.dev, ta.mfi, ta.obv
- [x] ta.supertrend
- [ ] ta.hma (Hull Moving Average) — **P1**
- [ ] ta.kc (Keltner Channel) — **P1**
- [ ] ta.donchian (Donchian Channel) — **P1**
- [ ] ta.linreg — **P1**
- [ ] ta.sar (Parabolic SAR) — **P2**
- [ ] ta.tsi — **P2**
- [ ] ta.percentile_linear_interpolation — **P2**
- [ ] ta.percentile_nearest_rank — **P2**
- [ ] ta.median — **P1**

### F. Runtime — Math (src/runtime/builtins/math.ts)

- [x] abs, ceil, floor, round, max, min, pow, sqrt, log, log10, exp, sign
- [x] sin, cos, tan, asin, acos, atan, random, todegrees, toradians
- [x] round_to_mintick
- [ ] math.avg (variadic) — **P1**
- [ ] math.sum — **P1**
- [ ] math.pi, math.e, math.phi constants — **P1**

### G. Runtime — Strings (src/runtime/builtins/str.ts)

- [x] str.tostring, str.tonumber, str.length, str.lower, str.upper
- [x] str.contains, str.startswith, str.endswith, str.substring
- [x] str.split, str.trim, str.replace, str.replace_all
- [x] str.match, str.pos, str.format
- [ ] str.format_time(time, format, timezone) — **P0** (10 calls in benchmark)
- [ ] str.repeat — **P2**

### H. Runtime — Collections (src/runtime/builtins/collections.ts)

#### Arrays (26 of ~40 methods implemented)
- [x] array.new, array.new_float, array.new_int, array.new_bool, array.new_string
- [x] array.push, array.pop, array.get, array.set, array.size
- [x] array.sum, array.avg, array.max, array.min
- [x] array.insert, array.remove, array.clear, array.copy, array.reverse
- [x] array.sort, array.join, array.slice, array.includes, array.indexof, array.lastindexof
- [x] array.from
- [ ] array.shift — **P0** (42 calls in benchmark)
- [ ] array.unshift — **P0**
- [ ] array.median — **P0** (2 calls in benchmark)
- [ ] array.stdev — **P1**
- [ ] array.variance — **P1**
- [ ] array.covariance — **P2**
- [ ] array.range — **P1**
- [ ] array.percentile_linear_interpolation — **P2**
- [ ] array.percentile_nearest_rank — **P2**
- [ ] array.abs — **P2**
- [ ] array.binary_search — **P2**
- [ ] array.binary_search_leftmost — **P2**
- [ ] array.binary_search_rightmost — **P2**
- [ ] array.concat — **P1**
- [ ] array.every — **P2**
- [ ] array.some — **P2**
- [ ] array.first — **P1**
- [ ] array.last — **P1**
- [ ] array.new_color, array.new_line, array.new_label, array.new_box, array.new_table — **P1**

#### Maps — **P2** (not used in benchmark)
- [ ] map.new
- [ ] map.put, map.get, map.contains, map.remove, map.clear
- [ ] map.keys, map.values, map.size

#### Matrix — **P2** (not used in benchmark)
- [ ] matrix.new, matrix.get, matrix.set, matrix.rows, matrix.columns
- [ ] matrix.add_row, matrix.add_col, matrix.remove_row, matrix.remove_col

### I. Runtime — Drawing Objects (BIGGEST GAP)

- [ ] line.new / line.delete / line.set_* / line.get_* — **P0** (171 calls in benchmark)
- [ ] label.new / label.delete / label.set_* / label.get_* — **P0** (56 calls in benchmark)
- [ ] box.new / box.delete / box.set_* / box.get_* — **P0** (98 calls in benchmark)
- [ ] table.new / table.cell / table.merge_cells — **P1** (102 calls in benchmark)
- [ ] polyline.new — **P2**
- [ ] linefill.new — **P2**

### J. Runtime — Time Functions

- [ ] hour(time, timezone) — **P0**
- [ ] minute(time, timezone) — **P0**
- [ ] second(time, timezone) — **P1**
- [ ] dayofweek(time, timezone) — **P0**
- [ ] dayofmonth(time, timezone) — **P1**
- [ ] month(time, timezone) — **P1**
- [ ] year(time, timezone) — **P1**
- [ ] weekofyear(time, timezone) — **P2**
- [ ] time_close — **P0**
- [ ] timenow — **P1**
- [ ] timestamp(year, month, day, hour, minute, second) — **P1**
- [ ] timeframe.in_seconds() — **P0** (5 calls in benchmark)
- [ ] time(timeframe, session, timezone) — **P1**

### K. Runtime — Other Builtins

- [x] syminfo.* (ticker, tickerid, prefix, root, mintick, pointvalue, timezone, type, session, basecurrency, currency, description)
- [x] timeframe.* (period, multiplier, isdwm, isintraday, isminutes, ishours, isdaily, isweekly, ismonthly)
- [x] barstate.* (isfirst, islast, ishistory, isrealtime, isconfirmed)
- [x] color.new, color.r, color.g, color.b, color.t, color.rgb, color.from_gradient
- [ ] request.security() — **P0** (7 calls in benchmark)
- [ ] ticker.new — **P1**
- [ ] input.session — **P1** (8 calls in benchmark)
- [ ] display.* constants — **P1**
- [ ] `session.ismarket` / `session.ispremarket` / `session.ispostmarket` — **P2**
- [ ] runtime.error — **P2**

### L. Strategy Engine (src/runtime/builtins/strategy.ts)

- [x] strategy.entry, strategy.close, strategy.order, strategy.exit
- [x] strategy.cancel, strategy.cancel_all
- [x] Equity curve, P&L, win rate, profit factor, max drawdown
- [ ] strategy.risk.* (max_drawdown, max_intraday_loss, etc.) — **P2**
- [ ] strategy.closedtrades.* object — **P2**
- [ ] strategy.opentrades.* object — **P2**

### M. Renderer (src/renderer/)

- [x] Candlestick rendering
- [x] Line plot rendering (line, histogram, area styles)
- [x] Horizontal lines (hline)
- [ ] Fill rendering between plots — **P1**
- [ ] bgcolor rendering — **P1**
- [ ] barcolor rendering — **P1**
- [ ] plotshape rendering — **P1**
- [ ] plotchar rendering — **P1**
- [ ] plotarrow rendering — **P1**
- [ ] plotcandle rendering — **P1**
- [ ] plotbar rendering — **P1**
- [ ] Drawing object visualization (lines, labels, boxes) — **P0**
- [ ] Table rendering — **P1**
- [ ] Multi-pane layout (overlay vs separate pane) — **P1**
- [ ] Strategy trade markers — **P2**

### N. Semantic Analyzer — **P2** (not blocking compilation)

- [ ] Type checking
- [ ] Scope validation
- [ ] Qualifier enforcement (const, input, simple, series)
- [ ] Function overload resolution
- [ ] NA type narrowing
- [ ] Unused variable warnings

### O. Editor — **P2** (not blocking compilation)

- [ ] CodeMirror 6 integration
- [ ] Pine Script syntax highlighting
- [ ] Autocomplete
- [ ] Error gutters
- [ ] Inline diagnostics

### P. Data Loading

- [x] JSON loader
- [x] CSV loader
- [x] Sample data
- [ ] Parquet file loading — **P1**
- [ ] Real-time data feed — **P2**

---

## Priority Summary

### P0 — Required to compile benchmark indicator (~25 items)
The most critical gaps that block real-world script compilation:
1. Drawing objects (line/label/box) — runtime + codegen + renderer
2. Method syntax dispatch (`a.push()`, `a.size()`)
3. User variable series history (`myVar[1]`)
4. Pine enum constants (line.style_*, xloc.*, yloc.*, extend.*, etc.)
5. Time functions (hour, minute, dayofweek, time_close, timenow)
6. str.format_time()
7. timeframe.in_seconds()
8. Missing array methods (shift, unshift, median)
9. request.security() with tuple returns
10. barmerge.* constants

### P1 — Common in real scripts (~40 items)
Needed for a wide range of indicators/strategies:
- table.new/table.cell, bgcolor/barcolor renderer, multi-pane
- Block comments, UDT codegen, additional ta.* functions
- input.session, display.* constants, Parquet loading

### P2 — Rare/advanced (~30 items)
Completeness items:
- Semantic analyzer, map/matrix, polyline/linefill
- Library import/export, CodeMirror editor
- strategy.risk.*, strategy.closedtrades.*

---

## Verification Criteria

1. `ls SPECS/*.md | wc -l` → **16 files**
2. Every Pine Script feature used in the benchmark indicator is covered in at least one spec
3. This overview contains a complete checklist of all major Pine Script v6 features
4. Each spec has concrete, testable acceptance criteria
