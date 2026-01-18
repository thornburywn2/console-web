/**
 * Tests for Project Templates Routes
 * Tests template listing, project creation, migration, and compliance checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createProjectTemplatesRouter } from './projectTemplates.js';

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

// Mock template service
const mockTemplateService = {
  listTemplates: vi.fn().mockResolvedValue([
    { id: 'web-app-fullstack', name: 'Full-Stack Web App', description: 'React + Fastify' },
    { id: 'cli-tool', name: 'CLI Tool', description: 'Node.js CLI' },
  ]),
  getTemplate: vi.fn(),
  createProject: vi.fn(),
  migrateProject: vi.fn(),
  checkCompliance: vi.fn(),
  checkAllProjects: vi.fn(),
  getComplianceConfig: vi.fn(),
};

vi.mock('../services/templateService.js', () => ({
  getTemplateService: () => mockTemplateService,
}));

// Create app with router
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/project-templates', createProjectTemplatesRouter());
  return app;
}

describe('Project Templates Routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  // ==========================================================================
  // LIST TEMPLATES
  // ==========================================================================
  describe('GET /api/project-templates', () => {
    it('should list all templates', async () => {
      const res = await request(app).get('/api/project-templates');

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(2);
      expect(res.body.templates[0].id).toBe('web-app-fullstack');
    });

    it('should handle errors', async () => {
      mockTemplateService.listTemplates.mockRejectedValueOnce(new Error('Service unavailable'));

      const res = await request(app).get('/api/project-templates');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // GET TEMPLATE DETAILS
  // ==========================================================================
  describe('GET /api/project-templates/:id', () => {
    it('should return template details', async () => {
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'web-app-fullstack',
        name: 'Full-Stack Web App',
        description: 'React + Fastify + Prisma',
        variables: ['PROJECT_NAME', 'PORT', 'API_PORT'],
        files: ['package.json', 'tsconfig.json', 'README.md'],
      });

      const res = await request(app).get('/api/project-templates/web-app-fullstack');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('web-app-fullstack');
      expect(res.body.variables).toContain('PROJECT_NAME');
    });

    it('should return 404 for non-existent template', async () => {
      mockTemplateService.getTemplate.mockRejectedValue(new Error('Template not found'));

      const res = await request(app).get('/api/project-templates/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // CREATE PROJECT
  // ==========================================================================
  describe('POST /api/project-templates/create', () => {
    it('should create project from template', async () => {
      mockTemplateService.createProject.mockResolvedValue({
        success: true,
        projectPath: '/home/user/Projects/my-new-project',
        filesCreated: 15,
      });

      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          templateId: 'web-app-fullstack',
          variables: {
            PROJECT_NAME: 'my-new-project',
            PORT: '3000',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.projectPath).toContain('my-new-project');
    });

    it('should reject missing templateId', async () => {
      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          variables: { PROJECT_NAME: 'test' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Template ID is required');
    });

    it('should reject missing project name', async () => {
      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          templateId: 'web-app-fullstack',
          variables: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Project name is required');
    });

    it('should validate project name format', async () => {
      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          templateId: 'web-app-fullstack',
          variables: { PROJECT_NAME: 'Invalid Name!' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lowercase');
    });

    it('should accept valid project names', async () => {
      mockTemplateService.createProject.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          templateId: 'web-app-fullstack',
          variables: { PROJECT_NAME: 'my-app-123' },
        });

      expect(res.status).toBe(201);
    });

    it('should return 409 for existing project', async () => {
      mockTemplateService.createProject.mockRejectedValue(new Error('Project already exists'));

      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          templateId: 'web-app-fullstack',
          variables: { PROJECT_NAME: 'existing-project' },
        });

      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent template', async () => {
      mockTemplateService.createProject.mockRejectedValue(new Error('Template not found'));

      const res = await request(app)
        .post('/api/project-templates/create')
        .send({
          templateId: 'nonexistent',
          variables: { PROJECT_NAME: 'my-project' },
        });

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // MIGRATE PROJECT
  // ==========================================================================
  describe('POST /api/project-templates/migrate', () => {
    it('should migrate existing project', async () => {
      mockTemplateService.migrateProject.mockResolvedValue({
        success: true,
        filesAdded: 5,
        filesUpdated: 2,
      });

      const res = await request(app)
        .post('/api/project-templates/migrate')
        .send({
          projectPath: '/home/user/Projects/old-project',
          options: { overwrite: false },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject missing projectPath', async () => {
      const res = await request(app)
        .post('/api/project-templates/migrate')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Project path is required');
    });
  });

  // ==========================================================================
  // CHECK COMPLIANCE
  // ==========================================================================
  describe('GET /api/project-templates/check/:project', () => {
    it('should check project compliance', async () => {
      mockTemplateService.checkCompliance.mockResolvedValue({
        compliant: true,
        score: 95,
        missing: ['CHANGELOG.md'],
        present: ['CLAUDE.md', 'package.json', 'tsconfig.json'],
      });

      const res = await request(app).get('/api/project-templates/check/my-project');

      expect(res.status).toBe(200);
      expect(res.body.compliant).toBe(true);
      expect(res.body.score).toBe(95);
    });
  });

  describe('POST /api/project-templates/check-path', () => {
    it('should check compliance for specific path', async () => {
      mockTemplateService.checkCompliance.mockResolvedValue({
        compliant: false,
        score: 60,
        missing: ['CLAUDE.md', 'Dockerfile'],
      });

      const res = await request(app)
        .post('/api/project-templates/check-path')
        .send({ projectPath: '/custom/path/to/project' });

      expect(res.status).toBe(200);
      expect(res.body.compliant).toBe(false);
    });

    it('should reject missing projectPath', async () => {
      const res = await request(app)
        .post('/api/project-templates/check-path')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Project path is required');
    });
  });

  // ==========================================================================
  // COMPLIANCE OVERVIEW
  // ==========================================================================
  describe('GET /api/project-templates/compliance/overview', () => {
    it('should return compliance overview for all projects', async () => {
      mockTemplateService.checkAllProjects.mockResolvedValue({
        total: 10,
        compliant: 7,
        nonCompliant: 3,
        averageScore: 82,
        projects: [
          { name: 'project-1', score: 100 },
          { name: 'project-2', score: 60 },
        ],
      });

      const res = await request(app).get('/api/project-templates/compliance/overview');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(10);
      expect(res.body.compliant).toBe(7);
      expect(res.body.averageScore).toBe(82);
    });
  });

  // ==========================================================================
  // COMPLIANCE CONFIG
  // ==========================================================================
  describe('GET /api/project-templates/compliance/config', () => {
    it('should return compliance configuration', async () => {
      mockTemplateService.getComplianceConfig.mockResolvedValue({
        weights: {
          'CLAUDE.md': 20,
          'package.json': 15,
          'tsconfig.json': 10,
          'Dockerfile': 10,
        },
        thresholds: {
          compliant: 80,
          warning: 60,
        },
      });

      const res = await request(app).get('/api/project-templates/compliance/config');

      expect(res.status).toBe(200);
      expect(res.body.weights['CLAUDE.md']).toBe(20);
      expect(res.body.thresholds.compliant).toBe(80);
    });
  });
});
