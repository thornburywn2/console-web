/**
 * Alerts Routes Tests
 * Phase 5.3: Test Coverage for Alert Rules API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAlertsRouter } from './alerts.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => {
    req.validatedBody = req.body;
    next();
  },
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

describe('Alerts Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const cpuAlert = {
    id: 'alert-cpu',
    name: 'High CPU Usage',
    description: 'Alert when CPU exceeds 80%',
    type: 'CPU',
    condition: 'GT',
    threshold: 80,
    duration: 60,
    enabled: true,
    notifySound: true,
    notifyDesktop: true,
    cooldownMins: 5,
    triggerCount: 10,
    lastTriggered: new Date('2026-01-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const memoryAlert = {
    id: 'alert-memory',
    name: 'High Memory Usage',
    description: 'Alert when memory exceeds 85%',
    type: 'MEMORY',
    condition: 'GT',
    threshold: 85,
    duration: 30,
    enabled: false,
    notifySound: true,
    notifyDesktop: false,
    cooldownMins: 5,
    triggerCount: 0,
    lastTriggered: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    mockPrisma = {
      alertRule: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
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

    app.use('/api/alerts', createAlertsRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST ALERT RULES
  // ============================================

  describe('GET /api/alerts', () => {
    it('should return all alert rules', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([cpuAlert, memoryAlert]);

      const res = await request(app).get('/api/alerts');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should order by enabled first, then type, then name', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([]);

      await request(app).get('/api/alerts');

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [
          { enabled: 'desc' },
          { type: 'asc' },
          { name: 'asc' },
        ],
      });
    });

    it('should filter by type', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([cpuAlert]);

      await request(app).get('/api/alerts?type=cpu');

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { type: 'CPU' },
        orderBy: expect.any(Array),
      });
    });

    it('should filter by enabled status', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([cpuAlert]);

      await request(app).get('/api/alerts?enabled=true');

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
        orderBy: expect.any(Array),
      });
    });

    it('should filter by type and enabled together', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([]);

      await request(app).get('/api/alerts?type=memory&enabled=false');

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { type: 'MEMORY', enabled: false },
        orderBy: expect.any(Array),
      });
    });

    it('should return empty array when no rules exist', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/alerts');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/alerts');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch alert rules');
    });
  });

  // ============================================
  // GET SINGLE ALERT RULE
  // ============================================

  describe('GET /api/alerts/:id', () => {
    it('should return an alert rule by id', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(cpuAlert);

      const res = await request(app).get('/api/alerts/alert-cpu');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('High CPU Usage');
      expect(res.body.threshold).toBe(80);
    });

    it('should return 404 for non-existent rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/alerts/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Alert rule not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/alerts/alert-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch alert rule');
    });
  });

  // ============================================
  // CREATE ALERT RULE
  // ============================================

  describe('POST /api/alerts', () => {
    it('should create a new alert rule', async () => {
      mockPrisma.alertRule.create.mockResolvedValue(cpuAlert);

      const res = await request(app)
        .post('/api/alerts')
        .send({
          name: 'High CPU Usage',
          description: 'Alert when CPU exceeds 80%',
          metric: 'cpu',
          condition: 'gt',
          threshold: 80,
          duration: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('High CPU Usage');
    });

    it('should trim name and description', async () => {
      mockPrisma.alertRule.create.mockResolvedValue(cpuAlert);

      await request(app)
        .post('/api/alerts')
        .send({
          name: '  High CPU Usage  ',
          description: '  Alert description  ',
          metric: 'cpu',
          condition: 'gt',
          threshold: 80,
        });

      expect(mockPrisma.alertRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'High CPU Usage',
          description: 'Alert description',
        }),
      });
    });

    it('should uppercase metric and condition', async () => {
      mockPrisma.alertRule.create.mockResolvedValue(cpuAlert);

      await request(app)
        .post('/api/alerts')
        .send({
          name: 'Test Alert',
          metric: 'memory',
          condition: 'gte',
          threshold: 90,
        });

      expect(mockPrisma.alertRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MEMORY',
          condition: 'GTE',
        }),
      });
    });

    it('should set default values', async () => {
      mockPrisma.alertRule.create.mockResolvedValue(cpuAlert);

      await request(app)
        .post('/api/alerts')
        .send({
          name: 'Test Alert',
          metric: 'disk',
          condition: 'gt',
          threshold: 90,
        });

      expect(mockPrisma.alertRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          enabled: true,
          notifySound: true,
          notifyDesktop: true,
          cooldownMins: 5,
        }),
      });
    });

    it('should handle custom cooldown minutes', async () => {
      mockPrisma.alertRule.create.mockResolvedValue(cpuAlert);

      await request(app)
        .post('/api/alerts')
        .send({
          name: 'Test Alert',
          metric: 'cpu',
          condition: 'gt',
          threshold: 80,
          cooldownMinutes: 15,
        });

      expect(mockPrisma.alertRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cooldownMins: 15,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/alerts')
        .send({
          name: 'Test',
          metric: 'cpu',
          condition: 'gt',
          threshold: 80,
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create alert rule');
    });
  });

  // ============================================
  // UPDATE ALERT RULE
  // ============================================

  describe('PUT /api/alerts/:id', () => {
    it('should update an alert rule', async () => {
      mockPrisma.alertRule.update.mockResolvedValue({
        ...cpuAlert,
        name: 'Updated Alert',
      });

      const res = await request(app)
        .put('/api/alerts/alert-cpu')
        .send({ name: 'Updated Alert' });

      expect(res.status).toBe(200);
    });

    it('should trim name when updating', async () => {
      mockPrisma.alertRule.update.mockResolvedValue(cpuAlert);

      await request(app)
        .put('/api/alerts/alert-cpu')
        .send({ name: '  Updated Name  ' });

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: { name: 'Updated Name' },
      });
    });

    it('should uppercase metric and condition when updating', async () => {
      mockPrisma.alertRule.update.mockResolvedValue(cpuAlert);

      await request(app)
        .put('/api/alerts/alert-cpu')
        .send({ metric: 'disk', condition: 'lte' });

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: { type: 'DISK', condition: 'LTE' },
      });
    });

    it('should update multiple fields', async () => {
      mockPrisma.alertRule.update.mockResolvedValue(cpuAlert);

      await request(app)
        .put('/api/alerts/alert-cpu')
        .send({
          name: 'New Name',
          threshold: 95,
          enabled: false,
        });

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: {
          name: 'New Name',
          threshold: 95,
          enabled: false,
        },
      });
    });

    it('should update cooldown minutes', async () => {
      mockPrisma.alertRule.update.mockResolvedValue(cpuAlert);

      await request(app)
        .put('/api/alerts/alert-cpu')
        .send({ cooldownMinutes: 30 });

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: { cooldownMins: 30 },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/alerts/alert-cpu')
        .send({ name: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update alert rule');
    });
  });

  // ============================================
  // DELETE ALERT RULE
  // ============================================

  describe('DELETE /api/alerts/:id', () => {
    it('should delete an alert rule', async () => {
      mockPrisma.alertRule.delete.mockResolvedValue(cpuAlert);

      const res = await request(app).delete('/api/alerts/alert-cpu');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.alertRule.delete).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/alerts/alert-cpu');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete alert rule');
    });
  });

  // ============================================
  // TOGGLE ALERT RULE
  // ============================================

  describe('PUT /api/alerts/:id/toggle', () => {
    it('should toggle alert rule to enabled', async () => {
      mockPrisma.alertRule.update.mockResolvedValue({ ...memoryAlert, enabled: true });

      const res = await request(app)
        .put('/api/alerts/alert-memory/toggle')
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-memory' },
        data: { enabled: true },
      });
    });

    it('should toggle alert rule to disabled', async () => {
      mockPrisma.alertRule.update.mockResolvedValue({ ...cpuAlert, enabled: false });

      const res = await request(app)
        .put('/api/alerts/alert-cpu/toggle')
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: { enabled: false },
      });
    });

    it('should default to enabled when no body', async () => {
      mockPrisma.alertRule.update.mockResolvedValue(cpuAlert);

      await request(app).put('/api/alerts/alert-cpu/toggle').send({});

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: { enabled: true },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/alerts/alert-cpu/toggle')
        .send({ enabled: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to toggle alert rule');
    });
  });

  // ============================================
  // TEST ALERT RULE
  // ============================================

  describe('POST /api/alerts/:id/test', () => {
    it('should test an alert rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(cpuAlert);

      const res = await request(app).post('/api/alerts/alert-cpu/test');

      expect(res.status).toBe(200);
      expect(res.body.testTriggered).toBe(true);
      expect(res.body.rule).toBeDefined();
      expect(res.body.message).toBe('Alert "High CPU Usage" test triggered');
    });

    it('should return 404 for non-existent rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/alerts/nonexistent/test');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Alert rule not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/alerts/alert-cpu/test');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to test alert rule');
    });
  });

  // ============================================
  // TRIGGER ALERT RULE
  // ============================================

  describe('POST /api/alerts/:id/trigger', () => {
    it('should record alert trigger', async () => {
      mockPrisma.alertRule.update.mockResolvedValue({
        ...cpuAlert,
        triggerCount: 11,
        lastTriggered: new Date(),
      });

      const res = await request(app)
        .post('/api/alerts/alert-cpu/trigger')
        .send({ currentValue: 92 });

      expect(res.status).toBe(200);
      expect(res.body.triggered).toBe(true);
      expect(res.body.currentValue).toBe(92);
    });

    it('should increment trigger count', async () => {
      mockPrisma.alertRule.update.mockResolvedValue(cpuAlert);

      await request(app)
        .post('/api/alerts/alert-cpu/trigger')
        .send({ currentValue: 85 });

      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: {
          lastTriggered: expect.any(Date),
          triggerCount: { increment: 1 },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/alerts/alert-cpu/trigger')
        .send({ currentValue: 85 });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to record trigger');
    });
  });

  // ============================================
  // GET ALERT HISTORY
  // ============================================

  describe('GET /api/alerts/:id/history', () => {
    it('should return alert history', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue({
        id: 'alert-cpu',
        name: 'High CPU Usage',
        lastTriggered: new Date('2026-01-15'),
        triggerCount: 10,
      });

      const res = await request(app).get('/api/alerts/alert-cpu/history');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('alert-cpu');
      expect(res.body.triggerCount).toBe(10);
    });

    it('should return only selected fields', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue({});

      await request(app).get('/api/alerts/alert-cpu/history');

      expect(mockPrisma.alertRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        select: {
          id: true,
          name: true,
          lastTriggered: true,
          triggerCount: true,
        },
      });
    });

    it('should return 404 for non-existent rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/alerts/nonexistent/history');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Alert rule not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/alerts/alert-cpu/history');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch history');
    });
  });

  // ============================================
  // RESET ALERT TRIGGER COUNT
  // ============================================

  describe('POST /api/alerts/:id/reset', () => {
    it('should reset trigger count and last triggered', async () => {
      mockPrisma.alertRule.update.mockResolvedValue({
        ...cpuAlert,
        triggerCount: 0,
        lastTriggered: null,
      });

      const res = await request(app).post('/api/alerts/alert-cpu/reset');

      expect(res.status).toBe(200);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'alert-cpu' },
        data: {
          triggerCount: 0,
          lastTriggered: null,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.alertRule.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app).post('/api/alerts/alert-cpu/reset');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reset alert');
    });
  });

  // ============================================
  // GET DEFAULT TEMPLATES
  // ============================================

  describe('GET /api/alerts/templates/defaults', () => {
    it('should return default alert templates', async () => {
      const res = await request(app).get('/api/alerts/templates/defaults');

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should include CPU, Memory, Disk, Service, and Container templates', async () => {
      const res = await request(app).get('/api/alerts/templates/defaults');

      const types = res.body.map((t) => t.type);
      expect(types).toContain('CPU');
      expect(types).toContain('MEMORY');
      expect(types).toContain('DISK');
      expect(types).toContain('SERVICE');
      expect(types).toContain('CONTAINER');
    });

    it('should include required fields in each template', async () => {
      const res = await request(app).get('/api/alerts/templates/defaults');

      res.body.forEach((template) => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('condition');
        expect(template).toHaveProperty('threshold');
        expect(template).toHaveProperty('cooldownMins');
      });
    });
  });
});
