import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { CodeGenerator } from './codegen/generator';
import { DiagnosticReporter, Diagnostic } from './diagnostics/diagnostic';
import { Program } from './ast/nodes';

export interface CompileResult {
  success: boolean;
  code: string | null;
  ast: Program | null;
  diagnostics: Diagnostic[];
  metadata: ScriptMetadata | null;
}

export interface ScriptMetadata {
  type: 'indicator' | 'strategy' | 'library';
  title: string;
  shorttitle: string;
  overlay: boolean;
  inputs: InputDef[];
  plots: PlotDef[];
}

export interface InputDef {
  id: string;
  title: string;
  type: string;
  defaultValue: unknown;
}

export interface PlotDef {
  index: number;
  title: string;
  color: string;
  linewidth: number;
  style: string;
}

export function compile(source: string): CompileResult {
  const reporter = new DiagnosticReporter();

  try {
    const lexer = new Lexer(source, reporter);
    const tokens = lexer.tokenize();

    if (reporter.hasErrors()) {
      return { success: false, code: null, ast: null, diagnostics: reporter.getAll(), metadata: null };
    }

    const parser = new Parser(tokens, reporter);
    const ast = parser.parse();

    if (reporter.hasErrors()) {
      return { success: false, code: null, ast, diagnostics: reporter.getAll(), metadata: null };
    }

    const generator = new CodeGenerator(reporter);
    const { code, metadata } = generator.generate(ast);

    return {
      success: !reporter.hasErrors(),
      code,
      ast,
      diagnostics: reporter.getAll(),
      metadata,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    reporter.error(`Internal compiler error: ${msg}`, { line: 0, column: 0, offset: 0 });
    return { success: false, code: null, ast: null, diagnostics: reporter.getAll(), metadata: null };
  }
}
