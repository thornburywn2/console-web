/**
 * Agent Manager Component
 * Main UI for managing background agents - list + detail layout
 * Replaces WorkflowBuilder functionality
 */

import { useState, useEffect, useCallback } from 'react';
import AgentBuilder from './AgentBuilder';
import AgentExecutionLog from './AgentExecutionLog';
import AgentOutputStream from './AgentOutputStream';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Agent status badge colors
const STATUS_COLORS = {
  running: 'bg-green-500',
  idle: 'bg-gray-500',
  error: 'bg-red-500'
};

// Trigger category icons
const TRIGGER_ICONS = {
  git: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  file: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  session: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  system: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  manual: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  )
};

function getTriggerCategory(triggerType) {
  if (triggerType?.startsWith('GIT_')) return 'git';
  if (triggerType === 'FILE_CHANGE') return 'file';
  if (triggerType?.startsWith('SESSION_')) return 'session';
  if (triggerType?.startsWith('SYSTEM_')) return 'system';
  return 'manual';
}

export default function AgentManager({ socket }) {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runnerStatus, setRunnerStatus] = useState({ running: [], available: 5 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [triggerTypes, setTriggerTypes] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch runner status
  const fetchRunnerStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/status/runner`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRunnerStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch runner status:', err);
    }
  }, []);

  // Fetch metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const [triggersRes, actionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/agents/meta/triggers`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/agents/meta/actions`, { credentials: 'include' })
      ]);
      if (triggersRes.ok) {
        const { triggers } = await triggersRes.json();
        setTriggerTypes(triggers);
      }
      if (actionsRes.ok) {
        const { actions } = await actionsRes.json();
        setActionTypes(actions);
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAgents();
    fetchRunnerStatus();
    fetchMetadata();

    // Refresh runner status periodically
    const interval = setInterval(fetchRunnerStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchAgents, fetchRunnerStatus, fetchMetadata]);

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
              { id: data.executionId, status: data.status, startedAt: data.startedAt, endedAt: data.endedAt },
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
      const res = await fetch(`${API_BASE}/api/agents/${agentId}/run`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to run agent');
      }
      fetchAgents();
    } catch (err) {
      setError(err.message);
    }
  };

  // Stop agent
  const handleStopAgent = async (agentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}/stop`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to stop agent');
      fetchAgents();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle agent enabled
  const handleToggleAgent = async (agentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to toggle agent');
      const updated = await res.json();
      setAgents(prev => prev.map(a => a.id === agentId ? updated : a));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(updated);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/${agentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete agent');
      setAgents(prev => prev.filter(a => a.id !== agentId));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Save agent (create or update)
  const handleSaveAgent = async (agentData) => {
    try {
      const isUpdate = !!agentData.id;
      const url = isUpdate
        ? `${API_BASE}/api/agents/${agentData.id}`
        : `${API_BASE}/api/agents`;
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(agentData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save agent');
      }

      const saved = await res.json();

      if (isUpdate) {
        setAgents(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        setAgents(prev => [saved, ...prev]);
      }

      setSelectedAgent(saved);
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Render loading skeleton
  if (loading) {
    return (
      <div className="h-full flex">
        <div className="w-80 border-r border-[var(--border-subtle)] p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          ))}
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 w-48 rounded animate-pulse mb-4" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-64 rounded-lg animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-secondary)' }}>
      {/* Left Panel - Agent List */}
      <div className="w-80 border-r flex flex-col" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Agents
            </h2>
            <button
              onClick={() => { setIsCreating(true); setSelectedAgent(null); }}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{
                background: 'var(--accent-color)',
                color: 'white'
              }}
            >
              + New Agent
            </button>
          </div>

          {/* Runner Status */}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className={`w-2 h-2 rounded-full ${runnerStatus.running.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span>
              {runnerStatus.running.length} running / {runnerStatus.available} available
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)' }}>
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p style={{ color: 'var(--text-muted)' }}>No agents yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                Create your first agent to automate tasks
              </p>
            </div>
          ) : (
            agents.map(agent => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                onSelect={() => { setSelectedAgent(agent); setIsCreating(false); }}
                onRun={() => handleRunAgent(agent.id)}
                onStop={() => handleStopAgent(agent.id)}
                onToggle={() => handleToggleAgent(agent.id)}
                onDelete={() => setDeleteConfirm(agent.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Detail/Builder */}
      <div className="flex-1 overflow-y-auto">
        {isCreating || selectedAgent ? (
          <AgentBuilder
            agent={isCreating ? null : selectedAgent}
            triggerTypes={triggerTypes}
            actionTypes={actionTypes}
            onSave={handleSaveAgent}
            onCancel={() => { setIsCreating(false); setSelectedAgent(null); }}
            socket={socket}
          />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <div className="text-center">
              <svg className="w-20 h-20 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p>Select an agent to view details</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div
            className="relative p-6 rounded-xl max-w-sm w-full"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Delete Agent?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete the agent and all its execution history.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAgent(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm text-white"
                style={{ background: 'var(--error-color)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Agent list item component
function AgentListItem({ agent, isSelected, onSelect, onRun, onStop, onToggle, onDelete }) {
  const category = getTriggerCategory(agent.triggerType);
  const lastExecution = agent.executions?.[0];

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'ring-2' : ''}`}
      style={{
        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-glass)',
        border: '1px solid ' + (isSelected ? 'var(--accent-color)' : 'var(--border-subtle)'),
        ringColor: 'var(--accent-color)'
      }}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full mt-2 ${agent.isRunning ? 'bg-green-500 animate-pulse' : agent.enabled ? 'bg-gray-400' : 'bg-gray-600'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {TRIGGER_ICONS[category]}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {agent.project && (
              <span className="truncate">{agent.project.name}</span>
            )}
            {lastExecution && (
              <span className={lastExecution.status === 'COMPLETED' ? 'text-green-500' : lastExecution.status === 'FAILED' ? 'text-red-500' : ''}>
                {lastExecution.status.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {agent.isRunning ? (
            <button
              onClick={onStop}
              className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
              title="Stop"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onRun}
              className="p-1.5 rounded hover:bg-green-500/20 text-green-400"
              title="Run"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={onToggle}
            className={`p-1.5 rounded ${agent.enabled ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-gray-500 hover:bg-gray-500/20'}`}
            title={agent.enabled ? 'Disable' : 'Enable'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={agent.enabled ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/20"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
