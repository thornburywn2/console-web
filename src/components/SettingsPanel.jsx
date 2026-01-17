/**
 * Settings Panel Component
 * Comprehensive settings management for Console.web
 * Consolidates: General Settings, Themes, Keyboard Shortcuts, AI Personas, Auth, Paths, Integrations
 *
 * Refactored to use extracted pane components from ./settings/
 */

import { useState, useEffect, useRef } from 'react';
import { GitHubSettingsTab, CloudflareSettingsTab } from './AdminDashboard';
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
  const updateLogsEndRef = useRef(null);

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

  // Auto-scroll update logs
  useEffect(() => {
    if (updateLogsEndRef.current) {
      updateLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [updateLogs]);

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

        {/* SCAN RESOURCE SETTINGS - Kept inline (not extracted) */}
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

        {/* SYSTEM INFO - Kept inline (not extracted) */}
        {activeCategory === CATEGORIES.SYSTEM && serverConfig && (
          <div className="space-y-6">
            {/* Software Updates Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-hacker-green uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Software Updates
              </h4>

              <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-hacker-green/30">
                {versionInfo ? (
                  <div className="space-y-4">
                    {/* Error Message */}
                    {versionInfo.error && (
                      <div className="p-3 rounded-lg bg-hacker-warning/10 border border-hacker-warning/30">
                        <div className="flex items-center gap-2 text-hacker-warning text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>{versionInfo.error}</span>
                        </div>
                        <p className="text-xs text-hacker-text-dim mt-2">
                          Run manually: <code className="bg-black/30 px-1 rounded">git pull && npm install --include=dev && npm run build && pm2 restart console-web</code>
                        </p>
                      </div>
                    )}

                    {/* Current Version Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-mono text-hacker-green">v{versionInfo.version}</span>
                          <span className="px-2 py-0.5 text-xs font-mono bg-hacker-purple/20 text-hacker-purple rounded">
                            {versionInfo.branch}
                          </span>
                          <code className="text-xs text-hacker-text-dim">{versionInfo.commit}</code>
                        </div>
                        {versionInfo.lastCommitDate && (
                          <p className="text-xs text-hacker-text-dim mt-1">
                            Last commit: {new Date(versionInfo.lastCommitDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Update Available Badge */}
                      {versionInfo.hasUpdates && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-hacker-cyan/20 border border-hacker-cyan/50 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-hacker-cyan animate-pulse" />
                          <span className="text-sm font-mono text-hacker-cyan">
                            {versionInfo.behindBy} update{versionInfo.behindBy > 1 ? 's' : ''} available
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Update Button */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={triggerUpdate}
                        disabled={updateInProgress || versionInfo.error}
                        className={`px-6 py-2.5 text-sm font-mono rounded-lg transition-all flex items-center gap-2 ${
                          versionInfo.hasUpdates
                            ? 'bg-hacker-cyan text-black hover:bg-hacker-cyan/90'
                            : 'border border-hacker-green text-hacker-green hover:bg-hacker-green/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updateInProgress ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {versionInfo.hasUpdates ? 'Install Updates' : 'Check & Update'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={fetchVersionInfo}
                        className="px-3 py-2 text-xs font-mono border border-hacker-text-dim/30 rounded text-hacker-text-dim hover:text-hacker-text hover:border-hacker-text-dim/50"
                      >
                        [REFRESH]
                      </button>

                      {updateLogs.length > 0 && !showUpdateModal && (
                        <button
                          onClick={() => setShowUpdateModal(true)}
                          className="text-xs text-hacker-cyan hover:text-hacker-green"
                        >
                          [VIEW LOGS]
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-hacker-green border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Server Configuration (Read-Only) */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Server Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
                  <span className="text-hacker-text-dim">Projects Directory:</span>
                  <code className="ml-2 text-hacker-green">{serverConfig.projectsDir}</code>
                </div>
                <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
                  <span className="text-hacker-text-dim">Port:</span>
                  <code className="ml-2 text-hacker-green">{serverConfig.port}</code>
                </div>
                <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
                  <span className="text-hacker-text-dim">Environment:</span>
                  <code className="ml-2 text-hacker-green">{serverConfig.environment}</code>
                </div>
                <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
                  <span className="text-hacker-text-dim">Auth Enabled:</span>
                  <code className="ml-2 text-hacker-green">{serverConfig.authEnabled ? 'Yes' : 'No'}</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-hacker-green/30 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-hacker-green/20">
              <h3 className="text-sm font-mono text-hacker-green uppercase">Update Progress</h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-hacker-text-dim hover:text-hacker-text"
              >
                [CLOSE]
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1 bg-black/30">
              {updateLogs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${
                    log.status === 'error' ? 'text-red-400' :
                    log.status === 'complete' ? 'text-green-400' :
                    log.status === 'running' ? 'text-yellow-400' :
                    'text-hacker-text-dim'
                  }`}
                >
                  <span className="text-hacker-text-dim opacity-50">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="uppercase w-16">[{log.step}]</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
              <div ref={updateLogsEndRef} />
            </div>
            {!updateInProgress && updateLogs.some(l => l.status === 'complete') && (
              <div className="p-4 border-t border-hacker-green/20 text-center">
                <p className="text-sm text-hacker-cyan">Update complete! Page will refresh automatically...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
