import type { DatasetSnapshot } from '@open-calculator/contracts';

export type Aggregation = 'sum' | 'avg' | 'count';

export function resolveFieldIndex(snapshot: DatasetSnapshot, field: string): number {
  return snapshot.schema.fields.findIndex((item) => item.name === field);
}

export function aggregate(
  snapshot: DatasetSnapshot,
  field: string,
  aggregation: Aggregation,
): number | null {
  const index = resolveFieldIndex(snapshot, field);
  if (index < 0) {
    return null;
  }
  if (aggregation === 'count') {
    return snapshot.rows.length;
  }

  const numbers = snapshot.rows
    .map((row) => Number.parseFloat(row[index] ?? ''))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) {
    return null;
  }
  const sum = numbers.reduce((total, value) => total + value, 0);
  return aggregation === 'avg' ? sum / numbers.length : sum;
}
