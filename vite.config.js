import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 7777,
    allowedHosts: ['manager.example.com', 'manage.example.com', 'localhost'],
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
    sourcemap: true,
  },
});
