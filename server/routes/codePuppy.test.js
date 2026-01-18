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
    stdin: { write: vi.fn(), end: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') cb(0);
    }),
    kill: vi.fn(),
    pid: 12345,
  })),
}));

// Mock fs
let mockFileContent = '';
let mockFileExists = true;
let mockDirContent = [];
vi.mock('fs', () => ({
  existsSync: vi.fn(() => mockFileExists),
  readFileSync: vi.fn(() => mockFileContent),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => mockDirContent),
  statSync: vi.fn(() => ({
    isDirectory: () => true,
    isFile: () => true,
    mtime: new Date(),
    size: 1024,
  })),
  unlinkSync: vi.fn(),
  promises: {
    readFile: vi.fn(() => Promise.resolve(mockFileContent)),
    writeFile: vi.fn(() => Promise.resolve()),
    mkdir: vi.fn(() => Promise.resolve()),
    access: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve(mockDirContent)),
    stat: vi.fn(() => Promise.resolve({
      isDirectory: () => true,
      isFile: () => true,
      mtime: new Date(),
      size: 1024,
    })),
    unlink: vi.fn(() => Promise.resolve()),
  },
}));

// Mock path
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: (...args) => args.join('/'),
  };
});

describe('Code Puppy Routes', () => {
  let app;
  let mockPrisma;
  let mockIo;

  beforeEach(() => {
    // Reset mock variables
    mockExecResult = { stdout: '', stderr: '' };
    mockExecError = null;
    mockFileContent = '';
    mockFileExists = true;
    mockDirContent = [];

    mockPrisma = {
      codePuppySession: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      codePuppyConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      codePuppyAutosave: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    mockIo = {
      to: vi.fn(() => mockIo),
      emit: vi.fn(),
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/code-puppy', createCodePuppyRouter(mockPrisma, '/home/user/Projects', mockIo));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // INITIALIZATION
  // ============================================

  describe('GET /api/code-puppy/init/status', () => {
    it('should return initialization status', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        providers: { anthropic: { apiKey: 'sk-xxx' } },
      });

      const res = await request(app).get('/api/code-puppy/init/status');

      expect(res.status).toBe(200);
      expect(res.body.initialized).toBeDefined();
    });

    it('should return not initialized when config missing', async () => {
      mockFileExists = false;

      const res = await request(app).get('/api/code-puppy/init/status');

      expect(res.status).toBe(200);
      expect(res.body.initialized).toBe(false);
    });
  });

  describe('POST /api/code-puppy/init', () => {
    it('should initialize Code Puppy', async () => {
      mockExecResult.stdout = 'Code Puppy initialized';

      const res = await request(app)
        .post('/api/code-puppy/init')
        .send({
          provider: 'anthropic',
          apiKey: 'sk-ant-xxx',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when provider is missing', async () => {
      const res = await request(app)
        .post('/api/code-puppy/init')
        .send({ apiKey: 'sk-ant-xxx' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Provider and API key are required');
    });
  });

  describe('POST /api/code-puppy/init/directories', () => {
    it('should create necessary directories', async () => {
      const res = await request(app).post('/api/code-puppy/init/directories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/init/config', () => {
    it('should create initial config', async () => {
      const res = await request(app)
        .post('/api/code-puppy/init/config')
        .send({
          provider: 'anthropic',
          model: 'claude-3-sonnet',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/init/sync-mcp', () => {
    it('should sync MCP servers from Claude config', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        mcpServers: {
          server1: { command: 'npx', args: ['-y', '@mcp/server'] },
        },
      });

      const res = await request(app).post('/api/code-puppy/init/sync-mcp');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/init/settings', () => {
    it('should save initial settings', async () => {
      mockPrisma.codePuppyConfig.upsert.mockResolvedValue({
        id: 'default',
        theme: 'dark',
      });

      const res = await request(app)
        .post('/api/code-puppy/init/settings')
        .send({ theme: 'dark', autoSave: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // STATUS & INSTALL
  // ============================================

  describe('GET /api/code-puppy/status', () => {
    it('should return Code Puppy status', async () => {
      mockExecResult.stdout = 'code-puppy version 1.0.0';
      mockFileExists = true;

      const res = await request(app).get('/api/code-puppy/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBeDefined();
    });

    it('should handle Code Puppy not installed', async () => {
      mockExecError = new Error('command not found');

      const res = await request(app).get('/api/code-puppy/status');

      expect(res.status).toBe(200);
      expect(res.body.installed).toBe(false);
    });
  });

  describe('POST /api/code-puppy/install', () => {
    it('should install Code Puppy', async () => {
      mockExecResult.stdout = 'Installed successfully';

      const res = await request(app).post('/api/code-puppy/install');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // CONFIG
  // ============================================

  describe('GET /api/code-puppy/config', () => {
    it('should return configuration', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        model: 'claude-3-sonnet',
        temperature: 0.7,
      });

      const res = await request(app).get('/api/code-puppy/config');

      expect(res.status).toBe(200);
      expect(res.body.config).toBeDefined();
    });

    it('should return empty config when file missing', async () => {
      mockFileExists = false;

      const res = await request(app).get('/api/code-puppy/config');

      expect(res.status).toBe(200);
      expect(res.body.config).toEqual({});
    });
  });

  describe('PUT /api/code-puppy/config', () => {
    it('should update configuration', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({ model: 'claude-3-sonnet' });

      const res = await request(app)
        .put('/api/code-puppy/config')
        .send({ model: 'claude-3-opus', temperature: 0.5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/code-puppy/config/:key', () => {
    it('should update a specific config key', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({ model: 'claude-3-sonnet' });

      const res = await request(app)
        .put('/api/code-puppy/config/model')
        .send({ value: 'claude-3-opus' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when value is missing', async () => {
      const res = await request(app)
        .put('/api/code-puppy/config/model')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Value is required');
    });
  });

  // ============================================
  // PROVIDERS & MODELS
  // ============================================

  describe('GET /api/code-puppy/providers', () => {
    it('should return available providers', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        providers: {
          anthropic: { apiKey: 'sk-xxx' },
          openai: { apiKey: 'sk-xxx' },
        },
      });

      const res = await request(app).get('/api/code-puppy/providers');

      expect(res.status).toBe(200);
      expect(res.body.providers).toBeDefined();
    });
  });

  describe('GET /api/code-puppy/models/extra', () => {
    it('should return extra models', async () => {
      mockPrisma.codePuppyConfig.findUnique.mockResolvedValue({
        id: 'default',
        extraModels: ['gpt-4-turbo', 'gemini-pro'],
      });

      const res = await request(app).get('/api/code-puppy/models/extra');

      expect(res.status).toBe(200);
      expect(res.body.models).toBeDefined();
    });
  });

  describe('POST /api/code-puppy/models/extra', () => {
    it('should add an extra model', async () => {
      mockPrisma.codePuppyConfig.upsert.mockResolvedValue({
        id: 'default',
        extraModels: ['gpt-4-turbo'],
      });

      const res = await request(app)
        .post('/api/code-puppy/models/extra')
        .send({ model: 'gpt-4-turbo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when model is missing', async () => {
      const res = await request(app)
        .post('/api/code-puppy/models/extra')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Model is required');
    });
  });

  describe('DELETE /api/code-puppy/models/extra', () => {
    it('should remove an extra model', async () => {
      mockPrisma.codePuppyConfig.findUnique.mockResolvedValue({
        id: 'default',
        extraModels: ['gpt-4-turbo', 'gemini-pro'],
      });
      mockPrisma.codePuppyConfig.upsert.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/code-puppy/models/extra')
        .send({ model: 'gpt-4-turbo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // AGENTS
  // ============================================

  describe('GET /api/code-puppy/agents', () => {
    it('should return list of agents', async () => {
      mockDirContent = ['agent1.json', 'agent2.json'];
      mockFileContent = JSON.stringify({
        name: 'Test Agent',
        description: 'A test agent',
      });

      const res = await request(app).get('/api/code-puppy/agents');

      expect(res.status).toBe(200);
      expect(res.body.agents).toBeDefined();
    });
  });

  describe('GET /api/code-puppy/agents/:name', () => {
    it('should return a specific agent', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        name: 'TestAgent',
        description: 'A test agent',
        instructions: 'Do something useful',
      });

      const res = await request(app).get('/api/code-puppy/agents/TestAgent');

      expect(res.status).toBe(200);
      expect(res.body.agent).toBeDefined();
    });

    it('should return 404 when agent not found', async () => {
      mockFileExists = false;

      const res = await request(app).get('/api/code-puppy/agents/NonExistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/code-puppy/agents', () => {
    it('should create a new agent', async () => {
      const res = await request(app)
        .post('/api/code-puppy/agents')
        .send({
          name: 'NewAgent',
          description: 'A new agent',
          instructions: 'Do something new',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/code-puppy/agents')
        .send({ description: 'A new agent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Agent name is required');
    });
  });

  describe('PUT /api/code-puppy/agents/:name', () => {
    it('should update an agent', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        name: 'TestAgent',
        description: 'Original description',
      });

      const res = await request(app)
        .put('/api/code-puppy/agents/TestAgent')
        .send({ description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when agent not found', async () => {
      mockFileExists = false;

      const res = await request(app)
        .put('/api/code-puppy/agents/NonExistent')
        .send({ description: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });
  });

  describe('DELETE /api/code-puppy/agents/:name', () => {
    it('should delete an agent', async () => {
      mockFileExists = true;

      const res = await request(app).delete('/api/code-puppy/agents/TestAgent');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when agent not found', async () => {
      mockFileExists = false;

      const res = await request(app).delete('/api/code-puppy/agents/NonExistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
    });
  });

  describe('GET /api/code-puppy/tools', () => {
    it('should return available tools', async () => {
      mockExecResult.stdout = JSON.stringify({
        tools: [
          { name: 'read_file', description: 'Read a file' },
          { name: 'write_file', description: 'Write a file' },
        ],
      });

      const res = await request(app).get('/api/code-puppy/tools');

      expect(res.status).toBe(200);
      expect(res.body.tools).toBeDefined();
    });
  });

  // ============================================
  // COMMANDS
  // ============================================

  describe('GET /api/code-puppy/commands', () => {
    it('should return available commands', async () => {
      mockExecResult.stdout = JSON.stringify({
        commands: [
          { name: 'help', description: 'Show help' },
          { name: 'clear', description: 'Clear screen' },
        ],
      });

      const res = await request(app).get('/api/code-puppy/commands');

      expect(res.status).toBe(200);
      expect(res.body.commands).toBeDefined();
    });
  });

  // ============================================
  // MCP SERVERS
  // ============================================

  describe('GET /api/code-puppy/mcp', () => {
    it('should return MCP server list', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        mcpServers: {
          server1: { command: 'npx', args: ['-y', '@mcp/server'] },
        },
      });

      const res = await request(app).get('/api/code-puppy/mcp');

      expect(res.status).toBe(200);
      expect(res.body.servers).toBeDefined();
    });
  });

  describe('POST /api/code-puppy/mcp', () => {
    it('should add an MCP server', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({ mcpServers: {} });

      const res = await request(app)
        .post('/api/code-puppy/mcp')
        .send({
          name: 'new-server',
          command: 'npx',
          args: ['-y', '@mcp/new-server'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when name or command is missing', async () => {
      const res = await request(app)
        .post('/api/code-puppy/mcp')
        .send({ name: 'new-server' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Server name and command are required');
    });
  });

  describe('DELETE /api/code-puppy/mcp/:name', () => {
    it('should remove an MCP server', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        mcpServers: {
          server1: { command: 'npx', args: [] },
        },
      });

      const res = await request(app).delete('/api/code-puppy/mcp/server1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when server not found', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({ mcpServers: {} });

      const res = await request(app).delete('/api/code-puppy/mcp/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Server not found');
    });
  });

  describe('POST /api/code-puppy/mcp/sync-claude', () => {
    it('should sync MCP from Claude config', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        mcpServers: {
          server1: { command: 'npx', args: ['-y', '@mcp/server'] },
        },
      });

      const res = await request(app).post('/api/code-puppy/mcp/sync-claude');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/code-puppy/mcp/claude-config', () => {
    it('should return Claude MCP config', async () => {
      mockFileExists = true;
      mockFileContent = JSON.stringify({
        mcpServers: {
          server1: { command: 'npx', args: ['-y', '@mcp/server'] },
        },
      });

      const res = await request(app).get('/api/code-puppy/mcp/claude-config');

      expect(res.status).toBe(200);
      expect(res.body.config).toBeDefined();
    });

    it('should return empty config when file not found', async () => {
      mockFileExists = false;

      const res = await request(app).get('/api/code-puppy/mcp/claude-config');

      expect(res.status).toBe(200);
      expect(res.body.config).toEqual({});
    });
  });

  // ============================================
  // SESSIONS
  // ============================================

  describe('GET /api/code-puppy/sessions', () => {
    it('should return list of sessions', async () => {
      mockPrisma.codePuppySession.findMany.mockResolvedValue([
        { id: 'session-1', name: 'Test Session', status: 'active' },
        { id: 'session-2', name: 'Another Session', status: 'stopped' },
      ]);

      const res = await request(app).get('/api/code-puppy/sessions');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(2);
    });
  });

  describe('GET /api/code-puppy/sessions/:id', () => {
    it('should return a specific session', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        name: 'Test Session',
        status: 'active',
        messages: [],
      });

      const res = await request(app).get('/api/code-puppy/sessions/session-1');

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
    });

    it('should return 404 when session not found', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/code-puppy/sessions/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });
  });

  describe('POST /api/code-puppy/sessions', () => {
    it('should create a new session', async () => {
      mockPrisma.codePuppySession.create.mockResolvedValue({
        id: 'session-1',
        name: 'New Session',
        status: 'active',
      });
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/code-puppy/sessions')
        .send({
          name: 'New Session',
          projectPath: '/home/user/Projects/myproject',
        });

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
    });

    it('should return 400 when project path is missing', async () => {
      const res = await request(app)
        .post('/api/code-puppy/sessions')
        .send({ name: 'New Session' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Project path is required');
    });
  });

  describe('DELETE /api/code-puppy/sessions/:id', () => {
    it('should delete a session', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'stopped',
      });
      mockPrisma.codePuppySession.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/code-puppy/sessions/session-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when session not found', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/code-puppy/sessions/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });
  });

  // ============================================
  // SESSION INTERACTIONS
  // ============================================

  describe('POST /api/code-puppy/sessions/:id/input', () => {
    it('should send input to session', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
        pid: 12345,
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/input')
        .send({ message: 'Hello, Code Puppy!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when session not found', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/code-puppy/sessions/nonexistent/input')
        .send({ message: 'Hello' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('should return 400 when message is missing', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/input')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Message is required');
    });
  });

  describe('POST /api/code-puppy/sessions/:id/command', () => {
    it('should send a command to session', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/command')
        .send({ command: '/help' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when command is missing', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/command')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Command is required');
    });
  });

  describe('POST /api/code-puppy/sessions/:id/agent', () => {
    it('should invoke an agent in session', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/agent')
        .send({ agent: 'TestAgent', prompt: 'Do something' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when agent is missing', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/agent')
        .send({ prompt: 'Do something' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Agent name is required');
    });
  });

  describe('POST /api/code-puppy/sessions/:id/model', () => {
    it('should change session model', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });
      mockPrisma.codePuppySession.update.mockResolvedValue({
        id: 'session-1',
        model: 'claude-3-opus',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/model')
        .send({ model: 'claude-3-opus' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when model is missing', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/model')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Model is required');
    });
  });

  describe('POST /api/code-puppy/sessions/:id/truncate', () => {
    it('should truncate session history', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
        messages: [{}, {}, {}],
      });
      mockPrisma.codePuppySession.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/truncate')
        .send({ keepLast: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/clear', () => {
    it('should clear session history', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });
      mockPrisma.codePuppySession.update.mockResolvedValue({
        id: 'session-1',
        messages: [],
      });

      const res = await request(app).post('/api/code-puppy/sessions/session-1/clear');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/dbos', () => {
    it('should toggle DBOS mode', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
      });
      mockPrisma.codePuppySession.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/dbos')
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/config', () => {
    it('should update session config', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
        config: {},
      });
      mockPrisma.codePuppySession.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/code-puppy/sessions/session-1/config')
        .send({ temperature: 0.5, maxTokens: 4000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/code-puppy/sessions/:id/stop', () => {
    it('should stop a session', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'active',
        pid: 12345,
      });
      mockPrisma.codePuppySession.update.mockResolvedValue({
        id: 'session-1',
        status: 'stopped',
      });

      const res = await request(app).post('/api/code-puppy/sessions/session-1/stop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when session not found', async () => {
      mockPrisma.codePuppySession.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/code-puppy/sessions/nonexistent/stop');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });
  });

  describe('POST /api/code-puppy/sessions/stop-all', () => {
    it('should stop all sessions', async () => {
      mockPrisma.codePuppySession.findMany.mockResolvedValue([
        { id: 'session-1', status: 'active', pid: 12345 },
        { id: 'session-2', status: 'active', pid: 12346 },
      ]);
      mockPrisma.codePuppySession.update.mockResolvedValue({});

      const res = await request(app).post('/api/code-puppy/sessions/stop-all');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // AUTOSAVES
  // ============================================

  describe('GET /api/code-puppy/autosaves', () => {
    it('should return list of autosaves', async () => {
      mockPrisma.codePuppyAutosave.findMany.mockResolvedValue([
        { id: 'autosave-1', sessionId: 'session-1', createdAt: new Date() },
        { id: 'autosave-2', sessionId: 'session-1', createdAt: new Date() },
      ]);

      const res = await request(app).get('/api/code-puppy/autosaves');

      expect(res.status).toBe(200);
      expect(res.body.autosaves).toHaveLength(2);
    });

    it('should filter by session', async () => {
      mockPrisma.codePuppyAutosave.findMany.mockResolvedValue([
        { id: 'autosave-1', sessionId: 'session-1', createdAt: new Date() },
      ]);

      const res = await request(app).get('/api/code-puppy/autosaves?sessionId=session-1');

      expect(res.status).toBe(200);
      expect(mockPrisma.codePuppyAutosave.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sessionId: 'session-1' }),
        })
      );
    });
  });

  describe('DELETE /api/code-puppy/autosaves/:id', () => {
    it('should delete an autosave', async () => {
      mockPrisma.codePuppyAutosave.findUnique.mockResolvedValue({
        id: 'autosave-1',
      });
      mockPrisma.codePuppyAutosave.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/code-puppy/autosaves/autosave-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when autosave not found', async () => {
      mockPrisma.codePuppyAutosave.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/code-puppy/autosaves/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Autosave not found');
    });
  });
});
