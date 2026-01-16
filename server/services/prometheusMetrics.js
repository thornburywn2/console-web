/**
 * Prometheus Metrics Service
 *
 * Exports application metrics in Prometheus format for monitoring and alerting.
 * Integrates with Grafana dashboards for visualization.
 */

import promClient from 'prom-client';
import { createLogger } from './logger.js';

const log = createLogger('prometheus');

// Initialize default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({
  prefix: 'consoleweb_',
  labels: { app: 'console-web' },
});

// =============================================================================
// CUSTOM METRICS
// =============================================================================

/**
 * HTTP Request Duration Histogram
 * Tracks request latency by method, route, and status code
 */
export const httpRequestDuration = new promClient.Histogram({
  name: 'consoleweb_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/**
 * HTTP Request Counter
 * Counts total requests by method, route, and status
 */
export const httpRequestTotal = new promClient.Counter({
  name: 'consoleweb_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

/**
 * Active HTTP Connections Gauge
 */
export const activeConnections = new promClient.Gauge({
  name: 'consoleweb_active_connections',
  help: 'Number of active HTTP connections',
});

/**
 * WebSocket Connections Gauge
 */
export const websocketConnections = new promClient.Gauge({
  name: 'consoleweb_websocket_connections',
  help: 'Number of active WebSocket connections',
});

/**
 * Terminal Sessions Gauge
 */
export const terminalSessions = new promClient.Gauge({
  name: 'consoleweb_terminal_sessions',
  help: 'Number of active terminal sessions',
});

/**
 * Database Query Duration Histogram
 */
export const dbQueryDuration = new promClient.Histogram({
  name: 'consoleweb_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

/**
 * Database Query Counter
 */
export const dbQueryTotal = new promClient.Counter({
  name: 'consoleweb_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'success'],
});

/**
 * Slow Query Counter
 */
export const slowQueryTotal = new promClient.Counter({
  name: 'consoleweb_slow_queries_total',
  help: 'Total number of slow database queries (>100ms)',
  labelNames: ['operation', 'model'],
});

/**
 * Agent Execution Counter
 */
export const agentExecutions = new promClient.Counter({
  name: 'consoleweb_agent_executions_total',
  help: 'Total number of agent executions',
  labelNames: ['agent_name', 'status'],
});

/**
 * Agent Execution Duration Histogram
 */
export const agentExecutionDuration = new promClient.Histogram({
  name: 'consoleweb_agent_execution_duration_seconds',
  help: 'Duration of agent executions in seconds',
  labelNames: ['agent_name'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
});

/**
 * Docker Container Status Gauge
 */
export const dockerContainers = new promClient.Gauge({
  name: 'consoleweb_docker_containers',
  help: 'Number of Docker containers by status',
  labelNames: ['status'],
});

/**
 * Git Operations Counter
 */
export const gitOperations = new promClient.Counter({
  name: 'consoleweb_git_operations_total',
  help: 'Total number of git operations',
  labelNames: ['operation', 'success'],
});

/**
 * Error Counter by Type
 */
export const errorTotal = new promClient.Counter({
  name: 'consoleweb_errors_total',
  help: 'Total number of errors by type',
  labelNames: ['type', 'component'],
});

/**
 * Rate Limit Hit Counter
 */
export const rateLimitHits = new promClient.Counter({
  name: 'consoleweb_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limiter_type', 'path'],
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Express middleware to track HTTP metrics
 */
export const metricsMiddleware = (req, res, next) => {
  // Skip metrics endpoint to avoid recursion
  if (req.path === '/metrics') {
    return next();
  }

  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    activeConnections.dec();

    // Normalize route for metrics (replace dynamic segments)
    const route = normalizeRoute(req.route?.path || req.path);

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    end(labels);
    httpRequestTotal.inc(labels);

    // Track errors
    if (res.statusCode >= 500) {
      errorTotal.inc({ type: 'http_5xx', component: 'http' });
    } else if (res.statusCode >= 400) {
      errorTotal.inc({ type: 'http_4xx', component: 'http' });
    }
  });

  next();
};

/**
 * Normalize route path for consistent metric labels
 * Replaces dynamic segments like :id with {id}
 */
function normalizeRoute(path) {
  if (!path) return 'unknown';

  return path
    // Replace :param with {param}
    .replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
    // Replace UUIDs with {uuid}
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
    // Replace numeric IDs with {id}
    .replace(/\/\d+(?=\/|$)/g, '/{id}')
    // Truncate long paths
    .substring(0, 100);
}

// =============================================================================
// PRISMA METRICS EXTENSION
// =============================================================================

/**
 * Create Prisma middleware for query metrics
 * Add this to your Prisma client: prisma.$use(prismaMetricsMiddleware)
 */
export const prismaMetricsMiddleware = async (params, next) => {
  const start = Date.now();
  const model = params.model || 'unknown';
  const operation = params.action || 'unknown';

  try {
    const result = await next(params);
    const duration = (Date.now() - start) / 1000;

    // Record metrics
    dbQueryDuration.observe({ operation, model }, duration);
    dbQueryTotal.inc({ operation, model, success: 'true' });

    // Track slow queries (>100ms)
    if (duration > 0.1) {
      slowQueryTotal.inc({ operation, model });
      log.warn({
        model,
        operation,
        duration: Math.round(duration * 1000),
        args: JSON.stringify(params.args).substring(0, 200),
      }, 'slow database query detected');
    }

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, model }, duration);
    dbQueryTotal.inc({ operation, model, success: 'false' });
    errorTotal.inc({ type: 'database', component: model });
    throw error;
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Record WebSocket connection change
 */
export function recordWebSocketConnection(connected) {
  if (connected) {
    websocketConnections.inc();
  } else {
    websocketConnections.dec();
  }
}

/**
 * Record terminal session change
 */
export function recordTerminalSession(active) {
  if (active) {
    terminalSessions.inc();
  } else {
    terminalSessions.dec();
  }
}

/**
 * Record agent execution
 */
export function recordAgentExecution(agentName, status, durationSeconds) {
  agentExecutions.inc({ agent_name: agentName, status });
  if (durationSeconds !== undefined) {
    agentExecutionDuration.observe({ agent_name: agentName }, durationSeconds);
  }
}

/**
 * Record Docker container counts
 */
export function recordDockerContainers(running, stopped, paused) {
  dockerContainers.set({ status: 'running' }, running);
  dockerContainers.set({ status: 'stopped' }, stopped);
  dockerContainers.set({ status: 'paused' }, paused);
}

/**
 * Record git operation
 */
export function recordGitOperation(operation, success) {
  gitOperations.inc({ operation, success: success ? 'true' : 'false' });
}

/**
 * Record rate limit hit
 */
export function recordRateLimitHit(limiterType, path) {
  rateLimitHits.inc({ limiter_type: limiterType, path: normalizeRoute(path) });
}

// =============================================================================
// METRICS ENDPOINT HANDLER
// =============================================================================

/**
 * Express route handler for /metrics endpoint
 */
export async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.send(metrics);
  } catch (error) {
    log.error({ error: error.message }, 'failed to collect metrics');
    res.status(500).send('Error collecting metrics');
  }
}

/**
 * Get metrics as JSON (for internal use)
 */
export async function getMetricsJson() {
  return promClient.register.getMetricsAsJSON();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  promClient.register.resetMetrics();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Metrics
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  websocketConnections,
  terminalSessions,
  dbQueryDuration,
  dbQueryTotal,
  slowQueryTotal,
  agentExecutions,
  agentExecutionDuration,
  dockerContainers,
  gitOperations,
  errorTotal,
  rateLimitHits,

  // Middleware
  metricsMiddleware,
  prismaMetricsMiddleware,

  // Helpers
  recordWebSocketConnection,
  recordTerminalSession,
  recordAgentExecution,
  recordDockerContainers,
  recordGitOperation,
  recordRateLimitHit,

  // Handlers
  metricsHandler,
  getMetricsJson,
  resetMetrics,

  // Registry
  register: promClient.register,
};
