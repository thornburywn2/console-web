/**
 * Backend Test Configuration
 *
 * Separate vitest config for server-side tests.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./server/test/setup.js'],
    include: ['server/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['server/**/*.js'],
      exclude: [
        'server/test/**',
        'server/**/*.test.js',
        'server/**/*.spec.js',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
