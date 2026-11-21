import { useEffect, useState, type ComponentType } from 'react';
import { resolveSpan } from './resolveSpan';
import type { BlockInstance, FileContext, ViewDefinition } from '@open-calculator/contracts';
import {
  ExtensionBoundary,
  type BlockContribution,
  type BlockProps,
} from '@open-calculator/extensions';
import type { ExtensionRegistry } from '@open-calculator/extensions';
import './composition.css';

interface ViewRendererProps {
  view: ViewDefinition;
  file: FileContext;
  registry: ExtensionRegistry;
}

/** 根据 View 定义渲染块网格；未知块类型只降级该块。 */
export function ViewRenderer({ view, file, registry }: ViewRendererProps) {
  return (
    <div
      className="view-grid"
      style={{ gridTemplateColumns: `repeat(${view.layout.columns}, minmax(0, 1fr))` }}
    >
      {view.blocks.map((block) => (
        <BlockSlot key={block.id} block={block} file={file} registry={registry} columns={view.layout.columns} />
      ))}
    </div>
  );
}

function BlockSlot({
  block,
  file,
  registry,
  columns,
}: {
  block: BlockInstance;
  file: FileContext;
  registry: ExtensionRegistry;
  columns: number;
}) {
  const contribution = registry.getBlock(block.type);
  const span = resolveSpan(block.span, columns);

  if (!contribution) {
    return (
      <section
        className="view-block"
        style={{ gridColumn: `span ${span}` }}
        data-block-id={block.id}
      >
        <div className="view-block-title">{block.title ?? block.type}</div>
        <div className="view-block-missing">
          需要扩展「{block.type}」才能显示此块。请启用对应插件后刷新。
        </div>
      </section>
    );
  }

  const config = block.config ?? contribution.defaultConfig;
  const title = block.title ?? contribution.title;

  return (
    <section
      className={`view-block view-block--${block.type}`}
      style={{ gridColumn: `span ${span}` }}
      data-block-id={block.id}
    >
      <div className="view-block-title">{title}</div>
      <div className="view-block-body">
        <ExtensionBoundary name={title}>
          <LazyBlockHost contribution={contribution} file={file} config={config} title={title} />
        </ExtensionBoundary>
      </div>
    </section>
  );
}

function LazyBlockHost({
  contribution,
  file,
  config,
  title,
}: {
  contribution: BlockContribution;
  file: FileContext;
  config: unknown;
  title: string;
}) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ready'; component: ComponentType<BlockProps> } | { status: 'error'; error: Error }
  >({ status: 'loading' });

  useEffect(() => {
    let active = true;
    contribution
      .loader()
      .then((loaded) => {
        if (active) {
          setState({ status: 'ready', component: loaded.component as ComponentType<BlockProps> });
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setState({
            status: 'error',
            error: cause instanceof Error ? cause : new Error(String(cause)),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [contribution]);

  if (state.status === 'error') {
    throw state.error;
  }
  if (state.status === 'loading') {
    return <div className="view-block-loading">正在加载「{title}」…</div>;
  }

  return <state.component file={file} config={config} />;
}
