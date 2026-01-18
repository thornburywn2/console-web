/**
 * Search Routes Tests
 * Phase 5.3: Test Coverage for Global Search API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSearchRouter } from './search.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: (res, error, options) => {
    return res.status(500).json({
      error: options.userMessage || 'Internal error',
      message: error.message,
    });
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readdirSync: vi.fn(() => ['project-a', 'project-b', '.hidden']),
  readFileSync: vi.fn(() => '# CLAUDE.md\n\nTest project description'),
  statSync: vi.fn(() => ({ isDirectory: () => true })),
}));

describe('Search Routes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      session: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      prompt: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      commandSnippet: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workflow: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/search', createSearchRouter(mockPrisma, '/home/user/Projects'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // GLOBAL SEARCH
  // ============================================

  describe('GET /api/search', () => {
    it('should search across all entities', async () => {
      const res = await request(app).get('/api/search?q=test');

      expect(res.status).toBe(200);
      expect(res.body.query).toBe('test');
      expect(res.body.results).toBeDefined();
      expect(res.body.totalCount).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      const res = await request(app).get('/api/search');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Search query is required');
    });

    it('should return 400 when query is empty', async () => {
      const res = await request(app).get('/api/search?q=');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Search query is required');
    });

    it('should filter by types', async () => {
      const res = await request(app).get('/api/search?q=test&types=prompts,snippets');

      expect(res.status).toBe(200);
      expect(mockPrisma.prompt.findMany).toHaveBeenCalled();
      expect(mockPrisma.commandSnippet.findMany).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const res = await request(app).get('/api/search?q=test&limit=5');

      expect(res.status).toBe(200);
    });

    it('should search projects in filesystem', async () => {
      const res = await request(app).get('/api/search?q=project');

      expect(res.status).toBe(200);
      expect(res.body.results.projects.length).toBeGreaterThan(0);
    });

    it('should search sessions in database', async () => {
      mockPrisma.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          sessionName: 'test-session',
          displayName: 'Test Session',
          project: { name: 'project-a', path: '/path' },
          tags: [],
          folder: null,
          status: 'ACTIVE',
        },
      ]);

      const res = await request(app).get('/api/search?q=test');

      expect(res.body.results.sessions).toHaveLength(1);
      expect(res.body.results.sessions[0].name).toBe('Test Session');
    });

    it('should search prompts in database', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([
        {
          id: 'prompt-1',
          name: 'Test Prompt',
          content: 'Test content',
          description: 'Description',
          category: 'testing',
          isFavorite: true,
        },
      ]);

      const res = await request(app).get('/api/search?q=test');

      expect(res.body.results.prompts).toHaveLength(1);
    });

    it('should search snippets in database', async () => {
      mockPrisma.commandSnippet.findMany.mockResolvedValue([
        {
          id: 'snippet-1',
          name: 'Test Snippet',
          command: 'npm test',
          description: 'Run tests',
          category: 'testing',
          tags: ['test'],
          isFavorite: false,
        },
      ]);

      const res = await request(app).get('/api/search?q=test');

      expect(res.body.results.snippets).toHaveLength(1);
    });

    it('should search workflows in database', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([
        {
          id: 'workflow-1',
          name: 'Test Workflow',
          description: 'A test workflow',
          trigger: 'manual',
          isActive: true,
          steps: [{ name: 'step1' }],
        },
      ]);

      const res = await request(app).get('/api/search?q=test');

      expect(res.body.results.workflows).toHaveLength(1);
    });

    it('should calculate totalCount correctly', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([{ id: '1', name: 'Test', content: '', isFavorite: false }]);
      mockPrisma.commandSnippet.findMany.mockResolvedValue([
        { id: '1', name: 'Test', command: '', tags: [], isFavorite: false },
        { id: '2', name: 'Test2', command: '', tags: [], isFavorite: false },
      ]);

      const res = await request(app).get('/api/search?q=test');

      expect(res.body.totalCount).toBeGreaterThan(0);
    });
  });

  // ============================================
  // SUGGESTIONS
  // ============================================

  describe('GET /api/search/suggestions', () => {
    it('should return suggestions for query', async () => {
      mockPrisma.prompt.findMany.mockResolvedValue([{ name: 'test-prompt' }]);
      mockPrisma.commandSnippet.findMany.mockResolvedValue([{ name: 'test-snippet' }]);
      mockPrisma.prompt.groupBy.mockResolvedValue([{ category: 'testing' }]);

      const res = await request(app).get('/api/search/suggestions?q=test');

      expect(res.status).toBe(200);
      expect(res.body.query).toBe('test');
      expect(res.body.suggestions).toBeInstanceOf(Array);
    });

    it('should return empty for short queries', async () => {
      const res = await request(app).get('/api/search/suggestions?q=a');

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('should return empty for missing query', async () => {
      const res = await request(app).get('/api/search/suggestions');

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app).get('/api/search/suggestions?q=test&limit=3');

      expect(res.status).toBe(200);
    });

    it('should include project names in suggestions', async () => {
      const res = await request(app).get('/api/search/suggestions?q=project');

      expect(res.body.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // RECENT SEARCHES
  // ============================================

  describe('GET /api/search/recent', () => {
    it('should return recent searches from settings', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({
        expandedPanels: { recentSearches: ['test', 'project'] },
      });

      const res = await request(app).get('/api/search/recent');

      expect(res.status).toBe(200);
      expect(res.body.recentSearches).toEqual(['test', 'project']);
    });

    it('should return empty array when no settings', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/search/recent');

      expect(res.status).toBe(200);
      expect(res.body.recentSearches).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.userSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/search/recent');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get recent searches');
    });
  });

  // ============================================
  // SAVE RECENT SEARCH
  // ============================================

  describe('POST /api/search/recent', () => {
    it('should save a recent search', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({
        expandedPanels: { recentSearches: ['old-search'] },
      });
      mockPrisma.userSettings.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/search/recent')
        .send({ query: 'new-search' });

      expect(res.status).toBe(200);
      expect(res.body.recentSearches[0]).toBe('new-search');
    });

    it('should return 400 when query is missing', async () => {
      const res = await request(app).post('/api/search/recent').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Query is required');
    });

    it('should deduplicate searches', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({
        expandedPanels: { recentSearches: ['test', 'other'] },
      });
      mockPrisma.userSettings.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/search/recent')
        .send({ query: 'test' });

      expect(res.body.recentSearches).toEqual(['test', 'other']);
    });

    it('should limit to 10 recent searches', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({
        expandedPanels: {
          recentSearches: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        },
      });
      mockPrisma.userSettings.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/search/recent')
        .send({ query: 'new' });

      expect(res.body.recentSearches.length).toBe(10);
      expect(res.body.recentSearches[0]).toBe('new');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.userSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/search/recent')
        .send({ query: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save recent search');
    });
  });

  // ============================================
  // CLEAR RECENT SEARCHES
  // ============================================

  describe('DELETE /api/search/recent', () => {
    it('should clear all recent searches', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({
        expandedPanels: { recentSearches: ['test', 'other'] },
      });
      mockPrisma.userSettings.update.mockResolvedValue({});

      const res = await request(app).delete('/api/search/recent');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.userSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expandedPanels: expect.objectContaining({
              recentSearches: [],
            }),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.userSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/search/recent');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to clear recent searches');
    });
  });
});
