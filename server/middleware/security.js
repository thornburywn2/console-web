/**
 * Security Middleware
 *
 * Provides:
 * - Security headers via helmet
 * - Rate limiting for API protection
 * - Global error handler
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '../services/logger.js';

const log = createLogger('security');

// =============================================================================
// SECURITY HEADERS (Helmet)
// =============================================================================

/**
 * Helmet middleware with CSP configured for xterm.js and Tailwind
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Required for xterm.js
      styleSrc: ["'self'", "'unsafe-inline'"],  // Required for Tailwind CSS
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,  // Required for some integrations
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // Allow cross-origin for API
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP
 * Uses default key generator which properly handles IPv4/IPv6
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,  // 1000 requests per window
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  // Disable all validations - we use default keyGenerator which is safe
  validate: false,
  handler: (req, res, next, options) => {
    log.warn({
      path: req.path,
      method: req.method,
      requestId: req.id,
    }, 'rate limit exceeded');

    res.status(429).json(options.message);
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/api/watcher/health';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per minute per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // 10 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests for this sensitive operation. Please wait.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Disable all validations - we use default keyGenerator which is safe
  validate: false,
  handler: (req, res, next, options) => {
    log.warn({
      path: req.path,
      method: req.method,
      requestId: req.id,
      type: 'strict',
    }, 'strict rate limit exceeded');

    res.status(429).json(options.message);
  },
});

/**
 * Auth rate limiter for authentication endpoints
 * 10 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,  // 10 attempts
  message: {
    error: 'Too many authentication attempts',
    message: 'Please wait before trying again.',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Disable all validations - we use default keyGenerator which is safe
  validate: false,
  handler: (req, res, next, options) => {
    log.warn({
      path: req.path,
      requestId: req.id,
      type: 'auth',
    }, 'auth rate limit exceeded');

    res.status(429).json(options.message);
  },
});

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================

/**
 * Global error handler middleware
 * Must be registered LAST in the middleware chain
 */
export const globalErrorHandler = (error, req, res, next) => {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(error);
  }

  // Determine status code
  const statusCode = error.status || error.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log the error
  const logData = {
    error: error.message,
    path: req.path,
    method: req.method,
    requestId: req.id,
    ip: req.ip,
    statusCode,
  };

  if (isServerError) {
    // Include stack trace for server errors
    logData.stack = error.stack;
    log.error(logData, 'unhandled server error');
  } else {
    log.warn(logData, 'client error');
  }

  // Send error response
  res.status(statusCode).json({
    error: isServerError ? 'Internal server error' : error.message,
    message: isServerError
      ? 'An unexpected error occurred. Please try again later.'
      : error.message,
    requestId: req.id,
    ...(process.env.NODE_ENV !== 'production' && isServerError && {
      // Include stack trace in non-production environments
      stack: error.stack,
    }),
  });
};

/**
 * 404 Not Found handler
 * Register after all routes
 */
export const notFoundHandler = (req, res) => {
  log.debug({
    path: req.path,
    method: req.method,
    requestId: req.id,
  }, 'route not found');

  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    requestId: req.id,
  });
};

// =============================================================================
// REQUEST SIZE LIMITS
// =============================================================================

/**
 * JSON body size limit middleware
 * Prevents large payload attacks
 */
export const jsonSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = parseSize(limit);

    if (contentLength > maxSize) {
      log.warn({
        contentLength,
        maxSize,
        path: req.path,
        requestId: req.id,
      }, 'request body too large');

      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds maximum size of ${limit}`,
        requestId: req.id,
      });
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size) {
  if (typeof size === 'number') return size;

  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const num = parseInt(match[1], 10);
  const unit = match[2] || 'b';

  return num * units[unit];
}

export default {
  securityHeaders,
  apiRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  globalErrorHandler,
  notFoundHandler,
  jsonSizeLimit,
};
