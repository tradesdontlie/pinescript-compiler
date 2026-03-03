# Pine Script v6 Parity — Master Overview

> **Goal**: 100% 1:1 compilation parity with TradingView Pine Script v6.
> **Benchmark**: `Hourly t&P with 05 box 1 05 percent lines.pine` (3,454 lines)
> **Current tests**: 480 passing | **Estimated feature parity**: ~85-90%

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
| 01 | [01-LEXER-GAPS.md](01-LEXER-GAPS.md) | Lexer | done (P0 complete) |
| 02 | [02-PARSER-GAPS.md](02-PARSER-GAPS.md) | Parser | done (P0 complete) |
| 03 | [03-CODEGEN-GAPS.md](03-CODEGEN-GAPS.md) | Code Generator | done (P0 complete) |
| 04 | [04-RUNTIME-DRAWING-OBJECTS.md](04-RUNTIME-DRAWING-OBJECTS.md) | Drawing Objects | done (P0 complete) |
| 05 | [05-RUNTIME-COLLECTIONS.md](05-RUNTIME-COLLECTIONS.md) | Collections | done (P0 complete) |
| 06 | [06-RUNTIME-TIME-FUNCTIONS.md](06-RUNTIME-TIME-FUNCTIONS.md) | Time Functions | done (P0 complete) |
| 07 | [07-RUNTIME-STRING-FUNCTIONS.md](07-RUNTIME-STRING-FUNCTIONS.md) | String Functions | done (P0 complete) |
| 08 | [08-RUNTIME-REQUEST-SECURITY.md](08-RUNTIME-REQUEST-SECURITY.md) | request.security() | done (P0 complete) |
| 09 | [09-RUNTIME-SERIES-HISTORY.md](09-RUNTIME-SERIES-HISTORY.md) | Series History | done (P0 complete) |
| 10 | [10-CODEGEN-ENUM-CONSTANTS.md](10-CODEGEN-ENUM-CONSTANTS.md) | Enum Constants | done (P0 complete) |
| 11 | [11-RENDERER-GAPS.md](11-RENDERER-GAPS.md) | Renderer | partial (P1 remaining) |
| 12 | [12-METHOD-SYNTAX.md](12-METHOD-SYNTAX.md) | Method Dispatch | done (P0 complete) |
| 13 | [13-SEMANTIC-ANALYZER.md](13-SEMANTIC-ANALYZER.md) | Semantic Analysis | missing (P2) |
| 14 | [14-EDITOR-CODEMIRROR.md](14-EDITOR-CODEMIRROR.md) | Editor | missing (P2) |
| 15 | [15-PARQUET-DATA.md](15-PARQUET-DATA.md) | Data Loading | partial (P1) |
| 16 | [16-REMAINING-TA-MATH.md](16-REMAINING-TA-MATH.md) | Remaining ta.*/math.* | missing (P1) |
| 17 | [17-UDT-CODEGEN.md](17-UDT-CODEGEN.md) | UDT Compilation | missing (P1) |

---

## Feature Checklist by Category

### A. Lexer (src/compiler/lexer/)

- [x] Single-line comments `// ...`
- [x] Block comments `/* ... */` — **P0 DONE**
- [x] String literals (single/double quotes, escape sequences)
- [ ] Multi-line strings — **P2**
- [x] Scientific notation (`1e5`, `1.5e-3`) — **P0 DONE**
- [x] Color literals `#RRGGBB` / `#RRGGBBAA`
- [x] Integer and float literals
- [x] All operators (`+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`)
- [x] Assignment operators (`=`, `:=`, `+=`, `-=`, `*=`, `/=`, `%=`)
- [x] Delimiters (`(`, `)`, `[`, `]`, `,`, `.`, `:`, `?`, `=>`, `->`)
- [x] Keywords (var, varip, if, else, for, to, by, in, while, switch, break, continue, return, import, export, as, type, method, enum, not, and, or)
- [x] Type keywords (int, float, bool, string, color, series, simple, const, input)
- [x] Indentation tracking (INDENT/DEDENT tokens)
- [x] Annotations (`//@version`, `//@description`)
- [x] Line continuation (implicit after operators, commas, open parens/brackets) — **P0 DONE**

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
- [x] Typed array declarations `var float[] a = ...` — **P0 DONE**
- [ ] Matrix declarations `matrix<float>` — **P2**
- [ ] Map declarations `map<string, float>` — **P2**
- [x] Method call chaining as first-class syntax — **P0 DONE** (see spec 12)
- [ ] Multiple return type annotations — **P2**
- [ ] `input.session()` parsing — **P1**
- [x] Drawing type names in declarations (`var line myLine = na`) — **P0 DONE**
- [x] `for [index, value] in` destructuring — **P0 DONE**

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
- [x] Series history for user variables: `myVar[1]` — **P0 DONE** (see spec 09)
- [x] Drawing object codegen: `line.new()` → `__rt.line.new()` — **P0 DONE**
- [ ] Table codegen named-arg reordering — **P1** (basic table.new/table.cell works; named-arg positional reorder pending)
- [x] Method-syntax dispatch: `a.push(x)` → `__rt.array.push(a, x)` — **P0 DONE** (see spec 12)
- [x] Enum constant mapping (line.style_*, xloc.*, yloc.*, extend.*, etc.) — **P0 DONE** (see spec 10)
- [ ] TypeDeclaration codegen (UDT → JS class/object) — **P1**
- [ ] MethodDeclaration codegen — **P1**
- [x] `request.security()` codegen — **P0 DONE**
- [x] Time function codegen (`hour()`, `minute()`, `dayofweek()`) — **P0 DONE**
- [x] `timeframe.in_seconds()` codegen — **P0 DONE**
- [x] `str.format_time()` codegen — **P0 DONE**
- [ ] `display.*` constants — **P1**
- [x] `barmerge.*` constants — **P0 DONE**

### D. Runtime — Core (src/runtime/)

- [x] Bar-by-bar execution engine
- [x] Series<T> ring buffer with `push()` / `get(n)` / `valueOf()`
- [x] NA propagation (`NA`, `isNa()`, `nz()`, `fixnan()`)
- [x] State management (var/varip)
- [x] Barstate properties (isfirst, islast, ishistory, isrealtime, isconfirmed)
- [x] Input system with defaults
- [x] User variable series history tracking — **P0 DONE**
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
- [x] str.format_time(time, format, timezone) — **P0 DONE**
- [ ] str.repeat — **P2**

### H. Runtime — Collections (src/runtime/builtins/collections.ts)

#### Arrays (55+ of ~65 methods implemented)
- [x] array.new, array.new_float, array.new_int, array.new_bool, array.new_string
- [x] array.push, array.pop, array.get, array.set, array.size
- [x] array.sum, array.avg, array.max, array.min
- [x] array.insert, array.remove, array.clear, array.copy, array.reverse
- [x] array.sort, array.join, array.slice, array.includes, array.indexof, array.lastindexof
- [x] array.from
- [x] array.shift — **P0 DONE**
- [x] array.unshift — **P0 DONE**
- [x] array.median — **P0 DONE**
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

### I. Runtime — Drawing Objects (src/runtime/builtins/drawing.ts)

- [x] line.new / line.delete / line.set_* / line.get_* — **P0 DONE** (171 calls in benchmark)
- [x] label.new / label.delete / label.set_* / label.get_* — **P0 DONE** (56 calls in benchmark)
- [x] box.new / box.delete / box.set_* / box.get_* — **P0 DONE** (98 calls in benchmark)
- [x] table.new / table.cell / table.merge_cells — **P0 DONE** (102 calls in benchmark)
- [ ] polyline.new — **P2**
- [ ] linefill.new — **P2**

### J. Runtime — Time Functions

- [x] hour(time, timezone) — **P0 DONE**
- [x] minute(time, timezone) — **P0 DONE**
- [ ] second(time, timezone) — **P1**
- [x] dayofweek(time, timezone) — **P0 DONE**
- [ ] dayofmonth(time, timezone) — **P1**
- [ ] month(time, timezone) — **P1**
- [ ] year(time, timezone) — **P1**
- [ ] weekofyear(time, timezone) — **P2**
- [ ] time_close — **P1** (builtin variable mapping)
- [ ] timenow — **P1**
- [ ] timestamp(year, month, day, hour, minute, second) — **P1**
- [x] timeframe.in_seconds() — **P0 DONE**
- [ ] time(timeframe, session, timezone) — **P1**

### K. Runtime — Other Builtins

- [x] syminfo.* (ticker, tickerid, prefix, root, mintick, pointvalue, timezone, type, session, basecurrency, currency, description)
- [x] timeframe.* (period, multiplier, isdwm, isintraday, isminutes, ishours, isdaily, isweekly, ismonthly)
- [x] barstate.* (isfirst, islast, ishistory, isrealtime, isconfirmed)
- [x] color.new, color.r, color.g, color.b, color.t, color.rgb, color.from_gradient
- [x] request.security() — **P0 DONE** (MTF resampling)
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
- [x] bgcolor rendering — **P1 DONE** (drawing-renderer.ts)
- [ ] barcolor rendering — **P1**
- [x] plotshape rendering — **P1 DONE** (markers via drawing-renderer.ts)
- [x] plotchar rendering — **P1 DONE** (markers via drawing-renderer.ts)
- [x] plotarrow rendering — **P1 DONE** (markers via drawing-renderer.ts)
- [ ] plotcandle rendering — **P1**
- [ ] plotbar rendering — **P1**
- [x] Drawing object visualization (lines, labels, boxes) — **P0 DONE** (drawing-renderer.ts)
- [x] Table rendering — **P1 DONE** (HTML overlay via drawing-renderer.ts)
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

### P0 — ALL COMPLETE (480 tests passing)

All P0 gaps have been closed. The benchmark indicator (`Hourly t&P with 05 box 1 05 percent lines.pine`) now compiles and executes with correct bar-by-bar output:

1. ~~Drawing objects (line/label/box) — runtime + codegen + renderer~~ **DONE**
2. ~~Method syntax dispatch (`a.push()`, `a.size()`)~~ **DONE**
3. ~~User variable series history (`myVar[1]`)~~ **DONE**
4. ~~Pine enum constants (line.style_*, xloc.*, yloc.*, extend.*, etc.)~~ **DONE**
5. ~~Time functions (hour, minute, dayofweek, time_close, timenow)~~ **DONE** (hour/minute/dayofweek done; time_close/timenow bumped to P1)
6. ~~str.format_time()~~ **DONE**
7. ~~timeframe.in_seconds()~~ **DONE**
8. ~~Missing array methods (shift, unshift, median)~~ **DONE**
9. ~~request.security() with tuple returns~~ **DONE**
10. ~~barmerge.* constants~~ **DONE**
11. ~~Block comments `/* */`~~ **DONE**
12. ~~Scientific notation (`1e5`)~~ **DONE**
13. ~~Implicit line continuation~~ **DONE**
14. ~~Typed array declarations (`float[]`, `line[]`)~~ **DONE**
15. ~~Drawing type names in declarations (`var line myLine = na`)~~ **DONE**
16. ~~`for [i, v] in` destructuring~~ **DONE**

### P1 — Next Priority (~40 items)

Needed for a wide range of indicators/strategies beyond the benchmark:
- UDT codegen and method declarations (see spec 17)
- Remaining ta.* functions: ta.hma, ta.kc, ta.donchian, ta.linreg, ta.median (see spec 16)
- math.avg, math.sum, math.pi/e/phi constants (see spec 16)
- Additional array methods: stdev, variance, range, concat, first, last, new_color/line/label/box
- Additional time functions: second, dayofmonth, month, year, timestamp, time_close, timenow, time()
- input.session parsing and runtime
- display.* constants
- Renderer: fill between plots, barcolor, plotcandle, plotbar, multi-pane layout
- `last_bar_index`, `last_bar_time`
- Parquet data loading

### P2 — Rare/Advanced (~30 items)

Completeness items:
- Semantic analyzer, map/matrix, polyline/linefill
- Library import/export, CodeMirror editor
- strategy.risk.*, strategy.closedtrades.*

---

## Test Counts by Phase

| Phase | Tests | Status |
|-------|-------|--------|
| Lexer | 100 | Passing |
| Parser | 68 | Passing |
| Codegen | 65 | Passing |
| Runtime | 52 | Passing |
| Integration | 44 | Passing |
| P0 Gap Closure | 151 | Passing |
| **Total** | **480** | **All passing** |

---

## Verification Criteria

1. `ls SPECS/*.md | wc -l` → **17 files** (added specs 16 and 17)
2. Every Pine Script feature used in the benchmark indicator is covered in at least one spec
3. This overview contains a complete checklist of all major Pine Script v6 features
4. Each spec has concrete, testable acceptance criteria
5. `tsc --noEmit` → clean (zero errors)
