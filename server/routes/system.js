/**
 * System Routes
 * Handles system-level operations like self-updates
 */

import { Router } from 'express';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createLogger } from '../services/logger.js';

const sysLog = createLogger('system');

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory (one level up from server/routes)
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export function createSystemRouter() {
  const router = Router();

  // Socket.IO instance - set after initialization via setSocketIO()
  let socketIO = null;

  // Track update status
  let updateInProgress = false;
  let updateLogs = [];

  /**
   * Set Socket.IO instance after it's initialized
   * Call this from index.js after io = new Server(...)
   */
  router.setSocketIO = (io) => {
    socketIO = io;
    sysLog.info('Socket.IO instance registered for update progress');
  };

  /**
   * Helper to emit update progress via Socket.IO
   */
  function emitProgress(step, status, message, details = null) {
    const logEntry = { step, status, message, details, timestamp: new Date().toISOString() };
    updateLogs.push(logEntry);
    if (socketIO) {
      socketIO.emit('system-update-progress', logEntry);
    }
    sysLog.info({ step, status, message, details }, 'system update progress');
  }

  /**
   * Run a command and stream output
   */
  function runCommand(command, args, cwd, step) {
    return new Promise((resolve, reject) => {
      emitProgress(step, 'running', `Executing: ${command} ${args.join(' ')}`);

      // Ensure node_modules/.bin is in PATH for local binaries like vite
      const nodeModulesBin = path.join(cwd, 'node_modules', '.bin');
      const envPath = process.env.PATH || '';
      const enhancedPath = `${nodeModulesBin}:${envPath}`;

      const proc = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env, PATH: enhancedPath, FORCE_COLOR: '0' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        emitProgress(step, 'output', text.trim());
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        // npm often writes to stderr for non-errors
        emitProgress(step, 'output', text.trim());
      });

      proc.on('close', (code) => {
        if (code === 0) {
          emitProgress(step, 'complete', `Command completed successfully`);
          resolve({ stdout, stderr, code });
        } else {
          emitProgress(step, 'error', `Command failed with code ${code}`, { stderr });
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        emitProgress(step, 'error', `Failed to start command: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * GET /api/system/update/status - Get current update status
   */
  router.get('/update/status', (req, res) => {
    res.json({
      inProgress: updateInProgress,
      logs: updateLogs.slice(-50), // Last 50 log entries
    });
  });

  /**
   * GET /api/system/version - Get current version and check for updates
   */
  router.get('/version', async (req, res) => {
    try {
      // Get current version from package.json
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const currentVersion = packageJson.version;

      // Get git info
      let gitInfo = {
        branch: 'unknown',
        commit: 'unknown',
        remote: 'unknown',
        behindBy: 0,
        hasUpdates: false,
      };

      try {
        // Get current branch
        const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT });
        gitInfo.branch = branch.trim();

        // Get current commit
        const { stdout: commit } = await execAsync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT });
        gitInfo.commit = commit.trim();

        // Get remote URL
        const { stdout: remote } = await execAsync('git remote get-url origin', { cwd: PROJECT_ROOT });
        gitInfo.remote = remote.trim();

        // Fetch from remote (quiet)
        await execAsync('git fetch --quiet', { cwd: PROJECT_ROOT });

        // Check if behind remote
        const { stdout: behindBy } = await execAsync(`git rev-list HEAD..origin/${gitInfo.branch} --count`, { cwd: PROJECT_ROOT });
        gitInfo.behindBy = parseInt(behindBy.trim(), 10) || 0;
        gitInfo.hasUpdates = gitInfo.behindBy > 0;

        // Get last commit date
        const { stdout: lastCommitDate } = await execAsync('git log -1 --format=%ci', { cwd: PROJECT_ROOT });
        gitInfo.lastCommitDate = lastCommitDate.trim();

      } catch (gitError) {
        sysLog.warn({ error: gitError.message }, 'git info error');
      }

      res.json({
        version: currentVersion,
        ...gitInfo,
      });
    } catch (error) {
      sysLog.error({ error: error.message, requestId: req.id }, 'version check error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/system/update - Trigger system update
   * Steps: git pull → npm install → npm run build → pm2 restart
   */
  router.post('/update', async (req, res) => {
    if (updateInProgress) {
      return res.status(409).json({
        error: 'Update already in progress',
        logs: updateLogs.slice(-20),
      });
    }

    updateInProgress = true;
    updateLogs = [];

    // Send immediate response - client will receive progress via Socket.IO
    res.json({
      status: 'started',
      message: 'Update process started. Progress will be streamed via WebSocket.',
    });

    try {
      emitProgress('init', 'running', 'Starting Console.web update process');

      // Step 1: Check for uncommitted changes
      emitProgress('check', 'running', 'Checking for uncommitted changes...');
      try {
        const { stdout: status } = await execAsync('git status --porcelain', { cwd: PROJECT_ROOT });
        if (status.trim()) {
          // Stash changes if any
          emitProgress('check', 'warning', 'Uncommitted changes detected, stashing...');
          await execAsync('git stash', { cwd: PROJECT_ROOT });
        }
      } catch (err) {
        emitProgress('check', 'error', `Git status check failed: ${err.message}`);
      }
      emitProgress('check', 'complete', 'Pre-flight checks passed');

      // Step 2: Git pull
      emitProgress('git-pull', 'running', 'Pulling latest changes from GitHub...');
      await runCommand('git', ['pull', '--rebase', 'origin', 'main'], PROJECT_ROOT, 'git-pull');
      emitProgress('git-pull', 'complete', 'Successfully pulled latest changes');

      // Step 3: npm install (include dev deps for vite build tools)
      emitProgress('npm-install', 'running', 'Installing dependencies...');
      await runCommand('npm', ['install', '--include=dev', '--legacy-peer-deps'], PROJECT_ROOT, 'npm-install');
      emitProgress('npm-install', 'complete', 'Dependencies installed');

      // Step 4: Prisma generate (if schema changed)
      emitProgress('prisma', 'running', 'Generating Prisma client...');
      try {
        await runCommand('npx', ['prisma', 'generate'], PROJECT_ROOT, 'prisma');
        emitProgress('prisma', 'complete', 'Prisma client generated');
      } catch (err) {
        emitProgress('prisma', 'warning', 'Prisma generate skipped or failed (may not be needed)');
      }

      // Step 5: npm run build
      emitProgress('build', 'running', 'Building frontend...');
      await runCommand('npm', ['run', 'build'], PROJECT_ROOT, 'build');
      emitProgress('build', 'complete', 'Frontend built successfully');

      // Step 6: PM2 restart
      emitProgress('restart', 'running', 'Restarting application via PM2...');

      // Use a delayed restart to allow this response to complete
      setTimeout(async () => {
        try {
          await execAsync('pm2 restart console-web', { cwd: PROJECT_ROOT });
          emitProgress('restart', 'complete', 'Application restarted');
          emitProgress('done', 'complete', 'Update completed successfully! Refreshing in 5 seconds...');
        } catch (err) {
          emitProgress('restart', 'error', `PM2 restart failed: ${err.message}`);
        }
        updateInProgress = false;
      }, 1000);

    } catch (error) {
      emitProgress('error', 'error', `Update failed: ${error.message}`);
      updateInProgress = false;
    }
  });

  /**
   * POST /api/system/update/cancel - Cancel ongoing update (best effort)
   */
  router.post('/update/cancel', (req, res) => {
    if (!updateInProgress) {
      return res.json({ message: 'No update in progress' });
    }

    // Can't really cancel mid-process, but we can acknowledge
    emitProgress('cancel', 'warning', 'Cancel requested - update may continue to next safe point');
    res.json({ message: 'Cancel requested' });
  });

  /**
   * GET /api/system/changelog - Get recent changelog entries
   */
  router.get('/changelog', async (req, res) => {
    try {
      const count = parseInt(req.query.count, 10) || 10;
      const { stdout } = await execAsync(
        `git log --oneline -${count} --pretty=format:'%h|%s|%cr|%an'`,
        { cwd: PROJECT_ROOT }
      );

      const commits = stdout.split('\n').filter(Boolean).map(line => {
        const [hash, message, date, author] = line.split('|');
        return { hash, message, date, author };
      });

      res.json({ commits });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
