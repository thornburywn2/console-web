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
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { codePuppyApi } from '../services/api.js';
import {
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
      const data = await codePuppyApi.getStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch Code Puppy status');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await codePuppyApi.getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await codePuppyApi.getAgents();
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Failed to fetch agents:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchProviders = async () => {
    try {
      const data = await codePuppyApi.getProviders();
      setProviders(data.providers || {});
      setAvailability(data.availability || {});
    } catch (err) {
      console.error('Failed to fetch providers:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchTools = async () => {
    try {
      const data = await codePuppyApi.getTools();
      setAvailableTools(data.tools || []);
    } catch (err) {
      console.error('Failed to fetch tools:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await codePuppyApi.getConfig();
      setConfig(data.config || {});
    } catch (err) {
      console.error('Failed to fetch config:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchMcpServers = async () => {
    try {
      const data = await codePuppyApi.getMcpServers();
      setMcpServers(data.servers || {});
    } catch (err) {
      console.error('Failed to fetch MCP servers:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchCommands = async () => {
    try {
      const data = await codePuppyApi.getCommands();
      setCommands(data);
    } catch (err) {
      console.error('Failed to fetch commands:', err.getUserMessage?.() || err.message);
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
      const data = await codePuppyApi.createSession({
        projectPath: newSessionProject,
        model: selectedModel,
        agent: selectedAgent,
        enableDbos
      });

      await fetchSessions();
      setActiveSession(data.session.id);
      setSessionOutput([]);
      setActiveTab('session');
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSession = async (sessionId) => {
    setActionLoading(`stop-${sessionId}`);

    try {
      await codePuppyApi.stopSession(sessionId);
      await fetchSessions();
      if (activeSession === sessionId) {
        setActiveSession(null);
      }
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveSession = async (sessionId) => {
    try {
      await codePuppyApi.deleteSession(sessionId);
      await fetchSessions();
      if (activeSession === sessionId) {
        setActiveSession(null);
        setSessionOutput([]);
      }
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  const handleSendInput = async (e) => {
    e?.preventDefault();
    if (!activeSession || !inputValue.trim()) return;

    const input = inputValue.trim();
    setInputValue('');
    setSessionOutput(prev => [...prev, { type: 'input', data: input, time: Date.now() }]);

    try {
      await codePuppyApi.sendInput(activeSession, input);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  const handleCreateAgent = async (agentData) => {
    setActionLoading('create-agent');

    try {
      await codePuppyApi.createAgent(agentData);
      await fetchAgents();
      return true;
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async (agentName) => {
    if (!confirm(`Delete agent "${agentName}"?`)) return;

    try {
      await codePuppyApi.deleteAgent(agentName);
      await fetchAgents();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  const handleAddMcpServer = async (name, command, args) => {
    try {
      await codePuppyApi.addMcpServer(name, command, args);
      await fetchMcpServers();
      return true;
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
      return false;
    }
  };

  const handleRemoveMcpServer = async (name) => {
    if (!confirm(`Remove MCP server "${name}"?`)) return;

    try {
      await codePuppyApi.removeMcpServer(name);
      await fetchMcpServers();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  const handleSyncFromClaude = async () => {
    try {
      const data = await codePuppyApi.getClaudeConfig();
      if (data.found) {
        if (confirm(`Found ${data.serverCount} MCP server(s) in Claude Code config.\n\nSync them to Code Puppy?`)) {
          const syncData = await codePuppyApi.syncFromClaude('merge');
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
      alert('Error: ' + (err.getUserMessage?.() || err.message));
    }
  };

  const handleUpdateConfig = async (key, value) => {
    try {
      await codePuppyApi.updateConfig(key, value);
      await fetchConfig();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
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
