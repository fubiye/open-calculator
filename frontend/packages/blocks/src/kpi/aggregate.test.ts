import { describe, expect, it } from 'vitest';
import type { DatasetSnapshot } from '@open-calculator/contracts';
import { aggregate, resolveFieldIndex } from './aggregate';

const snapshot: DatasetSnapshot = {
  sourceId: 'demo',
  version: 1,
  schema: {
    fields: [
      { name: '月份', type: 'string' },
      { name: '金额', type: 'number' },
    ],
  },
  rows: [
    ['1 月', '100'],
    ['2 月', '200'],
    ['3 月', '300'],
  ],
  importedAt: '2026-11-21T00:00:00.000Z',
  stale: false,
};

describe('aggregate', () => {
  it('resolves a field index', () => {
    expect(resolveFieldIndex(snapshot, '金额')).toBe(1);
    expect(resolveFieldIndex(snapshot, '不存在')).toBe(-1);
  });

  it('sums numbers', () => {
    expect(aggregate(snapshot, '金额', 'sum')).toBe(600);
  });

  it('averages numbers', () => {
    expect(aggregate(snapshot, '金额', 'avg')).toBe(200);
  });

  it('counts rows', () => {
    expect(aggregate(snapshot, '金额', 'count')).toBe(3);
  });

  it('returns null for unknown fields', () => {
    expect(aggregate(snapshot, '不存在', 'sum')).toBeNull();
  });
});
