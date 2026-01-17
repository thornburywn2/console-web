/**
 * Error Response Sanitization Utility
 *
 * Provides safe error responses that prevent information leakage.
 * Logs full error details internally while returning sanitized messages to clients.
 */

import { createLogger } from '../services/logger.js';

const log = createLogger('error-response');

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credential/i,
  /authorization/i,
  /bearer/i,
  /\/home\/[^/]+/,  // Home directory paths
  /\/Users\/[^/]+/, // macOS paths
  /at\s+\S+\s+\(\S+:\d+:\d+\)/, // Stack traces
  /node_modules/,
  /ENOENT/,
  /EACCES/,
  /EPERM/,
];

/**
 * Check if an error message contains sensitive information
 * @param {string} message - Error message to check
 * @returns {boolean} True if message contains sensitive info
 */
function containsSensitiveInfo(message) {
  if (!message || typeof message !== 'string') return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Generate a unique error reference ID for tracking
 * @returns {string} Error reference ID
 */
function generateErrorRef() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create a safe error response for API endpoints
 *
 * Logs the full error internally and returns a sanitized response.
 * Use this instead of sending error.message directly to clients.
 *
 * @param {Error|string} error - The error object or message
 * @param {Object} options - Options
 * @param {string} options.userMessage - Message to show to users (default: 'An error occurred')
 * @param {Object} options.context - Additional context for logging
 * @param {string} options.requestId - Request ID for correlation
 * @param {string} options.operation - The operation that failed (e.g., 'create session')
 * @returns {{ error: string, errorRef: string, requestId?: string }}
 */
export function safeErrorResponse(error, options = {}) {
  const {
    userMessage = 'An error occurred',
    context = {},
    requestId,
    operation,
  } = options;

  const errorRef = generateErrorRef();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log full error details internally
  log.error({
    errorRef,
    message: errorMessage,
    stack: errorStack,
    operation,
    requestId,
    ...context,
  }, `${operation || 'Operation'} failed`);

  // Build safe response
  const response = {
    error: userMessage,
    errorRef,
  };

  if (requestId) {
    response.requestId = requestId;
  }

  return response;
}

/**
 * Pre-defined safe error responses for common scenarios
 */
export const errorResponses = {
  /**
   * Resource not found
   */
  notFound: (resourceType = 'Resource', options = {}) => ({
    status: 404,
    body: {
      error: `${resourceType} not found`,
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),

  /**
   * Bad request - validation or input errors
   */
  badRequest: (message = 'Invalid request', options = {}) => ({
    status: 400,
    body: {
      error: message,
      ...(options.issues && { issues: options.issues }),
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),

  /**
   * Unauthorized - authentication required
   */
  unauthorized: (options = {}) => ({
    status: 401,
    body: {
      error: 'Authentication required',
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),

  /**
   * Forbidden - not permitted
   */
  forbidden: (options = {}) => ({
    status: 403,
    body: {
      error: 'You do not have permission to perform this action',
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),

  /**
   * Internal server error - catch-all for unexpected errors
   */
  serverError: (error, options = {}) => {
    const safe = safeErrorResponse(error, options);
    return {
      status: 500,
      body: safe,
    };
  },

  /**
   * Service unavailable - during shutdown or maintenance
   */
  serviceUnavailable: (options = {}) => ({
    status: 503,
    body: {
      error: 'Service temporarily unavailable',
      retryAfter: options.retryAfter || 30,
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),

  /**
   * Conflict - resource state conflict
   */
  conflict: (message = 'Resource conflict', options = {}) => ({
    status: 409,
    body: {
      error: message,
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),

  /**
   * Rate limited
   */
  tooManyRequests: (options = {}) => ({
    status: 429,
    body: {
      error: 'Too many requests. Please try again later.',
      retryAfter: options.retryAfter || 60,
      ...(options.requestId && { requestId: options.requestId }),
    },
  }),
};

/**
 * Express error handler middleware factory
 * Creates a safe error handler that sanitizes all error responses
 *
 * @param {Object} options - Options for the error handler
 * @returns {Function} Express error middleware
 */
export function createSafeErrorHandler(options = {}) {
  return (err, req, res, next) => {
    // Skip if headers already sent
    if (res.headersSent) {
      return next(err);
    }

    const { status, body } = errorResponses.serverError(err, {
      requestId: req.id,
      operation: `${req.method} ${req.path}`,
      context: {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
      },
    });

    res.status(status).json(body);
  };
}

/**
 * Helper to send safe error responses in route handlers
 *
 * @example
 * try {
 *   // ... operation
 * } catch (error) {
 *   return sendSafeError(res, error, {
 *     userMessage: 'Failed to create session',
 *     operation: 'create session',
 *     requestId: req.id,
 *   });
 * }
 */
export function sendSafeError(res, error, options = {}) {
  const { status = 500, ...rest } = options;
  const response = safeErrorResponse(error, rest);
  return res.status(status).json(response);
}

export default {
  safeErrorResponse,
  errorResponses,
  createSafeErrorHandler,
  sendSafeError,
  containsSensitiveInfo,
};
