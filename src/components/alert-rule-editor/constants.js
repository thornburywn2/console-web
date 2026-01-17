/**
 * AlertRuleEditor Constants
 */

export const ALERT_TYPES = [
  { id: 'CPU', label: 'CPU Usage', icon: '🖥️', unit: '%' },
  { id: 'MEMORY', label: 'Memory Usage', icon: '🧠', unit: '%' },
  { id: 'DISK', label: 'Disk Usage', icon: '💾', unit: '%' },
  { id: 'SERVICE', label: 'Service Status', icon: '⚙️', unit: '' },
  { id: 'CONTAINER', label: 'Container Status', icon: '📦', unit: '' },
  { id: 'NETWORK', label: 'Network Traffic', icon: '🌐', unit: 'MB/s' },
];

export const CONDITIONS = [
  { id: 'GT', label: 'Greater than', symbol: '>' },
  { id: 'LT', label: 'Less than', symbol: '<' },
  { id: 'GTE', label: 'Greater or equal', symbol: '>=' },
  { id: 'LTE', label: 'Less or equal', symbol: '<=' },
  { id: 'EQ', label: 'Equal to', symbol: '=' },
  { id: 'NEQ', label: 'Not equal to', symbol: '!=' },
];

export const PRESETS = [
  { name: 'High CPU Alert', type: 'CPU', condition: 'GT', threshold: 80 },
  { name: 'Low Memory Alert', type: 'MEMORY', condition: 'GT', threshold: 85 },
  { name: 'Disk Space Warning', type: 'DISK', condition: 'GT', threshold: 90 },
  { name: 'Service Down', type: 'SERVICE', condition: 'EQ', threshold: 0 },
];
