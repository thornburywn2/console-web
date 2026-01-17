/**
 * Agent Status Dashboard Component
 * Compact visual status display for running agents with progress indicators
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { agentsApi } from '../services/api.js';

// Status configurations
const STATUS_CONFIG = {
  RUNNING: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    pulseColor: 'bg-green-500',
    label: 'Running',
  },
  IDLE: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/50',
    pulseColor: 'bg-gray-500',
    label: 'Idle',
  },
  COMPLETED: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    pulseColor: 'bg-blue-500',
    label: 'Completed',
  },
  ERROR: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    pulseColor: 'bg-red-500',
    label: 'Error',
  },
  PENDING: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    pulseColor: 'bg-yellow-500',
    label: 'Pending',
  },
};

// Format elapsed time
function formatElapsed(startTime) {
  if (!startTime) return '--';
  const start = new Date(startTime);
  const now = new Date();
  const diff = Math.floor((now - start) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

// Progress bar component
function ProgressBar({ progress, isIndeterminate, status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE;

  if (isIndeterminate) {
    return (
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full w-1/3 ${config.pulseColor} rounded-full animate-progress-indeterminate`}
        />
      </div>
    );
  }

  return (
    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full ${config.pulseColor} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, progress || 0)}%` }}
      />
    </div>
  );
}

// Single agent status card
function AgentStatusCard({ agent, execution, onRun, onStop }) {
  const isRunning = agent.isRunning || execution?.status === 'RUNNING';
  const status = isRunning ? 'RUNNING' : (execution?.status || 'IDLE');
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE;

  return (
    <div
      className={`p-2 rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:border-opacity-75`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Status indicator */}
          <div className="relative flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${config.pulseColor} block`} />
            {isRunning && (
              <span className={`absolute inset-0 w-2 h-2 rounded-full ${config.pulseColor} animate-ping`} />
            )}
          </div>

          {/* Agent name */}
          <span className="text-xs font-medium text-primary truncate">
            {agent.name}
          </span>
        </div>

        {/* Action button */}
        {isRunning ? (
          <button
            onClick={() => onStop(agent.id)}
            className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
            title="Stop"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => onRun(agent.id)}
            className="p-1 text-green-400 hover:bg-green-500/20 rounded transition-colors flex-shrink-0"
            title="Run"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar for running agents */}
      {isRunning && (
        <div className="mb-1">
          <ProgressBar
            progress={execution?.progress}
            isIndeterminate={!execution?.progress}
            status={status}
          />
        </div>
      )}

      {/* Status info */}
      <div className="flex items-center justify-between text-[10px]">
        <span className={config.color}>{config.label}</span>
        {isRunning && execution?.startedAt && (
          <span className="text-muted font-mono">{formatElapsed(execution.startedAt)}</span>
        )}
        {!isRunning && execution?.endedAt && (
          <span className="text-muted">
            {new Date(execution.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

// Summary stats component
function AgentStats({ agents, runnerStatus }) {
  const running = agents.filter(a => a.isRunning).length;
  const enabled = agents.filter(a => a.isEnabled).length;
  const total = agents.length;

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="text-center p-1.5 rounded bg-white/5">
        <div className="text-lg font-bold text-green-400">{running}</div>
        <div className="text-[9px] text-muted uppercase">Running</div>
      </div>
      <div className="text-center p-1.5 rounded bg-white/5">
        <div className="text-lg font-bold text-blue-400">{enabled}</div>
        <div className="text-[9px] text-muted uppercase">Enabled</div>
      </div>
      <div className="text-center p-1.5 rounded bg-white/5">
        <div className="text-lg font-bold text-gray-400">{total}</div>
        <div className="text-[9px] text-muted uppercase">Total</div>
      </div>
    </div>
  );
}

export default function AgentStatusDashboard({ socket, onOpenAgentManager }) {
  const [agents, setAgents] = useState([]);
  const [runnerStatus, setRunnerStatus] = useState({ running: [], available: 5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedTick, setElapsedTick] = useState(0);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const data = await agentsApi.list();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch runner status
  const fetchRunnerStatus = useCallback(async () => {
    try {
      const data = await agentsApi.getRunnerStatus();
      setRunnerStatus(data);
    } catch (err) {
      console.error('Failed to fetch runner status:', err.getUserMessage?.() || err.message);
    }
  }, []);

  // Initial load and refresh
  useEffect(() => {
    fetchAgents();
    fetchRunnerStatus();

    const refreshInterval = setInterval(() => {
      fetchAgents();
      fetchRunnerStatus();
    }, 10000);

    // Tick for elapsed time updates
    const tickInterval = setInterval(() => {
      setElapsedTick(t => t + 1);
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(tickInterval);
    };
  }, [fetchAgents, fetchRunnerStatus]);

  // Socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data) => {
      setAgents(prev => prev.map(agent => {
        if (agent.id === data.agentId) {
          return {
            ...agent,
            isRunning: data.status === 'RUNNING',
            executions: [
              { id: data.executionId, status: data.status, startedAt: data.startedAt, endedAt: data.endedAt, progress: data.progress },
              ...(agent.executions || []).slice(0, 4)
            ]
          };
        }
        return agent;
      }));
      fetchRunnerStatus();
    };

    socket.on('agent:status', handleStatus);

    return () => {
      socket.off('agent:status', handleStatus);
    };
  }, [socket, fetchRunnerStatus]);

  // Run agent
  const handleRunAgent = async (agentId) => {
    try {
      await agentsApi.run(agentId);
      fetchAgents();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  // Stop agent
  const handleStopAgent = async (agentId) => {
    try {
      await agentsApi.stop(agentId);
      fetchAgents();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-muted font-mono text-center py-4">
        Loading agents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 font-mono text-center py-4">
        {error}
      </div>
    );
  }

  const runningAgents = agents.filter(a => a.isRunning);
  const enabledAgents = agents.filter(a => a.isEnabled && !a.isRunning);

  return (
    <div className="space-y-3">
      {/* Stats overview */}
      <AgentStats agents={agents} runnerStatus={runnerStatus} />

      {/* Running agents */}
      {runningAgents.length > 0 && (
        <div>
          <div className="text-[10px] text-muted uppercase font-semibold mb-1.5">
            Running ({runningAgents.length})
          </div>
          <div className="space-y-2">
            {runningAgents.map(agent => (
              <AgentStatusCard
                key={agent.id}
                agent={agent}
                execution={agent.executions?.[0]}
                onRun={handleRunAgent}
                onStop={handleStopAgent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enabled but idle agents */}
      {enabledAgents.length > 0 && (
        <div>
          <div className="text-[10px] text-muted uppercase font-semibold mb-1.5">
            Ready ({enabledAgents.length})
          </div>
          <div className="space-y-1.5">
            {enabledAgents.slice(0, 3).map(agent => (
              <AgentStatusCard
                key={agent.id}
                agent={agent}
                execution={agent.executions?.[0]}
                onRun={handleRunAgent}
                onStop={handleStopAgent}
              />
            ))}
            {enabledAgents.length > 3 && (
              <div className="text-[10px] text-muted text-center">
                +{enabledAgents.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* No agents state */}
      {agents.length === 0 && (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🤖</div>
          <p className="text-xs text-muted">No agents configured</p>
        </div>
      )}

      {/* Open full manager link */}
      {onOpenAgentManager && (
        <button
          onClick={onOpenAgentManager}
          className="w-full text-[10px] font-mono text-cyan-400 hover:underline text-left pt-1"
        >
          Open Agent Manager →
        </button>
      )}
    </div>
  );
}
