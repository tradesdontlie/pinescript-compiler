# 01 — Lexer Gaps

> **Status**: PARTIAL
> **Priority**: Mixed (P1–P2)
> **File**: `src/compiler/lexer/lexer.ts`, `src/compiler/lexer/token.ts`

---

## What Exists

The lexer handles:
- Single-line comments (`// ...`)
- Annotations (`//@version=5`, `//@description`)
- String literals with escape sequences (single and double quotes)
- Integer and float literals (including leading-dot `.5`)
- Color literals `#RRGGBB` and `#RRGGBBAA`
- All Pine Script operators and delimiters
- All keywords and type keywords
- Indentation tracking (INDENT/DEDENT/NEWLINE)

---

## What's Missing

### 1. Block Comments `/* ... */` — P1

**Pine Script syntax:**
```pine
/* This is a
   multi-line block comment */
x = 1 /* inline block comment */ + 2
```

**Current behavior:** The lexer only recognizes `//` comments. A `/*` sequence would be tokenized as `SLASH` + `STAR`, causing parse errors.

**Benchmark usage:** The benchmark uses `//` comments only, but block comments are common in real-world scripts and the official Pine Script v6 spec supports them.

**Implementation:**
- In `scanToken()`, after checking for `//`, check for `/*`
- Consume everything until `*/` is found
- Handle nested `/* ... /* ... */ ... */` (Pine Script does NOT support nesting — first `*/` closes)
- Track newlines within block comments for correct line/column tracking
- Do not emit a token (same as single-line comments)

**Files to modify:**
- `src/compiler/lexer/lexer.ts` — add `scanBlockComment()` method

---

### 2. Scientific Notation — P1

**Pine Script syntax:**
```pine
x = 1e5        // 100000
y = 1.5e-3      // 0.0015
z = 2.0E+10     // 20000000000
```

**Current behavior:** The `scanNumber()` method stops at the decimal portion. `1e5` would tokenize as `INTEGER(1)` `IDENTIFIER(e5)`, causing parse errors.

**Implementation:**
- After scanning integer/decimal digits, check for `e` or `E`
- If found, consume optional `+` or `-` sign
- Consume trailing digits
- Mark as float type (scientific notation always produces a float in Pine)

**Files to modify:**
- `src/compiler/lexer/lexer.ts` — extend `scanNumber()`

---

### 3. Multi-line Strings — P2

**Pine Script syntax:**
```pine
x = "This is a
     multi-line string"
```

**Current behavior:** The lexer reports `Unterminated string literal` on newlines within strings.

**Pine v6 behavior:** Pine Script v5/v6 does NOT natively support multi-line strings. Strings must be on a single line. However, some users use line continuation with `\` (see item 4). This is P2 as it's not standard.

**Implementation:** No change needed for v6 parity. The current behavior (error on newline) is correct.

---

### 4. Line Continuation — P2

**Pine Script syntax:**
```pine
x = close + \
    open
```

**Current behavior:** Backslash at end of line is not recognized. The line would be split into two separate statements.

**Implementation:**
- In newline handling, check if the previous non-whitespace character was `\`
- If so, consume the newline and continue on the next line without emitting NEWLINE
- This is implicit line continuation (Pine Script also has implicit continuation after operators and commas)

**Note:** Pine Script has implicit continuation after `(`, `[`, `,`, and binary operators, which the parser may already handle via its expression parsing. The explicit `\` continuation is rarely used.

**Files to modify:**
- `src/compiler/lexer/lexer.ts` — modify newline handling

---

### 5. `input.session` Token Handling — P1

**Pine Script syntax:**
```pine
ses = input.session("0930-1600", "Session")
```

**Current behavior:** `input` is tokenized as `INPUT` (keyword), `.` as `DOT`, `session` would need to be a valid identifier. Since `input` is a type keyword, `input.session` should parse as a member access `INPUT.session`. The parser may reject this because `INPUT` is not treated as an expression.

**Implementation:**
- This is primarily a parser issue (see spec 02), but the lexer should ensure `session` is tokenized as `IDENTIFIER` (which it already is — it's not a keyword).
- The real fix is in the parser: allow type keywords to be used as namespace identifiers when followed by `.`

---

## Acceptance Criteria

1. **Block comments**: `/* comment */` is consumed without emitting tokens; `x = 1 /* inline */ + 2` produces tokens for `x = 1 + 2`
2. **Scientific notation**: `1e5` tokenizes as `FLOAT("1e5")`; `1.5e-3` tokenizes as `FLOAT("1.5e-3")`
3. **Existing tests**: All 100 lexer tests continue to pass
4. **New tests**: At least 5 new tests covering block comments and scientific notation
