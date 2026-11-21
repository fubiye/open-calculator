import { useMemo } from 'react';
import type { FileContext } from '@open-calculator/contracts';
import {
  SpreadsheetHost,
  type IWorkbookData,
  type NumberFormatRule,
} from '@open-calculator/workbook-univer';

export interface SpreadsheetBlockConfig {
  numberFormats?: NumberFormatRule[];
}

export function SpreadsheetBlock({
  file,
  config,
}: {
  file: FileContext;
  config: SpreadsheetBlockConfig;
}) {
  const initialSnapshot = useMemo(
    () => file.workbook.getSnapshot() as IWorkbookData | null,
    [file.workbook],
  );

  if (!initialSnapshot) {
    return <div className="block-empty">工作簿尚未加载</div>;
  }

  return (
    <SpreadsheetHost
      initialSnapshot={initialSnapshot}
      numberFormats={config.numberFormats}
      onSnapshotChange={(snapshot) => file.workbook.setSnapshot(snapshot)}
    />
  );
}
