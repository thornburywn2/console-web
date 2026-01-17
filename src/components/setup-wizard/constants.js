/**
 * SetupWizard Constants
 * Feature definitions, presets, and theme options
 */

// LocalStorage keys
export const STORAGE_KEY = 'cw-setup-completed';
export const FEATURES_KEY = 'cw-enabled-features';
export const WIDGET_PRESET_KEY = 'cw-widget-preset';

// Feature definitions with dependencies
export const FEATURES = {
  github: {
    id: 'github',
    name: 'GitHub Integration',
    description: 'Repository management, clone, push, and CI/CD status',
    icon: '🐙',
    color: '#a855f7',
    category: 'integrations',
    defaultEnabled: true,
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Tunnels',
    description: 'One-click publish to the web with automatic DNS',
    icon: '☁️',
    color: '#f97316',
    category: 'integrations',
    defaultEnabled: true,
  },
  docker: {
    id: 'docker',
    name: 'Docker Management',
    description: 'Container lifecycle, images, volumes, and logs',
    icon: '🐳',
    color: '#3b82f6',
    category: 'infrastructure',
    defaultEnabled: true,
  },
  systemd: {
    id: 'systemd',
    name: 'System Services',
    description: 'Systemd service control and monitoring',
    icon: '⚙️',
    color: '#22c55e',
    category: 'infrastructure',
    defaultEnabled: true,
  },
  security: {
    id: 'security',
    name: 'Security Scanning',
    description: 'Pre-push hooks, secret detection, vulnerability scanning',
    icon: '🛡️',
    color: '#ef4444',
    category: 'tools',
    defaultEnabled: true,
  },
  agents: {
    id: 'agents',
    name: 'AI Agents & Marketplace',
    description: 'Automation agents and pre-built marketplace',
    icon: '🤖',
    color: '#8b5cf6',
    category: 'tools',
    defaultEnabled: true,
  },
  mcp: {
    id: 'mcp',
    name: 'MCP Server Catalog',
    description: 'Claude Code MCP server management',
    icon: '🧩',
    color: '#06b6d4',
    category: 'tools',
    defaultEnabled: true,
  },
  voice: {
    id: 'voice',
    name: 'Voice Commands',
    description: 'Speech recognition for hands-free control',
    icon: '🎤',
    color: '#ec4899',
    category: 'experimental',
    defaultEnabled: false,
  },
};

// Widget presets based on feature selection
export const WIDGET_PRESETS = {
  minimal: {
    name: 'Minimal',
    description: 'Essential widgets only',
    widgets: ['system', 'projects', 'sessions'],
  },
  developer: {
    name: 'Developer',
    description: 'Focus on development workflows',
    widgets: ['system', 'projects', 'projectInfo', 'github', 'sessions'],
  },
  devops: {
    name: 'DevOps',
    description: 'Full infrastructure control',
    widgets: ['system', 'projects', 'projectInfo', 'github', 'cloudflare', 'docker', 'ports', 'sessions'],
  },
  custom: {
    name: 'Custom',
    description: 'Choose your own widgets',
    widgets: [],
  },
};

// Theme options
export const THEMES = [
  { id: 'default', name: 'Emerald Dark', preview: 'linear-gradient(135deg, #0a0c14 0%, #10b981 100%)' },
  { id: 'light', name: 'Light', preview: 'linear-gradient(135deg, #f8f9fb 0%, #0d9488 100%)' },
  { id: 'ocean', name: 'Ocean', preview: 'linear-gradient(135deg, #0c1929 0%, #0891b2 100%)' },
  { id: 'cyberpunk', name: 'Cyberpunk', preview: 'linear-gradient(135deg, #0f1419 0%, #22d3ee 100%)' },
  { id: 'dracula', name: 'Dracula', preview: 'linear-gradient(135deg, #282a36 0%, #bd93f9 100%)' },
  { id: 'nord', name: 'Nord', preview: 'linear-gradient(135deg, #2e3440 0%, #88c0d0 100%)' },
];
