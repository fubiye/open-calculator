import { useContext } from 'react';
import { ExtensionContext } from './context';

export function useExtensionRegistry() {
  const registry = useContext(ExtensionContext);
  if (!registry) {
    throw new Error('useExtensionRegistry 必须在 ExtensionProvider 内使用');
  }
  return registry;
}
