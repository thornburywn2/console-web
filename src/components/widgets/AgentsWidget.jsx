/**
 * Agents Widget Component
 * Displays agent status and real-time execution tracking
 * Phase 3.5: Mission Control - Agent Observability
 */

import { useState, useEffect, useCallback } from 'react';
import { agentsApi } from '../../services/api.js';
import { useAgentSocket } from '../../hooks/useAgentSocket.js';

// Status colors and icons
const STATUS_CONFIG = {
  RUNNING: { color: '#22c55e', icon: '▶', label: 'Running', animate: true },
  PENDING: { color: '#f59e0b', icon: '⏳', label: 'Pending', animate: true },
  COMPLETED: { color: '#06b6d4', icon: '✓', label: 'Done', animate: false },
  FAILED: { color: '#ef4444', icon: '✗', label: 'Failed', animate: false },
  CANCELLED: { color: '#6b7280', icon: '⊘', label: 'Cancelled', animate: false },
};

// Trigger type icons
const TRIGGER_ICONS = {
  MANUAL: '👆',
  FILE_CHANGE: '📄',
  GIT_PRE_COMMIT: '📝',
  GIT_POST_COMMIT: '✅',
  GIT_PRE_PUSH: '⬆️',
  SESSION_START: '🚀',
  SESSION_END: '🛑',
  SESSION_COMMAND_COMPLETE: '💻',
  SYSTEM_RESOURCE: '📊',
  SYSTEM_ALERT: '🚨',
};

export default function AgentsWidget({ onOpenAgentDetail, onOpenFullAdmin }) {
  const [agents, setAgents] = useState([]);
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('running'); // 'running' | 'all' | 'history'

  // Real-time agent status via Socket.IO
  const {
    runningAgents: socketRunningAgents,
    runningCount: socketRunningCount,
    recentEvents,
    isConnected,
  } = useAgentSocket();

  // Fetch agent data from API
  const fetchAgents = useCallback(async () => {
    try {
      const data = await agentsApi.list();
      const agentList = Array.isArray(data) ? data : (data.agents || []);

      // Get recent executions across all agents
      const executions = agentList
        .flatMap(a => (a.executions || []).map(e => ({ ...e, agentName: a.name, agentId: a.id })))
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
        .slice(0, 10);

      setAgents(agentList);
      setRecentExecutions(executions);
      setError(null);
    } catch (err) {
      console.error('Agent fetch error:', err);
      setError(err.getUserMessage?.() || err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    // Refresh data periodically (less frequent now that we have sockets)
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // Combine socket running agents with API data
  const runningAgents = socketRunningAgents.length > 0
    ? socketRunningAgents.map(ra => {
        const agent = agents.find(a => a.id === ra.agentId);
        return agent ? { ...agent, socketState: ra } : null;
      }).filter(Boolean)
    : agents.filter(a =>
        a.executions?.some(e => e.status === 'RUNNING' || e.status === 'PENDING')
      );

  // Handle agent actions
  const handleRun = async (agentId, e) => {
    e.stopPropagation();
    try {
      await agentsApi.run(agentId);
      fetchAgents();
    } catch (err) {
      console.error('Failed to run agent:', err);
    }
  };

  const handleStop = async (agentId, e) => {
    e.stopPropagation();
    try {
      await agentsApi.stop(agentId);
      fetchAgents();
    } catch (err) {
      console.error('Failed to stop agent:', err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-4 h-4 border-2 border-hacker-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-center py-3 font-mono" style={{ color: 'var(--status-error)' }}>
        {error}
      </div>
    );
  }

  // Count stats
  const enabledCount = agents.filter(a => a.enabled).length;
  const runningCount = runningAgents.length;

  return (
    <div className="space-y-2">
      {/* Stats Bar */}
      <div className="flex items-center justify-between text-[10px] font-mono px-1">
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--text-secondary)' }}>
            {enabledCount} enabled
          </span>
          {runningCount > 0 && (
            <span className="flex items-center gap-1" style={{ color: '#22c55e' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {runningCount} running
            </span>
          )}
        </div>
        {/* View Toggle */}
        <div className="flex items-center gap-1">
          {['running', 'all', 'history'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                view === v
                  ? 'bg-hacker-purple/30 text-hacker-purple'
                  : 'text-hacker-text-dim hover:text-hacker-text'
              }`}
            >
              {v === 'running' ? '▶' : v === 'all' ? '◆' : '⏱'}
            </button>
          ))}
          {onOpenFullAdmin && (
            <button
              onClick={() => onOpenFullAdmin()}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono text-hacker-text-dim hover:text-hacker-cyan transition-colors"
              title="Open Agent Manager"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {/* Content based on view */}
      <div className="max-h-52 overflow-y-auto space-y-1">
        {view === 'running' && (
          runningCount === 0 ? (
            <div className="text-xs text-center py-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
              No agents running
            </div>
          ) : (
            runningAgents.map((agent) => {
              const execution = agent.executions?.find(e =>
                e.status === 'RUNNING' || e.status === 'PENDING'
              );
              const status = execution?.status || 'RUNNING';
              const config = STATUS_CONFIG[status];

              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-white/5"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                  onClick={() => onOpenAgentDetail?.(agent.id)}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${config.animate ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {agent.name}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: config.color }}>
                    {config.icon}
                  </span>
                  <button
                    onClick={(e) => handleStop(agent.id, e)}
                    className="px-1 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    ■
                  </button>
                </div>
              );
            })
          )
        )}

        {view === 'all' && (
          agents.length === 0 ? (
            <div className="text-xs text-center py-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
              No agents configured
            </div>
          ) : (
            agents.filter(a => a.enabled).slice(0, 10).map((agent) => {
              const isRunning = agent.executions?.some(e =>
                e.status === 'RUNNING' || e.status === 'PENDING'
              );
              const triggerIcon = TRIGGER_ICONS[agent.triggerType] || '⚡';

              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-white/5"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                  onClick={() => onOpenAgentDetail?.(agent.id)}
                >
                  <span className="text-xs flex-shrink-0">{triggerIcon}</span>
                  <span className="font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {agent.name}
                  </span>
                  {isRunning ? (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <button
                      onClick={(e) => handleRun(agent.id, e)}
                      className="px-1 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                      title="Run agent"
                    >
                      ▶
                    </button>
                  )}
                </div>
              );
            })
          )
        )}

        {view === 'history' && (
          recentExecutions.length === 0 ? (
            <div className="text-xs text-center py-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
              No recent executions
            </div>
          ) : (
            recentExecutions.map((execution) => {
              const config = STATUS_CONFIG[execution.status] || STATUS_CONFIG.COMPLETED;

              return (
                <div
                  key={execution.id}
                  className="flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-white/5"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                  onClick={() => onOpenAgentDetail?.(execution.agentId)}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {execution.agentName}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {timeAgo(execution.startedAt)}
                  </span>
                  <span className="text-[10px]" style={{ color: config.color }}>
                    {config.icon}
                  </span>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
