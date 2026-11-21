import type { ComponentType } from 'react';
import type { ExtensionManifest, FileContext } from '@open-calculator/contracts';

export interface BlockProps {
  file: FileContext;
  config: unknown;
}

export interface BlockModule {
  type: string;
  title: string;
  component: ComponentType<BlockProps>;
}

export interface BlockContribution {
  type: string;
  title: string;
  defaultConfig?: unknown;
  loader: () => Promise<BlockModule>;
}

export interface PanelProps {
  file: FileContext;
}

export interface PanelModule {
  component: ComponentType<PanelProps>;
}

export interface PanelContribution {
  id: string;
  title: string;
  location: 'left' | 'right';
  defaultOpen?: boolean;
  loader: () => Promise<PanelModule>;
}

export interface CommandContext {
  file: FileContext;
}

export interface CommandContribution {
  id: string;
  title: string;
  run: (context: CommandContext) => void | Promise<void>;
}

interface BlockExtension {
  manifest: ExtensionManifest & { kind: 'block' };
  block: BlockContribution;
}

interface PanelExtension {
  manifest: ExtensionManifest & { kind: 'panel' };
  panel: PanelContribution;
}

interface CommandExtension {
  manifest: ExtensionManifest & { kind: 'command' };
  command: CommandContribution;
}

export type Extension = BlockExtension | PanelExtension | CommandExtension;
