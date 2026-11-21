import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ExtensionBoundaryProps {
  name: string;
  children: ReactNode;
}

interface ExtensionBoundaryState {
  failed: boolean;
  message?: string;
}

/** 扩展/块级错误边界：单个扩展失败不影响应用其他部分。 */
export class ExtensionBoundary extends Component<
  ExtensionBoundaryProps,
  ExtensionBoundaryState
> {
  state: ExtensionBoundaryState = { failed: false };

  static getDerivedStateFromError(error: unknown): ExtensionBoundaryState {
    return {
      failed: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[extension] ${this.props.name} 渲染失败`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="extension-fallback" role="alert">
          <strong>{this.props.name} 加载失败</strong>
          <p>{this.state.message ?? '未知错误'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
