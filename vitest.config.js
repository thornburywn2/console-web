import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  mode: 'development',
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['src/stories/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}', 'src/stories/**'],
      thresholds: {
        // Global thresholds - progressive target toward 80%
        global: {
          branches: 20,
          functions: 15,
          lines: 20,
          statements: 20,
        },
        // Key modules with higher coverage requirements (Phase 5.3)
        // Note: Functions threshold lower due to many exported API methods
        // Focus on lines/statements which measure actual code execution
        'src/services/**': {
          branches: 70,
          functions: 5,  // Low due to 100+ exported API functions
          lines: 80,
          statements: 80,
        },
        'src/hooks/**': {
          branches: 50,
          functions: 50,
          lines: 70,
          statements: 70,
        },
      },
    },
  }
});