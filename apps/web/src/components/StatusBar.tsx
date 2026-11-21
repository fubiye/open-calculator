import type { ConnectionState } from '../types';
import type { MetaInfo } from '../lib/api';

interface StatusBarProps {
  connection: ConnectionState;
  meta: MetaInfo | null;
  saveLabel: string;
  saveTone: 'idle' | 'busy' | 'ok' | 'warn';
}

export function StatusBar({ connection, meta, saveLabel, saveTone }: StatusBarProps) {
  const version = meta?.version ?? '0.1.0';

  return (
    <footer className="statusbar">
      <span className="statusbar-group">
        <span className={`status-dot status-dot--${connection}`} aria-hidden="true" />
        {connection === 'online'
          ? 'Rust 后端在线'
          : connection === 'offline'
            ? 'Rust 后端未启动'
            : '正在连接 Rust 后端'}
      </span>
      <span className={`statusbar-group statusbar-save statusbar-save--${saveTone}`}>
        {saveLabel}
      </span>
      <span className="statusbar-spacer" />
      <span className="statusbar-group">v{version} · MIT License</span>
    </footer>
  );
}
