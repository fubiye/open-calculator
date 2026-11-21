import type { FileContext } from '@open-calculator/contracts';

export interface NoteBlockConfig {
  text: string;
}

export function NoteBlock({ config }: { file: FileContext; config: NoteBlockConfig }) {
  return <div className="block-note">{config.text}</div>;
}
