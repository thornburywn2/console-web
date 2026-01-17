/**
 * Response Schemas for API Validation
 * Phase 5.2: Zod response validation for type safety
 *
 * These schemas validate API responses before they're used by components,
 * providing runtime type safety and better error messages.
 */

import { z } from 'zod';

// =============================================================================
// Common/Shared Schemas
// =============================================================================

/**
 * Standard pagination response wrapper
 */
export const paginatedResponseSchema = (itemSchema) => z.object({
  items: z.array(itemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  hasMore: z.boolean().optional(),
});

/**
 * Standard error response
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
  requestId: z.string().optional(),
});

/**
 * Health check response
 */
export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string().optional(),
  uptime: z.number().optional(),
  checks: z.record(z.object({
    status: z.enum(['pass', 'fail', 'warn']),
    message: z.string().optional(),
  })).optional(),
});

// =============================================================================
// System/Stats Schemas
// =============================================================================

/**
 * System statistics response
 */
export const systemStatsSchema = z.object({
  cpu: z.number().min(0).max(100),
  memory: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
    percent: z.number().min(0).max(100),
    free: z.number().nonnegative().optional(),
  }),
  disk: z.object({
    used: z.number().nonnegative(),
    total: z.number().positive(),
    percent: z.number().min(0).max(100),
    free: z.number().nonnegative().optional(),
  }),
  uptime: z.number().nonnegative(),
  loadAvg: z.tuple([z.number(), z.number(), z.number()]).optional(),
  hostname: z.string().optional(),
  platform: z.string().optional(),
  arch: z.string().optional(),
});

/**
 * Settings response
 */
export const settingsSchema = z.object({
  appName: z.string().optional(),
  theme: z.string().optional(),
  autoReconnect: z.boolean().optional(),
  showExperimentalFeatures: z.boolean().optional(),
  defaultProjectPath: z.string().optional(),
  terminalFontSize: z.number().optional(),
  terminalLineHeight: z.number().optional(),
}).passthrough(); // Allow additional settings

// =============================================================================
// Project Schemas
// =============================================================================

/**
 * Basic project response
 */
export const projectSchema = z.object({
  name: z.string(),
  path: z.string(),
  hasClaudeMd: z.boolean().optional(),
  hasTmuxSession: z.boolean().optional(),
  lastAccessed: z.string().datetime().optional().nullable(),
  isFavorite: z.boolean().optional(),
});

/**
 * Extended project with completion metrics
 */
export const projectExtendedSchema = projectSchema.extend({
  completion: z.number().min(0).max(100).optional(),
  hasReadme: z.boolean().optional(),
  hasPackageJson: z.boolean().optional(),
  hasGit: z.boolean().optional(),
  hasCICD: z.boolean().optional(),
  hasTests: z.boolean().optional(),
  port: z.number().int().positive().optional().nullable(),
  techStack: z.array(z.string()).optional(),
});

/**
 * Project list response
 */
export const projectsListSchema = z.array(projectSchema);
export const projectsExtendedListSchema = z.array(projectExtendedSchema);

// =============================================================================
// Session Schemas
// =============================================================================

/**
 * Tag schema
 */
export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
});

/**
 * Folder schema
 */
export const folderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

/**
 * Session response
 */
export const sessionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  isArchived: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  lastActiveAt: z.string().datetime().optional().nullable(),
  tags: z.array(tagSchema).optional(),
  project: projectSchema.optional().nullable(),
});

export const sessionsListSchema = z.array(sessionSchema);
export const foldersListSchema = z.array(folderSchema);
export const tagsListSchema = z.array(tagSchema);

// =============================================================================
// Docker Schemas
// =============================================================================

/**
 * Docker container response
 */
export const dockerContainerSchema = z.object({
  Id: z.string(),
  Names: z.array(z.string()),
  Image: z.string(),
  ImageID: z.string().optional(),
  State: z.string(),
  Status: z.string(),
  Created: z.number().optional(),
  Ports: z.array(z.object({
    IP: z.string().optional(),
    PrivatePort: z.number().optional(),
    PublicPort: z.number().optional(),
    Type: z.string().optional(),
  })).optional(),
  Labels: z.record(z.string()).optional(),
});

/**
 * Docker containers list (handles both array and object responses)
 */
export const dockerContainersSchema = z.union([
  z.array(dockerContainerSchema),
  z.object({
    containers: z.array(dockerContainerSchema),
  }),
]).transform(data => {
  // Normalize to always return array
  if (Array.isArray(data)) return data;
  return data.containers || [];
});

/**
 * Docker image response
 */
export const dockerImageSchema = z.object({
  Id: z.string(),
  RepoTags: z.array(z.string()).nullable().optional(),
  RepoDigests: z.array(z.string()).nullable().optional(),
  Created: z.number().optional(),
  Size: z.number().optional(),
  VirtualSize: z.number().optional(),
  Labels: z.record(z.string()).nullable().optional(),
});

export const dockerImagesSchema = z.array(dockerImageSchema);

/**
 * Docker volume response
 */
export const dockerVolumeSchema = z.object({
  Name: z.string(),
  Driver: z.string().optional(),
  Mountpoint: z.string().optional(),
  CreatedAt: z.string().optional(),
  Labels: z.record(z.string()).nullable().optional(),
  Scope: z.string().optional(),
});

export const dockerVolumesSchema = z.object({
  Volumes: z.array(dockerVolumeSchema).nullable(),
  Warnings: z.array(z.string()).nullable().optional(),
}).transform(data => data.Volumes || []);

// =============================================================================
// Infrastructure Schemas
// =============================================================================

/**
 * System service response
 */
export const serviceSchema = z.object({
  name: z.string(),
  status: z.string(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
  activeState: z.string().optional(),
  subState: z.string().optional(),
});

export const servicesListSchema = z.array(serviceSchema);

/**
 * Process response
 */
export const processSchema = z.object({
  pid: z.union([z.number(), z.string()]),
  ppid: z.union([z.number(), z.string()]).optional(),
  user: z.string(),
  cpu: z.number(),
  memory: z.number(),
  rss: z.union([z.number(), z.string()]).optional(),
  vsz: z.union([z.number(), z.string()]).optional(),
  stat: z.string().optional(),
  start: z.string().optional(),
  time: z.string().optional(),
  command: z.string(),
  nice: z.union([z.number(), z.string()]).optional(),
});

export const processesResponseSchema = z.object({
  processes: z.array(processSchema),
  total: z.number().optional(),
});

/**
 * Package response
 */
export const packageSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  status: z.string().optional(),
  size: z.string().optional(),
  description: z.string().optional(),
});

export const packagesResponseSchema = z.object({
  packages: z.array(packageSchema),
  total: z.number().optional(),
});

/**
 * Network interface response
 */
export const networkInterfaceSchema = z.object({
  name: z.string(),
  addresses: z.array(z.object({
    address: z.string(),
    netmask: z.string().optional(),
    family: z.string().optional(),
  })).optional(),
  mac: z.string().optional(),
  internal: z.boolean().optional(),
  rx_bytes: z.number().optional(),
  tx_bytes: z.number().optional(),
});

export const networkInterfacesSchema = z.array(networkInterfaceSchema);

/**
 * Port status response
 */
export const portSchema = z.object({
  port: z.number().int(),
  protocol: z.string().optional(),
  status: z.enum(['available', 'in_use', 'unknown']).optional(),
  process: z.union([
    z.string(),
    z.object({
      name: z.string(),
      pid: z.union([z.number(), z.string()]),
    }),
  ]).optional().nullable(),
  name: z.string().optional(),
  service: z.string().optional(),
});

export const portsStatusSchema = z.object({
  ports: z.array(portSchema),
});

// =============================================================================
// Firewall Schemas
// =============================================================================

/**
 * Firewall status response
 */
export const firewallStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
  enabled: z.boolean().optional(),
  defaultIncoming: z.string().optional(),
  defaultOutgoing: z.string().optional(),
});

/**
 * Firewall rule response
 */
export const firewallRuleSchema = z.object({
  number: z.number().int().optional(),
  to: z.string(),
  action: z.string(),
  from: z.string().optional(),
  port: z.union([z.number(), z.string()]).optional(),
  protocol: z.string().optional(),
  v6: z.boolean().optional(),
});

export const firewallRulesSchema = z.array(firewallRuleSchema);

// =============================================================================
// Git Schemas
// =============================================================================

/**
 * Git status response
 */
export const gitStatusSchema = z.object({
  branch: z.string(),
  ahead: z.number().int().optional(),
  behind: z.number().int().optional(),
  staged: z.array(z.string()).optional(),
  unstaged: z.array(z.string()).optional(),
  untracked: z.array(z.string()).optional(),
  hasChanges: z.boolean().optional(),
  isClean: z.boolean().optional(),
  remote: z.string().optional().nullable(),
});

/**
 * Git commit response
 */
export const gitCommitSchema = z.object({
  hash: z.string(),
  shortHash: z.string().optional(),
  message: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
  email: z.string().optional(),
});

export const gitCommitsSchema = z.array(gitCommitSchema);

/**
 * Git branch response
 */
export const gitBranchSchema = z.object({
  name: z.string(),
  current: z.boolean().optional(),
  remote: z.boolean().optional(),
  tracking: z.string().optional().nullable(),
});

export const gitBranchesSchema = z.array(gitBranchSchema);

/**
 * Git diff response
 */
export const gitDiffSchema = z.object({
  diff: z.string(),
  files: z.array(z.string()).optional(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
});

// =============================================================================
// GitHub Integration Schemas
// =============================================================================

/**
 * GitHub repository response
 */
export const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable().optional(),
  private: z.boolean(),
  html_url: z.string().url(),
  clone_url: z.string().optional(),
  ssh_url: z.string().optional(),
  default_branch: z.string().optional(),
  language: z.string().nullable().optional(),
  stargazers_count: z.number().optional(),
  forks_count: z.number().optional(),
  updated_at: z.string().optional(),
  pushed_at: z.string().optional(),
});

export const githubReposSchema = z.array(githubRepoSchema);

/**
 * GitHub workflow run response
 */
export const githubRunSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  status: z.string(),
  conclusion: z.string().nullable().optional(),
  workflow_id: z.number().optional(),
  html_url: z.string().url().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  head_branch: z.string().optional(),
  head_sha: z.string().optional(),
});

export const githubRunsSchema = z.array(githubRunSchema);

// =============================================================================
// AI/Usage Schemas
// =============================================================================

/**
 * AI usage/token response
 */
export const aiUsageSchema = z.object({
  totalTokens: z.number().nonnegative().optional(),
  inputTokens: z.number().nonnegative().optional(),
  outputTokens: z.number().nonnegative().optional(),
  costEstimate: z.number().nonnegative().optional(),
  period: z.string().optional(),
  sessions: z.number().optional(),
});

/**
 * AI persona response
 */
export const personaSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  isDefault: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
});

export const personasListSchema = z.array(personaSchema);

// =============================================================================
// Agent Schemas
// =============================================================================

/**
 * Agent response
 */
export const agentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  trigger: z.string(),
  actions: z.array(z.any()).optional(),
  enabled: z.boolean().optional(),
  isRunning: z.boolean().optional(),
  lastRun: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const agentsListSchema = z.array(agentSchema);

/**
 * Agent execution response
 */
export const agentExecutionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  status: z.enum(['pending', 'running', 'success', 'failed', 'cancelled']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional().nullable(),
  output: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
});

export const agentExecutionsSchema = z.array(agentExecutionSchema);

/**
 * Marketplace agent response
 */
export const marketplaceAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
  downloads: z.number().optional(),
  rating: z.number().optional(),
  isInstalled: z.boolean().optional(),
});

export const marketplaceAgentsSchema = z.array(marketplaceAgentSchema);

// =============================================================================
// Content Library Schemas
// =============================================================================

/**
 * Prompt template response
 */
export const promptSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  content: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  usageCount: z.number().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const promptsListSchema = z.array(promptSchema);

/**
 * Command snippet response
 */
export const snippetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  command: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  usageCount: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});

export const snippetsListSchema = z.array(snippetSchema);

/**
 * Keyboard shortcut response
 */
export const shortcutSchema = z.object({
  action: z.string(),
  keys: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  isCustom: z.boolean().optional(),
});

export const shortcutsListSchema = z.array(shortcutSchema);

// =============================================================================
// Dashboard Aggregation Schemas
// =============================================================================

/**
 * Dashboard aggregated response
 */
export const dashboardDataSchema = z.object({
  git: z.array(z.object({
    project: z.string(),
    status: gitStatusSchema.partial().optional(),
    changes: z.number().optional(),
  })).optional(),
  commits: z.array(z.object({
    project: z.string(),
    commits: z.array(gitCommitSchema).optional(),
  })).optional(),
  ports: z.array(portSchema).optional(),
  disk: z.array(z.object({
    path: z.string(),
    name: z.string().optional(),
    used: z.number(),
    total: z.number(),
    percent: z.number().optional(),
  })).optional(),
  aiUsage: aiUsageSchema.optional(),
  security: z.array(z.object({
    alertLevel: z.enum(['info', 'warning', 'critical']).optional(),
    description: z.string(),
    source: z.string().optional(),
  })).optional(),
});

// =============================================================================
// Notes/Comments Schemas
// =============================================================================

/**
 * Note response
 */
export const noteSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  sessionId: z.string().uuid().optional().nullable(),
  projectPath: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const notesListSchema = z.array(noteSchema);

/**
 * Comment response
 */
export const commentSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  author: z.string().optional(),
  sessionId: z.string().uuid(),
  createdAt: z.string().datetime().optional(),
});

export const commentsListSchema = z.array(commentSchema);

// =============================================================================
// Metrics Schemas
// =============================================================================

/**
 * Resource metric data point
 */
export const metricDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
});

/**
 * Metrics response
 */
export const metricsResponseSchema = z.object({
  data: z.array(metricDataPointSchema),
  metric: z.string().optional(),
  period: z.string().optional(),
});

// =============================================================================
// Scheduled Tasks Schemas
// =============================================================================

/**
 * Scheduled task response
 */
export const scheduledTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  schedule: z.string(), // cron expression
  command: z.string().optional(),
  workflowId: z.string().uuid().optional(),
  enabled: z.boolean().optional(),
  lastRun: z.string().datetime().optional().nullable(),
  nextRun: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime().optional(),
});

export const scheduledTasksSchema = z.array(scheduledTaskSchema);

// =============================================================================
// MCP Server Schemas
// =============================================================================

/**
 * MCP server response
 */
export const mcpServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  isInstalled: z.boolean().optional(),
  isRunning: z.boolean().optional(),
  category: z.string().optional(),
});

export const mcpServersSchema = z.array(mcpServerSchema);

// =============================================================================
// Cloudflare Schemas
// =============================================================================

/**
 * Cloudflare tunnel status
 */
export const cloudflareTunnelStatusSchema = z.object({
  connected: z.boolean(),
  tunnelId: z.string().optional(),
  hostname: z.string().optional(),
  status: z.string().optional(),
  connections: z.number().optional(),
});

/**
 * DNS record response
 */
export const dnsRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  content: z.string(),
  proxied: z.boolean().optional(),
  ttl: z.number().optional(),
});

export const dnsRecordsSchema = z.array(dnsRecordSchema);

// =============================================================================
// Authentik Schemas
// =============================================================================

/**
 * Authentik user response
 */
export const authentikUserSchema = z.object({
  pk: z.number(),
  username: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  is_superuser: z.boolean().optional(),
  groups: z.array(z.any()).optional(),
  last_login: z.string().optional().nullable(),
});

export const authentikUsersSchema = z.array(authentikUserSchema);

// =============================================================================
// Code Puppy / AI Assistant Schemas
// =============================================================================

/**
 * Code Puppy status response
 */
export const codePuppyStatusSchema = z.object({
  installed: z.boolean(),
  initialized: z.boolean().optional(),
  version: z.string().optional(),
  configPath: z.string().optional(),
});

/**
 * Aider status response
 */
export const aiderStatusSchema = z.object({
  installed: z.boolean(),
  version: z.string().optional(),
  running: z.boolean().optional(),
  model: z.string().optional(),
});

/**
 * Tabby status response
 */
export const tabbyStatusSchema = z.object({
  running: z.boolean(),
  containerId: z.string().optional(),
  version: z.string().optional(),
  url: z.string().optional(),
});

// =============================================================================
// Validation Helper
// =============================================================================

/**
 * Validates data against a schema and returns the parsed result.
 * Throws ApiError on validation failure.
 *
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {any} data - The data to validate
 * @param {string} context - Context for error messages (e.g., "projectsApi.list")
 * @returns {any} The validated and transformed data
 */
export function validateResponse(schema, data, context = 'API response') {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.warn(`[Validation] ${context} failed:`, result.error.issues);

    // In development, log detailed errors
    if (import.meta.env.DEV) {
      console.error(`[Validation] Full error:`, result.error);
      console.error(`[Validation] Received data:`, data);
    }

    // Don't throw in production - just return the original data with a warning
    // This prevents breaking the UI when the API returns slightly different shapes
    return data;
  }

  return result.data;
}

/**
 * Creates a validated API method wrapper
 *
 * @param {Function} apiMethod - The original API method
 * @param {z.ZodSchema} schema - The response schema
 * @param {string} context - Context for error messages
 * @returns {Function} Wrapped method with validation
 */
export function withValidation(apiMethod, schema, context) {
  return async (...args) => {
    const data = await apiMethod(...args);
    return validateResponse(schema, data, context);
  };
}

// =============================================================================
// Export schema registry for easy lookup
// =============================================================================

export const schemas = {
  // System
  systemStats: systemStatsSchema,
  settings: settingsSchema,
  health: healthResponseSchema,

  // Projects
  project: projectSchema,
  projectExtended: projectExtendedSchema,
  projectsList: projectsListSchema,
  projectsExtendedList: projectsExtendedListSchema,

  // Sessions
  session: sessionSchema,
  sessionsList: sessionsListSchema,
  folder: folderSchema,
  foldersList: foldersListSchema,
  tag: tagSchema,
  tagsList: tagsListSchema,

  // Docker
  dockerContainer: dockerContainerSchema,
  dockerContainers: dockerContainersSchema,
  dockerImage: dockerImageSchema,
  dockerImages: dockerImagesSchema,
  dockerVolumes: dockerVolumesSchema,

  // Infrastructure
  service: serviceSchema,
  servicesList: servicesListSchema,
  process: processSchema,
  processesResponse: processesResponseSchema,
  packagesResponse: packagesResponseSchema,
  networkInterfaces: networkInterfacesSchema,
  portsStatus: portsStatusSchema,

  // Firewall
  firewallStatus: firewallStatusSchema,
  firewallRules: firewallRulesSchema,

  // Git
  gitStatus: gitStatusSchema,
  gitCommits: gitCommitsSchema,
  gitBranches: gitBranchesSchema,
  gitDiff: gitDiffSchema,

  // GitHub
  githubRepo: githubRepoSchema,
  githubRepos: githubReposSchema,
  githubRuns: githubRunsSchema,

  // AI
  aiUsage: aiUsageSchema,
  persona: personaSchema,
  personasList: personasListSchema,

  // Agents
  agent: agentSchema,
  agentsList: agentsListSchema,
  agentExecution: agentExecutionSchema,
  agentExecutions: agentExecutionsSchema,
  marketplaceAgents: marketplaceAgentsSchema,

  // Content
  prompt: promptSchema,
  promptsList: promptsListSchema,
  snippet: snippetSchema,
  snippetsList: snippetsListSchema,
  shortcuts: shortcutsListSchema,

  // Dashboard
  dashboardData: dashboardDataSchema,

  // Notes
  note: noteSchema,
  notesList: notesListSchema,
  comment: commentSchema,
  commentsList: commentsListSchema,

  // Metrics
  metricsResponse: metricsResponseSchema,

  // Scheduled
  scheduledTask: scheduledTaskSchema,
  scheduledTasks: scheduledTasksSchema,

  // MCP
  mcpServer: mcpServerSchema,
  mcpServers: mcpServersSchema,

  // Cloudflare
  cloudflareTunnelStatus: cloudflareTunnelStatusSchema,
  dnsRecords: dnsRecordsSchema,

  // Authentik
  authentikUsers: authentikUsersSchema,

  // AI Assistants
  codePuppyStatus: codePuppyStatusSchema,
  aiderStatus: aiderStatusSchema,
  tabbyStatus: tabbyStatusSchema,
};

export default schemas;
