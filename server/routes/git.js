/**
 * Git API Routes
 * Git operations and automation
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import { gitCommitSchema, gitBranchSchema } from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('git');

export function createGitRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME || '/home', 'Projects');

  // Execute git command helper - use full path to git binary
  const GIT_PATH = '/usr/bin/git';
  const execGit = (args, cwd) => {
    return new Promise((resolve, reject) => {
      let git;
      try {
        git = spawn(GIT_PATH, args, { cwd });
      } catch (err) {
        return reject(new Error(`Failed to spawn git: ${err.message}`));
      }
      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => { stdout += data; });
      git.stderr.on('data', (data) => { stderr += data; });

      // Handle spawn errors (e.g., ENOENT when git not found)
      git.on('error', (err) => {
        reject(new Error(`Git spawn error: ${err.message}`));
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve({ output: stdout.trim(), stderr: stderr.trim() });
        } else {
          reject(new Error(stderr || stdout || 'Git command failed'));
        }
      });
    });
  };

  // Get repository path
  const getRepoPath = (projectPath) => {
    return projectPath.startsWith('/')
      ? projectPath
      : path.join(PROJECTS_DIR, projectPath);
  };

  // Check if directory is a valid git repository
  const isGitRepo = async (dirPath) => {
    try {
      await execGit(['rev-parse', '--git-dir'], dirPath);
      return true;
    } catch {
      return false;
    }
  };

  // Check if path is the parent Projects directory (not a valid project)
  const isParentProjectsDir = (projectPath) => {
    const resolvedPath = getRepoPath(projectPath);
    const normalized = path.normalize(resolvedPath);
    const projectsNormalized = path.normalize(PROJECTS_DIR);
    return normalized === projectsNormalized;
  };

  // Get git status
  router.get('/:projectPath(*)/status', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.projectPath);

      // Reject invalid project paths like "Home" or the parent Projects directory
      if (projectPath === 'Home' || projectPath === 'home' || !projectPath ||
          projectPath === 'Projects' || isParentProjectsDir(projectPath)) {
        return res.status(400).json({ error: 'Invalid project path' });
      }

      const repoPath = getRepoPath(projectPath);

      // Check if it's actually a git repository before running commands
      if (!await isGitRepo(repoPath)) {
        return res.status(400).json({ error: 'Not a git repository' });
      }

      // Get current branch
      const { output: branch } = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath);

      // Get ahead/behind info
      let ahead = 0, behind = 0;
      try {
        const { output: tracking } = await execGit(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], repoPath);
        const parts = tracking.split('\t');
        ahead = parseInt(parts[0]) || 0;
        behind = parseInt(parts[1]) || 0;
      } catch (e) {
        // No upstream configured
      }

      // Get staged files
      const { output: stagedRaw } = await execGit(['diff', '--cached', '--name-only'], repoPath);
      const staged = stagedRaw ? stagedRaw.split('\n').filter(Boolean) : [];

      // Get unstaged files
      const { output: unstagedRaw } = await execGit(['diff', '--name-only'], repoPath);
      const unstaged = unstagedRaw ? unstagedRaw.split('\n').filter(Boolean) : [];

      // Get untracked files
      const { output: untrackedRaw } = await execGit(['ls-files', '--others', '--exclude-standard'], repoPath);
      const untracked = untrackedRaw ? untrackedRaw.split('\n').filter(Boolean) : [];

      // Get remote URL (for GitHub link)
      let remoteUrl = null;
      try {
        const { output: remote } = await execGit(['remote', 'get-url', 'origin'], repoPath);
        remoteUrl = remote.trim();
        // Convert SSH URL to HTTPS for browser link
        if (remoteUrl.startsWith('git@github.com:')) {
          remoteUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '');
        } else if (remoteUrl.endsWith('.git')) {
          remoteUrl = remoteUrl.replace(/\.git$/, '');
        }
      } catch (e) {
        // No remote configured
      }

      res.json({
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        remoteUrl,
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get git status',
        operation: 'git status',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Pull
  router.post('/:projectPath(*)/pull', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { output } = await execGit(['pull'], repoPath);
      res.json({ output });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to pull changes',
        operation: 'git pull',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Push
  router.post('/:projectPath(*)/push', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { output } = await execGit(['push'], repoPath);
      res.json({ output });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to push changes',
        operation: 'git push',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Commit
  router.post('/:projectPath(*)/commit', validateBody(gitCommitSchema), async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { message, files } = req.validatedBody;
      const { addAll } = req.body;

      // Stage all if requested
      if (addAll) {
        await execGit(['add', '-A'], repoPath);
      } else if (files && files.length > 0) {
        // Stage specific files
        await execGit(['add', ...files], repoPath);
      }

      const { output } = await execGit(['commit', '-m', message], repoPath);
      res.json({ output });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to commit changes',
        operation: 'git commit',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Stash
  router.post('/:projectPath(*)/stash', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { message } = req.body;

      const args = ['stash', 'push'];
      if (message) {
        args.push('-m', message);
      }

      const { output } = await execGit(args, repoPath);
      res.json({ output });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to stash changes',
        operation: 'git stash',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Create branch
  router.post('/:projectPath(*)/branch', validateBody(gitBranchSchema), async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { name, from } = req.validatedBody;

      // Create and checkout (optionally from a specific ref)
      const args = ['checkout', '-b', name];
      if (from) {
        args.push(from);
      }

      await execGit(args, repoPath);
      res.json({ output: 'Created and switched to branch: ' + name });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create branch',
        operation: 'git branch',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Get recent commits
  router.get('/:projectPath(*)/log', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

      const { output } = await execGit([
        'log',
        '-n', String(limit),
        '--pretty=format:%H|%h|%s|%an|%ar'
      ], repoPath);

      const commits = output.split('\n').filter(Boolean).map(line => {
        const [hash, short, message, author, date] = line.split('|');
        return { hash, short, message, author, date };
      });

      res.json(commits);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get commit log',
        operation: 'git log',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Get branches
  router.get('/:projectPath(*)/branches', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { output: currentBranch } = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath);
      const { output: branchList } = await execGit(['branch', '-a'], repoPath);

      const branches = branchList.split('\n')
        .filter(Boolean)
        .map(b => b.trim().replace(/^\*\s*/, ''))
        .filter(b => !b.startsWith('remotes/'));

      res.json({ current: currentBranch.trim(), branches });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to get branches',
        operation: 'git branch',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  // Switch branch
  router.post('/:projectPath(*)/checkout', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { branch } = req.body;

      if (!branch || typeof branch !== 'string' || branch.length > 100) {
        return res.status(400).json({ error: 'Valid branch name required' });
      }

      // Validate branch name format
      if (!/^[a-zA-Z0-9_\-./]+$/.test(branch)) {
        return res.status(400).json({ error: 'Invalid branch name format' });
      }

      const { output } = await execGit(['checkout', branch], repoPath);
      res.json({ output: 'Switched to branch: ' + branch });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to switch branch',
        operation: 'git checkout',
        requestId: req.id,
        context: { projectPath: req.params.projectPath },
      });
    }
  });

  return router;
}
