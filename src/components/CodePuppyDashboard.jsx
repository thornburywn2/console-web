/**
 * Code Puppy Dashboard Component - Full Feature Parity
 *
 * Comprehensive management interface for Code Puppy AI coding assistant.
 * Features:
 * - Installation status and setup
 * - Session management with real-time terminal
 * - Agent management (built-in and custom)
 * - MCP server configuration
 * - Model/provider configuration
 * - Configuration system (puppy.cfg)
 * - Slash command reference
 */

import { useState, useEffect, useCallback } from 'react';
import {
  API_URL,
  TABS,
  StatusTab,
  SessionTab,
  AgentsTab,
  ModelsTab,
  McpTab,
  ConfigTab,
  CommandsTab,
} from './code-puppy';

export function CodePuppyDashboard({ onClose, socket, projects = [] }) {
  // Status state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('status');

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionOutput, setSessionOutput] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Agents state
  const [agents, setAgents] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);

  // Providers/Models state
  const [providers, setProviders] = useState({});
  const [availability, setAvailability] = useState({});
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [selectedAgent, setSelectedAgent] = useState('code-puppy');

  // Config state
  const [config, setConfig] = useState({});
  const [mcpServers, setMcpServers] = useState({});

  // Commands state
  const [commands, setCommands] = useState({ builtin: [], custom: [] });

  // New session config
  const [newSessionProject, setNewSessionProject] = useState('');
  const [enableDbos, setEnableDbos] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchStatus();
    fetchSessions();
    fetchAgents();
    fetchProviders();
    fetchTools();
    fetchConfig();
    fetchMcpServers();
    fetchCommands();
  }, []);

  // Socket.IO listeners for real-time output
  useEffect(() => {
    if (!socket || !activeSession) return;

    socket.emit('puppy-join', activeSession);

    const handleOutput = ({ sessionId, data }) => {
      if (sessionId === activeSession) {
        setSessionOutput(prev => [...prev, { type: 'output', data, time: Date.now() }]);
      }
    };

    const handleError = ({ sessionId, data }) => {
      if (sessionId === activeSession) {
        setSessionOutput(prev => [...prev, { type: 'error', data, time: Date.now() }]);
      }
    };

    const handleStatus = ({ sessionId, status }) => {
      if (sessionId === activeSession) {
        fetchSessions();
      }
    };

    socket.on('puppy-output', handleOutput);
    socket.on('puppy-error', handleError);
    socket.on('puppy-status', handleStatus);

    return () => {
      socket.emit('puppy-leave', activeSession);
      socket.off('puppy-output', handleOutput);
      socket.off('puppy-error', handleError);
      socket.off('puppy-status', handleStatus);
    };
  }, [socket, activeSession]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch Code Puppy status');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/providers`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || {});
        setAvailability(data.availability || {});
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/tools`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTools(data.tools || []);
      }
    } catch (err) {
      console.error('Failed to fetch tools:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || {});
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchMcpServers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/mcp`);
      if (res.ok) {
        const data = await res.json();
        setMcpServers(data.servers || {});
      }
    } catch (err) {
      console.error('Failed to fetch MCP servers:', err);
    }
  };

  const fetchCommands = async () => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/commands`);
      if (res.ok) {
        const data = await res.json();
        setCommands(data);
      }
    } catch (err) {
      console.error('Failed to fetch commands:', err);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionProject) {
      setError('Please select a project');
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/code-puppy/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: newSessionProject,
          model: selectedModel,
          agent: selectedAgent,
          enableDbos
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create session');
      }

      const data = await res.json();
      await fetchSessions();
      setActiveSession(data.session.id);
      setSessionOutput([]);
      setActiveTab('session');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSession = async (sessionId) => {
    setActionLoading(`stop-${sessionId}`);

    try {
      await fetch(`${API_URL}/api/code-puppy/sessions/${sessionId}/stop`, {
        method: 'POST'
      });
      await fetchSessions();
      if (activeSession === sessionId) {
        setActiveSession(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveSession = async (sessionId) => {
    try {
      await fetch(`${API_URL}/api/code-puppy/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      await fetchSessions();
      if (activeSession === sessionId) {
        setActiveSession(null);
        setSessionOutput([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendInput = async (e) => {
    e?.preventDefault();
    if (!activeSession || !inputValue.trim()) return;

    const input = inputValue.trim();
    setInputValue('');
    setSessionOutput(prev => [...prev, { type: 'input', data: input, time: Date.now() }]);

    try {
      await fetch(`${API_URL}/api/code-puppy/sessions/${activeSession}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateAgent = async (agentData) => {
    setActionLoading('create-agent');

    try {
      const res = await fetch(`${API_URL}/api/code-puppy/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create agent');
      }

      await fetchAgents();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async (agentName) => {
    if (!confirm(`Delete agent "${agentName}"?`)) return;

    try {
      await fetch(`${API_URL}/api/code-puppy/agents/${agentName}`, {
        method: 'DELETE'
      });
      await fetchAgents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMcpServer = async (name, command, args) => {
    try {
      const res = await fetch(`${API_URL}/api/code-puppy/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, command, args })
      });

      if (!res.ok) throw new Error('Failed to add MCP server');

      await fetchMcpServers();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleRemoveMcpServer = async (name) => {
    if (!confirm(`Remove MCP server "${name}"?`)) return;

    try {
      await fetch(`${API_URL}/api/code-puppy/mcp/${name}`, {
        method: 'DELETE'
      });
      await fetchMcpServers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSyncFromClaude = async () => {
    try {
      const res = await fetch('/api/code-puppy/mcp/claude-config');
      const data = await res.json();
      if (data.found) {
        if (confirm(`Found ${data.serverCount} MCP server(s) in Claude Code config.\n\nSync them to Code Puppy?`)) {
          const syncRes = await fetch('/api/code-puppy/mcp/sync-claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'merge' })
          });
          const syncData = await syncRes.json();
          if (syncData.success) {
            alert(`Sync complete!\nAdded: ${syncData.results.added.length}\nUpdated: ${syncData.results.updated.length}\nSkipped: ${syncData.results.skipped.length}`);
            fetchMcpServers();
          } else {
            alert('Sync failed: ' + (syncData.error || 'Unknown error'));
          }
        }
      } else {
        alert('No Claude Code MCP configuration found.\n\nMake sure Claude Code is installed and has MCP servers configured.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateConfig = async (key, value) => {
    try {
      await fetch(`${API_URL}/api/code-puppy/config/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      await fetchConfig();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐕</span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Code Puppy</h2>
            <p className="text-sm text-muted">v{status?.codePuppyVersion || 'unknown'} | AI-powered coding assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.installed ? (
            <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">
              Installed
            </span>
          ) : (
            <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">
              Not Installed
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-muted">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface hover:bg-surface-hover text-muted'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'status' && (
        <StatusTab
          status={status}
          providers={providers}
          availability={availability}
          projects={projects}
          agents={agents}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          newSessionProject={newSessionProject}
          setNewSessionProject={setNewSessionProject}
          enableDbos={enableDbos}
          setEnableDbos={setEnableDbos}
          actionLoading={actionLoading}
          onCreateSession={handleCreateSession}
        />
      )}

      {activeTab === 'session' && (
        <SessionTab
          sessions={sessions}
          activeSession={activeSession}
          setActiveSession={setActiveSession}
          sessionOutput={sessionOutput}
          setSessionOutput={setSessionOutput}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onStopSession={handleStopSession}
          onRemoveSession={handleRemoveSession}
          onSendInput={handleSendInput}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'agents' && (
        <AgentsTab
          agents={agents}
          availableTools={availableTools}
          onCreateAgent={handleCreateAgent}
          onDeleteAgent={handleDeleteAgent}
          actionLoading={actionLoading}
          error={error}
          setError={setError}
        />
      )}

      {activeTab === 'models' && (
        <ModelsTab
          providers={providers}
          availability={availability}
        />
      )}

      {activeTab === 'mcp' && (
        <McpTab
          mcpServers={mcpServers}
          onAddServer={handleAddMcpServer}
          onRemoveServer={handleRemoveMcpServer}
          onSyncFromClaude={handleSyncFromClaude}
          error={error}
          setError={setError}
        />
      )}

      {activeTab === 'config' && (
        <ConfigTab
          config={config}
          onUpdateConfig={handleUpdateConfig}
        />
      )}

      {activeTab === 'commands' && (
        <CommandsTab commands={commands} />
      )}
    </div>
  );
}

export default CodePuppyDashboard;
