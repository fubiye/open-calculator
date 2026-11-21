import { useEffect, useState } from 'react';
import { AiPanel } from './components/AiPanel';
import { Spreadsheet } from './components/Spreadsheet';
import { StatusBar } from './components/StatusBar';
import { TopBar } from './components/TopBar';
import { fetchMeta, type MetaInfo } from './lib/api';
import {
  INITIAL_SPREADSHEET_STATUS,
  type ConnectionState,
  type SaveState,
  type SpreadsheetStatus,
} from './types';

const SAVE_LABELS: Record<SaveState, string> = {
  idle: '预览模式',
  saving: '正在保存…',
  saved: '已保存',
  local: '仅本地',
};

const SAVE_TONES: Record<SaveState, 'idle' | 'busy' | 'ok' | 'warn'> = {
  idle: 'idle',
  saving: 'busy',
  saved: 'ok',
  local: 'warn',
};

export function App() {
  const [connection, setConnection] = useState<ConnectionState>('checking');
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [status, setStatus] = useState<SpreadsheetStatus>(INITIAL_SPREADSHEET_STATUS);
  const [aiOpen, setAiOpen] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMeta()
      .then((info) => {
        if (!active) return;
        setMeta(info);
        setConnection('online');
      })
      .catch(() => {
        if (active) setConnection('offline');
      });

    return () => {
      active = false;
    };
  }, []);

  const saveLabel = status.note ?? SAVE_LABELS[status.save];

  return (
    <div className="app">
      <TopBar
        connection={connection}
        aiOpen={aiOpen}
        onToggleAi={() => setAiOpen((open) => !open)}
      />
      <main className="workspace">
        <Spreadsheet status={status} setStatus={setStatus} />
        {aiOpen && <AiPanel meta={meta} connection={connection} onClose={() => setAiOpen(false)} />}
      </main>
      <StatusBar
        connection={connection}
        meta={meta}
        saveLabel={saveLabel}
        saveTone={SAVE_TONES[status.save]}
      />
    </div>
  );
}
