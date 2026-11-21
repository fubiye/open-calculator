/** 与后端约定的快照信封版本。 */
export const SNAPSHOT_SCHEMA_VERSION = 1;

/** 当前前端表格引擎标识，写入快照信封，后端不解析。 */
export const UNIVER_ENGINE_ID = 'univer@1.5.2';

/**
 * 跨进程/跨存储传递的文档快照信封。
 * `data` 对后端不透明，只由具体引擎解释。
 */
export interface SnapshotEnvelope<T = unknown> {
  schemaVersion: number;
  engine: string;
  data: T;
}

/** 运行时判断一个值是否是快照信封（旧版本后端可能返回未封装数据）。 */
export function isSnapshotEnvelope(value: unknown): value is SnapshotEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.schemaVersion === 'number' &&
    typeof candidate.engine === 'string' &&
    'data' in candidate
  );
}

export function wrapSnapshot<T>(data: T): SnapshotEnvelope<T> {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    engine: UNIVER_ENGINE_ID,
    data,
  };
}

/**
 * 解开当前引擎支持的快照信封；版本或引擎不匹配时返回 null。
 * 调用方负责回退（例如使用内置演示数据）。
 */
export function unwrapUniverSnapshot(envelope: SnapshotEnvelope): unknown | null {
  if (
    envelope.schemaVersion !== SNAPSHOT_SCHEMA_VERSION ||
    envelope.engine !== UNIVER_ENGINE_ID
  ) {
    return null;
  }
  return envelope.data;
}
