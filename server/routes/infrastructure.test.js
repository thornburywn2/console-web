/**
 * Infrastructure Routes Tests
 * Phase 5.3: Test Coverage for Server Infrastructure Management API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createInfrastructureRouter } from './infrastructure.js';

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

// Mock validation - pass through
vi.mock('../utils/validation.js', () => ({
  pingRequestSchema: { parse: vi.fn((data) => data) },
  dnsLookupSchema: { parse: vi.fn((data) => data) },
  portCheckSchema: { parse: vi.fn((data) => data) },
  killProcessSchema: { parse: vi.fn((data) => data) },
  packageOperationSchema: { parse: vi.fn((data) => data) },
  packageRemoveSchema: { parse: vi.fn((data) => data) },
  fail2banUnbanSchema: { parse: vi.fn((data) => data) },
  timerToggleSchema: { parse: vi.fn((data) => data) },
  timerNameSchema: { parse: vi.fn((data) => data) },
  cronJobSchema: { parse: vi.fn((data) => data) },
  validateBody: () => (req, res, next) => next(),
}));

// Mock rate limiters
vi.mock('../middleware/rateLimit.js', () => ({
  networkDiagLimiter: (req, res, next) => next(),
  destructiveLimiter: (req, res, next) => next(),
}));

// Mock child_process
const mockExecAsync = vi.fn();
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    const result = mockExecAsync(cmd);
    if (result instanceof Promise) {
      result.then(r => cb(null, r)).catch(e => cb(e));
    } else {
      cb(null, result);
    }
  }),
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') cb(0);
    }),
  })),
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(() => ''),
    existsSync: vi.fn(() => true),
  };
});

// Mock promisify to return our mock
vi.mock('util', async () => {
  const actual = await vi.importActual('util');
  return {
    ...actual,
    promisify: () => mockExecAsync,
  };
});

describe('Infrastructure Routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecAsync.mockReset();

    // Create app with router
    app = express();
    app.use(express.json());

    // Middleware to set request context
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/infra', createInfrastructureRouter());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // PACKAGE MANAGEMENT TESTS
  // ============================================

  describe('GET /api/infra/packages', () => {
    it('should return list of installed packages', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'vim|8.2|install ok installed|5000|Vi IMproved\nnginx|1.18|install ok installed|2000|Web server\n',
      });

      const res = await request(app).get('/api/infra/packages');

      expect(res.status).toBe(200);
      expect(res.body.packages).toBeDefined();
      expect(Array.isArray(res.body.packages)).toBe(true);
    });

    it('should filter packages by search term', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'vim|8.2|install ok installed|5000|Vi IMproved\nnginx|1.18|install ok installed|2000|Web server\n',
      });

      const res = await request(app).get('/api/infra/packages?search=vim');

      expect(res.status).toBe(200);
    });

    it('should paginate results', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'vim|8.2|install ok installed|5000|Vi IMproved\n',
      });

      const res = await request(app).get('/api/infra/packages?limit=10&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/infra/packages/updates', () => {
    it('should return available package updates', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'vim 8.2.1234\nnginx 1.19.0\n',
      });

      const res = await request(app).get('/api/infra/packages/updates');

      expect(res.status).toBe(200);
      expect(res.body.updates).toBeDefined();
    });

    it('should handle no updates available', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).get('/api/infra/packages/updates');

      expect(res.status).toBe(200);
      expect(res.body.updates).toEqual([]);
    });
  });

  describe('POST /api/infra/packages/upgrade', () => {
    it('should upgrade all packages', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Upgraded 5 packages' });

      const res = await request(app).post('/api/infra/packages/upgrade');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/infra/packages/install', () => {
    it('should install a package', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Package installed' });

      const res = await request(app)
        .post('/api/infra/packages/install')
        .send({ package: 'htop' });

      expect(res.status).toBe(200);
    });

    it('should reject invalid package names', async () => {
      const res = await request(app)
        .post('/api/infra/packages/install')
        .send({ package: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/infra/packages/remove', () => {
    it('should remove a package', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Package removed' });

      const res = await request(app)
        .post('/api/infra/packages/remove')
        .send({ package: 'htop' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/packages/search', () => {
    it('should search for packages', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'htop - Interactive process viewer\nbtop - Better top\n',
      });

      const res = await request(app).get('/api/infra/packages/search?query=top');

      expect(res.status).toBe(200);
      expect(res.body.results).toBeDefined();
    });

    it('should require query parameter', async () => {
      const res = await request(app).get('/api/infra/packages/search');

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // LOGS TESTS
  // ============================================

  describe('GET /api/infra/logs', () => {
    it('should return system logs', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify([
          { __REALTIME_TIMESTAMP: '1234567890', MESSAGE: 'Test log', PRIORITY: '6' }
        ]),
      });

      const res = await request(app).get('/api/infra/logs');

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should filter by unit', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify([]),
      });

      const res = await request(app).get('/api/infra/logs?unit=nginx');

      expect(res.status).toBe(200);
    });

    it('should filter by priority', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify([]),
      });

      const res = await request(app).get('/api/infra/logs?priority=3');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/logs/units', () => {
    it('should return list of log units', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'nginx.service\nssh.service\n',
      });

      const res = await request(app).get('/api/infra/logs/units');

      expect(res.status).toBe(200);
      expect(res.body.units).toBeDefined();
    });
  });

  describe('GET /api/infra/logs/disk-usage', () => {
    it('should return journal disk usage', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Archived and active journals take up 128M',
      });

      const res = await request(app).get('/api/infra/logs/disk-usage');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // PROCESS MANAGEMENT TESTS
  // ============================================

  describe('GET /api/infra/processes', () => {
    it('should return list of processes', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '1|root|0.0|0.1|/sbin/init\n2|root|0.0|0.0|[kthreadd]\n',
      });

      const res = await request(app).get('/api/infra/processes');

      expect(res.status).toBe(200);
      expect(res.body.processes).toBeDefined();
    });

    it('should filter by user', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '1000|user|1.0|2.0|/usr/bin/node\n',
      });

      const res = await request(app).get('/api/infra/processes?user=user');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/processes/:pid', () => {
    it('should return process details', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '1234|root|0.5|1.2|/usr/bin/node\n',
      });

      const res = await request(app).get('/api/infra/processes/1234');

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent process', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).get('/api/infra/processes/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/infra/processes/:pid/kill', () => {
    it('should kill a process', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/infra/processes/1234/kill')
        .send({ signal: 'SIGTERM' });

      expect(res.status).toBe(200);
    });

    it('should prevent killing critical processes', async () => {
      const res = await request(app)
        .post('/api/infra/processes/1/kill')
        .send({ signal: 'SIGKILL' });

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // NETWORK TESTS
  // ============================================

  describe('GET /api/infra/network/interfaces', () => {
    it('should return network interfaces', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '1: lo: <LOOPBACK> inet 127.0.0.1/8\n2: eth0: <BROADCAST> inet 192.168.1.100/24\n',
      });

      const res = await request(app).get('/api/infra/network/interfaces');

      expect(res.status).toBe(200);
      expect(res.body.interfaces).toBeDefined();
    });
  });

  describe('GET /api/infra/network/connections', () => {
    it('should return active connections', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'tcp|LISTEN|*:22|*:*\ntcp|ESTAB|192.168.1.100:22|192.168.1.50:54321\n',
      });

      const res = await request(app).get('/api/infra/network/connections');

      expect(res.status).toBe(200);
      expect(res.body.connections).toBeDefined();
    });
  });

  describe('POST /api/infra/network/ping', () => {
    it('should ping a host', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=10.5 ms\n',
      });

      const res = await request(app)
        .post('/api/infra/network/ping')
        .send({ host: '8.8.8.8', count: 3 });

      expect(res.status).toBe(200);
    });

    it('should require host parameter', async () => {
      const res = await request(app)
        .post('/api/infra/network/ping')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/infra/network/dns', () => {
    it('should perform DNS lookup', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'google.com has address 142.250.80.46\n',
      });

      const res = await request(app)
        .post('/api/infra/network/dns')
        .send({ domain: 'google.com' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/infra/network/port-check', () => {
    it('should check if port is open', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/infra/network/port-check')
        .send({ host: 'localhost', port: 22 });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/network/hosts', () => {
    it('should return hosts file contents', async () => {
      const { readFileSync } = await import('fs');
      readFileSync.mockReturnValue('127.0.0.1 localhost\n::1 localhost\n');

      const res = await request(app).get('/api/infra/network/hosts');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('GET /api/infra/security/ssh/sessions', () => {
    it('should return active SSH sessions', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'user     pts/0        192.168.1.50     10:30    0.00s\n',
      });

      const res = await request(app).get('/api/infra/security/ssh/sessions');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeDefined();
    });
  });

  describe('GET /api/infra/security/ssh/failed', () => {
    it('should return failed SSH attempts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Jan 15 10:30:00 server sshd[1234]: Failed password for invalid user admin from 192.168.1.50\n',
      });

      const res = await request(app).get('/api/infra/security/ssh/failed');

      expect(res.status).toBe(200);
      expect(res.body.attempts).toBeDefined();
    });
  });

  describe('GET /api/infra/security/ssh/keys', () => {
    it('should return authorized SSH keys', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('ssh-rsa AAAAB3... user@host\n');

      const res = await request(app).get('/api/infra/security/ssh/keys');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/security/fail2ban/status', () => {
    it('should return fail2ban status', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Status\n|- Number of jail: 1\n`- Jail list: sshd\n',
      });

      const res = await request(app).get('/api/infra/security/fail2ban/status');

      expect(res.status).toBe(200);
    });

    it('should handle fail2ban not installed', async () => {
      mockExecAsync.mockRejectedValue(new Error('command not found'));

      const res = await request(app).get('/api/infra/security/fail2ban/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBe(false);
    });
  });

  describe('POST /api/infra/security/fail2ban/unban', () => {
    it('should unban an IP address', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/infra/security/fail2ban/unban')
        .send({ ip: '192.168.1.50', jail: 'sshd' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/security/ports', () => {
    it('should return listening ports', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'tcp|LISTEN|*:22|sshd\ntcp|LISTEN|*:80|nginx\n',
      });

      const res = await request(app).get('/api/infra/security/ports');

      expect(res.status).toBe(200);
      expect(res.body.ports).toBeDefined();
    });
  });

  describe('GET /api/infra/security/last-logins', () => {
    it('should return last login records', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'user     pts/0    192.168.1.50     Wed Jan 15 10:30   still logged in\n',
      });

      const res = await request(app).get('/api/infra/security/last-logins');

      expect(res.status).toBe(200);
      expect(res.body.logins).toBeDefined();
    });
  });

  // ============================================
  // SCHEDULED TASKS TESTS
  // ============================================

  describe('GET /api/infra/scheduled/cron', () => {
    it('should return cron jobs', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '# Comment\n0 * * * * /usr/bin/hourly-task\n',
      });

      const res = await request(app).get('/api/infra/scheduled/cron');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
    });
  });

  describe('GET /api/infra/scheduled/timers', () => {
    it('should return systemd timers', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'daily.timer|loaded|active|Mon 2024-01-15 00:00:00\n',
      });

      const res = await request(app).get('/api/infra/scheduled/timers');

      expect(res.status).toBe(200);
      expect(res.body.timers).toBeDefined();
    });
  });

  describe('POST /api/infra/scheduled/timers/:name/toggle', () => {
    it('should enable a timer', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/infra/scheduled/timers/daily.timer/toggle')
        .send({ enabled: true });

      expect(res.status).toBe(200);
    });

    it('should disable a timer', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/infra/scheduled/timers/daily.timer/toggle')
        .send({ enabled: false });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/infra/scheduled/cron', () => {
    it('should add a cron job', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/infra/scheduled/cron')
        .send({
          schedule: '0 * * * *',
          command: '/usr/bin/task',
          comment: 'Hourly task',
        });

      expect(res.status).toBe(200);
    });

    it('should reject invalid cron schedule', async () => {
      const res = await request(app)
        .post('/api/infra/scheduled/cron')
        .send({
          schedule: 'invalid',
          command: '/usr/bin/task',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/infra/scheduled/cron/:index', () => {
    it('should delete a cron job', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '0 * * * * /usr/bin/task1\n30 * * * * /usr/bin/task2\n',
      });

      const res = await request(app).delete('/api/infra/scheduled/cron/0');

      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid index', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).delete('/api/infra/scheduled/cron/999');

      expect(res.status).toBe(400);
    });
  });
});
