/**
 * Tests for Checkpoints Routes
 * Tests checkpoint CRUD, restore, and cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCheckpointsRouter } from './checkpoints.js';

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

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn((cmd) => {
    if (cmd.includes('rev-parse --abbrev-ref HEAD')) return 'main';
    if (cmd.includes('rev-parse HEAD')) return 'abc123def456';
    if (cmd.includes('status --porcelain')) return '';
    if (cmd.includes('checkout')) return '';
    return '';
  }),
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue('file content'),
  writeFileSync: vi.fn(),
}));

// Create mock prisma
function createMockPrisma() {
  return {
    checkpoint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    projectContext: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/checkpoints', createCheckpointsRouter(prisma, '/home/user/Projects'));
  return app;
}

describe('Checkpoints Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // CHECKPOINT CRUD
  // ==========================================================================
  describe('GET /api/checkpoints/project/:projectId', () => {
    it('should return checkpoints for project', async () => {
      mockPrisma.checkpoint.findMany.mockResolvedValue([
        { id: 'cp1', name: 'Checkpoint 1', type: 'MANUAL' },
        { id: 'cp2', name: 'Checkpoint 2', type: 'AUTO' },
      ]);

      const res = await request(app).get('/api/checkpoints/project/my-project');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should filter by type', async () => {
      mockPrisma.checkpoint.findMany.mockResolvedValue([]);

      await request(app).get('/api/checkpoints/project/my-project?type=manual');

      expect(mockPrisma.checkpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'MANUAL' }),
        })
      );
    });

    it('should respect limit', async () => {
      mockPrisma.checkpoint.findMany.mockResolvedValue([]);

      await request(app).get('/api/checkpoints/project/my-project?limit=10');

      expect(mockPrisma.checkpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.checkpoint.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/checkpoints/project/my-project');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/checkpoints/:id', () => {
    it('should return checkpoint details', async () => {
      mockPrisma.checkpoint.findUnique.mockResolvedValue({
        id: 'cp1',
        name: 'My Checkpoint',
        gitBranch: 'main',
        gitCommit: 'abc123',
      });

      const res = await request(app).get('/api/checkpoints/cp1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('My Checkpoint');
    });

    it('should return 404 for non-existent checkpoint', async () => {
      mockPrisma.checkpoint.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/checkpoints/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/checkpoints', () => {
    it('should create a checkpoint', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue({ files: ['app.js'] });
      mockPrisma.checkpoint.create.mockResolvedValue({
        id: 'new-cp',
        projectId: 'my-project',
        name: 'New Checkpoint',
        type: 'MANUAL',
        gitBranch: 'main',
        gitCommit: 'abc123def456',
      });

      const res = await request(app)
        .post('/api/checkpoints')
        .send({ projectId: 'my-project', name: 'New Checkpoint' });

      expect(res.status).toBe(201);
      expect(res.body.gitBranch).toBe('main');
    });

    it('should reject missing projectId', async () => {
      const res = await request(app)
        .post('/api/checkpoints')
        .send({ name: 'Checkpoint' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('projectId');
    });

    it('should handle non-existent project', async () => {
      const { existsSync } = await import('fs');
      existsSync.mockReturnValueOnce(false);

      const res = await request(app)
        .post('/api/checkpoints')
        .send({ projectId: 'nonexistent' });

      expect(res.status).toBe(404);
    });

    it('should include file snapshots when requested', async () => {
      mockPrisma.projectContext.findUnique.mockResolvedValue(null);
      mockPrisma.checkpoint.create.mockResolvedValue({ id: 'cp1' });

      await request(app)
        .post('/api/checkpoints')
        .send({
          projectId: 'my-project',
          includeFiles: true,
          filePaths: ['src/app.js'],
        });

      expect(mockPrisma.checkpoint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fileSnapshots: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('POST /api/checkpoints/:id/restore', () => {
    it('should restore from checkpoint', async () => {
      mockPrisma.checkpoint.findUnique.mockResolvedValue({
        id: 'cp1',
        name: 'Checkpoint',
        projectId: 'my-project',
        gitCommit: 'abc123',
        gitBranch: 'main',
        fileSnapshots: null,
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const res = await request(app).post('/api/checkpoints/cp1/restore');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toBeDefined();
    });

    it('should return 404 for non-existent checkpoint', async () => {
      mockPrisma.checkpoint.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/checkpoints/nonexistent/restore');

      expect(res.status).toBe(404);
    });

    it('should restore file snapshots when available', async () => {
      mockPrisma.checkpoint.findUnique.mockResolvedValue({
        id: 'cp1',
        projectId: 'my-project',
        gitCommit: null,
        fileSnapshots: [
          { path: 'src/app.js', content: 'restored content' },
        ],
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/checkpoints/cp1/restore')
        .send({ restoreGit: false, restoreFiles: true });

      expect(res.status).toBe(200);
      expect(res.body.results.files.restored).toContain('src/app.js');
    });
  });

  describe('PUT /api/checkpoints/:id', () => {
    it('should update checkpoint', async () => {
      mockPrisma.checkpoint.update.mockResolvedValue({
        id: 'cp1',
        name: 'Updated Name',
        isPinned: true,
      });

      const res = await request(app)
        .put('/api/checkpoints/cp1')
        .send({ name: 'Updated Name', isPinned: true });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/checkpoints/:id', () => {
    it('should delete checkpoint', async () => {
      mockPrisma.checkpoint.delete.mockResolvedValue({ id: 'cp1' });

      const res = await request(app).delete('/api/checkpoints/cp1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/checkpoints/cleanup', () => {
    it('should cleanup expired checkpoints', async () => {
      mockPrisma.checkpoint.deleteMany.mockResolvedValue({ count: 5 });

      const res = await request(app).post('/api/checkpoints/cleanup');

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(5);
    });
  });

  describe('GET /api/checkpoints/project/:projectId/stats', () => {
    it('should return checkpoint statistics', async () => {
      mockPrisma.checkpoint.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);
      mockPrisma.checkpoint.groupBy.mockResolvedValue([
        { type: 'MANUAL', _count: 5 },
        { type: 'AUTO', _count: 5 },
      ]);
      mockPrisma.checkpoint.aggregate.mockResolvedValue({
        _sum: { sizeBytes: 1024000 },
      });

      const res = await request(app).get('/api/checkpoints/project/my-project/stats');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(10);
      expect(res.body.pinned).toBe(3);
      expect(res.body.byType.MANUAL).toBe(5);
    });
  });
});
