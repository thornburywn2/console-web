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
  mkdirSync: vi.fn(),
  promises: {
    readFile: vi.fn(() => Promise.resolve(mockFileContent)),
    writeFile: vi.fn(() => Promise.resolve()),
    mkdir: vi.fn(() => Promise.resolve()),
    access: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock Octokit
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: vi.fn(),
    },
    repos: {
      listForAuthenticatedUser: vi.fn(),
      get: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
    },
    search: {
      repos: vi.fn(),
    },
    actions: {
      listWorkflowRunsForRepo: vi.fn(),
      listRepoWorkflows: vi.fn(),
    },
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

describe('GitHub Routes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    // Reset mock variables
    mockExecResult = { stdout: '', stderr: '' };
    mockExecError = null;
    mockFileContent = '';
    mockFileExists = true;

    // Reset Octokit mocks
    mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: 'testuser', id: 12345 },
    });
    mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [],
    });
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: { id: 1, name: 'test-repo', full_name: 'testuser/test-repo' },
    });
    mockOctokit.rest.search.repos.mockResolvedValue({
      data: { items: [], total_count: 0 },
    });
    mockOctokit.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
      data: { workflow_runs: [] },
    });
    mockOctokit.rest.actions.listRepoWorkflows.mockResolvedValue({
      data: { workflows: [] },
    });

    mockPrisma = {
      gitHubSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      gitHubRepo: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
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

    app.use('/api/github', createGitHubRouter(mockPrisma, '/home/user/Projects'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // SETTINGS
  // ============================================

  describe('GET /api/github/settings', () => {
    it('should return github settings when configured', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_encrypted',
        username: 'testuser',
      });
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', id: 12345, avatar_url: 'https://example.com/avatar' },
      });

      const res = await request(app).get('/api/github/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.username).toBe('testuser');
    });

    it('should return not configured when no settings exist', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/settings');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.gitHubSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/github/settings');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch GitHub settings');
    });
  });

  // ============================================
  // AUTHENTICATION
  // ============================================

  describe('GET /api/github/auth', () => {
    it('should return authentication status', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', id: 12345 },
      });

      const res = await request(app).get('/api/github/auth');

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
    });

    it('should return not authenticated when no settings', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/auth');

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });
  });

  describe('POST /api/github/auth', () => {
    it('should save github token', async () => {
      mockPrisma.gitHubSettings.upsert.mockResolvedValue({
        id: 'default',
        token: 'ghp_newtoken',
      });
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', id: 12345 },
      });

      const res = await request(app)
        .post('/api/github/auth')
        .send({ token: 'ghp_newtoken' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when token is missing', async () => {
      const res = await request(app)
        .post('/api/github/auth')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token is required');
    });

    it('should validate token format', async () => {
      const res = await request(app)
        .post('/api/github/auth')
        .send({ token: 'invalid_token_format' });

      expect(res.status).toBe(400);
    });

    it('should handle invalid token', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(
        new Error('Bad credentials')
      );

      const res = await request(app)
        .post('/api/github/auth')
        .send({ token: 'ghp_invalidtoken' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  describe('DELETE /api/github/auth', () => {
    it('should remove github authentication', async () => {
      mockPrisma.gitHubSettings.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/github/auth');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.gitHubSettings.delete.mockRejectedValue(new Error('Database error'));

      const res = await request(app).delete('/api/github/auth');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to remove authentication');
    });
  });

  // ============================================
  // REPOSITORIES
  // ============================================

  describe('GET /api/github/repos', () => {
    it('should return list of repositories', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          { id: 1, name: 'repo1', full_name: 'testuser/repo1', private: false },
          { id: 2, name: 'repo2', full_name: 'testuser/repo2', private: true },
        ],
      });

      const res = await request(app).get('/api/github/repos');

      expect(res.status).toBe(200);
      expect(res.body.repos).toHaveLength(2);
    });

    it('should return 404 when not authenticated', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/repos');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('GitHub not configured');
    });

    it('should support pagination', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [],
      });

      const res = await request(app).get('/api/github/repos?page=2&per_page=50');

      expect(res.status).toBe(200);
      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, per_page: 50 })
      );
    });
  });

  describe('GET /api/github/repos/search', () => {
    it('should search repositories', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: [
            { id: 1, name: 'test-repo', full_name: 'testuser/test-repo' },
          ],
          total_count: 1,
        },
      });

      const res = await request(app).get('/api/github/repos/search?q=test');

      expect(res.status).toBe(200);
      expect(res.body.repos).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });

      const res = await request(app).get('/api/github/repos/search');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Search query is required');
    });

    it('should return 404 when not authenticated', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/github/repos/search?q=test');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('GitHub not configured');
    });
  });

  // ============================================
  // PROJECT LINKS
  // ============================================

  describe('GET /api/github/projects/:projectId', () => {
    it('should return linked repos for a project', async () => {
      mockPrisma.gitHubRepo.findMany.mockResolvedValue([
        { id: 'link-1', repoFullName: 'testuser/repo1', projectId: 'proj-1' },
      ]);

      const res = await request(app).get('/api/github/projects/proj-1');

      expect(res.status).toBe(200);
      expect(res.body.linkedRepos).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.gitHubRepo.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/github/projects/proj-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch linked repos');
    });
  });

  describe('POST /api/github/projects/:projectId', () => {
    it('should link a repo to a project', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue(null);
      mockPrisma.gitHubRepo.create.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/repo1',
        projectId: 'proj-1',
      });

      const res = await request(app)
        .post('/api/github/projects/proj-1')
        .send({ repoFullName: 'testuser/repo1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when repo already linked', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/repo1',
      });

      const res = await request(app)
        .post('/api/github/projects/proj-1')
        .send({ repoFullName: 'testuser/repo1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Repo already linked');
    });

    it('should return 400 when repoFullName is missing', async () => {
      const res = await request(app)
        .post('/api/github/projects/proj-1')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Repository name is required');
    });
  });

  describe('DELETE /api/github/projects/:projectId', () => {
    it('should unlink a repo from a project', async () => {
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/repo1',
      });
      mockPrisma.gitHubRepo.delete.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/github/projects/proj-1')
        .send({ repoFullName: 'testuser/repo1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when link not found', async () => {
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/github/projects/proj-1')
        .send({ repoFullName: 'testuser/nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Link not found');
    });
  });

  describe('POST /api/github/projects/:projectId/link', () => {
    it('should link existing repo to project', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          id: 1,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          clone_url: 'https://github.com/testuser/test-repo.git',
        },
      });
      mockPrisma.gitHubRepo.upsert.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/test-repo',
      });
      mockExecResult.stdout = 'remote.origin.url=https://github.com/testuser/test-repo.git';

      const res = await request(app)
        .post('/api/github/projects/proj-1/link')
        .send({ owner: 'testuser', repo: 'test-repo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when project not found', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/github/projects/nonexistent/link')
        .send({ owner: 'testuser', repo: 'test-repo' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 400 when owner or repo is missing', async () => {
      const res = await request(app)
        .post('/api/github/projects/proj-1/link')
        .send({ owner: 'testuser' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Owner and repo are required');
    });
  });

  describe('POST /api/github/projects/:projectId/create', () => {
    it('should create a new repo and link it', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'myproject',
        path: '/home/user/Projects/myproject',
      });
      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: {
          id: 1,
          name: 'myproject',
          full_name: 'testuser/myproject',
          clone_url: 'https://github.com/testuser/myproject.git',
        },
      });
      mockPrisma.gitHubRepo.create.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/github/projects/proj-1/create')
        .send({ name: 'myproject', private: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when project not found', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/github/projects/nonexistent/create')
        .send({ name: 'newrepo' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 400 when name is missing', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });

      const res = await request(app)
        .post('/api/github/projects/proj-1/create')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Repository name is required');
    });
  });

  // ============================================
  // CLONE
  // ============================================

  describe('POST /api/github/clone', () => {
    it('should clone a repository', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          id: 1,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          clone_url: 'https://github.com/testuser/test-repo.git',
        },
      });
      mockFileExists = false;
      mockExecResult.stdout = '';

      const res = await request(app)
        .post('/api/github/clone')
        .send({
          owner: 'testuser',
          repo: 'test-repo',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when owner or repo is missing', async () => {
      const res = await request(app)
        .post('/api/github/clone')
        .send({ owner: 'testuser' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Owner and repo are required');
    });

    it('should return 400 when target directory already exists', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          id: 1,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          clone_url: 'https://github.com/testuser/test-repo.git',
        },
      });
      mockFileExists = true;

      const res = await request(app)
        .post('/api/github/clone')
        .send({
          owner: 'testuser',
          repo: 'test-repo',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Directory already exists');
    });

    it('should return 404 when not authenticated', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/github/clone')
        .send({
          owner: 'testuser',
          repo: 'test-repo',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('GitHub not configured');
    });
  });

  // ============================================
  // SYNC
  // ============================================

  describe('GET /api/github/projects/:projectId/status', () => {
    it('should return sync status', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockExecResult.stdout = 'ahead 2, behind 1';

      const res = await request(app).get('/api/github/projects/proj-1/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
    });

    it('should return 404 when project not found', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/github/projects/nonexistent/status');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('POST /api/github/projects/:projectId/push', () => {
    it('should push changes to remote', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockExecResult.stdout = 'Everything up-to-date';

      const res = await request(app).post('/api/github/projects/proj-1/push');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when project not found', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/github/projects/nonexistent/push');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('should return 404 when no linked repo', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/github/projects/proj-1/push');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No linked repo');
    });
  });

  describe('POST /api/github/projects/:projectId/pull', () => {
    it('should pull changes from remote', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockExecResult.stdout = 'Already up to date.';

      const res = await request(app).post('/api/github/projects/proj-1/pull');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when project not found', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/github/projects/nonexistent/pull');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });
  });

  describe('POST /api/github/projects/:projectId/fetch', () => {
    it('should fetch changes from remote', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        path: '/home/user/Projects/myproject',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockExecResult.stdout = '';

      const res = await request(app).post('/api/github/projects/proj-1/fetch');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // CI/CD
  // ============================================

  describe('GET /api/github/projects/:projectId/workflows', () => {
    it('should return workflow list', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockOctokit.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: {
          workflows: [
            { id: 1, name: 'CI', state: 'active' },
            { id: 2, name: 'Deploy', state: 'active' },
          ],
        },
      });

      const res = await request(app).get('/api/github/projects/proj-1/workflows');

      expect(res.status).toBe(200);
      expect(res.body.workflows).toBeDefined();
    });

    it('should return 404 when no linked repo', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/github/projects/proj-1/workflows');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No linked repo');
    });
  });

  describe('GET /api/github/projects/:projectId/runs', () => {
    it('should return workflow runs', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue({
        id: 'link-1',
        repoFullName: 'testuser/myproject',
      });
      mockOctokit.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
        data: {
          workflow_runs: [
            { id: 1, name: 'CI', status: 'completed', conclusion: 'success' },
          ],
        },
      });

      const res = await request(app).get('/api/github/projects/proj-1/runs');

      expect(res.status).toBe(200);
      expect(res.body.runs).toBeDefined();
    });

    it('should return 404 when no linked repo', async () => {
      mockPrisma.gitHubSettings.findUnique.mockResolvedValue({
        id: 'default',
        token: 'ghp_token',
      });
      mockPrisma.gitHubRepo.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/github/projects/proj-1/runs');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No linked repo');
    });
  });
});
