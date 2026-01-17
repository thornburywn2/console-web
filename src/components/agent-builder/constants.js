/**
 * AgentBuilder Constants
 */

export const API_BASE = import.meta.env.VITE_API_URL || '';

export const DEFAULT_ACTION = { type: 'shell', config: { command: '' } };

export const DEFAULT_FORM = {
  name: '',
  description: '',
  triggerType: 'MANUAL',
  triggerConfig: {},
  actions: [DEFAULT_ACTION],
  enabled: true,
  projectId: null
};

export const ACTION_CONFIG_DEFAULTS = {
  shell: { command: '' },
  api: { url: '', method: 'GET' },
  mcp: { serverId: '', toolName: '', args: {} }
};
