import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'apps/desktop/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'contracts', pattern: 'packages/contracts' },
        { type: 'api-client', pattern: 'packages/api-client' },
        { type: 'workbook-univer', pattern: 'packages/workbook-univer' },
        { type: 'extensions', pattern: 'packages/extensions' },
        { type: 'composition', pattern: 'packages/composition' },
        { type: 'blocks', pattern: 'packages/blocks' },
        { type: 'app', pattern: 'apps/web' },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/vite.config.ts'],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'api-client' } },
              allow: { to: { element: { type: 'contracts' } } },
            },
            {
              from: { element: { type: 'workbook-univer' } },
              allow: { to: { element: { type: 'contracts' } } },
            },
            {
              from: { element: { type: 'extensions' } },
              allow: { to: { element: { type: 'contracts' } } },
            },
            {
              from: { element: { type: 'composition' } },
              allow: { to: { element: { types: ['contracts', 'extensions'] } } },
            },
            {
              from: { element: { type: 'blocks' } },
              allow: {
                to: { element: { types: ['contracts', 'extensions', 'workbook-univer'] } },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: [
                      'contracts',
                      'api-client',
                      'workbook-univer',
                      'extensions',
                      'composition',
                      'blocks',
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
);
