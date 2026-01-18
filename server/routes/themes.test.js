/**
 * Themes Routes Tests
 * Phase 5.3: Test Coverage for Theme Management API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createThemesRouter } from './themes.js';

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

describe('Themes Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const builtInTheme = {
    id: 'theme-dark',
    name: 'dark',
    displayName: 'Dark (Default)',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      textPrimary: '#f8fafc',
      accentPrimary: '#3b82f6',
    },
    isBuiltIn: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const customTheme = {
    id: 'theme-custom',
    name: 'my-custom-theme',
    displayName: 'My Custom Theme',
    colors: {
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16213e',
      textPrimary: '#eaeaea',
      accentPrimary: '#e94560',
    },
    isBuiltIn: false,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      theme: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
    };

    // Create app with router
    app = express();
    app.use(express.json());

    // Middleware to set test context
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      req.user = { id: 'test-user-id' };
      next();
    });

    app.use('/api/themes', createThemesRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST THEMES
  // ============================================

  describe('GET /api/themes', () => {
    it('should return all themes', async () => {
      mockPrisma.theme.findMany.mockResolvedValue([builtInTheme, customTheme]);

      const res = await request(app).get('/api/themes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should order by built-in first, then name', async () => {
      mockPrisma.theme.findMany.mockResolvedValue([]);

      await request(app).get('/api/themes');

      expect(mockPrisma.theme.findMany).toHaveBeenCalledWith({
        orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/themes');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch themes');
    });
  });

  // ============================================
  // GET ACTIVE THEME
  // ============================================

  describe('GET /api/themes/active', () => {
    it('should return the active theme', async () => {
      mockPrisma.theme.findFirst.mockResolvedValue(builtInTheme);

      const res = await request(app).get('/api/themes/active');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('dark');
      expect(res.body.isActive).toBe(true);
    });

    it('should return default theme if no active theme found', async () => {
      mockPrisma.theme.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/themes/active');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('dark');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findFirst.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/themes/active');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch active theme');
    });
  });

  // ============================================
  // GET SINGLE THEME
  // ============================================

  describe('GET /api/themes/:name', () => {
    it('should return a theme by name', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);

      const res = await request(app).get('/api/themes/my-custom-theme');

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('My Custom Theme');
    });

    it('should return 404 for non-existent theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/themes/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Theme not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/themes/some-theme');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch theme');
    });
  });

  // ============================================
  // CREATE THEME
  // ============================================

  describe('POST /api/themes', () => {
    it('should create a new custom theme', async () => {
      mockPrisma.theme.create.mockResolvedValue(customTheme);

      const res = await request(app)
        .post('/api/themes')
        .send({
          name: 'My Custom Theme',
          displayName: 'My Custom Theme',
          colors: customTheme.colors,
        });

      expect(res.status).toBe(201);
      expect(res.body.isBuiltIn).toBe(false);
    });

    it('should normalize theme name to lowercase kebab-case', async () => {
      mockPrisma.theme.create.mockResolvedValue(customTheme);

      await request(app)
        .post('/api/themes')
        .send({
          name: '  My Custom Theme  ',
          colors: customTheme.colors,
        });

      expect(mockPrisma.theme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'my-custom-theme',
        }),
      });
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({
          colors: customTheme.colors,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Theme name is required');
    });

    it('should return 400 if colors is missing', async () => {
      const res = await request(app)
        .post('/api/themes')
        .send({
          name: 'test-theme',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Theme colors are required');
    });

    it('should return 409 for duplicate theme name', async () => {
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.theme.create.mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/themes')
        .send({
          name: 'existing',
          colors: customTheme.colors,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Theme name already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/themes')
        .send({
          name: 'test',
          colors: customTheme.colors,
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create theme');
    });
  });

  // ============================================
  // UPDATE THEME
  // ============================================

  describe('PUT /api/themes/:name', () => {
    it('should update a custom theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.update.mockResolvedValue({
        ...customTheme,
        displayName: 'Updated Name',
      });

      const res = await request(app)
        .put('/api/themes/my-custom-theme')
        .send({ displayName: 'Updated Name' });

      expect(res.status).toBe(200);
    });

    it('should update theme colors', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.update.mockResolvedValue(customTheme);

      const newColors = { bgPrimary: '#000000' };
      await request(app)
        .put('/api/themes/my-custom-theme')
        .send({ colors: newColors });

      expect(mockPrisma.theme.update).toHaveBeenCalledWith({
        where: { name: 'my-custom-theme' },
        data: { colors: newColors },
      });
    });

    it('should return 404 for non-existent theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/themes/nonexistent')
        .send({ displayName: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Theme not found');
    });

    it('should return 403 for built-in theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(builtInTheme);

      const res = await request(app)
        .put('/api/themes/dark')
        .send({ displayName: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot modify built-in themes');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/themes/my-custom-theme')
        .send({ displayName: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update theme');
    });
  });

  // ============================================
  // DELETE THEME
  // ============================================

  describe('DELETE /api/themes/:name', () => {
    it('should delete a custom theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.delete.mockResolvedValue(customTheme);

      const res = await request(app).delete('/api/themes/my-custom-theme');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should switch to default theme if deleting active custom theme', async () => {
      const activeCustomTheme = { ...customTheme, isActive: true };
      mockPrisma.theme.findUnique.mockResolvedValue(activeCustomTheme);
      mockPrisma.theme.update.mockResolvedValue(builtInTheme);
      mockPrisma.theme.delete.mockResolvedValue(activeCustomTheme);

      await request(app).delete('/api/themes/my-custom-theme');

      expect(mockPrisma.theme.update).toHaveBeenCalledWith({
        where: { name: 'dark' },
        data: { isActive: true },
      });
    });

    it('should return 404 for non-existent theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/themes/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Theme not found');
    });

    it('should return 403 for built-in theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(builtInTheme);

      const res = await request(app).delete('/api/themes/dark');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot delete built-in themes');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/themes/my-custom-theme');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete theme');
    });
  });

  // ============================================
  // ACTIVATE THEME
  // ============================================

  describe('PUT /api/themes/:name/activate', () => {
    it('should activate a theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.theme.update.mockResolvedValue({ ...customTheme, isActive: true });

      const res = await request(app).put('/api/themes/my-custom-theme/activate');

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(true);
    });

    it('should deactivate all themes before activating', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(customTheme);
      mockPrisma.theme.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.theme.update.mockResolvedValue({ ...customTheme, isActive: true });

      await request(app).put('/api/themes/my-custom-theme/activate');

      expect(mockPrisma.theme.updateMany).toHaveBeenCalledWith({
        data: { isActive: false },
      });
    });

    it('should return 404 for non-existent theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      const res = await request(app).put('/api/themes/nonexistent/activate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Theme not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).put('/api/themes/my-custom-theme/activate');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to activate theme');
    });
  });

  // ============================================
  // DUPLICATE THEME
  // ============================================

  describe('POST /api/themes/:name/duplicate', () => {
    it('should duplicate a theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(builtInTheme);
      mockPrisma.theme.create.mockResolvedValue({
        ...builtInTheme,
        id: 'theme-copy',
        name: 'dark-custom',
        displayName: 'Dark (Default) (Custom)',
        isBuiltIn: false,
        isActive: false,
      });

      const res = await request(app).post('/api/themes/dark/duplicate');

      expect(res.status).toBe(201);
      expect(res.body.isBuiltIn).toBe(false);
    });

    it('should use provided newName', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(builtInTheme);
      mockPrisma.theme.create.mockResolvedValue({
        ...builtInTheme,
        name: 'my-dark',
        isBuiltIn: false,
      });

      await request(app)
        .post('/api/themes/dark/duplicate')
        .send({ newName: 'My Dark' });

      expect(mockPrisma.theme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'my-dark',
        }),
      });
    });

    it('should return 404 for non-existent theme', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/themes/nonexistent/duplicate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Theme not found');
    });

    it('should return 409 for duplicate name', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(builtInTheme);
      const duplicateError = new Error('Unique constraint');
      duplicateError.code = 'P2002';
      mockPrisma.theme.create.mockRejectedValue(duplicateError);

      const res = await request(app).post('/api/themes/dark/duplicate');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Theme name already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.theme.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/themes/dark/duplicate');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to duplicate theme');
    });
  });
});
