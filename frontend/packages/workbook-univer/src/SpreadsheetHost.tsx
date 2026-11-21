import { useEffect, useRef } from 'react';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import SheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import SheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import '@univerjs/preset-sheets-core/lib/index.css';
import {
  CommandType,
  LocaleType,
  createUniver,
  type IWorkbookData,
} from '@univerjs/presets';

export type { IWorkbookData } from '@univerjs/presets';

export interface NumberFormatRule {
  sheet: string;
  range: string;
  pattern: string;
}

export interface SpreadsheetHostProps {
  initialSnapshot: IWorkbookData;
  numberFormats?: NumberFormatRule[];
  onSnapshotChange?: (snapshot: IWorkbookData) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Univer 表格宿主：只负责引擎生命周期、快照读取与变更通知。
 * 持久化、表单/状态栏等应用逻辑由上层负责。
 */
export function SpreadsheetHost({
  initialSnapshot,
  numberFormats,
  onSnapshotChange,
  onReady,
  onError,
}: SpreadsheetHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // 用 ref 保存回调，避免回调变化导致 Univer 被重复创建/销毁。
  const callbacksRef = useRef({ onSnapshotChange, onReady, onError });

  useEffect(() => {
    callbacksRef.current = { onSnapshotChange, onReady, onError };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let univer: ReturnType<typeof createUniver>['univer'] | null = null;
    let commandSubscription: { dispose: () => void } | null = null;

    try {
      const created = createUniver({
        locale: LocaleType.ZH_CN,
        locales: {
          [LocaleType.ZH_CN]: SheetsCoreZhCN,
          [LocaleType.EN_US]: SheetsCoreEnUS,
        },
        presets: [UniverSheetsCorePreset({ container: host, formulaBar: true })],
      });
      univer = created.univer;
      const workbook = created.univerAPI.createWorkbook(initialSnapshot);

      for (const rule of numberFormats ?? []) {
        workbook.getSheetByName(rule.sheet)?.getRange(rule.range).setNumberFormat(rule.pattern);
      }

      commandSubscription = workbook.onCommandExecuted((command) => {
        if (command.type === CommandType.MUTATION) {
          callbacksRef.current.onSnapshotChange?.(workbook.save());
        }
      });

      callbacksRef.current.onReady?.();
    } catch (error) {
      callbacksRef.current.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    return () => {
      commandSubscription?.dispose();
      univer?.dispose();
    };
  }, [initialSnapshot, numberFormats]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
}
