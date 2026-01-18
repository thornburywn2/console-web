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
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') cb(0);
    }),
  })),
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
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

describe('Infrastructure Routes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    // Reset mock variables
    mockExecResult = { stdout: '', stderr: '' };
    mockExecError = null;
    mockFileContent = '';
    mockFileExists = true;

    mockPrisma = {
      scheduledTask: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/infra', createInfrastructureRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // PACKAGES
  // ============================================

  describe('GET /api/infra/packages', () => {
    it('should return list of installed packages', async () => {
      mockExecResult.stdout = 'nginx\t1.18.0-0ubuntu1\npostgresql\t14.0-1\nnodejs\t18.17.0';

      const res = await request(app).get('/api/infra/packages');

      expect(res.status).toBe(200);
      expect(res.body.packages).toBeDefined();
    });

    it('should support search parameter', async () => {
      mockExecResult.stdout = 'nginx\t1.18.0-0ubuntu1';

      const res = await request(app).get('/api/infra/packages?search=nginx');

      expect(res.status).toBe(200);
    });

    it('should handle command errors gracefully', async () => {
      mockExecError = new Error('Command failed');

      const res = await request(app).get('/api/infra/packages');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to list packages');
    });
  });

  describe('GET /api/infra/packages/updates', () => {
    it('should return list of available updates', async () => {
      mockExecResult.stdout = 'nginx/jammy-updates 1.18.0-6ubuntu14.3 amd64 [upgradable from: 1.18.0-6ubuntu14.2]';

      const res = await request(app).get('/api/infra/packages/updates');

      expect(res.status).toBe(200);
      expect(res.body.updates).toBeDefined();
    });

    it('should return empty array when no updates', async () => {
      mockExecResult.stdout = '';

      const res = await request(app).get('/api/infra/packages/updates');

      expect(res.status).toBe(200);
      expect(res.body.updates).toEqual([]);
    });
  });

  describe('POST /api/infra/packages/upgrade', () => {
    it('should upgrade a package', async () => {
      mockExecResult.stdout = 'Package upgraded successfully';

      const res = await request(app)
        .post('/api/infra/packages/upgrade')
        .send({ package: 'nginx' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when package name is missing', async () => {
      const res = await request(app)
        .post('/api/infra/packages/upgrade')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Package name is required');
    });

    it('should reject dangerous package names', async () => {
      const res = await request(app)
        .post('/api/infra/packages/upgrade')
        .send({ package: 'nginx; rm -rf /' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid package name');
    });
  });

  describe('POST /api/infra/packages/install', () => {
    it('should install a package', async () => {
      mockExecResult.stdout = 'Package installed successfully';

      const res = await request(app)
        .post('/api/infra/packages/install')
        .send({ package: 'htop' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when package name is missing', async () => {
      const res = await request(app)
        .post('/api/infra/packages/install')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Package name is required');
    });
  });

  describe('POST /api/infra/packages/remove', () => {
    it('should remove a package', async () => {
      mockExecResult.stdout = 'Package removed successfully';

      const res = await request(app)
        .post('/api/infra/packages/remove')
        .send({ package: 'htop' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should protect critical packages', async () => {
      const res = await request(app)
        .post('/api/infra/packages/remove')
        .send({ package: 'systemd' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot remove critical package');
    });
  });

  describe('GET /api/infra/packages/search', () => {
    it('should search for packages', async () => {
      mockExecResult.stdout = 'nginx-core - nginx web server core\nnginx-full - nginx web server with all modules';

      const res = await request(app).get('/api/infra/packages/search?q=nginx');

      expect(res.status).toBe(200);
      expect(res.body.results).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      const res = await request(app).get('/api/infra/packages/search');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Search query is required');
    });
  });

  // ============================================
  // LOGS
  // ============================================

  describe('GET /api/infra/logs', () => {
    it('should return system logs', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server systemd[1]: Starting nginx...\nJan 01 12:00:01 server systemd[1]: Started nginx.';

      const res = await request(app).get('/api/infra/logs');

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should filter by unit', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server nginx[123]: request completed';

      const res = await request(app).get('/api/infra/logs?unit=nginx');

      expect(res.status).toBe(200);
    });

    it('should support lines parameter', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server systemd[1]: Starting...';

      const res = await request(app).get('/api/infra/logs?lines=50');

      expect(res.status).toBe(200);
    });

    it('should support priority filtering', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server systemd[1]: error message';

      const res = await request(app).get('/api/infra/logs?priority=err');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/logs/units', () => {
    it('should return list of journal units', async () => {
      mockExecResult.stdout = 'UNIT\nnginx.service\npostgresql.service\nsshd.service';

      const res = await request(app).get('/api/infra/logs/units');

      expect(res.status).toBe(200);
      expect(res.body.units).toBeDefined();
    });
  });

  describe('GET /api/infra/logs/disk-usage', () => {
    it('should return journal disk usage', async () => {
      mockExecResult.stdout = 'Archived and active journals take up 256.0M in the file system.';

      const res = await request(app).get('/api/infra/logs/disk-usage');

      expect(res.status).toBe(200);
      expect(res.body.usage).toBeDefined();
    });
  });

  // ============================================
  // PROCESSES
  // ============================================

  describe('GET /api/infra/processes', () => {
    it('should return list of processes', async () => {
      mockExecResult.stdout = 'PID   USER     %CPU %MEM    TIME+  COMMAND\n1     root      0.0  0.1   0:01.00 systemd\n123   www-data  0.5  1.2   0:05.00 nginx';

      const res = await request(app).get('/api/infra/processes');

      expect(res.status).toBe(200);
      expect(res.body.processes).toBeDefined();
    });

    it('should support sort parameter', async () => {
      mockExecResult.stdout = 'PID   USER     %CPU %MEM    TIME+  COMMAND\n1     root      0.0  0.1   0:01.00 systemd';

      const res = await request(app).get('/api/infra/processes?sort=cpu');

      expect(res.status).toBe(200);
    });

    it('should support limit parameter', async () => {
      mockExecResult.stdout = 'PID   USER     %CPU %MEM    TIME+  COMMAND\n1     root      0.0  0.1   0:01.00 systemd';

      const res = await request(app).get('/api/infra/processes?limit=10');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/processes/:pid', () => {
    it('should return process details', async () => {
      mockExecResult.stdout = 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 167264 13344 ?        Ss   Jan01   0:01 /sbin/init';

      const res = await request(app).get('/api/infra/processes/1');

      expect(res.status).toBe(200);
      expect(res.body.process).toBeDefined();
    });

    it('should return 404 for non-existent process', async () => {
      mockExecError = new Error('No such process');

      const res = await request(app).get('/api/infra/processes/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Process not found');
    });
  });

  describe('POST /api/infra/processes/:pid/kill', () => {
    it('should kill a process', async () => {
      mockExecResult.stdout = '';

      const res = await request(app).post('/api/infra/processes/12345/kill');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support signal parameter', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/infra/processes/12345/kill')
        .send({ signal: 'SIGTERM' });

      expect(res.status).toBe(200);
    });

    it('should protect PID 1', async () => {
      const res = await request(app).post('/api/infra/processes/1/kill');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Cannot kill init process');
    });

    it('should return 400 for invalid PID', async () => {
      const res = await request(app).post('/api/infra/processes/invalid/kill');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid PID');
    });
  });

  // ============================================
  // NETWORK
  // ============================================

  describe('GET /api/infra/network/interfaces', () => {
    it('should return network interfaces', async () => {
      mockExecResult.stdout = 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255';

      const res = await request(app).get('/api/infra/network/interfaces');

      expect(res.status).toBe(200);
      expect(res.body.interfaces).toBeDefined();
    });
  });

  describe('GET /api/infra/network/connections', () => {
    it('should return active connections', async () => {
      mockExecResult.stdout = 'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd';

      const res = await request(app).get('/api/infra/network/connections');

      expect(res.status).toBe(200);
      expect(res.body.connections).toBeDefined();
    });

    it('should support protocol filter', async () => {
      mockExecResult.stdout = 'tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd';

      const res = await request(app).get('/api/infra/network/connections?protocol=tcp');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/network/hosts', () => {
    it('should return hosts file entries', async () => {
      mockFileContent = '127.0.0.1 localhost\n192.168.1.100 server.local';

      const res = await request(app).get('/api/infra/network/hosts');

      expect(res.status).toBe(200);
      expect(res.body.hosts).toBeDefined();
    });
  });

  describe('POST /api/infra/network/ping', () => {
    it('should ping a host', async () => {
      mockExecResult.stdout = 'PING google.com (142.250.72.14): 56 data bytes\n64 bytes from 142.250.72.14: icmp_seq=0 ttl=117 time=12.3 ms';

      const res = await request(app)
        .post('/api/infra/network/ping')
        .send({ host: 'google.com' });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
    });

    it('should return 400 when host is missing', async () => {
      const res = await request(app)
        .post('/api/infra/network/ping')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Host is required');
    });

    it('should reject dangerous host values', async () => {
      const res = await request(app)
        .post('/api/infra/network/ping')
        .send({ host: 'google.com; rm -rf /' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid host');
    });

    it('should support count parameter', async () => {
      mockExecResult.stdout = '64 bytes from 142.250.72.14: icmp_seq=0 ttl=117 time=12.3 ms';

      const res = await request(app)
        .post('/api/infra/network/ping')
        .send({ host: 'google.com', count: 3 });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/infra/network/dns', () => {
    it('should perform DNS lookup', async () => {
      mockExecResult.stdout = 'google.com has address 142.250.72.14\ngoogle.com has IPv6 address 2607:f8b0:4004:800::200e';

      const res = await request(app)
        .post('/api/infra/network/dns')
        .send({ host: 'google.com' });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
    });

    it('should return 400 when host is missing', async () => {
      const res = await request(app)
        .post('/api/infra/network/dns')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Host is required');
    });
  });

  describe('POST /api/infra/network/port-check', () => {
    it('should check if port is open', async () => {
      mockExecResult.stdout = 'Connection to google.com 80 port [tcp/http] succeeded!';

      const res = await request(app)
        .post('/api/infra/network/port-check')
        .send({ host: 'google.com', port: 80 });

      expect(res.status).toBe(200);
      expect(res.body.open).toBeDefined();
    });

    it('should return 400 when host or port is missing', async () => {
      const res = await request(app)
        .post('/api/infra/network/port-check')
        .send({ host: 'google.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Host and port are required');
    });

    it('should validate port range', async () => {
      const res = await request(app)
        .post('/api/infra/network/port-check')
        .send({ host: 'google.com', port: 99999 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid port');
    });
  });

  // ============================================
  // SECURITY
  // ============================================

  describe('GET /api/infra/security/ssh/sessions', () => {
    it('should return active SSH sessions', async () => {
      mockExecResult.stdout = 'user1   pts/0        2024-01-01 12:00 (192.168.1.50)';

      const res = await request(app).get('/api/infra/security/ssh/sessions');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeDefined();
    });
  });

  describe('GET /api/infra/security/ssh/failed', () => {
    it('should return failed SSH attempts', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server sshd[1234]: Failed password for invalid user admin from 192.168.1.50';

      const res = await request(app).get('/api/infra/security/ssh/failed');

      expect(res.status).toBe(200);
      expect(res.body.attempts).toBeDefined();
    });

    it('should support limit parameter', async () => {
      mockExecResult.stdout = 'Jan 01 12:00:00 server sshd[1234]: Failed password...';

      const res = await request(app).get('/api/infra/security/ssh/failed?limit=50');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/infra/security/ssh/keys', () => {
    it('should return authorized SSH keys', async () => {
      mockFileContent = 'ssh-rsa AAAA... user@example.com\nssh-ed25519 AAAA... user2@example.com';
      mockFileExists = true;

      const res = await request(app).get('/api/infra/security/ssh/keys');

      expect(res.status).toBe(200);
      expect(res.body.keys).toBeDefined();
    });

    it('should return empty array when no keys file', async () => {
      mockFileExists = false;

      const res = await request(app).get('/api/infra/security/ssh/keys');

      expect(res.status).toBe(200);
      expect(res.body.keys).toEqual([]);
    });
  });

  describe('GET /api/infra/security/fail2ban/status', () => {
    it('should return fail2ban status', async () => {
      mockExecResult.stdout = 'Status\n|- Number of jail:\t2\n`- Jail list:\tsshd, nginx-http-auth';

      const res = await request(app).get('/api/infra/security/fail2ban/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
    });

    it('should handle fail2ban not installed', async () => {
      mockExecError = new Error('fail2ban-client: command not found');

      const res = await request(app).get('/api/infra/security/fail2ban/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBe(false);
    });
  });

  describe('POST /api/infra/security/fail2ban/unban', () => {
    it('should unban an IP', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/infra/security/fail2ban/unban')
        .send({ ip: '192.168.1.100', jail: 'sshd' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when IP is missing', async () => {
      const res = await request(app)
        .post('/api/infra/security/fail2ban/unban')
        .send({ jail: 'sshd' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('IP address is required');
    });

    it('should validate IP format', async () => {
      const res = await request(app)
        .post('/api/infra/security/fail2ban/unban')
        .send({ ip: 'invalid-ip', jail: 'sshd' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid IP address');
    });
  });

  describe('GET /api/infra/security/ports', () => {
    it('should return listening ports', async () => {
      mockExecResult.stdout = 'tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd\ntcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      5678/nginx';

      const res = await request(app).get('/api/infra/security/ports');

      expect(res.status).toBe(200);
      expect(res.body.ports).toBeDefined();
    });
  });

  describe('GET /api/infra/security/last-logins', () => {
    it('should return last logins', async () => {
      mockExecResult.stdout = 'user1    pts/0        192.168.1.50     Mon Jan  1 12:00 - 13:00  (01:00)';

      const res = await request(app).get('/api/infra/security/last-logins');

      expect(res.status).toBe(200);
      expect(res.body.logins).toBeDefined();
    });
  });

  // ============================================
  // SCHEDULED TASKS
  // ============================================

  describe('GET /api/infra/scheduled/cron', () => {
    it('should return cron jobs', async () => {
      mockExecResult.stdout = '# m h  dom mon dow   command\n0 * * * * /usr/bin/backup.sh\n30 2 * * * /usr/bin/cleanup.sh';

      const res = await request(app).get('/api/infra/scheduled/cron');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
    });

    it('should support user parameter', async () => {
      mockExecResult.stdout = '0 * * * * /usr/bin/backup.sh';

      const res = await request(app).get('/api/infra/scheduled/cron?user=root');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/infra/scheduled/cron', () => {
    it('should create a cron job', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/infra/scheduled/cron')
        .send({
          schedule: '0 * * * *',
          command: '/usr/bin/backup.sh',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when schedule is missing', async () => {
      const res = await request(app)
        .post('/api/infra/scheduled/cron')
        .send({ command: '/usr/bin/backup.sh' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Schedule and command are required');
    });

    it('should validate cron schedule format', async () => {
      const res = await request(app)
        .post('/api/infra/scheduled/cron')
        .send({
          schedule: 'invalid',
          command: '/usr/bin/backup.sh',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid cron schedule');
    });
  });

  describe('DELETE /api/infra/scheduled/cron', () => {
    it('should delete a cron job', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .delete('/api/infra/scheduled/cron')
        .send({ lineNumber: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when line number is missing', async () => {
      const res = await request(app)
        .delete('/api/infra/scheduled/cron')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Line number is required');
    });
  });

  describe('GET /api/infra/scheduled/timers', () => {
    it('should return systemd timers', async () => {
      mockExecResult.stdout = 'NEXT                         LEFT          LAST                         PASSED       UNIT                         ACTIVATES\nMon 2024-01-01 13:00:00 UTC  55min left    Mon 2024-01-01 12:00:00 UTC  5min ago     backup.timer                 backup.service';

      const res = await request(app).get('/api/infra/scheduled/timers');

      expect(res.status).toBe(200);
      expect(res.body.timers).toBeDefined();
    });
  });

  describe('POST /api/infra/scheduled/timers/:name/toggle', () => {
    it('should enable a timer', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/infra/scheduled/timers/backup.timer/toggle')
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should disable a timer', async () => {
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/infra/scheduled/timers/backup.timer/toggle')
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should validate timer name', async () => {
      const res = await request(app)
        .post('/api/infra/scheduled/timers/invalid;name/toggle')
        .send({ enabled: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid timer name');
    });
  });
});
