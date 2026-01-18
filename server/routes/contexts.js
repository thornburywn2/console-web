/**
 * Project Context Routes
 * Manages files and snippets in AI context per project
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('contexts');

export function createContextsRouter(prisma) {
  const router = Router();

  /**
   * GET /api/projects/:projectName/contexts
   * Get context items for a project
   */
  router.get('/projects/:projectName/contexts', async (req, res) => {
    try {
      const { projectName } = req.params;

      // Find or create project context
      const projectContext = await prisma.projectContext.findUnique({
        where: { projectId: projectName }
      });

      if (!projectContext) {
        // Return empty array if no context exists yet
        return res.json([]);
      }

      // Transform files array into context items format
      const contexts = projectContext.files.map((file, index) => ({
        id: `${projectName}-${index}`,
        type: 'file',
        value: file,
        label: file.split('/').pop() || file,
        addedAt: projectContext.updatedAt
      }));

      res.json(contexts);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch contexts',
        operation: 'fetch contexts',
        requestId: req.id,
        context: { projectName: req.params.projectName }
      });
    }
  });

  /**
   * POST /api/projects/:projectName/contexts
   * Add a context item to a project
   */
  router.post('/projects/:projectName/contexts', async (req, res) => {
    try {
      const { projectName } = req.params;
      const { type, value, label } = req.body;

      if (!value) {
        return res.status(400).json({ error: 'Value is required' });
      }

      // Upsert project context
      const projectContext = await prisma.projectContext.upsert({
        where: { projectId: projectName },
        update: {
          files: {
            push: value
          }
        },
        create: {
          projectId: projectName,
          files: [value]
        }
      });

      // Return the new context item
      const newContext = {
        id: `${projectName}-${projectContext.files.length - 1}`,
        type: type || 'file',
        value,
        label: label || value.split('/').pop() || value,
        addedAt: new Date()
      };

      res.status(201).json(newContext);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add context',
        operation: 'add context',
        requestId: req.id,
        context: { projectName: req.params.projectName }
      });
    }
  });

  /**
   * DELETE /api/projects/:projectName/contexts/:contextId
   * Remove a context item from a project
   */
  router.delete('/projects/:projectName/contexts/:contextId', async (req, res) => {
    try {
      const { projectName, contextId } = req.params;

      // Get current context
      const projectContext = await prisma.projectContext.findUnique({
        where: { projectId: projectName }
      });

      if (!projectContext) {
        return res.status(404).json({ error: 'Context not found' });
      }

      // Parse the index from contextId (format: projectName-index)
      const indexStr = contextId.split('-').pop();
      const index = parseInt(indexStr, 10);

      if (isNaN(index) || index < 0 || index >= projectContext.files.length) {
        return res.status(400).json({ error: 'Invalid context ID' });
      }

      // Remove the file at the specified index
      const newFiles = [...projectContext.files];
      newFiles.splice(index, 1);

      // Update the context
      await prisma.projectContext.update({
        where: { projectId: projectName },
        data: { files: newFiles }
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to remove context',
        operation: 'remove context',
        requestId: req.id,
        context: { projectName: req.params.projectName, contextId: req.params.contextId }
      });
    }
  });

  /**
   * PUT /api/projects/:projectName/contexts/reorder
   * Reorder context items
   */
  router.put('/projects/:projectName/contexts/reorder', async (req, res) => {
    try {
      const { projectName } = req.params;
      const { files } = req.body;

      if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      await prisma.projectContext.upsert({
        where: { projectId: projectName },
        update: { files },
        create: { projectId: projectName, files }
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to reorder contexts',
        operation: 'reorder contexts',
        requestId: req.id,
        context: { projectName: req.params.projectName }
      });
    }
  });

  return router;
}
