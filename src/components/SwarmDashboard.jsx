/**
 * Swarm Dashboard Component
 * P3 Phase 2: Claude Flow Multi-Agent Swarm Management
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 *
 * Provides a comprehensive UI for managing Claude Flow swarms.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_SWARM_CONFIG } from './swarm-dashboard';
import { claudeFlowApi } from '../services/api.js';

export function SwarmDashboard({ projectPath, socket, onClose }) {
  const [status, setStatus] = useState(null);
  const [swarms, setSwarms] = useState([]);
  const [roles, setRoles] = useState({});
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [activeSwarm, setActiveSwarm] = useState(null);
  const [output, setOutput] = useState([]);
  const [newSwarmConfig, setNewSwarmConfig] = useState(DEFAULT_SWARM_CONFIG);
  const [showNewSwarm, setShowNewSwarm] = useState(false);
  const [taskInput, setTaskInput] = useState('');

  const outputRef = useRef(null);

  useEffect(() => {
    fetchStatus();
    fetchRoles();
    fetchTemplates();
    fetchSwarms();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Socket event listeners for active swarm
  useEffect(() => {
    if (!socket || !activeSwarm) return;

    const handleOutput = (data) => {
      setOutput(prev => [...prev, { type: 'stdout', content: data, timestamp: Date.now() }]);
    };

    const handleError = (data) => {
      setOutput(prev => [...prev, { type: 'stderr', content: data, timestamp: Date.now() }]);
    };

    const handleStatus = (status) => {
      setSwarms(prev => prev.map(s =>
        s.id === activeSwarm ? { ...s, status } : s
      ));
    };

    const handleAgent = (activity) => {
      setOutput(prev => [...prev, {
        type: 'agent',
        content: `[${activity.agent}] ${activity.output}`,
        timestamp: Date.now()
      }]);
    };

    socket.on(`claude-flow:${activeSwarm}:output`, handleOutput);
    socket.on(`claude-flow:${activeSwarm}:error`, handleError);
    socket.on(`claude-flow:${activeSwarm}:status`, handleStatus);
    socket.on(`claude-flow:${activeSwarm}:agent`, handleAgent);

    return () => {
      socket.off(`claude-flow:${activeSwarm}:output`, handleOutput);
      socket.off(`claude-flow:${activeSwarm}:error`, handleError);
      socket.off(`claude-flow:${activeSwarm}:status`, handleStatus);
      socket.off(`claude-flow:${activeSwarm}:agent`, handleAgent);
    };
  }, [socket, activeSwarm]);

  const fetchStatus = async () => {
    try {
      const data = await claudeFlowApi.getStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.getUserMessage?.() || 'Failed to fetch Claude Flow status');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await claudeFlowApi.getRoles();
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await claudeFlowApi.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchSwarms = async () => {
    try {
      const data = await claudeFlowApi.getSwarms();
      setSwarms(data);
    } catch (err) {
      console.error('Failed to fetch swarms:', err.getUserMessage?.() || err.message);
    }
  };

  const handleInstall = async () => {
    setActionLoading('install');
    setError(null);

    try {
      await claudeFlowApi.install({ global: true });
      await fetchStatus();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSwarm = async () => {
    if (!projectPath) {
      setError('No project selected');
      return;
    }

    setActionLoading('create');
    setError(null);
    setOutput([]);

    try {
      const data = await claudeFlowApi.createSwarm({
        projectPath,
        ...newSwarmConfig
      });

      setSwarms(prev => [...prev, data.swarm]);
      setActiveSwarm(data.swarm.id);
      setShowNewSwarm(false);
      setOutput([{ type: 'info', content: `Swarm ${data.swarm.id} started`, timestamp: Date.now() }]);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSwarm = async (swarmId) => {
    setActionLoading(swarmId);

    try {
      await claudeFlowApi.deleteSwarm(swarmId);

      setSwarms(prev => prev.map(s =>
        s.id === swarmId ? { ...s, status: 'stopped' } : s
      ));

      if (activeSwarm === swarmId) {
        setOutput(prev => [...prev, { type: 'info', content: 'Swarm stopped', timestamp: Date.now() }]);
      }
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendTask = async () => {
    if (!activeSwarm || !taskInput.trim()) return;

    try {
      await claudeFlowApi.sendTask(activeSwarm, taskInput);

      setOutput(prev => [...prev, { type: 'input', content: `> ${taskInput}`, timestamp: Date.now() }]);
      setTaskInput('');
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates[templateId];
    if (template) {
      setNewSwarmConfig(prev => ({
        ...prev,
        template: templateId,
        agents: template.agents || prev.agents,
        task: template.task || prev.task
      }));
    }
  };

  const toggleAgentRole = (role) => {
    setNewSwarmConfig(prev => ({
      ...prev,
      agents: prev.agents.includes(role)
        ? prev.agents.filter(a => a !== role)
        : [...prev.agents, role]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-text">Claude Flow Swarm</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">EXPERIMENTAL</span>
          </div>
          <p className="text-text-secondary">Multi-agent task orchestration (awaiting Anthropic release)</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg text-text-secondary hover:text-text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Installation Status - EXPERIMENTAL: Package not yet released */}
      {!status?.installation?.installed && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-amber-400 text-2xl">🧪</div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-400 mb-2">Experimental Feature - Coming Soon</h3>
              <p className="text-text-secondary text-sm mb-3">
                This dashboard is prepared for <code className="px-1 bg-surface rounded">@anthropics/claude-flow</code>,
                a multi-agent orchestration package that Anthropic has not yet released publicly.
              </p>
              <p className="text-text-secondary text-sm mb-3">
                Once Anthropic releases their official multi-agent tooling, this dashboard will enable you to:
              </p>
              <ul className="text-text-secondary text-sm mb-4 space-y-1 list-disc list-inside">
                <li>Orchestrate multiple Claude agents working in parallel</li>
                <li>Use preset swarm templates (Code Review, Feature Development, Research)</li>
                <li>Assign specialized roles (orchestrator, coder, reviewer, tester, researcher)</li>
                <li>Monitor real-time multi-agent task execution</li>
              </ul>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded">
                  Status: Awaiting package release
                </span>
                <a
                  href="https://www.anthropic.com/news"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  Check Anthropic News →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Claude Flow</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status?.installation?.installed ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-text">
              {status?.installation?.installed ? status.installation.version : 'Not Installed'}
            </span>
          </div>
        </div>

        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Active Swarms</h3>
          <span className="text-2xl font-bold text-text">{status?.swarms || 0}</span>
        </div>

        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Available Agents</h3>
          <span className="text-2xl font-bold text-text">{status?.availableRoles?.length || 0}</span>
        </div>
      </div>

      {/* New Swarm Form */}
      {showNewSwarm ? (
        <div className="mb-6 bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="font-medium text-text mb-4">Create New Swarm</h3>

          {/* Template Selection */}
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-2">Template (optional)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(templates).map(([id, template]) => (
                <button
                  key={id}
                  onClick={() => handleTemplateSelect(id)}
                  className={`p-3 rounded border text-left transition-colors ${
                    newSwarmConfig.template === id
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="font-medium text-text text-sm">{template.name}</div>
                  <div className="text-xs text-text-secondary">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent Selection */}
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-2">Agents</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(roles).map(([role, config]) => (
                <button
                  key={role}
                  onClick={() => toggleAgentRole(role)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    newSwarmConfig.agents.includes(role)
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-text-secondary hover:text-text'
                  }`}
                  title={config.description}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Task Input */}
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-2">Initial Task</label>
            <textarea
              value={newSwarmConfig.task}
              onChange={(e) => setNewSwarmConfig(prev => ({ ...prev, task: e.target.value }))}
              placeholder="Describe the task for the swarm..."
              className="w-full px-3 py-2 bg-surface border border-border rounded text-text placeholder:text-text-secondary resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateSwarm}
              disabled={actionLoading === 'create' || newSwarmConfig.agents.length === 0}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
            >
              {actionLoading === 'create' ? 'Starting...' : 'Start Swarm'}
            </button>
            <button
              onClick={() => setShowNewSwarm(false)}
              className="px-4 py-2 bg-surface border border-border rounded text-text hover:bg-surface-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <button
            disabled={!status?.installation?.installed || !projectPath}
            className="w-full p-4 border-2 border-dashed border-border rounded-lg text-text-secondary opacity-50 cursor-not-allowed"
            title={!status?.installation?.installed ? 'Requires @anthropics/claude-flow package (not yet released)' : 'Select a project first'}
          >
            + Create New Swarm
          </button>
          {!status?.installation?.installed && (
            <p className="mt-2 text-xs text-text-secondary text-center">
              Swarm creation requires the <code className="px-1 bg-surface rounded">@anthropics/claude-flow</code> package
            </p>
          )}
        </div>
      )}

      {/* Active Swarms */}
      {swarms.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-text mb-3">Swarms</h3>
          <div className="space-y-2">
            {swarms.map((swarm) => (
              <div
                key={swarm.id}
                onClick={() => setActiveSwarm(swarm.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeSwarm === swarm.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      swarm.status === 'running' ? 'bg-green-500 animate-pulse' :
                      swarm.status === 'starting' ? 'bg-yellow-500 animate-pulse' :
                      'bg-gray-500'
                    }`} />
                    <span className="font-mono text-sm text-text">{swarm.id.slice(0, 12)}</span>
                    <span className="text-xs text-text-secondary capitalize">{swarm.status}</span>
                  </div>
                  {swarm.status === 'running' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopSwarm(swarm.id);
                      }}
                      disabled={actionLoading === swarm.id}
                      className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    >
                      {actionLoading === swarm.id ? 'Stopping...' : 'Stop'}
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-text-secondary">
                  Agents: {swarm.agents?.join(', ') || 'None'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swarm Output */}
      {activeSwarm && (
        <div className="bg-surface-secondary rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-medium text-text">Swarm Output</h3>
            <span className="text-xs text-text-secondary font-mono">{activeSwarm.slice(0, 12)}</span>
          </div>

          <div
            ref={outputRef}
            className="p-3 bg-gray-900/50 h-[300px] overflow-y-auto font-mono text-sm"
          >
            {output.length === 0 ? (
              <div className="text-text-secondary text-center py-8">
                Waiting for swarm output...
              </div>
            ) : (
              output.map((line, idx) => (
                <div
                  key={idx}
                  className={`whitespace-pre-wrap break-all mb-1 ${
                    line.type === 'stderr' ? 'text-red-400' :
                    line.type === 'input' ? 'text-blue-400' :
                    line.type === 'info' ? 'text-gray-400 italic' :
                    line.type === 'agent' ? 'text-purple-400' :
                    'text-gray-200'
                  }`}
                >
                  {line.content}
                </div>
              ))
            )}
          </div>

          {/* Task Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTask()}
                placeholder="Add a task to the swarm..."
                className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text placeholder:text-text-secondary"
              />
              <button
                onClick={handleSendTask}
                disabled={!taskInput.trim()}
                className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Roles Reference */}
      <div className="mt-6 bg-surface-secondary rounded-lg p-4 border border-border">
        <h3 className="font-medium text-text mb-3">Agent Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(roles).map(([role, config]) => (
            <div key={role} className="p-3 bg-surface rounded border border-border">
              <div className="font-medium text-text capitalize">{role}</div>
              <div className="text-xs text-text-secondary">{config.description}</div>
              <div className="text-xs text-text-secondary/50 mt-1">Model: {config.model}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SwarmDashboard;
