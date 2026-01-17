/**
 * Checkpoint/Snapshot API Routes
 * Manages session and project state checkpoints for rollback capability
 */

import { Router } from 'express';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('checkpoints');

export function createCheckpointsRouter(prisma, projectsDir) {
  const router = Router();

  /**
   * Get all checkpoints for a project
   */
  router.get('/project/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 50, type } = req.query;

      const where = { projectId };
      if (type) {
        where.type = type.toUpperCase();
      }

      const checkpoints = await prisma.checkpoint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        select: {
          id: true,
          projectId: true,
          sessionId: true,
          name: true,
          description: true,
          type: true,
          gitBranch: true,
          gitCommit: true,
          gitDirty: true,
          workingDir: true,
          openFiles: true,
          sizeBytes: true,
          isAutomatic: true,
          isPinned: true,
          createdAt: true,
        }
      });

      res.json(checkpoints);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch checkpoints',
        operation: 'fetch checkpoints',
        requestId: req.id,
        context: { projectId: req.params.projectId }
      });
    }
  });

  /**
   * Get a single checkpoint with full details
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const checkpoint = await prisma.checkpoint.findUnique({
        where: { id }
      });

      if (!checkpoint) {
        return res.status(404).json({ error: 'Checkpoint not found' });
      }

      res.json(checkpoint);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch checkpoint',
        operation: 'fetch checkpoint',
        requestId: req.id,
        context: { checkpointId: req.params.id }
      });
    }
  });

  /**
   * Create a new checkpoint (manual or triggered)
   */
  router.post('/', async (req, res) => {
    try {
      const {
        projectId,
        sessionId,
        name,
        description,
        type = 'MANUAL',
        includeTerminal = true,
        includeGit = true,
        includeFiles = false,
        filePaths = []
      } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      // Find project path
      const projectPath = join(projectsDir, projectId);
      if (!existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Gather git state
      let gitBranch = null;
      let gitCommit = null;
      let gitDirty = false;

      if (includeGit) {
        try {
          const gitDir = join(projectPath, '.git');
          if (existsSync(gitDir)) {
            gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
              cwd: projectPath,
              encoding: 'utf-8'
            }).trim();

            gitCommit = execSync('git rev-parse HEAD', {
              cwd: projectPath,
              encoding: 'utf-8'
            }).trim();

            const status = execSync('git status --porcelain', {
              cwd: projectPath,
              encoding: 'utf-8'
            }).trim();
            gitDirty = status.length > 0;
          }
        } catch (gitError) {
          // Git not available or not a repo - continue without git info
        }
      }

      // Get current working directory from session if available
      let workingDir = projectPath;

      // Gather file snapshots if requested
      let fileSnapshots = null;
      let sizeBytes = 0;

      if (includeFiles && filePaths.length > 0) {
        fileSnapshots = [];
        for (const filePath of filePaths) {
          const fullPath = join(projectPath, filePath);
          if (existsSync(fullPath)) {
            try {
              const content = readFileSync(fullPath, 'utf-8');
              sizeBytes += Buffer.byteLength(content, 'utf-8');
              fileSnapshots.push({
                path: filePath,
                content,
                size: Buffer.byteLength(content, 'utf-8')
              });
            } catch (readError) {
              // Skip files that can't be read
            }
          }
        }
      }

      // Get open files from context if available
      let openFiles = [];
      try {
        const context = await prisma.projectContext.findUnique({
          where: { projectId }
        });
        if (context && context.files) {
          openFiles = context.files;
        }
      } catch (contextError) {
        // Context not available
      }

      // Create checkpoint
      const checkpoint = await prisma.checkpoint.create({
        data: {
          projectId,
          sessionId,
          name: name || `Checkpoint ${new Date().toLocaleString()}`,
          description,
          type: type.toUpperCase(),
          gitBranch,
          gitCommit,
          gitDirty,
          workingDir,
          fileSnapshots,
          openFiles,
          sizeBytes,
          isAutomatic: type !== 'MANUAL',
          // Auto-expire non-pinned automatic checkpoints after 7 days
          expiresAt: type !== 'MANUAL' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        }
      });

      res.status(201).json(checkpoint);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create checkpoint',
        operation: 'create checkpoint',
        requestId: req.id,
        context: { projectId: req.body.projectId }
      });
    }
  });

  /**
   * Restore from a checkpoint
   */
  router.post('/:id/restore', async (req, res) => {
    try {
      const { id } = req.params;
      const { restoreGit = true, restoreFiles = true } = req.body;

      const checkpoint = await prisma.checkpoint.findUnique({
        where: { id }
      });

      if (!checkpoint) {
        return res.status(404).json({ error: 'Checkpoint not found' });
      }

      const projectPath = join(projectsDir, checkpoint.projectId);
      if (!existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const results = {
        git: null,
        files: null,
        warnings: []
      };

      // Restore git state
      if (restoreGit && checkpoint.gitCommit) {
        try {
          // Check for uncommitted changes
          const status = execSync('git status --porcelain', {
            cwd: projectPath,
            encoding: 'utf-8'
          }).trim();

          if (status.length > 0) {
            // Stash current changes
            execSync('git stash push -m "Auto-stash before checkpoint restore"', {
              cwd: projectPath,
              encoding: 'utf-8'
            });
            results.warnings.push('Current changes were stashed before restore');
          }

          // Checkout the commit
          execSync(`git checkout ${checkpoint.gitCommit}`, {
            cwd: projectPath,
            encoding: 'utf-8'
          });

          results.git = {
            restored: true,
            commit: checkpoint.gitCommit,
            branch: checkpoint.gitBranch
          };
        } catch (gitError) {
          results.git = {
            restored: false,
            error: gitError.message
          };
          results.warnings.push('Failed to restore git state: ' + gitError.message);
        }
      }

      // Restore file snapshots
      if (restoreFiles && checkpoint.fileSnapshots) {
        results.files = { restored: [], failed: [] };
        for (const snapshot of checkpoint.fileSnapshots) {
          try {
            const fullPath = join(projectPath, snapshot.path);
            writeFileSync(fullPath, snapshot.content);
            results.files.restored.push(snapshot.path);
          } catch (writeError) {
            results.files.failed.push({
              path: snapshot.path,
              error: writeError.message
            });
          }
        }
      }

      // Log the restore action
      await prisma.activity.create({
        data: {
          type: 'checkpoint_restored',
          actor: 'user',
          target: checkpoint.id,
          message: `Restored checkpoint: ${checkpoint.name}`,
          project: checkpoint.projectId,
          metadata: { checkpointId: id, results }
        }
      });

      res.json({
        success: true,
        checkpoint: {
          id: checkpoint.id,
          name: checkpoint.name,
          createdAt: checkpoint.createdAt
        },
        results
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to restore checkpoint',
        operation: 'restore checkpoint',
        requestId: req.id,
        context: { checkpointId: req.params.id }
      });
    }
  });

  /**
   * Update checkpoint (name, description, pinned status)
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isPinned } = req.body;

      const checkpoint = await prisma.checkpoint.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isPinned !== undefined && { isPinned })
        }
      });

      res.json(checkpoint);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update checkpoint',
        operation: 'update checkpoint',
        requestId: req.id,
        context: { checkpointId: req.params.id }
      });
    }
  });

  /**
   * Delete a checkpoint
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.checkpoint.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete checkpoint',
        operation: 'delete checkpoint',
        requestId: req.id,
        context: { checkpointId: req.params.id }
      });
    }
  });

  /**
   * Cleanup expired checkpoints
   */
  router.post('/cleanup', async (req, res) => {
    try {
      const result = await prisma.checkpoint.deleteMany({
        where: {
          isPinned: false,
          expiresAt: {
            lt: new Date()
          }
        }
      });

      res.json({
        success: true,
        deleted: result.count
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to cleanup checkpoints',
        operation: 'cleanup expired checkpoints',
        requestId: req.id
      });
    }
  });

  /**
   * Get checkpoint statistics for a project
   */
  router.get('/project/:projectId/stats', async (req, res) => {
    try {
      const { projectId } = req.params;

      const [total, byType, totalSize, pinned] = await Promise.all([
        prisma.checkpoint.count({ where: { projectId } }),
        prisma.checkpoint.groupBy({
          by: ['type'],
          where: { projectId },
          _count: true
        }),
        prisma.checkpoint.aggregate({
          where: { projectId },
          _sum: { sizeBytes: true }
        }),
        prisma.checkpoint.count({
          where: { projectId, isPinned: true }
        })
      ]);

      res.json({
        total,
        pinned,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        totalSizeBytes: totalSize._sum.sizeBytes || 0
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch checkpoint stats',
        operation: 'fetch checkpoint stats',
        requestId: req.id,
        context: { projectId: req.params.projectId }
      });
    }
  });

  return router;
}
