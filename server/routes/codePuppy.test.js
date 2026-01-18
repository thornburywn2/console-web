/**
 * Code Puppy Routes Tests
 * Phase 5.3: Test Coverage for Code Puppy AI Assistant API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCodePuppyRouter } from './codePuppy.js';

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
const mockExecAsync = vi.fn();
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    mockExecAsync(cmd).then(r => cb(null, r)).catch(e => cb(e));
  }),
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn(), pipe: vi.fn() },
    stderr: { on: vi.fn(), pipe: vi.fn() },
    stdin: { write: vi.fn(), end: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') setTimeout(() => cb(0), 10);
    }),
    kill: vi.fn(),
  })),
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
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    unlinkSync: vi.fn(),
  };
});

describe('Code Puppy Routes', () => {
  let app;
  let mockPrisma;

  const testSession = {
    id: 'session-1',
    projectPath: '/home/user/Projects/test',
    model: 'claude-3-5-sonnet',
    agent: 'coder',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecAsync.mockReset();

    mockPrisma = {
      codePuppySession: {
        findMany: vi.fn(),
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

    app.use('/api/code-puppy', createCodePuppyRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================

  describe('GET /api/code-puppy/init/status', () => {
    it('should return initialization status', async () => {
      const { existsSync } = await import('fs');
      existsSync.mockReturnValue(true);

      const res = await request(app).get('/api/code-puppy/init/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('initialized');
    });
  });

  describe('POST /api/code-puppy/init', () => {
    it('should initialize Code Puppy', async () => {
      const res = await request(app).post('/api/code-puppy/init');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/code-puppy/init/directories', () => {
    it('should create required directories', async () => {
      const res = await request(app).post('/api/code-puppy/init/directories');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/code-puppy/init/config', () => {
    it('should create default config', async () => {
      const res = await request(app).post('/api/code-puppy/init/config');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // STATUS TESTS
  // ============================================

  describe('GET /api/code-puppy/status', () => {
    it('should return Code Puppy status', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'aider 0.50.0\n' });

      const res = await request(app).get('/api/code-puppy/status');

      expect(res.status).toBe(200);
    });

    it('should handle Code Puppy not installed', async () => {
      mockExecAsync.mockRejectedValue(new Error('command not found'));

      const res = await request(app).get('/api/code-puppy/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBe(false);
    });
  });

  describe('POST /api/code-puppy/install', () => {
    it('should install Code Puppy', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Installed' });

      const res = await request(app).post('/api/code-puppy/install');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // CONFIG TESTS
  // ============================================

  describe('GET /api/code-puppy/config', () => {
    it('should return configuration', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"model": "claude-3-5-sonnet"}');

      const res = await request(app).get('/api/code-puppy/config');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/code-puppy/config', () => {
    it('should update configuration', async () => {
      const res = await request(app)
        .put('/api/code-puppy/config')
        .send({ model: 'claude-3-5-sonnet' });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/code-puppy/config/:key', () => {
    it('should update a specific config key', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{}');

      const res = await request(app)
        .put('/api/code-puppy/config/model')
        .send({ value: 'gpt-4' });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // PROVIDERS & MODELS TESTS
  // ============================================

  describe('GET /api/code-puppy/providers', () => {
    it('should return available providers', async () => {
      const res = await request(app).get('/api/code-puppy/providers');

      expect(res.status).toBe(200);
      expect(res.body.providers).toBeDefined();
    });
  });

  describe('GET /api/code-puppy/models/extra', () => {
    it('should return extra models', async () => {
      const res = await request(app).get('/api/code-puppy/models/extra');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/code-puppy/models/extra', () => {
    it('should add an extra model', async () => {
      const res = await request(app)
        .post('/api/code-puppy/models/extra')
        .send({ name: 'custom-model', config: {} });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/code-puppy/models/extra/:name', () => {
    it('should delete an extra model', async () => {
      const { readFileSync } = await import('fs');
      readFileSync.mockReturnValue('{"extra-models": [{"name": "custom-model"}]}');

      const res = await request(app).delete('/api/code-puppy/models/extra/custom-model');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // AGENTS TESTS
  // ============================================

  describe('GET /api/code-puppy/agents', () => {
    it('should return available agents', async () => {
      const { readdirSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readdirSync.mockReturnValue(['coder.md', 'architect.md']);

      const res = await request(app).get('/api/code-puppy/agents');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/code-puppy/agents/:name', () => {
    it('should return agent details', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('# Coder Agent\nYou are a coder...');

      const res = await request(app).get('/api/code-puppy/agents/coder');

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent agent', async () => {
      const { existsSync } = await import('fs');
      existsSync.mockReturnValue(false);

      const res = await request(app).get('/api/code-puppy/agents/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/code-puppy/agents', () => {
    it('should create a new agent', async () => {
      const res = await request(app)
        .post('/api/code-puppy/agents')
        .send({ name: 'custom', content: '# Custom Agent' });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/code-puppy/agents/:name', () => {
    it('should update an agent', async () => {
      const res = await request(app)
        .put('/api/code-puppy/agents/coder')
        .send({ content: '# Updated Coder Agent' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/code-puppy/agents/:name', () => {
    it('should delete an agent', async () => {
      const res = await request(app).delete('/api/code-puppy/agents/custom');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // TOOLS & COMMANDS TESTS
  // ============================================

  describe('GET /api/code-puppy/tools', () => {
    it('should return available tools', async () => {
      const res = await request(app).get('/api/code-puppy/tools');

      expect(res.status).toBe(200);
      expect(res.body.tools).toBeDefined();
    });
  });

  describe('GET /api/code-puppy/commands', () => {
    it('should return available commands', async () => {
      const res = await request(app).get('/api/code-puppy/commands');

      expect(res.status).toBe(200);
      expect(res.body.commands).toBeDefined();
    });
  });

  // ============================================
  // MCP TESTS
  // ============================================

  describe('GET /api/code-puppy/mcp', () => {
    it('should return MCP servers', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"mcpServers": {}}');

      const res = await request(app).get('/api/code-puppy/mcp');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/code-puppy/mcp', () => {
    it('should add an MCP server', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"mcpServers": {}}');

      const res = await request(app)
        .post('/api/code-puppy/mcp')
        .send({ name: 'test-mcp', command: 'npx', args: ['test-server'] });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/code-puppy/mcp/:name', () => {
    it('should delete an MCP server', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"mcpServers": {"test-mcp": {}}}');

      const res = await request(app).delete('/api/code-puppy/mcp/test-mcp');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/code-puppy/mcp/sync-claude', () => {
    it('should sync MCP from Claude config', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"mcpServers": {}}');

      const res = await request(app).post('/api/code-puppy/mcp/sync-claude');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/code-puppy/mcp/claude-config', () => {
    it('should return Claude MCP config', async () => {
      const { readFileSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('{"mcpServers": {}}');

      const res = await request(app).get('/api/code-puppy/mcp/claude-config');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // SESSION TESTS
  // ============================================

  describe('GET /api/code-puppy/sessions', () => {
    it('should return active sessions', async () => {
      const res = await request(app).get('/api/code-puppy/sessions');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeDefined();
    });
  });

  describe('GET /api/code-puppy/sessions/:id', () => {
    it('should return session details or 404', async () => {
      const res = await request(app).get('/api/code-puppy/sessions/test-session');

      // Will return 404 if no session exists, which is expected
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/code-puppy/sessions', () => {
    it('should create a new session', async () => {
      mockPrisma.codePuppySession.create.mockResolvedValue(testSession);

      const res = await request(app)
        .post('/api/code-puppy/sessions')
        .send({
          projectPath: '/home/user/Projects/test',
          model: 'claude-3-5-sonnet',
          agent: 'coder',
        });

      expect(res.status).toBe(200);
    });

    it('should require projectPath', async () => {
      const res = await request(app)
        .post('/api/code-puppy/sessions')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/input', () => {
    it('should send input to session or return 404', async () => {
      const res = await request(app)
        .post('/api/code-puppy/sessions/test-session/input')
        .send({ input: 'Help me write a function' });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/command', () => {
    it('should execute a command or return 404', async () => {
      const res = await request(app)
        .post('/api/code-puppy/sessions/test-session/command')
        .send({ command: '/help' });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/stop', () => {
    it('should stop a session or return 404', async () => {
      const res = await request(app).post('/api/code-puppy/sessions/test-session/stop');

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/code-puppy/sessions/:id', () => {
    it('should delete a session or return 404', async () => {
      const res = await request(app).delete('/api/code-puppy/sessions/test-session');

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/code-puppy/sessions/stop-all', () => {
    it('should stop all sessions', async () => {
      const res = await request(app).post('/api/code-puppy/sessions/stop-all');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // AUTOSAVES TESTS
  // ============================================

  describe('GET /api/code-puppy/autosaves', () => {
    it('should return autosave files', async () => {
      const { readdirSync, existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      readdirSync.mockReturnValue(['session1.json', 'session2.json']);

      const res = await request(app).get('/api/code-puppy/autosaves');

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/code-puppy/autosaves/:filename', () => {
    it('should delete an autosave file', async () => {
      const res = await request(app).delete('/api/code-puppy/autosaves/session1.json');

      expect(res.status).toBe(200);
    });
  });
});
