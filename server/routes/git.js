/**
 * Git API Routes
 * Git operations and automation
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';

export function createGitRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME || '/home', 'Projects');

  // Execute git command helper
  const execGit = (args, cwd) => {
    return new Promise((resolve, reject) => {
      const git = spawn('git', args, { cwd });
      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => { stdout += data; });
      git.stderr.on('data', (data) => { stderr += data; });

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

  // Get git status
  router.get('/:projectPath(*)/status', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));

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

      res.json({
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
      });
    } catch (error) {
      console.error('Git status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Pull
  router.post('/:projectPath(*)/pull', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { output } = await execGit(['pull'], repoPath);
      res.json({ output });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Push
  router.post('/:projectPath(*)/push', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { output } = await execGit(['push'], repoPath);
      res.json({ output });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Commit
  router.post('/:projectPath(*)/commit', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { message, addAll } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Commit message required' });
      }

      // Stage all if requested
      if (addAll) {
        await execGit(['add', '-A'], repoPath);
      }

      const { output } = await execGit(['commit', '-m', message], repoPath);
      res.json({ output });
    } catch (error) {
      res.status(500).json({ error: error.message });
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
      res.status(500).json({ error: error.message });
    }
  });

  // Create branch
  router.post('/:projectPath(*)/branch', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Branch name required' });
      }

      // Create and checkout
      await execGit(['checkout', '-b', name], repoPath);
      res.json({ output: 'Created and switched to branch: ' + name });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent commits
  router.get('/:projectPath(*)/log', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const limit = parseInt(req.query.limit) || 10;

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
      res.status(500).json({ error: error.message });
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
      res.status(500).json({ error: error.message });
    }
  });

  // Switch branch
  router.post('/:projectPath(*)/checkout', async (req, res) => {
    try {
      const repoPath = getRepoPath(decodeURIComponent(req.params.projectPath));
      const { branch } = req.body;

      if (!branch) {
        return res.status(400).json({ error: 'Branch name required' });
      }

      const { output } = await execGit(['checkout', branch], repoPath);
      res.json({ output: 'Switched to branch: ' + branch });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
