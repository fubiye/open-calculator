import { describe, expect, it } from 'vitest';
import { ExtensionError, ExtensionRegistry } from './registry';
import type { Extension } from './types';

function blockExtension(type: string, apiVersion = '1.0.0'): Extension {
  return {
    manifest: { id: `block.${type}`, version: '0.1.0', apiVersion, kind: 'block' },
    block: {
      type,
      title: type,
      loader: async () => ({
        type,
        title: type,
        component: () => null,
      }),
    },
  };
}

describe('ExtensionRegistry', () => {
  it('registers and unregisters a block', () => {
    const registry = new ExtensionRegistry();
    const dispose = registry.register(blockExtension('demo'));
    expect(registry.getBlock('demo')?.title).toBe('demo');
    dispose();
    expect(registry.getBlock('demo')).toBeUndefined();
  });

  it('rejects duplicate block types', () => {
    const registry = new ExtensionRegistry();
    registry.register(blockExtension('demo'));
    expect(() => registry.register(blockExtension('demo'))).toThrow(ExtensionError);
  });

  it('rejects unsupported api versions', () => {
    const registry = new ExtensionRegistry();
    expect(() => registry.register(blockExtension('demo', '2.0.0'))).toThrow(ExtensionError);
  });

  it('rejects duplicate panel ids', () => {
    const registry = new ExtensionRegistry();
    const panel: Extension = {
      manifest: { id: 'panel.side', version: '0.1.0', apiVersion: '1.0.0', kind: 'panel' },
      panel: {
        id: 'side',
        title: 'Side',
        location: 'right',
        loader: async () => ({ component: () => null }),
      },
    };
    registry.register(panel);
    expect(() => registry.register(panel)).toThrow(ExtensionError);
  });
});
