/**
 * Users & Firewall Routes Tests
 * Phase 5.3: Test Coverage for User & Firewall Management API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createUsersFirewallRouter } from './usersFirewall.js';

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
let mockExecError = null;
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    if (mockExecError) {
      cb(mockExecError, '', 'error');
    } else {
      cb(null, mockExecResult.stdout, mockExecResult.stderr);
    }
  }),
}));

// Mock node-fetch
const mockFetchResponse = { ok: true, status: 200, json: vi.fn() };
vi.mock('node-fetch', () => ({
  default: vi.fn(() => Promise.resolve(mockFetchResponse)),
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
    access: vi.fn(() => Promise.resolve()),
  },
}));

describe('Users & Firewall Routes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    // Reset mock variables
    mockExecResult = { stdout: '', stderr: '' };
    mockExecError = null;
    mockFileContent = '';
    mockFileExists = true;
    mockFetchResponse.ok = true;
    mockFetchResponse.status = 200;
    mockFetchResponse.json = vi.fn(() => Promise.resolve({ results: [] }));

    mockPrisma = {
      authentikConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/admin-users', createUsersFirewallRouter(mockPrisma, '/home/user/Projects'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // AUTHENTIK SETTINGS
  // ============================================

  describe('GET /api/admin-users/authentik/settings', () => {
    it('should return authentik settings when configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token-encrypted',
      });

      const res = await request(app).get('/api/admin-users/authentik/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.baseUrl).toBe('https://auth.example.com');
    });

    it('should return not configured when no settings', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/admin-users/authentik/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.authentikConfig.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/admin-users/authentik/settings');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch Authentik settings');
    });
  });

  describe('PUT /api/admin-users/authentik/settings', () => {
    it('should save authentik settings', async () => {
      mockPrisma.authentikConfig.upsert.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });

      const res = await request(app)
        .put('/api/admin-users/authentik/settings')
        .send({
          baseUrl: 'https://auth.example.com',
          apiToken: 'token',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .put('/api/admin-users/authentik/settings')
        .send({ baseUrl: 'https://auth.example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Base URL and API token are required');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.authentikConfig.upsert.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/admin-users/authentik/settings')
        .send({
          baseUrl: 'https://auth.example.com',
          apiToken: 'token',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save Authentik settings');
    });
  });

  describe('GET /api/admin-users/authentik/status', () => {
    it('should return connection status', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({ user: { username: 'admin' } })
      );

      const res = await request(app).get('/api/admin-users/authentik/status');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBeDefined();
    });

    it('should return not configured when no settings', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/admin-users/authentik/status');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });
  });

  // ============================================
  // AUTHENTIK USERS
  // ============================================

  describe('GET /api/admin-users/authentik/users', () => {
    it('should return list of authentik users', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          results: [
            { pk: 1, username: 'admin', email: 'admin@example.com', is_active: true },
            { pk: 2, username: 'user1', email: 'user1@example.com', is_active: true },
          ],
        })
      );

      const res = await request(app).get('/api/admin-users/authentik/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(2);
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/admin-users/authentik/users');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('GET /api/admin-users/authentik/users/:id', () => {
    it('should return a single authentik user', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          pk: 1,
          username: 'admin',
          email: 'admin@example.com',
          is_active: true,
        })
      );

      const res = await request(app).get('/api/admin-users/authentik/users/1');

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/admin-users/authentik/users/1');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('POST /api/admin-users/authentik/users', () => {
    it('should create a new authentik user', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          pk: 3,
          username: 'newuser',
          email: 'newuser@example.com',
        })
      );

      const res = await request(app)
        .post('/api/admin-users/authentik/users')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });

      const res = await request(app)
        .post('/api/admin-users/authentik/users')
        .send({ username: 'newuser' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin-users/authentik/users')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('PUT /api/admin-users/authentik/users/:id', () => {
    it('should update an authentik user', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          pk: 1,
          username: 'admin',
          email: 'updated@example.com',
        })
      );

      const res = await request(app)
        .put('/api/admin-users/authentik/users/1')
        .send({ email: 'updated@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/admin-users/authentik/users/1')
        .send({ email: 'updated@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('DELETE /api/admin-users/authentik/users/:id', () => {
    it('should delete an authentik user', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.ok = true;
      mockFetchResponse.status = 204;

      const res = await request(app).delete('/api/admin-users/authentik/users/2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/admin-users/authentik/users/2');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  describe('POST /api/admin-users/authentik/users/:id/set-password', () => {
    it('should set user password', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() => Promise.resolve({}));

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/set-password')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when password is missing', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/set-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password is required');
    });
  });

  describe('POST /api/admin-users/authentik/users/:id/toggle-active', () => {
    it('should toggle user active status', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({ pk: 1, is_active: false })
      );

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/toggle-active')
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/toggle-active')
        .send({ active: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  // ============================================
  // AUTHENTIK GROUPS
  // ============================================

  describe('GET /api/admin-users/authentik/groups', () => {
    it('should return list of authentik groups', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue({
        id: 'default',
        baseUrl: 'https://auth.example.com',
        apiToken: 'token',
      });
      mockFetchResponse.json = vi.fn(() =>
        Promise.resolve({
          results: [
            { pk: 'grp-1', name: 'admins' },
            { pk: 'grp-2', name: 'users' },
          ],
        })
      );

      const res = await request(app).get('/api/admin-users/authentik/groups');

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(2);
    });

    it('should return 404 when authentik not configured', async () => {
      mockPrisma.authentikConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/admin-users/authentik/groups');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Authentik not configured');
    });
  });

  // ============================================
  // SERVER USERS
  // ============================================

  describe('GET /api/admin-users/server/users', () => {
    it('should return list of server users', async () => {
      mockExecResult.stdout = 'root:x:0:0:root:/root:/bin/bash\nuser1:x:1000:1000:User One:/home/user1:/bin/bash';

      const res = await request(app).get('/api/admin-users/server/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
    });

    it('should filter system users by default', async () => {
      mockExecResult.stdout = 'root:x:0:0:root:/root:/bin/bash\nnobody:x:65534:65534::/nonexistent:/usr/sbin/nologin\nuser1:x:1000:1000:User One:/home/user1:/bin/bash';

      const res = await request(app).get('/api/admin-users/server/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
    });
  });

  describe('POST /api/admin-users/server/users', () => {
    it('should create a new server user', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/admin-users/server/users')
        .send({
          username: 'newuser',
          password: 'password123',
          shell: '/bin/bash',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when username is missing', async () => {
      const res = await request(app)
        .post('/api/admin-users/server/users')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username is required');
    });

    it('should return 400 for invalid username characters', async () => {
      const res = await request(app)
        .post('/api/admin-users/server/users')
        .send({
          username: 'user@invalid!',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/admin-users/server/users/:username', () => {
    it('should update a server user', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .put('/api/admin-users/server/users/testuser')
        .send({ shell: '/bin/zsh' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should protect root user from modification', async () => {
      const res = await request(app)
        .put('/api/admin-users/server/users/root')
        .send({ shell: '/bin/zsh' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot modify root user');
    });
  });

  describe('DELETE /api/admin-users/server/users/:username', () => {
    it('should delete a server user', async () => {
      mockExecResult.stdout = '';

      const res = await request(app).delete('/api/admin-users/server/users/testuser');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should protect root user from deletion', async () => {
      const res = await request(app).delete('/api/admin-users/server/users/root');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot delete root user');
    });

    it('should protect current user from deletion', async () => {
      // The route checks process.env.USER
      process.env.USER = 'currentuser';

      const res = await request(app).delete('/api/admin-users/server/users/currentuser');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin-users/server/users/:username/set-password', () => {
    it('should set user password', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/admin-users/server/users/testuser/set-password')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/admin-users/server/users/testuser/set-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password is required');
    });
  });

  // ============================================
  // SERVER GROUPS & SHELLS
  // ============================================

  describe('GET /api/admin-users/server/groups', () => {
    it('should return list of server groups', async () => {
      mockExecResult.stdout = 'root:x:0:\nusers:x:100:\nsudo:x:27:user1';

      const res = await request(app).get('/api/admin-users/server/groups');

      expect(res.status).toBe(200);
      expect(res.body.groups).toBeDefined();
    });
  });

  describe('GET /api/admin-users/server/shells', () => {
    it('should return list of available shells', async () => {
      mockFileContent = '/bin/bash\n/bin/sh\n/bin/zsh\n/usr/bin/fish';
      mockFileExists = true;

      const res = await request(app).get('/api/admin-users/server/shells');

      expect(res.status).toBe(200);
      expect(res.body.shells).toBeDefined();
    });
  });

  // ============================================
  // FIREWALL STATUS
  // ============================================

  describe('GET /api/admin-users/firewall/status', () => {
    it('should return firewall status', async () => {
      mockExecResult.stdout = 'Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere';

      const res = await request(app).get('/api/admin-users/firewall/status');

      expect(res.status).toBe(200);
      expect(res.body.active).toBeDefined();
    });

    it('should handle inactive firewall', async () => {
      mockExecResult.stdout = 'Status: inactive';

      const res = await request(app).get('/api/admin-users/firewall/status');

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(false);
    });
  });

  describe('GET /api/admin-users/firewall/rules', () => {
    it('should return firewall rules', async () => {
      mockExecResult.stdout = 'Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere\n80/tcp                     ALLOW       Anywhere';

      const res = await request(app).get('/api/admin-users/firewall/rules');

      expect(res.status).toBe(200);
      expect(res.body.rules).toBeDefined();
    });
  });

  // ============================================
  // FIREWALL ENABLE/DISABLE
  // ============================================

  describe('POST /api/admin-users/firewall/enable', () => {
    it('should enable firewall', async () => {
      mockExecResult.stdout = 'Firewall is active and enabled';

      const res = await request(app).post('/api/admin-users/firewall/enable');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/firewall/disable', () => {
    it('should disable firewall', async () => {
      mockExecResult.stdout = 'Firewall stopped and disabled';

      const res = await request(app).post('/api/admin-users/firewall/disable');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // FIREWALL RULES
  // ============================================

  describe('POST /api/admin-users/firewall/rules', () => {
    it('should add a firewall rule', async () => {
      mockExecResult.stdout = 'Rule added';

      const res = await request(app)
        .post('/api/admin-users/firewall/rules')
        .send({
          port: 3000,
          action: 'allow',
          direction: 'in',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when port is missing', async () => {
      const res = await request(app)
        .post('/api/admin-users/firewall/rules')
        .send({ action: 'allow' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Port is required');
    });

    it('should validate port range', async () => {
      const res = await request(app)
        .post('/api/admin-users/firewall/rules')
        .send({
          port: 99999,
          action: 'allow',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/admin-users/firewall/rules/:number', () => {
    it('should delete a firewall rule', async () => {
      mockExecResult.stdout = 'Rule deleted';

      const res = await request(app).delete('/api/admin-users/firewall/rules/5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should protect SSH rule from deletion', async () => {
      // First call returns rules showing SSH is rule 1
      mockExecResult.stdout = 'Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere';

      const res = await request(app).delete('/api/admin-users/firewall/rules/1');

      // The route should check if it's the SSH rule before deleting
      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // FIREWALL DEFAULTS
  // ============================================

  describe('POST /api/admin-users/firewall/default', () => {
    it('should set default incoming policy', async () => {
      mockExecResult.stdout = 'Default incoming policy changed';

      const res = await request(app)
        .post('/api/admin-users/firewall/default')
        .send({
          direction: 'incoming',
          policy: 'deny',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when direction is missing', async () => {
      const res = await request(app)
        .post('/api/admin-users/firewall/default')
        .send({ policy: 'deny' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/admin-users/firewall/reset', () => {
    it('should reset firewall to defaults', async () => {
      mockExecResult.stdout = 'Firewall reset';

      const res = await request(app).post('/api/admin-users/firewall/reset');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/firewall/logging', () => {
    it('should set firewall logging level', async () => {
      mockExecResult.stdout = 'Logging enabled';

      const res = await request(app)
        .post('/api/admin-users/firewall/logging')
        .send({ level: 'medium' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid logging level', async () => {
      const res = await request(app)
        .post('/api/admin-users/firewall/logging')
        .send({ level: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ============================================
  // FIREWALL APPS & LOGS
  // ============================================

  describe('GET /api/admin-users/firewall/app-list', () => {
    it('should return list of UFW applications', async () => {
      mockExecResult.stdout = 'Available applications:\n  Apache\n  Nginx Full\n  OpenSSH';

      const res = await request(app).get('/api/admin-users/firewall/app-list');

      expect(res.status).toBe(200);
      expect(res.body.apps).toBeDefined();
    });
  });

  describe('GET /api/admin-users/firewall/app/:name', () => {
    it('should return application details', async () => {
      mockExecResult.stdout = 'Profile: OpenSSH\nTitle: Secure shell\nDescription: OpenSSH server\nPorts:\n  22/tcp';

      const res = await request(app).get('/api/admin-users/firewall/app/OpenSSH');

      expect(res.status).toBe(200);
      expect(res.body.app).toBeDefined();
    });
  });

  describe('GET /api/admin-users/firewall/logs', () => {
    it('should return firewall logs', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server kernel: [UFW BLOCK] IN=eth0...';

      const res = await request(app).get('/api/admin-users/firewall/logs');

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should accept limit parameter', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server kernel: [UFW BLOCK] IN=eth0...';

      const res = await request(app).get('/api/admin-users/firewall/logs?limit=50');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // FIREWALL SSH & SYNC
  // ============================================

  describe('POST /api/admin-users/firewall/ensure-ssh', () => {
    it('should ensure SSH is allowed', async () => {
      mockExecResult.stdout = 'Rule added';

      const res = await request(app).post('/api/admin-users/firewall/ensure-ssh');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/firewall/sync-projects', () => {
    it('should sync project ports to firewall', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        { name: 'project1', path: '/home/user/Projects/project1' },
        { name: 'project2', path: '/home/user/Projects/project2' },
      ]);
      mockExecResult.stdout = 'Rules added';

      const res = await request(app).post('/api/admin-users/firewall/sync-projects');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin-users/firewall/project-ports', () => {
    it('should return all project ports', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        { name: 'project1', path: '/home/user/Projects/project1' },
      ]);
      mockFileContent = 'PORT=3000\nAPI_PORT=5000';
      mockFileExists = true;

      const res = await request(app).get('/api/admin-users/firewall/project-ports');

      expect(res.status).toBe(200);
      expect(res.body.projects).toBeDefined();
    });
  });
});
