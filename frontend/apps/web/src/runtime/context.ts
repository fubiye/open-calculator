import { createContext } from 'react';
import type { MetaInfo } from '@open-calculator/api-client';
import type { FileContext } from '@open-calculator/contracts';
import type { ConnectionState, WorkspaceStatus } from '../types';

export interface WorkspaceContextValue {
  connection: ConnectionState;
  meta: MetaInfo | null;
  status: WorkspaceStatus;
  file: FileContext;
  ready: boolean;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
