import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 7777,
    allowedHosts: ['manager.example.com', 'manage.example.com', 'manage.wbtlabs.com', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:5275',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:5275',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5275',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-socket': ['socket.io-client'],
          'vendor-icons': ['lucide-react'],

          // Terminal (heavy, only needed when project selected)
          'vendor-terminal': ['xterm', 'xterm-addon-fit', '@xterm/addon-serialize'],

          // Search (loaded with CommandPalette)
          'vendor-search': ['fuse.js'],

          // Markdown rendering (session notes only)
          'vendor-markdown': ['react-markdown'],

          // Sentry (can load async)
          'vendor-sentry': ['@sentry/react'],
        },
      },
    },
  },
});
