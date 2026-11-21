import { useCallback, useSyncExternalStore } from 'react';
import type { FileContext } from '@open-calculator/contracts';
import { aggregate, type Aggregation } from './aggregate';

export interface KpiBlockConfig {
  sourceId: string;
  field: string;
  aggregation: Aggregation;
  label?: string;
}

const AGGREGATION_LABEL: Record<Aggregation, string> = {
  sum: '合计',
  avg: '平均',
  count: '行数',
};

function formatValue(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

export function KpiBlock({ file, config }: { file: FileContext; config: KpiBlockConfig }) {
  const subscribe = useCallback(
    (listener: () => void) => file.datasets.subscribe(config.sourceId, listener),
    [file.datasets, config.sourceId],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    () => file.datasets.get(config.sourceId),
    () => null,
  );

  const label = config.label ?? `${config.field} · ${AGGREGATION_LABEL[config.aggregation]}`;
  const value = snapshot ? aggregate(snapshot, config.field, config.aggregation) : null;

  return (
    <div className="block-kpi">
      <span className="block-kpi-label">{label}</span>
      <span className="block-kpi-value">{formatValue(value)}</span>
      <span className="block-kpi-label">
        {snapshot ? `数据版本 v${snapshot.version}` : '等待数据源…'}
      </span>
    </div>
  );
}
