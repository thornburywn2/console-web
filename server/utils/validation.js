/**
 * Centralized Validation Schemas
 * Uses Zod for input validation across all API routes
 *
 * @security This module is critical for preventing injection attacks
 */

import { z } from 'zod';

// ============================================
// COMMON VALIDATORS
// ============================================

/**
 * Hostname validator - prevents injection in DNS/network operations
 * Allows: alphanumeric, dots, hyphens (standard hostname chars)
 */
export const hostnameSchema = z.string()
  .min(1, 'Hostname is required')
  .max(253, 'Hostname too long')
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
    'Invalid hostname format');

/**
 * IP address validator (IPv4)
 */
export const ipv4Schema = z.string()
  .regex(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    'Invalid IPv4 address');

/**
 * IP address validator (IPv4 or IPv6)
 */
export const ipAddressSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
    'Invalid IP address');

/**
 * Port number validator
 */
export const portSchema = z.coerce.number()
  .int()
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port cannot exceed 65535');

/**
 * Unix username validator
 */
export const unixUsernameSchema = z.string()
  .min(1, 'Username is required')
  .max(32, 'Username too long')
  .regex(/^[a-z_][a-z0-9_-]*[$]?$/,
    'Invalid username format. Must start with lowercase letter or underscore');

/**
 * Package name validator (apt/npm style)
 */
export const packageNameSchema = z.string()
  .min(1, 'Package name is required')
  .max(214, 'Package name too long')
  .regex(/^[a-zA-Z0-9._+-]+$/, 'Invalid package name');

/**
 * Safe identifier (for table names, field names, etc.)
 */
export const safeIdentifierSchema = z.string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid identifier');

/**
 * Cron schedule validator
 */
export const cronScheduleSchema = z.string()
  .regex(/^(\*|([0-5]?\d)((-[0-5]?\d)|(,[0-5]?\d)*)?)\s+(\*|([01]?\d|2[0-3])((-([01]?\d|2[0-3]))|(,([01]?\d|2[0-3]))*)?)\s+(\*|([1-9]|[12]\d|3[01])((-([1-9]|[12]\d|3[01]))|(,([1-9]|[12]\d|3[01]))*)?)\s+(\*|(1[0-2]|[1-9])((-([1-9]|1[0-2]))|(,([1-9]|1[0-2]))*)?)\s+(\*|[0-6]((-[0-6])|(,[0-6])*)?)$/,
    'Invalid cron schedule format. Expected: min hour dom month dow');

/**
 * File path validator (prevents directory traversal)
 */
export const safePathSchema = z.string()
  .min(1)
  .max(4096)
  .refine(
    (path) => !path.includes('..') && !path.includes('\0'),
    'Path traversal not allowed'
  );

// ============================================
// INFRASTRUCTURE VALIDATORS
// ============================================

/**
 * Ping request validation
 */
export const pingRequestSchema = z.object({
  host: hostnameSchema,
  count: z.coerce.number().int().min(1).max(10).default(4)
});

/**
 * DNS lookup request validation
 */
export const dnsLookupSchema = z.object({
  host: hostnameSchema,
  type: z.enum(['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA']).default('A')
});

/**
 * Port check request validation
 */
export const portCheckSchema = z.object({
  host: hostnameSchema,
  port: portSchema
});

/**
 * Kill process request validation
 */
export const killProcessSchema = z.object({
  signal: z.enum(['TERM', 'KILL', 'HUP', 'INT', 'QUIT', 'USR1', 'USR2']).default('TERM')
});

/**
 * Package install/remove validation
 */
export const packageOperationSchema = z.object({
  packageName: packageNameSchema
});

/**
 * Package remove with purge option
 */
export const packageRemoveSchema = z.object({
  packageName: packageNameSchema,
  purge: z.boolean().default(false)
});

/**
 * Fail2ban unban request validation
 */
export const fail2banUnbanSchema = z.object({
  jail: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  ip: ipv4Schema
});

/**
 * Timer toggle validation
 */
export const timerToggleSchema = z.object({
  enabled: z.boolean()
});

/**
 * Timer name validation
 */
export const timerNameSchema = z.string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9._@-]+$/, 'Invalid timer name');

/**
 * Cron job creation validation
 */
export const cronJobSchema = z.object({
  schedule: cronScheduleSchema,
  command: z.string().min(1).max(1024)
});

// ============================================
// USER MANAGEMENT VALIDATORS
// ============================================

/**
 * Create server user validation
 */
export const createServerUserSchema = z.object({
  username: unixUsernameSchema,
  fullName: z.string().max(256).optional(),
  shell: z.string().regex(/^\/[a-zA-Z0-9/_-]+$/).default('/bin/bash'),
  createHome: z.boolean().default(true),
  groups: z.array(z.string().regex(/^[a-z_][a-z0-9_-]*$/)).default([])
});

/**
 * Update server user validation
 */
export const updateServerUserSchema = z.object({
  fullName: z.string().max(256).optional(),
  shell: z.string().regex(/^\/[a-zA-Z0-9/_-]+$/).optional(),
  groups: z.array(z.string().regex(/^[a-z_][a-z0-9_-]*$/)).optional(),
  locked: z.boolean().optional()
});

/**
 * Set password validation
 */
export const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
});

// ============================================
// FIREWALL VALIDATORS
// ============================================

/**
 * Firewall rule creation validation
 */
export const firewallRuleSchema = z.object({
  action: z.enum(['allow', 'deny', 'reject', 'limit']).default('allow'),
  direction: z.enum(['in', 'out']).default('in'),
  port: z.string().regex(/^[\d/\w,-]+$/, 'Invalid port specification').optional(),
  protocol: z.enum(['tcp', 'udp']).optional(),
  from: z.string().max(253).optional(),
  to: z.string().max(253).optional(),
  comment: z.string().max(256).optional()
});

/**
 * Firewall default policy validation
 */
export const firewallDefaultSchema = z.object({
  direction: z.enum(['incoming', 'outgoing', 'routed']),
  policy: z.enum(['allow', 'deny', 'reject'])
});

/**
 * Firewall logging level validation
 */
export const firewallLoggingSchema = z.object({
  level: z.enum(['off', 'low', 'medium', 'high', 'full'])
});

// ============================================
// AUTHENTIK VALIDATORS
// ============================================

/**
 * Authentik settings validation
 */
export const authentikSettingsSchema = z.object({
  apiUrl: z.string().url().optional(),
  apiToken: z.string().min(1).optional()
});

/**
 * Create Authentik user validation
 */
export const createAuthentikUserSchema = z.object({
  username: z.string().min(1).max(150),
  name: z.string().max(256).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).max(128).optional(),
  isActive: z.boolean().default(true),
  groups: z.array(z.string()).default([])
});

/**
 * Update Authentik user validation
 */
export const updateAuthentikUserSchema = z.object({
  username: z.string().min(1).max(150).optional(),
  name: z.string().max(256).optional(),
  email: z.string().email().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  groups: z.array(z.string()).optional()
});

// ============================================
// CLOUDFLARE VALIDATORS
// ============================================

/**
 * Cloudflare settings validation
 */
export const cloudflareSettingsSchema = z.object({
  apiToken: z.string().min(1, 'API token is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  tunnelId: z.string().min(1, 'Tunnel ID is required'),
  zoneId: z.string().min(1, 'Zone ID is required'),
  zoneName: z.string().optional(),
  defaultSubdomain: z.string().optional()
});

/**
 * Publish route validation
 */
export const publishRouteSchema = z.object({
  subdomain: z.string()
    .min(1, 'Subdomain is required')
    .max(63)
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'Invalid subdomain'),
  localPort: portSchema,
  localHost: z.string().default('localhost'),
  projectId: z.string().optional(),
  description: z.string().max(256).optional(),
  enableAuthentik: z.boolean().default(true),
  websocket: z.boolean().default(false)
});

/**
 * Update route port validation
 */
export const updateRoutePortSchema = z.object({
  localPort: portSchema
});

/**
 * WebSocket toggle validation
 */
export const websocketToggleSchema = z.object({
  enabled: z.boolean()
});

// ============================================
// DATABASE BROWSER VALIDATORS
// ============================================

/**
 * Allowed SQL patterns - whitelist approach for safe queries
 * Only allows simple SELECT queries on specific patterns
 */
const ALLOWED_SQL_PATTERNS = [
  /^SELECT\s+\*\s+FROM\s+[\w"]+\s*(WHERE\s+[\w"]+\s*(=|<|>|<=|>=|<>|!=|LIKE|IN|IS\s+NULL|IS\s+NOT\s+NULL)\s*\S+\s*)?(ORDER\s+BY\s+[\w"]+\s*(ASC|DESC)?)?\s*(LIMIT\s+\d+\s*)?(OFFSET\s+\d+\s*)?$/i,
  /^SELECT\s+[\w",\s]+\s+FROM\s+[\w"]+\s*(WHERE\s+[\w"]+\s*(=|<|>|<=|>=|<>|!=|LIKE|IN|IS\s+NULL|IS\s+NOT\s+NULL)\s*\S+\s*)?(ORDER\s+BY\s+[\w"]+\s*(ASC|DESC)?)?\s*(LIMIT\s+\d+\s*)?(OFFSET\s+\d+\s*)?$/i,
  /^SELECT\s+COUNT\(\*\)\s+FROM\s+[\w"]+$/i
];

/**
 * Dangerous SQL keywords that should never appear in user queries
 */
const DANGEROUS_SQL_KEYWORDS = [
  'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'UNION', 'INTO OUTFILE',
  'LOAD_FILE', 'DUMPFILE', '--', ';', '/*', '*/', 'BENCHMARK',
  'SLEEP', 'WAITFOR', 'xp_', 'sp_', 'INFORMATION_SCHEMA'
];

/**
 * Database query validation
 * @security This is a critical security boundary
 */
export const databaseQuerySchema = z.object({
  query: z.string()
    .min(1, 'Query is required')
    .max(4096, 'Query too long')
    .transform(q => q.trim())
    .refine(
      (query) => query.toUpperCase().startsWith('SELECT'),
      'Only SELECT queries are allowed'
    )
    .refine(
      (query) => {
        const upperQuery = query.toUpperCase();
        return !DANGEROUS_SQL_KEYWORDS.some(keyword =>
          upperQuery.includes(keyword.toUpperCase())
        );
      },
      'Query contains forbidden SQL keywords'
    )
    .refine(
      (query) => !query.includes(';'),
      'Query cannot contain semicolons (no multi-statement queries)'
    )
});

/**
 * Table data request validation
 */
export const tableDataQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortColumn: safeIdentifierSchema.optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
  filter: z.string().max(256).optional()
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate request body and return result
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {unknown} data - Data to validate
 * @returns {{ success: boolean, data?: T, error?: string }}
 */
export function validateBody(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    };
  }
  return { success: true, data: result.data };
}

/**
 * Express middleware for request body validation
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const result = validateBody(schema, req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

/**
 * Express middleware for query parameter validation
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = validateBody(schema, req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

/**
 * Express middleware for route parameter validation
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = validateBody(schema, req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error
      });
    }
    req.validatedParams = result.data;
    next();
  };
}

export default {
  // Common
  hostnameSchema,
  ipv4Schema,
  ipAddressSchema,
  portSchema,
  unixUsernameSchema,
  packageNameSchema,
  safeIdentifierSchema,
  cronScheduleSchema,
  safePathSchema,

  // Infrastructure
  pingRequestSchema,
  dnsLookupSchema,
  portCheckSchema,
  killProcessSchema,
  packageOperationSchema,
  packageRemoveSchema,
  fail2banUnbanSchema,
  timerToggleSchema,
  timerNameSchema,
  cronJobSchema,

  // Users
  createServerUserSchema,
  updateServerUserSchema,
  setPasswordSchema,

  // Firewall
  firewallRuleSchema,
  firewallDefaultSchema,
  firewallLoggingSchema,

  // Authentik
  authentikSettingsSchema,
  createAuthentikUserSchema,
  updateAuthentikUserSchema,

  // Cloudflare
  cloudflareSettingsSchema,
  publishRouteSchema,
  updateRoutePortSchema,
  websocketToggleSchema,

  // Database
  databaseQuerySchema,
  tableDataQuerySchema,

  // Helpers
  validateBody,
  validateRequest,
  validateQuery,
  validateParams
};
