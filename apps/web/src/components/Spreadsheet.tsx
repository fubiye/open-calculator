import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import SheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import SheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import '@univerjs/preset-sheets-core/lib/index.css';
import {
  CommandType,
  createUniver,
  LocaleType,
  type FUniver,
  type IWorkbookData,
} from '@univerjs/presets';
import { fetchWorkbook, saveWorkbook } from '../lib/api';
import { applyDemoNumberFormats, createDemoWorkbook, WORKBOOK_ID } from '../lib/demo-workbook';
import type { SpreadsheetStatus } from '../types';

interface SpreadsheetProps {
  status: SpreadsheetStatus;
  setStatus: Dispatch<SetStateAction<SpreadsheetStatus>>;
}

const AUTO_SAVE_DELAY_MS = 800;

export function Spreadsheet({ status, setStatus }: SpreadsheetProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    let univer: ReturnType<typeof createUniver>['univer'] | null = null;
    let univerAPI: FUniver | null = null;
    let saveTimer: number | undefined;
    let commandSubscription: { dispose: () => void } | null = null;

    const persist = async () => {
      if (disposed || !univerAPI) return;
      const workbook = univerAPI.getActiveWorkbook();
      if (!workbook) return;

      const snapshot = workbook.save();
      setStatus((current) => ({ ...current, save: 'saving' }));
      try {
        const saved = await saveWorkbook(WORKBOOK_ID, {
          name: snapshot.name ?? '演示工作簿',
          snapshot,
        });
        if (disposed) return;
        setStatus((current) => ({
          ...current,
          save: 'saved',
          note: `已保存到本地后端 · 修订 ${saved.revision}`,
        }));
      } catch {
        if (disposed) return;
        setStatus((current) => ({
          ...current,
          save: 'local',
          note: '后端离线，修改暂存在当前页面',
        }));
      }
    };

    const scheduleSave = () => {
      if (saveTimer !== undefined) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        void persist();
      }, AUTO_SAVE_DELAY_MS);
    };

    const boot = async () => {
      let remoteSnapshot: unknown = null;
      try {
        const record = await fetchWorkbook(WORKBOOK_ID);
        remoteSnapshot = record.snapshot;
      } catch {
        // 后端未启动或还没有数据，回退到内置演示工作簿。
      }

      if (disposed) return;

      const created = createUniver({
        locale: LocaleType.ZH_CN,
        locales: {
          [LocaleType.ZH_CN]: SheetsCoreZhCN,
          [LocaleType.EN_US]: SheetsCoreEnUS,
        },
        presets: [UniverSheetsCorePreset({ container: host, formulaBar: true })],
      });
      univer = created.univer;
      univerAPI = created.univerAPI;

      const hasRemoteSnapshot = remoteSnapshot !== null;
      const workbook = univerAPI.createWorkbook(
        hasRemoteSnapshot ? (remoteSnapshot as Partial<IWorkbookData>) : createDemoWorkbook(),
      );

      if (!hasRemoteSnapshot) {
        applyDemoNumberFormats(workbook);
        scheduleSave();
      }

      commandSubscription = workbook.onCommandExecuted((command) => {
        if (command.type === CommandType.MUTATION) {
          scheduleSave();
        }
      });

      if (disposed) return;
      setStatus({
        phase: 'ready',
        save: hasRemoteSnapshot ? 'saved' : 'local',
        note: hasRemoteSnapshot ? '已从本地后端加载工作簿' : '演示工作簿，编辑后自动保存',
      });
    };

    void boot().catch((error: unknown) => {
      if (disposed) return;
      setStatus({
        phase: 'error',
        save: 'local',
        note: error instanceof Error ? error.message : '表格初始化失败',
      });
    });

    return () => {
      disposed = true;
      if (saveTimer !== undefined) window.clearTimeout(saveTimer);
      commandSubscription?.dispose();
      univer?.dispose();
    };
  }, [setStatus]);

  return (
    <section className="sheet-panel" aria-label="电子表格">
      <div ref={hostRef} className="sheet-host" />
      {status.phase !== 'ready' && (
        <div className="sheet-overlay" role="status">
          {status.phase === 'loading'
            ? '正在加载工作簿…'
            : `表格初始化失败：${status.note ?? '未知错误'}`}
        </div>
      )}
    </section>
  );
}
