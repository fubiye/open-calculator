import { useCallback, useState, useSyncExternalStore } from 'react';
import type { FileContext } from '@open-calculator/contracts';
import { useExtensionRegistry } from '@open-calculator/extensions';
import { DEMO_DATASET_SOURCE_ID } from '../demo/dataset';

export function Sidebar({ file }: { file: FileContext }) {
  const registry = useExtensionRegistry();
  const [busy, setBusy] = useState(false);

  const subscribe = useCallback(
    (listener: () => void) => file.datasets.subscribe(DEMO_DATASET_SOURCE_ID, listener),
    [file.datasets],
  );
  const dataset = useSyncExternalStore(
    subscribe,
    () => file.datasets.get(DEMO_DATASET_SOURCE_ID),
    () => null,
  );

  const refresh = async () => {
    setBusy(true);
    try {
      await file.datasets.refresh(DEMO_DATASET_SOURCE_ID);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="sidebar" aria-label="侧边栏">
      <section className="sidebar-section">
        <h2 className="sidebar-title">数据源</h2>
        <div className="source-card">
          <div className="source-card-head">
            <span className="source-kind">CSV / JSON</span>
            <span className="source-name">销售样例</span>
          </div>
          <p className="source-meta">
            {dataset
              ? `${dataset.rows.length} 行 · v${dataset.version} · ${new Date(dataset.importedAt).toLocaleTimeString('zh-CN')}`
              : '尚未加载'}
          </p>
          <button type="button" className="source-refresh" onClick={() => void refresh()} disabled={busy}>
            {busy ? '刷新中…' : '手动刷新'}
          </button>
          <p className="source-hint">本地文件数据源将在后端插件完成后接入</p>
        </div>
      </section>

      <section className="sidebar-section">
        <h2 className="sidebar-title">视图</h2>
        <ul className="view-list">
          <li className="view-list-item view-list-item--active">总览</li>
        </ul>
      </section>

      <section className="sidebar-section">
        <h2 className="sidebar-title">扩展</h2>
        <ul className="extension-list">
          {registry.listBlocks().map((block) => (
            <li key={block.type}>
              <span className="extension-type">{block.type}</span>
              <span className="extension-title">{block.title}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
