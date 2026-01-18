/**
 * Tests for Observability Routes
 * Tests stack management, Jaeger traces, Loki logs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createObservabilityRouter } from './observability.js';

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

// Mock observabilityStack service
vi.mock('../services/observabilityStack.js', () => ({
  getStackStatus: vi.fn(),
  startObservabilityStack: vi.fn(),
  stopObservabilityStack: vi.fn(),
  restartObservabilityStack: vi.fn(),
  getServiceEndpoints: vi.fn(),
  isStackConfigured: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import mocked service functions
import {
  getStackStatus,
  startObservabilityStack,
  stopObservabilityStack,
  restartObservabilityStack,
  getServiceEndpoints,
} from '../services/observabilityStack.js';

// Create app with router
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/observability', createObservabilityRouter());
  return app;
}

describe('Observability Routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    mockFetch.mockReset();
  });

  // ==========================================================================
  // STACK MANAGEMENT
  // ==========================================================================
  describe('GET /api/observability/stack/status', () => {
    it('should return stack status', async () => {
      const status = {
        jaeger: { status: 'running' },
        loki: { status: 'running' },
        promtail: { status: 'running' },
      };
      getStackStatus.mockResolvedValue(status);

      const res = await request(app).get('/api/observability/stack/status');

      expect(res.status).toBe(200);
      expect(res.body.jaeger.status).toBe('running');
    });

    it('should handle errors', async () => {
      getStackStatus.mockRejectedValue(new Error('Docker error'));

      const res = await request(app).get('/api/observability/stack/status');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/observability/stack/start', () => {
    it('should start the stack', async () => {
      startObservabilityStack.mockResolvedValue({ success: true, message: 'Stack started' });

      const res = await request(app).post('/api/observability/stack/start');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle errors', async () => {
      startObservabilityStack.mockRejectedValue(new Error('Failed to start'));

      const res = await request(app).post('/api/observability/stack/start');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/observability/stack/stop', () => {
    it('should stop the stack', async () => {
      stopObservabilityStack.mockResolvedValue({ success: true, message: 'Stack stopped' });

      const res = await request(app).post('/api/observability/stack/stop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle errors', async () => {
      stopObservabilityStack.mockRejectedValue(new Error('Failed to stop'));

      const res = await request(app).post('/api/observability/stack/stop');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/observability/stack/restart', () => {
    it('should restart the stack', async () => {
      restartObservabilityStack.mockResolvedValue({ success: true, message: 'Stack restarted' });

      const res = await request(app).post('/api/observability/stack/restart');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle errors', async () => {
      restartObservabilityStack.mockRejectedValue(new Error('Failed to restart'));

      const res = await request(app).post('/api/observability/stack/restart');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/endpoints', () => {
    it('should return service endpoints', async () => {
      const endpoints = {
        jaeger: 'http://localhost:16686',
        loki: 'http://localhost:3100',
        promtail: 'http://localhost:9080',
      };
      getServiceEndpoints.mockReturnValue(endpoints);

      const res = await request(app).get('/api/observability/endpoints');

      expect(res.status).toBe(200);
      expect(res.body.jaeger).toBe('http://localhost:16686');
    });
  });

  // ==========================================================================
  // JAEGER TRACES
  // ==========================================================================
  describe('GET /api/observability/services', () => {
    it('should return services from Jaeger', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: ['service-a', 'service-b'] }),
      });

      const res = await request(app).get('/api/observability/services');

      expect(res.status).toBe(200);
      expect(res.body.data).toContain('service-a');
    });

    it('should handle Jaeger errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      const res = await request(app).get('/api/observability/services');

      expect(res.status).toBe(500);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const res = await request(app).get('/api/observability/services');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/operations/:service', () => {
    it('should return operations for a service', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: ['GET /api/users', 'POST /api/orders'] }),
      });

      const res = await request(app).get('/api/observability/operations/my-service');

      expect(res.status).toBe(200);
      expect(res.body.data).toContain('GET /api/users');
    });

    it('should handle errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const res = await request(app).get('/api/observability/operations/unknown');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/traces', () => {
    it('should search traces', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{ traceID: 'trace-1', spans: [] }],
        }),
      });

      const res = await request(app).get('/api/observability/traces?service=my-service');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should require service parameter', async () => {
      const res = await request(app).get('/api/observability/traces');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('service parameter is required');
    });

    it('should pass query parameters to Jaeger', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await request(app).get('/api/observability/traces?service=svc&operation=op&limit=50');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('service=svc')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      );
    });

    it('should handle Jaeger errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const res = await request(app).get('/api/observability/traces?service=svc');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/traces/:traceId', () => {
    it('should get trace by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{ traceID: 'abc123', spans: [{ spanID: 'span-1' }] }],
        }),
      });

      const res = await request(app).get('/api/observability/traces/abc123');

      expect(res.status).toBe(200);
      expect(res.body.data[0].traceID).toBe('abc123');
    });

    it('should return 404 for non-existent trace', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const res = await request(app).get('/api/observability/traces/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Trace not found');
    });

    it('should handle errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const res = await request(app).get('/api/observability/traces/abc123');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // LOKI LOGS
  // ==========================================================================
  describe('GET /api/observability/loki/labels', () => {
    it('should return Loki labels', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: ['job', 'level', 'service'],
        }),
      });

      const res = await request(app).get('/api/observability/loki/labels');

      expect(res.status).toBe(200);
      expect(res.body.data).toContain('job');
    });

    it('should handle Loki errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const res = await request(app).get('/api/observability/loki/labels');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/loki/labels/:label/values', () => {
    it('should return label values', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: ['console-web', 'api-gateway'],
        }),
      });

      const res = await request(app).get('/api/observability/loki/labels/job/values');

      expect(res.status).toBe(200);
      expect(res.body.data).toContain('console-web');
    });

    it('should handle errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const res = await request(app).get('/api/observability/loki/labels/unknown/values');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/loki/query', () => {
    it('should execute LogQL query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {
            resultType: 'streams',
            result: [{ stream: { job: 'app' }, values: [['123', 'log line']] }],
          },
        }),
      });

      const res = await request(app).get('/api/observability/loki/query?query={job="app"}');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should require query parameter', async () => {
      const res = await request(app).get('/api/observability/loki/query');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('query parameter is required');
    });

    it('should validate LogQL query syntax', async () => {
      const res = await request(app).get('/api/observability/loki/query?query=invalid');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid LogQL query');
    });

    it('should accept valid LogQL queries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'success', data: { result: [] } }),
      });

      const res = await request(app).get('/api/observability/loki/query?query={job="app"} |= "error"');

      expect(res.status).toBe(200);
    });

    it('should handle Loki query errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('parse error'),
      });

      const res = await request(app).get('/api/observability/loki/query?query={job="app"}');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/observability/loki/streams', () => {
    it('should return active streams', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            result: [
              { stream: { job: 'app', level: 'info' }, values: [] },
              { stream: { job: 'api', level: 'error' }, values: [] },
            ],
          },
        }),
      });

      const res = await request(app).get('/api/observability/loki/streams');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2);
    });

    it('should handle Loki errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const res = await request(app).get('/api/observability/loki/streams');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // HEALTH
  // ==========================================================================
  describe('GET /api/observability/health', () => {
    it('should return healthy when all services up', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const res = await request(app).get('/api/observability/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.services.jaeger.status).toBe('healthy');
      expect(res.body.services.loki.status).toBe('healthy');
    });

    it('should return degraded when some services down', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Jaeger
        .mockResolvedValueOnce({ ok: false }) // Loki
        .mockRejectedValueOnce(new Error('Connection refused')); // Promtail

      const res = await request(app).get('/api/observability/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.services.jaeger.status).toBe('healthy');
      expect(res.body.services.loki.status).toBe('unhealthy');
      expect(res.body.services.promtail.status).toBe('unavailable');
    });

    it('should handle all services unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const res = await request(app).get('/api/observability/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
    });
  });
});
