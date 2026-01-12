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

import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

export function CodePuppyDashboard({ onClose, socket, projects = [] }) {
  // Status state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('status');
  const [configTab, setConfigTab] = useState('general');

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionOutput, setSessionOutput] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Agents state
  const [agents, setAgents] = useState([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({
    name: '',
    display_name: '',
    description: '',
    system_prompt: '',
    tools: ['read_file', 'edit_file', 'list_files']
  });

  // Providers/Models state
  const [providers, setProviders] = useState({});
  const [availability, setAvailability] = useState({});
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [selectedAgent, setSelectedAgent] = useState('code-puppy');

  // Config state
  const [config, setConfig] = useState({});
  const [mcpServers, setMcpServers] = useState({});
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [newMcp, setNewMcp] = useState({ name: '', command: '', args: '' });

  // Commands state
  const [commands, setCommands] = useState({ builtin: [], custom: [] });

  // New session config
  const [newSessionProject, setNewSessionProject] = useState('');
  const [enableDbos, setEnableDbos] = useState(false);

  // Available tools
  const [availableTools, setAvailableTools] = useState([]);

  const outputRef = useRef(null);
  const inputRef = useRef(null);

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

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [sessionOutput]);

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

  const handleCreateAgent = async () => {
    if (!newAgent.name || !newAgent.description || !newAgent.system_prompt) {
      setError('Please fill in all required fields');
      return;
    }

    setActionLoading('create-agent');

    try {
      const res = await fetch(`${API_URL}/api/code-puppy/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create agent');
      }

      await fetchAgents();
      setShowCreateAgent(false);
      setNewAgent({
        name: '',
        display_name: '',
        description: '',
        system_prompt: '',
        tools: ['read_file', 'edit_file', 'list_files']
      });
    } catch (err) {
      setError(err.message);
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

  const handleAddMcpServer = async () => {
    if (!newMcp.name || !newMcp.command) {
      setError('Name and command are required');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/code-puppy/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMcp.name,
          command: newMcp.command,
          args: newMcp.args ? newMcp.args.split(' ') : []
        })
      });

      if (!res.ok) throw new Error('Failed to add MCP server');

      await fetchMcpServers();
      setShowAddMcp(false);
      setNewMcp({ name: '', command: '', args: '' });
    } catch (err) {
      setError(err.message);
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

  const toggleTool = (toolName) => {
    setNewAgent(prev => ({
      ...prev,
      tools: prev.tools.includes(toolName)
        ? prev.tools.filter(t => t !== toolName)
        : [...prev.tools, toolName]
    }));
  };

  const formatUptime = (ms) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'session', label: 'Session', icon: '💻' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'models', label: 'Models', icon: '🧠' },
    { id: 'mcp', label: 'MCP', icon: '🔌' },
    { id: 'config', label: 'Config', icon: '⚙️' },
    { id: 'commands', label: 'Commands', icon: '/' }
  ];

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
        {tabs.map((tab) => (
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

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Installation Info */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Installation</h3>
            {status?.installed ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted">UV:</span> <span className="text-foreground">{status.uvVersion}</span></div>
                <div><span className="text-muted">Code Puppy:</span> <span className="text-foreground">{status.codePuppyVersion}</span></div>
                <div className="col-span-2"><span className="text-muted">Config:</span> <span className="text-foreground font-mono text-xs">{status.configDir}</span></div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted">Install UV package manager:</p>
                <code className="block p-2 bg-black/30 rounded text-green-400 text-sm">curl -LsSf https://astral.sh/uv/install.sh | sh</code>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Sessions', value: status?.activeSessions || 0, color: 'text-green-400' },
              { label: 'Total Sessions', value: status?.totalSessions || 0, color: 'text-foreground' },
              { label: 'Agents', value: status?.agentCount || 0, color: 'text-blue-400' },
              { label: 'MCP Servers', value: status?.mcpServerCount || 0, color: 'text-purple-400' }
            ].map((stat) => (
              <div key={stat.label} className="glass-panel p-3 rounded-lg text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Provider Status */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Provider Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(availability).map(([key, info]) => (
                <div key={key} className={`p-2 rounded border text-center ${
                  info.available ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                }`}>
                  <span className={`text-sm ${info.available ? 'text-green-400' : 'text-red-400'}`}>
                    {info.available ? '✓' : '✗'} {providers[key]?.name || key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Start Session</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Project</label>
                <select value={newSessionProject} onChange={(e) => setNewSessionProject(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.path || p.name} value={p.path || p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Agent</label>
                <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
                  {agents.map((a) => (
                    <option key={a.name} value={a.name}>{a.displayName || a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Provider</label>
                <select value={selectedProvider} onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  const models = providers[e.target.value]?.models || [];
                  if (models.length) setSelectedModel(models[0].id);
                }} className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
                  {Object.entries(providers).map(([key, p]) => (
                    <option key={key} value={key} disabled={!availability[key]?.available}>
                      {p.name} {!availability[key]?.available ? '(unavailable)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Model</label>
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
                  {(providers[selectedProvider]?.models || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.recommended ? '★' : ''} {m.fast ? '⚡' : ''} {m.slow ? '🐢' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={enableDbos} onChange={(e) => setEnableDbos(e.target.checked)}
                  className="rounded" />
                Enable DBOS (durable execution)
              </label>
            </div>
            <button onClick={handleCreateSession} disabled={actionLoading === 'create' || !newSessionProject || !status?.installed}
              className="mt-3 w-full px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm">
              {actionLoading === 'create' ? 'Starting...' : 'Start Session'}
            </button>
          </div>
        </div>
      )}

      {/* Session Tab */}
      {activeTab === 'session' && (
        <div className="space-y-4">
          {/* Session List */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-muted text-sm">No sessions. Create one from the Status tab.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.id} onClick={() => { setActiveSession(s.id); setSessionOutput([]); }}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      activeSession === s.id ? 'bg-primary/20 border border-primary/50' : 'bg-surface hover:bg-surface-hover'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{s.projectPath.split('/').pop()}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          s.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>{s.status}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted">{formatUptime(s.uptime)}</span>
                        {s.status === 'running' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStopSession(s.id); }}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">■</button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveSession(s.id); }}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                    <div className="text-xs text-muted">{s.agent} | {s.model}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terminal */}
          {activeSession && (
            <div className="glass-panel rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-black/30 border-b border-border">
                <span className="text-sm font-medium text-foreground">Terminal</span>
                <button onClick={() => setSessionOutput([])} className="text-xs text-muted hover:text-foreground">Clear</button>
              </div>
              <div ref={outputRef} className="h-72 overflow-y-auto p-3 font-mono text-xs bg-black/50">
                {sessionOutput.map((item, i) => (
                  <div key={i} className={`whitespace-pre-wrap ${
                    item.type === 'input' ? 'text-green-400' : item.type === 'error' ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {item.type === 'input' && <span className="text-blue-400">{'>>> '}</span>}
                    {item.data}
                  </div>
                ))}
                {sessionOutput.length === 0 && <span className="text-muted">Waiting for output...</span>}
              </div>
              <form onSubmit={handleSendInput} className="flex border-t border-border">
                <span className="px-2 py-2 text-green-400 bg-black/30 text-sm">{'>>>'}</span>
                <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message or /command..."
                  className="flex-1 px-2 py-2 bg-black/30 text-foreground text-sm focus:outline-none" />
                <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Agents</h3>
            <button onClick={() => setShowCreateAgent(!showCreateAgent)}
              className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">
              {showCreateAgent ? 'Cancel' : '+ Create'}
            </button>
          </div>

          {showCreateAgent && (
            <div className="glass-panel p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-foreground text-sm">Create Agent</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Name (kebab-case)*</label>
                  <input type="text" value={newAgent.name}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    placeholder="my-agent"
                    className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Display Name</label>
                  <input type="text" value={newAgent.display_name}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="My Agent 🤖"
                    className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Description*</label>
                <input type="text" value={newAgent.description}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">System Prompt*</label>
                <textarea value={newAgent.system_prompt}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
                  placeholder="Instructions for the agent..."
                  rows={3}
                  className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Tools</label>
                <div className="flex flex-wrap gap-1">
                  {availableTools.map((tool) => (
                    <button key={tool.name} onClick={() => toggleTool(tool.name)}
                      title={tool.description}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        newAgent.tools.includes(tool.name) ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted hover:bg-surface-hover'
                      }`}>
                      {tool.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateAgent} disabled={actionLoading === 'create-agent'}
                className="w-full px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 text-sm">
                {actionLoading === 'create-agent' ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <div key={agent.name} className="glass-panel p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground text-sm">{agent.displayName || agent.name}</span>
                  {agent.builtin ? (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">Built-in</span>
                  ) : (
                    <button onClick={() => handleDeleteAgent(agent.name)}
                      className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">✕</button>
                  )}
                </div>
                <p className="text-xs text-muted">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          {Object.entries(providers).map(([key, provider]) => (
            <div key={key} className="glass-panel p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">{provider.name}</h3>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  availability[key]?.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {availability[key]?.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {provider.models.map((model) => (
                  <div key={model.id} className="p-2 rounded bg-surface text-xs">
                    <span className="text-foreground">{model.name}</span>
                    {model.recommended && <span className="ml-1 text-green-400">★</span>}
                    {model.fast && <span className="ml-1 text-blue-400">⚡</span>}
                    {model.slow && <span className="ml-1 text-yellow-400">🐢</span>}
                    <div className="text-muted font-mono truncate">{model.id}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MCP Tab */}
      {activeTab === 'mcp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">MCP Servers</h3>
            <div className="flex gap-2">
              <button onClick={async () => {
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
                        fetchStatus();
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
              }}
                className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-500"
                title="Import MCP servers from Claude Code">
                🔄 Sync from Claude
              </button>
              <button onClick={() => setShowAddMcp(!showAddMcp)}
                className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">
                {showAddMcp ? 'Cancel' : '+ Add Server'}
              </button>
            </div>
          </div>

          {showAddMcp && (
            <div className="glass-panel p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Name*</label>
                  <input type="text" value={newMcp.name}
                    onChange={(e) => setNewMcp(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="my-server"
                    className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Command*</label>
                  <input type="text" value={newMcp.command}
                    onChange={(e) => setNewMcp(prev => ({ ...prev, command: e.target.value }))}
                    placeholder="npx"
                    className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Args (space-separated)</label>
                  <input type="text" value={newMcp.args}
                    onChange={(e) => setNewMcp(prev => ({ ...prev, args: e.target.value }))}
                    placeholder="-y @modelcontextprotocol/server"
                    className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
                </div>
              </div>
              <button onClick={handleAddMcpServer}
                className="w-full px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500 text-sm">
                Add MCP Server
              </button>
            </div>
          )}

          {Object.keys(mcpServers).length === 0 ? (
            <p className="text-muted text-sm">No MCP servers configured.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(mcpServers).map(([name, server]) => (
                <div key={name} className="glass-panel p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{name}</span>
                    <div className="text-xs text-muted font-mono">{server.command} {(server.args || []).join(' ')}</div>
                  </div>
                  <button onClick={() => handleRemoveMcpServer(name)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            {['general', 'safety', 'display', 'advanced'].map((tab) => (
              <button key={tab} onClick={() => setConfigTab(tab)}
                className={`px-3 py-1 rounded text-xs ${
                  configTab === tab ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted'
                }`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="glass-panel p-4 rounded-lg space-y-3">
            {configTab === 'general' && (
              <>
                <ConfigItem label="Default Model" value={config.model} onChange={(v) => handleUpdateConfig('model', v)} />
                <ConfigItem label="Default Agent" value={config.default_agent} onChange={(v) => handleUpdateConfig('default_agent', v)} />
                <ConfigItem label="Message Limit" value={config.message_limit} type="number" onChange={(v) => handleUpdateConfig('message_limit', parseInt(v))} />
                <ConfigItem label="Auto Save Session" value={config.auto_save_session} type="checkbox" onChange={(v) => handleUpdateConfig('auto_save_session', v)} />
              </>
            )}
            {configTab === 'safety' && (
              <>
                <ConfigItem label="YOLO Mode" value={config.yolo_mode} type="checkbox" onChange={(v) => handleUpdateConfig('yolo_mode', v)} />
                <ConfigItem label="Allow Recursion" value={config.allow_recursion} type="checkbox" onChange={(v) => handleUpdateConfig('allow_recursion', v)} />
                <ConfigItem label="Safety Permission Level" value={config.safety_permission_level} options={['ask', 'warn', 'allow']} onChange={(v) => handleUpdateConfig('safety_permission_level', v)} />
              </>
            )}
            {configTab === 'display' && (
              <>
                <ConfigItem label="Diff Context Lines" value={config.diff_context_lines} type="number" onChange={(v) => handleUpdateConfig('diff_context_lines', parseInt(v))} />
                <ConfigItem label="Highlight Addition Color" value={config.highlight_addition_color} type="color" onChange={(v) => handleUpdateConfig('highlight_addition_color', v)} />
                <ConfigItem label="Highlight Deletion Color" value={config.highlight_deletion_color} type="color" onChange={(v) => handleUpdateConfig('highlight_deletion_color', v)} />
                <ConfigItem label="Suppress Thinking" value={config.suppress_thinking_messages} type="checkbox" onChange={(v) => handleUpdateConfig('suppress_thinking_messages', v)} />
                <ConfigItem label="Suppress Info" value={config.suppress_informational_messages} type="checkbox" onChange={(v) => handleUpdateConfig('suppress_informational_messages', v)} />
              </>
            )}
            {configTab === 'advanced' && (
              <>
                <ConfigItem label="Enable DBOS" value={config.enable_dbos} type="checkbox" onChange={(v) => handleUpdateConfig('enable_dbos', v)} />
                <ConfigItem label="Disable MCP" value={config.disable_mcp} type="checkbox" onChange={(v) => handleUpdateConfig('disable_mcp', v)} />
                <ConfigItem label="HTTP/2" value={config.http2} type="checkbox" onChange={(v) => handleUpdateConfig('http2', v)} />
                <ConfigItem label="Grep Output Verbose" value={config.grep_output_verbose} type="checkbox" onChange={(v) => handleUpdateConfig('grep_output_verbose', v)} />
                <ConfigItem label="Subagent Verbose" value={config.subagent_verbose} type="checkbox" onChange={(v) => handleUpdateConfig('subagent_verbose', v)} />
                <ConfigItem label="Compaction Strategy" value={config.compaction_strategy} options={['truncate', 'summarize']} onChange={(v) => handleUpdateConfig('compaction_strategy', v)} />
                <ConfigItem label="Compaction Threshold" value={config.compaction_threshold} type="number" onChange={(v) => handleUpdateConfig('compaction_threshold', parseInt(v))} />
                <ConfigItem label="Protected Token Count" value={config.protected_token_count} type="number" onChange={(v) => handleUpdateConfig('protected_token_count', parseInt(v))} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Commands Tab */}
      {activeTab === 'commands' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Built-in Commands</h3>
            <div className="space-y-2">
              {commands.builtin?.map((cmd) => (
                <div key={cmd.command} className="flex items-start gap-3 text-sm">
                  <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{cmd.command}</code>
                  <div>
                    <div className="text-foreground">{cmd.description}</div>
                    <div className="text-xs text-muted">{cmd.usage}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {commands.custom?.length > 0 && (
            <div className="glass-panel p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">Custom Commands</h3>
              <div className="space-y-2">
                {commands.custom.map((cmd) => (
                  <div key={cmd.name} className="flex items-center justify-between text-sm">
                    <code className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">{cmd.name}</code>
                    <span className="text-xs text-muted truncate ml-2">{cmd.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Config Item Component
function ConfigItem({ label, value, type = 'text', options, onChange }) {
  if (type === 'checkbox') {
    return (
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <input type="checkbox" checked={value || false} onChange={(e) => onChange(e.target.checked)}
          className="rounded" />
      </label>
    );
  }

  if (options) {
    return (
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1 rounded bg-surface border border-border text-foreground text-sm">
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </label>
    );
  }

  if (type === 'color') {
    return (
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)}
            className="h-8 w-16 rounded cursor-pointer" />
          <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)}
            placeholder="#ffffff"
            className="px-2 py-1 rounded bg-surface border border-border text-foreground text-sm w-24 font-mono" />
        </div>
      </label>
    );
  }

  return (
    <label className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 rounded bg-surface border border-border text-foreground text-sm w-48" />
    </label>
  );
}

export default CodePuppyDashboard;
