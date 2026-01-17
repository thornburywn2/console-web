/**
 * Session Tags API Routes
 * Manage tags for organizing and filtering sessions
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import { tagSchema, tagUpdateSchema } from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('tags');

export function createTagsRouter(prisma) {
  const router = Router();

  // GET /api/tags - List all tags with session counts
  router.get('/', async (req, res) => {
    try {
      const tags = await prisma.sessionTag.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { sessions: true }
          }
        }
      });

      res.json(tags);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch tags',
        operation: 'fetch tags',
        requestId: req.id,
      });
    }
  });

  // POST /api/tags - Create a new tag
  router.post('/', validateBody(tagSchema), async (req, res) => {
    try {
      const { name, color, description } = req.validatedBody;

      const tag = await prisma.sessionTag.create({
        data: {
          name: name.trim(),
          color,
          description: description?.trim() || null
        },
        include: {
          _count: {
            select: { sessions: true }
          }
        }
      });

      res.status(201).json(tag);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A tag with this name already exists' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to create tag',
        operation: 'create tag',
        requestId: req.id,
      });
    }
  });

  // GET /api/tags/:id - Get a single tag
  router.get('/:id', async (req, res) => {
    try {
      const tag = await prisma.sessionTag.findUnique({
        where: { id: req.params.id },
        include: {
          sessions: {
            include: {
              session: {
                select: {
                  id: true,
                  sessionName: true,
                  displayName: true,
                  status: true,
                  project: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: { sessions: true }
          }
        }
      });

      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      res.json(tag);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch tag',
        operation: 'fetch tag',
        requestId: req.id,
        context: { tagId: req.params.id },
      });
    }
  });

  // PATCH /api/tags/:id - Update a tag
  router.patch('/:id', validateBody(tagUpdateSchema), async (req, res) => {
    try {
      const { name, color, description } = req.validatedBody;

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (color !== undefined) updateData.color = color;
      if (description !== undefined) updateData.description = description?.trim() || null;

      const tag = await prisma.sessionTag.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          _count: {
            select: { sessions: true }
          }
        }
      });

      res.json(tag);
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Tag not found' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A tag with this name already exists' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to update tag',
        operation: 'update tag',
        requestId: req.id,
        context: { tagId: req.params.id },
      });
    }
  });

  // DELETE /api/tags/:id - Delete a tag
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.sessionTag.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Tag not found' });
      }
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete tag',
        operation: 'delete tag',
        requestId: req.id,
        context: { tagId: req.params.id },
      });
    }
  });

  // GET /api/tags/:id/sessions - Get all sessions with this tag
  router.get('/:id/sessions', async (req, res) => {
    try {
      const assignments = await prisma.sessionTagAssignment.findMany({
        where: { tagId: req.params.id },
        include: {
          session: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  path: true
                }
              },
              folder: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true
                }
              }
            }
          }
        }
      });

      const sessions = assignments.map(a => a.session);
      res.json(sessions);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch sessions',
        operation: 'fetch sessions for tag',
        requestId: req.id,
        context: { tagId: req.params.id },
      });
    }
  });

  return router;
}
