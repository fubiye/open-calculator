import type { ViewDefinition } from '@open-calculator/contracts';
import { DEMO_DATASET_SOURCE_ID } from '../demo/dataset';
import { DEMO_NUMBER_FORMATS } from '../demo/workbook';

export const DEFAULT_VIEW: ViewDefinition = {
  id: 'view-overview',
  name: '总览',
  layout: { type: 'grid', columns: 12 },
  blocks: [
    {
      id: 'block-workbook',
      type: 'spreadsheet',
      span: 8,
      title: '月供计算器',
      config: { numberFormats: DEMO_NUMBER_FORMATS },
    },
    {
      id: 'block-kpi-profit',
      type: 'kpi',
      span: 4,
      title: '年度利润',
      config: {
        sourceId: DEMO_DATASET_SOURCE_ID,
        field: '利润',
        aggregation: 'sum',
        label: '年度利润合计',
      },
    },
    {
      id: 'block-dataset',
      type: 'data-table',
      span: 8,
      title: '销售数据（演示数据集）',
      config: { sourceId: DEMO_DATASET_SOURCE_ID },
    },
    {
      id: 'block-note',
      type: 'note',
      span: 4,
      title: '说明',
      config: {
        text: '这是一个文件内的视图组合示例：\n\n· 工作簿块由 Univer 提供\n· 表格与指标块读取同一个数据集\n· 点击“刷新”只更新当前文件内的数据块\n\n数据源接入（本地 CSV/JSON）将在后端插件完成后启用。',
      },
    },
  ],
};
