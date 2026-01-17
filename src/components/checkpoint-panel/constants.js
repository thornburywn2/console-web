/**
 * CheckpointPanel Constants
 */

export const CHECKPOINT_TYPES = {
  MANUAL: { label: 'Manual', icon: '📍', color: 'text-blue-400' },
  AUTO_PERIODIC: { label: 'Auto', icon: '⏰', color: 'text-gray-400' },
  PRE_OPERATION: { label: 'Pre-op', icon: '⚠️', color: 'text-yellow-400' },
  POST_COMMIT: { label: 'Commit', icon: '📝', color: 'text-green-400' },
  SESSION_START: { label: 'Session', icon: '▶️', color: 'text-cyan-400' },
  SESSION_END: { label: 'End', icon: '⏹️', color: 'text-purple-400' },
  ERROR_RECOVERY: { label: 'Error', icon: '🔴', color: 'text-red-400' },
};
