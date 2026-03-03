# 14 — Editor: CodeMirror Integration

> **Status**: NOT STARTED
> **Priority**: P2 (UI enhancement, not blocking compilation)
> **Files to create**: `src/editor/pine-language.ts`, `src/editor/editor.ts`

---

## What Exists

The current UI uses a basic `<textarea>` (or similar) for Pine Script input. There is no syntax highlighting, autocomplete, or inline error display.

---

## What's Missing

### 1. CodeMirror 6 Setup — P2

**What**: Replace the text input with a CodeMirror 6 editor instance.

**Dependencies:**
```json
{
    "@codemirror/state": "^6.x",
    "@codemirror/view": "^6.x",
    "@codemirror/language": "^6.x",
    "@codemirror/autocomplete": "^6.x",
    "@codemirror/lint": "^6.x",
    "@codemirror/commands": "^6.x",
    "@lezer/highlight": "^1.x"
}
```

**Implementation — `src/editor/editor.ts`:**
```typescript
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { pineScriptLanguage } from './pine-language';

export function createEditor(container: HTMLElement, initialCode: string): EditorView {
    const state = EditorState.create({
        doc: initialCode,
        extensions: [
            keymap.of(defaultKeymap),
            pineScriptLanguage(),
            // ... themes, line numbers, etc.
        ],
    });
    return new EditorView({ state, parent: container });
}
```

---

### 2. Pine Script Syntax Highlighting — P2

**What**: Define a Lezer grammar or CodeMirror stream parser for Pine Script syntax highlighting.

**Approach A: Stream parser (simpler)**
```typescript
import { StreamLanguage } from '@codemirror/language';

const pineScript = StreamLanguage.define({
    token(stream, state) {
        // Comments
        if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
        if (stream.match('/*')) { /* skip to */ return 'comment'; }

        // Strings
        if (stream.match(/"/) || stream.match(/'/)) { /* read string */ return 'string'; }

        // Numbers
        if (stream.match(/\d+\.?\d*/)) return 'number';

        // Color literals
        if (stream.match(/#[0-9a-fA-F]+/)) return 'color';

        // Keywords
        if (stream.match(/\b(var|varip|if|else|for|while|switch|return|break|continue|type|method|import|export)\b/))
            return 'keyword';

        // Type keywords
        if (stream.match(/\b(int|float|bool|string|color|series|simple|const|input)\b/))
            return 'typeName';

        // Built-in namespaces
        if (stream.match(/\b(ta|math|str|array|color|syminfo|timeframe|barstate|strategy|request|line|label|box|table)\b/))
            return 'namespace';

        // Built-in variables
        if (stream.match(/\b(open|high|low|close|volume|time|bar_index|hl2|hlc3|ohlc4|na|true|false)\b/))
            return 'variableName.special';

        // Identifiers
        if (stream.match(/[a-zA-Z_]\w*/)) return 'variableName';

        // Operators
        if (stream.match(/[+\-*\/%=!<>&|?:]/)) return 'operator';

        stream.next();
        return null;
    },
});
```

**Approach B: Lezer grammar (better, more work)**
- Write a formal Lezer grammar file for Pine Script
- Generates an incremental parser for fast highlighting
- Better for large files (3,454 lines in benchmark)

---

### 3. Autocomplete — P2

**What**: Provide autocomplete for Pine Script keywords, built-in functions, and namespaced members.

```typescript
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';

const pineCompletions = autocompletion({
    override: [(context: CompletionContext) => {
        // Namespace member completions (after '.')
        const before = context.matchBefore(/\w+\./);
        if (before) {
            const ns = before.text.replace('.', '');
            const members = NAMESPACE_MEMBERS[ns]; // lookup table
            if (members) {
                return {
                    from: before.from + ns.length + 1,
                    options: members.map(m => ({ label: m, type: 'function' })),
                };
            }
        }

        // Keyword/builtin completions
        const word = context.matchBefore(/\w+/);
        if (!word || word.from === word.to) return null;
        return {
            from: word.from,
            options: [
                ...KEYWORDS.map(k => ({ label: k, type: 'keyword' })),
                ...BUILTINS.map(b => ({ label: b, type: 'variable' })),
                ...NAMESPACES.map(n => ({ label: n, type: 'namespace' })),
            ],
        };
    }],
});
```

---

### 4. Error Gutters / Inline Diagnostics — P2

**What**: Display compiler errors/warnings inline in the editor.

```typescript
import { linter, Diagnostic } from '@codemirror/lint';

const pineLinter = linter((view) => {
    const code = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    try {
        // Run lexer + parser, collect errors
        const reporter = new DiagnosticReporter();
        const lexer = new Lexer(code, reporter);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, reporter);
        parser.parse();

        for (const error of reporter.getErrors()) {
            diagnostics.push({
                from: error.loc.offset,
                to: error.loc.offset + 1,
                severity: error.severity === 'error' ? 'error' : 'warning',
                message: error.message,
            });
        }
    } catch (e) {
        // Fallback for crash
    }

    return diagnostics;
});
```

---

### 5. Theme — P2

**What**: A dark theme matching TradingView's Pine Editor aesthetic.

```typescript
import { EditorView } from '@codemirror/view';

const pineTheme = EditorView.theme({
    '&': { backgroundColor: '#1e222d', color: '#d1d4dc' },
    '.cm-content': { fontFamily: 'monospace', fontSize: '13px' },
    '.cm-gutters': { backgroundColor: '#1e222d', borderRight: '1px solid #363a45' },
    '.cm-activeLineGutter': { backgroundColor: '#2a2e39' },
    '.cm-activeLine': { backgroundColor: '#2a2e39' },
    // Syntax colors
    '.cm-keyword': { color: '#569cd6' },
    '.cm-string': { color: '#ce9178' },
    '.cm-number': { color: '#b5cea8' },
    '.cm-comment': { color: '#6a9955' },
    '.cm-typeName': { color: '#4ec9b0' },
    '.cm-variableName.special': { color: '#9cdcfe' },
    '.cm-namespace': { color: '#dcdcaa' },
    '.cm-operator': { color: '#d4d4d4' },
    '.cm-color': { color: '#ce9178' },
});
```

---

## Integration

### Main App (src/main.ts)
Replace the textarea with the CodeMirror editor:
```typescript
import { createEditor } from './editor/editor';

const editor = createEditor(document.getElementById('editor')!, defaultCode);

// Get code for compilation:
const code = editor.state.doc.toString();
```

---

## Acceptance Criteria

1. CodeMirror editor renders and accepts Pine Script input
2. Keywords are highlighted in blue
3. Strings are highlighted in orange
4. Comments are highlighted in green
5. Numbers and color literals are highlighted
6. Typing `ta.` triggers autocomplete with available TA functions
7. Compiler errors appear as red underlines with hover tooltips
8. The editor handles 3,454+ line files without lag
9. Dark theme matches TradingView aesthetic
10. Editor state (cursor position, scroll) is preserved across compilations
