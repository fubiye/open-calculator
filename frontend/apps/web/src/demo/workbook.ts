import {
  LocaleType,
  type IWorkbookData,
  type IStyleData,
  type NumberFormatRule,
} from '@open-calculator/workbook-univer';

/** 后端与前端约定的演示工作簿 id。 */
export const DEMO_WORKBOOK_ID = 'demo';
export const LOAN_SHEET_NAME = '月供计算器';
export const FORMULA_SHEET_NAME = '公式示例';

const LOAN_SHEET_ID = 'sheet-loan';
const FORMULA_SHEET_ID = 'sheet-formula';

const STYLES = {
  loanTitle: { fs: 20, bl: 1, cl: { rgb: '#0f172a' } },
  formulaTitle: { fs: 20, bl: 1, cl: { rgb: '#0f172a' } },
  subtitle: { fs: 11, cl: { rgb: '#64748b' } },
  section: { fs: 12, bl: 1, cl: { rgb: '#0f172a' } },
  header: { fs: 11, bl: 1, cl: { rgb: '#334155' }, bg: { rgb: '#e2e8f0' }, ht: 2, vt: 2 },
  label: { fs: 11, cl: { rgb: '#334155' }, vt: 2 },
  input: { fs: 12, bl: 1, cl: { rgb: '#1e3a8a' }, bg: { rgb: '#fef9c3' }, ht: 3, vt: 2 },
  result: { fs: 13, bl: 1, cl: { rgb: '#0e7490' }, bg: { rgb: '#ecfeff' }, ht: 3, vt: 2 },
  muted: { fs: 10, cl: { rgb: '#94a3b8' }, vt: 2 },
  tip: { fs: 11, cl: { rgb: '#475569' }, bg: { rgb: '#f8fafc' }, vt: 2 },
} satisfies Record<string, IStyleData>;

const STYLE_ID: Record<keyof typeof STYLES, string> = {
  loanTitle: 'loan-title',
  formulaTitle: 'formula-title',
  subtitle: 'subtitle',
  section: 'section',
  header: 'header',
  label: 'label',
  input: 'input',
  result: 'result',
  muted: 'muted',
  tip: 'tip',
};

function styles(): IWorkbookData['styles'] {
  return Object.fromEntries(
    (Object.keys(STYLES) as Array<keyof typeof STYLES>).map((key) => [STYLE_ID[key], STYLES[key]]),
  );
}

function loanSheet(): IWorkbookData['sheets'][string] {
  return {
    id: LOAN_SHEET_ID,
    name: LOAN_SHEET_NAME,
    rowCount: 200,
    columnCount: 20,
    defaultRowHeight: 24,
    defaultColumnWidth: 96,
    columnData: {
      0: { w: 140 },
      1: { w: 150 },
      2: { w: 360 },
    },
    rowData: {
      0: { h: 34 },
      2: { h: 26 },
      8: { h: 28 },
    },
    cellData: {
      // 标题
      0: {
        0: { v: 'Open Calculator', s: STYLE_ID.loanTitle },
        2: { v: '开源 · 可扩展 · AI 原生的计算器', s: STYLE_ID.subtitle },
      },
      1: {
        0: { v: '在任意单元格输入以 = 开头的公式，或者直接修改黄色输入格。', s: STYLE_ID.muted },
      },
      // 输入参数
      3: {
        0: { v: '输入参数', s: STYLE_ID.section },
        1: { v: '值', s: STYLE_ID.header },
        2: { v: '说明', s: STYLE_ID.header },
      },
      4: {
        0: { v: '本金（元）', s: STYLE_ID.label },
        1: { v: 100000, s: STYLE_ID.input },
        2: { v: '贷款本金', s: STYLE_ID.muted },
      },
      5: {
        0: { v: '年利率', s: STYLE_ID.label },
        1: { v: 0.035, s: STYLE_ID.input },
        2: { v: '例如 0.035 表示 3.5%', s: STYLE_ID.muted },
      },
      6: {
        0: { v: '期限（月）', s: STYLE_ID.label },
        1: { v: 360, s: STYLE_ID.input },
        2: { v: '360 个月 = 30 年', s: STYLE_ID.muted },
      },
      // 计算结果
      8: {
        0: { v: '计算结果', s: STYLE_ID.section },
        1: { v: '公式自动重算', s: STYLE_ID.muted },
      },
      9: {
        0: { v: '月供（元）', s: STYLE_ID.label },
        1: { f: '=-PMT(B6/12,B7,B5)', s: STYLE_ID.result },
        2: { v: '等额本息月供', s: STYLE_ID.muted },
      },
      10: {
        0: { v: '总利息（元）', s: STYLE_ID.label },
        1: { f: '=B10*B7-B5', s: STYLE_ID.result },
        2: { v: '月供 × 期数 − 本金', s: STYLE_ID.muted },
      },
      // 使用提示
      12: {
        0: { v: '试试这些操作', s: STYLE_ID.section },
      },
      13: {
        0: { v: '把年利率改成 0.042，月供与总利息会即时重算。', s: STYLE_ID.tip },
      },
      14: {
        0: { v: '选中 B10，在公式栏里可以看到 =-PMT(...) 的完整公式。', s: STYLE_ID.tip },
      },
      15: {
        0: {
          v: '右键工作表标签可以新增/重命名工作表，数据会自动保存到本地后端。',
          s: STYLE_ID.tip,
        },
      },
    },
  };
}

function formulaSheet(): IWorkbookData['sheets'][string] {
  return {
    id: FORMULA_SHEET_ID,
    name: FORMULA_SHEET_NAME,
    rowCount: 200,
    columnCount: 20,
    defaultRowHeight: 24,
    defaultColumnWidth: 110,
    columnData: {
      0: { w: 160 },
    },
    rowData: {
      0: { h: 34 },
      2: { h: 26 },
    },
    cellData: {
      0: {
        0: { v: '公式示例', s: STYLE_ID.formulaTitle },
        2: { v: 'SUM / AVERAGE / 相对引用', s: STYLE_ID.subtitle },
      },
      2: {
        0: { v: '项目', s: STYLE_ID.header },
        1: { v: '1 月', s: STYLE_ID.header },
        2: { v: '2 月', s: STYLE_ID.header },
        3: { v: '3 月', s: STYLE_ID.header },
        4: { v: '合计', s: STYLE_ID.header },
      },
      3: {
        0: { v: '收入', s: STYLE_ID.label },
        1: { v: 12000 },
        2: { v: 13500 },
        3: { v: 15000 },
        4: { f: '=SUM(B4:D4)', s: STYLE_ID.result },
      },
      4: {
        0: { v: '成本', s: STYLE_ID.label },
        1: { v: 8000 },
        2: { v: 8200 },
        3: { v: 9100 },
        4: { f: '=SUM(B5:D5)', s: STYLE_ID.result },
      },
      5: {
        0: { v: '利润', s: STYLE_ID.label },
        1: { f: '=B4-B5' },
        2: { f: '=C4-C5' },
        3: { f: '=D4-D5' },
        4: { f: '=SUM(B6:D6)', s: STYLE_ID.result },
      },
      7: {
        0: { v: '平均月度利润', s: STYLE_ID.label },
        1: { f: '=AVERAGE(B6:D6)', s: STYLE_ID.result },
      },
      9: {
        0: { v: '公式使用 = 开头，支持 Excel 常用函数与单元格引用。', s: STYLE_ID.tip },
      },
    },
  };
}

/** 首次启动（后端没有数据）时展示的演示工作簿。 */
export function createDemoWorkbook(): IWorkbookData {
  return {
    id: DEMO_WORKBOOK_ID,
    name: '演示工作簿',
    appVersion: '0.1.0',
    locale: LocaleType.ZH_CN,
    styles: styles(),
    sheetOrder: [LOAN_SHEET_ID, FORMULA_SHEET_ID],
    sheets: {
      [LOAN_SHEET_ID]: loanSheet(),
      [FORMULA_SHEET_ID]: formulaSheet(),
    },
  };
}

/** 演示工作簿的数字格式规则；由 workbook-univer 在装载后应用。 */
export const DEMO_NUMBER_FORMATS: NumberFormatRule[] = [
  { sheet: LOAN_SHEET_NAME, range: 'B5', pattern: '#,##0.00' },
  { sheet: LOAN_SHEET_NAME, range: 'B6', pattern: '0.00%' },
  { sheet: LOAN_SHEET_NAME, range: 'B10', pattern: '#,##0.00' },
  { sheet: LOAN_SHEET_NAME, range: 'B11', pattern: '#,##0.00' },
  { sheet: FORMULA_SHEET_NAME, range: 'B4:D6', pattern: '#,##0.00' },
  { sheet: FORMULA_SHEET_NAME, range: 'E4:E6', pattern: '#,##0.00' },
  { sheet: FORMULA_SHEET_NAME, range: 'B8', pattern: '#,##0.00' },
];
