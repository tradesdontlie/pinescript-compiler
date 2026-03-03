# 01 — Lexer Gaps

> **Status**: P0 COMPLETE — All P0 items implemented and tested
> **Priority**: P1–P2 items remain
> **File**: `src/compiler/lexer/lexer.ts`, `src/compiler/lexer/token.ts`
> **Tests**: 100 passing (part of 480 total)

---

## What Exists

The lexer fully handles:
- Single-line comments (`// ...`)
- Block comments (`/* ... */`) — **P0 DONE**
- Annotations (`//@version=5`, `//@description`)
- String literals with escape sequences (single and double quotes)
- Integer and float literals (including leading-dot `.5`)
- Scientific notation (`1e5`, `1.5e-3`, `2.0E+10`) — **P0 DONE**
- Color literals `#RRGGBB` and `#RRGGBBAA`
- All Pine Script operators and delimiters
- All keywords and type keywords
- Indentation tracking (INDENT/DEDENT/NEWLINE)
- Implicit line continuation after operators, commas, and open brackets — **P0 DONE**

---

## Completed P0 Items

### 1. Block Comments `/* ... */` — DONE

**Implementation applied:**
- `scanToken()` checks for `/*` after checking for `//`
- `scanBlockComment()` consumes everything until the first `*/` (no nesting — Pine does not support nested block comments)
- Newlines within block comments are tracked for correct line/column reporting
- No token emitted (same as single-line comments)

**Tests added:** 5+ tests covering inline block comments, multi-line block comments, and block comment between tokens.

---

### 2. Scientific Notation — DONE

**Implementation applied:**
- `scanNumber()` checks for `e` or `E` after scanning integer/decimal digits
- Optional `+` or `-` sign is consumed after the exponent marker
- Trailing digits are consumed
- Result is always tokenized as `FLOAT` (scientific notation always produces a float in Pine)

**Tests added:** 5+ tests: `1e5`, `1.5e-3`, `2.0E+10`, edge cases.

---

### 3. Implicit Line Continuation — DONE

**Implementation applied:**
- After open parentheses `(`, open brackets `[`, commas `,`, and binary operators (`+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `and`, `or`, `?`, `:` in ternary context), NEWLINE tokens are suppressed
- The lexer tracks a "continuation pending" flag; any NEWLINE immediately following a continuation-eligible token is consumed without emitting NEWLINE
- INDENT/DEDENT tokens within continuation lines are suppressed until the expression terminates

**Tests added:** Tests for multi-line function calls, multi-line binary expressions, multi-line array literals.

---

## Remaining P1 Items

### 4. `input.session` Token Handling — P1

**Pine Script syntax:**
```pine
ses = input.session("0930-1600", "Session")
ses2 = input.session("0930-1600", "Session", group="Times")
```

**Benchmark usage:** 8 calls to `input.session`.

**Current behavior:** `input` is tokenized as `INPUT` keyword, `.` as `DOT`, `session` as `IDENTIFIER`. The lexer side is correct — `session` is already an identifier. The issue is in the **parser**: `INPUT` token is not handled as a primary expression (namespace).

**Fix needed:** This is a parser fix (see spec 02, item 4). The lexer does not need changes.

**Files to modify:** None in lexer.

---

### 5. `str.format_time` Alias — P1 (already done via function mapper)

`str.format_time` was mapped in the codegen function mapper as `__rt.str.formatTime`. The lexer correctly tokenizes all parts (`str`, `.`, `format_time`). No lexer changes needed.

---

## Remaining P2 Items

### 6. Multi-line Strings — P2

**Pine Script v6 behavior:** Pine Script v5/v6 does NOT natively support multi-line strings. Strings must be on a single line. The current lexer behavior (error on newline inside a string) is correct for v6 parity. No implementation needed.

---

### 7. Explicit Backslash Line Continuation — P2

**Pine Script syntax:**
```pine
x = close + \
    open
```

**Current behavior:** Implicit continuation (item 3 above) covers the vast majority of real-world scripts. The explicit `\` form is rare in practice.

**Implementation when needed:**
- In newline handling, check if the previous non-whitespace character was `\`
- If so, consume the newline without emitting NEWLINE, and strip the backslash from the token stream

**Files to modify:**
- `src/compiler/lexer/lexer.ts` — check for trailing backslash in newline handler

---

## Acceptance Criteria

1. **Block comments**: `/* comment */` consumed silently; `x = 1 /* inline */ + 2` produces tokens only for `x = 1 + 2`
2. **Scientific notation**: `1e5` tokenizes as `FLOAT("1e5")`; `1.5e-3` tokenizes as `FLOAT("1.5e-3")`
3. **Implicit continuation**: `f(a,\n  b)` parses as a single call; `x = a +\n    b` parses as one expression
4. **Existing tests**: All 100 lexer tests continue to pass
5. **tsc**: Zero type errors in `lexer.ts` and `token.ts`
