/**
 * Tests for Monitoring Routes
 * Tests metrics, uptime, network, and cost tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  createMetricsRouter,
  createUptimeRouter,
  createNetworkRouter,
  createCostRouter,
} from './monitoring.js';

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

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => next(),
}));

// Mock validation schema
vi.mock('../validation/schemas.js', () => ({
  uptimeCheckSchema: {},
}));

// Mock os
vi.mock('os', () => ({
  default: {
    cpus: () => [{ model: 'CPU', speed: 2400 }, { model: 'CPU', speed: 2400 }],
    totalmem: () => 8 * 1024 * 1024 * 1024, // 8GB
    freemem: () => 2 * 1024 * 1024 * 1024, // 2GB free
    loadavg: () => [1.5, 1.2, 1.0],
    uptime: () => 86400, // 1 day
    networkInterfaces: () => ({
      eth0: [
        { family: 'IPv4', address: '192.168.1.100', mac: '00:11:22:33:44:55', internal: false },
        { family: 'IPv6', address: 'fe80::1', internal: true },
      ],
      lo: [
        { family: 'IPv4', address: '127.0.0.1', mac: '00:00:00:00:00:00', internal: true },
      ],
    }),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn((path) => {
    if (path === '/proc/stat') {
      return 'cpu  1000 100 500 5000 50 10 5 0 0 0\ncpu0 500 50 250 2500 25 5 2 0 0 0';
    }
    return '';
  }),
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn((cmd) => {
    if (cmd.includes('df -h')) {
      return '/dev/sda1  100G  50G  50G  50%  /';
    }
    if (cmd.includes('/sys/class/net')) {
      return '12345';
    }
    return '';
  }),
}));

// Create mock prisma
function createMockPrisma() {
  return {
    resourceMetric: {
      findMany: vi.fn(),
    },
    uptimeService: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    uptimeCheck: {
      create: vi.fn(),
    },
    aPIUsage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('Monitoring Routes', () => {
  let mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ==========================================================================
  // METRICS ROUTER
  // ==========================================================================
  describe('Metrics Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/metrics', createMetricsRouter(mockPrisma));
    });

    describe('GET /api/metrics/:type', () => {
      it('should return metrics for specific type', async () => {
        mockPrisma.resourceMetric.findMany.mockResolvedValue([
          { value: 50, timestamp: new Date() },
          { value: 55, timestamp: new Date() },
        ]);

        const res = await request(app).get('/api/metrics/cpu');

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toHaveLength(2);
      });

      it('should filter by time range', async () => {
        mockPrisma.resourceMetric.findMany.mockResolvedValue([]);

        await request(app).get('/api/metrics/memory?minutes=30');

        expect(mockPrisma.resourceMetric.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              type: 'MEMORY',
            }),
          })
        );
      });

      it('should return empty array on error', async () => {
        mockPrisma.resourceMetric.findMany.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/metrics/cpu');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
      });
    });

    describe('GET /api/metrics', () => {
      it('should return current system metrics', async () => {
        const res = await request(app).get('/api/metrics');

        expect(res.status).toBe(200);
        expect(typeof res.body.cpu).toBe('number');
        expect(typeof res.body.memory).toBe('number');
        expect(typeof res.body.disk).toBe('number');
        expect(typeof res.body.uptime).toBe('number');
      });

      it('should include load average', async () => {
        const res = await request(app).get('/api/metrics');

        expect(res.status).toBe(200);
        expect(res.body.loadAverage).toBeDefined();
        expect(res.body.loadAverage).toHaveLength(3);
      });

      it('should return memory percentage', async () => {
        const res = await request(app).get('/api/metrics');

        expect(res.status).toBe(200);
        // 6GB used out of 8GB = 75%
        expect(res.body.memory).toBe(75);
      });
    });
  });

  // ==========================================================================
  // UPTIME ROUTER
  // ==========================================================================
  describe('Uptime Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/uptime', createUptimeRouter(mockPrisma));
    });

    describe('GET /api/uptime', () => {
      it('should return all services with uptime stats', async () => {
        mockPrisma.uptimeService.findMany.mockResolvedValue([
          {
            id: 'svc-1',
            name: 'API Server',
            url: 'http://localhost:3000',
            lastStatus: 'up',
            lastResponseTime: 50,
            checks: [
              { status: 'up', timestamp: new Date() },
              { status: 'up', timestamp: new Date() },
              { status: 'down', timestamp: new Date() },
            ],
          },
        ]);

        const res = await request(app).get('/api/uptime');

        expect(res.status).toBe(200);
        expect(res.body.services).toBeDefined();
        expect(res.body.services[0].uptime).toBeDefined();
      });

      it('should calculate correct uptime percentage', async () => {
        mockPrisma.uptimeService.findMany.mockResolvedValue([
          {
            id: 'svc-1',
            name: 'Test',
            checks: [
              { status: 'up', timestamp: new Date() },
              { status: 'up', timestamp: new Date() },
              { status: 'up', timestamp: new Date() },
              { status: 'down', timestamp: new Date() },
            ],
          },
        ]);

        const res = await request(app).get('/api/uptime');

        expect(res.status).toBe(200);
        expect(res.body.services[0].uptime).toBe(75); // 3/4 = 75%
      });

      it('should return empty array on error', async () => {
        mockPrisma.uptimeService.findMany.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/uptime');

        expect(res.status).toBe(200);
        expect(res.body.services).toEqual([]);
      });
    });

    describe('POST /api/uptime/:id/check', () => {
      it('should perform health check on service', async () => {
        mockPrisma.uptimeService.findUnique.mockResolvedValue({
          id: 'svc-1',
          url: 'http://localhost:3000/health',
        });
        mockPrisma.uptimeCheck.create.mockResolvedValue({ id: 'check-1' });
        mockPrisma.uptimeService.update.mockResolvedValue({ id: 'svc-1' });

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({ ok: true });

        const res = await request(app).post('/api/uptime/svc-1/check');

        expect(res.status).toBe(200);
        expect(res.body.status).toBeDefined();
        expect(res.body.responseTime).toBeDefined();
      });

      it('should return 404 for non-existent service', async () => {
        mockPrisma.uptimeService.findUnique.mockResolvedValue(null);

        const res = await request(app).post('/api/uptime/nonexistent/check');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Service not found');
      });

      it('should handle failed health checks', async () => {
        mockPrisma.uptimeService.findUnique.mockResolvedValue({
          id: 'svc-1',
          url: 'http://localhost:3000',
        });
        mockPrisma.uptimeCheck.create.mockResolvedValue({ id: 'check-1' });
        mockPrisma.uptimeService.update.mockResolvedValue({ id: 'svc-1' });

        global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

        const res = await request(app).post('/api/uptime/svc-1/check');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('down');
      });
    });

    describe('POST /api/uptime', () => {
      it('should create a new service to monitor', async () => {
        mockPrisma.uptimeService.create.mockResolvedValue({
          id: 'svc-new',
          name: 'New Service',
          url: 'http://localhost:4000',
        });

        const res = await request(app)
          .post('/api/uptime')
          .send({
            name: 'New Service',
            url: 'http://localhost:4000',
            checkInterval: 60,
          });

        expect(res.status).toBe(200);
        expect(res.body.service).toBeDefined();
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/uptime')
          .send({ name: 'Test' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Name and URL or endpoint required');
      });
    });

    describe('DELETE /api/uptime/:id', () => {
      it('should delete a service', async () => {
        mockPrisma.uptimeService.delete.mockResolvedValue({ id: 'svc-1' });

        const res = await request(app).delete('/api/uptime/svc-1');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should handle deletion errors', async () => {
        mockPrisma.uptimeService.delete.mockRejectedValue(new Error('Not found'));

        const res = await request(app).delete('/api/uptime/nonexistent');

        expect(res.status).toBe(500);
      });
    });
  });

  // ==========================================================================
  // NETWORK ROUTER
  // ==========================================================================
  describe('Network Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/network', createNetworkRouter(mockPrisma));
    });

    describe('GET /api/network', () => {
      it('should return network interfaces', async () => {
        const res = await request(app).get('/api/network');

        expect(res.status).toBe(200);
        expect(res.body.interfaces).toBeDefined();
        expect(Array.isArray(res.body.interfaces)).toBe(true);
      });

      it('should include interface details', async () => {
        const res = await request(app).get('/api/network');

        expect(res.status).toBe(200);
        const eth0 = res.body.interfaces.find(i => i.name === 'eth0');
        if (eth0) {
          expect(eth0.address).toBeDefined();
          expect(eth0.mac).toBeDefined();
        }
      });

      it('should include traffic statistics', async () => {
        const res = await request(app).get('/api/network');

        expect(res.status).toBe(200);
        res.body.interfaces.forEach(iface => {
          expect(typeof iface.rxBytes).toBe('number');
          expect(typeof iface.txBytes).toBe('number');
        });
      });
    });
  });

  // ==========================================================================
  // COST ROUTER
  // ==========================================================================
  describe('Cost Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/costs', createCostRouter(mockPrisma));
    });

    describe('GET /api/costs', () => {
      it('should return cost summary', async () => {
        mockPrisma.aPIUsage.findMany.mockResolvedValue([
          {
            provider: 'anthropic',
            model: 'claude-sonnet',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.05,
            timestamp: new Date(),
          },
          {
            provider: 'anthropic',
            model: 'claude-haiku',
            inputTokens: 2000,
            outputTokens: 1000,
            cost: 0.02,
            timestamp: new Date(),
          },
        ]);

        const res = await request(app).get('/api/costs');

        expect(res.status).toBe(200);
        expect(res.body.totalCost).toBe(0.07);
        expect(res.body.totalTokens).toBe(4500);
        expect(res.body.totalRequests).toBe(2);
      });

      it('should group by provider', async () => {
        mockPrisma.aPIUsage.findMany.mockResolvedValue([
          { provider: 'anthropic', model: 'claude', inputTokens: 1000, outputTokens: 500, cost: 0.05, timestamp: new Date() },
          { provider: 'openai', model: 'gpt-4', inputTokens: 500, outputTokens: 200, cost: 0.03, timestamp: new Date() },
        ]);

        const res = await request(app).get('/api/costs');

        expect(res.status).toBe(200);
        expect(res.body.byProvider.anthropic).toBeDefined();
        expect(res.body.byProvider.openai).toBeDefined();
      });

      it('should filter by date range', async () => {
        mockPrisma.aPIUsage.findMany.mockResolvedValue([]);

        await request(app).get('/api/costs?range=30d');

        expect(mockPrisma.aPIUsage.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              timestamp: expect.any(Object),
            }),
          })
        );
      });

      it('should calculate projected monthly cost', async () => {
        mockPrisma.aPIUsage.findMany.mockResolvedValue([
          { provider: 'anthropic', model: 'claude', inputTokens: 1000, outputTokens: 500, cost: 0.70, timestamp: new Date() },
        ]);

        const res = await request(app).get('/api/costs?range=7d');

        expect(res.status).toBe(200);
        expect(res.body.projectedMonthly).toBeDefined();
        // $0.70 / 7 days * 30 days = $3.00
        expect(res.body.projectedMonthly).toBeCloseTo(3.0, 1);
      });

      it('should return defaults on error', async () => {
        mockPrisma.aPIUsage.findMany.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/costs');

        expect(res.status).toBe(200);
        expect(res.body.totalCost).toBe(0);
        expect(res.body.totalTokens).toBe(0);
      });
    });

    describe('POST /api/costs', () => {
      it('should log API usage', async () => {
        mockPrisma.aPIUsage.create.mockResolvedValue({
          id: 'usage-1',
          model: 'claude-sonnet',
          inputTokens: 1000,
          outputTokens: 500,
          cost: 0.05,
        });

        const res = await request(app)
          .post('/api/costs')
          .send({
            sessionId: 'session-1',
            model: 'claude-sonnet',
            provider: 'anthropic',
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.05,
          });

        expect(res.status).toBe(200);
        expect(res.body.usage).toBeDefined();
      });

      it('should use default values', async () => {
        mockPrisma.aPIUsage.create.mockResolvedValue({ id: 'usage-1' });

        await request(app)
          .post('/api/costs')
          .send({ sessionId: 'session-1' });

        expect(mockPrisma.aPIUsage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              model: 'unknown',
              provider: 'anthropic',
              inputTokens: 0,
              outputTokens: 0,
            }),
          })
        );
      });

      it('should handle creation errors', async () => {
        mockPrisma.aPIUsage.create.mockRejectedValue(new Error('DB error'));

        const res = await request(app)
          .post('/api/costs')
          .send({ sessionId: 'session-1' });

        expect(res.status).toBe(500);
      });
    });
  });
});
