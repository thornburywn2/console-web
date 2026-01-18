/**
 * Tests for Developer Tools Routes
 * Tests port management, env files, database browser, and proxy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  createPortsRouter,
  createEnvRouter,
  createDbBrowserRouter,
  createProxyRouter,
} from './devtools.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  logSecurityEvent: vi.fn(),
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: vi.fn((res, error, options) => {
    res.status(options.status || 500).json({ error: options.userMessage });
  }),
}));

// Mock path security
vi.mock('../utils/pathSecurity.js', () => ({
  validateAndResolvePath: vi.fn((inputPath, allowedDirs) => {
    if (inputPath.includes('..') || inputPath.includes('etc')) {
      return null;
    }
    return inputPath.startsWith('/') ? inputPath : `/home/test/Projects/${inputPath}`;
  }),
  validatePathMiddleware: (req, res, next) => next(),
  isValidName: vi.fn((name) => !name.includes('..')),
}));

// Mock validation
vi.mock('../utils/validation.js', () => ({
  databaseQuerySchema: { parse: vi.fn() },
  tableDataQuerySchema: { parse: vi.fn() },
  safeIdentifierSchema: { parse: vi.fn() },
  validateBody: vi.fn((schema, data) => {
    if (data.query && data.query.toLowerCase().includes('drop')) {
      return { success: false, error: 'Dangerous SQL detected' };
    }
    return { success: true, data };
  }),
}));

// Mock rate limiter
vi.mock('../middleware/rateLimit.js', () => ({
  dbQueryLimiter: (req, res, next) => next(),
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, callback) => {
    if (cmd.includes('lsof') && cmd.includes(':3000')) {
      callback(null, { stdout: 'node    12345 user   3u  IPv4 123456      0t0  TCP *:3000 (LISTEN)' });
    } else if (cmd.includes('lsof')) {
      callback(new Error('No match'), { stdout: '' });
    } else if (cmd.includes('ss -tlnp')) {
      callback(null, { stdout: 'LISTEN  0  128  *:3000  *:*  users:(("node",pid=12345,fd=3))' });
    } else if (cmd.includes('kill')) {
      callback(null, { stdout: '' });
    } else if (cmd.includes('df -h')) {
      callback(null, { stdout: '/dev/sda1  100G  50G  50G  50%  /' });
    } else if (cmd.includes('cat /sys/class/net')) {
      callback(null, { stdout: '12345' });
    } else {
      callback(null, { stdout: '' });
    }
  }),
  execSync: vi.fn((cmd) => {
    if (cmd.includes('df')) {
      return '/dev/sda1  100G  50G  50G  50%  /';
    }
    if (cmd.includes('/sys/class/net')) {
      return '12345';
    }
    return '';
  }),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

import fs from 'fs/promises';

// Create mock prisma
function createMockPrisma() {
  return {
    session: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    resourceMetric: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  };
}

describe('DevTools Routes', () => {
  let mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ==========================================================================
  // PORTS ROUTER
  // ==========================================================================
  describe('Ports Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/ports', createPortsRouter());
    });

    describe('GET /api/ports/status', () => {
      it('should return status of common ports', async () => {
        const res = await request(app).get('/api/ports/status');

        expect(res.status).toBe(200);
        expect(res.body.ports).toBeDefined();
        expect(Array.isArray(res.body.ports)).toBe(true);
      });

      it('should include process info for in-use ports', async () => {
        const res = await request(app).get('/api/ports/status');

        expect(res.status).toBe(200);
        // At least one port should have status
        expect(res.body.ports.some(p => p.port !== undefined)).toBe(true);
      });
    });

    describe('GET /api/ports/check/:port', () => {
      it('should check specific port availability', async () => {
        const res = await request(app).get('/api/ports/check/3000');

        expect(res.status).toBe(200);
        expect(res.body.port).toBe(3000);
        expect(typeof res.body.available).toBe('boolean');
      });

      it('should return process info if port is in use', async () => {
        const res = await request(app).get('/api/ports/check/3000');

        expect(res.status).toBe(200);
        if (!res.body.available) {
          expect(res.body.process).toBeDefined();
        }
      });
    });

    describe('GET /api/ports/scan', () => {
      it('should scan port range', async () => {
        const res = await request(app).get('/api/ports/scan?start=3000&end=3010');

        expect(res.status).toBe(200);
        expect(res.body.start).toBe(3000);
        expect(res.body.end).toBe(3010);
        expect(Array.isArray(res.body.openPorts)).toBe(true);
      });

      it('should use default range if not specified', async () => {
        const res = await request(app).get('/api/ports/scan');

        expect(res.status).toBe(200);
        expect(res.body.start).toBe(3000);
        expect(res.body.end).toBe(9000);
      });
    });

    describe('GET /api/ports/suggest', () => {
      it('should suggest available ports', async () => {
        const res = await request(app).get('/api/ports/suggest?base=3000');

        expect(res.status).toBe(200);
        expect(res.body.base).toBe(3000);
        expect(Array.isArray(res.body.suggestions)).toBe(true);
      });

      it('should return up to 5 suggestions', async () => {
        const res = await request(app).get('/api/ports/suggest');

        expect(res.status).toBe(200);
        expect(res.body.suggestions.length).toBeLessThanOrEqual(5);
      });
    });

    describe('POST /api/ports/kill/:pid', () => {
      it('should kill process by PID', async () => {
        const res = await request(app).post('/api/ports/kill/12345');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.pid).toBe(12345);
      });
    });
  });

  // ==========================================================================
  // ENV ROUTER
  // ==========================================================================
  describe('Env Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/env', createEnvRouter());
    });

    describe('GET /api/env/files/:projectPath', () => {
      it('should list env files in project', async () => {
        fs.readdir.mockResolvedValue([
          { name: '.env', isFile: () => true },
          { name: '.env.local', isFile: () => true },
          { name: 'package.json', isFile: () => true },
        ]);
        fs.stat.mockResolvedValue({ size: 100, mtime: new Date() });
        fs.readFile.mockResolvedValue('DB_URL=test\nAPI_KEY=secret');

        const res = await request(app).get('/api/env/files/test-project');

        expect(res.status).toBe(200);
        expect(res.body.files).toBeDefined();
      });

      it('should reject path traversal attempts', async () => {
        const res = await request(app).get('/api/env/files/..%2F..%2Fetc%2Fpasswd');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid path');
      });
    });

    describe('GET /api/env/variables/:projectPath/:filename', () => {
      it('should parse env file variables', async () => {
        fs.readFile.mockResolvedValue('DB_URL=postgres://localhost\nAPI_KEY=secret123\n# Comment\nEMPTY=');

        const res = await request(app).get('/api/env/variables/test-project/.env');

        expect(res.status).toBe(200);
        expect(res.body.variables).toBeDefined();
        expect(res.body.variables.some(v => v.key === 'DB_URL')).toBe(true);
      });

      it('should reject invalid filename', async () => {
        const res = await request(app).get('/api/env/variables/test-project/package.json');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid filename');
      });

      it('should handle __self__ path', async () => {
        fs.readFile.mockResolvedValue('TEST=value');

        const res = await request(app).get('/api/env/variables/__self__/.env');

        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/env/save/:projectPath/:filename', () => {
      it('should save env file', async () => {
        fs.writeFile.mockResolvedValue(undefined);

        const res = await request(app)
          .post('/api/env/save/test-project/.env')
          .send({
            variables: [
              { key: 'DB_URL', value: 'postgres://localhost' },
              { key: 'API_KEY', value: 'secret' },
            ],
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject invalid filename', async () => {
        const res = await request(app)
          .post('/api/env/save/test-project/config.js')
          .send({ variables: [] });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid filename');
      });
    });

    describe('GET /api/env/compare/:projectPath', () => {
      it('should compare two env files', async () => {
        fs.readFile
          .mockResolvedValueOnce('VAR1=value1\nVAR2=value2\nVAR3=value3')
          .mockResolvedValueOnce('VAR2=value2\nVAR3=different\nVAR4=value4');

        const res = await request(app).get(
          '/api/env/compare/test-project?source=.env&target=.env.example'
        );

        expect(res.status).toBe(200);
        expect(res.body.added).toBeDefined();
        expect(res.body.removed).toBeDefined();
        expect(res.body.changed).toBeDefined();
      });
    });

    describe('POST /api/env/sync/:projectPath', () => {
      it('should sync env files', async () => {
        fs.readFile.mockResolvedValue('VAR=value');
        fs.writeFile.mockResolvedValue(undefined);

        const res = await request(app)
          .post('/api/env/sync/test-project')
          .send({ source: '.env', target: '.env.local' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('POST /api/env/generate-example/:projectPath', () => {
      it('should generate env.example with masked secrets', async () => {
        fs.readFile.mockResolvedValue(
          'DB_URL=postgres://localhost\nSECRET_KEY=abc123\nAPI_TOKEN=xyz789\nPORT=3000'
        );
        fs.writeFile.mockResolvedValue(undefined);

        const res = await request(app)
          .post('/api/env/generate-example/test-project')
          .send({ source: '.env' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(fs.writeFile).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // DATABASE BROWSER ROUTER
  // ==========================================================================
  describe('Database Browser Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/db', createDbBrowserRouter(mockPrisma));
    });

    describe('GET /api/db/tables', () => {
      it('should list database tables', async () => {
        mockPrisma.session.count.mockResolvedValue(10);
        mockPrisma.project.count.mockResolvedValue(5);

        const res = await request(app).get('/api/db/tables');

        expect(res.status).toBe(200);
        expect(res.body.tables).toBeDefined();
      });

      it('should handle count errors gracefully', async () => {
        mockPrisma.session.count.mockRejectedValue(new Error('DB error'));

        const res = await request(app).get('/api/db/tables');

        expect(res.status).toBe(200);
      });
    });

    describe('GET /api/db/tables/:table/data', () => {
      it('should return table data with pagination', async () => {
        mockPrisma.session = {
          findMany: vi.fn().mockResolvedValue([
            { id: '1', name: 'Session 1' },
            { id: '2', name: 'Session 2' },
          ]),
          count: vi.fn().mockResolvedValue(100),
        };

        const res = await request(app).get('/api/db/tables/session/data?page=1&pageSize=25');

        expect(res.status).toBe(200);
        expect(res.body.rows).toBeDefined();
        expect(res.body.totalRows).toBe(100);
        expect(res.body.columns).toBeDefined();
      });

      it('should return 404 for non-existent table', async () => {
        const res = await request(app).get('/api/db/tables/nonexistent/data');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Table not found');
      });

      it('should support sorting', async () => {
        mockPrisma.session = {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        };

        await request(app).get('/api/db/tables/session/data?sortColumn=name&sortDirection=desc');

        expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { name: 'desc' },
          })
        );
      });
    });

    describe('PUT /api/db/tables/:table/update', () => {
      it('should update record', async () => {
        mockPrisma.session = {
          update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
        };

        const res = await request(app)
          .put('/api/db/tables/session/update')
          .send({ id: '1', name: 'Updated' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent table', async () => {
        const res = await request(app)
          .put('/api/db/tables/nonexistent/update')
          .send({ id: '1' });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/db/tables/:table/delete', () => {
      it('should delete record', async () => {
        mockPrisma.session = {
          delete: vi.fn().mockResolvedValue({ id: '1' }),
        };

        const res = await request(app)
          .delete('/api/db/tables/session/delete')
          .send({ id: '1' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent table', async () => {
        const res = await request(app)
          .delete('/api/db/tables/nonexistent/delete')
          .send({ id: '1' });

        expect(res.status).toBe(404);
      });
    });

    describe('POST /api/db/query', () => {
      it('should execute SELECT query', async () => {
        mockPrisma.$queryRawUnsafe.mockResolvedValue([
          { id: 1, name: 'Test' },
          { id: 2, name: 'Test 2' },
        ]);

        const res = await request(app)
          .post('/api/db/query')
          .send({ query: 'SELECT * FROM sessions LIMIT 10' });

        expect(res.status).toBe(200);
        expect(res.body.rows).toBeDefined();
        expect(res.body.executionTime).toBeDefined();
      });

      it('should reject dangerous queries', async () => {
        const res = await request(app)
          .post('/api/db/query')
          .send({ query: 'DROP TABLE sessions' });

        expect(res.status).toBe(400);
      });

      it('should handle query errors', async () => {
        mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Syntax error'));

        const res = await request(app)
          .post('/api/db/query')
          .send({ query: 'SELECT * FROM invalid_syntax' });

        expect(res.status).toBe(400);
      });
    });
  });

  // ==========================================================================
  // PROXY ROUTER
  // ==========================================================================
  describe('Proxy Router', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/proxy', createProxyRouter());

      // Mock global fetch
      global.fetch = vi.fn();
    });

    describe('POST /api/proxy', () => {
      it('should proxy GET request', async () => {
        global.fetch.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ data: 'test' }),
        });

        const res = await request(app)
          .post('/api/proxy')
          .send({
            url: 'https://api.example.com/test',
            method: 'GET',
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(200);
        expect(res.body.body).toEqual({ data: 'test' });
      });

      it('should proxy POST request with body', async () => {
        global.fetch.mockResolvedValue({
          status: 201,
          statusText: 'Created',
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ id: 1 }),
        });

        const res = await request(app)
          .post('/api/proxy')
          .send({
            url: 'https://api.example.com/create',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { name: 'Test' },
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(201);
      });

      it('should handle text responses', async () => {
        global.fetch.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve('<html><body>Test</body></html>'),
        });

        const res = await request(app)
          .post('/api/proxy')
          .send({
            url: 'https://example.com',
            method: 'GET',
          });

        expect(res.status).toBe(200);
        expect(typeof res.body.body).toBe('string');
      });

      it('should handle fetch errors', async () => {
        global.fetch.mockRejectedValue(new Error('Network error'));

        const res = await request(app)
          .post('/api/proxy')
          .send({
            url: 'https://invalid.example.com',
            method: 'GET',
          });

        expect(res.status).toBe(500);
      });
    });
  });
});
