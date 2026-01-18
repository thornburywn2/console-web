/**
 * Tests for Quotas & API Keys Routes
 * Tests resource quotas and API key management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createQuotasRouter } from './quotas.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: vi.fn((res, error, options) => {
    res.status(500).json({ error: options.userMessage });
  }),
}));

// Mock RBAC middleware
vi.mock('../middleware/rbac.js', () => ({
  requireAdmin: (req, res, next) => next(),
  requireSuperAdmin: (req, res, next) => next(),
  auditLog: () => (req, res, next) => next(),
}));

// Mock quotas middleware
vi.mock('../middleware/quotas.js', () => ({
  getUserQuota: vi.fn().mockResolvedValue({
    maxActiveSessions: 10,
    maxTotalAgents: 20,
    maxPromptsLibrary: 100,
    maxSnippets: 50,
    maxFolders: 10,
  }),
  getUserUsage: vi.fn().mockResolvedValue({
    activeSessions: 3,
    totalAgents: 5,
    prompts: 25,
    snippets: 10,
    folders: 2,
  }),
  generateApiKey: vi.fn().mockReturnValue({
    key: 'cwk_test_key_1234567890',
    keyHash: 'hashed_key',
    keyPrefix: 'cwk_test',
  }),
  hashApiKey: vi.fn().mockReturnValue('hashed_key'),
  DEFAULT_QUOTAS: {
    USER: { maxActiveSessions: 5 },
    ADMIN: { maxActiveSessions: 20 },
  },
}));

// Create mock prisma
function createMockPrisma() {
  return {
    resourceQuota: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };
}

// Create app with router and mock user
function createApp(prisma, user = { id: 'user-1' }, dbUser = { role: 'USER' }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    req.dbUser = dbUser;
    next();
  });
  app.use('/api/quotas', createQuotasRouter(prisma));
  return app;
}

describe('Quotas Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // USER QUOTA ENDPOINTS
  // ==========================================================================
  describe('GET /api/quotas/me', () => {
    it('should return user quota and usage', async () => {
      const res = await request(app).get('/api/quotas/me');

      expect(res.status).toBe(200);
      expect(res.body.quota).toBeDefined();
      expect(res.body.usage).toBeDefined();
      expect(res.body.percentages).toBeDefined();
    });

    it('should calculate percentage values', async () => {
      const res = await request(app).get('/api/quotas/me');

      expect(res.status).toBe(200);
      expect(res.body.percentages.sessions).toBe(30); // 3/10 * 100
      expect(res.body.percentages.agents).toBe(25); // 5/20 * 100
    });

    it('should require authentication', async () => {
      const appNoAuth = createApp(mockPrisma, null);

      const res = await request(appNoAuth).get('/api/quotas/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should include user role', async () => {
      const res = await request(app).get('/api/quotas/me');

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('USER');
    });
  });

  // ==========================================================================
  // ADMIN QUOTA MANAGEMENT
  // ==========================================================================
  describe('GET /api/quotas', () => {
    it('should return all quotas with defaults', async () => {
      mockPrisma.resourceQuota.findMany.mockResolvedValue([
        { id: 'q1', role: 'USER', maxActiveSessions: 5 },
        { id: 'q2', role: 'ADMIN', maxActiveSessions: 20 },
      ]);

      const res = await request(app).get('/api/quotas');

      expect(res.status).toBe(200);
      expect(res.body.quotas).toHaveLength(2);
      expect(res.body.defaults).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockPrisma.resourceQuota.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/quotas');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/quotas/user/:userId', () => {
    it('should return quota for specific user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      });

      const res = await request(app).get('/api/quotas/user/user-2');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.quota).toBeDefined();
      expect(res.body.usage).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/quotas/user/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/quotas/user/user-2');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/quotas/user/:userId', () => {
    it('should update user quota', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', role: 'USER' });
      mockPrisma.resourceQuota.upsert.mockResolvedValue({
        userId: 'user-2',
        maxActiveSessions: 15,
      });

      const res = await request(app)
        .put('/api/quotas/user/user-2')
        .send({ maxActiveSessions: 15 });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/quotas/user/nonexistent')
        .send({ maxActiveSessions: 10 });

      expect(res.status).toBe(404);
    });

    it('should validate quota values', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

      const res = await request(app)
        .put('/api/quotas/user/user-2')
        .send({ maxActiveSessions: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid value');
    });

    it('should reject non-numeric values', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

      const res = await request(app)
        .put('/api/quotas/user/user-2')
        .send({ maxActiveSessions: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      mockPrisma.resourceQuota.upsert.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/api/quotas/user/user-2')
        .send({ maxActiveSessions: 10 });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/quotas/user/:userId', () => {
    it('should delete custom user quota', async () => {
      mockPrisma.resourceQuota.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/quotas/user/user-2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should succeed even if quota does not exist', async () => {
      mockPrisma.resourceQuota.delete.mockRejectedValue(new Error('Not found'));

      const res = await request(app).delete('/api/quotas/user/nonexistent');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/quotas/role/:role', () => {
    it('should update role quota', async () => {
      mockPrisma.resourceQuota.upsert.mockResolvedValue({
        role: 'USER',
        maxActiveSessions: 10,
      });

      const res = await request(app)
        .put('/api/quotas/role/USER')
        .send({ maxActiveSessions: 10 });

      expect(res.status).toBe(200);
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .put('/api/quotas/role/INVALID')
        .send({ maxActiveSessions: 10 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid role');
    });

    it('should accept all valid roles', async () => {
      mockPrisma.resourceQuota.upsert.mockResolvedValue({});

      for (const role of ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER']) {
        const res = await request(app)
          .put(`/api/quotas/role/${role}`)
          .send({ maxActiveSessions: 5 });

        expect(res.status).toBe(200);
      }
    });

    it('should validate quota values', async () => {
      const res = await request(app)
        .put('/api/quotas/role/USER')
        .send({ maxActiveSessions: -1 });

      expect(res.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockPrisma.resourceQuota.upsert.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/api/quotas/role/USER')
        .send({ maxActiveSessions: 10 });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // API KEY MANAGEMENT
  // ==========================================================================
  describe('GET /api/quotas/api-keys', () => {
    it('should return user API keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'key-1', name: 'Test Key', keyPrefix: 'cwk_abc' },
      ]);

      const res = await request(app).get('/api/quotas/api-keys');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const appNoAuth = createApp(mockPrisma, null);

      const res = await request(appNoAuth).get('/api/quotas/api-keys');

      expect(res.status).toBe(401);
    });

    it('should only return non-revoked keys', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      await request(app).get('/api/quotas/api-keys');

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.apiKey.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/quotas/api-keys');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/quotas/api-keys', () => {
    it('should create new API key', async () => {
      mockPrisma.apiKey.count.mockResolvedValue(0);
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-new',
        name: 'New Key',
        keyPrefix: 'cwk_test',
        scopes: ['read'],
      });

      const res = await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'New Key', scopes: ['read'] });

      expect(res.status).toBe(201);
      expect(res.body.key).toBe('cwk_test_key_1234567890');
      expect(res.body.warning).toContain('cannot be retrieved');
    });

    it('should reject short name', async () => {
      const res = await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 3 characters');
    });

    it('should reject invalid scopes', async () => {
      const res = await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'Key Name', scopes: ['invalid_scope'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid scope');
    });

    it('should reject admin scope for non-super-admin', async () => {
      const res = await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'Admin Key', scopes: ['admin'] });

      expect(res.status).toBe(403);
    });

    it('should allow admin scope for super admin', async () => {
      const superAdminApp = createApp(mockPrisma, { id: 'admin-1' }, { role: 'SUPER_ADMIN' });
      mockPrisma.apiKey.count.mockResolvedValue(0);
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-new',
        name: 'Admin Key',
        scopes: ['admin'],
      });

      const res = await request(superAdminApp)
        .post('/api/quotas/api-keys')
        .send({ name: 'Admin Key', scopes: ['admin'] });

      expect(res.status).toBe(201);
    });

    it('should limit API keys per user', async () => {
      mockPrisma.apiKey.count.mockResolvedValue(10);

      const res = await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'Another Key' });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Maximum 10');
    });

    it('should require authentication', async () => {
      const appNoAuth = createApp(mockPrisma, null);

      const res = await request(appNoAuth)
        .post('/api/quotas/api-keys')
        .send({ name: 'Key' });

      expect(res.status).toBe(401);
    });

    it('should set expiration when expiresInDays provided', async () => {
      mockPrisma.apiKey.count.mockResolvedValue(0);
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1' });

      await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'Expiring Key', expiresInDays: 30 });

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.apiKey.count.mockResolvedValue(0);
      mockPrisma.apiKey.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/quotas/api-keys')
        .send({ name: 'New Key' });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/quotas/api-keys/:id', () => {
    it('should update API key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        revokedAt: null,
      });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        name: 'Updated Name',
      });

      const res = await request(app)
        .put('/api/quotas/api-keys/key-1')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/quotas/api-keys/nonexistent')
        .send({ name: 'Update' });

      expect(res.status).toBe(404);
    });

    it('should return 404 for key owned by another user', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'other-user',
      });

      const res = await request(app)
        .put('/api/quotas/api-keys/key-1')
        .send({ name: 'Update' });

      expect(res.status).toBe(404);
    });

    it('should reject update on revoked key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        revokedAt: new Date(),
      });

      const res = await request(app)
        .put('/api/quotas/api-keys/key-1')
        .send({ name: 'Update' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('revoked');
    });

    it('should reject short name update', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        revokedAt: null,
      });

      const res = await request(app)
        .put('/api/quotas/api-keys/key-1')
        .send({ name: 'ab' });

      expect(res.status).toBe(400);
    });

    it('should clamp rate limit to valid range', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        revokedAt: null,
      });
      mockPrisma.apiKey.update.mockResolvedValue({ id: 'key-1' });

      await request(app)
        .put('/api/quotas/api-keys/key-1')
        .send({ rateLimit: 9999 });

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rateLimit: 1000 }),
        })
      );
    });

    it('should require authentication', async () => {
      const appNoAuth = createApp(mockPrisma, null);

      const res = await request(appNoAuth)
        .put('/api/quotas/api-keys/key-1')
        .send({ name: 'Update' });

      expect(res.status).toBe(401);
    });

    it('should handle database errors', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        revokedAt: null,
      });
      mockPrisma.apiKey.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/api/quotas/api-keys/key-1')
        .send({ name: 'Update' });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/quotas/api-keys/:id', () => {
    it('should revoke API key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
      });
      mockPrisma.apiKey.update.mockResolvedValue({ id: 'key-1' });

      const res = await request(app).delete('/api/quotas/api-keys/key-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revokedAt: expect.any(Date) },
        })
      );
    });

    it('should return 404 for non-existent key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/quotas/api-keys/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should reject revoking another users key as non-admin', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'other-user',
      });

      const res = await request(app).delete('/api/quotas/api-keys/key-1');

      expect(res.status).toBe(403);
    });

    it('should allow admin to revoke any key', async () => {
      const adminApp = createApp(mockPrisma, { id: 'admin-1' }, { role: 'ADMIN' });
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'other-user',
      });
      mockPrisma.apiKey.update.mockResolvedValue({ id: 'key-1' });

      const res = await request(adminApp).delete('/api/quotas/api-keys/key-1');

      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const appNoAuth = createApp(mockPrisma, null);

      const res = await request(appNoAuth).delete('/api/quotas/api-keys/key-1');

      expect(res.status).toBe(401);
    });

    it('should handle database errors', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
      });
      mockPrisma.apiKey.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/api/quotas/api-keys/key-1');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/quotas/admin/api-keys', () => {
    it('should return all API keys for admin', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'key-1', userId: 'user-1', name: 'Key 1' },
        { id: 'key-2', userId: 'user-2', name: 'Key 2' },
      ]);

      const res = await request(app).get('/api/quotas/admin/api-keys');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should filter out revoked keys by default', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      await request(app).get('/api/quotas/admin/api-keys');

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { revokedAt: null },
        })
      );
    });

    it('should include revoked keys when requested', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      await request(app).get('/api/quotas/admin/api-keys?includeRevoked=true');

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.apiKey.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/quotas/admin/api-keys');

      expect(res.status).toBe(500);
    });
  });
});
