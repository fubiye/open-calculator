export type DatasetFieldType = 'string' | 'number' | 'boolean';

export interface DatasetField {
  name: string;
  type: DatasetFieldType;
}

export interface DatasetSchema {
  fields: DatasetField[];
}

/** 数据源解析后的只读表格快照；`version` 递增表示数据变化。 */
export interface DatasetSnapshot {
  sourceId: string;
  version: number;
  schema: DatasetSchema;
  rows: string[][];
  importedAt: string;
  stale: boolean;
  error?: string;
}

export type ConnectorId = 'csv' | 'json';

export interface DataSourceDescriptor {
  id: string;
  connector: ConnectorId;
  name: string;
  path?: string;
  lastRefreshedAt?: string;
}
