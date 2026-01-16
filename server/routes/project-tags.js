/**
 * Project Tags API Routes
 * Manages tagging and categorization for projects
 */

import { Router } from 'express';

export function createProjectTagsRouter(prisma) {
  const router = Router();

  // =============================================================================
  // PROJECT TAGS
  // =============================================================================

  /**
   * Get all project tags
   */
  router.get('/project-tags', async (req, res) => {
    try {
      const tags = await prisma.projectTag.findMany({
        include: {
          projects: {
            select: { projectId: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Add project count
      const tagsWithCount = tags.map(tag => ({
        ...tag,
        projectCount: tag.projects.length,
        _count: { projects: tag.projects.length }
      }));

      res.json(tagsWithCount);
    } catch (error) {
      console.error('Error fetching project tags:', error);
      res.status(500).json({ error: 'Failed to fetch project tags' });
    }
  });

  /**
   * Create a new project tag
   */
  router.post('/project-tags', async (req, res) => {
    try {
      const { name, color, description } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Tag name is required' });
      }

      if (!color) {
        return res.status(400).json({ error: 'Tag color is required' });
      }

      const tag = await prisma.projectTag.create({
        data: {
          name: name.trim(),
          color,
          description: description || null
        }
      });

      res.status(201).json(tag);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Tag name already exists' });
      }
      console.error('Error creating project tag:', error);
      res.status(500).json({ error: 'Failed to create project tag' });
    }
  });

  /**
   * Update a project tag
   */
  router.put('/project-tags/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;

      const tag = await prisma.projectTag.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(color !== undefined && { color }),
          ...(description !== undefined && { description })
        }
      });

      res.json(tag);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Tag name already exists' });
      }
      console.error('Error updating project tag:', error);
      res.status(500).json({ error: 'Failed to update project tag' });
    }
  });

  /**
   * Delete a project tag
   */
  router.delete('/project-tags/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.projectTag.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project tag:', error);
      res.status(500).json({ error: 'Failed to delete project tag' });
    }
  });

  // =============================================================================
  // PROJECT TAG ASSIGNMENTS
  // =============================================================================

  // Helper to find or create project by path
  async function getOrCreateProject(projectPath) {
    let project = await prisma.project.findUnique({
      where: { path: projectPath }
    });

    if (!project) {
      // Create project in database with name derived from path
      const name = projectPath.split('/').pop();
      project = await prisma.project.create({
        data: {
          name,
          path: projectPath
        }
      });
    }

    return project;
  }

  /**
   * Get tags for a specific project (by path, base64 encoded)
   */
  router.get('/projects/by-path/:encodedPath/tags', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const project = await getOrCreateProject(projectPath);

      const assignments = await prisma.projectTagAssignment.findMany({
        where: { projectId: project.id },
        include: {
          tag: true
        }
      });

      const tags = assignments.map(a => a.tag);
      res.json(tags);
    } catch (error) {
      console.error('Error fetching project tags:', error);
      res.status(500).json({ error: 'Failed to fetch project tags' });
    }
  });

  /**
   * Assign tag to project (by path, base64 encoded)
   */
  router.post('/projects/by-path/:encodedPath/tags/:tagId', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const { tagId } = req.params;

      const project = await getOrCreateProject(projectPath);

      const assignment = await prisma.projectTagAssignment.create({
        data: { projectId: project.id, tagId },
        include: { tag: true }
      });

      res.status(201).json(assignment);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Tag already assigned to project' });
      }
      console.error('Error assigning tag to project:', error);
      res.status(500).json({ error: 'Failed to assign tag to project' });
    }
  });

  /**
   * Remove tag from project (by path, base64 encoded)
   */
  router.delete('/projects/by-path/:encodedPath/tags/:tagId', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const { tagId } = req.params;

      const project = await prisma.project.findUnique({
        where: { path: projectPath }
      });

      if (project) {
        await prisma.projectTagAssignment.deleteMany({
          where: { projectId: project.id, tagId }
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing tag from project:', error);
      res.status(500).json({ error: 'Failed to remove tag from project' });
    }
  });

  /**
   * Set all tags for a project (replace existing)
   */
  router.put('/projects/:projectId/tags', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { tagIds } = req.body;

      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ error: 'tagIds must be an array' });
      }

      // Delete existing assignments
      await prisma.projectTagAssignment.deleteMany({
        where: { projectId }
      });

      // Create new assignments
      if (tagIds.length > 0) {
        await prisma.projectTagAssignment.createMany({
          data: tagIds.map(tagId => ({ projectId, tagId }))
        });
      }

      // Fetch updated tags
      const assignments = await prisma.projectTagAssignment.findMany({
        where: { projectId },
        include: { tag: true }
      });

      const tags = assignments.map(a => a.tag);
      res.json(tags);
    } catch (error) {
      console.error('Error setting project tags:', error);
      res.status(500).json({ error: 'Failed to set project tags' });
    }
  });

  // =============================================================================
  // PROJECT SETTINGS (skipPermissions, priority)
  // =============================================================================

  /**
   * Get project settings (by path, base64 encoded)
   */
  router.get('/projects/by-path/:encodedPath/settings', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const project = await getOrCreateProject(projectPath);

      res.json({
        skipPermissions: project.skipPermissions || false,
        priority: project.priority || null,
        favorited: project.favorited || false,
        description: project.description || null,
      });
    } catch (error) {
      console.error('Error fetching project settings:', error);
      res.status(500).json({ error: 'Failed to fetch project settings' });
    }
  });

  /**
   * Update project settings (by path, base64 encoded)
   */
  router.patch('/projects/by-path/:encodedPath/settings', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const { skipPermissions, priority, favorited, description } = req.body;

      const project = await getOrCreateProject(projectPath);

      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          ...(skipPermissions !== undefined && { skipPermissions: Boolean(skipPermissions) }),
          ...(priority !== undefined && { priority: priority || null }),
          ...(favorited !== undefined && { favorited: Boolean(favorited) }),
          ...(description !== undefined && { description: description || null }),
        }
      });

      res.json({
        skipPermissions: updatedProject.skipPermissions,
        priority: updatedProject.priority,
        favorited: updatedProject.favorited,
        description: updatedProject.description,
      });
    } catch (error) {
      console.error('Error updating project settings:', error);
      res.status(500).json({ error: 'Failed to update project settings' });
    }
  });

  // =============================================================================
  // PROJECT NOTES
  // =============================================================================

  /**
   * Get all notes for a project (by path, base64 encoded)
   */
  router.get('/projects/by-path/:encodedPath/notes', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const project = await getOrCreateProject(projectPath);

      const notes = await prisma.projectNote.findMany({
        where: { projectId: project.id },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json(notes);
    } catch (error) {
      console.error('Error fetching project notes:', error);
      res.status(500).json({ error: 'Failed to fetch project notes' });
    }
  });

  /**
   * Create a note for a project (by path, base64 encoded)
   */
  router.post('/projects/by-path/:encodedPath/notes', async (req, res) => {
    try {
      const projectPath = Buffer.from(req.params.encodedPath, 'base64').toString('utf-8');
      const { title, content, isPinned } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      const project = await getOrCreateProject(projectPath);

      const note = await prisma.projectNote.create({
        data: {
          projectId: project.id,
          title: title?.trim() || null,
          content: content.trim(),
          isPinned: Boolean(isPinned),
        }
      });

      res.status(201).json(note);
    } catch (error) {
      console.error('Error creating project note:', error);
      res.status(500).json({ error: 'Failed to create project note' });
    }
  });

  /**
   * Update a project note
   */
  router.put('/projects/notes/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      const { title, content, isPinned } = req.body;

      const note = await prisma.projectNote.update({
        where: { id: noteId },
        data: {
          ...(title !== undefined && { title: title?.trim() || null }),
          ...(content !== undefined && { content: content.trim() }),
          ...(isPinned !== undefined && { isPinned: Boolean(isPinned) }),
        }
      });

      res.json(note);
    } catch (error) {
      console.error('Error updating project note:', error);
      res.status(500).json({ error: 'Failed to update project note' });
    }
  });

  /**
   * Delete a project note
   */
  router.delete('/projects/notes/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      await prisma.projectNote.delete({ where: { id: noteId } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project note:', error);
      res.status(500).json({ error: 'Failed to delete project note' });
    }
  });

  return router;
}
