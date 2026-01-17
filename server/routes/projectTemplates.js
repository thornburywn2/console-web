/**
 * Project Templates API Routes
 * Manages project templates for creating new projects with standardized configurations
 */

import { Router } from 'express';
import { getTemplateService } from '../services/templateService.js';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('project-templates');

export function createProjectTemplatesRouter() {
  const router = Router();
  const templateService = getTemplateService();

  /**
   * GET /api/project-templates
   * List all available project templates
   */
  router.get('/', async (req, res) => {
    try {
      const templates = await templateService.listTemplates();
      res.json({ templates });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to list templates');
      return sendSafeError(res, error, {
        userMessage: 'Failed to list templates',
        operation: 'list templates',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/project-templates/:id
   * Get template details and required variables
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const template = await templateService.getTemplate(id);
      res.json(template);
    } catch (error) {
      log.error({ error: error.message, templateId: req.params.id, requestId: req.id }, 'failed to get template');
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to get template',
        operation: 'get template',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/project-templates/create
   * Create a new project from template
   */
  router.post('/create', async (req, res) => {
    try {
      const { templateId, variables, options } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      if (!variables?.PROJECT_NAME) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      // Validate project name format
      const namePattern = /^[a-z][a-z0-9-]*$/;
      if (!namePattern.test(variables.PROJECT_NAME)) {
        return res.status(400).json({
          error: 'Project name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens'
        });
      }

      const result = await templateService.createProject(templateId, variables, options || {});
      res.status(201).json(result);
    } catch (error) {
      log.error({ error: error.message, templateId: req.body.templateId, projectName: req.body.variables?.PROJECT_NAME, requestId: req.id }, 'failed to create project');
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to create project',
        operation: 'create project',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/project-templates/migrate
   * Migrate an existing project to use enforcement files
   */
  router.post('/migrate', async (req, res) => {
    try {
      const { projectPath, options } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'Project path is required' });
      }

      const result = await templateService.migrateProject(projectPath, options || {});
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, projectPath: req.body.projectPath, requestId: req.id }, 'failed to migrate project');
      return sendSafeError(res, error, {
        userMessage: 'Failed to migrate project',
        operation: 'migrate project',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/project-templates/check/:project
   * Check which template files are missing from a project
   */
  router.get('/check/:project', async (req, res) => {
    try {
      const { project } = req.params;
      const projectsDir = process.env.PROJECTS_DIR || `${process.env.HOME}/Projects`;
      const projectPath = `${projectsDir}/${project}`;

      const result = await templateService.checkCompliance(projectPath);
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, project: req.params.project || req.body.projectPath, requestId: req.id }, 'failed to check compliance');
      return sendSafeError(res, error, {
        userMessage: 'Failed to check compliance',
        operation: 'check compliance',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/project-templates/compliance
   * Get compliance overview for all projects
   */
  router.get('/compliance/overview', async (req, res) => {
    try {
      const result = await templateService.checkAllProjects();
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get compliance overview');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get compliance overview',
        operation: 'get compliance overview',
        requestId: req.id,
      });
    }
  });

  /**
   * GET /api/project-templates/compliance/config
   * Get compliance weights and thresholds
   */
  router.get('/compliance/config', async (req, res) => {
    try {
      const config = await templateService.getComplianceConfig();
      res.json(config);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get compliance config');
      return sendSafeError(res, error, {
        userMessage: 'Failed to get compliance config',
        operation: 'get compliance config',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/project-templates/check-path
   * Check compliance for a specific project path
   */
  router.post('/check-path', async (req, res) => {
    try {
      const { projectPath } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'Project path is required' });
      }

      const result = await templateService.checkCompliance(projectPath);
      res.json(result);
    } catch (error) {
      log.error({ error: error.message, project: req.params.project || req.body.projectPath, requestId: req.id }, 'failed to check compliance');
      return sendSafeError(res, error, {
        userMessage: 'Failed to check compliance',
        operation: 'check compliance path',
        requestId: req.id,
      });
    }
  });

  return router;
}

export default createProjectTemplatesRouter;
