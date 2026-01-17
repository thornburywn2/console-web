/**
 * Tabby Dashboard Component
 * P2 Phase 2: Tabby Management Dashboard
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 *
 * Provides a comprehensive UI for managing Tabby AI code completion service.
 */

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CONFIG } from './tabby-dashboard';
import { tabbyApi } from '../services/api.js';

export function TabbyDashboard({ onClose }) {
  const [status, setStatus] = useState(null);
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [ideConfig, setIdeConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    fetchStatus();
    fetchModels();
    fetchConfig();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await tabbyApi.getStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.getUserMessage?.() || 'Failed to fetch Tabby status');
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const data = await tabbyApi.getModels();
      setModels(data);
    } catch (err) {
      console.error('Failed to fetch models:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await tabbyApi.getConfig();
      setConfig({
        model: data.model || 'StarCoder-1B',
        useGpu: data.useGpu || false,
        port: data.port || 8080
      });
    } catch (err) {
      console.error('Failed to fetch config:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await tabbyApi.getLogs(100);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err.getUserMessage?.() || err.message);
    }
  };

  const fetchIdeConfig = async () => {
    try {
      const data = await tabbyApi.getIdeConfig();
      setIdeConfig(data);
    } catch (err) {
      console.error('Failed to fetch IDE config:', err.getUserMessage?.() || err.message);
    }
  };

  const handleStart = async () => {
    setActionLoading('start');
    setError(null);

    try {
      await tabbyApi.start(config);
      await fetchStatus();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    setError(null);

    try {
      await tabbyApi.stop();
      await fetchStatus();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading('restart');
    setError(null);

    try {
      await tabbyApi.restart();
      await fetchStatus();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePull = async () => {
    setActionLoading('pull');
    setError(null);

    try {
      await tabbyApi.pull({ useGpu: config.useGpu });
      await fetchStatus();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTest = async () => {
    setActionLoading('test');
    setTestResult(null);

    try {
      const data = await tabbyApi.test('def fibonacci(n):');
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: err.getUserMessage?.() || err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    setActionLoading('config');

    try {
      await tabbyApi.saveConfig(config);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
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
          <h2 className="text-2xl font-bold text-text">Tabby AI</h2>
          <p className="text-text-secondary">Self-hosted code completion service</p>
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

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Docker Status */}
        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Docker</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status?.docker?.available ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-text">{status?.docker?.available ? 'Available' : 'Not Available'}</span>
          </div>
        </div>

        {/* GPU Status */}
        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">GPU</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status?.gpu?.available ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-text">{status?.gpu?.available ? 'Available' : 'CPU Only'}</span>
          </div>
        </div>

        {/* Tabby Status */}
        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Tabby</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              status?.status === 'running' ? 'bg-green-500' :
              status?.status === 'starting' ? 'bg-yellow-500 animate-pulse' :
              'bg-gray-500'
            }`} />
            <span className="text-text capitalize">{status?.status || 'Stopped'}</span>
          </div>
        </div>
      </div>

      {/* Image Status */}
      {!status?.image?.exists && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <h3 className="font-medium text-yellow-400 mb-2">Tabby Image Not Found</h3>
          <p className="text-text-secondary text-sm mb-3">
            Pull the Tabby Docker image to get started.
          </p>
          <button
            onClick={handlePull}
            disabled={actionLoading === 'pull'}
            className="px-4 py-2 bg-yellow-500/80 text-white rounded hover:bg-yellow-500 disabled:opacity-50"
          >
            {actionLoading === 'pull' ? 'Pulling...' : 'Pull Image'}
          </button>
        </div>
      )}

      {/* Configuration */}
      <div className="bg-surface-secondary rounded-lg p-4 border border-border mb-6">
        <h3 className="font-medium text-text mb-4">Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Model</label>
            <select
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 bg-surface border border-border rounded text-text"
              disabled={status?.status === 'running'}
            >
              {Object.entries(models).map(([id, model]) => (
                <option key={id} value={id}>
                  {id} ({model.size}) - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* Port */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Port</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-surface border border-border rounded text-text"
              disabled={status?.status === 'running'}
            />
          </div>

          {/* GPU Toggle */}
          <div className="col-span-full">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.useGpu}
                onChange={(e) => setConfig(prev => ({ ...prev, useGpu: e.target.checked }))}
                className="rounded border-border"
                disabled={!status?.gpu?.available || status?.status === 'running'}
              />
              <span className="text-text">Use GPU Acceleration</span>
              {!status?.gpu?.available && (
                <span className="text-xs text-text-secondary">(Not available)</span>
              )}
            </label>
          </div>
        </div>

        {status?.status !== 'running' && (
          <button
            onClick={handleSaveConfig}
            disabled={actionLoading === 'config'}
            className="mt-4 px-4 py-2 bg-surface border border-border rounded text-text hover:bg-surface-secondary"
          >
            {actionLoading === 'config' ? 'Saving...' : 'Save Configuration'}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        {status?.status !== 'running' ? (
          <button
            onClick={handleStart}
            disabled={actionLoading === 'start' || !status?.image?.exists}
            className="px-4 py-2 bg-green-500/80 text-white rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'start' ? 'Starting...' : 'Start Tabby'}
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              disabled={actionLoading === 'stop'}
              className="px-4 py-2 bg-red-500/80 text-white rounded hover:bg-red-500 disabled:opacity-50"
            >
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
            <button
              onClick={handleRestart}
              disabled={actionLoading === 'restart'}
              className="px-4 py-2 bg-yellow-500/80 text-white rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
            </button>
          </>
        )}

        <button
          onClick={() => {
            setShowLogs(!showLogs);
            if (!showLogs) fetchLogs();
          }}
          className="px-4 py-2 bg-surface border border-border rounded text-text hover:bg-surface-secondary"
        >
          {showLogs ? 'Hide Logs' : 'View Logs'}
        </button>

        <button
          onClick={fetchStatus}
          className="px-4 py-2 bg-surface border border-border rounded text-text hover:bg-surface-secondary"
        >
          Refresh Status
        </button>
      </div>

      {/* Running Container Info */}
      {status?.status === 'running' && status?.container && (
        <div className="bg-surface-secondary rounded-lg p-4 border border-border mb-6">
          <h3 className="font-medium text-text mb-3">Container Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Container ID</span>
              <p className="text-text font-mono">{status.container.id}</p>
            </div>
            <div>
              <span className="text-text-secondary">Model</span>
              <p className="text-text">{status.config.model}</p>
            </div>
            <div>
              <span className="text-text-secondary">Port</span>
              <p className="text-text">{status.config.port}</p>
            </div>
            <div>
              <span className="text-text-secondary">Health</span>
              <p className={`${status.health === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                {status.health}
              </p>
            </div>
            {status.resources && (
              <>
                <div>
                  <span className="text-text-secondary">CPU</span>
                  <p className="text-text">{status.resources.cpu}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Memory</span>
                  <p className="text-text">{status.resources.memory}</p>
                </div>
              </>
            )}
          </div>

          {/* Test Completion */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-text mb-2">Test Completion</h4>
            <button
              onClick={handleTest}
              disabled={actionLoading === 'test'}
              className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {actionLoading === 'test' ? 'Testing...' : 'Run Test'}
            </button>
            {testResult && (
              <div className="mt-2 p-3 bg-gray-900 rounded font-mono text-sm">
                {testResult.success ? (
                  <>
                    <div className="text-gray-400 mb-1">def fibonacci(n):</div>
                    <div className="text-green-400">{testResult.completion}</div>
                    <div className="text-gray-500 text-xs mt-2">Latency: {testResult.latency}</div>
                  </>
                ) : (
                  <div className="text-red-400">Error: {testResult.error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* IDE Configuration */}
      {status?.status === 'running' && (
        <div className="bg-surface-secondary rounded-lg p-4 border border-border mb-6">
          <h3 className="font-medium text-text mb-3">IDE Integration</h3>
          <p className="text-text-secondary text-sm mb-3">
            Configure your IDE to use Tabby at <code className="bg-surface px-1 rounded">http://localhost:{status.config.port}</code>
          </p>
          <button
            onClick={fetchIdeConfig}
            className="text-sm text-accent hover:underline"
          >
            Show configuration snippets
          </button>
          {ideConfig && (
            <div className="mt-3 space-y-3">
              {Object.entries(ideConfig).map(([ide, config]) => (
                <div key={ide} className="p-3 bg-surface rounded">
                  <h4 className="font-medium text-text capitalize mb-1">{ide}</h4>
                  {config.extension && (
                    <p className="text-xs text-text-secondary">Extension: {config.extension}</p>
                  )}
                  {config.plugin && (
                    <p className="text-xs text-text-secondary">Plugin: {config.plugin}</p>
                  )}
                  {config.config && (
                    <code className="block mt-1 text-xs text-green-400 font-mono">{config.config}</code>
                  )}
                  {config.settings && (
                    <code className="block mt-1 text-xs text-green-400 font-mono">
                      {JSON.stringify(config.settings, null, 2)}
                    </code>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      {showLogs && (
        <div className="bg-surface-secondary rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-text">Container Logs</h3>
            <button
              onClick={fetchLogs}
              className="text-sm text-accent hover:underline"
            >
              Refresh
            </button>
          </div>
          <div className="bg-gray-900 rounded p-3 max-h-[300px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs available</p>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className="text-gray-300 whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {status?.stats && (
        <div className="mt-6 bg-surface-secondary rounded-lg p-4 border border-border">
          <h3 className="font-medium text-text mb-3">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Requests</span>
              <p className="text-text text-lg font-semibold">{status.stats.requests}</p>
            </div>
            <div>
              <span className="text-text-secondary">Completions</span>
              <p className="text-text text-lg font-semibold">{status.stats.completions}</p>
            </div>
            <div>
              <span className="text-text-secondary">Errors</span>
              <p className="text-text text-lg font-semibold">{status.stats.errors}</p>
            </div>
            <div>
              <span className="text-text-secondary">Avg Latency</span>
              <p className="text-text text-lg font-semibold">{status.stats.avgLatency}ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TabbyDashboard;
