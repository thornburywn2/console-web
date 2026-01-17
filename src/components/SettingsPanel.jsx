/**
 * Settings Panel Component
 * Comprehensive settings management for Console.web
 * Consolidates: General Settings, Themes, Keyboard Shortcuts, AI Personas, Auth, Paths, Integrations
 *
 * Refactored to use extracted pane components from ./settings/
 */

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Import extracted settings pane components
import {
  CATEGORIES,
  CategoryIcon,
  GeneralPane,
  AppearancePane,
  ShortcutsPane,
  PersonasPane,
  IntegrationsPane,
  AuthPane,
  ScansPane,
  SystemPane,
} from './settings';

export default function SettingsPanel() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES.GENERAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [generalSettings, setGeneralSettings] = useState(null);
  const [shortcuts, setShortcuts] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [authentikSettings, setAuthentikSettings] = useState(null);
  const [serverConfig, setServerConfig] = useState(null);
  const [scanSettings, setScanSettings] = useState(null);
  const [scanRecommendations, setScanRecommendations] = useState(null);
  const [scanQueueStatus, setScanQueueStatus] = useState(null);

  // Update states
  const [versionInfo, setVersionInfo] = useState(null);
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [updateLogs, setUpdateLogs] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Fetch all settings on mount
  useEffect(() => {
    fetchAllSettings();
    fetchVersionInfo();
  }, []);

  // Socket.IO listener for update progress
  useEffect(() => {
    const socket = io();

    socket.on('system-update-progress', (logEntry) => {
      setUpdateLogs(prev => [...prev, logEntry]);

      // Handle completion
      if (logEntry.step === 'done' && logEntry.status === 'complete') {
        setUpdateInProgress(false);
        // Auto-refresh page after delay
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }

      // Handle error
      if (logEntry.status === 'error') {
        setUpdateInProgress(false);
      }
    });

    return () => {
      socket.off('system-update-progress');
      socket.disconnect();
    };
  }, []);


  // Fetch version info
  const fetchVersionInfo = async () => {
    try {
      const res = await fetch('/api/system/version');

      // Check content type to avoid JSON parse errors on HTML responses
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Version endpoint returned non-JSON response (may need authentication or server update)');
        setVersionInfo({
          version: 'Unknown',
          branch: 'unknown',
          commit: 'unknown',
          hasUpdates: false,
          error: 'Update feature requires server update or authentication'
        });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setVersionInfo(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('Version fetch failed:', errorData);
        setVersionInfo({
          version: 'Unknown',
          branch: 'unknown',
          commit: 'unknown',
          hasUpdates: false,
          error: errorData.error || 'Failed to fetch version'
        });
      }
    } catch (err) {
      console.error('Failed to fetch version info:', err);
      setVersionInfo({
        version: 'Unknown',
        branch: 'unknown',
        commit: 'unknown',
        hasUpdates: false,
        error: 'Connection error'
      });
    }
  };

  // Trigger update
  const triggerUpdate = async () => {
    if (updateInProgress) return;

    if (!confirm('This will update Console.web from GitHub and restart the server. Continue?')) {
      return;
    }

    setUpdateInProgress(true);
    setUpdateLogs([]);
    setShowUpdateModal(true);

    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setUpdateLogs(prev => [...prev, {
          step: 'error',
          status: 'error',
          message: err.error || 'Failed to start update',
          timestamp: new Date().toISOString()
        }]);
        setUpdateInProgress(false);
      }
    } catch (err) {
      setUpdateLogs(prev => [...prev, {
        step: 'error',
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString()
      }]);
      setUpdateInProgress(false);
    }
  };

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, shortcutsRes, personasRes, authRes, configRes, scanRes, scanRecsRes, scanQueueRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/shortcuts'),
        fetch('/api/ai/personas'),
        fetch('/api/cloudflare/authentik/settings'),
        fetch('/api/config'),
        fetch('/api/lifecycle/settings'),
        fetch('/api/lifecycle/recommendations'),
        fetch('/api/lifecycle/queue'),
      ]);

      if (settingsRes.ok) setGeneralSettings(await settingsRes.json());
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

  // Reset all shortcuts
  const resetAllShortcuts = async () => {
    if (!confirm('Reset all shortcuts to defaults?')) return;
    try {
      const res = await fetch('/api/shortcuts/reset-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset shortcuts');
      const defaults = await res.json();
      setShortcuts(defaults);
      setSuccess('All shortcuts reset to defaults');
      setTimeout(() => setSuccess(''), 3000);
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
        <CategoryTab category={CATEGORIES.INTEGRATIONS} label="INTEGRATIONS" />
        <CategoryTab category={CATEGORIES.AUTH} label="AUTH" />
        <CategoryTab category={CATEGORIES.SCANS} label="SCANS" />
        <CategoryTab category={CATEGORIES.SYSTEM} label="SYSTEM" />
      </div>

      {/* Category Content */}
      <div className="hacker-card p-6">
        {/* GENERAL SETTINGS - Using extracted GeneralPane */}
        {activeCategory === CATEGORIES.GENERAL && (
          <GeneralPane
            settings={generalSettings}
            onSave={saveGeneralSettings}
            setActiveCategory={setActiveCategory}
          />
        )}

        {/* APPEARANCE - Using extracted AppearancePane */}
        {activeCategory === CATEGORIES.APPEARANCE && (
          <AppearancePane />
        )}

        {/* SHORTCUTS - Using extracted ShortcutsPane */}
        {activeCategory === CATEGORIES.SHORTCUTS && (
          <ShortcutsPane
            shortcuts={shortcuts}
            onSave={saveShortcut}
            onReset={resetShortcut}
            onResetAll={resetAllShortcuts}
          />
        )}

        {/* PERSONAS - Using extracted PersonasPane */}
        {activeCategory === CATEGORIES.PERSONAS && (
          <PersonasPane
            personas={personas}
            onSave={savePersona}
            onDelete={deletePersona}
          />
        )}

        {/* INTEGRATIONS - Using extracted IntegrationsPane */}
        {activeCategory === CATEGORIES.INTEGRATIONS && (
          <IntegrationsPane />
        )}

        {/* AUTH - Using extracted AuthPane */}
        {activeCategory === CATEGORIES.AUTH && (
          <AuthPane
            serverConfig={serverConfig}
            authentikSettings={authentikSettings}
            setAuthentikSettings={setAuthentikSettings}
            onSaveAuthentik={saveAuthentikSettings}
            saving={saving}
            setActiveCategory={setActiveCategory}
          />
        )}

        {/* SCANS - Using extracted ScansPane */}
        {activeCategory === CATEGORIES.SCANS && (
          <ScansPane
            generalSettings={generalSettings}
            scanQueueStatus={scanQueueStatus}
            scanRecommendations={scanRecommendations}
            onSave={saveGeneralSettings}
            onReloadSettings={async () => {
              await fetch('/api/lifecycle/settings/reload', { method: 'POST' });
              const scanRes = await fetch('/api/lifecycle/settings');
              if (scanRes.ok) setScanSettings(await scanRes.json());
              setSuccess('Settings reloaded');
              setTimeout(() => setSuccess(''), 3000);
            }}
            onCancelScans={async () => {
              await fetch('/api/lifecycle/queue/cancel', { method: 'POST' });
              const queueRes = await fetch('/api/lifecycle/queue');
              if (queueRes.ok) setScanQueueStatus(await queueRes.json());
              setSuccess('Pending scans cancelled');
              setTimeout(() => setSuccess(''), 3000);
            }}
            setSuccess={setSuccess}
          />
        )}

        {/* SYSTEM - Using extracted SystemPane */}
        {activeCategory === CATEGORIES.SYSTEM && (
          <SystemPane
            serverConfig={serverConfig}
            versionInfo={versionInfo}
            updateInProgress={updateInProgress}
            updateLogs={updateLogs}
            showUpdateModal={showUpdateModal}
            setShowUpdateModal={setShowUpdateModal}
            onTriggerUpdate={triggerUpdate}
            onRefreshVersion={fetchVersionInfo}
          />
        )}
      </div>
    </div>
  );
}
