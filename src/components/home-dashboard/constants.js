/**
 * HomeDashboard Constants
 * Widget types, sizes, and layout configuration
 */

// LocalStorage keys
export const LAST_ACCESSED_KEY = 'cw-last-accessed';
export const DASHBOARD_LAYOUT_KEY = 'cw-dashboard-layout';

// Widget type configurations
export const WIDGET_TYPES = {
  quickStats: {
    title: 'Quick Stats',
    icon: '📊',
    description: 'Projects, sessions, containers overview',
    color: '#06b6d4',
    defaultSize: 'full',
    row: 'top',
  },
  gitStatus: {
    title: 'Git Status',
    icon: '🔀',
    description: 'Repos with uncommitted changes',
    color: '#f59e0b',
    defaultSize: 'medium',
  },
  activeSessions: {
    title: 'Active Sessions',
    icon: '💻',
    description: 'Running terminal sessions',
    color: '#22c55e',
    defaultSize: 'medium',
  },
  recentProjects: {
    title: 'Recent Projects',
    icon: '📁',
    description: 'Recently accessed projects',
    color: '#8b5cf6',
    defaultSize: 'large',
  },
  recentCommits: {
    title: 'Recent Commits',
    icon: '📝',
    description: 'Latest git commits',
    color: '#ec4899',
    defaultSize: 'medium',
  },
  docker: {
    title: 'Docker',
    icon: '🐳',
    description: 'Container status',
    color: '#3b82f6',
    defaultSize: 'medium',
  },
  activePorts: {
    title: 'Active Ports',
    icon: '🔌',
    description: 'Listening ports and services',
    color: '#14b8a6',
    defaultSize: 'medium',
  },
  aiUsage: {
    title: 'AI Usage',
    icon: '🤖',
    description: 'Token usage and costs',
    color: '#a855f7',
    defaultSize: 'small',
  },
  diskUsage: {
    title: 'Disk Usage',
    icon: '💾',
    description: 'Project storage consumption',
    color: '#f97316',
    defaultSize: 'medium',
  },
  projectHealth: {
    title: 'Project Health',
    icon: '❤️',
    description: 'Health scores by project',
    color: '#ef4444',
    defaultSize: 'medium',
  },
  techStack: {
    title: 'Tech Stack',
    icon: '🛠️',
    description: 'Technologies across projects',
    color: '#6366f1',
    defaultSize: 'medium',
  },
  securityAlerts: {
    title: 'Security Alerts',
    icon: '🛡️',
    description: 'Vulnerability warnings',
    color: '#dc2626',
    defaultSize: 'small',
  },
};

// Size configurations
export const SIZE_OPTIONS = {
  small: { label: 'S', maxHeight: 150 },
  medium: { label: 'M', maxHeight: 250 },
  large: { label: 'L', maxHeight: 400 },
  full: { label: 'F', maxHeight: null },
};

// Default layout
export const DEFAULT_LAYOUT = [
  { id: 'quickStats', type: 'quickStats', size: 'full' },
  { id: 'gitStatus', type: 'gitStatus', size: 'medium' },
  { id: 'activeSessions', type: 'activeSessions', size: 'medium' },
  { id: 'recentProjects', type: 'recentProjects', size: 'large' },
  { id: 'recentCommits', type: 'recentCommits', size: 'medium' },
  { id: 'docker', type: 'docker', size: 'medium' },
  { id: 'activePorts', type: 'activePorts', size: 'medium' },
  { id: 'aiUsage', type: 'aiUsage', size: 'small' },
  { id: 'diskUsage', type: 'diskUsage', size: 'medium' },
  { id: 'projectHealth', type: 'projectHealth', size: 'medium' },
  { id: 'techStack', type: 'techStack', size: 'medium' },
];
