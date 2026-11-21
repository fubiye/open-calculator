import type {
  BlockContribution,
  CommandContribution,
  Extension,
  PanelContribution,
} from './types';

export const SUPPORTED_EXTENSION_API_VERSION = 1;

export class ExtensionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionError';
  }
}

function assertApiVersion(extension: Extension): void {
  const major = Number.parseInt(extension.manifest.apiVersion.split('.')[0] ?? '', 10);
  if (major !== SUPPORTED_EXTENSION_API_VERSION) {
    throw new ExtensionError(
      `扩展 ${extension.manifest.id} 的 apiVersion ${extension.manifest.apiVersion} 不受支持（需要 ${SUPPORTED_EXTENSION_API_VERSION}.x）`,
    );
  }
}

/**
 * 前端扩展注册表：块、面板与命令的唯一注册入口。
 * 内置能力也必须通过 register 注册（dogfooding）。
 */
export class ExtensionRegistry {
  private readonly blocks = new Map<string, BlockContribution>();
  private readonly panels = new Map<string, PanelContribution>();
  private readonly commands = new Map<string, CommandContribution>();

  register(extension: Extension): () => void {
    assertApiVersion(extension);
    const extensionId = extension.manifest.id;

    if ('block' in extension) {
      return this.registerBlock(extension.block);
    }
    if ('panel' in extension) {
      return this.registerPanel(extension.panel);
    }
    if ('command' in extension) {
      return this.registerCommand(extension.command);
    }
    throw new ExtensionError(`扩展 ${extensionId} 缺少 contribution`);
  }

  getBlock(type: string): BlockContribution | undefined {
    return this.blocks.get(type);
  }

  listBlocks(): BlockContribution[] {
    return [...this.blocks.values()];
  }

  getPanel(id: string): PanelContribution | undefined {
    return this.panels.get(id);
  }

  listPanels(): PanelContribution[] {
    return [...this.panels.values()];
  }

  getCommand(id: string): CommandContribution | undefined {
    return this.commands.get(id);
  }

  private registerBlock(contribution: BlockContribution): () => void {
    if (this.blocks.has(contribution.type)) {
      throw new ExtensionError(`块类型 ${contribution.type} 已被注册`);
    }
    this.blocks.set(contribution.type, contribution);
    return () => {
      this.blocks.delete(contribution.type);
    };
  }

  private registerPanel(contribution: PanelContribution): () => void {
    if (this.panels.has(contribution.id)) {
      throw new ExtensionError(`面板 ${contribution.id} 已被注册`);
    }
    this.panels.set(contribution.id, contribution);
    return () => {
      this.panels.delete(contribution.id);
    };
  }

  private registerCommand(contribution: CommandContribution): () => void {
    if (this.commands.has(contribution.id)) {
      throw new ExtensionError(`命令 ${contribution.id} 已被注册`);
    }
    this.commands.set(contribution.id, contribution);
    return () => {
      this.commands.delete(contribution.id);
    };
  }
}
