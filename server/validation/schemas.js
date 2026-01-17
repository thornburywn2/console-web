/**
 * Zod Validation Schemas
 *
 * Centralized validation schemas for all API endpoints.
 * These schemas enforce input validation per CLAUDE.md security standards.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ID parameter schema
 */
export const idSchema = z.object({
  id: uuidSchema,
});

/**
 * Standard pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Search query schema
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['all', 'sessions', 'prompts', 'snippets', 'files', 'agents']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// =============================================================================
// SESSION SCHEMAS
// =============================================================================

/**
 * Session name pattern: sp-{alphanumeric_underscore_hyphen}
 */
const sessionNamePattern = /^sp-[a-zA-Z0-9_-]+$/;

export const sessionSchema = z.object({
  name: z.string()
    .min(4)
    .max(100)
    .regex(sessionNamePattern, 'Session name must start with "sp-" followed by alphanumeric characters, underscores, or hyphens'),
  projectId: uuidSchema.optional(),
  workingDirectory: z.string().max(500).optional(),
  terminalCols: z.number().int().min(1).max(1000).default(80),
  terminalRows: z.number().int().min(1).max(500).default(24),
  folderId: uuidSchema.nullable().optional(),
  templateId: uuidSchema.optional(),
});

export const sessionUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  workingDirectory: z.string().max(500).optional(),
  folderId: uuidSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

/**
 * Session metadata update (for PATCH /:id route)
 */
export const sessionMetadataUpdateSchema = z.object({
  displayName: z.string().max(200).optional(),
  folderId: uuidSchema.nullable().optional(),
  isPinned: z.boolean().optional(),
  isTemporary: z.boolean().optional(),
});

/**
 * Session import schema
 */
export const sessionImportSchema = z.object({
  exportData: z.object({
    exportVersion: z.string().optional(),
    exportedAt: z.string().optional(),
    exportedFrom: z.string().optional(),
    session: z.object({
      displayName: z.string().max(200).optional(),
      sessionName: z.string().max(100).optional(),
      projectName: z.string().max(100).optional(),
      projectPath: z.string().max(500).optional(),
      workingDirectory: z.string().max(500).optional(),
      startedAt: z.string().optional(),
      lastActiveAt: z.string().optional(),
      status: z.string().optional(),
    }),
    organization: z.object({
      folder: z.string().max(100).nullable().optional(),
      folderColor: z.string().max(20).nullable().optional(),
      tags: z.array(z.object({
        name: z.string().max(50),
        color: z.string().max(20).optional(),
      })).optional(),
      isPinned: z.boolean().optional(),
    }).optional(),
    context: z.object({
      notes: z.array(z.object({
        title: z.string().max(200).optional(),
        content: z.string().max(100000),
        isPinned: z.boolean().optional(),
        createdAt: z.string().optional(),
      })).optional(),
      terminalState: z.record(z.unknown()).optional(),
    }).optional(),
    commandHistory: z.array(z.object({
      command: z.string().max(10000),
      output: z.string().max(100000).optional(),
      exitCode: z.number().int().nullable().optional(),
      executedAt: z.string().optional(),
      duration: z.number().optional(),
    })).optional(),
  }),
  targetProjectId: uuidSchema,
  createNotes: z.boolean().default(true),
  importHistory: z.boolean().default(false),
});

// =============================================================================
// FOLDER SCHEMAS
// =============================================================================

export const folderSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const folderUpdateSchema = folderSchema.partial();

// =============================================================================
// TAG SCHEMAS
// =============================================================================

export const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  description: z.string().max(500).nullable().optional(),
});

export const tagUpdateSchema = tagSchema.partial();

export const folderReorderSchema = z.object({
  orders: z.array(z.object({
    id: uuidSchema,
    sortOrder: z.number().int().min(0),
  })).min(1).max(100),
});

export const sessionMoveFolderSchema = z.object({
  folderId: uuidSchema.nullable(),
});

export const sessionPinSchema = z.object({
  isPinned: z.boolean().default(true),
});

export const sessionArchiveSchema = z.object({
  isArchived: z.boolean().default(true),
});

// =============================================================================
// PROMPT SCHEMAS
// =============================================================================

export const promptSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100000),  // 100KB max
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
});

export const promptUpdateSchema = promptSchema.partial();

// =============================================================================
// SNIPPET SCHEMAS
// =============================================================================

export const snippetSchema = z.object({
  title: z.string().min(1).max(200),
  command: z.string().min(1).max(10000),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  shortcut: z.string().max(50).optional(),
});

export const snippetUpdateSchema = snippetSchema.partial();

// =============================================================================
// AGENT SCHEMAS
// =============================================================================

const agentTriggerTypes = [
  // Git events
  'GIT_PRE_COMMIT', 'GIT_POST_COMMIT', 'GIT_PRE_PUSH', 'GIT_POST_MERGE', 'GIT_POST_CHECKOUT',
  // File events
  'FILE_CHANGE',
  // Session events
  'SESSION_START', 'SESSION_END', 'SESSION_ERROR', 'SESSION_IDLE', 'SESSION_RECONNECT', 'SESSION_COMMAND_COMPLETE',
  // System events
  'SYSTEM_RESOURCE', 'SYSTEM_SERVICE', 'SYSTEM_ALERT', 'SYSTEM_UPTIME',
  // Manual
  'MANUAL'
];

const agentActionTypes = ['shell', 'api', 'mcp'];

export const agentActionSchema = z.object({
  type: z.enum(agentActionTypes),
  config: z.record(z.unknown()),
  order: z.number().int().min(0).optional(),
});

export const agentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(agentTriggerTypes),
  triggerConfig: z.record(z.unknown()).nullable().optional(),
  actions: z.array(agentActionSchema).min(1).max(50),
  enabled: z.boolean().default(true),
  projectId: uuidSchema.nullable().optional(),
});

export const agentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  triggerType: z.enum(agentTriggerTypes).optional(),
  triggerConfig: z.record(z.unknown()).nullable().optional(),
  actions: z.array(agentActionSchema).min(1).max(50).optional(),
  enabled: z.boolean().optional(),
  projectId: uuidSchema.nullable().optional(),
});

// =============================================================================
// NOTE SCHEMAS
// =============================================================================

export const noteSchema = z.object({
  sessionId: uuidSchema,
  content: z.string().min(1).max(100000),
  type: z.enum(['general', 'todo', 'issue', 'decision']).default('general'),
  isPinned: z.boolean().default(false),
});

export const noteUpdateSchema = z.object({
  content: z.string().min(1).max(100000).optional(),
  type: z.enum(['general', 'todo', 'issue', 'decision']).optional(),
  isPinned: z.boolean().optional(),
  title: z.string().max(200).nullable().optional(),
});

export const noteMoveSchema = z.object({
  sessionId: uuidSchema,
});

export const notePinSchema = z.object({
  isPinned: z.boolean().default(true),
});

export const noteCreateSchema = z.object({
  sessionId: uuidSchema,
  title: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(100000),
  isPinned: z.boolean().default(false),
});

// =============================================================================
// TEMPLATE SCHEMAS
// =============================================================================

/**
 * Session template schema for creating templates
 * Used by /api/templates POST
 */
export const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  commands: z.array(z.string().max(1000)).min(1, 'Template must have at least one command').max(20),
  environment: z.record(z.string().max(1000)).nullable().optional(),
  workingDir: z.string().max(500).nullable().optional(),
});

/**
 * Session template update schema
 * Used by /api/templates PUT /:id
 */
export const templateUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  commands: z.array(z.string().max(1000)).min(1).max(20).optional(),
  environment: z.record(z.string().max(1000)).nullable().optional(),
  workingDir: z.string().max(500).nullable().optional(),
});

// =============================================================================
// ALERT SCHEMAS
// =============================================================================

export const alertSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  metric: z.string().min(1).max(100),
  condition: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'ne']),
  threshold: z.number(),
  duration: z.number().int().min(0).default(0),  // Duration in seconds before triggering
  actions: z.array(z.object({
    type: z.enum(['email', 'webhook', 'slack', 'notification']),
    config: z.record(z.unknown()),
  })).max(10).optional(),
  enabled: z.boolean().default(true),
  cooldownMinutes: z.number().int().min(0).max(1440).default(15),
});

export const alertUpdateSchema = alertSchema.partial();

// =============================================================================
// WORKFLOW SCHEMAS
// =============================================================================

export const workflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  trigger: z.object({
    type: z.enum(['manual', 'schedule', 'event']),
    config: z.record(z.unknown()).optional(),
  }),
  steps: z.array(z.object({
    id: z.string().min(1).max(50),
    type: z.string().min(1).max(100),
    name: z.string().max(100).optional(),
    config: z.record(z.unknown()).default({}),
    dependsOn: z.array(z.string().max(50)).optional(),
  })).min(1).max(50),
  enabled: z.boolean().default(true),
});

export const workflowUpdateSchema = workflowSchema.partial();

// =============================================================================
// GIT SCHEMAS
// =============================================================================

export const gitCommitSchema = z.object({
  message: z.string().min(1).max(1000),
  files: z.array(z.string().max(500)).optional(),  // If empty, commit all staged
});

export const gitBranchSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_\-./]+$/, 'Invalid branch name'),
  from: z.string().max(100).optional(),
});

// =============================================================================
// DOCKER SCHEMAS
// =============================================================================

export const dockerContainerActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'pause', 'unpause', 'kill']),
});

export const dockerExecSchema = z.object({
  cmd: z.array(z.string().max(1000)).min(1).max(20),
  workingDir: z.string().max(500).optional(),
  env: z.array(z.string().max(500)).optional(),
});

// =============================================================================
// FILE SCHEMAS
// =============================================================================

export const filePathSchema = z.object({
  path: z.string().min(1).max(1000),
});

export const fileWriteSchema = z.object({
  path: z.string().min(1).max(1000),
  content: z.string().max(10 * 1024 * 1024),  // 10MB max
  encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
});

// =============================================================================
// INFRASTRUCTURE SCHEMAS
// =============================================================================

/**
 * Service name pattern: alphanumeric with @ . - _
 */
const serviceNamePattern = /^[a-zA-Z0-9_@.\-]+$/;

export const serviceNameSchema = z.object({
  name: z.string()
    .min(1)
    .max(256)
    .regex(serviceNamePattern, 'Invalid service name'),
});

export const serviceActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'enable', 'disable']),
});

// =============================================================================
// FIREWALL SCHEMAS
// =============================================================================

export const firewallRuleSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535),
  protocol: z.enum(['tcp', 'udp', 'both']).default('tcp'),
  direction: z.enum(['in', 'out']).default('in'),
  action: z.enum(['allow', 'deny']).default('allow'),
  from: z.string().max(100).optional(),  // IP or 'any'
  comment: z.string().max(200).optional(),
});

// =============================================================================
// MCP SCHEMAS
// =============================================================================

export const mcpServerSchema = z.object({
  name: z.string().min(1).max(100),
  command: z.string().min(1).max(500),
  args: z.array(z.string().max(500)).optional(),
  env: z.record(z.string().max(1000)).optional(),
  enabled: z.boolean().default(true),
});

export const mcpServerUpdateSchema = mcpServerSchema.partial();

// =============================================================================
// SETTINGS SCHEMAS
// =============================================================================

export const settingsUpdateSchema = z.object({
  theme: z.string().max(50).optional(),
  sidebarCollapsed: z.boolean().optional(),
  terminalFontSize: z.number().int().min(8).max(32).optional(),
  notificationsEnabled: z.boolean().optional(),
  autoSaveInterval: z.number().int().min(0).max(3600).optional(),
  defaultShell: z.string().max(100).optional(),
  keyBindings: z.record(z.string().max(100)).optional(),
});

// =============================================================================
// TAG ASSIGNMENT SCHEMAS
// =============================================================================

export const tagAssignmentSchema = z.object({
  tagId: uuidSchema,
  sessionId: uuidSchema,
});

export const tagAssignmentsSchema = z.object({
  tagIds: z.array(uuidSchema).min(1).max(50),
});

// =============================================================================
// SESSION BULK ACTION SCHEMAS
// =============================================================================

export const sessionBulkActionSchema = z.object({
  sessionIds: z.array(uuidSchema).min(1).max(100),
  action: z.enum(['archive', 'restore', 'pin', 'unpin', 'delete', 'move', 'addTag']),
  folderId: uuidSchema.nullable().optional(), // Required for 'move' action
  tagId: uuidSchema.optional(), // Required for 'addTag' action
});

// =============================================================================
// SHARE / COLLABORATION SCHEMAS
// =============================================================================

export const shareCreateSchema = z.object({
  sessionId: uuidSchema,
  type: z.enum(['view', 'collaborate']).default('view'),
  expiryHours: z.number().int().min(1).max(720).optional(), // Max 30 days
  password: z.string().max(100).optional(),
});

export const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export const activityCreateSchema = z.object({
  type: z.string().min(1).max(50),
  actor: z.string().max(100).optional(),
  target: z.string().max(200).optional(),
  message: z.string().max(500).optional(),
  project: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const handoffInitSchema = z.object({
  toUserId: uuidSchema,
  reason: z.enum(['shift_end', 'vacation', 'expertise', 'other']).default('other'),
  notes: z.string().max(5000).optional(),
  includeContext: z.boolean().default(true),
});

export const handoffSchema = z.object({
  sessionId: uuidSchema,
  targetUserId: uuidSchema.optional(),
  notes: z.string().max(5000).optional(),
  context: z.object({
    currentTask: z.string().max(500).optional(),
    blockers: z.array(z.string().max(500)).max(10).optional(),
    nextSteps: z.array(z.string().max(500)).max(10).optional(),
  }).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: uuidSchema.optional(),
});

// =============================================================================
// PROJECT PATH SCHEMAS
// =============================================================================

/**
 * Valid project path pattern - prevents path traversal
 */
const projectPathPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*$/;

export const projectPathSchema = z.object({
  projectPath: z.string()
    .min(1)
    .max(500)
    .regex(projectPathPattern, 'Invalid project path - must not contain path traversal sequences'),
});

export const projectNameSchema = z.object({
  projectName: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'Invalid project name'),
});

// =============================================================================
// DEPENDENCY SCHEMAS
// =============================================================================

export const dependencyUpdateSchema = z.object({
  packageName: z.string().min(1).max(200).regex(/^[@a-z0-9][-a-z0-9._/]*$/i, 'Invalid package name'),
  version: z.string().max(50).optional(), // If not specified, update to latest
  type: z.enum(['dependencies', 'devDependencies', 'peerDependencies']).optional(),
});

export const dependencyBulkUpdateSchema = z.object({
  packages: z.array(dependencyUpdateSchema).min(1).max(100),
  projectPath: z.string().max(500),
});

export const dependencySingleUpdateSchema = z.object({
  projectPath: z.string().min(1).max(500),
  packageName: z.string().min(1).max(200).regex(/^[@a-z0-9][-a-z0-9._/]*$/i, 'Invalid package name'),
  version: z.string().max(50).optional(),
});

export const dependencyProjectSchema = z.object({
  projectPath: z.string().min(1).max(500),
});

export const auditFixSchema = z.object({
  projectPath: z.string().min(1).max(500),
  force: z.boolean().default(false),
});

// =============================================================================
// MONITORING SCHEMAS
// =============================================================================

export const uptimeCheckSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  interval: z.number().int().min(30).max(3600).default(60), // 30s to 1h
  timeout: z.number().int().min(1000).max(30000).default(5000), // 1s to 30s
  expectedStatus: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string().max(1000)).optional(),
  enabled: z.boolean().default(true),
});

// =============================================================================
// PROCESS SIGNAL SCHEMAS
// =============================================================================

export const processSignalSchema = z.object({
  pid: z.coerce.number().int().min(1),
  signal: z.enum(['SIGTERM', 'SIGKILL', 'SIGHUP', 'SIGINT']).default('SIGTERM'),
});

// =============================================================================
// EXPORT ALL SCHEMAS
// =============================================================================

export default {
  // Common
  uuidSchema,
  idSchema,
  paginationSchema,
  searchSchema,

  // Sessions
  sessionSchema,
  sessionUpdateSchema,
  sessionMetadataUpdateSchema,
  sessionBulkActionSchema,
  sessionImportSchema,

  // Organization
  folderSchema,
  folderUpdateSchema,
  folderReorderSchema,
  tagSchema,
  tagUpdateSchema,
  tagAssignmentSchema,
  tagAssignmentsSchema,
  sessionMoveFolderSchema,
  sessionPinSchema,
  sessionArchiveSchema,
  noteSchema,
  noteUpdateSchema,
  noteCreateSchema,
  noteMoveSchema,
  notePinSchema,
  templateSchema,
  templateUpdateSchema,

  // Content
  promptSchema,
  promptUpdateSchema,
  snippetSchema,
  snippetUpdateSchema,

  // Automation
  agentSchema,
  agentUpdateSchema,
  alertSchema,
  alertUpdateSchema,
  workflowSchema,
  workflowUpdateSchema,

  // Git
  gitCommitSchema,
  gitBranchSchema,

  // Docker
  dockerContainerActionSchema,
  dockerExecSchema,

  // Files
  filePathSchema,
  fileWriteSchema,

  // Infrastructure
  serviceNameSchema,
  serviceActionSchema,
  firewallRuleSchema,
  processSignalSchema,

  // MCP
  mcpServerSchema,
  mcpServerUpdateSchema,

  // Settings
  settingsUpdateSchema,

  // Collaboration
  shareCreateSchema,
  handoffSchema,
  handoffInitSchema,
  commentSchema,
  teamMemberSchema,
  activityCreateSchema,

  // Projects
  projectPathSchema,
  projectNameSchema,

  // Dependencies
  dependencyUpdateSchema,
  dependencyBulkUpdateSchema,
  dependencySingleUpdateSchema,
  dependencyProjectSchema,
  auditFixSchema,

  // Monitoring
  uptimeCheckSchema,
};
