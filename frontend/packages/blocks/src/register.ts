import type { ComponentType } from 'react';
import type { ExtensionManifest } from '@open-calculator/contracts';
import type {
  BlockContribution,
  BlockProps,
  Extension,
  ExtensionRegistry,
} from '@open-calculator/extensions';

function blockComponent(component: ComponentType<never>): ComponentType<BlockProps> {
  return component as unknown as ComponentType<BlockProps>;
}

function blockExtension(
  manifest: Omit<ExtensionManifest, 'kind'>,
  block: BlockContribution,
): Extension {
  return { manifest: { ...manifest, kind: 'block' }, block } as Extension;
}

/** 注册内置块；内置块与第三方块走完全相同的扩展 API。 */
export function registerBuiltinBlocks(registry: ExtensionRegistry): void {
  registry.register(
    blockExtension(
      { id: 'builtin.block.spreadsheet', version: '0.1.0', apiVersion: '1.0.0' },
      {
        type: 'spreadsheet',
        title: '工作簿',
        defaultConfig: {},
        loader: async () => {
          const { SpreadsheetBlock } = await import('./spreadsheet/SpreadsheetBlock');
          return { type: 'spreadsheet', title: '工作簿', component: blockComponent(SpreadsheetBlock) };
        },
      },
    ),
  );

  registry.register(
    blockExtension(
      { id: 'builtin.block.data-table', version: '0.1.0', apiVersion: '1.0.0' },
      {
        type: 'data-table',
        title: '数据表格',
        defaultConfig: { sourceId: 'demo-sales' },
        loader: async () => {
          const { DataTableBlock } = await import('./data-table/DataTableBlock');
          return { type: 'data-table', title: '数据表格', component: blockComponent(DataTableBlock) };
        },
      },
    ),
  );

  registry.register(
    blockExtension(
      { id: 'builtin.block.kpi', version: '0.1.0', apiVersion: '1.0.0' },
      {
        type: 'kpi',
        title: '指标卡',
        defaultConfig: { sourceId: 'demo-sales', field: '金额', aggregation: 'sum' },
        loader: async () => {
          const { KpiBlock } = await import('./kpi/KpiBlock');
          return { type: 'kpi', title: '指标卡', component: blockComponent(KpiBlock) };
        },
      },
    ),
  );

  registry.register(
    blockExtension(
      { id: 'builtin.block.note', version: '0.1.0', apiVersion: '1.0.0' },
      {
        type: 'note',
        title: '说明',
        defaultConfig: { text: '' },
        loader: async () => {
          const { NoteBlock } = await import('./note/NoteBlock');
          return { type: 'note', title: '说明', component: blockComponent(NoteBlock) };
        },
      },
    ),
  );
}
