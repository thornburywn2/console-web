/**
 * Sentry Error Tracking Service (Backend)
 *
 * Provides centralized error tracking, performance monitoring, and
 * contextual error reporting for production debugging.
 */

import * as Sentry from '@sentry/node';
import { createLogger } from './logger.js';

const log = createLogger('sentry');

/**
 * Sensitive data patterns to filter from Sentry reports
 */
const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
];

/**
 * Check if Sentry is configured and enabled
 */
export function isSentryEnabled() {
  return Boolean(process.env.SENTRY_DSN);
}

/**
 * Initialize Sentry for the backend
 * Call this before any other middleware in server/index.js
 *
 * @param {Object} options - Sentry configuration options
 */
export function initSentry(options = {}) {
  if (!isSentryEnabled()) {
    log.info('Sentry disabled - SENTRY_DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || 'unknown',
      serverName: process.env.HOSTNAME || 'console-web',

      // Performance monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      // Only send errors in production by default
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

      // Data filtering
      beforeSend(event, hint) {
        // Filter sensitive data from event
        if (event.request?.data) {
          event.request.data = filterSensitiveData(event.request.data);
        }
        if (event.request?.headers) {
          event.request.headers = filterSensitiveData(event.request.headers);
        }
        if (event.extra) {
          event.extra = filterSensitiveData(event.extra);
        }

        // Don't send expected errors (4xx responses)
        const originalException = hint?.originalException;
        if (originalException?.statusCode && originalException.statusCode < 500) {
          return null;
        }

        return event;
      },

      // Ignore common non-actionable errors
      ignoreErrors: [
        // Network errors
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EPIPE',
        // Client disconnection
        'Client network socket disconnected',
        'socket hang up',
        // Rate limiting
        'Too many requests',
      ],

      ...options,
    });

    log.info({
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    }, 'Sentry initialized successfully');
  } catch (error) {
    log.error({ error: error.message }, 'Failed to initialize Sentry');
  }
}

/**
 * Filter sensitive data from objects before sending to Sentry
 */
function filterSensitiveData(obj, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => filterSensitiveData(item, depth + 1));
  }

  const filtered = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      filtered[key] = '[FILTERED]';
    } else if (typeof value === 'object') {
      filtered[key] = filterSensitiveData(value, depth + 1);
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Sentry request handler middleware
 * Add this BEFORE all other middleware
 */
export function sentryRequestHandler() {
  if (!isSentryEnabled()) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler({
    user: ['id', 'username', 'email'],
    ip: true,
  });
}

/**
 * Sentry tracing handler middleware
 * Add this AFTER request handler but BEFORE routes
 */
export function sentryTracingHandler() {
  if (!isSentryEnabled()) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Sentry error handler middleware
 * Add this AFTER all routes but BEFORE your global error handler
 */
export function sentryErrorHandler() {
  if (!isSentryEnabled()) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only report 500+ errors
      if (error.statusCode) {
        return error.statusCode >= 500;
      }
      return true;
    },
  });
}

/**
 * Capture an exception manually
 *
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context
 */
export function captureException(error, context = {}) {
  if (!isSentryEnabled()) {
    log.error({ error: error.message, ...context }, 'Error captured (Sentry disabled)');
    return;
  }

  Sentry.withScope((scope) => {
    // Add context
    if (context.user) {
      scope.setUser(context.user);
    }
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      scope.setExtras(filterSensitiveData(context.extra));
    }
    if (context.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a message manually
 *
 * @param {string} message - The message to capture
 * @param {string} level - Sentry level (info, warning, error)
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!isSentryEnabled()) {
    log.info({ message, level, ...context }, 'Message captured (Sentry disabled)');
    return;
  }

  Sentry.withScope((scope) => {
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      scope.setExtras(filterSensitiveData(context.extra));
    }

    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for Sentry
 */
export function setUser(user) {
  if (!isSentryEnabled()) return;
  Sentry.setUser(user ? {
    id: user.id,
    username: user.username,
    email: user.email,
  } : null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb) {
  if (!isSentryEnabled()) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a performance transaction
 */
export function startTransaction(options) {
  if (!isSentryEnabled()) {
    return {
      finish: () => {},
      startChild: () => ({ finish: () => {} }),
    };
  }
  return Sentry.startTransaction(options);
}

/**
 * Flush Sentry events before shutdown
 */
export async function flush(timeout = 2000) {
  if (!isSentryEnabled()) return;
  try {
    await Sentry.flush(timeout);
    log.info('Sentry events flushed');
  } catch (error) {
    log.warn({ error: error.message }, 'Failed to flush Sentry events');
  }
}

export default {
  initSentry,
  isSentryEnabled,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  flush,
};
