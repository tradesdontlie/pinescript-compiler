import { SourceLocation } from '../lexer/token';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  loc: SourceLocation;
  endLoc?: SourceLocation;
}

export class DiagnosticReporter {
  private diagnostics: Diagnostic[] = [];

  error(message: string, loc: SourceLocation, endLoc?: SourceLocation): void {
    this.diagnostics.push({ severity: 'error', message, loc, endLoc });
  }

  warning(message: string, loc: SourceLocation, endLoc?: SourceLocation): void {
    this.diagnostics.push({ severity: 'warning', message, loc, endLoc });
  }

  info(message: string, loc: SourceLocation, endLoc?: SourceLocation): void {
    this.diagnostics.push({ severity: 'info', message, loc, endLoc });
  }

  hasErrors(): boolean {
    return this.diagnostics.some(d => d.severity === 'error');
  }

  getAll(): Diagnostic[] {
    return [...this.diagnostics];
  }

  getErrors(): Diagnostic[] {
    return this.diagnostics.filter(d => d.severity === 'error');
  }

  clear(): void {
    this.diagnostics = [];
  }
}
