/**
 * AgentManager Utility Functions
 */

export function getTriggerCategory(triggerType) {
  if (triggerType?.startsWith('GIT_')) return 'git';
  if (triggerType === 'FILE_CHANGE') return 'file';
  if (triggerType?.startsWith('SESSION_')) return 'session';
  if (triggerType?.startsWith('SYSTEM_')) return 'system';
  return 'manual';
}
