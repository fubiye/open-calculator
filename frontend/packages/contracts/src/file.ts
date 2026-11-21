import type { DatasetSnapshot } from './dataset';

/** 工作簿访问接口；`snapshot` 的具体结构由表格引擎解释。 */
export interface WorkbookAccess {
  getSnapshot(): unknown | null;
  setSnapshot(snapshot: unknown): void;
  subscribe(listener: (snapshot: unknown) => void): () => void;
}

/** 文件内数据集访问接口。 */
export interface DatasetAccess {
  get(sourceId: string): DatasetSnapshot | null;
  subscribe(sourceId: string, listener: (snapshot: DatasetSnapshot) => void): () => void;
  refresh(sourceId: string): Promise<void>;
}

/** 注入给视图块的运行时上下文。块之间不直接互相依赖。 */
export interface FileContext {
  datasets: DatasetAccess;
  workbook: WorkbookAccess;
  selection: { viewId: string; blockId: string } | null;
}
