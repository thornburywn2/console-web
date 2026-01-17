import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  apps: [
    // Main console-web application
    {
      name: 'console-web',
      script: 'server/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Cluster mode configuration
      // Set to 'max' for all CPUs, or a number for specific count
      // For WebSocket apps, consider using 2-4 instances max
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      // Graceful shutdown settings
      kill_timeout: 30000,        // 30s for graceful shutdown
      wait_ready: true,           // Wait for process.send('ready')
      listen_timeout: 10000,      // 10s to start listening
      // Memory and restart settings
      watch: false,
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 3,
      min_uptime: '10s',
      restart_delay: 5000,
      // Cluster-specific settings
      merge_logs: true,           // Combine logs from all instances
      // Environment for clustering
      instance_var: 'INSTANCE_ID',
    },

    // Watcher service - monitors and auto-recovers main app
    {
      name: 'console-web-watcher',
      script: 'server/services/watcherService.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 10000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Watcher should be very lightweight
      max_memory_restart: '100M',
      // Don't kill watcher when main app restarts
      kill_timeout: 3000,
    }
  ]
};
