/**
 * Widget Dashboard Constants
 * Shared configuration for widget system
 */

export const GAP = 8; // gap between widgets

// LocalStorage keys
export const FAVORITES_KEY = 'cw-favorites';

// Get favorites from localStorage
export const getFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Height snap options for widget resizing
export const HEIGHT_SNAPS = {
  small: { label: 'S', height: 120 },
  medium: { label: 'M', height: 200 },
  large: { label: 'L', height: 320 },
  full: { label: 'F', height: 480 },
  fill: { label: '↕', height: 'auto' }, // Fill remaining space
};

// Widget type configurations
export const WIDGET_TYPES = {
  system: {
    icon: '📊',
    title: 'System',
    description: 'CPU, memory, disk usage',
    color: '#06b6d4',
    requiresProject: false,
    defaultHeight: 'medium',
  },
  projectInfo: {
    icon: '📁',
    title: 'Project Info',
    description: 'Project health and tech stack',
    color: '#8b5cf6',
    requiresProject: true,
    defaultHeight: 'medium',
  },
  github: {
    icon: '🐙',
    title: 'GitHub',
    description: 'Repository sync and actions',
    color: '#a855f7',
    requiresProject: true,
    defaultHeight: 'medium',
  },
  cloudflare: {
    icon: '☁️',
    title: 'Cloudflare',
    description: 'Tunnel publishing',
    color: '#f97316',
    requiresProject: true,
    defaultHeight: 'medium',
  },
  ports: {
    icon: '⚡',
    title: 'Ports',
    description: 'Active port management',
    color: '#22c55e',
    requiresProject: false,
    defaultHeight: 'small',
  },
  sessions: {
    icon: '💻',
    title: 'Sessions',
    description: 'Active terminal sessions',
    color: '#8b5cf6',
    requiresProject: false,
    defaultHeight: 'medium',
  },
  docker: {
    icon: '🐳',
    title: 'Docker',
    description: 'Container status',
    color: '#3b82f6',
    requiresProject: false,
    defaultHeight: 'medium',
  },
  projects: {
    icon: '📂',
    title: 'Projects',
    description: 'Favorites and project list',
    color: '#22c55e',
    requiresProject: false,
    defaultHeight: 'fill',
  },
  agents: {
    icon: '🤖',
    title: 'Agents',
    description: 'Running agents and executions',
    color: '#a855f7',
    requiresProject: false,
    defaultHeight: 'medium',
  },
};

// Default widget layouts - matches current panel order
export const DEFAULT_WIDGETS = [
  { id: 'system-1', type: 'system', title: 'System' },
  { id: 'projectInfo-1', type: 'projectInfo', title: 'Project Info' },
  { id: 'github-1', type: 'github', title: 'GitHub' },
  { id: 'cloudflare-1', type: 'cloudflare', title: 'Cloudflare' },
  { id: 'ports-1', type: 'ports', title: 'Ports' },
  { id: 'sessions-1', type: 'sessions', title: 'Sessions' },
];

// Sidebar defaults - same as panels
export const SIDEBAR_DEFAULTS = [
  { id: 'system-1', type: 'system', title: 'System' },
  { id: 'agents-1', type: 'agents', title: 'Agents' },  // Phase 3.5: Agent Observability
  { id: 'projectInfo-1', type: 'projectInfo', title: 'Project Info' },
  { id: 'github-1', type: 'github', title: 'GitHub' },
  { id: 'cloudflare-1', type: 'cloudflare', title: 'Cloudflare' },
  { id: 'ports-1', type: 'ports', title: 'Ports' },
  { id: 'sessions-1', type: 'sessions', title: 'Sessions' },
];

// Left sidebar defaults - projects widget
export const LEFT_SIDEBAR_DEFAULTS = [
  { id: 'projects-1', type: 'projects', title: 'Projects' },
];
