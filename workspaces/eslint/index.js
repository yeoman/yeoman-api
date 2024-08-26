import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * @type {import('typescript-eslint').ConfigWithExtends[]}
 */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.es2022,
        ...globals.nodeBuiltin,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['**/dist/**', '**/fixtures/**'] },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-await-in-loop': 'off',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'prefer-destructuring': 'error',
      'prefer-template': 'error',
    },
  },
  prettier,
];
