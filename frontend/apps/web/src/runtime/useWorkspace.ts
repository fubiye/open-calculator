import { useContext } from 'react';
import { WorkspaceContext, type WorkspaceContextValue } from './context';

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace 必须在 WorkspaceProvider 内使用');
  }
  return value;
}
