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

// Mock rbac middleware
vi.mock('../middleware/rbac.js', () => ({
  auditLog: () => (req, res, next) => next(),
}));

// Mock validation
vi.mock('../utils/validation.js', () => ({
  authentikSettingsSchema: {},
  createAuthentikUserSchema: {},
  updateAuthentikUserSchema: {},
  setPasswordSchema: {},
  createServerUserSchema: {},
  updateServerUserSchema: {},
  firewallRuleSchema: {},
  firewallDefaultSchema: {},
  firewallLoggingSchema: {},
  validateBody: (schema, body) => {
    // Default validation passes
    return { success: true, data: body };
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock child_process
const mockExecAsync = vi.fn();
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    mockExecAsync(cmd).then(r => cb(null, r)).catch(e => cb(e));
  }),
}));

vi.mock('util', async () => {
  const actual = await vi.importActual('util');
  return {
    ...actual,
    promisify: () => mockExecAsync,
  };
});

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => '/bin/bash\n/bin/sh\n/usr/bin/zsh'),
    writeFileSync: vi.fn(),
  };
});

describe('Users & Firewall Routes', () => {
  let app;
  let mockPrisma;

  const testAuthentikSettings = {
    id: 'default',
    apiUrl: 'https://auth.example.com',
    apiToken: 'test-token-12345',
    enabled: true,
    configured: true,
    lastValidated: new Date(),
  };

  const testAuthentikUser = {
    pk: 1,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    is_active: true,
    is_superuser: false,
    last_login: new Date().toISOString(),
    date_joined: new Date().toISOString(),
    groups_obj: [{ pk: 1, name: 'users' }],
    avatar: null,
    uid: 'ak-user-1234',
    path: 'users',
    attributes: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockExecAsync.mockReset();

    mockPrisma = {
      authentikSettings: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      publishedRoute: {
        findMany: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      req.ip = '127.0.0.1';
      next();
    });

    app.use('/api/admin-users', createUsersFirewallRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // AUTHENTIK SETTINGS TESTS
  // ============================================

  describe('GET /api/admin-users/authentik/settings', () => {
    it('should return Authentik settings', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      const res = await request(app).get('/api/admin-users/authentik/settings');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('apiUrl');
      expect(res.body).toHaveProperty('hasToken');
      expect(res.body).toHaveProperty('configured');
    });

    it('should create default settings when none exist', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(null);
      mockPrisma.authentikSettings.create.mockResolvedValue({
        id: 'default',
        apiUrl: 'http://localhost:9000',
        enabled: false,
        configured: false,
      });

      const res = await request(app).get('/api/admin-users/authentik/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });
  });

  describe('PUT /api/admin-users/authentik/settings', () => {
    it('should update Authentik settings with valid token', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: 'admin' }),
      });

      mockPrisma.authentikSettings.upsert.mockResolvedValue({
        ...testAuthentikSettings,
        apiToken: 'new-token',
      });

      const res = await request(app)
        .put('/api/admin-users/authentik/settings')
        .send({ apiUrl: 'https://auth.example.com', apiToken: 'new-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const res = await request(app)
        .put('/api/admin-users/authentik/settings')
        .send({ apiUrl: 'https://auth.example.com', apiToken: 'invalid-token' });

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // AUTHENTIK STATUS TESTS
  // ============================================

  describe('GET /api/admin-users/authentik/status', () => {
    it('should return connected status with valid token', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: 'admin' }),
      });

      const res = await request(app).get('/api/admin-users/authentik/status');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
    });

    it('should return unconfigured when no token', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue({
        id: 'default',
        apiUrl: 'http://localhost:9000',
        apiToken: null,
      });

      const res = await request(app).get('/api/admin-users/authentik/status');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });
  });

  // ============================================
  // AUTHENTIK USERS TESTS
  // ============================================

  describe('GET /api/admin-users/authentik/users', () => {
    it('should return list of users', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [testAuthentikUser],
          count: 1,
        }),
      });

      const res = await request(app).get('/api/admin-users/authentik/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should support search parameter', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [], count: 0 }),
      });

      const res = await request(app).get('/api/admin-users/authentik/users?search=test');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/admin-users/authentik/users/:id', () => {
    it('should return single user details', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testAuthentikUser),
      });

      const res = await request(app).get('/api/admin-users/authentik/users/1');

      expect(res.status).toBe(200);
      expect(res.body.pk).toBe(1);
    });
  });

  describe('POST /api/admin-users/authentik/users', () => {
    it('should create new user', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testAuthentikUser),
      });

      const res = await request(app)
        .post('/api/admin-users/authentik/users')
        .send({
          username: 'newuser',
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require username', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      const res = await request(app)
        .post('/api/admin-users/authentik/users')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/admin-users/authentik/users/:id', () => {
    it('should update user', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...testAuthentikUser, name: 'Updated Name' }),
      });

      const res = await request(app)
        .put('/api/admin-users/authentik/users/1')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/authentik/users/:id/set-password', () => {
    it('should set password', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/set-password')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(200);
    });

    it('should require minimum password length', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/set-password')
        .send({ password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin-users/authentik/users/:id/toggle-active', () => {
    it('should toggle user active status', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const res = await request(app)
        .post('/api/admin-users/authentik/users/1/toggle-active')
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });
  });

  describe('DELETE /api/admin-users/authentik/users/:id', () => {
    it('should delete user', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const res = await request(app).delete('/api/admin-users/authentik/users/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin-users/authentik/groups', () => {
    it('should return groups list', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { pk: '1', name: 'users', is_superuser_group: false, parent: null, users: [] },
            { pk: '2', name: 'admins', is_superuser_group: true, parent: null, users: [] },
          ],
        }),
      });

      const res = await request(app).get('/api/admin-users/authentik/groups');

      expect(res.status).toBe(200);
      expect(res.body.groups).toBeDefined();
    });
  });

  // ============================================
  // SERVER USER TESTS
  // ============================================

  describe('GET /api/admin-users/server/users', () => {
    it('should return server users', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'testuser:x:1000:1000:Test User:/home/testuser:/bin/bash\nroot:x:0:0:root:/root:/bin/bash',
      });

      // Mock groups command for each user
      mockExecAsync.mockResolvedValue({
        stdout: 'testuser : testuser sudo',
      });

      const res = await request(app).get('/api/admin-users/server/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
    });

    it('should filter system users by default', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'testuser:x:1000:1000::/home/testuser:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
      });
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).get('/api/admin-users/server/users');

      expect(res.status).toBe(200);
      // Should only return non-system users (uid >= 1000)
    });

    it('should show system users when requested', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'testuser:x:1000:1000::/home/testuser:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
      });
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).get('/api/admin-users/server/users?showSystem=true');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/admin-users/server/users', () => {
    it('should create new server user', async () => {
      // Mock id check (user doesn't exist)
      mockExecAsync.mockRejectedValueOnce(new Error('no such user'));
      // Mock useradd command
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });

      const res = await request(app)
        .post('/api/admin-users/server/users')
        .send({
          username: 'newuser',
          fullName: 'New User',
          shell: '/bin/bash',
          createHome: true,
          groups: ['sudo'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject if user already exists', async () => {
      // Mock id check (user exists)
      mockExecAsync.mockResolvedValueOnce({ stdout: 'uid=1001(newuser)' });

      const res = await request(app)
        .post('/api/admin-users/server/users')
        .send({
          username: 'newuser',
          shell: '/bin/bash',
          createHome: true,
          groups: [],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/admin-users/server/users/:username', () => {
    it('should update server user', async () => {
      // Mock id check (user exists)
      mockExecAsync.mockResolvedValueOnce({ stdout: 'uid=1001(testuser)' });
      // Mock usermod commands
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .put('/api/admin-users/server/users/testuser')
        .send({ fullName: 'Updated Name', shell: '/bin/zsh' });

      expect(res.status).toBe(200);
    });

    it('should reject modifying critical users', async () => {
      const res = await request(app)
        .put('/api/admin-users/server/users/root')
        .send({ shell: '/bin/sh' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('no such user'));

      const res = await request(app)
        .put('/api/admin-users/server/users/nonexistent')
        .send({ shell: '/bin/bash' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin-users/server/users/:username/set-password', () => {
    it('should set user password', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });

      const res = await request(app)
        .post('/api/admin-users/server/users/testuser/set-password')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(200);
    });

    it('should require minimum password length', async () => {
      const res = await request(app)
        .post('/api/admin-users/server/users/testuser/set-password')
        .send({ password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin-users/server/users/:username', () => {
    it('should delete server user', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });

      const res = await request(app).delete('/api/admin-users/server/users/testuser');

      expect(res.status).toBe(200);
    });

    it('should reject deleting critical users', async () => {
      const res = await request(app).delete('/api/admin-users/server/users/root');

      expect(res.status).toBe(400);
    });

    it('should support removing home directory', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });

      const res = await request(app).delete('/api/admin-users/server/users/testuser?removeHome=true');

      expect(res.status).toBe(200);
      expect(res.body.homeRemoved).toBe(true);
    });
  });

  describe('GET /api/admin-users/server/groups', () => {
    it('should return server groups', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'sudo:x:27:testuser\nusers:x:100:testuser,otheruser',
      });

      const res = await request(app).get('/api/admin-users/server/groups');

      expect(res.status).toBe(200);
      expect(res.body.groups).toBeDefined();
    });
  });

  describe('GET /api/admin-users/server/shells', () => {
    it('should return available shells', async () => {
      const res = await request(app).get('/api/admin-users/server/shells');

      expect(res.status).toBe(200);
      expect(res.body.shells).toBeDefined();
      expect(res.body.shells).toContain('/bin/bash');
    });
  });

  // ============================================
  // FIREWALL STATUS TESTS
  // ============================================

  describe('GET /api/admin-users/firewall/status', () => {
    it('should return firewall status when UFW is installed and active', async () => {
      // Mock which ufw
      mockExecAsync.mockResolvedValueOnce({ stdout: '/usr/sbin/ufw' });
      // Mock ufw status verbose
      mockExecAsync.mockResolvedValueOnce({
        stdout: `Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)`,
      });

      const res = await request(app).get('/api/admin-users/firewall/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBe(true);
      expect(res.body.active).toBe(true);
    });

    it('should indicate when UFW is not installed', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('command not found'));

      const res = await request(app).get('/api/admin-users/firewall/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBe(false);
    });
  });

  describe('GET /api/admin-users/firewall/rules', () => {
    it('should return firewall rules', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: `Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere`,
      });

      const res = await request(app).get('/api/admin-users/firewall/rules');

      expect(res.status).toBe(200);
      expect(res.body.rules).toBeDefined();
      expect(res.body.rules.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin-users/firewall/enable', () => {
    it('should enable firewall', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Firewall is active and enabled on system startup' });

      const res = await request(app).post('/api/admin-users/firewall/enable');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/firewall/disable', () => {
    it('should disable firewall', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Firewall stopped and disabled on system startup' });

      const res = await request(app).post('/api/admin-users/firewall/disable');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/firewall/rules', () => {
    it('should add firewall rule', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Rule added' });

      const res = await request(app)
        .post('/api/admin-users/firewall/rules')
        .send({
          action: 'allow',
          direction: 'in',
          port: '8080',
          protocol: 'tcp',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should add rule with comment', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Rule added' });

      const res = await request(app)
        .post('/api/admin-users/firewall/rules')
        .send({
          action: 'allow',
          port: '3000',
          comment: 'Development server',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/admin-users/firewall/rules/:number', () => {
    it('should delete firewall rule', async () => {
      // Mock getting rules to check for SSH
      mockExecAsync.mockResolvedValueOnce({
        stdout: '[ 1] 8080/tcp ALLOW IN Anywhere\n[ 2] 3000/tcp ALLOW IN Anywhere',
      });
      // Mock delete
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Rule deleted' });

      const res = await request(app).delete('/api/admin-users/firewall/rules/2');

      expect(res.status).toBe(200);
    });

    it('should protect SSH rules', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: '[ 1] 22/tcp ALLOW IN Anywhere\n[ 2] 80/tcp ALLOW IN Anywhere',
      });

      const res = await request(app).delete('/api/admin-users/firewall/rules/1');

      expect(res.status).toBe(403);
      expect(res.body.protected).toBe(true);
    });

    it('should reject invalid rule number', async () => {
      const res = await request(app).delete('/api/admin-users/firewall/rules/invalid');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin-users/firewall/default', () => {
    it('should set default policy', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Default incoming policy changed to deny' });

      const res = await request(app)
        .post('/api/admin-users/firewall/default')
        .send({ direction: 'incoming', policy: 'deny' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/admin-users/firewall/reset', () => {
    it('should reset firewall', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Firewall reset to defaults' });

      const res = await request(app).post('/api/admin-users/firewall/reset');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin-users/firewall/logging', () => {
    it('should set logging level', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Logging enabled' });

      const res = await request(app)
        .post('/api/admin-users/firewall/logging')
        .send({ level: 'medium' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/admin-users/firewall/app-list', () => {
    it('should return application profiles', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: `Available applications:
  Apache
  Nginx Full
  OpenSSH`,
      });

      const res = await request(app).get('/api/admin-users/firewall/app-list');

      expect(res.status).toBe(200);
      expect(res.body.apps).toBeDefined();
    });
  });

  describe('GET /api/admin-users/firewall/app/:name', () => {
    it('should return app profile details', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: `Profile: OpenSSH
Title: Secure shell server
Description: OpenSSH server
Ports: 22/tcp`,
      });

      const res = await request(app).get('/api/admin-users/firewall/app/OpenSSH');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('OpenSSH');
    });

    it('should reject invalid app names', async () => {
      const res = await request(app).get('/api/admin-users/firewall/app/invalid;rm -rf');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin-users/firewall/logs', () => {
    it('should return firewall logs from journalctl', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: `Jan 10 12:00:00 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC=00:00:00:00:00:00 SRC=192.168.1.100 DST=192.168.1.1 PROTO=TCP SPT=45678 DPT=22`,
      });

      const res = await request(app).get('/api/admin-users/firewall/logs');

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should support filter parameter', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });
      mockExecAsync.mockResolvedValueOnce({ stdout: '' });

      const res = await request(app).get('/api/admin-users/firewall/logs?filter=BLOCK');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/admin-users/firewall/ensure-ssh', () => {
    it('should add SSH rule if missing', async () => {
      // Check status - no SSH
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Status: active\n80/tcp ALLOW' });
      // Add SSH rule
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Rule added' });

      const res = await request(app).post('/api/admin-users/firewall/ensure-ssh');

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(true);
    });

    it('should skip if SSH rule already exists', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Status: active\n22/tcp ALLOW' });

      const res = await request(app).post('/api/admin-users/firewall/ensure-ssh');

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(false);
    });
  });

  describe('POST /api/admin-users/firewall/sync-projects', () => {
    it('should sync project ports to firewall', async () => {
      // UFW status check
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Status: active\n22/tcp ALLOW' });
      // Scan listening ports
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'LISTEN 0 128 *:3000 *:* users:(("node",pid=1234,fd=19))',
      });
      // Get numbered rules
      mockExecAsync.mockResolvedValueOnce({
        stdout: '[ 1] 22/tcp ALLOW IN Anywhere',
      });
      // Add port 3000
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Rule added' });

      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { localPort: 7777, hostname: 'manage.example.com', subdomain: 'manage' },
      ]);

      const res = await request(app).post('/api/admin-users/firewall/sync-projects');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toBeDefined();
    });
  });

  describe('GET /api/admin-users/firewall/project-ports', () => {
    it('should return project ports with firewall status', async () => {
      mockPrisma.publishedRoute.findMany.mockResolvedValue([
        { localPort: 7777, hostname: 'manage.example.com', subdomain: 'manage', status: 'active' },
        { localPort: 5275, hostname: 'api.example.com', subdomain: 'api', status: 'active' },
      ]);

      // Scan listening ports
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'LISTEN 0 128 *:7777 *:* users:(("node",pid=1234,fd=19))\nLISTEN 0 128 *:5275 *:* users:(("node",pid=1235,fd=20))',
      });

      // UFW status
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Status: active\n7777/tcp ALLOW\n22/tcp ALLOW',
      });

      const res = await request(app).get('/api/admin-users/firewall/project-ports');

      expect(res.status).toBe(200);
      expect(res.body.ports).toBeDefined();
      expect(res.body.counts).toBeDefined();
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('should handle Authentik API errors gracefully', async () => {
      mockPrisma.authentikSettings.findUnique.mockResolvedValue(testAuthentikSettings);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const res = await request(app).get('/api/admin-users/authentik/users');

      expect(res.status).toBe(500);
    });

    it('should handle exec errors gracefully', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Command failed'));

      const res = await request(app).get('/api/admin-users/server/users');

      expect(res.status).toBe(500);
    });

    it('should handle sudo permission errors', async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: '/usr/sbin/ufw' });
      mockExecAsync.mockRejectedValueOnce(new Error('sudo: a password is required'));

      const res = await request(app).get('/api/admin-users/firewall/status');

      expect(res.status).toBe(200);
      expect(res.body.needsSudo).toBe(true);
    });
  });
});
