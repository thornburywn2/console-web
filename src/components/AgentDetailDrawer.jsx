/**
 * AgentDetailDrawer Component
 * Slide-out drawer showing agent details, live output, and execution history
 * Phase 3.5: Mission Control - Agent Observability
 * Enhanced with granular action visualization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { agentsApi } from '../services/api.js';
import { useAgentSocket, ActionStatus } from '../hooks/useAgentSocket.js';
import AgentExecutionFlow from './AgentExecutionFlow.jsx';
import ToolCallViewer from './ToolCallViewer.jsx';

// Status configuration
const STATUS_CONFIG = {
  RUNNING: { color: '#22c55e', bgColor: 'bg-green-500/20', icon: '▶', label: 'Running', animate: true },
  PENDING: { color: '#f59e0b', bgColor: 'bg-yellow-500/20', icon: '⏳', label: 'Pending', animate: true },
  COMPLETED: { color: '#06b6d4', bgColor: 'bg-cyan-500/20', icon: '✓', label: 'Completed', animate: false },
  FAILED: { color: '#ef4444', bgColor: 'bg-red-500/20', icon: '✗', label: 'Failed', animate: false },
  CANCELLED: { color: '#6b7280', bgColor: 'bg-gray-500/20', icon: '⊘', label: 'Cancelled', animate: false },
};

// Trigger type labels
const TRIGGER_LABELS = {
  MANUAL: 'Manual Trigger',
  FILE_CHANGE: 'File Change',
  GIT_PRE_COMMIT: 'Git Pre-Commit',
  GIT_POST_COMMIT: 'Git Post-Commit',
  GIT_PRE_PUSH: 'Git Pre-Push',
  GIT_POST_MERGE: 'Git Post-Merge',
  GIT_POST_CHECKOUT: 'Git Post-Checkout',
  SESSION_START: 'Session Start',
  SESSION_END: 'Session End',
  SESSION_ERROR: 'Session Error',
  SESSION_IDLE: 'Session Idle',
  SESSION_RECONNECT: 'Session Reconnect',
  SESSION_COMMAND_COMPLETE: 'Command Complete',
  SYSTEM_RESOURCE: 'System Resource',
  SYSTEM_SERVICE: 'Service Change',
  SYSTEM_ALERT: 'Alert Triggered',
  SYSTEM_UPTIME: 'Uptime Change',
};

// Action type labels
const ACTION_LABELS = {
  shell: { icon: '🖥️', label: 'Shell Command' },
  api: { icon: '🌐', label: 'API Call' },
  mcp: { icon: '🔧', label: 'MCP Tool' },
};

export default function AgentDetailDrawer({ agentId, onClose }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'output' | 'history'
  const [runningAction, setRunningAction] = useState(null); // 'run' | 'stop'
  const outputRef = useRef(null);

  // Real-time agent status and output
  const {
    getRunningAgent,
    getAgentOutput,
    getActionStates,
    isConnected,
  } = useAgentSocket();

  const runningState = getRunningAgent(agentId);
  const liveOutput = runningState ? getAgentOutput(runningState.executionId) : [];
  const actionStates = runningState ? getActionStates(runningState.executionId) : [];
  const [selectedAction, setSelectedAction] = useState(null);
  const [viewMode, setViewMode] = useState('flow'); // 'flow' | 'raw'

  // Fetch agent details
  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agentsApi.get(agentId);
      setAgent(data);
      setError(null);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message || 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId, fetchAgent]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current && liveOutput.length > 0) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [liveOutput]);

  // Switch to output tab when agent starts running
  useEffect(() => {
    if (runningState) {
      setActiveTab('output');
    }
  }, [runningState]);

  // Handle run agent
  const handleRun = async () => {
    try {
      setRunningAction('run');
      await agentsApi.run(agentId);
      await fetchAgent();
    } catch (err) {
      console.error('Failed to run agent:', err);
    } finally {
      setRunningAction(null);
    }
  };

  // Handle stop agent
  const handleStop = async () => {
    try {
      setRunningAction('stop');
      await agentsApi.stop(agentId);
      await fetchAgent();
    } catch (err) {
      console.error('Failed to stop agent:', err);
    } finally {
      setRunningAction(null);
    }
  };

  // Format time ago
  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Format duration
  const formatDuration = (start, end) => {
    if (!start) return '-';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const seconds = Math.floor((endDate - startDate) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (!agentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="relative w-full max-w-xl bg-hacker-bg border-l border-hacker-border flex flex-col h-full animate-slide-in-right"
        style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-hacker-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-semibold text-hacker-green font-mono">
                {agent?.name || 'Loading...'}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono">
                {runningState ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Running
                  </span>
                ) : (
                  <span className="text-hacker-text-dim">
                    {agent?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                )}
                {isConnected && (
                  <span className="text-hacker-cyan" title="Real-time connected">
                    ◉
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-surface rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 p-3 border-b border-hacker-border bg-hacker-surface/30">
          {runningState ? (
            <button
              onClick={handleStop}
              disabled={runningAction === 'stop'}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {runningAction === 'stop' ? (
                <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>■</span>
              )}
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={runningAction === 'run' || !agent?.enabled}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {runningAction === 'run' ? (
                <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>▶</span>
              )}
              Run
            </button>
          )}
          <button
            onClick={fetchAgent}
            className="p-1.5 text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hacker-border">
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'output', label: 'Output', icon: '📤', badge: liveOutput.length > 0 },
            { id: 'history', label: 'History', icon: '⏱', badge: agent?.executions?.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-mono transition-colors relative ${
                activeTab === tab.id
                  ? 'text-hacker-cyan border-b-2 border-hacker-cyan bg-hacker-cyan/5'
                  : 'text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-hacker-cyan/20 text-hacker-cyan">
                  {typeof tab.badge === 'number' ? tab.badge : '•'}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-hacker-cyan border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-400 font-mono text-sm">{error}</p>
              <button
                onClick={fetchAgent}
                className="mt-2 text-sm text-hacker-cyan hover:underline font-mono"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-4 space-y-4">
                  {/* Description */}
                  {agent.description && (
                    <div className="p-3 bg-hacker-surface/50 rounded-lg border border-hacker-border">
                      <p className="text-sm text-hacker-text font-mono">{agent.description}</p>
                    </div>
                  )}

                  {/* Trigger */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider">Trigger</h3>
                    <div className="p-3 bg-hacker-surface/50 rounded-lg border border-hacker-border">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        <span className="font-mono text-hacker-text">
                          {TRIGGER_LABELS[agent.triggerType] || agent.triggerType}
                        </span>
                      </div>
                      {agent.triggerConfig && Object.keys(agent.triggerConfig).length > 0 && (
                        <div className="mt-2 text-xs font-mono text-hacker-text-dim">
                          <pre className="bg-black/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(agent.triggerConfig, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider">
                      Actions ({agent.actions?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {agent.actions?.map((action, index) => {
                        const actionConfig = ACTION_LABELS[action.type] || { icon: '❓', label: action.type };
                        return (
                          <div
                            key={index}
                            className="p-3 bg-hacker-surface/50 rounded-lg border border-hacker-border"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm">{actionConfig.icon}</span>
                              <span className="text-sm font-mono text-hacker-text">{actionConfig.label}</span>
                              <span className="text-xs text-hacker-text-dim font-mono">#{index + 1}</span>
                            </div>
                            {action.config && (
                              <div className="text-xs font-mono bg-black/30 p-2 rounded overflow-x-auto">
                                {action.type === 'shell' && action.config.command ? (
                                  <code className="text-hacker-cyan">{action.config.command}</code>
                                ) : (
                                  <pre className="text-hacker-text-dim">
                                    {JSON.stringify(action.config, null, 2)}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(!agent.actions || agent.actions.length === 0) && (
                        <p className="text-sm text-hacker-text-dim font-mono text-center py-4">
                          No actions configured
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Project */}
                  {agent.project && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider">Project</h3>
                      <div className="p-3 bg-hacker-surface/50 rounded-lg border border-hacker-border">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📁</span>
                          <span className="font-mono text-hacker-text">{agent.project.name}</span>
                        </div>
                        <p className="text-xs font-mono text-hacker-text-dim mt-1">{agent.project.path}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Output Tab - Enhanced with Visualization */}
              {activeTab === 'output' && (
                <div className="h-full flex flex-col">
                  {runningState ? (
                    <>
                      {/* View mode toggle */}
                      <div className="flex items-center justify-between p-2 border-b border-hacker-border bg-hacker-surface/30">
                        <div className="flex items-center gap-2 text-sm font-mono text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Running for {formatDuration(runningState.startedAt)}
                          {runningState.totalActions > 0 && (
                            <span className="text-hacker-text-dim">
                              • Step {(runningState.currentActionIndex || 0) + 1}/{runningState.totalActions}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewMode('flow')}
                            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                              viewMode === 'flow'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface'
                            }`}
                          >
                            Flow
                          </button>
                          <button
                            onClick={() => setViewMode('raw')}
                            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                              viewMode === 'raw'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface'
                            }`}
                          >
                            Raw
                          </button>
                        </div>
                      </div>

                      {/* Visualization or Raw output */}
                      {viewMode === 'flow' ? (
                        <div className="flex-1 overflow-hidden">
                          {selectedAction ? (
                            <ToolCallViewer
                              action={selectedAction}
                              onClose={() => setSelectedAction(null)}
                            />
                          ) : (
                            <AgentExecutionFlow
                              agentId={agentId}
                              executionId={runningState.executionId}
                              totalActions={runningState.totalActions || agent?.actions?.length || 0}
                            />
                          )}
                        </div>
                      ) : (
                        <div
                          ref={outputRef}
                          className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-black/30"
                          style={{ minHeight: 200 }}
                        >
                          {liveOutput.length === 0 ? (
                            <p className="text-hacker-text-dim">Waiting for output...</p>
                          ) : (
                            liveOutput.map((item, index) => (
                              <div key={index} className="mb-2">
                                <div className="text-hacker-text-dim text-[10px] mb-0.5">
                                  Action #{item.actionIndex + 1} • {new Date(item.timestamp).toLocaleTimeString()}
                                </div>
                                <pre className="text-hacker-text whitespace-pre-wrap break-all">
                                  {item.output}
                                </pre>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                      <span className="text-4xl mb-4">📤</span>
                      <p className="text-hacker-text-dim font-mono text-sm">
                        No agent running
                      </p>
                      <p className="text-hacker-text-dim font-mono text-xs mt-1">
                        Run the agent to see live execution flow
                      </p>
                      <button
                        onClick={handleRun}
                        disabled={!agent?.enabled}
                        className="mt-4 px-4 py-2 text-sm font-mono bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ▶ Run Agent
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="p-4 space-y-2">
                  {agent.executions?.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-4xl mb-4 block">⏱</span>
                      <p className="text-hacker-text-dim font-mono text-sm">No execution history</p>
                    </div>
                  ) : (
                    agent.executions?.map((execution) => {
                      const config = STATUS_CONFIG[execution.status] || STATUS_CONFIG.COMPLETED;
                      return (
                        <div
                          key={execution.id}
                          className="p-3 bg-hacker-surface/50 rounded-lg border border-hacker-border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${config.animate ? 'animate-pulse' : ''}`}
                                style={{ backgroundColor: config.color }}
                              />
                              <span className="font-mono text-sm" style={{ color: config.color }}>
                                {config.label}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-hacker-text-dim">
                              {timeAgo(execution.startedAt)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs font-mono text-hacker-text-dim">
                            <span>Duration: {formatDuration(execution.startedAt, execution.endedAt)}</span>
                            {execution.error && (
                              <span className="text-red-400 truncate" title={execution.error}>
                                Error: {execution.error}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {agent.pagination && agent.pagination.pages > 1 && (
                    <div className="text-center pt-4">
                      <p className="text-xs font-mono text-hacker-text-dim">
                        Showing {agent.executions.length} of {agent.pagination.total} executions
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
