import { Bar } from './types';

/**
 * Parquet loading requires the hyparquet library which is not yet installed.
 * Use JSON or CSV format for now.
 */
export async function loadParquet(_buffer: ArrayBuffer): Promise<Bar[]> {
  console.warn('Parquet loading requires hyparquet - use JSON or CSV');
  throw new Error(
    'Parquet loading is not yet implemented. Please convert your data to JSON or CSV format.\n' +
    'Tip: You can use pandas in Python: df.to_csv("data.csv", index=False)'
  );
}
