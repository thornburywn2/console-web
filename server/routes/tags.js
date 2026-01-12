/**
 * Session Tags API Routes
 * Manage tags for organizing and filtering sessions
 */

import { Router } from 'express';

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
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  // POST /api/tags - Create a new tag
  router.post('/', async (req, res) => {
    try {
      const { name, color, description } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Tag name is required' });
      }

      if (!color) {
        return res.status(400).json({ error: 'Tag color is required' });
      }

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
      console.error('Error creating tag:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A tag with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to create tag' });
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
      console.error('Error fetching tag:', error);
      res.status(500).json({ error: 'Failed to fetch tag' });
    }
  });

  // PATCH /api/tags/:id - Update a tag
  router.patch('/:id', async (req, res) => {
    try {
      const { name, color, description } = req.body;

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
      console.error('Error updating tag:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Tag not found' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A tag with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to update tag' });
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
      console.error('Error deleting tag:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Tag not found' });
      }
      res.status(500).json({ error: 'Failed to delete tag' });
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
      console.error('Error fetching sessions for tag:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  return router;
}
