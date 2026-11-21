import type { MetaInfo } from '@open-calculator/api-client';
import type { ConnectionState, SaveState, WorkspaceStatus } from '../types';

const SAVE_LABELS: Record<SaveState, string> = {
  idle: '待保存',
  saving: '正在保存…',
  saved: '已保存',
  local: '仅本地',
  conflict: '版本冲突',
};

const SAVE_TONES: Record<SaveState, 'idle' | 'busy' | 'ok' | 'warn' | 'danger'> = {
  idle: 'idle',
  saving: 'busy',
  saved: 'ok',
  local: 'warn',
  conflict: 'danger',
};

export function StatusBar({
  connection,
  meta,
  status,
}: {
  connection: ConnectionState;
  meta: MetaInfo | null;
  status: WorkspaceStatus;
}) {
  const tone = SAVE_TONES[status.save];
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
      <span className={`statusbar-group statusbar-save statusbar-save--${tone}`}>
        {status.note ?? SAVE_LABELS[status.save]}
      </span>
      <span className="statusbar-spacer" />
      <span className="statusbar-group">v{meta?.version ?? '0.1.0'} · MIT License</span>
    </footer>
  );
}
