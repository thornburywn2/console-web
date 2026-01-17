/**
 * SwarmDashboard Constants
 */

export const API_URL = import.meta.env.VITE_API_URL || '';

export const DEFAULT_SWARM_CONFIG = {
  template: '',
  agents: ['orchestrator', 'coder', 'reviewer'],
  task: '',
  model: 'claude-3-5-sonnet-20241022'
};
