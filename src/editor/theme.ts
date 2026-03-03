/**
 * TradingView-style dark theme for the Pine Script CodeMirror editor.
 *
 * NOTE: This file imports from @codemirror/view which must be installed:
 *   npm install @codemirror/view @codemirror/state @codemirror/language
 *               @codemirror/autocomplete @codemirror/lint @codemirror/commands
 *               @lezer/highlight
 *
 * The exported objects are plain configuration objects so they can be
 * tested / inspected without a live CM6 environment.
 */

/** Raw CSS variable definitions used by the TradingView-style theme */
export const PINE_THEME_COLORS = {
  background: '#1e222d',
  foreground: '#d1d4dc',
  gutterBg: '#1e222d',
  gutterBorder: '#363a45',
  activeLine: '#2a2e39',
  selection: '#3d4157',
  cursor: '#d1d4dc',
  // Syntax
  keyword: '#569cd6',
  string: '#ce9178',
  number: '#b5cea8',
  comment: '#6a9955',
  typeName: '#4ec9b0',
  builtinVar: '#9cdcfe',
  namespace: '#dcdcaa',
  operator: '#d4d4d4',
  colorLiteral: '#ce9178',
  invalid: '#f44747',
} as const;

/**
 * Returns a CodeMirror 6 theme extension.
 * Lazily imports EditorView to avoid hard dependency at module-load time.
 */
export async function createPineTheme(): Promise<unknown> {
  try {
    const { EditorView } = await import('@codemirror/view' as never);
    const { HighlightStyle, syntaxHighlighting } = await import('@codemirror/language' as never);
    const { tags } = await import('@lezer/highlight' as never);

    const c = PINE_THEME_COLORS;

    const theme = (EditorView as any).theme({
      '&': {
        backgroundColor: c.background,
        color: c.foreground,
        height: '100%',
      },
      '.cm-content': {
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        caretColor: c.cursor,
      },
      '.cm-gutters': {
        backgroundColor: c.gutterBg,
        color: '#606478',
        border: 'none',
        borderRight: `1px solid ${c.gutterBorder}`,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px 0 8px',
        minWidth: '40px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: c.activeLine,
        color: c.foreground,
      },
      '.cm-activeLine': {
        backgroundColor: c.activeLine,
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: c.selection,
      },
      '.cm-cursor': {
        borderLeftColor: c.cursor,
      },
      '.cm-focused .cm-selectionBackground': {
        backgroundColor: c.selection,
      },
      // Completion popup
      '.cm-tooltip': {
        backgroundColor: '#252935',
        border: `1px solid ${c.gutterBorder}`,
        borderRadius: '4px',
      },
      '.cm-tooltip-autocomplete > ul': {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
      },
      '.cm-completionLabel': {
        color: c.foreground,
      },
      '.cm-completionDetail': {
        color: '#606478',
        fontStyle: 'italic',
      },
      // Lint / diagnostics
      '.cm-lintRange-error': {
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23f44747' fill='none' stroke-width='1.2'/></svg>")`,
      },
      '.cm-lintRange-warning': {
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23ffcc00' fill='none' stroke-width='1.2'/></svg>")`,
      },
      '.cm-diagnosticText': {
        color: c.foreground,
      },
    }, { dark: true });

    const highlightStyle = (HighlightStyle as any).define([
      { tag: (tags as any).keyword, color: c.keyword, fontWeight: 'bold' },
      { tag: (tags as any).typeName, color: c.typeName },
      { tag: (tags as any).string, color: c.string },
      { tag: [(tags as any).number, (tags as any).integer], color: c.number },
      { tag: (tags as any).comment, color: c.comment, fontStyle: 'italic' },
      { tag: (tags as any).variableName, color: c.foreground },
      { tag: (tags as any).special((tags as any).variableName), color: c.builtinVar },
      { tag: (tags as any).namespace, color: c.namespace },
      { tag: (tags as any).operator, color: c.operator },
      { tag: (tags as any).punctuation, color: c.foreground },
      { tag: (tags as any).definition((tags as any).variableName), color: c.foreground },
      { tag: (tags as any).invalid, color: c.invalid },
    ]);

    return [theme, (syntaxHighlighting as any)(highlightStyle)];
  } catch {
    // @codemirror packages not installed — return empty array
    return [];
  }
}

/**
 * Synchronous version for environments where @codemirror/view IS available
 * as a static import (use in the browser bundle after npm install).
 */
export function getPineThemeConfig(): Record<string, Record<string, string>> {
  const c = PINE_THEME_COLORS;
  return {
    '&': { backgroundColor: c.background, color: c.foreground },
    '.cm-content': { fontFamily: 'monospace', fontSize: '13px' },
    '.cm-gutters': { backgroundColor: c.gutterBg, borderRight: `1px solid ${c.gutterBorder}` },
    '.cm-activeLineGutter': { backgroundColor: c.activeLine },
    '.cm-activeLine': { backgroundColor: c.activeLine },
    '.cm-keyword': { color: c.keyword },
    '.cm-string': { color: c.string },
    '.cm-number': { color: c.number },
    '.cm-comment': { color: c.comment },
    '.cm-typeName': { color: c.typeName },
    '.cm-variableName\\.special': { color: c.builtinVar },
    '.cm-namespace': { color: c.namespace },
    '.cm-operator': { color: c.operator },
  };
}
