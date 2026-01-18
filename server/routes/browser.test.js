/**
 * Tests for Browser Routes
 * Tests browser sessions, screenshots, and logs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createBrowserRouter } from './browser.js';

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
    browserSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    browserScreenshot: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/browser', createBrowserRouter(prisma));
  return app;
}

describe('Browser Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // BROWSER SESSION CRUD
  // ==========================================================================
  describe('GET /api/browser', () => {
    it('should return all browser sessions with pagination', async () => {
      mockPrisma.browserSession.findMany.mockResolvedValue([
        { id: 'bs1', url: 'https://example.com', isActive: true, screenshots: [] },
      ]);
      mockPrisma.browserSession.count.mockResolvedValue(1);

      const res = await request(app).get('/api/browser');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('should filter by projectId', async () => {
      mockPrisma.browserSession.findMany.mockResolvedValue([]);
      mockPrisma.browserSession.count.mockResolvedValue(0);

      await request(app).get('/api/browser?projectId=proj-1');

      expect(mockPrisma.browserSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'proj-1' }),
        })
      );
    });

    it('should filter by active status', async () => {
      mockPrisma.browserSession.findMany.mockResolvedValue([]);
      mockPrisma.browserSession.count.mockResolvedValue(0);

      await request(app).get('/api/browser?isActive=true');

      expect(mockPrisma.browserSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe('GET /api/browser/:id', () => {
    it('should return browser session with screenshots', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue({
        id: 'bs1',
        url: 'https://example.com',
        title: 'Example',
        screenshots: [{ id: 'ss1' }],
      });

      const res = await request(app).get('/api/browser/bs1');

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://example.com');
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/browser/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/browser', () => {
    it('should create browser session', async () => {
      mockPrisma.browserSession.create.mockResolvedValue({
        id: 'new-bs',
        url: 'https://app.example.com',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/browser')
        .send({ url: 'https://app.example.com' });

      expect(res.status).toBe(201);
      expect(res.body.url).toBe('https://app.example.com');
    });

    it('should reject missing URL', async () => {
      const res = await request(app)
        .post('/api/browser')
        .send({ title: 'No URL' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('URL is required');
    });

    it('should use default viewport', async () => {
      mockPrisma.browserSession.create.mockResolvedValue({ id: 'bs1' });

      await request(app)
        .post('/api/browser')
        .send({ url: 'https://example.com' });

      expect(mockPrisma.browserSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            viewport: { width: 1280, height: 720 },
          }),
        })
      );
    });
  });

  describe('PUT /api/browser/:id', () => {
    it('should update browser session', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue({ id: 'bs1' });
      mockPrisma.browserSession.update.mockResolvedValue({
        id: 'bs1',
        url: 'https://updated.com',
        screenshots: [],
      });

      const res = await request(app)
        .put('/api/browser/bs1')
        .send({ url: 'https://updated.com' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/browser/nonexistent')
        .send({ title: 'Update' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/browser/:id/navigate', () => {
    it('should navigate to URL', async () => {
      mockPrisma.browserSession.update.mockResolvedValue({
        id: 'bs1',
        url: 'https://new-url.com',
      });

      const res = await request(app)
        .post('/api/browser/bs1/navigate')
        .send({ url: 'https://new-url.com' });

      expect(res.status).toBe(200);
    });

    it('should reject missing URL', async () => {
      const res = await request(app)
        .post('/api/browser/bs1/navigate')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/browser/:id/close', () => {
    it('should close browser session', async () => {
      mockPrisma.browserSession.update.mockResolvedValue({
        id: 'bs1',
        isActive: false,
      });

      const res = await request(app).post('/api/browser/bs1/close');

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });
  });

  describe('DELETE /api/browser/:id', () => {
    it('should delete browser session', async () => {
      mockPrisma.browserSession.delete.mockResolvedValue({ id: 'bs1' });

      const res = await request(app).delete('/api/browser/bs1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // SCREENSHOTS
  // ==========================================================================
  describe('POST /api/browser/:id/screenshots', () => {
    it('should add screenshot', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue({
        id: 'bs1',
        url: 'https://example.com',
      });
      mockPrisma.browserScreenshot.create.mockResolvedValue({
        id: 'ss1',
        dataUrl: 'data:image/png;base64,...',
      });

      const res = await request(app)
        .post('/api/browser/bs1/screenshots')
        .send({ dataUrl: 'data:image/png;base64,...' });

      expect(res.status).toBe(201);
    });

    it('should reject missing dataUrl', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue({ id: 'bs1' });

      const res = await request(app)
        .post('/api/browser/bs1/screenshots')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/browser/nonexistent/screenshots')
        .send({ dataUrl: 'data:...' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/browser/:id/screenshots', () => {
    it('should return screenshots with pagination', async () => {
      mockPrisma.browserScreenshot.findMany.mockResolvedValue([
        { id: 'ss1' },
        { id: 'ss2' },
      ]);
      mockPrisma.browserScreenshot.count.mockResolvedValue(2);

      const res = await request(app).get('/api/browser/bs1/screenshots');

      expect(res.status).toBe(200);
      expect(res.body.screenshots).toHaveLength(2);
    });
  });

  describe('DELETE /api/browser/:sessionId/screenshots/:screenshotId', () => {
    it('should delete screenshot', async () => {
      mockPrisma.browserScreenshot.delete.mockResolvedValue({ id: 'ss1' });

      const res = await request(app).delete('/api/browser/bs1/screenshots/ss1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // CONSOLE & NETWORK LOGS
  // ==========================================================================
  describe('POST /api/browser/:id/console', () => {
    it('should append console logs', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue({
        id: 'bs1',
        consoleLogs: [{ type: 'log', message: 'existing' }],
      });
      mockPrisma.browserSession.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/browser/bs1/console')
        .send({ logs: [{ type: 'error', message: 'new error' }] });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it('should reject non-array logs', async () => {
      const res = await request(app)
        .post('/api/browser/bs1/console')
        .send({ logs: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/browser/nonexistent/console')
        .send({ logs: [] });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/browser/:id/network', () => {
    it('should append network logs', async () => {
      mockPrisma.browserSession.findUnique.mockResolvedValue({
        id: 'bs1',
        networkLogs: [],
      });
      mockPrisma.browserSession.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/browser/bs1/network')
        .send({ logs: [{ url: '/api/test', status: 200 }] });

      expect(res.status).toBe(200);
    });

    it('should reject non-array logs', async () => {
      const res = await request(app)
        .post('/api/browser/bs1/network')
        .send({ logs: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  describe('POST /api/browser/cleanup', () => {
    it('should cleanup old inactive sessions', async () => {
      mockPrisma.browserSession.deleteMany.mockResolvedValue({ count: 3 });

      const res = await request(app)
        .post('/api/browser/cleanup')
        .send({ days: 7 });

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(3);
    });
  });
});
