/**
 * Session Templates API Routes
 * Manages session templates for quick setup
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import { templateSchema, templateUpdateSchema } from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('templates');

// Default built-in templates
const BUILT_IN_TEMPLATES = [
  {
    name: 'Default',
    description: 'Standard Claude Code session',
    icon: '💻',
    commands: ['claude'],
    isBuiltIn: true
  },
  {
    name: 'Git Workflow',
    description: 'Start with git status',
    icon: '🔀',
    commands: ['git status', 'claude'],
    isBuiltIn: true
  },
  {
    name: 'Docker Debug',
    description: 'Check Docker containers first',
    icon: '🐳',
    commands: ['docker ps', 'claude'],
    isBuiltIn: true
  },
  {
    name: 'Test Runner',
    description: 'Run tests before Claude',
    icon: '🧪',
    commands: ['npm test', 'claude'],
    isBuiltIn: true
  },
  {
    name: 'Build Check',
    description: 'Build project before Claude',
    icon: '🏗️',
    commands: ['npm run build', 'claude'],
    isBuiltIn: true
  },
  {
    name: 'Clean Start',
    description: 'Clean build then Claude',
    icon: '🧹',
    commands: ['rm -rf node_modules dist', 'npm install', 'claude'],
    isBuiltIn: true
  }
];

export function createTemplatesRouter(prisma) {
  const router = Router();

  /**
   * Initialize built-in templates in database
   */
  async function initializeBuiltInTemplates() {
    try {
      for (const template of BUILT_IN_TEMPLATES) {
        const existing = await prisma.sessionTemplate.findFirst({
          where: {
            name: template.name,
            isBuiltIn: true
          }
        });

        if (!existing) {
          await prisma.sessionTemplate.create({
            data: template
          });
        }
      }
    } catch (error) {
      log.error({ error: error.message }, 'failed to initialize built-in templates');
    }
  }

  // Initialize templates on router creation
  initializeBuiltInTemplates();

  /**
   * Get all templates
   */
  router.get('/', async (req, res) => {
    try {
      const templates = await prisma.sessionTemplate.findMany({
        orderBy: [
          { isBuiltIn: 'desc' },
          { usageCount: 'desc' },
          { name: 'asc' }
        ]
      });
      res.json(templates);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to fetch templates', operation: 'fetch templates', requestId: req.id });
    }
  });

  /**
   * Get a single template by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const template = await prisma.sessionTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to fetch template', operation: 'fetch template', requestId: req.id });
    }
  });

  /**
   * Create a new template
   */
  router.post('/', validateBody(templateSchema), async (req, res) => {
    try {
      const { name, description, icon, commands, environment, workingDir } = req.validatedBody;

      const template = await prisma.sessionTemplate.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          icon: icon || null,
          commands,
          environment: environment || null,
          workingDir: workingDir?.trim() || null,
          isBuiltIn: false
        }
      });

      res.status(201).json(template);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to create template', operation: 'create template', requestId: req.id });
    }
  });

  /**
   * Update a template
   */
  router.put('/:id', validateBody(templateUpdateSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, commands, environment, workingDir } = req.validatedBody;

      // Check if template exists and is not built-in
      const existing = await prisma.sessionTemplate.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (existing.isBuiltIn) {
        return res.status(403).json({ error: 'Cannot modify built-in templates' });
      }

      const template = await prisma.sessionTemplate.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(icon !== undefined && { icon }),
          ...(commands !== undefined && { commands }),
          ...(environment !== undefined && { environment }),
          ...(workingDir !== undefined && { workingDir: workingDir?.trim() || null })
        }
      });

      res.json(template);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to update template', operation: 'update template', requestId: req.id });
    }
  });

  /**
   * Delete a template
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if template exists and is not built-in
      const existing = await prisma.sessionTemplate.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (existing.isBuiltIn) {
        return res.status(403).json({ error: 'Cannot delete built-in templates' });
      }

      await prisma.sessionTemplate.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to delete template', operation: 'delete template', requestId: req.id });
    }
  });

  /**
   * Use a template (track usage, return commands)
   */
  router.post('/:id/use', async (req, res) => {
    try {
      const { id } = req.params;

      const template = await prisma.sessionTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Update usage count
      await prisma.sessionTemplate.update({
        where: { id },
        data: { usageCount: { increment: 1 } }
      });

      res.json({
        commands: template.commands,
        environment: template.environment,
        workingDir: template.workingDir,
        templateId: id,
        templateName: template.name
      });
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to use template', operation: 'use template', requestId: req.id });
    }
  });

  /**
   * Duplicate a template for customization
   */
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;

      const original = await prisma.sessionTemplate.findUnique({
        where: { id }
      });

      if (!original) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const duplicate = await prisma.sessionTemplate.create({
        data: {
          name: `${original.name} (Custom)`,
          description: original.description,
          icon: original.icon,
          commands: original.commands,
          environment: original.environment,
          workingDir: original.workingDir,
          isBuiltIn: false,
          usageCount: 0
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      return sendSafeError(res, error, { userMessage: 'Failed to duplicate template', operation: 'duplicate template', requestId: req.id });
    }
  });

  return router;
}
