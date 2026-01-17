/**
 * Rate Limiting Middleware
 * Protects high-risk endpoints from abuse
 *
 * @security This module is critical for preventing DoS and brute-force attacks
 */

import rateLimit from 'express-rate-limit';
import { createLogger, logSecurityEvent } from '../services/logger.js';

const log = createLogger('rate-limit');

/**
 * Default rate limit handler - logs security events
 */
function createLimitHandler(endpointType) {
  return (req, res) => {
    logSecurityEvent({
      event: 'rate_limit_exceeded',
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      type: endpointType
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down and try again later',
      retryAfter: res.getHeader('Retry-After')
    });
  };
}

/**
 * Standard rate limiter for general API endpoints
 * 100 requests per minute per IP
 */
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  handler: createLimitHandler('standard')
});

/**
 * Strict rate limiter for authentication endpoints
 * 10 attempts per minute per IP
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts' },
  handler: createLimitHandler('auth')
});

/**
 * Database query rate limiter
 * 30 queries per minute per IP
 */
export const dbQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many database queries' },
  handler: createLimitHandler('database')
});

/**
 * Destructive operations rate limiter (firewall, users, services)
 * 20 operations per minute per IP
 */
export const destructiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many system modification requests' },
  handler: createLimitHandler('destructive')
});

/**
 * Network diagnostics rate limiter (ping, DNS, port check)
 * 30 requests per minute per IP
 */
export const networkDiagLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many network diagnostic requests' },
  handler: createLimitHandler('network')
});

/**
 * File operations rate limiter
 * 50 operations per minute per IP
 */
export const fileLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many file operations' },
  handler: createLimitHandler('file')
});

/**
 * Security scan rate limiter
 * 5 scans per 5 minutes per IP
 */
export const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many security scan requests' },
  handler: createLimitHandler('scan')
});

/**
 * Cloudflare operations rate limiter
 * 10 operations per minute per IP (affects external API)
 */
export const cloudflareLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many Cloudflare API requests' },
  handler: createLimitHandler('cloudflare')
});

/**
 * AI/LLM operations rate limiter
 * 20 requests per minute per IP
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests' },
  handler: createLimitHandler('ai')
});

export default {
  standardLimiter,
  authLimiter,
  dbQueryLimiter,
  destructiveLimiter,
  networkDiagLimiter,
  fileLimiter,
  scanLimiter,
  cloudflareLimiter,
  aiLimiter
};
