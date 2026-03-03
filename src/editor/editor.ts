/**
 * Pine Script CodeMirror 6 editor setup.
 *
 * Usage:
 *   const editor = await createEditor(container, initialCode, { onChange });
 *   const code = editor.getCode();
 *
 * NOTE: Requires the following npm packages:
 *   @codemirror/state, @codemirror/view, @codemirror/language,
 *   @codemirror/autocomplete, @codemirror/lint, @codemirror/commands
 *
 * The module gracefully degrades to a plain <textarea> if CM6 is not installed.
 */

import { createPineLanguage } from './pine-language';
import { createPineTheme } from './theme';
import type { Diagnostic as PineDiagnostic } from '../compiler/diagnostics/diagnostic';

export interface EditorOptions {
  /** Called whenever the document content changes */
  onChange?: (code: string) => void;
  /** Initial read-only state */
  readOnly?: boolean;
  /** Line number display */
  lineNumbers?: boolean;
}

export interface PineEditor {
  /** Get the current document text */
  getCode(): string;
  /** Replace the entire document */
  setCode(code: string): void;
  /** Update lint diagnostics shown in the gutter */
  setDiagnostics(diagnostics: PineDiagnostic[]): void;
  /** Destroy the editor and clean up */
  destroy(): void;
  /** The underlying CM6 EditorView, or null if CM6 is unavailable */
  view: unknown | null;
}

/**
 * Create a Pine Script editor in `container`.
 * Falls back to a plain <textarea> when @codemirror packages are not installed.
 */
export async function createEditor(
  container: HTMLElement,
  initialCode = '',
  options: EditorOptions = {},
): Promise<PineEditor> {
  try {
    return await createCM6Editor(container, initialCode, options);
  } catch {
    return createFallbackEditor(container, initialCode, options);
  }
}

// ── CM6 editor ───────────────────────────────────────────────────────────────

async function createCM6Editor(
  container: HTMLElement,
  initialCode: string,
  options: EditorOptions,
): Promise<PineEditor> {
  const [
    { EditorState },
    { EditorView, lineNumbers, highlightActiveLine, keymap: keymapFn, drawSelection },
    { defaultKeymap, indentWithTab },
    { linter, lintGutter },
    language,
    theme,
  ] = await Promise.all([
    import('@codemirror/state' as never),
    import('@codemirror/view' as never),
    import('@codemirror/commands' as never),
    import('@codemirror/lint' as never),
    createPineLanguage(),
    createPineTheme(),
  ]) as [any, any, any, any, any, any];

  // Lint source that reads diagnostics from external store
  let currentDiagnostics: ReturnType<typeof convertDiagnostics> = [];
  const pineLintSource = () => currentDiagnostics;

  const extensions: unknown[] = [
    ...(Array.isArray(theme) ? theme : [theme]),
    ...(Array.isArray(language) ? language : [language]),
    keymapFn.of([...defaultKeymap, indentWithTab]),
    drawSelection(),
    highlightActiveLine(),
    linter(pineLintSource, { delay: 0 }),
    lintGutter(),
  ];

  if (options.lineNumbers !== false) {
    extensions.push(lineNumbers());
  }
  if (options.readOnly) {
    extensions.push(EditorState.readOnly.of(true));
  }
  if (options.onChange) {
    const cb = options.onChange;
    extensions.push(
      EditorView.updateListener.of(update => {
        if (update.docChanged) cb(update.state.doc.toString());
      }),
    );
  }

  const state = EditorState.create({ doc: initialCode, extensions });
  const view = new EditorView({ state, parent: container });

  return {
    getCode: () => view.state.doc.toString(),
    setCode: (code: string) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: code },
      });
    },
    setDiagnostics: (diagnostics: PineDiagnostic[]) => {
      currentDiagnostics = convertDiagnostics(diagnostics, view.state.doc);
      // Force re-run of the linter
      view.dispatch({});
    },
    destroy: () => view.destroy(),
    view,
  };
}

/** Convert Pine diagnostics → CM6 Diagnostic objects */
function convertDiagnostics(
  diagnostics: PineDiagnostic[],
  doc: unknown,
): unknown[] {
  const d = doc as { length: number };
  return diagnostics.map(diag => {
    const from = Math.min(diag.loc.offset, d.length);
    const to = diag.endLoc
      ? Math.min(diag.endLoc.offset, d.length)
      : Math.min(from + 1, d.length);
    return {
      from,
      to,
      severity: diag.severity === 'info' ? 'info' : diag.severity,
      message: diag.message,
    };
  });
}

// ── Fallback textarea editor ─────────────────────────────────────────────────

function createFallbackEditor(
  container: HTMLElement,
  initialCode: string,
  options: EditorOptions,
): PineEditor {
  const textarea = document.createElement('textarea');
  textarea.value = initialCode;
  textarea.style.cssText = [
    'width:100%', 'height:100%', 'box-sizing:border-box',
    'background:#1e222d', 'color:#d1d4dc',
    'font-family:monospace', 'font-size:13px',
    'border:1px solid #363a45', 'padding:8px',
    'resize:none', 'outline:none',
  ].join(';');

  if (options.readOnly) textarea.readOnly = true;

  if (options.onChange) {
    const cb = options.onChange;
    textarea.addEventListener('input', () => cb(textarea.value));
  }

  container.appendChild(textarea);

  return {
    getCode: () => textarea.value,
    setCode: (code: string) => { textarea.value = code; },
    setDiagnostics: (_diagnostics: PineDiagnostic[]) => {
      // Cannot show inline diagnostics in a plain textarea
    },
    destroy: () => container.removeChild(textarea),
    view: null,
  };
}

// ── Editor state serialization ───────────────────────────────────────────────

/**
 * Save editor scroll / cursor state to sessionStorage.
 * Useful to preserve position across compilations.
 */
export function saveEditorState(key: string, view: unknown): void {
  if (!view) return;
  try {
    const v = view as { state: { selection: { main: { anchor: number; head: number } } }; scrollDOM: { scrollTop: number } };
    const state = {
      anchor: v.state.selection.main.anchor,
      head: v.state.selection.main.head,
      scrollTop: v.scrollDOM.scrollTop,
    };
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function restoreEditorState(key: string, view: unknown): void {
  if (!view) return;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    const state = JSON.parse(raw) as { anchor: number; head: number; scrollTop: number };
    const v = view as {
      dispatch: (t: unknown) => void;
      scrollDOM: { scrollTop: number };
      state: { selection: unknown };
    };
    const { EditorSelection } = require('@codemirror/state');
    v.dispatch({
      selection: EditorSelection.create([
        EditorSelection.range(state.anchor, state.head),
      ]),
    });
    v.scrollDOM.scrollTop = state.scrollTop;
  } catch {
    // ignore
  }
}
