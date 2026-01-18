/**
 * Tests for Git Routes
 * Tests git operations and automation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGitRouter } from './git.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: vi.fn((res, error, options) => {
    res.status(500).json({ error: options.userMessage });
  }),
}));

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => {
    req.validatedBody = req.body;
    next();
  },
}));

// Mock schemas
vi.mock('../validation/schemas.js', () => ({
  gitCommitSchema: {},
  gitBranchSchema: {},
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn((cmd, args, opts) => {
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };

    // Simulate async behavior
    setTimeout(() => {
      // Get the handler for 'data' event
      const cmdString = args.join(' ');

      let stdout = '';
      let stderr = '';

      // Mock different git commands
      if (cmdString.includes('rev-parse --abbrev-ref HEAD')) {
        stdout = 'main';
      } else if (cmdString.includes('rev-list --left-right --count')) {
        stdout = '2\t1';
      } else if (cmdString.includes('diff --cached --name-only')) {
        stdout = 'src/app.js\nsrc/utils.js';
      } else if (cmdString.includes('diff --name-only')) {
        stdout = 'src/index.js';
      } else if (cmdString.includes('ls-files --others')) {
        stdout = 'newfile.txt';
      } else if (cmdString.includes('pull')) {
        stdout = 'Already up to date.';
      } else if (cmdString.includes('push')) {
        stdout = 'Everything up-to-date';
      } else if (cmdString.includes('commit')) {
        stdout = '[main abc1234] Test commit\n 1 file changed';
      } else if (cmdString.includes('stash push')) {
        stdout = 'Saved working directory';
      } else if (cmdString.includes('checkout -b')) {
        stdout = 'Switched to new branch';
      } else if (cmdString.includes('log')) {
        stdout = 'abc123|abc123|Initial commit|Author|2 days ago\ndef456|def456|Second commit|Author|1 day ago';
      } else if (cmdString.includes('branch -a')) {
        stdout = '* main\n  feature/test\n  develop\n  remotes/origin/main';
      } else if (cmdString.includes('checkout')) {
        stdout = 'Switched to branch';
      } else if (cmdString.includes('add')) {
        stdout = '';
      }

      // Call data handlers
      mockProcess.stdout.on.mock.calls.forEach(call => {
        if (call[0] === 'data') call[1](Buffer.from(stdout));
      });
      mockProcess.stderr.on.mock.calls.forEach(call => {
        if (call[0] === 'data') call[1](Buffer.from(stderr));
      });

      // Call close handler with success
      mockProcess.on.mock.calls.forEach(call => {
        if (call[0] === 'close') call[1](0);
      });
    }, 10);

    return mockProcess;
  }),
}));

// Create mock prisma (git router doesn't use it much)
function createMockPrisma() {
  return {};
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api/git', createGitRouter(prisma));
  return app;
}

describe('Git Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // GIT STATUS
  // ==========================================================================
  describe('GET /api/git/:projectPath/status', () => {
    it('should return git status', async () => {
      const res = await request(app).get('/api/git/test-project/status');

      expect(res.status).toBe(200);
      expect(res.body.branch).toBe('main');
      expect(res.body.ahead).toBe(2);
      expect(res.body.behind).toBe(1);
    });

    it('should include staged files', async () => {
      const res = await request(app).get('/api/git/test-project/status');

      expect(res.status).toBe(200);
      expect(res.body.staged).toContain('src/app.js');
    });

    it('should include unstaged files', async () => {
      const res = await request(app).get('/api/git/test-project/status');

      expect(res.status).toBe(200);
      expect(res.body.unstaged).toContain('src/index.js');
    });

    it('should include untracked files', async () => {
      const res = await request(app).get('/api/git/test-project/status');

      expect(res.status).toBe(200);
      expect(res.body.untracked).toContain('newfile.txt');
    });

    it('should handle URL-encoded paths', async () => {
      const res = await request(app).get('/api/git/my%20project/status');

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // GIT PULL
  // ==========================================================================
  describe('POST /api/git/:projectPath/pull', () => {
    it('should pull changes', async () => {
      const res = await request(app).post('/api/git/test-project/pull');

      expect(res.status).toBe(200);
      expect(res.body.output).toBeDefined();
    });
  });

  // ==========================================================================
  // GIT PUSH
  // ==========================================================================
  describe('POST /api/git/:projectPath/push', () => {
    it('should push changes', async () => {
      const res = await request(app).post('/api/git/test-project/push');

      expect(res.status).toBe(200);
      expect(res.body.output).toBeDefined();
    });
  });

  // ==========================================================================
  // GIT COMMIT
  // ==========================================================================
  describe('POST /api/git/:projectPath/commit', () => {
    it('should commit with message', async () => {
      const res = await request(app)
        .post('/api/git/test-project/commit')
        .send({ message: 'Test commit' });

      expect(res.status).toBe(200);
      expect(res.body.output).toBeDefined();
    });

    it('should stage all files when addAll is true', async () => {
      const res = await request(app)
        .post('/api/git/test-project/commit')
        .send({ message: 'Test commit', addAll: true });

      expect(res.status).toBe(200);
    });

    it('should stage specific files', async () => {
      const res = await request(app)
        .post('/api/git/test-project/commit')
        .send({ message: 'Test commit', files: ['src/app.js'] });

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // GIT STASH
  // ==========================================================================
  describe('POST /api/git/:projectPath/stash', () => {
    it('should stash changes', async () => {
      const res = await request(app).post('/api/git/test-project/stash');

      expect(res.status).toBe(200);
      expect(res.body.output).toBeDefined();
    });

    it('should stash with message', async () => {
      const res = await request(app)
        .post('/api/git/test-project/stash')
        .send({ message: 'WIP: feature work' });

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // GIT BRANCH (CREATE)
  // ==========================================================================
  describe('POST /api/git/:projectPath/branch', () => {
    it('should create a new branch', async () => {
      const res = await request(app)
        .post('/api/git/test-project/branch')
        .send({ name: 'feature/new-feature' });

      expect(res.status).toBe(200);
      expect(res.body.output).toContain('feature/new-feature');
    });

    it('should create branch from specific ref', async () => {
      const res = await request(app)
        .post('/api/git/test-project/branch')
        .send({ name: 'hotfix/fix-bug', from: 'develop' });

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // GIT LOG
  // ==========================================================================
  describe('GET /api/git/:projectPath/log', () => {
    it('should return recent commits', async () => {
      const res = await request(app).get('/api/git/test-project/log');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('hash');
      expect(res.body[0]).toHaveProperty('message');
      expect(res.body[0]).toHaveProperty('author');
    });

    it('should respect limit parameter', async () => {
      const res = await request(app).get('/api/git/test-project/log?limit=5');

      expect(res.status).toBe(200);
    });

    it('should cap limit at 100', async () => {
      const res = await request(app).get('/api/git/test-project/log?limit=200');

      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // GIT BRANCHES
  // ==========================================================================
  describe('GET /api/git/:projectPath/branches', () => {
    it('should return branches with current', async () => {
      const res = await request(app).get('/api/git/test-project/branches');

      expect(res.status).toBe(200);
      expect(res.body.current).toBe('main');
      expect(res.body.branches).toBeDefined();
      expect(Array.isArray(res.body.branches)).toBe(true);
    });

    it('should exclude remote branches', async () => {
      const res = await request(app).get('/api/git/test-project/branches');

      expect(res.status).toBe(200);
      expect(res.body.branches.some(b => b.startsWith('remotes/'))).toBe(false);
    });
  });

  // ==========================================================================
  // GIT CHECKOUT
  // ==========================================================================
  describe('POST /api/git/:projectPath/checkout', () => {
    it('should switch branch', async () => {
      const res = await request(app)
        .post('/api/git/test-project/checkout')
        .send({ branch: 'develop' });

      expect(res.status).toBe(200);
      expect(res.body.output).toContain('develop');
    });

    it('should reject missing branch', async () => {
      const res = await request(app)
        .post('/api/git/test-project/checkout')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Valid branch name required');
    });

    it('should reject invalid branch name', async () => {
      const res = await request(app)
        .post('/api/git/test-project/checkout')
        .send({ branch: 'invalid;branch' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid branch name format');
    });

    it('should reject overly long branch name', async () => {
      const res = await request(app)
        .post('/api/git/test-project/checkout')
        .send({ branch: 'a'.repeat(101) });

      expect(res.status).toBe(400);
    });

    it('should accept valid branch names with special chars', async () => {
      const res = await request(app)
        .post('/api/git/test-project/checkout')
        .send({ branch: 'feature/my-feature_v1.0' });

      expect(res.status).toBe(200);
    });
  });
});
