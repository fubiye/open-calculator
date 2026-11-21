import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { WorkspaceContext, type WorkspaceContextValue } from './context';
import { ApiError, fetchMeta, fetchWorkbook, saveWorkbook, type MetaInfo } from '@open-calculator/api-client';
import {
  isSnapshotEnvelope,
  unwrapUniverSnapshot,
  wrapSnapshot,
  type DatasetAccess,
  type DatasetSnapshot,
  type FileContext,
  type WorkbookAccess,
} from '@open-calculator/contracts';
import { createDemoDataset, DEMO_DATASET_SOURCE_ID } from '../demo/dataset';
import { createDemoWorkbook, DEMO_WORKBOOK_ID } from '../demo/workbook';
import type { ConnectionState, WorkspaceStatus } from '../types';

const AUTO_SAVE_DELAY_MS = 800;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionState>('checking');
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [status, setStatus] = useState<WorkspaceStatus>({ save: 'idle', revision: 0 });
  const [workbookSnapshot, setWorkbookSnapshot] = useState<unknown | null>(null);
  const [dataset, setDataset] = useState<DatasetSnapshot>(() => createDemoDataset(1));

  const snapshotRef = useRef<unknown | null>(null);
  const revisionRef = useRef(0);
  const conflictRef = useRef(false);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const workbookListenersRef = useRef(new Set<(snapshot: unknown) => void>());
  const datasetRef = useRef(dataset);
  const datasetListenersRef = useRef(new Map<string, Set<(snapshot: DatasetSnapshot) => void>>());
  const datasetVersionRef = useRef(1);

  const persist = useCallback(async (snapshot: unknown) => {
    if (conflictRef.current) {
      return;
    }
    setStatus((current) => ({ ...current, save: 'saving', note: '正在保存…' }));
    try {
      const record = await saveWorkbook(DEMO_WORKBOOK_ID, {
        name: '演示工作簿',
        snapshot: wrapSnapshot(snapshot),
        expectedRevision: revisionRef.current || undefined,
      });
      revisionRef.current = record.revision;
      setStatus({
        save: 'saved',
        note: `已保存到本地后端 · 修订 ${record.revision}`,
        revision: record.revision,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        conflictRef.current = true;
        setStatus((current) => ({
          ...current,
          save: 'conflict',
          note: '另一窗口已更新此工作簿，请刷新页面获取最新版本',
        }));
      } else {
        setStatus((current) => ({
          ...current,
          save: 'local',
          note: '后端离线，修改暂存在当前页面',
        }));
      }
    }
  }, []);

  const workbookAccess = useMemo<WorkbookAccess>(
    () => ({
      getSnapshot: () => snapshotRef.current,
      setSnapshot: (snapshot) => {
        snapshotRef.current = snapshot;
        setWorkbookSnapshot(snapshot);
        workbookListenersRef.current.forEach((listener) => listener(snapshot));
        if (saveTimerRef.current !== undefined) {
          window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => {
          void persist(snapshot);
        }, AUTO_SAVE_DELAY_MS);
      },
      subscribe: (listener) => {
        workbookListenersRef.current.add(listener);
        return () => {
          workbookListenersRef.current.delete(listener);
        };
      },
    }),
    [persist],
  );

  const datasetAccess = useMemo<DatasetAccess>(
    () => ({
      get: (sourceId) => (sourceId === datasetRef.current.sourceId ? datasetRef.current : null),
      subscribe: (sourceId, listener) => {
        if (sourceId !== DEMO_DATASET_SOURCE_ID) {
          return () => undefined;
        }
        const listeners = datasetListenersRef.current.get(sourceId) ?? new Set();
        listeners.add(listener);
        datasetListenersRef.current.set(sourceId, listeners);
        return () => {
          listeners.delete(listener);
          if (listeners.size === 0) {
            datasetListenersRef.current.delete(sourceId);
          }
        };
      },
      refresh: async (sourceId) => {
        if (sourceId !== DEMO_DATASET_SOURCE_ID) {
          return;
        }
        datasetVersionRef.current += 1;
        const next = createDemoDataset(datasetVersionRef.current);
        datasetRef.current = next;
        setDataset(next);
        datasetListenersRef.current.get(sourceId)?.forEach((listener) => listener(next));
      },
    }),
    [],
  );

  const file = useMemo<FileContext>(
    () => ({ datasets: datasetAccess, workbook: workbookAccess, selection: null }),
    [datasetAccess, workbookAccess],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const info = await fetchMeta();
        if (!active) return;
        setMeta(info);
        setConnection('online');
      } catch {
        if (active) setConnection('offline');
      }

      let remoteSnapshot: unknown | null = null;
      let revision = 0;
      try {
        const record = await fetchWorkbook(DEMO_WORKBOOK_ID);
        if (!active) return;
        if (isSnapshotEnvelope(record.snapshot)) {
          remoteSnapshot = unwrapUniverSnapshot(record.snapshot);
        } else {
          remoteSnapshot = record.snapshot;
        }
        revision = record.revision;
      } catch {
        // 后端离线或文件不存在：使用内置演示工作簿。
      }

      if (!active) return;
      const snapshot = remoteSnapshot ?? createDemoWorkbook();
      snapshotRef.current = snapshot;
      revisionRef.current = revision;
      setWorkbookSnapshot(snapshot);
      setStatus({
        save: remoteSnapshot ? 'saved' : 'local',
        note: remoteSnapshot ? '已从本地后端加载工作簿' : '演示工作簿，编辑后自动保存',
        revision,
      });

      if (!remoteSnapshot) {
        saveTimerRef.current = window.setTimeout(() => {
          void persist(snapshot);
        }, 400);
      }
    };

    void bootstrap();

    return () => {
      active = false;
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [persist]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      connection,
      meta,
      status,
      file,
      ready: workbookSnapshot !== null,
    }),
    [connection, meta, status, file, workbookSnapshot],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
