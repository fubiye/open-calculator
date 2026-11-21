export type ConnectionState = 'checking' | 'online' | 'offline';

export type SaveState = 'idle' | 'saving' | 'saved' | 'local' | 'conflict';

export interface WorkspaceStatus {
  save: SaveState;
  note?: string;
  revision: number;
}
