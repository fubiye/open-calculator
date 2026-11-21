import type { MetaInfo } from '@open-calculator/api-client';
import type { ConnectionState } from '../types';

interface AiPanelProps {
  meta: MetaInfo | null;
  connection: ConnectionState;
  onClose: () => void;
}

const CAPABILITIES = [
  '把自然语言需求变成公式，并写入当前选区',
  '解释选中单元格的公式和计算结果',
  '根据表格结构生成预算、贷款、单位换算等计算模型',
  '通过受控工具调用读写单元格（执行前需确认）',
];

export function AiPanel({ meta, connection, onClose }: AiPanelProps) {
  const aiConfigured = meta?.capabilities.ai ?? false;
  const offline = connection === 'offline';

  return (
    <aside className="ai-panel" aria-label="AI 助手">
      <header className="ai-panel-header">
        <div>
          <h2 className="ai-panel-title">
            <span className="ai-spark" aria-hidden="true">
              ✦
            </span>
            AI 助手
          </h2>
          <p className="ai-panel-subtitle">自然语言 → 公式 / 单元格操作</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭 AI 助手">
          ✕
        </button>
      </header>

      <div className="ai-panel-status">
        <span className="badge badge--planned">规划中</span>
        <span>
          {aiConfigured ? '模型通道已配置' : offline ? '后端离线，无法检查模型配置' : '模型通道未配置'}
        </span>
      </div>

      <div className="ai-messages">
        <div className="ai-bubble ai-bubble--assistant">
          <p>你好，我是 Open Calculator 的 AI 助手。下一阶段我会支持：</p>
          <ul>
            {CAPABILITIES.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
          <p className="ai-bubble-note">
            现在的表格计算完全在本地完成；AI 通道接好后，模型只会拿到当前文件的结构与你允许的选区。
          </p>
        </div>
      </div>

      <div className="ai-composer">
        <textarea
          className="ai-input"
          rows={3}
          placeholder="例如：把年利率改成 4.2%，并解释月供变化"
          disabled
          aria-label="AI 输入框（暂未启用）"
        />
        <div className="ai-composer-actions">
          <span className="ai-hint">
            {offline ? '启动 Rust 后端后可检查模型配置' : '后端配置模型提供方后启用'}
          </span>
          <button type="button" className="send-button" disabled>
            发送
          </button>
        </div>
      </div>

      <footer className="ai-panel-footer">
        接入方式：后端代理 OpenAI 兼容接口 / Anthropic，或本地 Ollama。
      </footer>
    </aside>
  );
}
