import { useCallback, useState, useSyncExternalStore } from 'react';
import type { FileContext } from '@open-calculator/contracts';

export interface DataTableBlockConfig {
  sourceId: string;
  maxRows?: number;
}

export function DataTableBlock({ file, config }: { file: FileContext; config: DataTableBlockConfig }) {
  const subscribe = useCallback(
    (listener: () => void) => file.datasets.subscribe(config.sourceId, listener),
    [file.datasets, config.sourceId],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    () => file.datasets.get(config.sourceId),
    () => null,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await file.datasets.refresh(config.sourceId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const rows = snapshot?.rows.slice(0, config.maxRows ?? 200) ?? [];

  return (
    <>
      <div className="block-toolbar">
        <span>
          {snapshot
            ? `${snapshot.rows.length} 行 · 更新于 ${new Date(snapshot.importedAt).toLocaleTimeString('zh-CN')}`
            : '正在加载数据源…'}
          {snapshot?.stale && <span className="block-badge">可能过期</span>}
        </span>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </div>
      {error && <div className="block-error">{error}</div>}
      <div className="block-table-wrap">
        {snapshot ? (
          <table className="block-table">
            <thead>
              <tr>
                {snapshot.schema.fields.map((field) => (
                  <th key={field.name}>{field.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="block-empty">暂无数据，请选择一个本地 CSV/JSON 文件</div>
        )}
      </div>
    </>
  );
}
