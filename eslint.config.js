/**
 * ESLint Configuration for Console.web
 * Flat config format (ESLint 9+)
 */

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'templates/**',
      '*.min.js',
      'prisma/generated/**',
    ],
  },

  // Base JavaScript config
  js.configs.recommended,

  // Frontend (React/JSX)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks - use recommended but relax some overly strict rules
      ...reactHooks.configs.recommended.rules,
      // Calling setState in effects is valid for data fetching patterns
      'react-hooks/set-state-in-effect': 'off',
      // These rules are too strict for practical usage
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Code Quality
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console in frontend for debugging
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  // Backend (Node.js)
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      // Code Quality
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Use logger instead, but don't error on console
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Node.js specific
      'no-process-exit': 'off', // Allow in server context
    },
  },

  // Test files
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js', '**/*.test.jsx', '**/*.spec.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        global: 'writable',
      },
    },
    rules: {
      'no-unused-vars': 'off', // More relaxed in tests
    },
  },

  // Config files
  {
    files: ['*.config.js', '*.config.mjs', 'vite.config.js', 'vitest.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // E2E test files (Playwright)
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2024,
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // Scripts
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
  },

  // Storybook files
  {
    files: ['src/stories/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': 'off', // More relaxed in stories
    },
  },
];
