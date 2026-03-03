import { compile } from './compiler/index';
import { renderResults, clearChart } from './renderer/index';
import type { ExecutionResult } from './renderer/index';
import { createRuntime } from './runtime/index';
import { getSampleBars } from './data/sample-data';
import { loadFromFile } from './data/data-provider';
import { Bar } from './data/types';

const SAMPLE_SCRIPT = `//@version=6
indicator("SMA Example", overlay=true)
plot(ta.sma(close, 20), "SMA 20", color.blue, 2)
`;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentBars: Bar[] = getSampleBars();

// ---------------------------------------------------------------------------
// DOM refs (populated after DOMContentLoaded)
// ---------------------------------------------------------------------------
let editor: HTMLTextAreaElement;
let chartContainer: HTMLElement;
let compileBtn: HTMLButtonElement;
let fileInput: HTMLInputElement;
let diagnosticsPanel: HTMLElement;
let statusBar: HTMLElement;
let symbolLabel: HTMLElement;
let barCountLabel: HTMLElement;

// ---------------------------------------------------------------------------
// Runtime execution
// ---------------------------------------------------------------------------
function executeRuntime(code: string, bars: Bar[]): ExecutionResult {
  const result = createRuntime(code, bars);
  return {
    metadata: result.metadata ?? null,
    plots: result.plots,
    hlines: result.hlines,
    fills: result.fills,
    bgcolors: result.bgcolors,
    barcolors: result.barcolors,
  };
}

// ---------------------------------------------------------------------------
// Compile & render
// ---------------------------------------------------------------------------
function runCompile(): void {
  const source = editor.value;
  clearDiagnostics();
  setStatus('Compiling…', 'info');

  const result = compile(source);

  if (!result.success || result.code === null) {
    showDiagnostics(result.diagnostics.map(d =>
      `Line ${d.loc?.line ?? '?'}: ${d.message}`
    ));
    setStatus(`Compile failed — ${result.diagnostics.filter(d => d.severity === 'error').length} error(s)`, 'error');
    return;
  }

  if (result.diagnostics.length > 0) {
    showDiagnostics(result.diagnostics.map(d =>
      `[${d.severity}] Line ${d.loc?.line ?? '?'}: ${d.message}`
    ), 'warn');
  }

  setStatus('Running…', 'info');

  try {
    const execResult = executeRuntime(result.code, currentBars);
    renderResults(chartContainer, currentBars, execResult);
    const plotCount = execResult.plots.length;
    setStatus(
      `OK — ${plotCount} plot${plotCount !== 1 ? 's' : ''} rendered on ${currentBars.length} bars`,
      'success'
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    showDiagnostics([`Runtime error: ${msg}`]);
    setStatus('Runtime error', 'error');
  }
}

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------
async function handleFileUpload(file: File): Promise<void> {
  setStatus(`Loading ${file.name}…`, 'info');
  try {
    const bars = await loadFromFile(file);
    if (bars.length === 0) throw new Error('File contained no bars');
    currentBars = bars;
    updateSymbolInfo(file.name.replace(/\.[^.]+$/, ''), bars.length);
    renderResults(chartContainer, currentBars, {
      metadata: null, plots: [], hlines: [], fills: [], bgcolors: [], barcolors: [],
    });
    setStatus(`Loaded ${bars.length} bars from ${file.name}`, 'success');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    showDiagnostics([`File load error: ${msg}`]);
    setStatus('File load failed', 'error');
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function showDiagnostics(messages: string[], level: 'error' | 'warn' = 'error'): void {
  diagnosticsPanel.innerHTML = messages
    .map(m => `<div class="diag-item diag-${level}">${escapeHtml(m)}</div>`)
    .join('');
  diagnosticsPanel.style.display = 'block';
}

function clearDiagnostics(): void {
  diagnosticsPanel.innerHTML = '';
  diagnosticsPanel.style.display = 'none';
}

function setStatus(msg: string, level: 'info' | 'success' | 'error' | 'warn'): void {
  statusBar.textContent = msg;
  statusBar.className = `status-bar status-${level}`;
}

function updateSymbolInfo(symbol: string, count: number): void {
  symbolLabel.textContent = symbol;
  barCountLabel.textContent = `${count} bars`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot(): void {
  editor = document.getElementById('editor') as HTMLTextAreaElement;
  chartContainer = document.getElementById('chart-container') as HTMLElement;
  compileBtn = document.getElementById('compile-btn') as HTMLButtonElement;
  fileInput = document.getElementById('file-input') as HTMLInputElement;
  diagnosticsPanel = document.getElementById('diagnostics') as HTMLElement;
  statusBar = document.getElementById('status-bar') as HTMLElement;
  symbolLabel = document.getElementById('symbol-label') as HTMLElement;
  barCountLabel = document.getElementById('bar-count-label') as HTMLElement;

  // Pre-populate editor
  editor.value = SAMPLE_SCRIPT;

  // Initial chart render with sample data
  updateSymbolInfo('AAPL', currentBars.length);
  renderResults(chartContainer, currentBars, {
    metadata: null, plots: [], hlines: [], fills: [], bgcolors: [], barcolors: [],
  });
  setStatus('Ready — load data or compile a script', 'info');

  // Wire events
  compileBtn.addEventListener('click', runCompile);

  editor.addEventListener('keydown', (e: KeyboardEvent) => {
    // Cmd+Enter or Ctrl+Enter to compile
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runCompile();
    }
    // Tab key inserts 4 spaces instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + '    ' + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
    }
  });

  document.getElementById('upload-btn')?.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFileUpload(fileInput.files[0]);
      fileInput.value = '';
    }
  });

  // Drag & drop onto chart panel
  chartContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    chartContainer.classList.add('drag-over');
  });
  chartContainer.addEventListener('dragleave', () => {
    chartContainer.classList.remove('drag-over');
  });
  chartContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    chartContainer.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file) handleFileUpload(file);
  });
}

document.addEventListener('DOMContentLoaded', boot);
