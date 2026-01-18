/**
 * Tests for Audit Log Routes
 * Tests admin-only audit log access with filtering and export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuditRouter } from './audit.js';

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

// Mock RBAC middleware - allow all for tests but preserve existing role
vi.mock('../middleware/rbac.js', () => ({
  requireAdmin: (req, res, next) => {
    // Only set default role if not already set by createApp
    if (!req.dbUser) {
      req.dbUser = { role: 'ADMIN' };
    }
    next();
  },
  requireSuperAdmin: (req, res, next) => {
    if (!req.dbUser) {
      req.dbUser = { role: 'SUPER_ADMIN' };
    }
    next();
  },
}));

// Sample audit log entries
const sampleLogs = [
  {
    id: 'log-1',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    userId: 'user-1',
    action: 'CREATE',
    resource: 'session',
    resourceId: 'sess-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: { detail: 'Created new session' },
  },
  {
    id: 'log-2',
    timestamp: new Date('2024-01-15T11:00:00Z'),
    userId: 'user-2',
    action: 'DELETE',
    resource: 'project',
    resourceId: 'proj-456',
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0',
    metadata: null,
  },
];

// Create mock prisma
function createMockPrisma() {
  return {
    auditLog: {
      findMany: vi.fn().mockResolvedValue(sampleLogs),
      findUnique: vi.fn(),
      count: vi.fn().mockResolvedValue(100),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([
      { date: new Date('2024-01-15'), count: 50 },
      { date: new Date('2024-01-14'), count: 30 },
    ]),
  };
}

// Create app with router
function createApp(prisma, userRole = 'ADMIN') {
  const app = express();
  app.use(express.json());

  // Add mock user based on role
  app.use((req, res, next) => {
    req.dbUser = { role: userRole };
    req.user = { id: 'test-user' };
    next();
  });

  app.use('/api/audit-logs', createAuditRouter(prisma));
  return app;
}

describe('Audit Log Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // GET AUDIT LOGS WITH FILTERING
  // ==========================================================================
  describe('GET /api/audit-logs', () => {
    it('should return paginated audit logs', async () => {
      const res = await request(app).get('/api/audit-logs');

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(2);
      expect(res.body.total).toBe(100);
      expect(res.body.hasMore).toBe(true);
    });

    it('should filter by userId', async () => {
      await request(app).get('/api/audit-logs?userId=user-1');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        })
      );
    });

    it('should filter by action', async () => {
      await request(app).get('/api/audit-logs?action=create');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'CREATE' }),
        })
      );
    });

    it('should filter by resource', async () => {
      await request(app).get('/api/audit-logs?resource=SESSION');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resource: 'session' }),
        })
      );
    });

    it('should filter by date range', async () => {
      await request(app).get('/api/audit-logs?startDate=2024-01-01&endDate=2024-01-31');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should support search', async () => {
      await request(app).get('/api/audit-logs?search=192.168');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should cap limit at 200', async () => {
      await request(app).get('/api/audit-logs?limit=500');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200,
        })
      );
    });

    it('should support sorting', async () => {
      await request(app).get('/api/audit-logs?sort=action&order=asc');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { action: 'asc' },
        })
      );
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  describe('GET /api/audit-logs/stats', () => {
    it('should return audit statistics', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(500);
      mockPrisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'CREATE', _count: { action: 200 } },
          { action: 'UPDATE', _count: { action: 150 } },
        ])
        .mockResolvedValueOnce([
          { resource: 'session', _count: { resource: 300 } },
          { resource: 'project', _count: { resource: 100 } },
        ])
        .mockResolvedValueOnce([{ userId: 'user-1' }, { userId: 'user-2' }]);

      const res = await request(app).get('/api/audit-logs/stats');

      expect(res.status).toBe(200);
      expect(res.body.totalLogs).toBe(500);
      expect(res.body.byAction.CREATE).toBe(200);
      expect(res.body.byResource).toHaveLength(2);
      expect(res.body.uniqueUsers).toBe(2);
    });

    it('should support custom days parameter', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(100);
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);

      const res = await request(app).get('/api/audit-logs/stats?days=30');

      expect(res.status).toBe(200);
      expect(res.body.period.days).toBe(30);
    });
  });

  // ==========================================================================
  // SINGLE ENTRY
  // ==========================================================================
  describe('GET /api/audit-logs/:id', () => {
    it('should return single audit log entry', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(sampleLogs[0]);

      const res = await request(app).get('/api/audit-logs/log-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('log-1');
      expect(res.body.action).toBe('CREATE');
    });

    it('should return 404 for non-existent entry', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/audit-logs/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // USER AUDIT LOGS
  // ==========================================================================
  describe('GET /api/audit-logs/user/:userId', () => {
    it('should return logs for specific user', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([sampleLogs[0]]);
      mockPrisma.auditLog.count.mockResolvedValue(50);

      const res = await request(app).get('/api/audit-logs/user/user-1');

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.total).toBe(50);
    });

    it('should support pagination', async () => {
      await request(app).get('/api/audit-logs/user/user-1?limit=25&offset=50');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        })
      );
    });
  });

  // ==========================================================================
  // RESOURCE AUDIT LOGS
  // ==========================================================================
  describe('GET /api/audit-logs/resource/:resource/:resourceId', () => {
    it('should return logs for specific resource', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([sampleLogs[1]]);
      mockPrisma.auditLog.count.mockResolvedValue(10);

      const res = await request(app).get('/api/audit-logs/resource/project/proj-456');

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { resource: 'project', resourceId: 'proj-456' },
        })
      );
    });
  });

  // ==========================================================================
  // CSV EXPORT
  // ==========================================================================
  describe('GET /api/audit-logs/export/csv', () => {
    it('should export logs as CSV', async () => {
      const res = await request(app).get('/api/audit-logs/export/csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('ID,Timestamp,User ID,Action,Resource');
    });

    it('should support filtering in export', async () => {
      await request(app).get('/api/audit-logs/export/csv?action=DELETE&resource=project');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'DELETE',
            resource: 'project',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // PURGE (SUPER_ADMIN ONLY)
  // ==========================================================================
  describe('DELETE /api/audit-logs/purge', () => {
    it('should reject non-super-admin', async () => {
      const res = await request(app).delete('/api/audit-logs/purge');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('super admin');
    });

    it('should purge old logs for super admin', async () => {
      const superAdminApp = createApp(mockPrisma, 'SUPER_ADMIN');
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 1000 });

      const res = await request(superAdminApp).delete('/api/audit-logs/purge?olderThanDays=90');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deletedCount).toBe(1000);
    });

    it('should log the purge action', async () => {
      const superAdminApp = createApp(mockPrisma, 'SUPER_ADMIN');
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 500 });

      await request(superAdminApp).delete('/api/audit-logs/purge');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DELETE',
            resource: 'audit_log',
            metadata: expect.objectContaining({
              operation: 'purge',
            }),
          }),
        })
      );
    });
  });
});
