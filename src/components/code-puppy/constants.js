/**
 * Code Puppy Dashboard Constants
 */

export const API_URL = import.meta.env.VITE_API_URL || '';

export const TABS = [
  { id: 'status', label: 'Status', icon: '📊' },
  { id: 'session', label: 'Session', icon: '💻' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'models', label: 'Models', icon: '🧠' },
  { id: 'mcp', label: 'MCP', icon: '🔌' },
  { id: 'config', label: 'Config', icon: '⚙️' },
  { id: 'commands', label: 'Commands', icon: '/' }
];

export const CONFIG_TABS = ['general', 'safety', 'display', 'advanced'];

export const formatUptime = (ms) => {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};
