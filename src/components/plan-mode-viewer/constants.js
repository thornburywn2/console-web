/**
 * PlanModeViewer Constants
 */

// Status colors and icons
export const STATUS_CONFIG = {
  PENDING: { color: 'gray', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  IN_PROGRESS: { color: 'blue', icon: 'M13 10V3L4 14h7v7l9-11h-7z', animate: true },
  COMPLETED: { color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  FAILED: { color: 'red', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  SKIPPED: { color: 'purple', icon: 'M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  BLOCKED: { color: 'orange', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
};

export const PLAN_STATUS_CONFIG = {
  PLANNING: { color: 'blue', label: 'Planning' },
  READY: { color: 'cyan', label: 'Ready' },
  EXECUTING: { color: 'yellow', label: 'Executing' },
  PAUSED: { color: 'orange', label: 'Paused' },
  COMPLETED: { color: 'green', label: 'Completed' },
  FAILED: { color: 'red', label: 'Failed' },
  CANCELLED: { color: 'gray', label: 'Cancelled' }
};
