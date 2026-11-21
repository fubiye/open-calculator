export type ExtensionKind = 'block' | 'panel' | 'command';

/** 前端扩展 manifest；版本用于兼容性检查。 */
export interface ExtensionManifest {
  id: string;
  version: string;
  apiVersion: string;
  kind: ExtensionKind;
  permissions?: string[];
}
