import type { ConnectionState } from '../types';

interface TopBarProps {
  connection: ConnectionState;
  aiOpen: boolean;
  onToggleAi: () => void;
}

const CONNECTION_TEXT: Record<ConnectionState, string> = {
  checking: '连接后端…',
  online: '后端已连接',
  offline: '后端离线',
};

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="url(#brand-gradient)" />
      <g fill="rgba(255,255,255,0.24)">
        <rect x="6" y="6" width="5.5" height="5.5" rx="1.5" />
        <rect x="13.25" y="6" width="5.5" height="5.5" rx="1.5" />
        <rect x="20.5" y="6" width="5.5" height="5.5" rx="1.5" />
        <rect x="6" y="13.25" width="5.5" height="5.5" rx="1.5" />
        <rect x="20.5" y="13.25" width="5.5" height="5.5" rx="1.5" />
        <rect x="6" y="20.5" width="5.5" height="5.5" rx="1.5" />
        <rect x="13.25" y="20.5" width="5.5" height="5.5" rx="1.5" />
        <rect x="20.5" y="20.5" width="5.5" height="5.5" rx="1.5" />
      </g>
      <rect x="13.25" y="13.25" width="5.5" height="5.5" rx="1.5" fill="#f8fafc" />
      <defs>
        <linearGradient
          id="brand-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TopBar({ connection, aiOpen, onToggleAi }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark />
        <div className="brand-text">
          <span className="brand-name">Open Calculator</span>
          <span className="brand-tagline">开放 · 可扩展 · AI 原生</span>
        </div>
      </div>

      <div className="topbar-actions">
        <span className={`connection connection--${connection}`}>
          <span className="connection-dot" aria-hidden="true" />
          {CONNECTION_TEXT[connection]}
        </span>
        <button
          type="button"
          className={`ai-toggle${aiOpen ? ' ai-toggle--active' : ''}`}
          onClick={onToggleAi}
          aria-pressed={aiOpen}
        >
          <span className="ai-spark" aria-hidden="true">
            ✦
          </span>
          AI 助手
        </button>
      </div>
    </header>
  );
}
