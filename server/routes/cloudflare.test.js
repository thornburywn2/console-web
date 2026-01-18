/**
 * Cloudflare Routes Tests
 * Phase 5.3: Test Coverage for Cloudflare Tunnel/DNS Management API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCloudflareRouter } from './cloudflare.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  logSecurityEvent: vi.fn(),
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

// Mock validation
vi.mock('../utils/validation.js', () => ({
  cloudflareSettingsSchema: { parse: vi.fn((data) => data) },
  publishRouteSchema: { parse: vi.fn((data) => data) },
  updateRoutePortSchema: { parse: vi.fn((data) => data) },
  websocketToggleSchema: { parse: vi.fn((data) => data) },
  validateBody: (schema) => (req, res, next) => next(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, cb) => cb(null, { stdout: '', stderr: '' })),
  execSync: vi.fn(() => ''),
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => 'mock content'),
    writeFileSync: vi.fn(),
  };
});

describe('Cloudflare Routes', () => {
  let app;
  let mockPrisma;

  // Test data
  const testSettings = {
    id: 'default',
    configured: true,
    accountId: 'test-account-id',
    tunnelId: 'test-tunnel-id',
    tunnelName: 'test-tunnel',
    zoneId: 'test-zone-id',
    zoneName: 'example.com',
    defaultSubdomain: 'apps',
    apiToken: 'test-api-token',
    lastValidated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testRoute = {
    id: 'route-1',
    hostname: 'myapp.example.com',
    projectPath: '/home/user/Projects/myapp',
    port: 3000,
    isActive: true,
    websocket: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock
    mockFetch.mockReset();

    // Reset mocks
    mockPrisma = {
      cloudflareSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      cloudflareRoute: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      project: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      authentikSettings: {
        findUnique: vi.fn(),
      },
    };

    // Create app with router
    app = express();
    app.use(express.json());

    // Middleware to set request context
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/cloudflare', createCloudflareRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // SETTINGS TESTS
  // ============================================

  describe('GET /api/cloudflare/settings', () => {
    it('should return configured:false when no settings exist', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/settings');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: false });
    });

    it('should return settings without exposing full API token', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);

      const res = await request(app).get('/api/cloudflare/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.accountId).toBe('test-account-id');
      expect(res.body.tunnelId).toBe('test-tunnel-id');
      expect(res.body.hasApiToken).toBe(true);
      expect(res.body.apiToken).toBeUndefined(); // Token should not be exposed
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/cloudflare/settings');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get Cloudflare settings');
    });
  });

  describe('POST /api/cloudflare/settings', () => {
    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/cloudflare/settings')
        .send({ apiToken: 'token' }); // Missing other fields

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should validate tunnel configuration with Cloudflare API', async () => {
      // Mock successful Cloudflare API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { name: 'test-tunnel' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { name: 'example.com' }
          })
        });

      mockPrisma.cloudflareSettings.upsert.mockResolvedValue(testSettings);

      const res = await request(app)
        .post('/api/cloudflare/settings')
        .send({
          apiToken: 'test-token',
          accountId: 'test-account',
          tunnelId: 'test-tunnel',
          zoneId: 'test-zone',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid tunnel configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          errors: [{ message: 'Invalid tunnel ID' }]
        })
      });

      const res = await request(app)
        .post('/api/cloudflare/settings')
        .send({
          apiToken: 'test-token',
          accountId: 'test-account',
          tunnelId: 'invalid-tunnel',
          zoneId: 'test-zone',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  describe('DELETE /api/cloudflare/settings', () => {
    it('should delete settings successfully', async () => {
      mockPrisma.cloudflareSettings.delete.mockResolvedValue(testSettings);

      const res = await request(app).delete('/api/cloudflare/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // ROUTES TESTS
  // ============================================

  describe('GET /api/cloudflare/routes', () => {
    it('should return all routes', async () => {
      mockPrisma.cloudflareRoute.findMany.mockResolvedValue([testRoute]);

      const res = await request(app).get('/api/cloudflare/routes');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].hostname).toBe('myapp.example.com');
    });

    it('should handle empty routes list', async () => {
      mockPrisma.cloudflareRoute.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/cloudflare/routes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/cloudflare/routes/:projectId', () => {
    it('should return routes for a specific project', async () => {
      mockPrisma.cloudflareRoute.findMany.mockResolvedValue([testRoute]);

      const res = await request(app).get('/api/cloudflare/routes/myapp');

      expect(res.status).toBe(200);
      expect(mockPrisma.cloudflareRoute.findMany).toHaveBeenCalled();
    });
  });

  // ============================================
  // PUBLISH TESTS
  // ============================================

  describe('POST /api/cloudflare/publish', () => {
    beforeEach(() => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
    });

    it('should reject when Cloudflare is not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({
          projectPath: '/home/user/Projects/myapp',
          hostname: 'myapp.example.com',
          port: 3000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not configured');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({ projectPath: '/home/user/Projects/myapp' }); // Missing hostname, port

      expect(res.status).toBe(400);
    });

    it('should create DNS record and tunnel route on publish', async () => {
      // Mock successful Cloudflare API responses
      mockFetch
        // Get tunnel config
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { config: { ingress: [] } }
          })
        })
        // Create DNS record
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, result: { id: 'dns-1' } })
        })
        // Update tunnel config
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      mockPrisma.cloudflareRoute.findFirst.mockResolvedValue(null);
      mockPrisma.cloudflareRoute.create.mockResolvedValue(testRoute);

      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({
          projectPath: '/home/user/Projects/myapp',
          hostname: 'myapp.example.com',
          port: 3000,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/cloudflare/publish/:hostname', () => {
    beforeEach(() => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
    });

    it('should return 404 for non-existent route', async () => {
      mockPrisma.cloudflareRoute.findFirst.mockResolvedValue(null);

      const res = await request(app).delete('/api/cloudflare/publish/nonexistent.example.com');

      expect(res.status).toBe(404);
    });

    it('should delete route and DNS record', async () => {
      mockPrisma.cloudflareRoute.findFirst.mockResolvedValue(testRoute);

      // Mock Cloudflare API calls
      mockFetch
        // Get tunnel config
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { config: { ingress: [{ hostname: 'myapp.example.com' }] } }
          })
        })
        // Update tunnel config
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        // Get DNS records
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: [{ id: 'dns-1', name: 'myapp.example.com' }]
          })
        })
        // Delete DNS record
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      mockPrisma.cloudflareRoute.delete.mockResolvedValue(testRoute);

      const res = await request(app).delete('/api/cloudflare/publish/myapp.example.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // PORT UPDATE TESTS
  // ============================================

  describe('PUT /api/cloudflare/routes/:hostname/port', () => {
    beforeEach(() => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
    });

    it('should return 404 for non-existent route', async () => {
      mockPrisma.cloudflareRoute.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/cloudflare/routes/nonexistent.example.com/port')
        .send({ port: 4000 });

      expect(res.status).toBe(404);
    });

    it('should update route port', async () => {
      mockPrisma.cloudflareRoute.findFirst.mockResolvedValue(testRoute);

      // Mock tunnel config get
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { config: { ingress: [{ hostname: 'myapp.example.com', service: 'http://localhost:3000' }] } }
          })
        })
        // Mock tunnel config update
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      mockPrisma.cloudflareRoute.update.mockResolvedValue({ ...testRoute, port: 4000 });

      const res = await request(app)
        .put('/api/cloudflare/routes/myapp.example.com/port')
        .send({ port: 4000 });

      expect(res.status).toBe(200);
      expect(mockPrisma.cloudflareRoute.update).toHaveBeenCalled();
    });
  });

  // ============================================
  // WEBSOCKET TOGGLE TESTS
  // ============================================

  describe('PUT /api/cloudflare/routes/:hostname/websocket', () => {
    beforeEach(() => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
    });

    it('should toggle websocket support', async () => {
      mockPrisma.cloudflareRoute.findFirst.mockResolvedValue(testRoute);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { config: { ingress: [{ hostname: 'myapp.example.com' }] } }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      mockPrisma.cloudflareRoute.update.mockResolvedValue({ ...testRoute, websocket: true });

      const res = await request(app)
        .put('/api/cloudflare/routes/myapp.example.com/websocket')
        .send({ enabled: true });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // TUNNEL STATUS TESTS
  // ============================================

  describe('GET /api/cloudflare/tunnel/status', () => {
    it('should return unconfigured status when no settings', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/tunnel/status');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('should return tunnel status from Cloudflare API', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: {
            status: 'healthy',
            connections: [{ id: 'conn-1' }]
          }
        })
      });

      const res = await request(app).get('/api/cloudflare/tunnel/status');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
    });
  });

  // ============================================
  // DNS TESTS
  // ============================================

  describe('GET /api/cloudflare/dns', () => {
    it('should return DNS records for the zone', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: [
            { id: 'dns-1', name: 'myapp.example.com', type: 'CNAME' }
          ]
        })
      });

      const res = await request(app).get('/api/cloudflare/dns');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ============================================
  // VALIDATE TESTS
  // ============================================

  describe('GET /api/cloudflare/validate', () => {
    it('should return invalid when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/validate');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
    });

    it('should validate configuration against Cloudflare API', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, result: { name: 'test-tunnel' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, result: { name: 'example.com' } })
        });

      const res = await request(app).get('/api/cloudflare/validate');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });

  // ============================================
  // SYNC TESTS
  // ============================================

  describe('POST /api/cloudflare/sync', () => {
    it('should sync tunnel routes with database', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.cloudflareRoute.findMany.mockResolvedValue([testRoute]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: {
            config: {
              ingress: [
                { hostname: 'myapp.example.com', service: 'http://localhost:3000' },
                { service: 'http_status:404' } // Catch-all rule
              ]
            }
          }
        })
      });

      const res = await request(app).post('/api/cloudflare/sync');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // RESTART TESTS
  // ============================================

  describe('POST /api/cloudflare/restart', () => {
    it('should restart cloudflared service', async () => {
      const { exec } = await import('child_process');

      const res = await request(app).post('/api/cloudflare/restart');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // ORPHANED ROUTES TESTS
  // ============================================

  describe('GET /api/cloudflare/routes/orphaned', () => {
    it('should find orphaned routes (in tunnel but not in DB)', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.cloudflareRoute.findMany.mockResolvedValue([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: {
            config: {
              ingress: [
                { hostname: 'orphan.example.com', service: 'http://localhost:3000' },
                { service: 'http_status:404' }
              ]
            }
          }
        })
      });

      const res = await request(app).get('/api/cloudflare/routes/orphaned');

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/cloudflare/routes/orphaned/:hostname', () => {
    it('should delete a single orphaned route', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: {
              config: {
                ingress: [
                  { hostname: 'orphan.example.com', service: 'http://localhost:3000' },
                  { service: 'http_status:404' }
                ]
              }
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, result: [] })
        });

      const res = await request(app).delete('/api/cloudflare/routes/orphaned/orphan.example.com');

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/cloudflare/routes/orphaned', () => {
    it('should delete all orphaned routes', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.cloudflareRoute.findMany.mockResolvedValue([]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: {
              config: {
                ingress: [
                  { hostname: 'orphan1.example.com', service: 'http://localhost:3000' },
                  { hostname: 'orphan2.example.com', service: 'http://localhost:4000' },
                  { service: 'http_status:404' }
                ]
              }
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, result: [] })
        });

      const res = await request(app).delete('/api/cloudflare/routes/orphaned');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('GET /api/cloudflare/analytics', () => {
    it('should return analytics data', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: {
            totals: { requests: 1000, bandwidth: 5000000 }
          }
        })
      });

      const res = await request(app).get('/api/cloudflare/analytics');

      expect(res.status).toBe(200);
    });
  });
});
