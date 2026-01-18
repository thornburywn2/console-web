/**
 * Shortcuts Routes Tests
 * Phase 5.3: Test Coverage for Keyboard Shortcuts API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createShortcutsRouter } from './shortcuts.js';

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

describe('Shortcuts Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const customShortcut = {
    id: 'shortcut-1',
    action: 'openCommandPalette',
    keys: 'Ctrl+K',
    description: 'Open command palette',
    category: 'navigation',
    isCustom: true,
    isEnabled: true,
  };

  const customShortcut2 = {
    id: 'shortcut-2',
    action: 'customAction',
    keys: 'Ctrl+Alt+X',
    description: 'Custom action',
    category: 'custom',
    isCustom: true,
    isEnabled: true,
  };

  beforeEach(() => {
    mockPrisma = {
      keyboardShortcut: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/shortcuts', createShortcutsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST SHORTCUTS
  // ============================================

  describe('GET /api/shortcuts', () => {
    it('should return defaults when no custom shortcuts exist', async () => {
      mockPrisma.keyboardShortcut.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/shortcuts');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('action');
      expect(res.body[0]).toHaveProperty('keys');
      expect(res.body[0]).toHaveProperty('isCustom', false);
    });

    it('should merge custom shortcuts with defaults', async () => {
      mockPrisma.keyboardShortcut.findMany.mockResolvedValue([customShortcut]);

      const res = await request(app).get('/api/shortcuts');

      expect(res.status).toBe(200);
      const commandPalette = res.body.find((s) => s.action === 'openCommandPalette');
      expect(commandPalette).toBeDefined();
      expect(commandPalette.keys).toBe('Ctrl+K'); // Custom override
      expect(commandPalette.isCustom).toBe(true);
    });

    it('should include custom shortcuts not in defaults', async () => {
      mockPrisma.keyboardShortcut.findMany.mockResolvedValue([customShortcut2]);

      const res = await request(app).get('/api/shortcuts');

      expect(res.status).toBe(200);
      const custom = res.body.find((s) => s.action === 'customAction');
      expect(custom).toBeDefined();
      expect(custom.keys).toBe('Ctrl+Alt+X');
    });

    it('should order by category', async () => {
      mockPrisma.keyboardShortcut.findMany.mockResolvedValue([]);

      await request(app).get('/api/shortcuts');

      expect(mockPrisma.keyboardShortcut.findMany).toHaveBeenCalledWith({
        orderBy: { category: 'asc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.keyboardShortcut.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/shortcuts');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch shortcuts');
    });
  });

  // ============================================
  // GET DEFAULTS
  // ============================================

  describe('GET /api/shortcuts/defaults', () => {
    it('should return default shortcuts', async () => {
      const res = await request(app).get('/api/shortcuts/defaults');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should include required fields in each default', async () => {
      const res = await request(app).get('/api/shortcuts/defaults');

      res.body.forEach((shortcut) => {
        expect(shortcut).toHaveProperty('action');
        expect(shortcut).toHaveProperty('keys');
        expect(shortcut).toHaveProperty('description');
        expect(shortcut).toHaveProperty('category');
      });
    });

    it('should include all categories', async () => {
      const res = await request(app).get('/api/shortcuts/defaults');

      const categories = [...new Set(res.body.map((s) => s.category))];
      expect(categories).toContain('navigation');
      expect(categories).toContain('view');
      expect(categories).toContain('session');
      expect(categories).toContain('terminal');
    });
  });

  // ============================================
  // UPDATE SHORTCUT
  // ============================================

  describe('PUT /api/shortcuts/:action', () => {
    it('should update an existing shortcut', async () => {
      mockPrisma.keyboardShortcut.upsert.mockResolvedValue({
        ...customShortcut,
        keys: 'Ctrl+Shift+K',
      });

      const res = await request(app)
        .put('/api/shortcuts/openCommandPalette')
        .send({ keys: 'Ctrl+Shift+K' });

      expect(res.status).toBe(200);
      expect(res.body.keys).toBe('Ctrl+Shift+K');
    });

    it('should create a new custom shortcut', async () => {
      mockPrisma.keyboardShortcut.upsert.mockResolvedValue(customShortcut2);

      const res = await request(app).put('/api/shortcuts/customAction').send({
        keys: 'Ctrl+Alt+X',
        description: 'Custom action',
      });

      expect(res.status).toBe(200);
    });

    it('should update isEnabled status', async () => {
      mockPrisma.keyboardShortcut.upsert.mockResolvedValue({
        ...customShortcut,
        isEnabled: false,
      });

      await request(app)
        .put('/api/shortcuts/openCommandPalette')
        .send({ isEnabled: false });

      expect(mockPrisma.keyboardShortcut.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isEnabled: false }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.keyboardShortcut.upsert.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/shortcuts/openCommandPalette')
        .send({ keys: 'Ctrl+K' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update shortcut');
    });
  });

  // ============================================
  // RESET SINGLE SHORTCUT
  // ============================================

  describe('DELETE /api/shortcuts/:action', () => {
    it('should reset a shortcut to default', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete('/api/shortcuts/openCommandPalette');

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('openCommandPalette');
      expect(res.body.isCustom).toBe(false);
    });

    it('should return default values after reset', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete('/api/shortcuts/openCommandPalette');

      expect(res.body.keys).toBe('Ctrl+Shift+P'); // Default key
    });

    it('should return message for non-default shortcuts', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete('/api/shortcuts/customAction');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Shortcut removed');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/shortcuts/openCommandPalette');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reset shortcut');
    });
  });

  // ============================================
  // RESET ALL SHORTCUTS
  // ============================================

  describe('POST /api/shortcuts/reset', () => {
    it('should reset all shortcuts to defaults', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockResolvedValue({ count: 5 });

      const res = await request(app).post('/api/shortcuts/reset');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should delete all custom shortcuts', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockResolvedValue({ count: 0 });

      await request(app).post('/api/shortcuts/reset');

      expect(mockPrisma.keyboardShortcut.deleteMany).toHaveBeenCalledWith({});
    });

    it('should return defaults with isCustom false', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockResolvedValue({ count: 0 });

      const res = await request(app).post('/api/shortcuts/reset');

      res.body.forEach((shortcut) => {
        expect(shortcut.isCustom).toBe(false);
        expect(shortcut.isEnabled).toBe(true);
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.keyboardShortcut.deleteMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/shortcuts/reset');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reset shortcuts');
    });
  });
});
