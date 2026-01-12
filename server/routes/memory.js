/**
 * Memory Banks API Routes
 * Layered context persistence (Session, Project, Global)
 */

import { Router } from 'express';

export function createMemoryRouter(prisma) {
  const router = Router();

  // =============================================================================
  // MEMORY CRUD
  // =============================================================================

  /**
   * Get all memories with filtering
   */
  router.get('/', async (req, res) => {
    try {
      const {
        scope,
        projectId,
        sessionId,
        type,
        category,
        pinned,
        archived = 'false',
        search,
        limit = 100,
        offset = 0
      } = req.query;

      const where = {};

      // Filter by scope
      if (scope) {
        where.scope = scope.toUpperCase();
      }

      // Filter by project
      if (projectId) {
        where.projectId = projectId;
      }

      // Filter by session
      if (sessionId) {
        where.sessionId = sessionId;
      }

      // Filter by type
      if (type) {
        where.type = type.toUpperCase();
      }

      // Filter by category
      if (category) {
        where.category = category;
      }

      // Filter by pinned
      if (pinned !== undefined) {
        where.pinned = pinned === 'true';
      }

      // Filter archived
      if (archived !== 'true') {
        where.archived = false;
      }

      // Text search
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ];
      }

      const [memories, total] = await Promise.all([
        prisma.memoryBank.findMany({
          where,
          orderBy: [
            { pinned: 'desc' },
            { importance: 'desc' },
            { updatedAt: 'desc' }
          ],
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.memoryBank.count({ where })
      ]);

      res.json({
        memories,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error fetching memories:', error);
      res.status(500).json({ error: 'Failed to fetch memories' });
    }
  });

  /**
   * Get memories by scope with hierarchy
   * Returns SESSION -> PROJECT -> GLOBAL memories for a context
   */
  router.get('/context', async (req, res) => {
    try {
      const { projectId, sessionId } = req.query;

      // Build queries for each scope
      const queries = [];

      // Session memories (most specific)
      if (sessionId) {
        queries.push(prisma.memoryBank.findMany({
          where: { scope: 'SESSION', sessionId, archived: false }
        }));
      }

      // Project memories
      if (projectId) {
        queries.push(prisma.memoryBank.findMany({
          where: { scope: 'PROJECT', projectId, archived: false }
        }));
      }

      // Global memories (always included)
      queries.push(prisma.memoryBank.findMany({
        where: { scope: 'GLOBAL', archived: false }
      }));

      const results = await Promise.all(queries);

      // Flatten and organize by scope
      const context = {
        session: sessionId ? results[0] : [],
        project: projectId ? (sessionId ? results[1] : results[0]) : [],
        global: results[results.length - 1] || [],
        merged: [] // All memories merged by importance
      };

      // Merge all memories sorted by importance
      context.merged = [
        ...context.session,
        ...context.project,
        ...context.global
      ].sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return b.importance - a.importance;
      });

      res.json(context);
    } catch (error) {
      console.error('Error fetching context:', error);
      res.status(500).json({ error: 'Failed to fetch context' });
    }
  });

  /**
   * Get a single memory
   */
  router.get('/:id', async (req, res) => {
    try {
      const memory = await prisma.memoryBank.findUnique({
        where: { id: req.params.id }
      });

      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      // Increment usage count
      await prisma.memoryBank.update({
        where: { id: req.params.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      });

      res.json(memory);
    } catch (error) {
      console.error('Error fetching memory:', error);
      res.status(500).json({ error: 'Failed to fetch memory' });
    }
  });

  /**
   * Create a new memory
   */
  router.post('/', async (req, res) => {
    try {
      const {
        scope = 'PROJECT',
        projectId,
        sessionId,
        title,
        content,
        type = 'CONTEXT',
        importance = 5,
        tags = [],
        category,
        source,
        sourceRef,
        expiresAt,
        pinned = false
      } = req.body;

      // Validation
      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Validate scope requirements
      if (scope === 'PROJECT' && !projectId) {
        return res.status(400).json({ error: 'projectId required for PROJECT scope' });
      }

      if (scope === 'SESSION' && !sessionId) {
        return res.status(400).json({ error: 'sessionId required for SESSION scope' });
      }

      const memory = await prisma.memoryBank.create({
        data: {
          scope,
          projectId: scope === 'PROJECT' || scope === 'SESSION' ? projectId : null,
          sessionId: scope === 'SESSION' ? sessionId : null,
          title: title.trim(),
          content: content.trim(),
          type,
          importance: Math.max(1, Math.min(10, importance)),
          tags,
          category,
          source,
          sourceRef,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          pinned
        }
      });

      res.status(201).json(memory);
    } catch (error) {
      console.error('Error creating memory:', error);
      res.status(500).json({ error: 'Failed to create memory' });
    }
  });

  /**
   * Update a memory
   */
  router.put('/:id', async (req, res) => {
    try {
      const {
        title,
        content,
        type,
        importance,
        tags,
        category,
        source,
        sourceRef,
        expiresAt,
        pinned,
        archived
      } = req.body;

      const existing = await prisma.memoryBank.findUnique({
        where: { id: req.params.id }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (content !== undefined) updateData.content = content.trim();
      if (type !== undefined) updateData.type = type;
      if (importance !== undefined) updateData.importance = Math.max(1, Math.min(10, importance));
      if (tags !== undefined) updateData.tags = tags;
      if (category !== undefined) updateData.category = category;
      if (source !== undefined) updateData.source = source;
      if (sourceRef !== undefined) updateData.sourceRef = sourceRef;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (pinned !== undefined) updateData.pinned = pinned;
      if (archived !== undefined) updateData.archived = archived;

      const memory = await prisma.memoryBank.update({
        where: { id: req.params.id },
        data: updateData
      });

      res.json(memory);
    } catch (error) {
      console.error('Error updating memory:', error);
      res.status(500).json({ error: 'Failed to update memory' });
    }
  });

  /**
   * Delete a memory
   */
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.memoryBank.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true, id: req.params.id });
    } catch (error) {
      console.error('Error deleting memory:', error);
      res.status(500).json({ error: 'Failed to delete memory' });
    }
  });

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  /**
   * Bulk create memories
   */
  router.post('/bulk', async (req, res) => {
    try {
      const { memories } = req.body;

      if (!Array.isArray(memories) || memories.length === 0) {
        return res.status(400).json({ error: 'memories array is required' });
      }

      const created = await prisma.memoryBank.createMany({
        data: memories.map(m => ({
          scope: m.scope || 'PROJECT',
          projectId: m.projectId,
          sessionId: m.sessionId,
          title: m.title,
          content: m.content,
          type: m.type || 'CONTEXT',
          importance: m.importance || 5,
          tags: m.tags || [],
          category: m.category,
          source: m.source,
          sourceRef: m.sourceRef
        }))
      });

      res.status(201).json({ created: created.count });
    } catch (error) {
      console.error('Error bulk creating memories:', error);
      res.status(500).json({ error: 'Failed to bulk create memories' });
    }
  });

  /**
   * Cleanup expired and session memories
   */
  router.post('/cleanup', async (req, res) => {
    try {
      const { sessionId } = req.body;

      // Delete expired memories
      const expiredResult = await prisma.memoryBank.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      // Delete session memories if session ended
      let sessionResult = { count: 0 };
      if (sessionId) {
        sessionResult = await prisma.memoryBank.deleteMany({
          where: { sessionId }
        });
      }

      res.json({
        success: true,
        deleted: {
          expired: expiredResult.count,
          session: sessionResult.count
        }
      });
    } catch (error) {
      console.error('Error cleaning up memories:', error);
      res.status(500).json({ error: 'Failed to cleanup memories' });
    }
  });

  // =============================================================================
  // STATISTICS
  // =============================================================================

  /**
   * Get memory statistics
   */
  router.get('/stats/overview', async (req, res) => {
    try {
      const { projectId } = req.query;

      const where = projectId ? { OR: [{ projectId }, { scope: 'GLOBAL' }] } : {};

      const [total, byScope, byType, pinned, recentlyUsed] = await Promise.all([
        prisma.memoryBank.count({ where }),
        prisma.memoryBank.groupBy({
          by: ['scope'],
          where,
          _count: { id: true }
        }),
        prisma.memoryBank.groupBy({
          by: ['type'],
          where,
          _count: { id: true }
        }),
        prisma.memoryBank.count({ where: { ...where, pinned: true } }),
        prisma.memoryBank.count({
          where: {
            ...where,
            lastUsedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      res.json({
        total,
        byScope: byScope.reduce((acc, s) => ({ ...acc, [s.scope]: s._count.id }), {}),
        byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count.id }), {}),
        pinned,
        recentlyUsed
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  /**
   * Get all unique categories
   */
  router.get('/meta/categories', async (req, res) => {
    try {
      const categories = await prisma.memoryBank.findMany({
        where: { category: { not: null } },
        distinct: ['category'],
        select: { category: true }
      });

      res.json(categories.map(c => c.category).filter(Boolean));
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  /**
   * Get available types
   */
  router.get('/meta/types', (req, res) => {
    res.json([
      { value: 'FACT', label: 'Fact', description: 'Factual information' },
      { value: 'INSTRUCTION', label: 'Instruction', description: 'How to do something' },
      { value: 'CONTEXT', label: 'Context', description: 'Background context' },
      { value: 'DECISION', label: 'Decision', description: 'Past decisions' },
      { value: 'LEARNING', label: 'Learning', description: 'Learned patterns' },
      { value: 'TODO', label: 'Todo', description: 'Pending items' },
      { value: 'WARNING', label: 'Warning', description: 'Things to avoid' }
    ]);
  });

  return router;
}

export default createMemoryRouter;
