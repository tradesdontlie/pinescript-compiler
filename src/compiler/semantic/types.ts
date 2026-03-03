// Pine Script type system definitions

export type PineQualifier = 'const' | 'input' | 'simple' | 'series';

export type PineBaseType =
  | 'int'
  | 'float'
  | 'bool'
  | 'string'
  | 'color'
  | 'na'
  | 'void'
  | 'line'
  | 'label'
  | 'box'
  | 'table'
  | 'array'
  | 'map'
  | 'matrix'
  | 'udt'
  | 'unknown';

export interface PineType {
  qualifier: PineQualifier;
  base: PineBaseType;
  /** For array<T>, map<K,V>, series<T> */
  typeArgs?: PineType[];
  /** For UDT — the declared type name */
  udtName?: string;
  /** Whether this type can be NA */
  nullable: boolean;
}

// ── Qualifier ordering ──────────────────────────────────────────────────────
const QUALIFIER_ORDER: Record<PineQualifier, number> = {
  const: 0,
  input: 1,
  simple: 2,
  series: 3,
};

/** Return true if `q` can be used where `expected` is required. */
export function qualifierCompatible(q: PineQualifier, expected: PineQualifier): boolean {
  return QUALIFIER_ORDER[q] <= QUALIFIER_ORDER[expected];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function makePineType(
  base: PineBaseType,
  qualifier: PineQualifier = 'series',
  nullable = true,
  typeArgs?: PineType[],
): PineType {
  return { qualifier, base, nullable, typeArgs };
}

/** SERIES float (the most common inferred type) */
export const FLOAT_SERIES = makePineType('float', 'series');
/** SERIES int */
export const INT_SERIES = makePineType('int', 'series');
/** SERIES bool */
export const BOOL_SERIES = makePineType('bool', 'series');
/** SERIES string */
export const STRING_SERIES = makePineType('string', 'series');
/** SERIES color */
export const COLOR_SERIES = makePineType('color', 'series');
/** NA type */
export const NA_TYPE = makePineType('na', 'series');
/** void */
export const VOID_TYPE = makePineType('void', 'const', false);
/** unknown (for inference failure) */
export const UNKNOWN_TYPE = makePineType('unknown', 'series');

/** Base type compatibility — ignoring qualifiers */
export function baseTypesCompatible(a: PineBaseType, b: PineBaseType): boolean {
  if (a === 'unknown' || b === 'unknown') return true;
  if (a === 'na' || b === 'na') return true; // na is compatible with everything
  if (a === b) return true;
  // int <-> float widening
  if ((a === 'int' && b === 'float') || (a === 'float' && b === 'int')) return true;
  return false;
}

/** Full type compatibility check */
export function typesCompatible(actual: PineType, expected: PineType): boolean {
  if (!baseTypesCompatible(actual.base, expected.base)) return false;
  if (!qualifierCompatible(actual.qualifier, expected.qualifier)) return false;
  return true;
}

/** Widen two types to their common supertype (e.g. int + float -> float) */
export function widenTypes(a: PineType, b: PineType): PineType {
  const qual: PineQualifier =
    QUALIFIER_ORDER[a.qualifier] > QUALIFIER_ORDER[b.qualifier]
      ? a.qualifier
      : b.qualifier;

  let base: PineBaseType = a.base;
  if (a.base === 'na') base = b.base;
  else if (b.base === 'na') base = a.base;
  else if (a.base === 'int' && b.base === 'float') base = 'float';
  else if (a.base === 'float' && b.base === 'int') base = 'float';
  else if (a.base !== b.base) base = 'unknown';

  return { qualifier: qual, base, nullable: a.nullable || b.nullable };
}

export function typeToString(t: PineType): string {
  const q = t.qualifier !== 'series' ? `${t.qualifier} ` : '';
  const b = t.udtName ?? t.base;
  if (t.typeArgs && t.typeArgs.length > 0) {
    return `${q}${b}<${t.typeArgs.map(typeToString).join(', ')}>`;
  }
  return `${q}${b}`;
}

// ── Built-in function signature ──────────────────────────────────────────────
export interface BuiltinParam {
  name: string;
  type: PineType;
  optional?: boolean;
}

export interface BuiltinSignature {
  params: BuiltinParam[];
  returnType: PineType;
}

export interface BuiltinFunction {
  name: string;
  signatures: BuiltinSignature[];
}
