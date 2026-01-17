/**
 * AuthPane Component
 * Authentication settings (Authentik SSO)
 */

import { CATEGORIES } from './constants';

export default function AuthPane({
  serverConfig,
  authentikSettings,
  setAuthentikSettings,
  onSaveAuthentik,
  saving,
  setActiveCategory
}) {
  return (
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
            Authentication is configured via environment variables. Use the{' '}
            <button onClick={() => setActiveCategory(CATEGORIES.SYSTEM)} className="text-hacker-cyan hover:underline">
              [EDIT .ENV]
            </button>{' '}
            button in System settings to modify.
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
                onClick={() => onSaveAuthentik(authentikSettings)}
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
  );
}
