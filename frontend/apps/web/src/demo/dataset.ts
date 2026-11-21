import type { DatasetSnapshot } from '@open-calculator/contracts';

export const DEMO_DATASET_SOURCE_ID = 'demo-sales';

const BASE_ROWS: Array<[string, number, number]> = [
  ['1 月', 128000, 86000],
  ['2 月', 132000, 88000],
  ['3 月', 141000, 92000],
  ['4 月', 138000, 91000],
  ['5 月', 152000, 98000],
  ['6 月', 165000, 104000],
  ['7 月', 158000, 101000],
  ['8 月', 171000, 108000],
  ['9 月', 180000, 112000],
  ['10 月', 176000, 110000],
  ['11 月', 192000, 118000],
  ['12 月', 210000, 128000],
];

/** 演示用数据集；手动刷新时按版本轻微变动，用来验证响应式更新链路。 */
export function createDemoDataset(version: number): DatasetSnapshot {
  const factor = 1 + Math.max(0, version - 1) * 0.03;
  const rows = BASE_ROWS.map(([month, revenue, cost]) => {
    const profit = Math.round((revenue - cost) * factor);
    return [month, String(revenue), String(cost), String(profit)];
  });

  return {
    sourceId: DEMO_DATASET_SOURCE_ID,
    version,
    schema: {
      fields: [
        { name: '月份', type: 'string' },
        { name: '收入', type: 'number' },
        { name: '成本', type: 'number' },
        { name: '利润', type: 'number' },
      ],
    },
    rows,
    importedAt: new Date().toISOString(),
    stale: false,
  };
}
