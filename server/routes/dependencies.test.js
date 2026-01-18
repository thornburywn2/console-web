/**
 * Dependencies Routes Tests
 * Phase 5.3: Test Coverage for Dependencies Management API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDependenciesRouter } from './dependencies.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock validation middleware
vi.mock('../middleware/validate.js', () => ({
  validateBody: () => (req, res, next) => {
    req.validatedBody = req.body;
    next();
  },
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
const mockExec = vi.fn((cmd, opts, cb) => {
  if (typeof opts === 'function') {
    cb = opts;
  }
  cb(null, { stdout: '{}', stderr: '' });
});

vi.mock('child_process', () => ({
  exec: (cmd, opts, cb) => mockExec(cmd, opts, cb),
}));

// Mock fs - use functions that can be controlled per-test
let mockExistsSync = true;
let mockReadFileSync = JSON.stringify({
  dependencies: { react: '^18.2.0', express: '^4.18.0' },
  devDependencies: { vitest: '^0.34.0', typescript: '^5.0.0' },
});

vi.mock('fs', () => ({
  existsSync: () => mockExistsSync,
  readFileSync: () => mockReadFileSync,
}));

describe('Dependencies Routes', () => {
  let app;

  beforeEach(() => {
    // Reset mocks
    mockExistsSync = true;
    mockReadFileSync = JSON.stringify({
      dependencies: { react: '^18.2.0', express: '^4.18.0' },
      devDependencies: { vitest: '^0.34.0', typescript: '^5.0.0' },
    });

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });

    app.use('/api/dependencies', createDependenciesRouter());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // LIST DEPENDENCIES
  // ============================================

  describe('GET /api/dependencies/:projectPath', () => {
    it('should return dependencies for a project', async () => {
      const res = await request(app).get('/api/dependencies/test-project');

      expect(res.status).toBe(200);
      expect(res.body.packages).toBeInstanceOf(Array);
      expect(res.body.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should include both deps and devDeps', async () => {
      const res = await request(app).get('/api/dependencies/test-project');

      expect(res.body.packages.length).toBe(4);
      const devPackages = res.body.packages.filter((p) => p.isDev);
      const prodPackages = res.body.packages.filter((p) => !p.isDev);
      expect(devPackages.length).toBe(2);
      expect(prodPackages.length).toBe(2);
    });

    it('should handle URL-encoded project paths', async () => {
      const res = await request(app).get('/api/dependencies/path%2Fto%2Fproject');

      expect(res.status).toBe(200);
    });

    it('should include package names', async () => {
      const res = await request(app).get('/api/dependencies/test-project');

      const names = res.body.packages.map((p) => p.name);
      expect(names).toContain('react');
      expect(names).toContain('express');
      expect(names).toContain('vitest');
      expect(names).toContain('typescript');
    });

    it('should mark dev dependencies correctly', async () => {
      const res = await request(app).get('/api/dependencies/test-project');

      const vitest = res.body.packages.find((p) => p.name === 'vitest');
      expect(vitest.isDev).toBe(true);

      const react = res.body.packages.find((p) => p.name === 'react');
      expect(react.isDev).toBe(false);
    });
  });

  // ============================================
  // UPDATE SINGLE PACKAGE
  // ============================================

  describe('POST /api/dependencies/update', () => {
    it('should update a single package', async () => {
      const res = await request(app).post('/api/dependencies/update').send({
        projectPath: 'test-project',
        packageName: 'react',
        version: '18.3.0',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.package).toBe('react');
    });

    it('should update to latest when no version specified', async () => {
      const res = await request(app).post('/api/dependencies/update').send({
        projectPath: 'test-project',
        packageName: 'react',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should include version in response', async () => {
      const res = await request(app).post('/api/dependencies/update').send({
        projectPath: 'test-project',
        packageName: 'react',
        version: '18.3.0',
      });

      expect(res.body.version).toBe('18.3.0');
    });
  });

  // ============================================
  // UPDATE ALL PACKAGES
  // ============================================

  describe('POST /api/dependencies/update-all', () => {
    it('should update all packages', async () => {
      const res = await request(app).post('/api/dependencies/update-all').send({
        projectPath: 'test-project',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should include output in response', async () => {
      const res = await request(app).post('/api/dependencies/update-all').send({
        projectPath: 'test-project',
      });

      expect(res.body.output).toBeDefined();
    });
  });

  // ============================================
  // AUDIT FIX
  // ============================================

  describe('POST /api/dependencies/audit-fix', () => {
    it('should run npm audit fix', async () => {
      const res = await request(app).post('/api/dependencies/audit-fix').send({
        projectPath: 'test-project',
        force: false,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should run npm audit fix with force option', async () => {
      const res = await request(app).post('/api/dependencies/audit-fix').send({
        projectPath: 'test-project',
        force: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should include output in response', async () => {
      const res = await request(app).post('/api/dependencies/audit-fix').send({
        projectPath: 'test-project',
      });

      expect(res.body.output).toBeDefined();
    });
  });
});
