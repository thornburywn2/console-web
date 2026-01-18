/**
 * Resource Quotas & Rate Limiting Middleware
 * Phase 5: Enterprise Mission Control
 *
 * Provides:
 * - Resource quota enforcement (sessions, agents, prompts, etc.)
 * - Per-user rate limiting with sliding window
 * - API key authentication and rate limiting
 */

import { createLogger } from '../services/logger.js';
import crypto from 'crypto';

const log = createLogger('quotas');

// Default quotas by role (used when no user-specific quota exists)
const DEFAULT_QUOTAS = {
  SUPER_ADMIN: {
    maxActiveSessions: 100,
    maxTotalSessions: 1000,
    maxActiveAgents: 50,
    maxTotalAgents: 200,
    maxPromptsLibrary: 1000,
    maxSnippets: 1000,
    maxFolders: 100,
    apiRateLimit: 1000,
    agentRunsPerHour: 100,
    maxStorageBytes: 0, // unlimited
  },
  ADMIN: {
    maxActiveSessions: 20,
    maxTotalSessions: 200,
    maxActiveAgents: 10,
    maxTotalAgents: 50,
    maxPromptsLibrary: 500,
    maxSnippets: 500,
    maxFolders: 50,
    apiRateLimit: 300,
    agentRunsPerHour: 30,
    maxStorageBytes: 10737418240, // 10GB
  },
  USER: {
    maxActiveSessions: 5,
    maxTotalSessions: 50,
    maxActiveAgents: 3,
    maxTotalAgents: 20,
    maxPromptsLibrary: 100,
    maxSnippets: 100,
    maxFolders: 20,
    apiRateLimit: 60,
    agentRunsPerHour: 10,
    maxStorageBytes: 1073741824, // 1GB
  },
  VIEWER: {
    maxActiveSessions: 0,
    maxTotalSessions: 0,
    maxActiveAgents: 0,
    maxTotalAgents: 0,
    maxPromptsLibrary: 0,
    maxSnippets: 0,
    maxFolders: 0,
    apiRateLimit: 30,
    agentRunsPerHour: 0,
    maxStorageBytes: 0,
  },
};

/**
 * Get user's quota (user-specific or role default)
 */
export async function getUserQuota(prisma, userId, role = 'USER') {
  // Try to find user-specific quota
  if (userId) {
    const userQuota = await prisma.resourceQuota.findUnique({
      where: { userId },
    });
    if (userQuota) return userQuota;
  }

  // Try to find role default quota from database
  const roleQuota = await prisma.resourceQuota.findFirst({
    where: { role, userId: null },
  });
  if (roleQuota) return roleQuota;

  // Fall back to hardcoded defaults
  return DEFAULT_QUOTAS[role] || DEFAULT_QUOTAS.USER;
}

/**
 * Get current usage counts for a user
 */
export async function getUserUsage(prisma, userId) {
  const [
    activeSessions,
    totalSessions,
    activeAgents,
    totalAgents,
    prompts,
    snippets,
    folders,
  ] = await Promise.all([
    prisma.session.count({
      where: {
        ownerId: userId,
        status: { in: ['ACTIVE', 'IDLE'] },
      },
    }),
    prisma.session.count({
      where: { ownerId: userId },
    }),
    prisma.agentExecution.count({
      where: {
        agent: { ownerId: userId },
        status: 'RUNNING',
      },
    }),
    prisma.agent.count({
      where: { ownerId: userId },
    }),
    prisma.prompt.count({
      where: { ownerId: userId },
    }),
    prisma.commandSnippet.count({
      where: { ownerId: userId },
    }),
    prisma.sessionFolder.count({
      where: { ownerId: userId },
    }),
  ]);

  return {
    activeSessions,
    totalSessions,
    activeAgents,
    totalAgents,
    prompts,
    snippets,
    folders,
  };
}

/**
 * Check if user is within quota for a specific resource
 */
export async function checkQuota(prisma, userId, role, resource) {
  const quota = await getUserQuota(prisma, userId, role);
  const usage = await getUserUsage(prisma, userId);

  const quotaMap = {
    session: { current: usage.activeSessions, max: quota.maxActiveSessions, name: 'active sessions' },
    sessionTotal: { current: usage.totalSessions, max: quota.maxTotalSessions, name: 'total sessions' },
    agent: { current: usage.totalAgents, max: quota.maxTotalAgents, name: 'agents' },
    agentRun: { current: usage.activeAgents, max: quota.maxActiveAgents, name: 'running agents' },
    prompt: { current: usage.prompts, max: quota.maxPromptsLibrary, name: 'prompts' },
    snippet: { current: usage.snippets, max: quota.maxSnippets, name: 'snippets' },
    folder: { current: usage.folders, max: quota.maxFolders, name: 'folders' },
  };

  const limit = quotaMap[resource];
  if (!limit) return { allowed: true };

  // 0 max means unlimited for admins, denied for others
  if (limit.max === 0 && role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  if (limit.max === 0) {
    return {
      allowed: false,
      reason: `${limit.name} creation is not allowed for your role`,
      current: limit.current,
      max: limit.max,
    };
  }

  if (limit.current >= limit.max) {
    return {
      allowed: false,
      reason: `Quota exceeded: ${limit.current}/${limit.max} ${limit.name}`,
      current: limit.current,
      max: limit.max,
    };
  }

  return {
    allowed: true,
    current: limit.current,
    max: limit.max,
    remaining: limit.max - limit.current,
  };
}

/**
 * Middleware: Enforce resource quota
 *
 * Usage:
 *   router.post('/sessions', enforceQuota('session'), handler)
 */
export function enforceQuota(prisma, resource) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    const userRole = req.dbUser?.role || 'USER';

    // Skip quota check for super admins
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    // Skip if no user (anonymous/unauthenticated)
    if (!userId) {
      return next();
    }

    try {
      const result = await checkQuota(prisma, userId, userRole, resource);

      if (!result.allowed) {
        log.warn({
          userId,
          userRole,
          resource,
          current: result.current,
          max: result.max,
        }, 'quota exceeded');

        return res.status(429).json({
          error: 'Quota exceeded',
          message: result.reason,
          quota: {
            resource,
            current: result.current,
            max: result.max,
          },
        });
      }

      // Attach quota info to request for downstream use
      req.quotaInfo = result;
      next();
    } catch (error) {
      log.error({ error: error.message }, 'quota check failed');
      // Don't block on quota check errors
      next();
    }
  };
}

// ============================================
// Rate Limiting
// ============================================

// In-memory rate limit cache (for performance)
const rateLimitCache = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now - entry.windowStart > 120000) { // 2 minutes old
      rateLimitCache.delete(key);
    }
  }
}, 60000);

/**
 * Check rate limit using sliding window algorithm
 */
export async function checkRateLimit(prisma, identifier, limit, windowMs = 60000) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const cacheKey = `${identifier}:${windowStart}`;

  // Check in-memory cache first
  let entry = rateLimitCache.get(cacheKey);

  if (!entry) {
    // Try database
    try {
      const dbEntry = await prisma.rateLimitEntry.findFirst({
        where: {
          identifier,
          windowStart: new Date(windowStart),
        },
      });

      entry = dbEntry ? {
        windowStart,
        requestCount: dbEntry.requestCount,
      } : {
        windowStart,
        requestCount: 0,
      };

      rateLimitCache.set(cacheKey, entry);
    } catch (error) {
      // Fall back to cache only
      entry = { windowStart, requestCount: 0 };
      rateLimitCache.set(cacheKey, entry);
    }
  }

  // Check if over limit
  if (entry.requestCount >= limit) {
    const resetTime = windowStart + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(resetTime),
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }

  // Increment count
  entry.requestCount++;
  rateLimitCache.set(cacheKey, entry);

  // Update database asynchronously
  prisma.rateLimitEntry.upsert({
    where: {
      identifier_windowStart: {
        identifier,
        windowStart: new Date(windowStart),
      },
    },
    update: {
      requestCount: entry.requestCount,
      lastRequest: new Date(),
    },
    create: {
      identifier,
      windowStart: new Date(windowStart),
      requestCount: entry.requestCount,
      lastRequest: new Date(),
    },
  }).catch(err => {
    log.error({ error: err.message }, 'rate limit db update failed');
  });

  return {
    allowed: true,
    remaining: limit - entry.requestCount,
    resetAt: new Date(windowStart + windowMs),
  };
}

/**
 * Middleware: Per-user rate limiting
 *
 * Usage:
 *   app.use(perUserRateLimit(prisma))  // Global rate limit
 *   router.post('/expensive', perUserRateLimit(prisma, 10), handler)  // Custom limit
 */
export function perUserRateLimit(prisma, customLimit = null) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    const userRole = req.dbUser?.role || 'USER';

    // Use IP for anonymous users
    const identifier = userId || req.ip || 'anonymous';

    // Get user's rate limit
    let limit = customLimit;
    if (!limit) {
      const quota = await getUserQuota(prisma, userId, userRole);
      limit = quota.apiRateLimit || 60;
    }

    try {
      const result = await checkRateLimit(prisma, identifier, limit);

      // Set rate limit headers
      res.set('X-RateLimit-Limit', limit);
      res.set('X-RateLimit-Remaining', result.remaining);
      res.set('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);

        log.warn({
          identifier,
          limit,
          resetAt: result.resetAt,
        }, 'rate limit exceeded');

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
          resetAt: result.resetAt,
        });
      }

      next();
    } catch (error) {
      log.error({ error: error.message }, 'rate limit check failed');
      // Don't block on rate limit errors
      next();
    }
  };
}

// ============================================
// API Key Authentication
// ============================================

/**
 * Generate a new API key
 * Returns: { key: 'cw_live_xxxx...', keyHash: 'sha256hash', keyPrefix: 'cw_live_' }
 */
export function generateApiKey() {
  const prefix = 'cw_live_';
  const randomPart = crypto.randomBytes(32).toString('hex');
  const key = `${prefix}${randomPart}`;
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  return {
    key,           // Return to user ONCE, never store
    keyHash,       // Store in database
    keyPrefix: prefix,
  };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Middleware: API key authentication
 * Checks Authorization header for Bearer token or X-API-Key header
 */
export function apiKeyAuth(prisma) {
  return async (req, res, next) => {
    // Skip if already authenticated via session
    if (req.user) {
      return next();
    }

    // Check for API key in headers
    const authHeader = req.get('Authorization');
    const apiKeyHeader = req.get('X-API-Key');

    let apiKey = null;
    if (authHeader?.startsWith('Bearer cw_')) {
      apiKey = authHeader.slice(7);
    } else if (apiKeyHeader?.startsWith('cw_')) {
      apiKey = apiKeyHeader;
    }

    if (!apiKey) {
      return next(); // No API key, continue to other auth methods
    }

    try {
      const keyHash = hashApiKey(apiKey);

      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
      });

      if (!apiKeyRecord) {
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      }

      // Check if revoked
      if (apiKeyRecord.revokedAt) {
        return res.status(401).json({
          error: 'API key revoked',
          message: 'This API key has been revoked',
        });
      }

      // Check if expired
      if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
        return res.status(401).json({
          error: 'API key expired',
          message: 'This API key has expired',
        });
      }

      // Check IP whitelist
      if (apiKeyRecord.ipWhitelist.length > 0) {
        const clientIp = req.ip || req.connection?.remoteAddress;
        if (!apiKeyRecord.ipWhitelist.includes(clientIp)) {
          log.warn({
            keyPrefix: apiKeyRecord.keyPrefix,
            clientIp,
            whitelist: apiKeyRecord.ipWhitelist,
          }, 'API key IP not whitelisted');

          return res.status(403).json({
            error: 'IP not allowed',
            message: 'Your IP address is not authorized for this API key',
          });
        }
      }

      // Update usage stats asynchronously
      prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      }).catch(err => {
        log.error({ error: err.message }, 'failed to update API key usage');
      });

      // Get user info for the key owner
      const user = await prisma.user.findUnique({
        where: { id: apiKeyRecord.userId },
      });

      // Set req.user for downstream middleware
      req.user = {
        id: apiKeyRecord.userId,
        email: user?.email,
        name: user?.name,
        role: user?.role || 'USER',
      };
      req.dbUser = user;
      req.apiKey = {
        id: apiKeyRecord.id,
        scopes: apiKeyRecord.scopes,
        rateLimit: apiKeyRecord.rateLimit,
      };

      next();
    } catch (error) {
      log.error({ error: error.message }, 'API key auth failed');
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to validate API key',
      });
    }
  };
}

/**
 * Middleware: Check API key scope
 *
 * Usage:
 *   router.post('/agents', requireScope('agents'), handler)
 */
export function requireScope(scope) {
  return (req, res, next) => {
    // Skip if not API key auth
    if (!req.apiKey) {
      return next();
    }

    const scopes = req.apiKey.scopes || [];

    // Admin scope grants all access
    if (scopes.includes('admin')) {
      return next();
    }

    // Check specific scope
    if (!scopes.includes(scope)) {
      return res.status(403).json({
        error: 'Insufficient scope',
        message: `This API key does not have the '${scope}' scope`,
        required: scope,
        current: scopes,
      });
    }

    next();
  };
}

export default {
  getUserQuota,
  getUserUsage,
  checkQuota,
  enforceQuota,
  checkRateLimit,
  perUserRateLimit,
  generateApiKey,
  hashApiKey,
  apiKeyAuth,
  requireScope,
  DEFAULT_QUOTAS,
};
