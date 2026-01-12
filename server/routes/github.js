/**
 * GitHub Integration Routes
 * Handles authentication, repository management, sync operations, and CI/CD status
 */

import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export function createGithubRouter(prisma) {
  const router = Router();
  const PROJECTS_DIR = process.env.PROJECTS_DIR || '/home/thornburywn/Projects';

  // ==================== HELPERS ====================

  /**
   * Get authenticated Octokit instance
   */
  async function getOctokit() {
    const settings = await prisma.gitHubSettings.findUnique({
      where: { id: 'default' }
    });
    if (!settings?.accessToken) {
      throw new Error('GitHub not authenticated');
    }
    return new Octokit({ auth: settings.accessToken });
  }

  /**
   * Execute git command in a directory
   */
  function execGit(args, cwd) {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, { cwd });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Git command failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Get project by ID or name
   */
  async function getProject(projectId) {
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectId },
          { name: projectId }
        ]
      },
      include: { githubRepo: true }
    });
    return project;
  }

  /**
   * Update sync status for a linked repo
   */
  async function updateSyncStatus(repoId, projectPath) {
    try {
      // Get ahead/behind counts
      await execGit(['fetch', 'origin'], projectPath);

      const branch = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], projectPath);
      const status = await execGit(['status', '-sb'], projectPath);

      let aheadBy = 0;
      let behindBy = 0;
      let syncStatus = 'synced';

      // Parse ahead/behind from status
      const aheadMatch = status.match(/ahead (\d+)/);
      const behindMatch = status.match(/behind (\d+)/);

      if (aheadMatch) aheadBy = parseInt(aheadMatch[1]);
      if (behindMatch) behindBy = parseInt(behindMatch[1]);

      if (aheadBy > 0 && behindBy > 0) {
        syncStatus = 'diverged';
      } else if (aheadBy > 0) {
        syncStatus = 'ahead';
      } else if (behindBy > 0) {
        syncStatus = 'behind';
      }

      await prisma.gitHubRepo.update({
        where: { id: repoId },
        data: {
          aheadBy,
          behindBy,
          lastSyncStatus: syncStatus,
          lastSyncedAt: new Date(),
          lastSyncError: null
        }
      });

      return { aheadBy, behindBy, syncStatus, branch };
    } catch (error) {
      await prisma.gitHubRepo.update({
        where: { id: repoId },
        data: {
          lastSyncStatus: 'error',
          lastSyncError: error.message
        }
      });
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * GET /api/github/auth - Check authentication status
   */
  router.get('/auth', async (req, res) => {
    try {
      const settings = await prisma.gitHubSettings.findUnique({
        where: { id: 'default' }
      });

      if (!settings || !settings.authenticated) {
        return res.json({
          authenticated: false
        });
      }

      res.json({
        authenticated: true,
        username: settings.username,
        avatarUrl: settings.avatarUrl,
        profileUrl: settings.profileUrl,
        tokenScopes: settings.tokenScopes,
        lastValidated: settings.lastValidated
      });
    } catch (error) {
      console.error('Error checking GitHub auth:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/github/auth - Save and validate PAT
   */
  router.post('/auth', async (req, res) => {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: 'Access token required' });
      }

      // Validate token with GitHub API
      const octokit = new Octokit({ auth: accessToken });

      // Get authenticated user
      const { data: user } = await octokit.users.getAuthenticated();

      // Check token scopes from response headers
      // Note: Scopes are in the x-oauth-scopes header
      let tokenScopes = [];
      try {
        const response = await octokit.request('GET /user');
        const scopeHeader = response.headers['x-oauth-scopes'];
        if (scopeHeader) {
          tokenScopes = scopeHeader.split(',').map(s => s.trim());
        }
      } catch (e) {
        // Scopes check is optional
      }

      // Save settings
      const settings = await prisma.gitHubSettings.upsert({
        where: { id: 'default' },
        update: {
          accessToken,
          username: user.login,
          avatarUrl: user.avatar_url,
          profileUrl: user.html_url,
          authenticated: true,
          tokenScopes,
          lastValidated: new Date()
        },
        create: {
          id: 'default',
          accessToken,
          username: user.login,
          avatarUrl: user.avatar_url,
          profileUrl: user.html_url,
          authenticated: true,
          tokenScopes,
          lastValidated: new Date()
        }
      });

      res.json({
        authenticated: true,
        username: settings.username,
        avatarUrl: settings.avatarUrl,
        profileUrl: settings.profileUrl,
        tokenScopes: settings.tokenScopes
      });
    } catch (error) {
      console.error('Error authenticating GitHub:', error);

      if (error.status === 401) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/github/auth - Remove PAT and disconnect
   */
  router.delete('/auth', async (req, res) => {
    try {
      await prisma.gitHubSettings.update({
        where: { id: 'default' },
        data: {
          accessToken: null,
          username: null,
          avatarUrl: null,
          profileUrl: null,
          authenticated: false,
          tokenScopes: [],
          lastValidated: null
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== REPO LIST ENDPOINTS ====================

  /**
   * GET /api/github/repos - List all user's GitHub repos
   */
  router.get('/repos', async (req, res) => {
    try {
      const octokit = await getOctokit();
      const { page = 1, per_page = 30, sort = 'updated', type = 'all' } = req.query;

      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        page: parseInt(page),
        per_page: parseInt(per_page),
        sort,
        type,
        direction: 'desc'
      });

      // Get linked repos to mark which are already cloned
      const linkedRepos = await prisma.gitHubRepo.findMany({
        select: { fullName: true, projectId: true }
      });
      const linkedMap = new Map(linkedRepos.map(r => [r.fullName, r.projectId]));

      // Format response
      const formattedRepos = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        pushedAt: repo.pushed_at,
        updatedAt: repo.updated_at,
        // Local status
        isLinked: linkedMap.has(repo.full_name),
        linkedProjectId: linkedMap.get(repo.full_name) || null
      }));

      res.json({
        repos: formattedRepos,
        page: parseInt(page),
        perPage: parseInt(per_page)
      });
    } catch (error) {
      console.error('Error listing GitHub repos:', error);

      if (error.message === 'GitHub not authenticated') {
        return res.status(401).json({ error: 'GitHub not authenticated' });
      }

      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/github/repos/search - Search repos
   */
  router.get('/repos/search', async (req, res) => {
    try {
      const octokit = await getOctokit();
      const { q, page = 1, per_page = 30 } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query required' });
      }

      // Get current user to search their repos
      const settings = await prisma.gitHubSettings.findUnique({
        where: { id: 'default' }
      });

      const { data } = await octokit.search.repos({
        q: `${q} user:${settings.username}`,
        page: parseInt(page),
        per_page: parseInt(per_page),
        sort: 'updated'
      });

      // Get linked repos
      const linkedRepos = await prisma.gitHubRepo.findMany({
        select: { fullName: true, projectId: true }
      });
      const linkedMap = new Map(linkedRepos.map(r => [r.fullName, r.projectId]));

      const formattedRepos = data.items.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        language: repo.language,
        isLinked: linkedMap.has(repo.full_name),
        linkedProjectId: linkedMap.get(repo.full_name) || null
      }));

      res.json({
        repos: formattedRepos,
        total: data.total_count,
        page: parseInt(page),
        perPage: parseInt(per_page)
      });
    } catch (error) {
      console.error('Error searching GitHub repos:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PROJECT LINK ENDPOINTS ====================

  /**
   * GET /api/github/projects/:projectId - Get linked repo for project
   */
  router.get('/projects/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.json({ linked: false });
      }

      // Get latest workflow runs
      let workflowRuns = [];
      try {
        workflowRuns = await prisma.gitHubWorkflowRun.findMany({
          where: { repoId: project.githubRepo.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
      } catch (e) {
        // Workflow runs are optional
      }

      res.json({
        linked: true,
        repo: {
          ...project.githubRepo,
          workflowRuns
        }
      });
    } catch (error) {
      console.error('Error getting project GitHub info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/github/projects/:projectId/link - Link existing repo to project
   */
  router.post('/projects/:projectId/link', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { owner, repo } = req.body;

      if (!owner || !repo) {
        return res.status(400).json({ error: 'Owner and repo required' });
      }

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.githubRepo) {
        return res.status(400).json({ error: 'Project already linked to a repo' });
      }

      const octokit = await getOctokit();

      // Get repo details from GitHub
      const { data: repoData } = await octokit.repos.get({ owner, repo });

      // Set up remote in local git
      const projectPath = project.path;
      try {
        // Check if git repo exists
        await execGit(['rev-parse', '--git-dir'], projectPath);

        // Add or update remote
        try {
          await execGit(['remote', 'add', 'origin', repoData.clone_url], projectPath);
        } catch (e) {
          // Remote might already exist, update it
          await execGit(['remote', 'set-url', 'origin', repoData.clone_url], projectPath);
        }
      } catch (e) {
        // Not a git repo, initialize it
        await execGit(['init'], projectPath);
        await execGit(['remote', 'add', 'origin', repoData.clone_url], projectPath);
      }

      // Create link in database
      const githubRepo = await prisma.gitHubRepo.create({
        data: {
          projectId: project.id,
          owner: repoData.owner.login,
          repoName: repoData.name,
          fullName: repoData.full_name,
          description: repoData.description,
          url: repoData.url,
          htmlUrl: repoData.html_url,
          cloneUrl: repoData.clone_url,
          sshUrl: repoData.ssh_url,
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private,
          language: repoData.language
        }
      });

      // Update sync status
      try {
        await updateSyncStatus(githubRepo.id, projectPath);
      } catch (e) {
        // Sync status update is optional
      }

      res.json({
        success: true,
        repo: githubRepo
      });
    } catch (error) {
      console.error('Error linking GitHub repo:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/github/projects/:projectId/create - Create new repo and link
   */
  router.post('/projects/:projectId/create', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, description, isPrivate = true, autoInit = false } = req.body;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.githubRepo) {
        return res.status(400).json({ error: 'Project already linked to a repo' });
      }

      const octokit = await getOctokit();

      // Create repo on GitHub
      const { data: repoData } = await octokit.repos.createForAuthenticatedUser({
        name: name || project.name,
        description,
        private: isPrivate,
        auto_init: autoInit
      });

      // Set up remote in local git
      const projectPath = project.path;
      try {
        // Check if git repo exists
        await execGit(['rev-parse', '--git-dir'], projectPath);

        // Check if there are any commits
        try {
          await execGit(['rev-parse', 'HEAD'], projectPath);
        } catch (e) {
          // Git repo exists but has no commits - create initial commit
          await execGit(['add', '.'], projectPath);
          await execGit(['commit', '-m', 'Initial commit'], projectPath);
        }
      } catch (e) {
        // Initialize git repo from scratch
        await execGit(['init'], projectPath);
        await execGit(['add', '.'], projectPath);
        await execGit(['commit', '-m', 'Initial commit'], projectPath);
      }

      // Add remote
      try {
        await execGit(['remote', 'add', 'origin', repoData.clone_url], projectPath);
      } catch (e) {
        await execGit(['remote', 'set-url', 'origin', repoData.clone_url], projectPath);
      }

      // Set default branch
      try {
        await execGit(['branch', '-M', repoData.default_branch], projectPath);
      } catch (e) {
        // Branch might already be named correctly
      }

      // Push to remote
      await execGit(['push', '-u', 'origin', repoData.default_branch], projectPath);

      // Create link in database
      const githubRepo = await prisma.gitHubRepo.create({
        data: {
          projectId: project.id,
          owner: repoData.owner.login,
          repoName: repoData.name,
          fullName: repoData.full_name,
          description: repoData.description,
          url: repoData.url,
          htmlUrl: repoData.html_url,
          cloneUrl: repoData.clone_url,
          sshUrl: repoData.ssh_url,
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private,
          language: repoData.language,
          lastSyncStatus: 'synced',
          lastSyncedAt: new Date()
        }
      });

      res.json({
        success: true,
        repo: githubRepo
      });
    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/github/projects/:projectId - Unlink repo from project
   */
  router.delete('/projects/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { removeRemote = false } = req.query;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.status(400).json({ error: 'Project not linked to a repo' });
      }

      // Optionally remove git remote
      if (removeRemote === 'true') {
        try {
          await execGit(['remote', 'remove', 'origin'], project.path);
        } catch (e) {
          // Remote might not exist
        }
      }

      // Delete from database
      await prisma.gitHubRepo.delete({
        where: { id: project.githubRepo.id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error unlinking GitHub repo:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CLONE ENDPOINT ====================

  /**
   * POST /api/github/clone - Clone repo to new project
   */
  router.post('/clone', async (req, res) => {
    try {
      const { owner, repo, projectName } = req.body;

      if (!owner || !repo) {
        return res.status(400).json({ error: 'Owner and repo required' });
      }

      const octokit = await getOctokit();

      // Get repo details
      const { data: repoData } = await octokit.repos.get({ owner, repo });

      // Determine project name and path
      const name = projectName || repoData.name;
      const projectPath = path.join(PROJECTS_DIR, name);

      // Check if directory already exists
      try {
        await fs.access(projectPath);
        return res.status(400).json({ error: `Project directory already exists: ${name}` });
      } catch (e) {
        // Directory doesn't exist, good
      }

      // Clone the repo
      await execGit(['clone', repoData.clone_url, name], PROJECTS_DIR);

      // Create or update project in database
      const project = await prisma.project.upsert({
        where: { name },
        update: {
          path: projectPath,
          lastAccessed: new Date()
        },
        create: {
          name,
          path: projectPath,
          displayName: repoData.name,
          description: repoData.description
        }
      });

      // Create GitHub repo link
      const githubRepo = await prisma.gitHubRepo.create({
        data: {
          projectId: project.id,
          owner: repoData.owner.login,
          repoName: repoData.name,
          fullName: repoData.full_name,
          description: repoData.description,
          url: repoData.url,
          htmlUrl: repoData.html_url,
          cloneUrl: repoData.clone_url,
          sshUrl: repoData.ssh_url,
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private,
          language: repoData.language,
          lastSyncStatus: 'synced',
          lastSyncedAt: new Date()
        }
      });

      res.json({
        success: true,
        project: {
          ...project,
          githubRepo
        }
      });
    } catch (error) {
      console.error('Error cloning GitHub repo:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SYNC ENDPOINTS ====================

  /**
   * GET /api/github/projects/:projectId/status - Get sync status
   */
  router.get('/projects/:projectId/status', async (req, res) => {
    try {
      const { projectId } = req.params;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.json({ linked: false });
      }

      // Update and return status
      const status = await updateSyncStatus(project.githubRepo.id, project.path);

      res.json({
        linked: true,
        ...status,
        lastSyncedAt: new Date()
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/github/projects/:projectId/push - Push to remote
   */
  router.post('/projects/:projectId/push', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { force = false } = req.body;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.status(400).json({ error: 'Project not linked to a repo' });
      }

      const branch = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], project.path);

      const pushArgs = ['push', 'origin', branch];
      if (force) pushArgs.push('--force');

      await execGit(pushArgs, project.path);

      // Update sync status
      await updateSyncStatus(project.githubRepo.id, project.path);

      res.json({ success: true, branch });
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/github/projects/:projectId/pull - Pull from remote
   */
  router.post('/projects/:projectId/pull', async (req, res) => {
    try {
      const { projectId } = req.params;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.status(400).json({ error: 'Project not linked to a repo' });
      }

      const branch = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], project.path);

      await execGit(['pull', 'origin', branch], project.path);

      // Update sync status
      await updateSyncStatus(project.githubRepo.id, project.path);

      res.json({ success: true, branch });
    } catch (error) {
      console.error('Error pulling from GitHub:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/github/projects/:projectId/fetch - Fetch from remote
   */
  router.post('/projects/:projectId/fetch', async (req, res) => {
    try {
      const { projectId } = req.params;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.status(400).json({ error: 'Project not linked to a repo' });
      }

      await execGit(['fetch', 'origin'], project.path);

      // Update sync status
      const status = await updateSyncStatus(project.githubRepo.id, project.path);

      res.json({ success: true, ...status });
    } catch (error) {
      console.error('Error fetching from GitHub:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CI/CD ENDPOINTS ====================

  /**
   * GET /api/github/projects/:projectId/workflows - List workflows
   */
  router.get('/projects/:projectId/workflows', async (req, res) => {
    try {
      const { projectId } = req.params;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.status(400).json({ error: 'Project not linked to a repo' });
      }

      const octokit = await getOctokit();

      const { data } = await octokit.actions.listRepoWorkflows({
        owner: project.githubRepo.owner,
        repo: project.githubRepo.repoName
      });

      res.json({
        workflows: data.workflows.map(w => ({
          id: w.id,
          name: w.name,
          path: w.path,
          state: w.state,
          htmlUrl: w.html_url
        }))
      });
    } catch (error) {
      console.error('Error listing workflows:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/github/projects/:projectId/runs - Recent workflow runs
   */
  router.get('/projects/:projectId/runs', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { per_page = 10 } = req.query;

      const project = await getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.githubRepo) {
        return res.status(400).json({ error: 'Project not linked to a repo' });
      }

      const octokit = await getOctokit();

      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        owner: project.githubRepo.owner,
        repo: project.githubRepo.repoName,
        per_page: parseInt(per_page)
      });

      // Update database with latest runs
      for (const run of data.workflow_runs) {
        await prisma.gitHubWorkflowRun.upsert({
          where: {
            repoId_runId: {
              repoId: project.githubRepo.id,
              runId: BigInt(run.id)
            }
          },
          update: {
            status: run.status,
            conclusion: run.conclusion,
            updatedAt: new Date()
          },
          create: {
            repoId: project.githubRepo.id,
            workflowId: run.workflow_id,
            workflowName: run.name,
            runId: BigInt(run.id),
            runNumber: run.run_number,
            event: run.event,
            status: run.status,
            conclusion: run.conclusion,
            headBranch: run.head_branch,
            headSha: run.head_sha,
            htmlUrl: run.html_url,
            startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
            completedAt: run.updated_at ? new Date(run.updated_at) : null,
            createdAt: new Date(run.created_at)
          }
        });
      }

      res.json({
        runs: data.workflow_runs.map(run => ({
          id: run.id,
          name: run.name,
          runNumber: run.run_number,
          event: run.event,
          status: run.status,
          conclusion: run.conclusion,
          headBranch: run.head_branch,
          headSha: run.head_sha.substring(0, 7),
          htmlUrl: run.html_url,
          createdAt: run.created_at,
          updatedAt: run.updated_at
        }))
      });
    } catch (error) {
      console.error('Error listing workflow runs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
