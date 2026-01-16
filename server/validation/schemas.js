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
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
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

const agentTriggerTypes = ['manual', 'schedule', 'file_change', 'git_event', 'session_event', 'webhook'] as const;

export const agentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  trigger: z.enum(agentTriggerTypes),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.array(z.object({
    type: z.string().min(1).max(100),
    config: z.record(z.unknown()).default({}),
    order: z.number().int().min(0).optional(),
  })).min(1).max(50),
  enabled: z.boolean().default(true),
  projectId: uuidSchema.optional(),
});

export const agentUpdateSchema = agentSchema.partial();

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
});

// =============================================================================
// TEMPLATE SCHEMAS
// =============================================================================

export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  config: z.object({
    workingDirectory: z.string().max(500).optional(),
    terminalCols: z.number().int().min(1).max(1000).optional(),
    terminalRows: z.number().int().min(1).max(500).optional(),
    initialCommands: z.array(z.string().max(1000)).max(20).optional(),
    environment: z.record(z.string().max(1000)).optional(),
  }).optional(),
  isPublic: z.boolean().default(false),
});

export const templateUpdateSchema = templateSchema.partial();

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

  // Organization
  folderSchema,
  folderUpdateSchema,
  tagSchema,
  noteSchema,
  noteUpdateSchema,
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

  // MCP
  mcpServerSchema,
  mcpServerUpdateSchema,

  // Settings
  settingsUpdateSchema,
};
