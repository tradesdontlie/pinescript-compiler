import { Bar } from './types';
import { loadJSON } from './json-loader';
import { loadCSV } from './csv-loader';
import { loadParquet } from './parquet-loader';

function getExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export async function loadFromFile(file: File): Promise<Bar[]> {
  const ext = getExtension(file.name);

  if (ext === 'parquet') {
    const buffer = await file.arrayBuffer();
    return loadParquet(buffer);
  }

  const text = await file.text();

  if (ext === 'csv') return loadCSV(text);
  if (ext === 'json') return loadJSON(text);

  // Fallback: sniff content
  const trimmed = text.trimStart();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return loadJSON(text);
  return loadCSV(text);
}

export async function loadFromURL(url: string): Promise<Bar[]> {
  const ext = getExtension(url.split('?')[0]);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);

  if (ext === 'parquet') {
    const buffer = await res.arrayBuffer();
    return loadParquet(buffer);
  }

  const text = await res.text();
  if (ext === 'csv') return loadCSV(text);
  return loadJSON(text);
}
