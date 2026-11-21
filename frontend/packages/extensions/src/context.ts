import { createContext } from 'react';
import type { ExtensionRegistry } from './registry';

export const ExtensionContext = createContext<ExtensionRegistry | null>(null);
