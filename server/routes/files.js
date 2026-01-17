/**
 * Files API Routes
 * File browser, preview, and log viewing endpoints
 * SECURITY: Uses path validation to prevent path traversal attacks
 */

import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createLogger, logSecurityEvent } from '../services/logger.js';
import { validateAndResolvePath, validatePathMiddleware } from '../utils/pathSecurity.js';

const log = createLogger('files');

export function createFilesRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME || '/home', 'Projects');

  // Get file type category
  const getFileType = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const categories = {
      code: ['js', 'jsx', 'ts', 'tsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'rb', 'php'],
      config: ['json', 'yaml', 'yml', 'toml', 'xml', 'env', 'ini', 'conf'],
      doc: ['md', 'txt', 'rst', 'adoc'],
      style: ['css', 'scss', 'sass', 'less'],
      image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'],
      data: ['sql', 'csv', 'tsv'],
    };

    for (const [type, exts] of Object.entries(categories)) {
      if (exts.includes(ext)) return type;
    }
    return 'other';
  };

  // List files in directory (tree structure)
  // SECURITY: Validates path stays within PROJECTS_DIR
  router.get('/:projectPath(*)', validatePathMiddleware, async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const fullPath = validateAndResolvePath(projectPath, [PROJECTS_DIR]);

      if (!fullPath) {
        logSecurityEvent({
          event: 'file_list_path_traversal_blocked',
          projectPath,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Invalid path' });
      }

      const buildTree = async (dirPath, depth = 0, maxDepth = 10) => {
        if (depth > maxDepth) return [];

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = [];

        // Sort: directories first, then alphabetically
        entries.sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

        for (const entry of entries) {
          // Skip hidden files and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          const entryPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(PROJECTS_DIR, entryPath);

          const file = {
            name: entry.name,
            path: relativePath,
            isDirectory: entry.isDirectory(),
          };

          if (entry.isDirectory()) {
            file.children = await buildTree(entryPath, depth + 1, maxDepth);
          } else {
            try {
              const stats = await fs.stat(entryPath);
              file.size = stats.size;
              file.modified = stats.mtime.toISOString();
              file.type = getFileType(entry.name);
            } catch (e) {
              // File might have been deleted
            }
          }

          files.push(file);
        }

        return files;
      };

      const tree = await buildTree(fullPath);
      res.json(tree);
    } catch (error) {
      log.error({ error: error.message, projectPath: req.params.projectPath, requestId: req.id }, 'failed to list files');
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  // Get file content
  // SECURITY: Validates path stays within PROJECTS_DIR
  router.get('/:filePath(*)/content', validatePathMiddleware, async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.filePath);
      const fullPath = validateAndResolvePath(filePath, [PROJECTS_DIR]);

      if (!fullPath) {
        logSecurityEvent({
          event: 'file_read_path_traversal_blocked',
          filePath,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Invalid path' });
      }

      const stats = await fs.stat(fullPath);

      // Check file size limit (5MB)
      if (stats.size > 5 * 1024 * 1024) {
        return res.status(413).json({ error: 'File too large' });
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      res.type('text/plain').send(content);
    } catch (error) {
      log.error({ error: error.message, filePath: req.params.filePath, requestId: req.id }, 'failed to read file');
      res.status(404).json({ error: 'File not found' });
    }
  });

  return router;
}

// Logs router
export function createLogsRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME || '/home', 'Projects');

  // Tail log file
  // SECURITY: Validates path stays within PROJECTS_DIR
  router.get('/:logPath(*)', validatePathMiddleware, async (req, res) => {
    try {
      const logPath = decodeURIComponent(req.params.logPath);
      const lines = parseInt(req.query.lines) || 500;

      const fullPath = validateAndResolvePath(logPath, [PROJECTS_DIR]);

      if (!fullPath) {
        logSecurityEvent({
          event: 'log_read_path_traversal_blocked',
          logPath,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Invalid path', lines: [] });
      }

      // Check if file exists
      await fs.access(fullPath);

      // Use tail command for efficiency
      const result = await new Promise((resolve, reject) => {
        const tail = spawn('tail', ['-n', String(lines), fullPath]);
        let output = '';
        let error = '';

        tail.stdout.on('data', (data) => { output += data; });
        tail.stderr.on('data', (data) => { error += data; });
        tail.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(error || 'tail command failed'));
          }
        });
      });

      const logLines = result.split('\n').filter(l => l.trim());
      res.json({ lines: logLines, total: logLines.length });
    } catch (error) {
      log.error({ error: error.message, logPath: req.params.logPath, requestId: req.id }, 'failed to read logs');
      res.status(404).json({ error: 'Log file not found', lines: [] });
    }
  });

  return router;
}

// Diff router
export function createDiffRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME || '/home', 'Projects');

  // Get git diff for project
  // SECURITY: Validates path stays within PROJECTS_DIR
  router.get('/:projectPath(*)', validatePathMiddleware, async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const commit = req.query.commit;

      const fullPath = validateAndResolvePath(projectPath, [PROJECTS_DIR]);

      if (!fullPath) {
        logSecurityEvent({
          event: 'diff_path_traversal_blocked',
          projectPath,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'Invalid path', diff: '' });
      }

      // Build git diff command
      const args = commit
        ? ['diff', commit + '^', commit]
        : ['diff', 'HEAD'];

      const result = await new Promise((resolve, reject) => {
        const git = spawn('git', args, { cwd: fullPath });
        let output = '';
        let error = '';

        git.stdout.on('data', (data) => { output += data; });
        git.stderr.on('data', (data) => { error += data; });
        git.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            // No diff is not an error
            resolve('');
          }
        });
      });

      res.json({ diff: result });
    } catch (error) {
      log.error({ error: error.message, projectPath: req.params.projectPath, requestId: req.id }, 'failed to get diff');
      res.status(500).json({ error: 'Failed to get diff', diff: '' });
    }
  });

  return router;
}

// Export router
export function createExportRouter(prisma) {
  const router = Router();

  // Export session
  router.post('/session/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.body;

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          notes: true,
          tags: { include: { tag: true } },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Build export data
      const exportData = {
        id: session.id,
        name: session.name,
        projectPath: session.projectPath,
        createdAt: session.createdAt,
        history: [], // Would need to get from terminal history
        notes: session.notes.map(n => ({
          content: n.content,
          createdAt: n.createdAt,
        })),
        tags: session.tags.map(t => t.tag.name),
      };

      res.json(exportData);
    } catch (error) {
      log.error({ error: error.message, sessionId: req.params.id, requestId: req.id }, 'failed to export session');
      res.status(500).json({ error: 'Failed to export session' });
    }
  });

  return router;
}

// Import router
export function createImportRouter(prisma) {
  const router = Router();

  // Import conversations
  router.post('/conversations', async (req, res) => {
    try {
      const { conversations } = req.body;

      if (!Array.isArray(conversations)) {
        return res.status(400).json({ error: 'Invalid format' });
      }

      const imported = [];

      for (const conv of conversations) {
        // Create session from imported conversation
        const session = await prisma.session.create({
          data: {
            name: conv.title || 'Imported Conversation',
            tmuxSession: 'imported-' + Date.now(),
            isActive: false,
            metadata: {
              imported: true,
              importedAt: new Date().toISOString(),
              originalId: conv.id,
              messageCount: conv.messages?.length || 0,
            },
          },
        });

        // Store messages as notes
        if (conv.messages && conv.messages.length > 0) {
          const noteContent = conv.messages
            .map(m => '**' + (m.role || 'unknown') + ':**\n' + m.content)
            .join('\n\n---\n\n');

          await prisma.sessionNote.create({
            data: {
              sessionId: session.id,
              content: noteContent,
            },
          });
        }

        imported.push({
          id: session.id,
          title: session.name,
        });
      }

      res.json({
        success: true,
        imported: imported.length,
        sessions: imported,
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to import conversations');
      res.status(500).json({ error: 'Failed to import' });
    }
  });

  return router;
}
