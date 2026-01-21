/**
 * AgentExecutionFlow Component
 * Visual pipeline showing agent action execution with real-time streaming
 * Displays step-by-step progress, tool calls, and output
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAgentSocket, ActionStatus } from '../hooks/useAgentSocket.js';

// Action type icons and colors
const ACTION_CONFIG = {
  shell: {
    icon: '🖥️',
    label: 'Shell Command',
    color: 'cyan',
    bgClass: 'bg-cyan-500/20',
    borderClass: 'border-cyan-500/50',
    textClass: 'text-cyan-400',
  },
  api: {
    icon: '🌐',
    label: 'API Call',
    color: 'blue',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    textClass: 'text-blue-400',
  },
  mcp: {
    icon: '🔧',
    label: 'MCP Tool',
    color: 'purple',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/50',
    textClass: 'text-purple-400',
  },
  unknown: {
    icon: '❓',
    label: 'Unknown',
    color: 'gray',
    bgClass: 'bg-gray-500/20',
    borderClass: 'border-gray-500/50',
    textClass: 'text-gray-400',
  },
};

// Status icons and styles
const STATUS_CONFIG = {
  [ActionStatus.PENDING]: {
    icon: '○',
    label: 'Pending',
    bgClass: 'bg-gray-500/10',
    borderClass: 'border-gray-500/30',
    textClass: 'text-gray-500',
    animate: false,
  },
  [ActionStatus.RUNNING]: {
    icon: '►',
    label: 'Running',
    bgClass: 'bg-green-500/20',
    borderClass: 'border-green-500/50',
    textClass: 'text-green-400',
    animate: true,
  },
  [ActionStatus.COMPLETED]: {
    icon: '✓',
    label: 'Completed',
    bgClass: 'bg-cyan-500/20',
    borderClass: 'border-cyan-500/50',
    textClass: 'text-cyan-400',
    animate: false,
  },
  [ActionStatus.FAILED]: {
    icon: '✗',
    label: 'Failed',
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500/50',
    textClass: 'text-red-400',
    animate: false,
  },
};

/**
 * Single action step in the execution flow
 */
function ActionStep({ action, isExpanded, onToggle, isLast }) {
  const outputRef = useRef(null);
  const actionConfig = ACTION_CONFIG[action.actionType] || ACTION_CONFIG.unknown;
  const statusConfig = STATUS_CONFIG[action.status] || STATUS_CONFIG[ActionStatus.PENDING];

  // Auto-scroll output when running
  useEffect(() => {
    if (action.status === ActionStatus.RUNNING && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [action.output, action.status]);

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div
          className={`absolute left-5 top-12 w-0.5 h-full -translate-x-1/2 ${
            action.status === ActionStatus.COMPLETED
              ? 'bg-cyan-500/50'
              : action.status === ActionStatus.FAILED
              ? 'bg-red-500/50'
              : 'bg-gray-600/50'
          }`}
          style={{ height: 'calc(100% - 48px)' }}
        />
      )}

      {/* Step card */}
      <div
        className={`relative border rounded-lg transition-all ${
          statusConfig.borderClass
        } ${statusConfig.bgClass} ${
          isExpanded ? 'shadow-lg' : ''
        }`}
      >
        {/* Header - always visible */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 rounded-lg transition-colors"
        >
          {/* Status indicator */}
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-full border ${statusConfig.borderClass} ${statusConfig.bgClass} ${
              statusConfig.animate ? 'animate-pulse' : ''
            }`}
          >
            <span className={`text-lg ${statusConfig.textClass}`}>
              {statusConfig.icon}
            </span>
          </div>

          {/* Action info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-hacker-text">
                Step {action.actionIndex + 1}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${actionConfig.bgClass} ${actionConfig.textClass}`}>
                {actionConfig.icon} {actionConfig.label}
              </span>
            </div>

            {/* Command preview for shell actions */}
            {action.actionType === 'shell' && action.actionConfig?.command && (
              <div className="mt-1 text-xs font-mono text-hacker-text-dim truncate">
                $ {action.actionConfig.command}
              </div>
            )}

            {/* API URL for api actions */}
            {action.actionType === 'api' && action.actionConfig?.url && (
              <div className="mt-1 text-xs font-mono text-hacker-text-dim truncate">
                {action.actionConfig.method || 'GET'} {action.actionConfig.url}
              </div>
            )}

            {/* MCP tool for mcp actions */}
            {action.actionType === 'mcp' && action.actionConfig?.toolName && (
              <div className="mt-1 text-xs font-mono text-hacker-text-dim truncate">
                {action.actionConfig.toolName}
              </div>
            )}
          </div>

          {/* Duration & expand indicator */}
          <div className="flex items-center gap-3">
            {action.duration && (
              <span className="text-xs font-mono text-hacker-text-dim">
                {formatDuration(action.duration)}
              </span>
            )}
            <svg
              className={`w-4 h-4 text-hacker-text-dim transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-hacker-border/50 p-3">
            {/* Error message */}
            {action.error && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs font-mono text-red-400">
                <span className="font-semibold">Error:</span> {action.error}
              </div>
            )}

            {/* Output */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider">
                  Output
                </span>
                {action.output && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(action.output);
                    }}
                    className="text-xs text-hacker-text-dim hover:text-hacker-cyan transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div
                ref={outputRef}
                className="bg-black/40 rounded p-3 font-mono text-xs overflow-auto max-h-64"
              >
                {action.output ? (
                  <pre className="text-hacker-text whitespace-pre-wrap break-all">
                    {action.output}
                    {action.status === ActionStatus.RUNNING && (
                      <span className="animate-pulse text-green-400">▌</span>
                    )}
                  </pre>
                ) : action.status === ActionStatus.RUNNING ? (
                  <div className="text-hacker-text-dim flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    Waiting for output...
                  </div>
                ) : (
                  <span className="text-hacker-text-dim">No output</span>
                )}
              </div>
            </div>

            {/* Timing info */}
            {(action.startedAt || action.endedAt) && (
              <div className="mt-3 flex items-center gap-4 text-xs font-mono text-hacker-text-dim">
                {action.startedAt && (
                  <span>Started: {new Date(action.startedAt).toLocaleTimeString()}</span>
                )}
                {action.endedAt && (
                  <span>Ended: {new Date(action.endedAt).toLocaleTimeString()}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Progress summary bar
 */
function ProgressSummary({ actions, totalActions }) {
  const completed = actions.filter(a => a.status === ActionStatus.COMPLETED).length;
  const failed = actions.filter(a => a.status === ActionStatus.FAILED).length;
  const running = actions.filter(a => a.status === ActionStatus.RUNNING).length;
  const pending = totalActions - completed - failed - running;

  const progress = totalActions > 0 ? ((completed + failed) / totalActions) * 100 : 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-hacker-text-dim">
          Progress: {completed}/{totalActions} steps
        </span>
        <div className="flex items-center gap-3 text-xs font-mono">
          {completed > 0 && <span className="text-cyan-400">{completed} done</span>}
          {running > 0 && <span className="text-green-400">{running} running</span>}
          {failed > 0 && <span className="text-red-400">{failed} failed</span>}
          {pending > 0 && <span className="text-gray-500">{pending} pending</span>}
        </div>
      </div>
      <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Main AgentExecutionFlow component
 */
export default function AgentExecutionFlow({ agentId, executionId, totalActions = 0, onClose }) {
  const { getActionStates, getRunningAgent, isConnected } = useAgentSocket();
  const [expandedActions, setExpandedActions] = useState(new Set());
  const [autoExpand, setAutoExpand] = useState(true);

  const actions = getActionStates(executionId);
  const runningAgent = getRunningAgent(agentId);

  // Auto-expand running action
  useEffect(() => {
    if (autoExpand) {
      const runningAction = actions.find(a => a.status === ActionStatus.RUNNING);
      if (runningAction) {
        setExpandedActions(prev => new Set([...prev, runningAction.actionIndex]));
      }
    }
  }, [actions, autoExpand]);

  // Toggle action expansion
  const toggleAction = (actionIndex) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionIndex)) {
        next.delete(actionIndex);
      } else {
        next.add(actionIndex);
      }
      return next;
    });
  };

  // Expand/collapse all
  const expandAll = () => {
    setExpandedActions(new Set(actions.map(a => a.actionIndex)));
  };

  const collapseAll = () => {
    setExpandedActions(new Set());
  };

  // Determine actual total (from running agent or passed prop)
  const actualTotal = runningAgent?.totalActions || totalActions || actions.length;

  // Generate placeholder actions for pending steps
  const displayActions = useMemo(() => {
    const result = [...actions];
    for (let i = actions.length; i < actualTotal; i++) {
      result.push({
        actionId: `pending-${i}`,
        actionIndex: i,
        actionType: 'unknown',
        status: ActionStatus.PENDING,
        output: '',
        error: null,
        startedAt: null,
        endedAt: null,
        duration: null,
      });
    }
    return result;
  }, [actions, actualTotal]);

  return (
    <div className="flex flex-col h-full bg-hacker-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-hacker-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="text-lg font-semibold text-hacker-green font-mono">
              Execution Flow
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-hacker-text-dim">
              {executionId && <span>{executionId.slice(0, 8)}...</span>}
              {isConnected && (
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-expand toggle */}
          <button
            onClick={() => setAutoExpand(!autoExpand)}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              autoExpand
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface'
            }`}
            title={autoExpand ? 'Auto-expand enabled' : 'Auto-expand disabled'}
          >
            Auto
          </button>

          {/* Expand/collapse all */}
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs font-mono text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded transition-colors"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs font-mono text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded transition-colors"
          >
            Collapse
          </button>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress summary */}
      <div className="px-4 pt-4">
        <ProgressSummary actions={actions} totalActions={actualTotal} />
      </div>

      {/* Action steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-4">⏳</span>
            <p className="text-hacker-text-dim font-mono text-sm">
              Waiting for execution to start...
            </p>
          </div>
        ) : (
          displayActions.map((action, index) => (
            <ActionStep
              key={action.actionId}
              action={action}
              isExpanded={expandedActions.has(action.actionIndex)}
              onToggle={() => toggleAction(action.actionIndex)}
              isLast={index === displayActions.length - 1}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-hacker-border text-xs font-mono text-hacker-text-dim">
        <span>
          {actions.filter(a => a.status === ActionStatus.COMPLETED).length} completed
          {actions.filter(a => a.status === ActionStatus.FAILED).length > 0 && (
            <span className="text-red-400 ml-2">
              • {actions.filter(a => a.status === ActionStatus.FAILED).length} failed
            </span>
          )}
        </span>
        <span>
          Total: {actions.reduce((sum, a) => sum + (a.duration || 0), 0)}ms
        </span>
      </div>
    </div>
  );
}
