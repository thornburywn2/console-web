/**
 * Resource Quotas & API Keys Routes
 * Phase 5: Enterprise Mission Control
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';
import { requireAdmin, requireSuperAdmin, auditLog } from '../middleware/rbac.js';
import {
  getUserQuota,
  getUserUsage,
  generateApiKey,
  hashApiKey,
  DEFAULT_QUOTAS,
} from '../middleware/quotas.js';

const log = createLogger('quotas');

export function createQuotasRouter(prisma) {
  const router = Router();

  // ============================================
  // USER QUOTA ENDPOINTS (Self-service)
  // ============================================

  /**
   * Get current user's quota and usage
   * GET /api/quotas/me
   */
  router.get('/me', async (req, res) => {
    try {
      const userId = req.user?.id;
      const userRole = req.dbUser?.role || 'USER';

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [quota, usage] = await Promise.all([
        getUserQuota(prisma, userId, userRole),
        getUserUsage(prisma, userId),
      ]);

      res.json({
        quota,
        usage,
        role: userRole,
        percentages: {
          sessions: quota.maxActiveSessions ? Math.round((usage.activeSessions / quota.maxActiveSessions) * 100) : 0,
          agents: quota.maxTotalAgents ? Math.round((usage.totalAgents / quota.maxTotalAgents) * 100) : 0,
          prompts: quota.maxPromptsLibrary ? Math.round((usage.prompts / quota.maxPromptsLibrary) * 100) : 0,
          snippets: quota.maxSnippets ? Math.round((usage.snippets / quota.maxSnippets) * 100) : 0,
          folders: quota.maxFolders ? Math.round((usage.folders / quota.maxFolders) * 100) : 0,
        },
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch quota info',
        operation: 'fetch quota',
        requestId: req.id,
      });
    }
  });

  // ============================================
  // ADMIN QUOTA MANAGEMENT
  // ============================================

  /**
   * Get all quotas (role defaults + user-specific)
   * GET /api/quotas
   */
  router.get('/', requireAdmin, async (req, res) => {
    try {
      const quotas = await prisma.resourceQuota.findMany({
        orderBy: [{ role: 'asc' }, { userId: 'asc' }],
      });

      // Include hardcoded defaults for reference
      res.json({
        quotas,
        defaults: DEFAULT_QUOTAS,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch quotas',
        operation: 'fetch quotas',
        requestId: req.id,
      });
    }
  });

  /**
   * Get quota for a specific user
   * GET /api/quotas/user/:userId
   */
  router.get('/user/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [quota, usage] = await Promise.all([
        getUserQuota(prisma, userId, user.role),
        getUserUsage(prisma, userId),
      ]);

      res.json({
        user,
        quota,
        usage,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch user quota',
        operation: 'fetch user quota',
        requestId: req.id,
        context: { userId: req.params.userId },
      });
    }
  });

  /**
   * Set quota for a specific user (custom limits)
   * PUT /api/quotas/user/:userId
   */
  router.put('/user/:userId', requireSuperAdmin, auditLog(prisma, 'UPDATE', 'quota'), async (req, res) => {
    try {
      const { userId } = req.params;
      const quotaData = req.body;

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate quota fields
      const allowedFields = [
        'maxActiveSessions', 'maxTotalSessions',
        'maxActiveAgents', 'maxTotalAgents',
        'maxPromptsLibrary', 'maxSnippets', 'maxFolders',
        'apiRateLimit', 'agentRunsPerHour', 'maxStorageBytes',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (quotaData[field] !== undefined) {
          const value = parseInt(quotaData[field]);
          if (isNaN(value) || value < 0) {
            return res.status(400).json({ error: `Invalid value for ${field}` });
          }
          updateData[field] = field === 'maxStorageBytes' ? BigInt(value) : value;
        }
      }

      const quota = await prisma.resourceQuota.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData,
        },
      });

      res.json(quota);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update user quota',
        operation: 'update user quota',
        requestId: req.id,
        context: { userId: req.params.userId },
      });
    }
  });

  /**
   * Delete custom quota for user (revert to role default)
   * DELETE /api/quotas/user/:userId
   */
  router.delete('/user/:userId', requireSuperAdmin, auditLog(prisma, 'DELETE', 'quota'), async (req, res) => {
    try {
      const { userId } = req.params;

      await prisma.resourceQuota.delete({
        where: { userId },
      }).catch(() => {
        // Ignore if not exists
      });

      res.json({ success: true, message: 'User reverted to role default quota' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete user quota',
        operation: 'delete user quota',
        requestId: req.id,
        context: { userId: req.params.userId },
      });
    }
  });

  /**
   * Set default quota for a role
   * PUT /api/quotas/role/:role
   */
  router.put('/role/:role', requireSuperAdmin, auditLog(prisma, 'UPDATE', 'quota'), async (req, res) => {
    try {
      const { role } = req.params;
      const quotaData = req.body;

      // Validate role
      if (!['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Validate quota fields
      const allowedFields = [
        'maxActiveSessions', 'maxTotalSessions',
        'maxActiveAgents', 'maxTotalAgents',
        'maxPromptsLibrary', 'maxSnippets', 'maxFolders',
        'apiRateLimit', 'agentRunsPerHour', 'maxStorageBytes',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (quotaData[field] !== undefined) {
          const value = parseInt(quotaData[field]);
          if (isNaN(value) || value < 0) {
            return res.status(400).json({ error: `Invalid value for ${field}` });
          }
          updateData[field] = field === 'maxStorageBytes' ? BigInt(value) : value;
        }
      }

      const quota = await prisma.resourceQuota.upsert({
        where: { role },
        update: updateData,
        create: {
          role,
          ...updateData,
        },
      });

      res.json(quota);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update role quota',
        operation: 'update role quota',
        requestId: req.id,
        context: { role: req.params.role },
      });
    }
  });

  // ============================================
  // API KEY MANAGEMENT
  // ============================================

  /**
   * List current user's API keys
   * GET /api/quotas/api-keys
   */
  router.get('/api-keys', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const keys = await prisma.apiKey.findMany({
        where: {
          userId,
          revokedAt: null,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          rateLimit: true,
          lastUsedAt: true,
          usageCount: true,
          ipWhitelist: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(keys);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch API keys',
        operation: 'fetch API keys',
        requestId: req.id,
      });
    }
  });

  /**
   * Create a new API key
   * POST /api/quotas/api-keys
   */
  router.post('/api-keys', auditLog(prisma, 'CREATE', 'api_key'), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, scopes = [], expiresInDays, ipWhitelist = [], rateLimit = 60 } = req.body;

      if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: 'Name must be at least 3 characters' });
      }

      // Validate scopes
      const validScopes = ['read', 'write', 'agents', 'admin'];
      for (const scope of scopes) {
        if (!validScopes.includes(scope)) {
          return res.status(400).json({ error: `Invalid scope: ${scope}` });
        }
      }

      // Check user's role for admin scope
      if (scopes.includes('admin') && req.dbUser?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only super admins can create keys with admin scope' });
      }

      // Limit API keys per user
      const existingCount = await prisma.apiKey.count({
        where: { userId, revokedAt: null },
      });

      if (existingCount >= 10) {
        return res.status(429).json({ error: 'Maximum 10 active API keys per user' });
      }

      // Generate key
      const { key, keyHash, keyPrefix } = generateApiKey();

      // Calculate expiration
      let expiresAt = null;
      if (expiresInDays && expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
      }

      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          name: name.trim(),
          keyHash,
          keyPrefix,
          scopes,
          rateLimit: Math.max(1, Math.min(1000, parseInt(rateLimit) || 60)),
          ipWhitelist,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          rateLimit: true,
          ipWhitelist: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // Return the key ONCE - it cannot be retrieved again
      res.status(201).json({
        ...apiKey,
        key, // IMPORTANT: This is the only time the full key is returned
        warning: 'Save this key securely. It cannot be retrieved again.',
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create API key',
        operation: 'create API key',
        requestId: req.id,
      });
    }
  });

  /**
   * Update API key (name, scopes, etc.)
   * PUT /api/quotas/api-keys/:id
   */
  router.put('/api-keys/:id', auditLog(prisma, 'UPDATE', 'api_key'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify ownership
      const existing = await prisma.apiKey.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: 'API key not found' });
      }

      if (existing.revokedAt) {
        return res.status(400).json({ error: 'Cannot modify revoked key' });
      }

      const { name, scopes, ipWhitelist, rateLimit } = req.body;
      const updateData = {};

      if (name !== undefined) {
        if (name.trim().length < 3) {
          return res.status(400).json({ error: 'Name must be at least 3 characters' });
        }
        updateData.name = name.trim();
      }

      if (scopes !== undefined) {
        const validScopes = ['read', 'write', 'agents', 'admin'];
        for (const scope of scopes) {
          if (!validScopes.includes(scope)) {
            return res.status(400).json({ error: `Invalid scope: ${scope}` });
          }
        }
        if (scopes.includes('admin') && req.dbUser?.role !== 'SUPER_ADMIN') {
          return res.status(403).json({ error: 'Only super admins can add admin scope' });
        }
        updateData.scopes = scopes;
      }

      if (ipWhitelist !== undefined) {
        updateData.ipWhitelist = ipWhitelist;
      }

      if (rateLimit !== undefined) {
        updateData.rateLimit = Math.max(1, Math.min(1000, parseInt(rateLimit) || 60));
      }

      const updated = await prisma.apiKey.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          rateLimit: true,
          ipWhitelist: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      res.json(updated);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update API key',
        operation: 'update API key',
        requestId: req.id,
        context: { keyId: req.params.id },
      });
    }
  });

  /**
   * Revoke an API key
   * DELETE /api/quotas/api-keys/:id
   */
  router.delete('/api-keys/:id', auditLog(prisma, 'DELETE', 'api_key'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify ownership (admins can revoke any key)
      const existing = await prisma.apiKey.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'API key not found' });
      }

      const isAdmin = req.dbUser?.role === 'SUPER_ADMIN' || req.dbUser?.role === 'ADMIN';
      if (existing.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Cannot revoke another user\'s key' });
      }

      await prisma.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to revoke API key',
        operation: 'revoke API key',
        requestId: req.id,
        context: { keyId: req.params.id },
      });
    }
  });

  /**
   * Admin: List all API keys (across users)
   * GET /api/quotas/admin/api-keys
   */
  router.get('/admin/api-keys', requireAdmin, async (req, res) => {
    try {
      const { includeRevoked = 'false' } = req.query;

      const where = includeRevoked === 'true' ? {} : { revokedAt: null };

      const keys = await prisma.apiKey.findMany({
        where,
        select: {
          id: true,
          userId: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          rateLimit: true,
          lastUsedAt: true,
          usageCount: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(keys);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch API keys',
        operation: 'admin fetch API keys',
        requestId: req.id,
      });
    }
  });

  return router;
}
