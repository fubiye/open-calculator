import { useState } from 'react';
import { registerBuiltinBlocks } from '@open-calculator/blocks';
import { ViewRenderer } from '@open-calculator/composition';
import { ExtensionProvider, ExtensionRegistry, useExtensionRegistry } from '@open-calculator/extensions';
import { AiPanel } from './components/AiPanel';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TopBar } from './components/TopBar';
import { WorkspaceProvider } from './runtime/WorkspaceProvider';
import { useWorkspace } from './runtime/useWorkspace';
import { DEFAULT_VIEW } from './views/default-view';

export function App() {
  const [registry] = useState(() => {
    const instance = new ExtensionRegistry();
    registerBuiltinBlocks(instance);
    return instance;
  });

  return (
    <ExtensionProvider registry={registry}>
      <WorkspaceProvider>
        <Workspace />
      </WorkspaceProvider>
    </ExtensionProvider>
  );
}

function Workspace() {
  const registry = useExtensionRegistry();
  const { connection, meta, status, file, ready } = useWorkspace();
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="app">
      <TopBar
        connection={connection}
        aiOpen={aiOpen}
        onToggleAi={() => setAiOpen((open) => !open)}
        title="演示工作簿"
        dirty={status.save !== 'saved'}
      />
      <div className="workspace-body">
        <Sidebar file={file} />
        <main className="view-area" aria-label="视图">
          {ready ? (
            <ViewRenderer view={DEFAULT_VIEW} file={file} registry={registry} />
          ) : (
            <div className="workspace-loading" role="status">
              正在加载工作簿…
            </div>
          )}
        </main>
        {aiOpen && (
          <AiPanel meta={meta} connection={connection} onClose={() => setAiOpen(false)} />
        )}
      </div>
      <StatusBar connection={connection} meta={meta} status={status} />
    </div>
  );
}
