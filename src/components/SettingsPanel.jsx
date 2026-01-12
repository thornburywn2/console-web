/**
 * Settings Panel Component
 * Comprehensive settings management for Console.web
 * Consolidates: General Settings, Themes, Keyboard Shortcuts, AI Personas, Auth, Paths, Integrations
 */

import { useState, useEffect, useCallback } from 'react';
import { GitHubSettingsTab, CloudflareSettingsTab } from './AdminDashboard';

// Settings categories
const CATEGORIES = {
  GENERAL: 'general',
  APPEARANCE: 'appearance',
  SHORTCUTS: 'shortcuts',
  PERSONAS: 'personas',
  INTEGRATIONS: 'integrations',
  AUTH: 'auth',
  SCANS: 'scans',
  SYSTEM: 'system',
};

// Category icons (SVG paths)
const CategoryIcon = ({ category }) => {
  const icons = {
    [CATEGORIES.GENERAL]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    [CATEGORIES.APPEARANCE]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    [CATEGORIES.SHORTCUTS]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    [CATEGORIES.PERSONAS]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    [CATEGORIES.INTEGRATIONS]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    [CATEGORIES.AUTH]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    [CATEGORIES.SCANS]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    [CATEGORIES.SYSTEM]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  };
  return icons[category] || null;
};

export default function SettingsPanel() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES.GENERAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [generalSettings, setGeneralSettings] = useState(null);
  const [themes, setThemes] = useState([]);
  const [activeTheme, setActiveTheme] = useState('dark');
  const [shortcuts, setShortcuts] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [authentikSettings, setAuthentikSettings] = useState(null);
  const [serverConfig, setServerConfig] = useState(null);
  const [scanSettings, setScanSettings] = useState(null);
  const [scanRecommendations, setScanRecommendations] = useState(null);
  const [scanQueueStatus, setScanQueueStatus] = useState(null);

  // Editing states
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [editingPersona, setEditingPersona] = useState(null);
  const [newPersona, setNewPersona] = useState(false);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [envVariables, setEnvVariables] = useState([]);
  const [savingEnv, setSavingEnv] = useState(false);

  // Fetch all settings on mount
  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, themesRes, shortcutsRes, personasRes, authRes, configRes, scanRes, scanRecsRes, scanQueueRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/themes'),
        fetch('/api/shortcuts'),
        fetch('/api/ai/personas'),
        fetch('/api/cloudflare/authentik/settings'),
        fetch('/api/config'),
        fetch('/api/lifecycle/settings'),
        fetch('/api/lifecycle/recommendations'),
        fetch('/api/lifecycle/queue'),
      ]);

      if (settingsRes.ok) setGeneralSettings(await settingsRes.json());
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        setThemes(themesData);
        const active = themesData.find(t => t.isActive);
        if (active) setActiveTheme(active.name);
      }
      if (shortcutsRes.ok) setShortcuts(await shortcutsRes.json());
      if (personasRes.ok) setPersonas(await personasRes.json());
      if (authRes.ok) setAuthentikSettings(await authRes.json());
      if (configRes.ok) setServerConfig(await configRes.json());
      if (scanRes.ok) setScanSettings(await scanRes.json());
      if (scanRecsRes.ok) setScanRecommendations(await scanRecsRes.json());
      if (scanQueueRes.ok) setScanQueueStatus(await scanQueueRes.json());
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Save general settings
  const saveGeneralSettings = async (updates) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      const data = await res.json();
      setGeneralSettings(data);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save keyboard shortcut
  const saveShortcut = async (action, keys) => {
    try {
      const res = await fetch(`/api/shortcuts/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) throw new Error('Failed to save shortcut');
      const updated = await res.json();
      setShortcuts(prev => prev.map(s => s.action === action ? { ...s, ...updated } : s));
      setEditingShortcut(null);
      setSuccess('Shortcut updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Reset shortcut to default
  const resetShortcut = async (action) => {
    try {
      const res = await fetch(`/api/shortcuts/${action}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to reset shortcut');
      const defaultShortcut = await res.json();
      setShortcuts(prev => prev.map(s => s.action === action ? { ...s, ...defaultShortcut } : s));
    } catch (err) {
      setError(err.message);
    }
  };

  // Save persona
  const savePersona = async (persona) => {
    try {
      const isNew = !persona.id;
      const res = await fetch(isNew ? '/api/ai/personas' : `/api/ai/personas/${persona.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona),
      });
      if (!res.ok) throw new Error('Failed to save persona');
      const saved = await res.json();
      if (isNew) {
        setPersonas(prev => [...prev, saved]);
      } else {
        setPersonas(prev => prev.map(p => p.id === saved.id ? saved : p));
      }
      setEditingPersona(null);
      setNewPersona(false);
      setSuccess('Persona saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete persona
  const deletePersona = async (id) => {
    if (!confirm('Delete this persona?')) return;
    try {
      const res = await fetch(`/api/ai/personas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete persona');
      setPersonas(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Save Authentik settings
  const saveAuthentikSettings = async (settings) => {
    setSaving(true);
    try {
      const res = await fetch('/api/cloudflare/authentik/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save Authentik settings');
      const saved = await res.json();
      setAuthentikSettings(saved);
      setSuccess('Authentik settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Fetch server .env variables
  const fetchEnvVariables = async () => {
    try {
      // Use __self__ to indicate the console-web server's own directory
      const res = await fetch(`/api/env/variables/__self__/.env`);
      if (res.ok) {
        const data = await res.json();
        setEnvVariables(data.variables || []);
      }
    } catch (err) {
      console.error('Failed to fetch env variables:', err);
    }
  };

  // Save server .env variables
  const saveEnvVariables = async () => {
    setSavingEnv(true);
    setError('');
    try {
      // Use __self__ to indicate the console-web server's own directory
      const res = await fetch(`/api/env/save/__self__/.env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: envVariables }),
      });
      if (!res.ok) throw new Error('Failed to save environment variables');
      setSuccess('Environment saved. Restart server to apply changes.');
      setTimeout(() => setSuccess(''), 5000);
      setShowEnvEditor(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEnv(false);
    }
  };

  // Category tab button
  const CategoryTab = ({ category, label }) => (
    <button
      onClick={() => setActiveCategory(category)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
        activeCategory === category
          ? 'border-hacker-green text-hacker-green'
          : 'border-transparent text-hacker-text-dim hover:text-hacker-text hover:border-hacker-green/30'
      }`}
    >
      <CategoryIcon category={category} />
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-hacker-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
          {'>'} SETTINGS
        </h3>
        {(error || success) && (
          <div className={`text-xs font-mono px-3 py-1 rounded ${error ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {error || success}
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 border-b border-hacker-green/20 overflow-x-auto">
        <CategoryTab category={CATEGORIES.GENERAL} label="GENERAL" />
        <CategoryTab category={CATEGORIES.APPEARANCE} label="APPEARANCE" />
        <CategoryTab category={CATEGORIES.SHORTCUTS} label="SHORTCUTS" />
        <CategoryTab category={CATEGORIES.PERSONAS} label="AI PERSONAS" />
        <CategoryTab category={CATEGORIES.INTEGRATIONS} label="INTEGRATIONS" />
        <CategoryTab category={CATEGORIES.AUTH} label="AUTH" />
        <CategoryTab category={CATEGORIES.SCANS} label="SCANS" />
        <CategoryTab category={CATEGORIES.SYSTEM} label="SYSTEM" />
      </div>

      {/* Category Content */}
      <div className="hacker-card p-6">
        {/* GENERAL SETTINGS */}
        {activeCategory === CATEGORIES.GENERAL && generalSettings && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">General Settings</h4>

            {/* Application Branding */}
            <div className="p-4 rounded bg-[var(--bg-surface)] border border-hacker-purple/30 space-y-4">
              <h5 className="text-xs font-mono text-hacker-purple uppercase">Application Branding</h5>
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">Application Name</label>
                <input
                  type="text"
                  value={generalSettings.appName || 'Command Portal'}
                  onChange={(e) => saveGeneralSettings({ appName: e.target.value })}
                  placeholder="Command Portal"
                  maxLength={50}
                  className="input-glass font-mono"
                />
                <p className="text-xs text-hacker-text-dim">The name displayed in the header and browser title. Refreshing the page applies the change.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Auto Reconnect */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.autoReconnect}
                    onChange={(e) => saveGeneralSettings({ autoReconnect: e.target.checked })}
                    className="checkbox-glass"
                  />
                  <span className="text-sm text-hacker-text">Auto-reconnect sessions</span>
                </label>
                <p className="text-xs text-hacker-text-dim ml-7">Automatically reconnect to terminal sessions on page load</p>
              </div>

              {/* Keep Sessions Alive */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.keepSessionsAlive}
                    onChange={(e) => saveGeneralSettings({ keepSessionsAlive: e.target.checked })}
                    className="checkbox-glass"
                  />
                  <span className="text-sm text-hacker-text">Keep sessions alive</span>
                </label>
                <p className="text-xs text-hacker-text-dim ml-7">Keep tmux sessions running when disconnected</p>
              </div>

              {/* Session Timeout */}
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">Session Timeout (seconds)</label>
                <input
                  type="number"
                  value={generalSettings.sessionTimeout}
                  onChange={(e) => saveGeneralSettings({ sessionTimeout: parseInt(e.target.value) || 3600 })}
                  min={60}
                  max={86400}
                  className="input-glass font-mono"
                />
                <p className="text-xs text-hacker-text-dim">Time before idle sessions are marked as disconnected</p>
              </div>

              {/* Sidebar Width */}
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">Sidebar Width (pixels)</label>
                <input
                  type="number"
                  value={generalSettings.sidebarWidth}
                  onChange={(e) => saveGeneralSettings({ sidebarWidth: parseInt(e.target.value) || 280 })}
                  min={200}
                  max={500}
                  className="input-glass font-mono"
                />
              </div>

              {/* Right Sidebar Collapsed */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.rightSidebarCollapsed}
                    onChange={(e) => saveGeneralSettings({ rightSidebarCollapsed: e.target.checked })}
                    className="checkbox-glass"
                  />
                  <span className="text-sm text-hacker-text">Collapse right sidebar by default</span>
                </label>
              </div>
            </div>

            {/* AI Solution Preference Section */}
            <div className="mt-8 pt-6 border-t border-hacker-green/20">
              <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>🤖</span> AI Coding Assistant
              </h4>
              <div className="space-y-4">
                {/* Preferred AI Solution */}
                <div className="space-y-2">
                  <label className="text-sm text-hacker-text font-medium">Preferred AI Solution</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'claude-code', label: 'Claude Code', icon: '💻', description: 'Official Anthropic CLI' },
                      { value: 'code-puppy', label: 'Code Puppy', icon: '🐕', description: 'Open source alternative' },
                      { value: 'hybrid', label: 'Hybrid Mode', icon: '🔀', description: 'Code Puppy + Claude tools' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`
                          flex flex-col p-3 rounded border cursor-pointer transition-all
                          ${generalSettings.preferredAISolution === option.value
                            ? 'border-hacker-cyan bg-hacker-cyan/10'
                            : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-surface)]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="aiSolution"
                            value={option.value}
                            checked={generalSettings.preferredAISolution === option.value}
                            onChange={(e) => saveGeneralSettings({ preferredAISolution: e.target.value })}
                            className="w-4 h-4 text-hacker-cyan focus:ring-hacker-cyan"
                          />
                          <span className="text-lg">{option.icon}</span>
                          <span className="text-sm font-medium text-hacker-text">{option.label}</span>
                        </div>
                        <p className="text-xs text-hacker-text-dim mt-1 ml-6">{option.description}</p>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-hacker-text-dim mt-2">
                    This determines which AI assistant launches when you open a project terminal.
                    Existing sessions will continue using their original AI solution.
                  </p>
                </div>

                {/* Code Puppy specific settings */}
                {(generalSettings.preferredAISolution === 'code-puppy' || generalSettings.preferredAISolution === 'hybrid') && (
                  <div className="ml-6 p-4 bg-[var(--bg-surface)] border border-hacker-green/20 rounded space-y-4">
                    <h5 className="text-xs font-semibold text-hacker-text uppercase tracking-wider flex items-center gap-2">
                      <span>🐕</span> Code Puppy Settings
                    </h5>

                    {/* Default Provider */}
                    <div className="space-y-2">
                      <label className="text-sm text-hacker-text">Default Provider</label>
                      <select
                        value={generalSettings.codePuppyProvider || 'anthropic'}
                        onChange={(e) => saveGeneralSettings({ codePuppyProvider: e.target.value })}
                        className="input-glass font-mono"
                      >
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="openai">OpenAI (GPT)</option>
                        <option value="google">Google (Gemini)</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="groq">Groq</option>
                        <option value="cerebras">Cerebras</option>
                        <option value="ollama">Ollama (Local)</option>
                      </select>
                    </div>

                    {/* Default Model */}
                    <div className="space-y-2">
                      <label className="text-sm text-hacker-text">Default Model (optional)</label>
                      <input
                        type="text"
                        value={generalSettings.codePuppyModel || ''}
                        onChange={(e) => saveGeneralSettings({ codePuppyModel: e.target.value || null })}
                        placeholder="e.g., claude-sonnet-4-20250514, gpt-4o"
                        className="input-glass font-mono"
                      />
                      <p className="text-xs text-hacker-text-dim">
                        Leave blank to use the provider's default model
                      </p>
                    </div>

                    {/* Hybrid Mode Options */}
                    {generalSettings.preferredAISolution === 'hybrid' && (
                      <div className="space-y-2 pt-4 border-t border-hacker-green/20">
                        <label className="text-sm text-hacker-text">Hybrid Mode Type</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="hybridMode"
                              value="code-puppy-with-claude-tools"
                              checked={generalSettings.hybridMode === 'code-puppy-with-claude-tools'}
                              onChange={(e) => saveGeneralSettings({ hybridMode: e.target.value })}
                              className="w-4 h-4 text-hacker-cyan focus:ring-hacker-cyan"
                            />
                            <span className="text-sm text-hacker-text">Code Puppy with Claude's MCP Servers</span>
                          </label>
                          <p className="text-xs text-hacker-text-dim ml-6">
                            Run Code Puppy but sync and use Claude Code's MCP server configuration
                          </p>
                          <label className="flex items-center gap-2 cursor-pointer mt-2">
                            <input
                              type="radio"
                              name="hybridMode"
                              value="claude-with-puppy-agents"
                              checked={generalSettings.hybridMode === 'claude-with-puppy-agents'}
                              onChange={(e) => saveGeneralSettings({ hybridMode: e.target.value })}
                              className="w-4 h-4 text-hacker-cyan focus:ring-hacker-cyan"
                            />
                            <span className="text-sm text-hacker-text">Claude Code with Code Puppy Agents</span>
                          </label>
                          <p className="text-xs text-hacker-text-dim ml-6">
                            Run Claude Code with access to invoke Code Puppy custom agents
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick action: Open Code Puppy Dashboard */}
                {(generalSettings.preferredAISolution === 'code-puppy' || generalSettings.preferredAISolution === 'hybrid') && (
                  <div className="flex items-center gap-3">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        // Navigate to Code Puppy tab - we'll need to emit an event or use window location
                        window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'code_puppy' }));
                      }}
                      className="hacker-btn text-sm"
                    >
                      Open Code Puppy Dashboard →
                    </a>
                    <span className="text-xs text-hacker-text-dim">
                      Configure agents, MCP servers, and more
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Experimental Features Section */}
            <div className="mt-8 pt-6 border-t border-hacker-green/20">
              <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>🧪</span> Experimental Features
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.showExperimentalFeatures || false}
                      onChange={(e) => saveGeneralSettings({ showExperimentalFeatures: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Show experimental features</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">
                    Enable experimental tabs in the Admin Dashboard (Tabby, Swarm). These features may be incomplete or require external dependencies.
                  </p>
                </div>
                {generalSettings.showExperimentalFeatures && (
                  <div className="ml-7 p-3 bg-hacker-warning/10 border border-hacker-warning/30 rounded text-xs text-hacker-text-dim">
                    <p className="font-medium text-hacker-warning mb-2">Experimental tabs enabled:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>TABBY</strong> - Tabby code completion (requires Docker + tabbyml/tabby image)</li>
                      <li><strong>SWARM</strong> - Claude Flow multi-agent swarms (awaiting @anthropics/claude-flow release)</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE SETTINGS */}
        {activeCategory === CATEGORIES.APPEARANCE && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Appearance</h4>

            <div className="space-y-4">
              <label className="text-sm text-hacker-text">Theme</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {themes.map(theme => (
                  <button
                    key={theme.name}
                    onClick={() => {
                      // Apply theme via localStorage and reload
                      localStorage.setItem('theme-storage', theme.name);
                      window.location.reload();
                    }}
                    className={`p-3 rounded border transition-all ${
                      activeTheme === theme.name
                        ? 'border-hacker-green bg-hacker-green/10'
                        : 'border-hacker-green/30 hover:border-hacker-green/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors?.accentPrimary || '#3b82f6' }}
                      />
                      <span className="text-sm font-mono text-hacker-text">{theme.displayName || theme.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors?.bgPrimary || '#0f172a' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors?.bgSecondary || '#1e293b' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors?.accentSuccess || '#10b981' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors?.accentDanger || '#ef4444' }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KEYBOARD SHORTCUTS */}
        {activeCategory === CATEGORIES.SHORTCUTS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Keyboard Shortcuts</h4>
              <button
                onClick={async () => {
                  if (confirm('Reset all shortcuts to defaults?')) {
                    await fetch('/api/shortcuts/reset', { method: 'POST' });
                    const res = await fetch('/api/shortcuts');
                    if (res.ok) setShortcuts(await res.json());
                  }
                }}
                className="px-3 py-1 text-xs font-mono border border-hacker-warning/50 text-hacker-warning rounded hover:bg-hacker-warning/10"
              >
                [RESET ALL]
              </button>
            </div>

            {/* Group shortcuts by category */}
            {['navigation', 'view', 'session', 'terminal', 'tools', 'help'].map(category => {
              const categoryShortcuts = shortcuts.filter(s => s.category === category);
              if (categoryShortcuts.length === 0) return null;
              return (
                <div key={category} className="space-y-2">
                  <h5 className="text-xs font-mono text-hacker-text-dim uppercase">{category}</h5>
                  <div className="space-y-1">
                    {categoryShortcuts.map(shortcut => (
                      <div key={shortcut.action} className="flex items-center justify-between py-2 px-3 bg-[var(--bg-surface)] rounded">
                        <div className="flex-1">
                          <span className="text-sm text-hacker-text">{shortcut.description}</span>
                          {shortcut.isCustom && (
                            <span className="ml-2 text-xs text-hacker-purple">(custom)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingShortcut === shortcut.action ? (
                            <input
                              type="text"
                              defaultValue={shortcut.keys}
                              onKeyDown={(e) => {
                                e.preventDefault();
                                const keys = [];
                                if (e.ctrlKey) keys.push('Ctrl');
                                if (e.shiftKey) keys.push('Shift');
                                if (e.altKey) keys.push('Alt');
                                if (e.metaKey) keys.push('Meta');
                                if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
                                  keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
                                }
                                if (keys.length > 1 || (keys.length === 1 && !['Ctrl', 'Shift', 'Alt', 'Meta'].includes(keys[0]))) {
                                  saveShortcut(shortcut.action, keys.join('+'));
                                }
                              }}
                              onBlur={() => setEditingShortcut(null)}
                              autoFocus
                              className="input-glass w-32 text-xs"
                              placeholder="Press keys..."
                            />
                          ) : (
                            <>
                              <code className="px-2 py-1 text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded" style={{ color: 'var(--accent-primary)' }}>
                                {shortcut.keys}
                              </code>
                              <button
                                onClick={() => setEditingShortcut(shortcut.action)}
                                className="text-xs text-hacker-text-dim hover:text-hacker-green"
                              >
                                [edit]
                              </button>
                              {shortcut.isCustom && (
                                <button
                                  onClick={() => resetShortcut(shortcut.action)}
                                  className="text-xs text-hacker-text-dim hover:text-hacker-warning"
                                >
                                  [reset]
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI PERSONAS */}
        {activeCategory === CATEGORIES.PERSONAS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">AI Personas</h4>
              <button
                onClick={() => {
                  setNewPersona(true);
                  setEditingPersona({
                    name: '',
                    description: '',
                    systemPrompt: '',
                    icon: '🤖',
                    color: '#3b82f6',
                    temperature: 0.7,
                    model: 'claude-3-sonnet',
                  });
                }}
                className="px-3 py-1 text-xs font-mono border border-hacker-green rounded hover:bg-hacker-green/10 text-hacker-green"
              >
                [+ NEW PERSONA]
              </button>
            </div>

            {/* Persona Editor Modal */}
            {editingPersona && (
              <div className="p-4 border border-hacker-cyan/30 rounded bg-[var(--bg-surface)] space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-mono text-hacker-cyan">{newPersona ? 'New Persona' : 'Edit Persona'}</h5>
                  <button onClick={() => { setEditingPersona(null); setNewPersona(false); }} className="text-hacker-text-dim hover:text-hacker-text">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-hacker-text-dim">Name</label>
                    <input
                      type="text"
                      value={editingPersona.name}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, name: e.target.value }))}
                      className="input-glass font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Icon (emoji)</label>
                    <input
                      type="text"
                      value={editingPersona.icon}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, icon: e.target.value }))}
                      className="input-glass font-mono mt-1"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-hacker-text-dim">Description</label>
                  <input
                    type="text"
                    value={editingPersona.description || ''}
                    onChange={(e) => setEditingPersona(prev => ({ ...prev, description: e.target.value }))}
                    className="input-glass font-mono mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-hacker-text-dim">System Prompt</label>
                  <textarea
                    value={editingPersona.systemPrompt}
                    onChange={(e) => setEditingPersona(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={5}
                    className="input-glass font-mono mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-hacker-text-dim">Temperature</label>
                    <input
                      type="number"
                      value={editingPersona.temperature || 0.7}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      min={0}
                      max={2}
                      step={0.1}
                      className="input-glass font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Model</label>
                    <select
                      value={editingPersona.model || 'claude-3-sonnet'}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, model: e.target.value }))}
                      className="input-glass font-mono mt-1"
                    >
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku">Claude 3 Haiku</option>
                      <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Color</label>
                    <input
                      type="color"
                      value={editingPersona.color || '#3b82f6'}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full mt-1 h-10 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setEditingPersona(null); setNewPersona(false); }}
                    className="px-4 py-2 text-sm font-mono border border-hacker-text-dim/30 rounded text-hacker-text-dim hover:bg-hacker-text-dim/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => savePersona(editingPersona)}
                    className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10"
                  >
                    Save Persona
                  </button>
                </div>
              </div>
            )}

            {/* Persona List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map(persona => (
                <div key={persona.id} className="p-4 border border-hacker-green/20 rounded bg-[var(--bg-surface)] hover:border-hacker-green/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{persona.icon || '🤖'}</span>
                      <div>
                        <h5 className="text-sm font-semibold text-hacker-text">{persona.name}</h5>
                        <p className="text-xs text-hacker-text-dim">{persona.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {persona.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-hacker-green/20 text-hacker-green rounded">default</span>
                      )}
                      {!persona.isBuiltIn && (
                        <>
                          <button
                            onClick={() => setEditingPersona(persona)}
                            className="text-xs text-hacker-text-dim hover:text-hacker-cyan"
                          >
                            [edit]
                          </button>
                          <button
                            onClick={() => deletePersona(persona.id)}
                            className="text-xs text-hacker-text-dim hover:text-hacker-danger"
                          >
                            [delete]
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-hacker-text-dim">
                    <span>Model: {persona.model || 'default'}</span>
                    <span>Temp: {persona.temperature || 0.7}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INTEGRATIONS SETTINGS */}
        {activeCategory === CATEGORIES.INTEGRATIONS && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">External Integrations</h4>
            <p className="text-xs text-hacker-text-dim">Connect Console.web to external services like GitHub and Cloudflare.</p>

            {/* GitHub Integration */}
            <div className="border border-hacker-green/20 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-hacker-surface/50 border-b border-hacker-green/20">
                <h5 className="text-sm font-mono text-hacker-text flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </h5>
              </div>
              <div className="p-4">
                <GitHubSettingsTab />
              </div>
            </div>

            {/* Cloudflare Integration */}
            <div className="border border-hacker-green/20 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-hacker-surface/50 border-b border-hacker-green/20">
                <h5 className="text-sm font-mono text-hacker-text flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.5765-.4961-.9873-.5049l-8.1084-.1113c-.0537-.0009-.1025-.0229-.1377-.0615-.0351-.0385-.0545-.0903-.0535-.1435.0019-.0463.0257-.0885.0618-.1182.0361-.0298.0833-.0452.1308-.0412l8.1608.1122c.8662.0322 1.7933-.6133 2.1033-1.4697l.393-1.0875c.0425-.1173.0634-.242.0567-.3672-.244-4.4717-4.0044-8.0528-8.5438-8.0528-4.5223 0-8.2779 3.5588-8.5438 8.0528-.0067.1253.0142.25.0567.3672l.393 1.0875c.3057.8564 1.2329 1.5019 2.1033 1.4697l8.1608-.1122c.0475-.004.095.0114.1308.0412.0361.0297.06.0719.0618.1182.001.0532-.0184.105-.0535.1435-.0352.0386-.084.0606-.1377.0615l-8.1084.1113c-.4108.0088-.7627.1885-.9873.5049-.2461.3447-.3028.8086-.1553 1.3154l.1113.3838c.3516 1.2109 1.4458 2.0557 2.7159 2.0997l10.6702.5879c.0195.001.0382-.0049.0533-.017.0152-.0121.0259-.0299.0299-.0496.0027-.0139.0023-.0281-.0013-.0419-.0035-.0137-.0102-.0268-.0194-.0382l-.8799-1.09c-.3594-.4448-.8928-.7051-1.5005-.7305L5.6558 15.641c-.0427-.0018-.0817-.0228-.1057-.0572-.024-.0343-.0314-.0783-.0199-.1196l.0225-.0813c.0398-.1462.1769-.249.3272-.249l11.5008.1123c.8457 0 1.6436-.4443 2.0932-1.1641.3232-.5145.4531-1.0898.3876-1.7217l-.1201-.9151c-.0177-.1357-.0295-.2717-.0295-.4082 0-1.2656.5122-2.4072 1.3438-3.2383.8315-.831 1.9731-1.3428 3.2387-1.3428 1.2656 0 2.4072.5118 3.2383 1.3428.831.8311 1.3428 1.9727 1.3428 3.2383 0 .1365-.0118.2726-.0295.4082l-.1201.9151c-.0655.6319.0644 1.2072.3876 1.7217.4496.7198 1.2475 1.1641 2.0932 1.1641z"/></svg>
                  Cloudflare
                </h5>
              </div>
              <div className="p-4">
                <CloudflareSettingsTab />
              </div>
            </div>
          </div>
        )}

        {/* AUTH SETTINGS */}
        {activeCategory === CATEGORIES.AUTH && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Authentication</h4>

            {/* Current Server Auth Configuration (Read-Only) */}
            {serverConfig && (
              <div className="p-4 rounded bg-[var(--bg-surface)] border border-hacker-green/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-mono text-hacker-green uppercase">Proxy Authentication Status</h5>
                  <span className={`px-2 py-1 text-xs font-mono rounded ${
                    serverConfig.auth?.enabled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {serverConfig.auth?.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-hacker-text-dim">Provider</label>
                    <div className="mt-1 px-3 py-2 text-sm font-mono bg-hacker-surface border border-hacker-border rounded text-hacker-text">
                      Authentik (Proxy Forward Auth)
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Auth Endpoint</label>
                    <div className="mt-1 px-3 py-2 text-sm font-mono bg-hacker-surface border border-hacker-border rounded text-hacker-cyan truncate" title={serverConfig.auth?.authentikUrl}>
                      {serverConfig.auth?.authentikUrl || 'Not configured'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">OAuth Client ID</label>
                    <div className="mt-1 px-3 py-2 text-sm font-mono bg-hacker-surface border border-hacker-border rounded text-hacker-text">
                      {serverConfig.auth?.clientId || 'Not configured'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Configuration</label>
                    <div className="mt-1 px-3 py-2 text-sm font-mono bg-hacker-surface border border-hacker-border rounded text-hacker-text-dim">
                      Environment Variables (server/.env)
                    </div>
                  </div>
                </div>

                <p className="text-xs text-hacker-text-dim mt-2">
                  Authentication is configured via environment variables. Use the <button onClick={() => setActiveCategory(CATEGORIES.SYSTEM)} className="text-hacker-cyan hover:underline">[EDIT .ENV]</button> button in System settings to modify.
                </p>
              </div>
            )}

            {/* Authentik API Integration (for managing Authentik resources) */}
            <div className="border-t border-hacker-green/20 pt-6">
              <h5 className="text-sm font-semibold text-hacker-purple uppercase tracking-wider mb-4">Authentik API Integration (Advanced)</h5>
              <p className="text-xs text-hacker-text-dim mb-4">
                Configure API access to manage Authentik resources (create providers, applications, etc.) for published routes.
              </p>

              {authentikSettings && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded bg-[var(--bg-surface)]">
                    <div className={`w-3 h-3 rounded-full ${authentikSettings.configured ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm text-hacker-text">
                      {authentikSettings.configured ? 'API access configured' : 'API access not configured'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-hacker-text-dim">Authentik API URL</label>
                      <input
                        type="text"
                        value={authentikSettings.apiUrl || ''}
                        onChange={(e) => setAuthentikSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
                        placeholder="https://auth.example.com"
                        className="input-glass font-mono mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-hacker-text-dim">API Token</label>
                      <input
                        type="password"
                        value={authentikSettings.apiToken || ''}
                        onChange={(e) => setAuthentikSettings(prev => ({ ...prev, apiToken: e.target.value }))}
                        placeholder="Enter Authentik API token"
                        className="input-glass font-mono mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-hacker-text-dim">Outpost ID</label>
                        <input
                          type="text"
                          value={authentikSettings.outpostId || ''}
                          onChange={(e) => setAuthentikSettings(prev => ({ ...prev, outpostId: e.target.value }))}
                          className="input-glass font-mono mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-hacker-text-dim">Default Group ID</label>
                        <input
                          type="text"
                          value={authentikSettings.defaultGroupId || ''}
                          onChange={(e) => setAuthentikSettings(prev => ({ ...prev, defaultGroupId: e.target.value }))}
                          className="input-glass font-mono mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={authentikSettings.enabled || false}
                        onChange={(e) => setAuthentikSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 rounded border-hacker-green/50 bg-transparent text-hacker-green"
                      />
                      <span className="text-sm text-hacker-text">Enable Authentik API integration for route publishing</span>
                    </div>
                    <button
                      onClick={() => saveAuthentikSettings(authentikSettings)}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Authentik API Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCAN RESOURCE SETTINGS */}
        {activeCategory === CATEGORIES.SCANS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Security & Quality Scan Settings</h4>
              {scanQueueStatus && (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${scanQueueStatus.activeScans > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                  <span className="text-xs text-hacker-text-dim">
                    {scanQueueStatus.activeScans > 0 ? `${scanQueueStatus.activeScans} scan(s) running` : 'Idle'}
                    {scanQueueStatus.queueLength > 0 && `, ${scanQueueStatus.queueLength} queued`}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-hacker-text-dim">
              Configure resource limits to prevent system overload during security and quality scans.
              These scans can be CPU/memory intensive - adjust based on your system specs.
            </p>

            {/* System Recommendations */}
            {scanRecommendations && scanRecommendations.systemSpecs && (
              <div className="p-4 rounded bg-[var(--bg-surface)] border border-hacker-cyan/30 space-y-3">
                <h5 className="text-xs font-mono text-hacker-cyan uppercase">System Analysis</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-hacker-text-dim">Total Memory:</span>{' '}
                    <span className="text-hacker-green">{Math.round(scanRecommendations.systemSpecs.totalMemoryMb / 1024)} GB</span>
                  </div>
                  <div>
                    <span className="text-hacker-text-dim">CPU Cores:</span>{' '}
                    <span className="text-hacker-green">{scanRecommendations.systemSpecs.cpuCores}</span>
                  </div>
                </div>
                {scanRecommendations.notes && (
                  <div className="mt-2 space-y-1">
                    {scanRecommendations.notes.slice(0, 3).map((note, i) => (
                      <p key={i} className="text-xs text-hacker-text-dim">• {note}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scan Feature Toggles */}
            <div className="space-y-4">
              <h5 className="text-xs font-mono text-hacker-purple uppercase">Scan Toggles</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.enableSecurityScans ?? true}
                      onChange={(e) => saveGeneralSettings({ enableSecurityScans: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Enable Security Scans (AGENT-018)</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Vulnerability detection, secrets scanning, SAST analysis</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.enableQualityScans ?? true}
                      onChange={(e) => saveGeneralSettings({ enableQualityScans: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Enable Quality Scans (AGENT-019)</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Tests, coverage analysis, code quality checks</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.enablePrePushPipeline ?? true}
                      onChange={(e) => saveGeneralSettings({ enablePrePushPipeline: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Run Scans Before GitHub Push</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Automatically run security/quality checks before pushing</p>
                </div>
              </div>
            </div>

            {/* Heavy Operations (Skip Toggles) */}
            <div className="space-y-4">
              <h5 className="text-xs font-mono text-hacker-purple uppercase">Heavy Operations (Skip to Save Resources)</h5>
              <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs text-yellow-400">
                  These operations are resource-intensive. Enable skipping to reduce CPU/memory usage during scans.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.skipContainerScan ?? true}
                      onChange={(e) => saveGeneralSettings({ skipContainerScan: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Skip Container Scan (Trivy)</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Builds Docker image then scans - VERY heavy</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.skipSastScan ?? false}
                      onChange={(e) => saveGeneralSettings({ skipSastScan: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Skip SAST Scan (Semgrep)</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Static code analysis - high CPU usage on large codebases</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.skipE2eTests ?? true}
                      onChange={(e) => saveGeneralSettings({ skipE2eTests: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Skip E2E Tests (Playwright/Cypress)</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Spawns browser instances - very memory intensive</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings?.skipCoverageReport ?? false}
                      onChange={(e) => saveGeneralSettings({ skipCoverageReport: e.target.checked })}
                      className="checkbox-glass"
                    />
                    <span className="text-sm text-hacker-text">Skip Coverage Report</span>
                  </label>
                  <p className="text-xs text-hacker-text-dim ml-7">Code coverage analysis during tests</p>
                </div>
              </div>
            </div>

            {/* Resource Limits */}
            <div className="space-y-4">
              <h5 className="text-xs font-mono text-hacker-purple uppercase">Resource Limits</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-hacker-text">Scan Concurrency</label>
                  <input
                    type="number"
                    value={generalSettings?.scanConcurrency ?? 1}
                    onChange={(e) => saveGeneralSettings({ scanConcurrency: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={4}
                    className="input-glass font-mono"
                  />
                  <p className="text-xs text-hacker-text-dim">Max parallel scans (1 = sequential, safest)</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-hacker-text">Memory Limit (MB)</label>
                  <input
                    type="number"
                    value={generalSettings?.scanMemoryLimitMb ?? 2048}
                    onChange={(e) => saveGeneralSettings({ scanMemoryLimitMb: parseInt(e.target.value) || 2048 })}
                    min={512}
                    max={16384}
                    step={256}
                    className="input-glass font-mono"
                  />
                  <p className="text-xs text-hacker-text-dim">
                    Max memory per scan
                    {scanRecommendations?.recommended?.scanMemoryLimitMb && (
                      <span className="text-hacker-cyan"> (recommended: {scanRecommendations.recommended.scanMemoryLimitMb}MB)</span>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-hacker-text">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={generalSettings?.scanTimeoutSeconds ?? 600}
                    onChange={(e) => saveGeneralSettings({ scanTimeoutSeconds: parseInt(e.target.value) || 600 })}
                    min={60}
                    max={3600}
                    step={60}
                    className="input-glass font-mono"
                  />
                  <p className="text-xs text-hacker-text-dim">Max time per scan before timeout</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-hacker-text">Nice Level (CPU Priority)</label>
                  <input
                    type="number"
                    value={generalSettings?.scanNiceLevel ?? 15}
                    onChange={(e) => saveGeneralSettings({ scanNiceLevel: parseInt(e.target.value) || 15 })}
                    min={0}
                    max={19}
                    className="input-glass font-mono"
                  />
                  <p className="text-xs text-hacker-text-dim">0 = normal, 19 = lowest priority</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-hacker-text">I/O Priority Class</label>
                  <select
                    value={generalSettings?.scanIoniceClass ?? 3}
                    onChange={(e) => saveGeneralSettings({ scanIoniceClass: parseInt(e.target.value) })}
                    className="input-glass font-mono"
                  >
                    <option value={0}>0 - None (no I/O priority)</option>
                    <option value={1}>1 - Realtime (highest)</option>
                    <option value={2}>2 - Best Effort (normal)</option>
                    <option value={3}>3 - Idle (only when system idle)</option>
                  </select>
                  <p className="text-xs text-hacker-text-dim">ionice class for disk I/O</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-hacker-text">CPU Limit (%)</label>
                  <input
                    type="number"
                    value={generalSettings?.scanCpuLimit ?? 50}
                    onChange={(e) => saveGeneralSettings({ scanCpuLimit: parseInt(e.target.value) || 50 })}
                    min={10}
                    max={100}
                    step={10}
                    className="input-glass font-mono"
                  />
                  <p className="text-xs text-hacker-text-dim">Max CPU % per scan (requires cpulimit)</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4 pt-4 border-t border-hacker-green/20">
              <h5 className="text-xs font-mono text-hacker-purple uppercase">Quick Actions</h5>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    await fetch('/api/lifecycle/settings/reload', { method: 'POST' });
                    const scanRes = await fetch('/api/lifecycle/settings');
                    if (scanRes.ok) setScanSettings(await scanRes.json());
                    setSuccess('Settings reloaded');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                  className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10"
                >
                  [RELOAD SETTINGS]
                </button>

                <button
                  onClick={async () => {
                    if (confirm('Cancel all pending scans?')) {
                      await fetch('/api/lifecycle/queue/cancel', { method: 'POST' });
                      const queueRes = await fetch('/api/lifecycle/queue');
                      if (queueRes.ok) setScanQueueStatus(await queueRes.json());
                      setSuccess('Pending scans cancelled');
                      setTimeout(() => setSuccess(''), 3000);
                    }
                  }}
                  disabled={!scanQueueStatus || scanQueueStatus.queueLength === 0}
                  className="px-4 py-2 text-sm font-mono border border-hacker-warning rounded text-hacker-warning hover:bg-hacker-warning/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [CANCEL QUEUED SCANS]
                </button>

                {scanRecommendations?.recommended && (
                  <button
                    onClick={() => {
                      if (confirm('Apply recommended settings based on your system specs?')) {
                        saveGeneralSettings(scanRecommendations.recommended);
                      }
                    }}
                    className="px-4 py-2 text-sm font-mono border border-hacker-cyan rounded text-hacker-cyan hover:bg-hacker-cyan/10"
                  >
                    [APPLY RECOMMENDED]
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM INFO */}
        {activeCategory === CATEGORIES.SYSTEM && serverConfig && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">System Configuration</h4>
                <p className="text-xs text-hacker-text-dim">Server configuration from environment variables</p>
              </div>
              <button
                onClick={() => {
                  fetchEnvVariables();
                  setShowEnvEditor(true);
                }}
                className="px-4 py-2 text-sm font-mono border border-hacker-warning rounded text-hacker-warning hover:bg-hacker-warning/10"
              >
                [EDIT .ENV]
              </button>
            </div>

            {/* Environment Editor Modal */}
            {showEnvEditor && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-[var(--bg-primary)] border border-hacker-warning/50 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                  <div className="p-4 border-b border-hacker-warning/30 flex items-center justify-between">
                    <h5 className="text-sm font-mono text-hacker-warning">Edit Server Environment (.env)</h5>
                    <button onClick={() => setShowEnvEditor(false)} className="text-hacker-text-dim hover:text-hacker-text text-xl">&times;</button>
                  </div>
                  <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                    <p className="text-xs text-hacker-text-dim bg-hacker-warning/10 p-2 rounded">
                      Changes require server restart to take effect. Be careful with sensitive values.
                    </p>
                    {envVariables.map((v, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={v.key}
                          onChange={(e) => {
                            const updated = [...envVariables];
                            updated[i].key = e.target.value;
                            setEnvVariables(updated);
                          }}
                          placeholder="KEY"
                          className="input-glass font-mono text-xs w-1/3"
                        />
                        <span className="text-hacker-text-dim">=</span>
                        <input
                          type={/secret|password|key|token/i.test(v.key) ? 'password' : 'text'}
                          value={v.value}
                          onChange={(e) => {
                            const updated = [...envVariables];
                            updated[i].value = e.target.value;
                            setEnvVariables(updated);
                          }}
                          placeholder="value"
                          className="input-glass font-mono text-xs flex-1"
                        />
                        <button
                          onClick={() => setEnvVariables(envVariables.filter((_, idx) => idx !== i))}
                          className="text-hacker-error hover:text-hacker-error/80 text-xs"
                          title="Remove"
                        >
                          [X]
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEnvVariables([...envVariables, { key: '', value: '' }])}
                      className="text-xs text-hacker-cyan hover:text-hacker-green"
                    >
                      + Add Variable
                    </button>
                  </div>
                  <div className="p-4 border-t border-hacker-warning/30 flex justify-end gap-3">
                    <button
                      onClick={() => setShowEnvEditor(false)}
                      className="px-4 py-2 text-sm font-mono border border-hacker-text-dim/30 rounded text-hacker-text-dim hover:bg-hacker-text-dim/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEnvVariables}
                      disabled={savingEnv}
                      className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10 disabled:opacity-50"
                    >
                      {savingEnv ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Version Info */}
              <div className="space-y-3">
                <h5 className="text-xs font-mono text-hacker-purple uppercase">Version</h5>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">Version</span>
                    <code className="text-xs text-hacker-green">{serverConfig.version}</code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">Environment</span>
                    <code className="text-xs text-hacker-cyan">{serverConfig.environment}</code>
                  </div>
                </div>
              </div>

              {/* Ports */}
              <div className="space-y-3">
                <h5 className="text-xs font-mono text-hacker-purple uppercase">Ports</h5>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">API Port</span>
                    <code className="text-xs text-hacker-green">{serverConfig.ports.api}</code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">Frontend Port</span>
                    <code className="text-xs text-hacker-green">{serverConfig.ports.frontend}</code>
                  </div>
                </div>
              </div>

              {/* Paths */}
              <div className="space-y-3 md:col-span-2">
                <h5 className="text-xs font-mono text-hacker-purple uppercase">Paths</h5>
                <div className="space-y-1">
                  {Object.entries(serverConfig.paths).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-hacker-green/10">
                      <span className="text-xs text-hacker-text-dim">{key}</span>
                      <code className="text-xs text-hacker-green truncate max-w-[60%]" title={value}>{value}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auth */}
              <div className="space-y-3">
                <h5 className="text-xs font-mono text-hacker-purple uppercase">Authentication</h5>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">Auth Enabled</span>
                    <code className={`text-xs ${serverConfig.auth.enabled ? 'text-green-400' : 'text-yellow-400'}`}>
                      {serverConfig.auth.enabled ? 'true' : 'false'}
                    </code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">Authentik URL</span>
                    <code className="text-xs text-hacker-green">{serverConfig.auth.authentikUrl}</code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hacker-green/10">
                    <span className="text-xs text-hacker-text-dim">Client ID</span>
                    <code className="text-xs text-hacker-green">{serverConfig.auth.clientId}</code>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <h5 className="text-xs font-mono text-hacker-purple uppercase">Features</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(serverConfig.features).map(([feature, enabled]) => (
                    <span
                      key={feature}
                      className={`px-2 py-1 text-xs font-mono rounded ${
                        enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sovereign Services */}
              <div className="space-y-3 md:col-span-2">
                <h5 className="text-xs font-mono text-hacker-purple uppercase">Sovereign Services</h5>
                <div className="flex flex-wrap gap-2">
                  {serverConfig.sovereignServices.map(service => (
                    <span key={service} className="px-2 py-1 text-xs font-mono bg-hacker-purple/20 text-hacker-purple rounded">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
