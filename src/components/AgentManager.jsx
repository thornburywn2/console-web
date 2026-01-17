/**
 * Agent Manager Component
 * Main UI for managing background agents - list + detail layout
 * Replaces WorkflowBuilder functionality
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import AgentBuilder from './AgentBuilder';
import AgentExecutionLog from './AgentExecutionLog';
import AgentOutputStream from './AgentOutputStream';
import { AgentListItem } from './agent-manager';
import { agentsExtendedApi } from '../services/api.js';

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
      const data = await agentsExtendedApi.list();
      setAgents(data);
      setError(null);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch runner status
  const fetchRunnerStatus = useCallback(async () => {
    try {
      const data = await agentsExtendedApi.getRunnerStatus();
      setRunnerStatus(data);
    } catch (err) {
      console.error('Failed to fetch runner status:', err);
    }
  }, []);

  // Fetch metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const [triggersData, actionsData] = await Promise.all([
        agentsExtendedApi.getTriggerTypes(),
        agentsExtendedApi.getActionTypes()
      ]);
      if (triggersData?.triggers) {
        setTriggerTypes(triggersData.triggers);
      }
      if (actionsData?.actions) {
        setActionTypes(actionsData.actions);
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
      await agentsExtendedApi.run(agentId);
      fetchAgents();
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  };

  // Stop agent
  const handleStopAgent = async (agentId) => {
    try {
      await agentsExtendedApi.stop(agentId);
      fetchAgents();
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  };

  // Toggle agent enabled
  const handleToggleAgent = async (agentId) => {
    try {
      const updated = await agentsExtendedApi.toggle(agentId);
      setAgents(prev => prev.map(a => a.id === agentId ? updated : a));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(updated);
      }
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agentId) => {
    try {
      await agentsExtendedApi.delete(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
      setDeleteConfirm(null);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  };

  // Save agent (create or update)
  const handleSaveAgent = async (agentData) => {
    try {
      const isUpdate = !!agentData.id;
      const saved = isUpdate
        ? await agentsExtendedApi.update(agentData.id, agentData)
        : await agentsExtendedApi.create(agentData);

      if (isUpdate) {
        setAgents(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        setAgents(prev => [saved, ...prev]);
      }

      setSelectedAgent(saved);
      setIsCreating(false);
      setError(null);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
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
