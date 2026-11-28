import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------------------------
// Architecture boundaries (docs/02 §3.4), enforced with no-restricted-imports.
// ESLint does NOT merge options of the same rule from different config objects (the last one
// wins), so each folder group below gets its complete list of patterns.
// ---------------------------------------------------------------------------------------------
const noDeepRelative = {
  group: ['../../*'],
  message: 'Use the @/ alias instead of deep relative imports (../../).',
};
const featurePublicApiOnly = {
  group: ['@/features/*/*'],
  message: 'Import another feature only through its public API: @/features/<name> (its index.ts).',
};
const noAppImports = {
  group: ['@/app', '@/app/*'],
  message:
    'Nothing may depend on src/app (wiring sits on top). Route paths live in @/constants/routes.',
};
const noFeatureImports = {
  group: ['@/features', '@/features/*'],
  message:
    'Shared code must not know about features. Move the shared part out of the feature instead.',
};

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-e2e',
    'dist-csp',
    'coverage',
    'playwright-report',
    'test-results',
    'node_modules',
    'src/api/generated',
  ]),

  // TypeScript everywhere: strict, type-aware rules.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Lets <form onSubmit={handleSubmit(onSubmit)}> pass an async handler to a JSX attribute.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      // Security: never print credentials, tokens or API responses to the console.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // React (application and test code).
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactRefresh.configs.vite],
  },

  // Architecture boundaries.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noDeepRelative, featurePublicApiOnly] }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noDeepRelative, featurePublicApiOnly, noAppImports] },
      ],
    },
  },
  {
    files: [
      'src/api/**',
      'src/components/**',
      'src/constants/**',
      'src/contexts/**',
      'src/hooks/**',
      'src/schemas/**',
      'src/services/**',
      'src/types/**',
      'src/utils/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noDeepRelative, featurePublicApiOnly, noAppImports, noFeatureImports] },
      ],
    },
  },

  // The router is the wiring layer: it may import feature PAGES directly so each page becomes
  // its own lazily loaded chunk. Feature index files export only what other features need.
  {
    files: ['src/app/router/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noDeepRelative] }],
    },
  },

  // Plain JavaScript config files (this file): no type information.
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  // Must be last: turns off formatting rules that Prettier owns.
  prettier,
]);
