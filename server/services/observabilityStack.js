/**
 * Observability Stack Management Service
 *
 * Manages the lifecycle of the observability stack (Jaeger, Loki, Promtail)
 * via Docker Compose in the monitoring/ directory.
 */

import { execSync, exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import Docker from 'dockerode';
import { createLogger } from './logger.js';

const log = createLogger('observability-stack');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to monitoring docker-compose.yml
const MONITORING_DIR = join(__dirname, '../../monitoring');
const COMPOSE_FILE = join(MONITORING_DIR, 'docker-compose.yml');

// Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Service endpoints (localhost only)
const SERVICES = {
  jaeger: {
    name: 'Jaeger',
    container: 'console-web-jaeger',
    uiPort: 16686,
    queryPort: 16686,
    otlpGrpcPort: 4317,
    otlpHttpPort: 4318,
    healthEndpoint: '/',
  },
  loki: {
    name: 'Loki',
    container: 'console-web-loki',
    port: 3100,
    healthEndpoint: '/ready',
    queryEndpoint: '/loki/api/v1',
  },
  promtail: {
    name: 'Promtail',
    container: 'console-web-promtail',
    port: 9080,
    healthEndpoint: '/ready',
  },
};

/**
 * Check if docker-compose file exists
 */
export function isStackConfigured() {
  return existsSync(COMPOSE_FILE);
}

/**
 * Get the status of all observability containers
 *
 * @returns {Promise<Object>} Container statuses
 */
export async function getStackStatus() {
  if (!isStackConfigured()) {
    return {
      configured: false,
      services: {},
      message: 'Observability stack not configured. Missing docker-compose.yml in monitoring/',
    };
  }

  const services = {};

  for (const [key, config] of Object.entries(SERVICES)) {
    try {
      const container = docker.getContainer(config.container);
      const info = await container.inspect();

      const state = info.State;
      const stats = await container.stats({ stream: false });

      services[key] = {
        name: config.name,
        container: config.container,
        status: state.Status,
        running: state.Running,
        health: state.Health?.Status || 'unknown',
        startedAt: state.StartedAt,
        uptime: state.Running ? calculateUptime(state.StartedAt) : null,
        ports: config.port || config.uiPort,
        cpu: calculateCpuPercent(stats),
        memory: {
          used: stats.memory_stats?.usage || 0,
          limit: stats.memory_stats?.limit || 0,
          percent: stats.memory_stats?.limit
            ? ((stats.memory_stats.usage / stats.memory_stats.limit) * 100).toFixed(2)
            : 0,
        },
      };
    } catch (error) {
      if (error.statusCode === 404) {
        services[key] = {
          name: config.name,
          container: config.container,
          status: 'not_found',
          running: false,
          message: 'Container not created',
        };
      } else {
        log.error({ service: key, error: error.message }, 'Error getting container status');
        services[key] = {
          name: config.name,
          container: config.container,
          status: 'error',
          running: false,
          error: error.message,
        };
      }
    }
  }

  const runningCount = Object.values(services).filter(s => s.running).length;
  const totalCount = Object.keys(SERVICES).length;

  return {
    configured: true,
    healthy: runningCount === totalCount,
    running: runningCount,
    total: totalCount,
    services,
  };
}

/**
 * Start the observability stack
 *
 * @returns {Promise<Object>} Start result
 */
export async function startObservabilityStack() {
  if (!isStackConfigured()) {
    throw new Error('Observability stack not configured');
  }

  log.info('Starting observability stack...');

  try {
    const result = execSync('docker compose up -d', {
      cwd: MONITORING_DIR,
      encoding: 'utf-8',
      timeout: 120000, // 2 minute timeout
    });

    log.info('Observability stack started');

    // Wait for health checks
    await waitForHealthy(30000);

    return {
      success: true,
      message: 'Observability stack started successfully',
      output: result,
    };
  } catch (error) {
    log.error({ error: error.message }, 'Failed to start observability stack');
    throw new Error(`Failed to start stack: ${error.message}`);
  }
}

/**
 * Stop the observability stack
 *
 * @returns {Promise<Object>} Stop result
 */
export async function stopObservabilityStack() {
  if (!isStackConfigured()) {
    throw new Error('Observability stack not configured');
  }

  log.info('Stopping observability stack...');

  try {
    const result = execSync('docker compose down', {
      cwd: MONITORING_DIR,
      encoding: 'utf-8',
      timeout: 60000,
    });

    log.info('Observability stack stopped');

    return {
      success: true,
      message: 'Observability stack stopped successfully',
      output: result,
    };
  } catch (error) {
    log.error({ error: error.message }, 'Failed to stop observability stack');
    throw new Error(`Failed to stop stack: ${error.message}`);
  }
}

/**
 * Restart the observability stack
 *
 * @returns {Promise<Object>} Restart result
 */
export async function restartObservabilityStack() {
  if (!isStackConfigured()) {
    throw new Error('Observability stack not configured');
  }

  log.info('Restarting observability stack...');

  try {
    const result = execSync('docker compose restart', {
      cwd: MONITORING_DIR,
      encoding: 'utf-8',
      timeout: 120000,
    });

    log.info('Observability stack restarted');

    await waitForHealthy(30000);

    return {
      success: true,
      message: 'Observability stack restarted successfully',
      output: result,
    };
  } catch (error) {
    log.error({ error: error.message }, 'Failed to restart observability stack');
    throw new Error(`Failed to restart stack: ${error.message}`);
  }
}

/**
 * Wait for all services to be healthy
 *
 * @param {number} timeout - Timeout in ms
 */
async function waitForHealthy(timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getStackStatus();
    if (status.healthy) {
      log.info('All observability services healthy');
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  log.warn('Timeout waiting for observability stack health');
  return false;
}

/**
 * Calculate container uptime
 */
function calculateUptime(startedAt) {
  const started = new Date(startedAt);
  const now = new Date();
  const diffMs = now - started;

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Calculate CPU percentage from container stats
 */
function calculateCpuPercent(stats) {
  try {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0) {
      return ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2);
    }
  } catch {
    // Ignore calculation errors
  }
  return '0.00';
}

/**
 * Get service endpoints for UI
 */
export function getServiceEndpoints() {
  return {
    jaeger: {
      ui: `http://localhost:${SERVICES.jaeger.uiPort}`,
      api: `http://localhost:${SERVICES.jaeger.queryPort}/api`,
    },
    loki: {
      api: `http://localhost:${SERVICES.loki.port}${SERVICES.loki.queryEndpoint}`,
    },
    promtail: {
      metrics: `http://localhost:${SERVICES.promtail.port}/metrics`,
    },
  };
}

export default {
  isStackConfigured,
  getStackStatus,
  startObservabilityStack,
  stopObservabilityStack,
  restartObservabilityStack,
  getServiceEndpoints,
  SERVICES,
};
