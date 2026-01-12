/**
 * Settings Panel Component
 * Comprehensive settings management for Command Portal
 * Consolidates: General Settings, Themes, Keyboard Shortcuts, AI Personas, Auth, Paths
 */

import { useState, useEffect, useCallback } from 'react';

// Settings categories
const CATEGORIES = {
  GENERAL: 'general',
  APPEARANCE: 'appearance',
  SHORTCUTS: 'shortcuts',
  PERSONAS: 'personas',
  AUTH: 'auth',
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
    [CATEGORIES.AUTH]: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

  // Editing states
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [editingPersona, setEditingPersona] = useState(null);
  const [newPersona, setNewPersona] = useState(false);

  // Fetch all settings on mount
  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, themesRes, shortcutsRes, personasRes, authRes, configRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/themes'),
        fetch('/api/shortcuts'),
        fetch('/api/ai/personas'),
        fetch('/api/cloudflare/authentik/settings'),
        fetch('/api/config'),
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
        <CategoryTab category={CATEGORIES.AUTH} label="AUTH" />
        <CategoryTab category={CATEGORIES.SYSTEM} label="SYSTEM" />
      </div>

      {/* Category Content */}
      <div className="hacker-card p-6">
        {/* GENERAL SETTINGS */}
        {activeCategory === CATEGORIES.GENERAL && generalSettings && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">General Settings</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Auto Reconnect */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.autoReconnect}
                    onChange={(e) => saveGeneralSettings({ autoReconnect: e.target.checked })}
                    className="w-4 h-4 rounded border-hacker-green/50 bg-transparent text-hacker-green focus:ring-hacker-green/50"
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
                    className="w-4 h-4 rounded border-hacker-green/50 bg-transparent text-hacker-green focus:ring-hacker-green/50"
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
                  className="w-full px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded focus:border-hacker-green focus:ring-1 focus:ring-hacker-green/50 text-hacker-text"
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
                  className="w-full px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded focus:border-hacker-green focus:ring-1 focus:ring-hacker-green/50 text-hacker-text"
                />
              </div>

              {/* Right Sidebar Collapsed */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.rightSidebarCollapsed}
                    onChange={(e) => saveGeneralSettings({ rightSidebarCollapsed: e.target.checked })}
                    className="w-4 h-4 rounded border-hacker-green/50 bg-transparent text-hacker-green focus:ring-hacker-green/50"
                  />
                  <span className="text-sm text-hacker-text">Collapse right sidebar by default</span>
                </label>
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
                      <div key={shortcut.action} className="flex items-center justify-between py-2 px-3 bg-hacker-dark/50 rounded">
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
                              className="w-32 px-2 py-1 text-xs font-mono bg-hacker-dark border border-hacker-green rounded text-hacker-green"
                              placeholder="Press keys..."
                            />
                          ) : (
                            <>
                              <code className="px-2 py-1 text-xs font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-green">
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
              <div className="p-4 border border-hacker-cyan/30 rounded bg-hacker-dark/50 space-y-4">
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
                      className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Icon (emoji)</label>
                    <input
                      type="text"
                      value={editingPersona.icon}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
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
                    className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
                  />
                </div>
                <div>
                  <label className="text-xs text-hacker-text-dim">System Prompt</label>
                  <textarea
                    value={editingPersona.systemPrompt}
                    onChange={(e) => setEditingPersona(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={5}
                    className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
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
                      className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">Model</label>
                    <select
                      value={editingPersona.model || 'claude-3-sonnet'}
                      onChange={(e) => setEditingPersona(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
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
                      className="w-full mt-1 h-10 bg-hacker-dark border border-hacker-green/30 rounded cursor-pointer"
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
                <div key={persona.id} className="p-4 border border-hacker-green/20 rounded bg-hacker-dark/50 hover:border-hacker-green/40 transition-colors">
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

        {/* AUTH SETTINGS */}
        {activeCategory === CATEGORIES.AUTH && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Authentication (Authentik)</h4>

            {authentikSettings && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded bg-hacker-dark/50">
                  <div className={`w-3 h-3 rounded-full ${authentikSettings.configured ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-hacker-text">
                    {authentikSettings.configured ? 'Authentik configured' : 'Authentik not configured'}
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
                      className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-hacker-text-dim">API Token</label>
                    <input
                      type="password"
                      value={authentikSettings.apiToken || ''}
                      onChange={(e) => setAuthentikSettings(prev => ({ ...prev, apiToken: e.target.value }))}
                      placeholder="Enter Authentik API token"
                      className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-hacker-text-dim">Outpost ID</label>
                      <input
                        type="text"
                        value={authentikSettings.outpostId || ''}
                        onChange={(e) => setAuthentikSettings(prev => ({ ...prev, outpostId: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-hacker-text-dim">Default Group ID</label>
                      <input
                        type="text"
                        value={authentikSettings.defaultGroupId || ''}
                        onChange={(e) => setAuthentikSettings(prev => ({ ...prev, defaultGroupId: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 text-sm font-mono bg-hacker-dark border border-hacker-green/30 rounded text-hacker-text"
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
                    <span className="text-sm text-hacker-text">Enable Authentik integration</span>
                  </div>
                  <button
                    onClick={() => saveAuthentikSettings(authentikSettings)}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Authentik Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SYSTEM INFO */}
        {activeCategory === CATEGORIES.SYSTEM && serverConfig && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">System Configuration</h4>
            <p className="text-xs text-hacker-text-dim">Read-only server configuration (set via environment variables)</p>

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
