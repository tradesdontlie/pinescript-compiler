# 15 — Parquet Data Loading

> **Status**: PARTIAL (file exists but may not be fully functional)
> **Priority**: P1 (needed for user's NQ data)
> **File**: `src/data/parquet-loader.ts`

---

## What Exists

- `src/data/parquet-loader.ts` exists
- `src/data/json-loader.ts` — functional JSON data loading
- `src/data/csv-loader.ts` — functional CSV data loading
- `src/data/sample-data.ts` — built-in sample data
- `src/data/data-provider.ts` — data provider abstraction
- `src/data/types.ts` — Bar interface

---

## What's Missing / Needs Verification

### 1. Parquet Library Integration — P1

**What**: Load Apache Parquet files containing OHLCV data for the user's NQ (Nasdaq futures) dataset.

**Dependencies:**
```json
{
    "parquet-wasm": "^0.x"  // or "hyparquet" for pure JS
}
```

**Options:**
| Library | Size | WASM | Browser | Notes |
|---------|------|------|---------|-------|
| `parquet-wasm` | ~2MB | Yes | Yes | Full Parquet support, fast |
| `hyparquet` | ~50KB | No | Yes | Pure JS, lighter, may be slower |
| `parquetjs` | ~300KB | No | Node only | Not suitable for browser |

**Recommendation:** `hyparquet` for browser-first approach (no WASM complexity).

**Implementation — `src/data/parquet-loader.ts`:**
```typescript
import { parquetRead } from 'hyparquet';
import { Bar } from './types';

export async function loadParquet(file: File): Promise<Bar[]> {
    const arrayBuffer = await file.arrayBuffer();
    const bars: Bar[] = [];

    await parquetRead({
        file: arrayBuffer,
        onComplete: (data: Record<string, any>[]) => {
            for (const row of data) {
                bars.push({
                    time: resolveTime(row),
                    open: Number(row.open ?? row.Open ?? row.o),
                    high: Number(row.high ?? row.High ?? row.h),
                    low: Number(row.low ?? row.Low ?? row.l),
                    close: Number(row.close ?? row.Close ?? row.c),
                    volume: Number(row.volume ?? row.Volume ?? row.v ?? 0),
                });
            }
        },
    });

    return bars.sort((a, b) => a.time - b.time);
}

function resolveTime(row: Record<string, any>): number {
    // Handle various timestamp column names
    const timeVal = row.time ?? row.Time ?? row.timestamp ?? row.Timestamp ?? row.date ?? row.Date ?? row.datetime;

    if (typeof timeVal === 'number') {
        // If in seconds (Unix timestamp), convert to ms
        return timeVal < 1e12 ? timeVal * 1000 : timeVal;
    }
    if (typeof timeVal === 'string') {
        return new Date(timeVal).getTime();
    }
    if (timeVal instanceof Date) {
        return timeVal.getTime();
    }
    return 0;
}
```

---

### 2. File Upload UI — P1

**What**: Allow users to drag-and-drop or select a Parquet file.

```typescript
// In src/main.ts or a UI component:
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.parquet,.parq';
fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        const bars = await loadParquet(file);
        // Re-run the engine with new bars
        recompileWith(bars);
    }
});
```

---

### 3. Column Mapping Configuration — P2

**What**: Allow users to specify which columns map to OHLCV if the column names don't match conventions.

Common column naming conventions:
| Standard | Variant 1 | Variant 2 | Variant 3 |
|----------|-----------|-----------|-----------|
| `open` | `Open` | `o` | `OPEN` |
| `high` | `High` | `h` | `HIGH` |
| `low` | `Low` | `l` | `LOW` |
| `close` | `Close` | `c` | `CLOSE` |
| `volume` | `Volume` | `v` | `VOL` |
| `time` | `Time` | `timestamp` | `date` |

The loader should try all variants automatically and fall back to column index if no names match.

---

### 4. Large File Handling — P2

**What**: Handle large Parquet files (potentially millions of rows for tick data) without freezing the UI.

**Implementation:**
- Use Web Workers for parsing
- Stream data in chunks if possible
- Show a progress indicator during loading
- Limit to a configurable number of bars (e.g., 50,000) for performance

```typescript
// Worker approach:
const worker = new Worker('parquet-worker.js');
worker.postMessage({ file: arrayBuffer });
worker.onmessage = (e) => {
    const bars: Bar[] = e.data.bars;
    // Use bars
};
```

---

### 5. Data Validation — P1

**What**: Validate loaded data quality before passing to the engine.

```typescript
function validateBars(bars: Bar[]): { valid: Bar[]; warnings: string[] } {
    const warnings: string[] = [];
    const valid: Bar[] = [];

    for (const bar of bars) {
        // Check for NaN/null values
        if (isNaN(bar.time) || bar.time === 0) {
            warnings.push(`Bar with invalid time skipped`);
            continue;
        }
        if (isNaN(bar.open) || isNaN(bar.high) || isNaN(bar.low) || isNaN(bar.close)) {
            warnings.push(`Bar at ${new Date(bar.time).toISOString()} has NaN OHLC values`);
            continue;
        }
        // Check OHLC consistency
        if (bar.high < bar.low) {
            warnings.push(`Bar at ${new Date(bar.time).toISOString()}: high < low`);
        }
        valid.push(bar);
    }

    return { valid, warnings };
}
```

---

## Integration with Data Provider

Update `src/data/data-provider.ts` to support Parquet as a data source:

```typescript
export type DataSource = 'sample' | 'json' | 'csv' | 'parquet';

export async function loadData(source: DataSource, input?: File | string): Promise<Bar[]> {
    switch (source) {
        case 'sample': return getSampleData();
        case 'json': return loadJson(input as string);
        case 'csv': return loadCsv(input as string);
        case 'parquet': return loadParquet(input as File);
    }
}
```

---

## Acceptance Criteria

1. A Parquet file with OHLCV columns loads correctly into Bar[] format
2. Column name detection works for common naming conventions (Open/open/o/OPEN)
3. Timestamps are correctly parsed (Unix seconds, Unix ms, ISO strings)
4. Data is sorted by time ascending
5. Invalid rows are skipped with warnings
6. File upload UI works (drag-and-drop or file picker)
7. The loaded data renders correctly as candlesticks
8. The loaded data works as input for Pine Script compilation
9. Files up to 100MB load without crashing (may take time)
10. At least 5 tests covering various Parquet column layouts and timestamp formats
