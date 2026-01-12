/**
 * Backup API Routes
 * Backup and restore functionality
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export function createBackupsRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME || '/home', 'Projects');
  const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(process.env.HOME || '/home', '.backups');

  // Ensure backups directory exists
  const ensureBackupsDir = async () => {
    try {
      await fs.mkdir(BACKUPS_DIR, { recursive: true });
    } catch (e) {
      // Directory exists
    }
  };

  // Get project backup directory
  const getBackupDir = (projectPath) => {
    const projectName = path.basename(projectPath);
    return path.join(BACKUPS_DIR, projectName);
  };

  // Get full project path
  const getProjectPath = (projectPath) => {
    return projectPath.startsWith('/')
      ? projectPath
      : path.join(PROJECTS_DIR, projectPath);
  };

  // List backups for project
  router.get('/:projectPath(*)', async (req, res) => {
    try {
      await ensureBackupsDir();
      const projectPath = decodeURIComponent(req.params.projectPath);
      const backupDir = getBackupDir(projectPath);

      let backups = [];
      try {
        const files = await fs.readdir(backupDir);
        for (const file of files) {
          if (file.endsWith('.tar.gz') || file.endsWith('.bundle')) {
            const filePath = path.join(backupDir, file);
            const stats = await fs.stat(filePath);

            // Parse backup metadata from filename
            const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})_(full|incremental|git)\.(tar\.gz|bundle)$/);

            backups.push({
              id: file,
              name: match ? match[1] : file,
              createdAt: match ? match[2].replace(/-/g, ':').replace('T', ' ') : stats.birthtime.toISOString(),
              strategy: match ? match[3] : 'full',
              size: stats.size,
              path: filePath,
            });
          }
        }
      } catch (e) {
        // Backup directory doesn't exist yet
      }

      // Sort by date descending
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Get schedule if exists
      let schedules = [];
      try {
        const schedule = await prisma.scheduledTask.findFirst({
          where: {
            name: { startsWith: 'backup:' + path.basename(projectPath) }
          }
        });
        if (schedule) {
          schedules.push(schedule);
        }
      } catch (e) {
        // No schedule
      }

      res.json({ backups, schedules });
    } catch (error) {
      console.error('List backups error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create backup
  router.post('/:projectPath(*)', async (req, res) => {
    try {
      await ensureBackupsDir();
      const projectPath = decodeURIComponent(req.params.projectPath);
      const fullPath = getProjectPath(projectPath);
      const backupDir = getBackupDir(projectPath);
      const { name, strategy = 'full', destination } = req.body;

      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safeName = (name || 'backup').replace(/[^a-zA-Z0-9-_]/g, '_');
      const projectName = path.basename(projectPath);

      let backupFile;
      let cmd, args;

      if (strategy === 'git') {
        // Git bundle
        backupFile = path.join(backupDir, safeName + '_' + timestamp + '_git.bundle');
        cmd = 'git';
        args = ['bundle', 'create', backupFile, '--all'];
      } else {
        // Tar archive
        backupFile = path.join(backupDir, safeName + '_' + timestamp + '_' + strategy + '.tar.gz');

        const excludes = [
          '--exclude=node_modules',
          '--exclude=.git',
          '--exclude=dist',
          '--exclude=build',
          '--exclude=.next',
          '--exclude=coverage',
        ];

        cmd = 'tar';
        args = ['czf', backupFile, ...excludes, '-C', path.dirname(fullPath), projectName];
      }

      await new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { cwd: strategy === 'git' ? fullPath : undefined });
        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data; });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || 'Backup failed'));
        });
      });

      // Get file size
      const stats = await fs.stat(backupFile);

      res.json({
        id: path.basename(backupFile),
        name: safeName,
        path: backupFile,
        size: stats.size,
        strategy,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create backup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Restore backup
  router.post('/:projectPath(*)/:backupId/restore', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const backupId = req.params.backupId;
      const fullPath = getProjectPath(projectPath);
      const backupDir = getBackupDir(projectPath);
      const backupFile = path.join(backupDir, backupId);

      // Verify backup exists
      await fs.access(backupFile);

      if (backupId.endsWith('.bundle')) {
        // Restore git bundle
        await new Promise((resolve, reject) => {
          const proc = spawn('git', ['bundle', 'verify', backupFile], { cwd: fullPath });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error('Invalid git bundle'));
          });
        });

        await new Promise((resolve, reject) => {
          const proc = spawn('git', ['fetch', backupFile, 'refs/heads/*:refs/heads/*'], { cwd: fullPath });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error('Fetch failed'));
          });
        });
      } else {
        // Restore tar archive
        const projectName = path.basename(projectPath);
        const parentDir = path.dirname(fullPath);

        // Extract to temp, then move
        await new Promise((resolve, reject) => {
          const proc = spawn('tar', ['xzf', backupFile, '-C', parentDir]);
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error('Extract failed'));
          });
        });
      }

      res.json({ success: true, message: 'Backup restored successfully' });
    } catch (error) {
      console.error('Restore backup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete backup
  router.delete('/:projectPath(*)/:backupId', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const backupId = req.params.backupId;
      const backupDir = getBackupDir(projectPath);
      const backupFile = path.join(backupDir, backupId);

      await fs.unlink(backupFile);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete backup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save backup schedule
  router.put('/:projectPath(*)/schedule', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);
      const { enabled, cron, strategy, retentionDays } = req.body;
      const projectName = path.basename(projectPath);
      const taskName = 'backup:' + projectName;

      if (enabled) {
        // Create or update scheduled task
        await prisma.scheduledTask.upsert({
          where: { name: taskName },
          update: {
            cron,
            command: JSON.stringify({ projectPath, strategy, retentionDays }),
            enabled: true,
          },
          create: {
            name: taskName,
            cron,
            command: JSON.stringify({ projectPath, strategy, retentionDays }),
            enabled: true,
          },
        });
      } else {
        // Disable schedule
        await prisma.scheduledTask.updateMany({
          where: { name: taskName },
          data: { enabled: false },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Save schedule error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
