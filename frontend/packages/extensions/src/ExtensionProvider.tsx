import type { ReactNode } from 'react';
import { ExtensionContext } from './context';
import type { ExtensionRegistry } from './registry';

export function ExtensionProvider({
  registry,
  children,
}: {
  registry: ExtensionRegistry;
  children: ReactNode;
}) {
  return <ExtensionContext.Provider value={registry}>{children}</ExtensionContext.Provider>;
}
