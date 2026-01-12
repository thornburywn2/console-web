/**
 * Global Search API Routes
 * Provides unified search across all entities
 */

import { Router } from 'express';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';

export function createSearchRouter(prisma, projectsDir) {
  const router = Router();

  /**
   * Global search across all entities
   */
  router.get('/', async (req, res) => {
    try {
      const { q, types, limit = 20 } = req.query;

      if (!q?.trim()) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const query = q.trim().toLowerCase();
      const searchLimit = parseInt(limit);
      const typeFilter = types ? types.split(',') : null;

      const results = {
        projects: [],
        sessions: [],
        prompts: [],
        snippets: [],
        workflows: [],
        files: []
      };

      // Search projects (filesystem + database)
      if (!typeFilter || typeFilter.includes('projects')) {
        try {
          const projectDirs = readdirSync(projectsDir).filter(name => {
            const fullPath = join(projectsDir, name);
            return statSync(fullPath).isDirectory() && !name.startsWith('.');
          });

          results.projects = projectDirs
            .filter(name => name.toLowerCase().includes(query))
            .slice(0, searchLimit)
            .map(name => ({
              type: 'project',
              id: name,
              name,
              path: join(projectsDir, name),
              match: 'name'
            }));

          // Also search project descriptions from database
          const dbProjects = await prisma.project.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { displayName: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
              ]
            },
            take: searchLimit
          });

          // Merge and dedupe
          dbProjects.forEach(p => {
            if (!results.projects.find(r => r.name === p.name)) {
              results.projects.push({
                type: 'project',
                id: p.name,
                name: p.name,
                path: p.path,
                displayName: p.displayName,
                description: p.description,
                match: p.description?.toLowerCase().includes(query) ? 'description' : 'name'
              });
            }
          });

          results.projects = results.projects.slice(0, searchLimit);
        } catch (error) {
          console.error('Error searching projects:', error);
        }
      }

      // Search sessions
      if (!typeFilter || typeFilter.includes('sessions')) {
        try {
          const sessions = await prisma.session.findMany({
            where: {
              OR: [
                { sessionName: { contains: query, mode: 'insensitive' } },
                { displayName: { contains: query, mode: 'insensitive' } }
              ]
            },
            include: {
              project: { select: { name: true, path: true } },
              tags: { include: { tag: true } },
              folder: { select: { name: true } }
            },
            take: searchLimit,
            orderBy: { lastActiveAt: 'desc' }
          });

          results.sessions = sessions.map(s => ({
            type: 'session',
            id: s.id,
            name: s.displayName || s.sessionName,
            sessionName: s.sessionName,
            projectName: s.project.name,
            projectPath: s.project.path,
            folder: s.folder?.name,
            tags: s.tags.map(t => t.tag.name),
            status: s.status,
            match: 'name'
          }));
        } catch (error) {
          console.error('Error searching sessions:', error);
        }
      }

      // Search prompts
      if (!typeFilter || typeFilter.includes('prompts')) {
        try {
          const prompts = await prisma.prompt.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
              ]
            },
            take: searchLimit,
            orderBy: { usageCount: 'desc' }
          });

          results.prompts = prompts.map(p => ({
            type: 'prompt',
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            isFavorite: p.isFavorite,
            preview: p.content.substring(0, 100),
            match: p.content.toLowerCase().includes(query) ? 'content' : 'name'
          }));
        } catch (error) {
          console.error('Error searching prompts:', error);
        }
      }

      // Search snippets
      if (!typeFilter || typeFilter.includes('snippets')) {
        try {
          const snippets = await prisma.commandSnippet.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { command: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
              ]
            },
            take: searchLimit,
            orderBy: { usageCount: 'desc' }
          });

          results.snippets = snippets.map(s => ({
            type: 'snippet',
            id: s.id,
            name: s.name,
            command: s.command,
            description: s.description,
            category: s.category,
            tags: s.tags,
            isFavorite: s.isFavorite,
            match: s.command.toLowerCase().includes(query) ? 'command' : 'name'
          }));
        } catch (error) {
          console.error('Error searching snippets:', error);
        }
      }

      // Search workflows
      if (!typeFilter || typeFilter.includes('workflows')) {
        try {
          const workflows = await prisma.workflow.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
              ]
            },
            take: searchLimit,
            orderBy: { runCount: 'desc' }
          });

          results.workflows = workflows.map(w => ({
            type: 'workflow',
            id: w.id,
            name: w.name,
            description: w.description,
            trigger: w.trigger,
            isActive: w.isActive,
            stepCount: Array.isArray(w.steps) ? w.steps.length : 0,
            match: 'name'
          }));
        } catch (error) {
          console.error('Error searching workflows:', error);
        }
      }

      // Search files (CLAUDE.md content)
      if (!typeFilter || typeFilter.includes('files')) {
        try {
          const projectDirs = readdirSync(projectsDir).filter(name => {
            const fullPath = join(projectsDir, name);
            return statSync(fullPath).isDirectory() && !name.startsWith('.');
          });

          for (const projectName of projectDirs.slice(0, 50)) {
            const claudeMdPath = join(projectsDir, projectName, 'CLAUDE.md');
            if (existsSync(claudeMdPath)) {
              try {
                const content = readFileSync(claudeMdPath, 'utf-8');
                if (content.toLowerCase().includes(query)) {
                  // Find matching line context
                  const lines = content.split('\n');
                  let matchContext = '';
                  for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(query)) {
                      matchContext = lines[i].substring(0, 150);
                      break;
                    }
                  }

                  results.files.push({
                    type: 'file',
                    id: `${projectName}/CLAUDE.md`,
                    name: 'CLAUDE.md',
                    projectName,
                    path: claudeMdPath,
                    context: matchContext,
                    match: 'content'
                  });

                  if (results.files.length >= searchLimit) break;
                }
              } catch {
                // Skip unreadable files
              }
            }
          }
        } catch (error) {
          console.error('Error searching files:', error);
        }
      }

      // Calculate total count
      const totalCount = Object.values(results).reduce(
        (sum, arr) => sum + arr.length, 0
      );

      res.json({
        query: q.trim(),
        totalCount,
        results
      });
    } catch (error) {
      console.error('Error in global search:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  /**
   * Get search suggestions/autocomplete
   */
  router.get('/suggestions', async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;

      if (!q?.trim() || q.length < 2) {
        return res.json({ suggestions: [] });
      }

      const query = q.trim().toLowerCase();
      const suggestions = new Set();

      // Project names
      try {
        const projectDirs = readdirSync(projectsDir)
          .filter(name => {
            const fullPath = join(projectsDir, name);
            return statSync(fullPath).isDirectory() &&
                   !name.startsWith('.') &&
                   name.toLowerCase().includes(query);
          })
          .slice(0, 5);

        projectDirs.forEach(name => suggestions.add(name));
      } catch {}

      // Prompt names
      try {
        const prompts = await prisma.prompt.findMany({
          where: { name: { contains: query, mode: 'insensitive' } },
          select: { name: true },
          take: 5
        });
        prompts.forEach(p => suggestions.add(p.name));
      } catch {}

      // Snippet names
      try {
        const snippets = await prisma.commandSnippet.findMany({
          where: { name: { contains: query, mode: 'insensitive' } },
          select: { name: true },
          take: 5
        });
        snippets.forEach(s => suggestions.add(s.name));
      } catch {}

      // Categories
      try {
        const categories = await prisma.prompt.groupBy({
          by: ['category'],
          where: { category: { contains: query, mode: 'insensitive' } }
        });
        categories.forEach(c => c.category && suggestions.add(c.category));
      } catch {}

      res.json({
        query: q.trim(),
        suggestions: Array.from(suggestions).slice(0, parseInt(limit))
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  });

  /**
   * Get recent searches (stored in user settings)
   */
  router.get('/recent', async (req, res) => {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { id: 'default' }
      });

      const recentSearches = settings?.expandedPanels?.recentSearches || [];

      res.json({ recentSearches });
    } catch (error) {
      console.error('Error getting recent searches:', error);
      res.status(500).json({ error: 'Failed to get recent searches' });
    }
  });

  /**
   * Save recent search
   */
  router.post('/recent', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query?.trim()) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const settings = await prisma.userSettings.findUnique({
        where: { id: 'default' }
      });

      const expandedPanels = settings?.expandedPanels || {};
      let recentSearches = expandedPanels.recentSearches || [];

      // Add to front, remove duplicates, limit to 10
      recentSearches = [
        query.trim(),
        ...recentSearches.filter(s => s !== query.trim())
      ].slice(0, 10);

      await prisma.userSettings.update({
        where: { id: 'default' },
        data: {
          expandedPanels: {
            ...expandedPanels,
            recentSearches
          }
        }
      });

      res.json({ recentSearches });
    } catch (error) {
      console.error('Error saving recent search:', error);
      res.status(500).json({ error: 'Failed to save recent search' });
    }
  });

  /**
   * Clear recent searches
   */
  router.delete('/recent', async (req, res) => {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { id: 'default' }
      });

      const expandedPanels = settings?.expandedPanels || {};

      await prisma.userSettings.update({
        where: { id: 'default' },
        data: {
          expandedPanels: {
            ...expandedPanels,
            recentSearches: []
          }
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing recent searches:', error);
      res.status(500).json({ error: 'Failed to clear recent searches' });
    }
  });

  return router;
}
