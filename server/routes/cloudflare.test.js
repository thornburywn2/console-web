/**
 * Cloudflare Routes Tests
 * Phase 5.3: Test Coverage for Cloudflare Tunnel Integration API
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

// Mock child_process
let mockExecResult = { stdout: '', stderr: '' };
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    cb(null, mockExecResult.stdout, mockExecResult.stderr);
  }),
}));

// Mock fs
let mockFileContent = '';
let mockFileExists = true;
vi.mock('fs', () => ({
  existsSync: vi.fn(() => mockFileExists),
  readFileSync: vi.fn(() => mockFileContent),
  writeFileSync: vi.fn(),
  promises: {
    readFile: vi.fn(() => Promise.resolve(mockFileContent)),
    writeFile: vi.fn(() => Promise.resolve()),
  },
}));

// Mock node-fetch for Cloudflare API calls
const mockFetchResponse = { ok: true, status: 200, json: vi.fn() };
vi.mock('node-fetch', () => ({
  default: vi.fn(() => Promise.resolve(mockFetchResponse)),
}));

// Mock yaml
vi.mock('yaml', () => ({
  parse: vi.fn((content) => {
    if (content.includes('tunnel:')) {
      return {
        tunnel: 'test-tunnel-id',
        credentials: '/path/to/creds.json',
        ingress: [
          { hostname: 'app.example.com', service: 'http://localhost:3000' },
          { service: 'http_status:404' },
        ],
      };
    }
    return {};
  }),
  stringify: vi.fn((obj) => JSON.stringify(obj)),
}));

describe('Cloudflare Routes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    // Reset mock variables
    mockExecResult = { stdout: '', stderr: '' };
    mockFileContent = '';
    mockFileExists = true;
    mockFetchResponse.ok = true;
    mockFetchResponse.status = 200;
    mockFetchResponse.json = vi.fn(() => Promise.resolve({ success: true, result: {} }));

    mockPrisma = {
      cloudflareSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      publishedRoute: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      authentikSettings: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/cloudflare', createCloudflareRouter(mockPrisma, '/home/user/Projects'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // SETTINGS
  // ============================================

  describe('GET /api/cloudflare/settings', () => {
    it('should return cloudflare settings when configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        accountId: 'acc-123',
        tunnelId: 'tun-456',
        apiToken: 'token-encrypted',
        zoneId: 'zone-789',
        configPath: '/etc/cloudflared/config.yml',
      });

      const res = await request(app).get('/api/cloudflare/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.accountId).toBe('acc-123');
    });

    it('should return not configured when no settings exist', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/cloudflare/settings');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch settings');
    });
  });

  describe('POST /api/cloudflare/settings', () => {
    it('should save cloudflare settings', async () => {
      mockPrisma.cloudflareSettings.upsert.mockResolvedValue({
        id: 'default',
        accountId: 'acc-123',
        tunnelId: 'tun-456',
        apiToken: 'token',
        zoneId: 'zone-789',
      });

      const res = await request(app)
        .post('/api/cloudflare/settings')
        .send({
          accountId: 'acc-123',
          tunnelId: 'tun-456',
          apiToken: 'token',
          zoneId: 'zone-789',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/cloudflare/settings')
        .send({ accountId: 'acc-123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.cloudflareSettings.upsert.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/cloudflare/settings')
        .send({
          accountId: 'acc-123',
          tunnelId: 'tun-456',
          apiToken: 'token',
          zoneId: 'zone-789',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save settings');
    });
  });

  describe('DELETE /api/cloudflare/settings', () => {
    it('should delete cloudflare settings', async () => {
      mockPrisma.cloudflareSettings.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/cloudflare/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.cloudflareSettings.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/cloudflare/settings');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete settings');
    });
  });

  // ============================================
  // TUNNEL
  // ============================================

  describe('GET /api/cloudflare/tunnel/config', () => {
    it('should return tunnel configuration', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockFileContent = 'tunnel: test-tunnel\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000';

      const res = await request(app).get('/api/cloudflare/tunnel/config');

      expect(res.status).toBe(200);
      expect(res.body.config).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/tunnel/config');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });

    it('should return 404 when config file not found', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockFileExists = false;

      const res = await request(app).get('/api/cloudflare/tunnel/config');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Config file not found');
    });
  });

  describe('GET /api/cloudflare/tunnel/info', () => {
    it('should return tunnel info from cloudflare API', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        accountId: 'acc-123',
        tunnelId: 'tun-456',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          success: true,
          result: {
            id: 'tun-456',
            name: 'my-tunnel',
            status: 'active',
          },
        })
      );

      const res = await request(app).get('/api/cloudflare/tunnel/info');

      expect(res.status).toBe(200);
      expect(res.body.tunnel).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/tunnel/info');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('GET /api/cloudflare/tunnel/status', () => {
    it('should return tunnel status', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        tunnelId: 'tun-456',
        apiToken: 'token',
        accountId: 'acc-123',
      });
      mockExecResult.stdout = 'cloudflared is running';

      const res = await request(app).get('/api/cloudflare/tunnel/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/tunnel/status');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  // ============================================
  // ROUTES
  // ============================================

  describe('GET /api/cloudflare/routes', () => {
    it('should return all published routes', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { id: 'route-1', hostname: 'app.example.com', port: 3000 },
        { id: 'route-2', hostname: 'api.example.com', port: 5000 },
      ]);

      const res = await request(app).get('/api/cloudflare/routes');

      expect(res.status).toBe(200);
      expect(res.body.routes).toHaveLength(2);
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/routes');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('GET /api/cloudflare/routes/:projectId', () => {
    it('should return routes for a specific project', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { id: 'route-1', hostname: 'app.example.com', port: 3000, projectId: 'proj-1' },
      ]);

      const res = await request(app).get('/api/cloudflare/routes/proj-1');

      expect(res.status).toBe(200);
      expect(res.body.routes).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/routes/proj-1');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('POST /api/cloudflare/publish', () => {
    it('should publish a new route', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        accountId: 'acc-123',
        tunnelId: 'tun-456',
        apiToken: 'token',
        zoneId: 'zone-789',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue(null);
      mockPrisma.publishedRoute.create.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
        port: 3000,
      });
      mockFileContent = 'tunnel: test\ningress:\n  - service: http_status:404';
      mockFetchResponse.json = vi.fn(() => Promise.resolve({ success: true, result: {} }));

      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({
          hostname: 'app.example.com',
          port: 3000,
          projectId: 'proj-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when hostname already exists', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
      });

      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({
          hostname: 'app.example.com',
          port: 3000,
          projectId: 'proj-1',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Hostname already published');
    });

    it('should return 400 when required fields are missing', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });

      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({ hostname: 'app.example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/cloudflare/publish')
        .send({
          hostname: 'app.example.com',
          port: 3000,
          projectId: 'proj-1',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('DELETE /api/cloudflare/publish/:hostname', () => {
    it('should unpublish a route', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        accountId: 'acc-123',
        tunnelId: 'tun-456',
        apiToken: 'token',
        zoneId: 'zone-789',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
      });
      mockPrisma.publishedRoute.delete.mockResolvedValue({});
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000\n  - service: http_status:404';
      mockFetchResponse.json = vi.fn(() => Promise.resolve({ success: true, result: {} }));

      const res = await request(app).delete('/api/cloudflare/publish/app.example.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when route not found', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue(null);

      const res = await request(app).delete('/api/cloudflare/publish/nonexistent.example.com');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/cloudflare/publish/app.example.com');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  // ============================================
  // ROUTE UPDATES
  // ============================================

  describe('PUT /api/cloudflare/routes/:hostname/port', () => {
    it('should update route port', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
        port: 3000,
      });
      mockPrisma.publishedRoute.update.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
        port: 4000,
      });
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000\n  - service: http_status:404';

      const res = await request(app)
        .put('/api/cloudflare/routes/app.example.com/port')
        .send({ port: 4000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when route not found', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/cloudflare/routes/nonexistent.example.com/port')
        .send({ port: 4000 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });

    it('should return 400 when port is missing', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue({ id: 'route-1' });

      const res = await request(app)
        .put('/api/cloudflare/routes/app.example.com/port')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/cloudflare/routes/:hostname/websocket', () => {
    it('should enable websocket support', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
        websocket: false,
      });
      mockPrisma.publishedRoute.update.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
        websocket: true,
      });
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000\n  - service: http_status:404';

      const res = await request(app)
        .put('/api/cloudflare/routes/app.example.com/websocket')
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when route not found', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/cloudflare/routes/nonexistent.example.com/websocket')
        .send({ enabled: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });
  });

  // ============================================
  // OPERATIONS
  // ============================================

  describe('POST /api/cloudflare/restart', () => {
    it('should restart cloudflared service', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockExecResult.stdout = '';

      const res = await request(app).post('/api/cloudflare/restart');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/cloudflare/restart');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('POST /api/cloudflare/check-route/:hostname', () => {
    it('should check route health', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
        port: 3000,
      });
      mockFetchResponse.ok = true;
      mockFetchResponse.status = 200;

      const res = await request(app).post('/api/cloudflare/check-route/app.example.com');

      expect(res.status).toBe(200);
      expect(res.body.healthy).toBeDefined();
    });

    it('should return 404 when route not found', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/cloudflare/check-route/nonexistent.example.com');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });
  });

  describe('GET /api/cloudflare/validate', () => {
    it('should validate cloudflare configuration', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        accountId: 'acc-123',
        tunnelId: 'tun-456',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({ success: true, result: { id: 'tun-456' } })
      );

      const res = await request(app).get('/api/cloudflare/validate');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/validate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('POST /api/cloudflare/sync', () => {
    it('should sync routes with config file', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000\n  - service: http_status:404';
      mockPrisma.publishedRoute.findMany.mockResolvedValue([]);

      const res = await request(app).post('/api/cloudflare/sync');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/cloudflare/sync');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  // ============================================
  // MAPPED ROUTES
  // ============================================

  describe('GET /api/cloudflare/routes/mapped', () => {
    it('should return mapped routes', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { id: 'route-1', hostname: 'app.example.com', projectId: 'proj-1' },
      ]);

      const res = await request(app).get('/api/cloudflare/routes/mapped');

      expect(res.status).toBe(200);
      expect(res.body.routes).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/routes/mapped');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('GET /api/cloudflare/routes/orphaned', () => {
    it('should return orphaned routes', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
      });
      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { id: 'route-1', hostname: 'app.example.com' },
      ]);
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000\n  - hostname: old.example.com\n    service: http://localhost:4000\n  - service: http_status:404';

      const res = await request(app).get('/api/cloudflare/routes/orphaned');

      expect(res.status).toBe(200);
      expect(res.body.orphaned).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/routes/orphaned');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('DELETE /api/cloudflare/routes/orphaned/:hostname', () => {
    it('should delete an orphaned route', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
        accountId: 'acc-123',
        apiToken: 'token',
        zoneId: 'zone-789',
      });
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: orphan.example.com\n    service: http://localhost:4000\n  - service: http_status:404';
      mockFetchResponse.json = vi.fn(() => Promise.resolve({ success: true, result: [] }));

      const res = await request(app).delete('/api/cloudflare/routes/orphaned/orphan.example.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/cloudflare/routes/orphaned/orphan.example.com');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('DELETE /api/cloudflare/routes/orphaned', () => {
    it('should delete all orphaned routes', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        configPath: '/etc/cloudflared/config.yml',
        accountId: 'acc-123',
        apiToken: 'token',
        zoneId: 'zone-789',
      });
      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { id: 'route-1', hostname: 'app.example.com' },
      ]);
      mockFileContent = 'tunnel: test\ningress:\n  - hostname: app.example.com\n    service: http://localhost:3000\n  - hostname: orphan1.example.com\n    service: http://localhost:4000\n  - service: http_status:404';
      mockFetchResponse.json = vi.fn(() => Promise.resolve({ success: true, result: [] }));

      const res = await request(app).delete('/api/cloudflare/routes/orphaned');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/cloudflare/routes/orphaned');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  // ============================================
  // DNS & ANALYTICS
  // ============================================

  describe('GET /api/cloudflare/dns', () => {
    it('should return DNS records', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        apiToken: 'token',
        zoneId: 'zone-789',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          success: true,
          result: [
            { id: 'dns-1', name: 'app.example.com', type: 'CNAME', content: 'tunnel.cfargotunnel.com' },
          ],
        })
      );

      const res = await request(app).get('/api/cloudflare/dns');

      expect(res.status).toBe(200);
      expect(res.body.records).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/dns');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('GET /api/cloudflare/analytics', () => {
    it('should return analytics data', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({
        id: 'default',
        apiToken: 'token',
        zoneId: 'zone-789',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          success: true,
          result: {
            totals: { requests: 1000, bandwidth: 5000000 },
          },
        })
      );

      const res = await request(app).get('/api/cloudflare/analytics');

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/analytics');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  // ============================================
  // AUTHENTIK INTEGRATION
  // ============================================

  describe('GET /api/cloudflare/authentik/settings', () => {
    it('should return authentik settings', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue({
        id: 'auth-1',
        baseUrl: 'https://auth.example.com',
        clientId: 'client-123',
      });

      const res = await request(app).get('/api/cloudflare/authentik/settings');

      expect(res.status).toBe(200);
      expect(res.body.settings).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/authentik/settings');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('POST /api/cloudflare/authentik/settings', () => {
    it('should save authentik settings', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.upsert.mockResolvedValue({
        id: 'auth-1',
        baseUrl: 'https://auth.example.com',
        clientId: 'client-123',
      });

      const res = await request(app)
        .post('/api/cloudflare/authentik/settings')
        .send({
          baseUrl: 'https://auth.example.com',
          clientId: 'client-123',
          clientSecret: 'secret',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });

      const res = await request(app)
        .post('/api/cloudflare/authentik/settings')
        .send({ baseUrl: 'https://auth.example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/cloudflare/authentik/settings')
        .send({
          baseUrl: 'https://auth.example.com',
          clientId: 'client-123',
          clientSecret: 'secret',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('DELETE /api/cloudflare/authentik/settings', () => {
    it('should delete authentik settings', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/cloudflare/authentik/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/cloudflare/authentik/settings');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cloudflare not configured');
    });
  });

  describe('POST /api/cloudflare/authentik/validate', () => {
    it('should validate authentik connection', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue({
        id: 'auth-1',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({ user: { username: 'admin' } })
      );

      const res = await request(app).post('/api/cloudflare/authentik/validate');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBeDefined();
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/cloudflare/authentik/validate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('GET /api/cloudflare/authentik/outposts', () => {
    it('should return authentik outposts', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue({
        id: 'auth-1',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          results: [{ pk: 'out-1', name: 'default-outpost' }],
        })
      );

      const res = await request(app).get('/api/cloudflare/authentik/outposts');

      expect(res.status).toBe(200);
      expect(res.body.outposts).toBeDefined();
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/cloudflare/authentik/outposts');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('POST /api/cloudflare/routes/:id/authentik', () => {
    it('should configure authentik for a route', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        hostname: 'app.example.com',
      });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue({
        id: 'auth-1',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockPrisma.publishedRoute.update.mockResolvedValue({
        id: 'route-1',
        authentikEnabled: true,
      });

      const res = await request(app)
        .post('/api/cloudflare/routes/route-1/authentik')
        .send({ enabled: true, outpostId: 'out-1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when route not found', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/cloudflare/routes/nonexistent/authentik')
        .send({ enabled: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.cloudflareSettings.findUnique.mockResolvedValue({ id: 'default' });
      mockPrisma.publishedRoute.findUnique.mockResolvedValue({ id: 'route-1' });
      mockPrisma.authentikSettings.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/cloudflare/routes/route-1/authentik')
        .send({ enabled: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });
});
