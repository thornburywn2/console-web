/**
 * Structured Logging Service
 *
 * Provides consistent, structured logging across the entire application.
 * Uses pino for high-performance JSON logging with request correlation.
 *
 * Features:
 * - Request correlation IDs (X-Request-ID header support)
 * - Component-specific child loggers
 * - Pretty printing in development
 * - JSON output in production
 * - File logging with rotation support
 * - Log levels: trace, debug, info, warn, error, fatal
 *
 * Usage:
 *   import logger, { createLogger, requestLogger } from './services/logger.js';
 *
 *   // Root logger
 *   logger.info({ data }, 'message');
 *
 *   // Component logger
 *   const log = createLogger('my-component');
 *   log.info('component started');
 *
 *   // Request logger (middleware)
 *   app.use(requestLogger);
 *   // Then in routes: req.log.info('request-specific log');
 */

import pino from 'pino';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV !== 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const LOG_FILE = process.env.LOG_FILE || null;
const LOG_PRETTY = process.env.LOG_PRETTY === 'true' || isDev;

// Ensure log directory exists if file logging is enabled
if (LOG_FILE) {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Build transport configuration
const getTransport = () => {
  const targets = [];

  // Console transport (always enabled)
  if (LOG_PRETTY) {
    targets.push({
      target: 'pino-pretty',
      level: LOG_LEVEL,
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{component} | {msg}',
      },
    });
  } else {
    targets.push({
      target: 'pino/file',
      level: LOG_LEVEL,
      options: { destination: 1 }, // stdout
    });
  }

  // File transport (if configured)
  if (LOG_FILE) {
    targets.push({
      target: 'pino/file',
      level: LOG_LEVEL,
      options: { destination: LOG_FILE },
    });
  }

  return { targets };
};

// Create the root logger
const logger = pino({
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'console-web',
    version: process.env.npm_package_version || '1.0.3',
    env: NODE_ENV,
  },
  transport: getTransport(),
});

// Log startup info
logger.info({
  logLevel: LOG_LEVEL,
  logFile: LOG_FILE || 'none',
  prettyPrint: LOG_PRETTY,
}, 'Logger initialized');

/**
 * Create a child logger for a specific component
 * @param {string} component - Component name (e.g., 'sessions', 'agents', 'socket')
 * @returns {pino.Logger} Child logger instance
 */
export const createLogger = (component) => {
  return logger.child({ component });
};

/**
 * Express middleware for request logging
 * Adds req.id (correlation ID) and req.log (child logger) to each request
 */
export const requestLogger = (req, res, next) => {
  // Generate or use existing request ID
  req.id = req.headers['x-request-id'] || randomUUID();

  // Set request ID in response header for client correlation
  res.setHeader('X-Request-ID', req.id);

  // Create request-scoped child logger
  req.log = logger.child({
    component: 'http',
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']?.substring(0, 100),
  });

  // Track request timing
  const startTime = process.hrtime.bigint();

  // Log request start (debug level to avoid noise)
  req.log.debug({ query: req.query }, 'request started');

  // Log response on finish
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1e6; // ms
    const logData = {
      statusCode: res.statusCode,
      duration: Math.round(duration * 100) / 100,
      contentLength: res.get('content-length'),
    };

    // Choose log level based on status code
    if (res.statusCode >= 500) {
      req.log.error(logData, 'request failed');
    } else if (res.statusCode >= 400) {
      req.log.warn(logData, 'request client error');
    } else if (duration > 1000) {
      req.log.warn(logData, 'slow request');
    } else {
      req.log.info(logData, 'request completed');
    }
  });

  // Handle request errors
  res.on('error', (error) => {
    req.log.error({
      error: error.message,
      stack: error.stack,
    }, 'request error');
  });

  next();
};

/**
 * Socket.IO logging helper
 * Creates a logger for socket connections with socket ID correlation
 * @param {string} socketId - Socket.IO socket ID
 * @param {string} projectPath - Current project path
 * @returns {pino.Logger} Socket-scoped logger
 */
export const createSocketLogger = (socketId, projectPath = null) => {
  return logger.child({
    component: 'socket',
    socketId: socketId.substring(0, 8), // Truncate for readability
    projectPath,
  });
};

/**
 * Database query logging helper
 * @param {string} operation - Operation type (query, insert, update, delete)
 * @param {string} model - Prisma model name
 * @param {number} duration - Query duration in ms
 * @param {boolean} error - Whether query errored
 */
export const logDatabaseQuery = (operation, model, duration, error = false) => {
  const dbLog = logger.child({ component: 'database' });
  const logData = { operation, model, duration };

  if (error) {
    dbLog.error(logData, 'database query failed');
  } else if (duration > 100) {
    dbLog.warn(logData, 'slow database query');
  } else {
    dbLog.debug(logData, 'database query');
  }
};

/**
 * Agent execution logging helper
 * @param {string} agentId - Agent ID
 * @param {string} agentName - Agent name
 * @param {string} event - Event type (start, progress, complete, error)
 * @param {object} data - Additional event data
 */
export const logAgentEvent = (agentId, agentName, event, data = {}) => {
  const agentLog = logger.child({
    component: 'agent',
    agentId,
    agentName,
  });

  switch (event) {
    case 'start':
      agentLog.info(data, 'agent execution started');
      break;
    case 'progress':
      agentLog.debug(data, 'agent progress');
      break;
    case 'complete':
      agentLog.info(data, 'agent execution completed');
      break;
    case 'error':
      agentLog.error(data, 'agent execution failed');
      break;
    default:
      agentLog.debug({ event, ...data }, 'agent event');
  }
};

/**
 * Security event logging helper
 * Use for authentication, authorization, and security-relevant events
 * @param {string} event - Security event type
 * @param {object} data - Event data (user, action, result, etc.)
 */
export const logSecurityEvent = (event, data = {}) => {
  const secLog = logger.child({ component: 'security' });
  secLog.warn({ event, ...data }, `security: ${event}`);
};

/**
 * Startup logging helper
 * @param {object} config - Startup configuration summary
 */
export const logStartup = (config) => {
  const startupLog = logger.child({ component: 'startup' });
  startupLog.info(config, 'application starting');
};

/**
 * Shutdown logging helper
 * @param {string} reason - Shutdown reason
 * @param {object} stats - Final statistics
 */
export const logShutdown = (reason, stats = {}) => {
  const shutdownLog = logger.child({ component: 'shutdown' });
  shutdownLog.info({ reason, ...stats }, 'application shutting down');
};

/**
 * Error logging helper with stack trace handling
 * @param {Error} error - Error object
 * @param {string} context - Error context description
 * @param {object} data - Additional context data
 */
export const logError = (error, context, data = {}) => {
  logger.error({
    component: 'error',
    context,
    error: error.message,
    stack: error.stack,
    code: error.code,
    ...data,
  }, `${context}: ${error.message}`);
};

// Export the root logger as default
export default logger;
