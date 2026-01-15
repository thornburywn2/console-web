/**
 * Console.web Watcher Service
 *
 * Monitors the main application and auto-recovers from failures.
 * Runs as a separate PM2 process to ensure independence.
 *
 * Features:
 * - HTTP health checks
 * - PM2 process monitoring
 * - Automatic Prisma client regeneration
 * - Memory threshold monitoring
 * - Exponential backoff for recovery attempts
 * - Detailed logging
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  // Target application
  appName: 'console-web',
  appPort: 5275,
  healthEndpoint: '/api/watcher/health',
  projectDir: '/home/thornburywn/Projects/console-web',

  // Check intervals (ms)
  healthCheckInterval: 30000,      // 30 seconds
  processCheckInterval: 10000,     // 10 seconds

  // Thresholds
  maxMemoryMB: 512,                // Restart if memory exceeds this
  maxRestartAttempts: 5,           // Max recovery attempts before alerting
  healthTimeout: 10000,            // Health check timeout (ms)

  // Backoff settings
  initialBackoffMs: 5000,          // 5 seconds
  maxBackoffMs: 300000,            // 5 minutes
  backoffMultiplier: 2,

  // Log file
  logFile: '/home/thornburywn/Projects/console-web/logs/watcher.log',
};

// State
let state = {
  consecutiveFailures: 0,
  lastHealthCheck: null,
  lastRecoveryAttempt: null,
  currentBackoff: CONFIG.initialBackoffMs,
  isRecovering: false,
  startTime: Date.now(),
};

/**
 * Logging utility
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };

  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}` +
    (Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '');

  console.log(logLine);

  // Append to log file
  try {
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logLine + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
}

/**
 * Check if the application responds to HTTP health check
 */
async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.healthTimeout);

    const response = await fetch(
      `http://localhost:${CONFIG.appPort}${CONFIG.healthEndpoint}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return { healthy: true, data };
    }

    return { healthy: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Get PM2 process info
 */
async function getPM2Status() {
  try {
    const { stdout } = await execAsync(`pm2 jlist`);
    const processes = JSON.parse(stdout);
    const app = processes.find(p => p.name === CONFIG.appName);

    if (!app) {
      return { running: false, error: 'Process not found' };
    }

    return {
      running: app.pm2_env.status === 'online',
      status: app.pm2_env.status,
      pid: app.pid,
      memory: Math.round(app.monit.memory / 1024 / 1024), // MB
      cpu: app.monit.cpu,
      restarts: app.pm2_env.restart_time,
      uptime: Date.now() - app.pm2_env.pm_uptime,
    };
  } catch (error) {
    return { running: false, error: error.message };
  }
}

/**
 * Check PM2 error logs for specific failure patterns
 */
async function checkErrorLogs() {
  try {
    const { stdout } = await execAsync(
      `pm2 logs ${CONFIG.appName} --err --lines 20 --nostream 2>/dev/null`
    );

    const errors = {
      prismaError: stdout.includes('PrismaClient') || stdout.includes('@prisma/client'),
      moduleError: stdout.includes('Cannot find module') || stdout.includes('SyntaxError'),
      memoryError: stdout.includes('FATAL ERROR') || stdout.includes('heap out of memory'),
      connectionError: stdout.includes('ECONNREFUSED') || stdout.includes('ENOTFOUND'),
    };

    return errors;
  } catch (error) {
    return { checkFailed: true, error: error.message };
  }
}

/**
 * Recovery action: Restart PM2 process
 */
async function restartProcess() {
  log('info', 'Attempting process restart...');
  try {
    await execAsync(`pm2 restart ${CONFIG.appName}`);
    log('info', 'Process restart command sent');
    return true;
  } catch (error) {
    log('error', 'Failed to restart process', { error: error.message });
    return false;
  }
}

/**
 * Recovery action: Regenerate Prisma client
 */
async function regeneratePrisma() {
  log('info', 'Regenerating Prisma client...');
  try {
    await execAsync(`cd ${CONFIG.projectDir} && npx prisma generate`);
    log('info', 'Prisma client regenerated successfully');
    return true;
  } catch (error) {
    log('error', 'Failed to regenerate Prisma client', { error: error.message });
    return false;
  }
}

/**
 * Recovery action: Clear node_modules cache and reinstall
 */
async function reinstallDependencies() {
  log('info', 'Reinstalling dependencies...');
  try {
    await execAsync(`cd ${CONFIG.projectDir} && rm -rf node_modules/.cache && npm install --include=dev`);
    log('info', 'Dependencies reinstalled successfully');
    return true;
  } catch (error) {
    log('error', 'Failed to reinstall dependencies', { error: error.message });
    return false;
  }
}

/**
 * Recovery action: Full rebuild
 */
async function fullRebuild() {
  log('info', 'Performing full rebuild...');
  try {
    await execAsync(`cd ${CONFIG.projectDir} && npm run build`);
    log('info', 'Build completed successfully');
    return true;
  } catch (error) {
    log('error', 'Failed to rebuild', { error: error.message });
    return false;
  }
}

/**
 * Main recovery orchestrator
 */
async function performRecovery(errorType) {
  if (state.isRecovering) {
    log('warn', 'Recovery already in progress, skipping');
    return;
  }

  state.isRecovering = true;
  state.lastRecoveryAttempt = Date.now();
  state.consecutiveFailures++;

  log('warn', `Starting recovery attempt ${state.consecutiveFailures}/${CONFIG.maxRestartAttempts}`, { errorType });

  try {
    // Determine recovery strategy based on error type
    let recoverySuccess = false;

    if (errorType === 'prisma') {
      // Prisma-specific recovery
      log('info', 'Detected Prisma error, regenerating client...');
      await regeneratePrisma();
      recoverySuccess = await restartProcess();

    } else if (errorType === 'module') {
      // Module/dependency error
      log('info', 'Detected module error, reinstalling dependencies...');
      await reinstallDependencies();
      await regeneratePrisma();
      recoverySuccess = await restartProcess();

    } else if (errorType === 'memory') {
      // Memory issue - just restart
      log('info', 'Detected memory issue, restarting process...');
      recoverySuccess = await restartProcess();

    } else {
      // Generic recovery - try simple restart first
      log('info', 'Attempting simple restart...');
      recoverySuccess = await restartProcess();
    }

    // Wait for process to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify recovery
    const health = await checkHealth();
    if (health.healthy) {
      log('info', 'Recovery successful, application is healthy');
      state.consecutiveFailures = 0;
      state.currentBackoff = CONFIG.initialBackoffMs;
    } else {
      log('warn', 'Recovery attempt completed but health check still failing');

      // Escalate recovery if simple restart didn't work
      if (state.consecutiveFailures >= 2 && errorType !== 'prisma') {
        log('info', 'Escalating recovery - regenerating Prisma...');
        await regeneratePrisma();
        await restartProcess();
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      if (state.consecutiveFailures >= 3) {
        log('info', 'Escalating recovery - reinstalling dependencies...');
        await reinstallDependencies();
        await regeneratePrisma();
        await restartProcess();
      }

      // Increase backoff for next attempt
      state.currentBackoff = Math.min(
        state.currentBackoff * CONFIG.backoffMultiplier,
        CONFIG.maxBackoffMs
      );
    }

    if (state.consecutiveFailures >= CONFIG.maxRestartAttempts) {
      log('error', 'MAX RECOVERY ATTEMPTS REACHED - Manual intervention may be required', {
        attempts: state.consecutiveFailures,
        lastError: errorType,
      });
      // Could add notification here (email, webhook, etc.)
    }

  } catch (error) {
    log('error', 'Recovery failed with exception', { error: error.message });
  } finally {
    state.isRecovering = false;
  }
}

/**
 * Main monitoring loop
 */
async function monitor() {
  log('info', 'Performing health check...');

  // Check PM2 process status
  const pm2Status = await getPM2Status();

  if (!pm2Status.running) {
    log('error', 'Application is not running', { status: pm2Status });

    // Check error logs to determine cause
    const errors = await checkErrorLogs();

    let errorType = 'unknown';
    if (errors.prismaError) errorType = 'prisma';
    else if (errors.moduleError) errorType = 'module';
    else if (errors.memoryError) errorType = 'memory';

    // Check if we should wait for backoff
    const timeSinceLastRecovery = Date.now() - (state.lastRecoveryAttempt || 0);
    if (timeSinceLastRecovery < state.currentBackoff) {
      log('info', `Waiting for backoff period (${Math.round((state.currentBackoff - timeSinceLastRecovery) / 1000)}s remaining)`);
      return;
    }

    await performRecovery(errorType);
    return;
  }

  // Check memory usage
  if (pm2Status.memory > CONFIG.maxMemoryMB) {
    log('warn', `Memory usage high: ${pm2Status.memory}MB (threshold: ${CONFIG.maxMemoryMB}MB)`);
    await performRecovery('memory');
    return;
  }

  // Check HTTP health
  const health = await checkHealth();
  state.lastHealthCheck = Date.now();

  if (!health.healthy) {
    log('error', 'Health check failed', { error: health.error, pm2Status });

    // Process is running but not responding - might be stuck
    const errors = await checkErrorLogs();

    let errorType = 'unresponsive';
    if (errors.prismaError) errorType = 'prisma';
    else if (errors.connectionError) errorType = 'connection';

    // Check backoff
    const timeSinceLastRecovery = Date.now() - (state.lastRecoveryAttempt || 0);
    if (timeSinceLastRecovery < state.currentBackoff) {
      log('info', `Waiting for backoff period`);
      return;
    }

    await performRecovery(errorType);
    return;
  }

  // All healthy
  if (state.consecutiveFailures > 0) {
    log('info', 'Application recovered and healthy');
    state.consecutiveFailures = 0;
    state.currentBackoff = CONFIG.initialBackoffMs;
  }

  log('info', 'Health check passed', {
    memory: `${pm2Status.memory}MB`,
    uptime: `${Math.round(pm2Status.uptime / 1000 / 60)}min`,
    restarts: pm2Status.restarts,
  });
}

/**
 * Graceful shutdown
 */
function shutdown(signal) {
  log('info', `Received ${signal}, shutting down watcher...`);
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  log('info', '='.repeat(50));
  log('info', 'Console.web Watcher Service starting...');
  log('info', `Monitoring: ${CONFIG.appName} on port ${CONFIG.appPort}`);
  log('info', `Health check interval: ${CONFIG.healthCheckInterval / 1000}s`);
  log('info', `Max memory threshold: ${CONFIG.maxMemoryMB}MB`);
  log('info', '='.repeat(50));

  // Register signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Initial check
  await monitor();

  // Start monitoring loop
  setInterval(monitor, CONFIG.healthCheckInterval);

  log('info', 'Watcher service started successfully');
}

main().catch(error => {
  log('error', 'Watcher service failed to start', { error: error.message });
  process.exit(1);
});
