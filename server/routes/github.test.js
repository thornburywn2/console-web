/**
 * GitHub Routes Tests
 * Phase 5.3: Test Coverage for GitHub Integration API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGitHubRouter } from './github.js';

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
    readFileSync: vi.fn(() => ''),
  };
});

describe('GitHub Routes', () => {
  let app;
  let mockPrisma;

  const testSettings = {
    id: 'default',
    token: 'ghp_test_token',
    username: 'testuser',
    configured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testRepo = {
    id: 1,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    private: false,
    html_url: 'https://github.com/testuser/test-repo',
    clone_url: 'https://github.com/testuser/test-repo.git',
    default_branch: 'main',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockExecAsync.mockReset();

    mockPrisma = {
      gitHubSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      gitHubRepo: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      project: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/github', createGitHubRouter(mockPrisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // SETTINGS TESTS
  // ============================================

  describe('GET /api/github/settings', () => {
    it('should return unconfigured status when no settings', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('should return settings without exposing full token', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      const res = await request(app).get('/api/github/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.username).toBe('testuser');
      expect(res.body.token).toBeUndefined();
    });
  });

  // ============================================
  // AUTH TESTS
  // ============================================

  describe('GET /api/github/auth', () => {
    it('should return auth status', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' }),
      });

      const res = await request(app).get('/api/github/auth');

      expect(res.status).toBe(200);
    });

    it('should return unauthenticated when no token', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/auth');

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });
  });

  describe('POST /api/github/auth', () => {
    it('should authenticate with valid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser', id: 12345 }),
      });

      mockPrisma.gitHubSettings.upsert.mockResolvedValue(testSettings);

      const res = await request(app)
        .post('/api/github/auth')
        .send({ token: 'ghp_valid_token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Bad credentials' }),
      });

      const res = await request(app)
        .post('/api/github/auth')
        .send({ token: 'invalid_token' });

      expect(res.status).toBe(401);
    });

    it('should require token', async () => {
      const res = await request(app)
        .post('/api/github/auth')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/github/auth', () => {
    it('should disconnect GitHub', async () => {
      mockPrisma.gitHubSettings.delete.mockResolvedValue(testSettings);

      const res = await request(app).delete('/api/github/auth');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // REPOS TESTS
  // ============================================

  describe('GET /api/github/repos', () => {
    it('should return user repositories', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve([testRepo]),
      });

      const res = await request(app).get('/api/github/repos');

      expect(res.status).toBe(200);
      expect(res.body.repos).toBeDefined();
    });

    it('should require authentication', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/repos');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/github/repos/search', () => {
    it('should search repositories', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [testRepo] }),
      });

      const res = await request(app).get('/api/github/repos/search?query=test');

      expect(res.status).toBe(200);
    });

    it('should require query parameter', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      const res = await request(app).get('/api/github/repos/search');

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // PROJECT LINK TESTS
  // ============================================

  describe('GET /api/github/projects/:projectId', () => {
    it('should return project GitHub info', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
        githubRepo: 'testuser/test-repo',
      });

      mockExecAsync.mockResolvedValue({
        stdout: 'https://github.com/testuser/test-repo.git',
      });

      const res = await request(app).get('/api/github/projects/test');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/github/projects/:projectId/link', () => {
    it('should link project to GitHub repo', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
      });
      mockPrisma.project.update.mockResolvedValue({
        id: 'project-1',
        githubRepo: 'testuser/test-repo',
      });

      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/github/projects/test/link')
        .send({ repo: 'testuser/test-repo' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/github/projects/:projectId/create', () => {
    it('should create new GitHub repo for project', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'test',
        path: '/home/user/Projects/test',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testRepo),
      });

      mockExecAsync.mockResolvedValue({ stdout: '' });
      mockPrisma.project.update.mockResolvedValue({
        id: 'project-1',
        githubRepo: 'testuser/test-repo',
      });

      const res = await request(app)
        .post('/api/github/projects/test/create')
        .send({ name: 'test-repo', private: true });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/github/projects/:projectId', () => {
    it('should unlink project from GitHub', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
        githubRepo: 'testuser/test-repo',
      });
      mockPrisma.project.update.mockResolvedValue({
        id: 'project-1',
        githubRepo: null,
      });

      const res = await request(app).delete('/api/github/projects/test');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // CLONE TESTS
  // ============================================

  describe('POST /api/github/clone', () => {
    it('should clone a repository', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testRepo),
      });

      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app)
        .post('/api/github/clone')
        .send({ repo: 'testuser/test-repo' });

      expect(res.status).toBe(200);
    });

    it('should require repo parameter', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);

      const res = await request(app)
        .post('/api/github/clone')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // GIT OPERATIONS TESTS
  // ============================================

  describe('GET /api/github/projects/:projectId/status', () => {
    it('should return git status', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
      });

      mockExecAsync.mockResolvedValue({
        stdout: 'On branch main\nnothing to commit',
      });

      const res = await request(app).get('/api/github/projects/test/status');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/github/projects/:projectId/push', () => {
    it('should push changes to GitHub', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
      });

      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).post('/api/github/projects/test/push');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/github/projects/:projectId/pull', () => {
    it('should pull changes from GitHub', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
      });

      mockExecAsync.mockResolvedValue({ stdout: 'Already up to date.' });

      const res = await request(app).post('/api/github/projects/test/pull');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/github/projects/:projectId/fetch', () => {
    it('should fetch from remote', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
      });

      mockExecAsync.mockResolvedValue({ stdout: '' });

      const res = await request(app).post('/api/github/projects/test/fetch');

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // WORKFLOWS TESTS
  // ============================================

  describe('GET /api/github/projects/:projectId/workflows', () => {
    it('should return GitHub Actions workflows', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
        githubRepo: 'testuser/test-repo',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workflows: [] }),
      });

      const res = await request(app).get('/api/github/projects/test/workflows');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/github/projects/:projectId/runs', () => {
    it('should return workflow runs', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(testSettings);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        path: '/home/user/Projects/test',
        githubRepo: 'testuser/test-repo',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workflow_runs: [] }),
      });

      const res = await request(app).get('/api/github/projects/test/runs');

      expect(res.status).toBe(200);
    });
  });
});
