/**
 * Tests for AI Routes
 * Tests usage tracking, analysis, and persona management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAIRouter } from './ai.js';

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

// Create mock prisma
function createMockPrisma() {
  return {
    aPIUsage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    aIPersona: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', createAIRouter(prisma));
  return app;
}

describe('AI Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // USAGE TRACKING
  // ==========================================================================
  describe('GET /api/ai/usage', () => {
    it('should return usage statistics', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([
        { inputTokens: 1000, outputTokens: 500, timestamp: new Date() },
        { inputTokens: 2000, outputTokens: 1000, timestamp: new Date() },
      ]);

      const res = await request(app).get('/api/ai/usage');

      expect(res.status).toBe(200);
      expect(res.body.inputTokens).toBe(3000);
      expect(res.body.outputTokens).toBe(1500);
      expect(res.body.totalTokens).toBe(4500);
      expect(res.body.requests).toBe(2);
    });

    it('should filter by sessionId', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

      await request(app).get('/api/ai/usage?sessionId=session-1');

      expect(mockPrisma.aPIUsage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionId: 'session-1',
          }),
        })
      );
    });

    it('should filter by projectId', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

      await request(app).get('/api/ai/usage?projectId=proj-1');

      expect(mockPrisma.aPIUsage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
          }),
        })
      );
    });

    it('should filter by date range - today', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

      await request(app).get('/api/ai/usage?range=today');

      const call = mockPrisma.aPIUsage.findMany.mock.calls[0][0];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      expect(call.where.timestamp.gte.getDate()).toBe(startOfToday.getDate());
    });

    it('should filter by date range - week', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

      await request(app).get('/api/ai/usage?range=week');

      expect(mockPrisma.aPIUsage.findMany).toHaveBeenCalled();
    });

    it('should filter by date range - month', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

      await request(app).get('/api/ai/usage?range=month');

      expect(mockPrisma.aPIUsage.findMany).toHaveBeenCalled();
    });

    it('should filter by date range - all', async () => {
      mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

      await request(app).get('/api/ai/usage?range=all');

      const call = mockPrisma.aPIUsage.findMany.mock.calls[0][0];
      expect(call.where.timestamp.gte.getTime()).toBe(new Date(0).getTime());
    });

    it('should include history by day', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.aPIUsage.findMany.mockResolvedValue([
        { inputTokens: 1000, outputTokens: 500, timestamp: today },
        { inputTokens: 2000, outputTokens: 1000, timestamp: yesterday },
      ]);

      const res = await request(app).get('/api/ai/usage');

      expect(res.status).toBe(200);
      expect(res.body.history).toBeDefined();
      expect(res.body.history.length).toBeGreaterThan(0);
    });

    it('should handle database errors', async () => {
      mockPrisma.aPIUsage.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/ai/usage');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/ai/usage', () => {
    it('should record usage', async () => {
      const usage = {
        id: 'usage-1',
        sessionId: 'session-1',
        inputTokens: 1000,
        outputTokens: 500,
        model: 'claude-sonnet',
      };
      mockPrisma.aPIUsage.create.mockResolvedValue(usage);

      const res = await request(app)
        .post('/api/ai/usage')
        .send({
          sessionId: 'session-1',
          inputTokens: 1000,
          outputTokens: 500,
          model: 'claude-sonnet',
        });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('session-1');
    });

    it('should use default values', async () => {
      mockPrisma.aPIUsage.create.mockResolvedValue({ id: 'usage-1' });

      await request(app)
        .post('/api/ai/usage')
        .send({});

      expect(mockPrisma.aPIUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputTokens: 0,
            outputTokens: 0,
            model: 'claude-sonnet',
            provider: 'anthropic',
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.aPIUsage.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/ai/usage')
        .send({ sessionId: 'session-1' });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // ERROR ANALYSIS
  // ==========================================================================
  describe('POST /api/ai/analyze-error', () => {
    it('should analyze error and return suggestions', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-error')
        .send({
          error: { type: 'TypeError', message: 'Cannot read property of undefined' },
          context: { file: 'app.js', line: 42 },
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.cause).toBeDefined();
      expect(res.body.solution).toBeDefined();
      expect(res.body.commands).toBeDefined();
      expect(res.body.confidence).toBeDefined();
    });

    it('should include suggested commands', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-error')
        .send({
          error: { message: 'Build failed' },
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.commands)).toBe(true);
    });
  });

  // ==========================================================================
  // CODE EXPLANATION
  // ==========================================================================
  describe('POST /api/ai/explain', () => {
    it('should explain code', async () => {
      const res = await request(app)
        .post('/api/ai/explain')
        .send({
          code: 'function add(a, b) { return a + b; }',
          language: 'javascript',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.breakdown).toBeDefined();
      expect(res.body.suggestions).toBeDefined();
    });

    it('should include line-by-line breakdown', async () => {
      const res = await request(app)
        .post('/api/ai/explain')
        .send({
          code: 'const x = 1;\nconst y = 2;\nreturn x + y;',
          language: 'javascript',
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.breakdown)).toBe(true);
    });
  });

  // ==========================================================================
  // COMMIT MESSAGE GENERATION
  // ==========================================================================
  describe('POST /api/ai/commit-message', () => {
    it('should generate commit message suggestions', async () => {
      const res = await request(app)
        .post('/api/ai/commit-message')
        .send({
          diff: 'diff --git a/app.js b/app.js\n+function newFeature() {}',
          conventionalCommits: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(res.body.conventionalCommits).toBe(true);
    });

    it('should return multiple suggestions', async () => {
      const res = await request(app)
        .post('/api/ai/commit-message')
        .send({ diff: 'some diff' });

      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // AI PERSONAS
  // ==========================================================================
  describe('GET /api/ai/personas', () => {
    it('should return all personas', async () => {
      mockPrisma.aIPersona.findMany.mockResolvedValue([
        { id: 'p1', name: 'Code Reviewer', description: 'Reviews code' },
        { id: 'p2', name: 'Teacher', description: 'Explains concepts' },
      ]);

      const res = await request(app).get('/api/ai/personas');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockPrisma.aIPersona.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/ai/personas');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/ai/personas', () => {
    it('should create a persona', async () => {
      const persona = {
        id: 'p-new',
        name: 'Helper',
        description: 'Helpful assistant',
        icon: '🤖',
        systemPrompt: 'You are a helpful assistant.',
      };
      mockPrisma.aIPersona.create.mockResolvedValue(persona);

      const res = await request(app)
        .post('/api/ai/personas')
        .send({
          name: 'Helper',
          description: 'Helpful assistant',
          icon: '🤖',
          systemPrompt: 'You are a helpful assistant.',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Helper');
    });

    it('should handle creation errors', async () => {
      mockPrisma.aIPersona.create.mockRejectedValue(new Error('Validation error'));

      const res = await request(app)
        .post('/api/ai/personas')
        .send({ name: 'Test' });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/ai/personas/:id', () => {
    it('should update a persona', async () => {
      mockPrisma.aIPersona.update.mockResolvedValue({
        id: 'p1',
        name: 'Updated Name',
        description: 'Updated description',
      });

      const res = await request(app)
        .put('/api/ai/personas/p1')
        .send({
          name: 'Updated Name',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should handle update errors', async () => {
      mockPrisma.aIPersona.update.mockRejectedValue(new Error('Not found'));

      const res = await request(app)
        .put('/api/ai/personas/nonexistent')
        .send({ name: 'Test' });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/ai/personas/:id', () => {
    it('should delete a persona', async () => {
      mockPrisma.aIPersona.delete.mockResolvedValue({ id: 'p1' });

      const res = await request(app).delete('/api/ai/personas/p1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      mockPrisma.aIPersona.delete.mockRejectedValue(new Error('Not found'));

      const res = await request(app).delete('/api/ai/personas/nonexistent');

      expect(res.status).toBe(500);
    });
  });
});
