/**
 * Tests for Response Schemas
 * Phase 5.3: Test coverage for Zod response validation schemas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  // Common schemas
  paginatedResponseSchema,
  errorResponseSchema,
  healthResponseSchema,

  // System schemas
  systemStatsSchema,
  settingsSchema,

  // Project schemas
  projectSchema,
  projectExtendedSchema,
  projectsListSchema,
  projectsExtendedListSchema,

  // Session schemas
  tagSchema,
  folderSchema,
  sessionSchema,
  sessionsListSchema,
  foldersListSchema,
  tagsListSchema,

  // Docker schemas
  dockerContainerSchema,
  dockerContainersSchema,
  dockerImageSchema,
  dockerImagesSchema,
  dockerVolumeSchema,
  dockerVolumesSchema,

  // Infrastructure schemas
  serviceSchema,
  servicesListSchema,
  processSchema,
  processesResponseSchema,
  packageSchema,
  packagesResponseSchema,
  networkInterfaceSchema,
  networkInterfacesSchema,
  portSchema,
  portsStatusSchema,

  // Firewall schemas
  firewallStatusSchema,
  firewallRuleSchema,
  firewallRulesSchema,

  // Git schemas
  gitStatusSchema,
  gitCommitSchema,
  gitCommitsSchema,
  gitBranchSchema,
  gitBranchesSchema,
  gitDiffSchema,

  // GitHub schemas
  githubRepoSchema,
  githubReposSchema,
  githubRunSchema,
  githubRunsSchema,

  // AI schemas
  aiUsageSchema,
  personaSchema,
  personasListSchema,

  // Agent schemas
  agentSchema,
  agentsListSchema,
  agentExecutionSchema,
  agentExecutionsSchema,
  marketplaceAgentSchema,
  marketplaceAgentsSchema,

  // Content schemas
  promptSchema,
  promptsListSchema,
  snippetSchema,
  snippetsListSchema,
  shortcutSchema,
  shortcutsListSchema,

  // Dashboard schemas
  dashboardDataSchema,

  // Notes schemas
  noteSchema,
  notesListSchema,
  commentSchema,
  commentsListSchema,

  // Metrics schemas
  metricDataPointSchema,
  metricsResponseSchema,

  // Scheduled tasks schemas
  scheduledTaskSchema,
  scheduledTasksSchema,

  // MCP schemas
  mcpServerSchema,
  mcpServersSchema,

  // Cloudflare schemas
  cloudflareTunnelStatusSchema,
  dnsRecordSchema,
  dnsRecordsSchema,

  // Authentik schemas
  authentikUserSchema,
  authentikUsersSchema,

  // AI Assistant schemas
  codePuppyStatusSchema,
  aiderStatusSchema,
  tabbyStatusSchema,

  // Helper functions
  validateResponse,
  withValidation,
  schemas,
} from './responseSchemas';

// =============================================================================
// Common/Shared Schemas Tests
// =============================================================================

describe('responseSchemas', () => {
  describe('paginatedResponseSchema', () => {
    const itemSchema = projectSchema;
    const schema = paginatedResponseSchema(itemSchema);

    it('should validate a complete paginated response', () => {
      const data = {
        items: [{ name: 'test', path: '/test' }],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      };
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal paginated response', () => {
      const data = {
        items: [],
        total: 0,
      };
      expect(schema.safeParse(data).success).toBe(true);
    });

    it('should reject negative total', () => {
      const data = {
        items: [],
        total: -1,
      };
      expect(schema.safeParse(data).success).toBe(false);
    });
  });

  describe('errorResponseSchema', () => {
    it('should validate error response with all fields', () => {
      const data = {
        error: 'Not Found',
        message: 'Resource not found',
        details: { id: 123 },
        requestId: 'req-123',
      };
      expect(errorResponseSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal error response', () => {
      const data = { error: 'Error' };
      expect(errorResponseSchema.safeParse(data).success).toBe(true);
    });

    it('should reject missing error field', () => {
      const data = { message: 'Error' };
      expect(errorResponseSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('healthResponseSchema', () => {
    it('should validate healthy status without checks', () => {
      const data = {
        status: 'healthy',
        version: '1.0.0',
        uptime: 3600,
      };
      expect(healthResponseSchema.safeParse(data).success).toBe(true);
    });

    it('should validate degraded status', () => {
      const data = { status: 'degraded' };
      expect(healthResponseSchema.safeParse(data).success).toBe(true);
    });

    it('should validate unhealthy status', () => {
      const data = { status: 'unhealthy' };
      expect(healthResponseSchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid status', () => {
      const data = { status: 'unknown' };
      expect(healthResponseSchema.safeParse(data).success).toBe(false);
    });
  });

  // =============================================================================
  // System/Stats Schemas Tests
  // =============================================================================

  describe('systemStatsSchema', () => {
    it('should validate complete system stats', () => {
      const data = {
        cpu: 45.5,
        memory: { used: 8000, total: 16000, percent: 50, free: 8000 },
        disk: { used: 100000, total: 500000, percent: 20, free: 400000 },
        uptime: 86400,
        loadAvg: [1.5, 1.2, 0.9],
        hostname: 'server1',
        platform: 'linux',
        arch: 'x64',
      };
      expect(systemStatsSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal system stats', () => {
      const data = {
        cpu: 0,
        memory: { used: 0, total: 1, percent: 0 },
        disk: { used: 0, total: 1, percent: 0 },
        uptime: 0,
      };
      expect(systemStatsSchema.safeParse(data).success).toBe(true);
    });

    it('should reject cpu over 100', () => {
      const data = {
        cpu: 150,
        memory: { used: 0, total: 1, percent: 0 },
        disk: { used: 0, total: 1, percent: 0 },
        uptime: 0,
      };
      expect(systemStatsSchema.safeParse(data).success).toBe(false);
    });

    it('should reject negative cpu', () => {
      const data = {
        cpu: -10,
        memory: { used: 0, total: 1, percent: 0 },
        disk: { used: 0, total: 1, percent: 0 },
        uptime: 0,
      };
      expect(systemStatsSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('settingsSchema', () => {
    it('should validate complete settings', () => {
      const data = {
        appName: 'Console.web',
        theme: 'dark',
        autoReconnect: true,
        showExperimentalFeatures: false,
        defaultProjectPath: '/home/user/projects',
        terminalFontSize: 14,
        terminalLineHeight: 1.5,
      };
      expect(settingsSchema.safeParse(data).success).toBe(true);
    });

    it('should allow additional settings (passthrough)', () => {
      const data = {
        theme: 'dark',
        customSetting: 'value',
      };
      const result = settingsSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.customSetting).toBe('value');
    });
  });

  // =============================================================================
  // Project Schemas Tests
  // =============================================================================

  describe('projectSchema', () => {
    it('should validate complete project', () => {
      const data = {
        name: 'my-project',
        path: '/home/user/projects/my-project',
        hasClaudeMd: true,
        hasTmuxSession: false,
        lastAccessed: '2024-01-15T10:30:00.000Z',
        isFavorite: true,
      };
      expect(projectSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal project', () => {
      const data = {
        name: 'test',
        path: '/test',
      };
      expect(projectSchema.safeParse(data).success).toBe(true);
    });

    it('should allow null lastAccessed', () => {
      const data = {
        name: 'test',
        path: '/test',
        lastAccessed: null,
      };
      expect(projectSchema.safeParse(data).success).toBe(true);
    });

    it('should reject missing name', () => {
      const data = { path: '/test' };
      expect(projectSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('projectExtendedSchema', () => {
    it('should validate extended project with all fields', () => {
      const data = {
        name: 'my-project',
        path: '/home/user/projects/my-project',
        completion: 75,
        hasReadme: true,
        hasPackageJson: true,
        hasGit: true,
        hasCICD: true,
        hasTests: true,
        port: 3000,
        techStack: ['React', 'Node.js', 'PostgreSQL'],
      };
      expect(projectExtendedSchema.safeParse(data).success).toBe(true);
    });

    it('should reject completion over 100', () => {
      const data = {
        name: 'test',
        path: '/test',
        completion: 150,
      };
      expect(projectExtendedSchema.safeParse(data).success).toBe(false);
    });

    it('should allow null port', () => {
      const data = {
        name: 'test',
        path: '/test',
        port: null,
      };
      expect(projectExtendedSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('projectsListSchema', () => {
    it('should validate list of projects', () => {
      const data = [
        { name: 'project1', path: '/p1' },
        { name: 'project2', path: '/p2' },
      ];
      expect(projectsListSchema.safeParse(data).success).toBe(true);
    });

    it('should validate empty list', () => {
      expect(projectsListSchema.safeParse([]).success).toBe(true);
    });
  });

  // =============================================================================
  // Session Schemas Tests
  // =============================================================================

  describe('tagSchema', () => {
    it('should validate tag', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'important',
        color: '#ff0000',
      };
      expect(tagSchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const data = { id: 'invalid', name: 'tag' };
      expect(tagSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('folderSchema', () => {
    it('should validate folder with parent', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'subfolder',
        parentId: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      expect(folderSchema.safeParse(data).success).toBe(true);
    });

    it('should validate folder with null parent', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'root-folder',
        parentId: null,
      };
      expect(folderSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('sessionSchema', () => {
    it('should validate complete session', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'my-session',
        displayName: 'My Session',
        projectId: '550e8400-e29b-41d4-a716-446655440001',
        folderId: '550e8400-e29b-41d4-a716-446655440002',
        isArchived: false,
        isPinned: true,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T11:00:00.000Z',
        lastActiveAt: '2024-01-15T11:00:00.000Z',
        tags: [{ id: '550e8400-e29b-41d4-a716-446655440003', name: 'work' }],
        project: { name: 'test', path: '/test' },
      };
      expect(sessionSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal session', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'session',
      };
      expect(sessionSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Docker Schemas Tests
  // =============================================================================

  describe('dockerContainerSchema', () => {
    it('should validate complete container', () => {
      const data = {
        Id: 'abc123def456',
        Names: ['/my-container'],
        Image: 'nginx:latest',
        ImageID: 'sha256:abc123',
        State: 'running',
        Status: 'Up 2 hours',
        Ports: [
          { IP: '0.0.0.0', PrivatePort: 80, PublicPort: 8080, Type: 'tcp' },
        ],
      };
      expect(dockerContainerSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal container', () => {
      const data = {
        Id: 'abc123',
        Names: ['/container'],
        Image: 'ubuntu',
        State: 'exited',
        Status: 'Exited (0)',
      };
      expect(dockerContainerSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('dockerContainersSchema', () => {
    it('should handle array response', () => {
      const data = [
        { Id: '1', Names: ['/c1'], Image: 'img', State: 'running', Status: 'Up' },
      ];
      const result = dockerContainersSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle object response with containers key', () => {
      const data = {
        containers: [
          { Id: '1', Names: ['/c1'], Image: 'img', State: 'running', Status: 'Up' },
        ],
      };
      const result = dockerContainersSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('dockerImageSchema', () => {
    it('should validate image', () => {
      const data = {
        Id: 'sha256:abc123',
        RepoTags: ['nginx:latest', 'nginx:1.25'],
        RepoDigests: ['nginx@sha256:abc'],
        Size: 187000000,
        VirtualSize: 187000000,
      };
      expect(dockerImageSchema.safeParse(data).success).toBe(true);
    });

    it('should allow null RepoTags', () => {
      const data = {
        Id: 'sha256:abc',
        RepoTags: null,
      };
      expect(dockerImageSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('dockerVolumesSchema', () => {
    it('should transform volumes response', () => {
      const data = {
        Volumes: [
          { Name: 'vol1', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/vol1' },
        ],
        Warnings: null,
      };
      const result = dockerVolumesSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].Name).toBe('vol1');
    });

    it('should handle null Volumes', () => {
      const data = { Volumes: null };
      const result = dockerVolumesSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // =============================================================================
  // Infrastructure Schemas Tests
  // =============================================================================

  describe('serviceSchema', () => {
    it('should validate service', () => {
      const data = {
        name: 'nginx',
        status: 'active',
        enabled: true,
        description: 'NGINX web server',
        activeState: 'active',
        subState: 'running',
      };
      expect(serviceSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('processSchema', () => {
    it('should validate process with number pid', () => {
      const data = {
        pid: 1234,
        user: 'root',
        cpu: 5.5,
        memory: 2.3,
        command: '/usr/bin/node',
      };
      expect(processSchema.safeParse(data).success).toBe(true);
    });

    it('should validate process with string pid', () => {
      const data = {
        pid: '1234',
        user: 'www-data',
        cpu: 0,
        memory: 0.5,
        command: 'nginx: worker',
      };
      expect(processSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('processesResponseSchema', () => {
    it('should validate processes response', () => {
      const data = {
        processes: [
          { pid: 1, user: 'root', cpu: 0, memory: 0.1, command: 'init' },
        ],
        total: 1,
      };
      expect(processesResponseSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('networkInterfaceSchema', () => {
    it('should validate network interface', () => {
      const data = {
        name: 'eth0',
        addresses: [
          { address: '192.168.1.100', netmask: '255.255.255.0', family: 'IPv4' },
        ],
        mac: '00:11:22:33:44:55',
        internal: false,
        rx_bytes: 1000000,
        tx_bytes: 500000,
      };
      expect(networkInterfaceSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('portSchema', () => {
    it('should validate port with string process', () => {
      const data = {
        port: 8080,
        protocol: 'tcp',
        status: 'in_use',
        process: 'node',
        name: 'Console.web',
      };
      expect(portSchema.safeParse(data).success).toBe(true);
    });

    it('should validate port with object process', () => {
      const data = {
        port: 3000,
        status: 'in_use',
        process: { name: 'node', pid: 1234 },
      };
      expect(portSchema.safeParse(data).success).toBe(true);
    });

    it('should validate port with null process', () => {
      const data = {
        port: 9999,
        status: 'available',
        process: null,
      };
      expect(portSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Firewall Schemas Tests
  // =============================================================================

  describe('firewallStatusSchema', () => {
    it('should validate active status', () => {
      const data = {
        status: 'active',
        enabled: true,
        defaultIncoming: 'deny',
        defaultOutgoing: 'allow',
      };
      expect(firewallStatusSchema.safeParse(data).success).toBe(true);
    });

    it('should validate inactive status', () => {
      const data = { status: 'inactive' };
      expect(firewallStatusSchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid status', () => {
      const data = { status: 'unknown' };
      expect(firewallStatusSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('firewallRuleSchema', () => {
    it('should validate complete rule', () => {
      const data = {
        number: 1,
        to: '22/tcp',
        action: 'ALLOW',
        from: 'Anywhere',
        port: 22,
        protocol: 'tcp',
        v6: false,
      };
      expect(firewallRuleSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal rule', () => {
      const data = { to: '80', action: 'ALLOW' };
      expect(firewallRuleSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Git Schemas Tests
  // =============================================================================

  describe('gitStatusSchema', () => {
    it('should validate complete git status', () => {
      const data = {
        branch: 'main',
        ahead: 2,
        behind: 0,
        staged: ['file1.js'],
        unstaged: ['file2.js'],
        untracked: ['file3.js'],
        hasChanges: true,
        isClean: false,
        remote: 'origin/main',
      };
      expect(gitStatusSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal git status', () => {
      const data = { branch: 'main' };
      expect(gitStatusSchema.safeParse(data).success).toBe(true);
    });

    it('should allow null remote', () => {
      const data = { branch: 'feature', remote: null };
      expect(gitStatusSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('gitCommitSchema', () => {
    it('should validate commit', () => {
      const data = {
        hash: 'abc123def456789',
        shortHash: 'abc123d',
        message: 'feat: add new feature',
        author: 'John Doe',
        date: '2024-01-15T10:30:00Z',
        email: 'john@example.com',
      };
      expect(gitCommitSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('gitBranchSchema', () => {
    it('should validate branch', () => {
      const data = {
        name: 'feature/new-thing',
        current: true,
        remote: false,
        tracking: 'origin/feature/new-thing',
      };
      expect(gitBranchSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('gitDiffSchema', () => {
    it('should validate diff', () => {
      const data = {
        diff: '--- a/file.js\n+++ b/file.js\n@@ -1 +1 @@\n-old\n+new',
        files: ['file.js'],
        additions: 1,
        deletions: 1,
      };
      expect(gitDiffSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // GitHub Schemas Tests
  // =============================================================================

  describe('githubRepoSchema', () => {
    it('should validate complete repo', () => {
      const data = {
        id: 12345,
        name: 'my-repo',
        full_name: 'user/my-repo',
        description: 'A cool project',
        private: false,
        html_url: 'https://github.com/user/my-repo',
        clone_url: 'https://github.com/user/my-repo.git',
        ssh_url: 'git@github.com:user/my-repo.git',
        default_branch: 'main',
        language: 'TypeScript',
        stargazers_count: 100,
        forks_count: 10,
        updated_at: '2024-01-15T10:30:00Z',
        pushed_at: '2024-01-15T09:00:00Z',
      };
      expect(githubRepoSchema.safeParse(data).success).toBe(true);
    });

    it('should allow null description and language', () => {
      const data = {
        id: 1,
        name: 'repo',
        full_name: 'user/repo',
        private: true,
        html_url: 'https://github.com/user/repo',
        description: null,
        language: null,
      };
      expect(githubRepoSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('githubRunSchema', () => {
    it('should validate workflow run', () => {
      const data = {
        id: 12345,
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        workflow_id: 111,
        html_url: 'https://github.com/user/repo/actions/runs/12345',
        created_at: '2024-01-15T10:30:00Z',
        head_branch: 'main',
        head_sha: 'abc123',
      };
      expect(githubRunSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // AI/Usage Schemas Tests
  // =============================================================================

  describe('aiUsageSchema', () => {
    it('should validate complete usage', () => {
      const data = {
        totalTokens: 10000,
        inputTokens: 6000,
        outputTokens: 4000,
        costEstimate: 0.15,
        period: '2024-01',
        sessions: 50,
      };
      expect(aiUsageSchema.safeParse(data).success).toBe(true);
    });

    it('should validate empty usage', () => {
      const data = {};
      expect(aiUsageSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('personaSchema', () => {
    it('should validate persona', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Code Reviewer',
        description: 'Reviews code for best practices',
        systemPrompt: 'You are a code reviewer...',
        isDefault: false,
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      expect(personaSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Agent Schemas Tests
  // =============================================================================

  describe('agentSchema', () => {
    it('should validate complete agent', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Build Watcher',
        description: 'Watches for build changes',
        trigger: 'cron',
        actions: [{ type: 'shell', command: 'npm run build' }],
        enabled: true,
        isRunning: false,
        lastRun: '2024-01-15T10:30:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(agentSchema.safeParse(data).success).toBe(true);
    });

    it('should allow null lastRun', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'New Agent',
        trigger: 'manual',
        lastRun: null,
      };
      expect(agentSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('agentExecutionSchema', () => {
    it('should validate execution', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        agentId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'success',
        startedAt: '2024-01-15T10:30:00.000Z',
        completedAt: '2024-01-15T10:31:00.000Z',
        output: 'Build completed successfully',
      };
      expect(agentExecutionSchema.safeParse(data).success).toBe(true);
    });

    it('should validate failed execution', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        agentId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'failed',
        error: 'Build failed',
      };
      expect(agentExecutionSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('marketplaceAgentSchema', () => {
    it('should validate marketplace agent', () => {
      const data = {
        id: 'backup-agent',
        name: 'Backup Agent',
        description: 'Automatically backs up project files',
        category: 'utilities',
        author: 'Console.web',
        version: '1.0.0',
        downloads: 500,
        rating: 4.5,
        isInstalled: false,
      };
      expect(marketplaceAgentSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Content Library Schemas Tests
  // =============================================================================

  describe('promptSchema', () => {
    it('should validate prompt', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Code Review',
        content: 'Please review this code for {{language}}',
        description: 'Generic code review prompt',
        category: 'review',
        variables: ['language'],
        usageCount: 25,
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      expect(promptSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('snippetSchema', () => {
    it('should validate snippet', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Git Status',
        command: 'git status',
        description: 'Check git status',
        category: 'git',
        tags: ['git', 'version-control'],
        usageCount: 100,
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      expect(snippetSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('shortcutSchema', () => {
    it('should validate shortcut', () => {
      const data = {
        action: 'openCommandPalette',
        keys: 'Ctrl+Shift+P',
        description: 'Open command palette',
        category: 'navigation',
        isCustom: false,
      };
      expect(shortcutSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Dashboard Schemas Tests
  // =============================================================================

  describe('dashboardDataSchema', () => {
    it('should validate complete dashboard data', () => {
      const data = {
        git: [{ project: 'myproject', changes: 5 }],
        commits: [{ project: 'myproject', commits: [{ hash: 'abc', message: 'test' }] }],
        ports: [{ port: 3000, status: 'in_use', process: 'node' }],
        disk: [{ path: '/home', name: 'home', used: 1000, total: 5000, percent: 20 }],
        aiUsage: { totalTokens: 1000 },
        security: [{ description: 'No issues', alertLevel: 'info' }],
      };
      expect(dashboardDataSchema.safeParse(data).success).toBe(true);
    });

    it('should validate empty dashboard data', () => {
      const data = {};
      expect(dashboardDataSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Notes/Comments Schemas Tests
  // =============================================================================

  describe('noteSchema', () => {
    it('should validate note', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Remember to fix the bug',
        sessionId: '550e8400-e29b-41d4-a716-446655440001',
        projectPath: '/home/user/project',
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      expect(noteSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('commentSchema', () => {
    it('should validate comment', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Great work!',
        author: 'John',
        sessionId: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: '2024-01-15T10:30:00.000Z',
      };
      expect(commentSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Metrics Schemas Tests
  // =============================================================================

  describe('metricsResponseSchema', () => {
    it('should validate metrics response', () => {
      const data = {
        data: [
          { timestamp: '2024-01-15T10:30:00.000Z', value: 45.5 },
          { timestamp: '2024-01-15T10:31:00.000Z', value: 42.3 },
        ],
        metric: 'cpu',
        period: '1h',
      };
      expect(metricsResponseSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Scheduled Tasks Schemas Tests
  // =============================================================================

  describe('scheduledTaskSchema', () => {
    it('should validate scheduled task', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Daily Backup',
        schedule: '0 2 * * *',
        command: 'npm run backup',
        enabled: true,
        lastRun: '2024-01-15T02:00:00.000Z',
        nextRun: '2024-01-16T02:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(scheduledTaskSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // MCP Server Schemas Tests
  // =============================================================================

  describe('mcpServerSchema', () => {
    it('should validate MCP server without env', () => {
      const data = {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Access local filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/home'],
        isInstalled: true,
        isRunning: true,
        category: 'tools',
      };
      expect(mcpServerSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal MCP server', () => {
      const data = {
        id: 'test',
        name: 'Test Server',
      };
      expect(mcpServerSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Cloudflare Schemas Tests
  // =============================================================================

  describe('cloudflareTunnelStatusSchema', () => {
    it('should validate tunnel status', () => {
      const data = {
        connected: true,
        tunnelId: 'abc-123',
        hostname: 'app.example.com',
        status: 'healthy',
        connections: 4,
      };
      expect(cloudflareTunnelStatusSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('dnsRecordSchema', () => {
    it('should validate DNS record', () => {
      const data = {
        id: 'abc123',
        name: 'app.example.com',
        type: 'CNAME',
        content: 'tunnel.cloudflare.com',
        proxied: true,
        ttl: 1,
      };
      expect(dnsRecordSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Authentik Schemas Tests
  // =============================================================================

  describe('authentikUserSchema', () => {
    it('should validate Authentik user', () => {
      const data = {
        pk: 1,
        username: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        is_active: true,
        is_superuser: true,
        groups: [{ name: 'admins' }],
        last_login: '2024-01-15T10:30:00Z',
      };
      expect(authentikUserSchema.safeParse(data).success).toBe(true);
    });

    it('should allow null last_login', () => {
      const data = {
        pk: 2,
        username: 'newuser',
        last_login: null,
      };
      expect(authentikUserSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // AI Assistant Schemas Tests
  // =============================================================================

  describe('codePuppyStatusSchema', () => {
    it('should validate Code Puppy status', () => {
      const data = {
        installed: true,
        initialized: true,
        version: '1.0.0',
        configPath: '/home/user/.config/code-puppy',
      };
      expect(codePuppyStatusSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('aiderStatusSchema', () => {
    it('should validate Aider status', () => {
      const data = {
        installed: true,
        version: '0.50.0',
        running: true,
        model: 'claude-3-opus',
      };
      expect(aiderStatusSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('tabbyStatusSchema', () => {
    it('should validate Tabby status', () => {
      const data = {
        running: true,
        containerId: 'abc123',
        version: '0.7.0',
        url: 'http://localhost:8080',
      };
      expect(tabbyStatusSchema.safeParse(data).success).toBe(true);
    });
  });

  // =============================================================================
  // Helper Function Tests
  // =============================================================================

  describe('validateResponse', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return parsed data on success', () => {
      const data = { name: 'test', path: '/test' };
      const result = validateResponse(projectSchema, data, 'test');
      expect(result).toEqual(data);
    });

    it('should return original data on validation failure', () => {
      const data = { invalid: 'data' };
      const result = validateResponse(projectSchema, data, 'test');
      expect(result).toEqual(data);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should include context in warning', () => {
      const data = { invalid: 'data' };
      validateResponse(projectSchema, data, 'projectsApi.list');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('projectsApi.list'),
        expect.anything()
      );
    });
  });

  describe('withValidation', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should wrap API method and validate response', async () => {
      const mockApiMethod = vi.fn().mockResolvedValue({ name: 'test', path: '/test' });
      const validated = withValidation(mockApiMethod, projectSchema, 'test');

      const result = await validated('arg1', 'arg2');

      expect(mockApiMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toEqual({ name: 'test', path: '/test' });
    });

    it('should still return data on validation failure', async () => {
      const mockApiMethod = vi.fn().mockResolvedValue({ invalid: 'data' });
      const validated = withValidation(mockApiMethod, projectSchema, 'test');

      const result = await validated();

      expect(result).toEqual({ invalid: 'data' });
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Schema Registry Tests
  // =============================================================================

  describe('schemas registry', () => {
    it('should export all schemas', () => {
      expect(schemas.systemStats).toBeDefined();
      expect(schemas.project).toBeDefined();
      expect(schemas.session).toBeDefined();
      expect(schemas.dockerContainer).toBeDefined();
      expect(schemas.service).toBeDefined();
      expect(schemas.firewallStatus).toBeDefined();
      expect(schemas.gitStatus).toBeDefined();
      expect(schemas.githubRepo).toBeDefined();
      expect(schemas.aiUsage).toBeDefined();
      expect(schemas.agent).toBeDefined();
      expect(schemas.prompt).toBeDefined();
      expect(schemas.dashboardData).toBeDefined();
      expect(schemas.mcpServer).toBeDefined();
      expect(schemas.cloudflareTunnelStatus).toBeDefined();
    });

    it('should have consistent schema naming', () => {
      // List schemas should end with 'List' or 's'
      expect(schemas.projectsList).toBeDefined();
      expect(schemas.sessionsList).toBeDefined();
      expect(schemas.agentsList).toBeDefined();

      // Response schemas should have 'Response' suffix where appropriate
      expect(schemas.processesResponse).toBeDefined();
      expect(schemas.metricsResponse).toBeDefined();
    });
  });
});
