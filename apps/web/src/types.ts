export type ConnectionState = 'checking' | 'online' | 'offline';

export type SpreadsheetPhase = 'loading' | 'ready' | 'error';

export type SaveState = 'idle' | 'saving' | 'saved' | 'local';

export interface SpreadsheetStatus {
  phase: SpreadsheetPhase;
  save: SaveState;
  note?: string;
}

export const INITIAL_SPREADSHEET_STATUS: SpreadsheetStatus = {
  phase: 'loading',
  save: 'idle',
};
