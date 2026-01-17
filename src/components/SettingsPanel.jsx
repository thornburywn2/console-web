/**
 * Settings Panel Component
 * Comprehensive settings management for Console.web
 * Consolidates: General Settings, Themes, Keyboard Shortcuts, AI Personas, Auth, Paths, Integrations
 *
 * Refactored to use extracted pane components from ./settings/
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  systemApi,
  systemVersionApi,
  shortcutsApi,
  personasApi,
  authentikSettingsApi,
  configApi,
  lifecycleExtendedApi,
} from '../services/api.js';

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
      const data = await systemVersionApi.getVersion();
      setVersionInfo(data);
    } catch (err) {
      console.error('Failed to fetch version info:', err.getUserMessage?.() || err.message);
      setVersionInfo({
        version: 'Unknown',
        branch: 'unknown',
        commit: 'unknown',
        hasUpdates: false,
        error: err.getUserMessage?.() || 'Connection error'
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
      await systemVersionApi.triggerUpdate();
    } catch (err) {
      setUpdateLogs(prev => [...prev, {
        step: 'error',
        status: 'error',
        message: err.getUserMessage?.() || err.message,
        timestamp: new Date().toISOString()
      }]);
      setUpdateInProgress(false);
    }
  };

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const [settings, shortcuts, personas, authSettings, config, scanSettings, scanRecs, scanQueue] = await Promise.all([
        systemApi.getSettings().catch(() => null),
        shortcutsApi.list().catch(() => []),
        personasApi.list().catch(() => []),
        authentikSettingsApi.get().catch(() => null),
        configApi.get().catch(() => null),
        lifecycleExtendedApi.getSettings().catch(() => null),
        lifecycleExtendedApi.getRecommendations().catch(() => null),
        lifecycleExtendedApi.getQueue().catch(() => null),
      ]);

      if (settings) setGeneralSettings(settings);
      if (shortcuts) setShortcuts(shortcuts);
      if (personas) setPersonas(personas);
      if (authSettings) setAuthentikSettings(authSettings);
      if (config) setServerConfig(config);
      if (scanSettings) setScanSettings(scanSettings);
      if (scanRecs) setScanRecommendations(scanRecs);
      if (scanQueue) setScanQueueStatus(scanQueue);
    } catch (err) {
      setError(err.getUserMessage?.() || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Save general settings
  const saveGeneralSettings = async (updates) => {
    setSaving(true);
    setError('');
    try {
      const data = await systemApi.updateSettings(updates);
      setGeneralSettings(data);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save keyboard shortcut
  const saveShortcut = async (action, keys) => {
    try {
      const updated = await shortcutsApi.update(action, keys);
      setShortcuts(prev => prev.map(s => s.action === action ? { ...s, ...updated } : s));
      setSuccess('Shortcut updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  // Reset shortcut to default
  const resetShortcut = async (action) => {
    try {
      const defaultShortcut = await shortcutsApi.reset(action);
      setShortcuts(prev => prev.map(s => s.action === action ? { ...s, ...defaultShortcut } : s));
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  // Reset all shortcuts
  const resetAllShortcuts = async () => {
    if (!confirm('Reset all shortcuts to defaults?')) return;
    try {
      const defaults = await shortcutsApi.resetAll();
      setShortcuts(defaults);
      setSuccess('All shortcuts reset to defaults');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  // Save persona
  const savePersona = async (persona) => {
    try {
      const isNew = !persona.id;
      const saved = isNew
        ? await personasApi.create(persona)
        : await personasApi.update(persona.id, persona);

      if (isNew) {
        setPersonas(prev => [...prev, saved]);
      } else {
        setPersonas(prev => prev.map(p => p.id === saved.id ? saved : p));
      }
      setSuccess('Persona saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  // Delete persona
  const deletePersona = async (id) => {
    if (!confirm('Delete this persona?')) return;
    try {
      await personasApi.delete(id);
      setPersonas(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  // Save Authentik settings
  const saveAuthentikSettings = async (settings) => {
    setSaving(true);
    try {
      const saved = await authentikSettingsApi.save(settings);
      setAuthentikSettings(saved);
      setSuccess('Authentik settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
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
              await lifecycleExtendedApi.reloadSettings();
              const scanSettingsData = await lifecycleExtendedApi.getSettings();
              if (scanSettingsData) setScanSettings(scanSettingsData);
              setSuccess('Settings reloaded');
              setTimeout(() => setSuccess(''), 3000);
            }}
            onCancelScans={async () => {
              await lifecycleExtendedApi.cancelQueue();
              const queueData = await lifecycleExtendedApi.getQueue();
              if (queueData) setScanQueueStatus(queueData);
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
