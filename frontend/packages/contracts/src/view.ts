export interface ViewLayout {
  type: 'grid';
  columns: number;
}

export interface BlockInstance {
  id: string;
  type: string;
  span?: number;
  title?: string;
  config?: unknown;
}

export interface ViewDefinition {
  id: string;
  name: string;
  layout: ViewLayout;
  blocks: BlockInstance[];
}

/** 最小视图校验：布局与块结构合法即可。 */
export function isViewDefinition(value: unknown): value is ViewDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const view = value as Partial<ViewDefinition>;
  return (
    typeof view.id === 'string' &&
    typeof view.name === 'string' &&
    typeof view.layout === 'object' &&
    view.layout !== null &&
    view.layout.type === 'grid' &&
    typeof view.layout.columns === 'number' &&
    Array.isArray(view.blocks)
  );
}
