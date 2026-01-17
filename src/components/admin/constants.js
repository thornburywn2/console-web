/**
 * Admin Dashboard Constants
 * Centralized tab definitions for the refactored admin interface
 */

// Main navigation tabs (in display order)
export const TABS = {
  PROJECTS: 'projects',       // Primary - project management with CLAUDE.md editor
  SETTINGS: 'settings',       // PROMOTED - was buried in Infrastructure
  AUTOMATION: 'automation',   // NEW - combines AGENTS + MCP + SCHEDULED
  SERVER: 'server',           // RENAMED from INFRASTRUCTURE
  SECURITY: 'security',       // Consolidated security features
  HISTORY: 'history',         // Session history (last)
  // Experimental (hidden by default, enable in Settings)
  DEVELOPMENT: 'development', // Dev tools - API tester, database browser, etc.
  CODE_PUPPY: 'code_puppy',   // Code Puppy AI assistant
  TABBY: 'tabby',             // Tabby code completion
  SWARM: 'swarm',             // Claude Flow multi-agent swarms
};

// Settings sub-tabs (promoted from SettingsPanel categories)
export const SETTINGS_TABS = {
  GENERAL: 'general',
  APPEARANCE: 'appearance',
  SHORTCUTS: 'shortcuts',
  PERSONAS: 'personas',
  INTEGRATIONS: 'integrations',
  AUTH: 'auth',
};

// Automation sub-tabs (combines agents, MCP, and scheduled tasks)
export const AUTOMATION_TABS = {
  AGENTS: 'agents',
  MCP: 'mcp',
  SCHEDULED: 'scheduled',
};

// Server sub-tabs (reorganized from INFRA_TABS)
export const SERVER_TABS = {
  OVERVIEW: 'overview',     // New - system overview with key metrics
  SERVICES: 'services',     // Systemd services
  DOCKER: 'docker',         // Docker containers, images, volumes
  STACK: 'stack',           // Sovereign Stack health
  PACKAGES: 'packages',     // Package management
  LOGS: 'logs',             // System logs
  PROCESSES: 'processes',   // Process management
  NETWORK: 'network',       // Network diagnostics
  AUTHENTIK: 'authentik',   // Authentik SSO management
  USERS: 'users',           // Server user management
};

// Security sub-tabs (consolidated)
export const SECURITY_TABS = {
  SCANS: 'scans',           // Security scanning dashboard
  FIREWALL: 'firewall',     // UFW firewall management
  FAIL2BAN: 'fail2ban',     // Fail2ban status
  SCAN_CONFIG: 'scan_config', // Moved from Settings > Scans
};

// Agent sub-tabs (for backward compatibility with existing AgentManager)
export const AGENT_TABS = {
  MY_AGENTS: 'my_agents',
  MARKETPLACE: 'marketplace',
};

// Legacy tab mapping for backward compatibility
export const LEGACY_TAB_MAP = {
  'infrastructure': TABS.SERVER,
  'agents': TABS.AUTOMATION,
  'mcp': TABS.AUTOMATION,
};

// Legacy sub-tab mapping
export const LEGACY_SUBTAB_MAP = {
  // Old INFRA_TABS -> new tabs/sub-tabs
  'settings': { tab: TABS.SETTINGS, subTab: SETTINGS_TABS.GENERAL },
  'scheduled': { tab: TABS.AUTOMATION, subTab: AUTOMATION_TABS.SCHEDULED },
  'security': { tab: TABS.SECURITY, subTab: SECURITY_TABS.FAIL2BAN },
  'scans': { tab: TABS.SECURITY, subTab: SECURITY_TABS.SCANS },
};

/**
 * Migrate a legacy tab value to the new structure
 * @param {string} oldTab - The old tab identifier
 * @returns {string} The new tab identifier
 */
export function migrateTab(oldTab) {
  return LEGACY_TAB_MAP[oldTab] || oldTab;
}

/**
 * Migrate a legacy sub-tab value to the new structure
 * @param {string} oldSubTab - The old sub-tab identifier
 * @returns {{ tab: string, subTab: string } | null} The new tab/sub-tab mapping or null
 */
export function migrateSubTab(oldSubTab) {
  return LEGACY_SUBTAB_MAP[oldSubTab] || null;
}

// Tab icons (emoji/unicode for consistency with existing UI)
export const TAB_ICONS = {
  [TABS.PROJECTS]: '\u{1F4C1}',      // 📁
  [TABS.SETTINGS]: '\u{2699}',       // ⚙
  [TABS.AUTOMATION]: '\u{1F916}',    // 🤖
  [TABS.SERVER]: '\u{1F5A5}',        // 🖥
  [TABS.SECURITY]: '\u{1F512}',      // 🔒
  [TABS.HISTORY]: '\u{23F3}',        // ⏳
  [TABS.DEVELOPMENT]: '\u{1F527}',   // 🔧
  [TABS.CODE_PUPPY]: '\u{1F415}',    // 🐕
  [TABS.TABBY]: '\u{1F431}',         // 🐱
  [TABS.SWARM]: '\u{1F41D}',         // 🐝
};

// Tab labels
export const TAB_LABELS = {
  [TABS.PROJECTS]: 'PROJECTS',
  [TABS.SETTINGS]: 'SETTINGS',
  [TABS.AUTOMATION]: 'AUTOMATION',
  [TABS.SERVER]: 'SERVER',
  [TABS.SECURITY]: 'SECURITY',
  [TABS.HISTORY]: 'HISTORY',
  [TABS.DEVELOPMENT]: 'DEV',
  [TABS.CODE_PUPPY]: 'CODE PUPPY',
  [TABS.TABBY]: 'TABBY',
  [TABS.SWARM]: 'SWARM',
};

// Color schemes for sub-tabs
export const SUB_TAB_COLORS = {
  default: 'hacker-green',
  cyan: 'hacker-cyan',
  purple: 'hacker-purple',
  warning: 'hacker-warning',
  blue: 'hacker-blue',
  error: 'hacker-error',
};

// Default sub-tab for each main tab
export const DEFAULT_SUB_TABS = {
  [TABS.SETTINGS]: SETTINGS_TABS.GENERAL,
  [TABS.AUTOMATION]: AUTOMATION_TABS.AGENTS,
  [TABS.SERVER]: SERVER_TABS.OVERVIEW,
  [TABS.SECURITY]: SECURITY_TABS.SCANS,
};
