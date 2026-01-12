import { useState, useEffect, useCallback } from 'react';

// Import components for new tabs
import ApiTester from './ApiTester';
import DatabaseBrowser from './DatabaseBrowser';
import DiffViewer from './DiffViewer';
import FileBrowser from './FileBrowser';
import LogViewer from './LogViewer';
import ScheduleManager from './ScheduleManager';
import AlertRuleEditor from './AlertRuleEditor';
import CostDashboard, { CostWidget } from './CostDashboard';
import DependencyDashboard from './DependencyDashboard';
import UptimeDisplay, { UptimeWidget } from './UptimeDisplay';
import NetworkStats, { NetworkWidget } from './NetworkStats';
import GitWorkflow from './GitWorkflow';
import TestRunner from './TestRunner';

// New Agent and MCP components
import AgentManager from './AgentManager';
import MCPServerManager from './MCPServerManager';

// Settings Panel
import SettingsPanel from './SettingsPanel';

// Security Dashboard
import SecurityDashboard from './SecurityDashboard';

// Tab options - exported for use by other components
export const TABS = {
  OVERVIEW: 'overview',
  SERVER: 'server',
  DOCKER: 'docker',
  STACK: 'stack',
  HISTORY: 'history',
  CLAUDE_MD: 'claude-md',
  MCP: 'mcp',
  PROJECTS: 'projects',
  // New tabs
  TOOLS: 'tools',
  AGENTS: 'agents',
  MONITORING: 'monitoring',
  DEVTOOLS: 'devtools',
  SECURITY: 'security',
  GITHUB: 'github',
  CLOUDFLARE: 'cloudflare',
  SETTINGS: 'settings',
};

// ASCII Art Happy Face
const HAPPY_FACE = `
    ██████████████████████████████
  ██                              ██
██    ████████        ████████      ██
██    ████████        ████████      ██
██    ████████        ████████      ██
██                                  ██
██                                  ██
██      ██                    ██    ██
██        ██                ██      ██
██          ████████████████        ██
██                                  ██
  ██                              ██
    ██████████████████████████████
`;

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// GitHub Settings Tab Component
function GitHubSettingsTab() {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState([]);

  // Fetch auth status and linked repos on mount
  useEffect(() => {
    fetchAuthStatus();
    fetchLinkedRepos();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/github/auth');
      const data = await res.json();
      setAuthStatus(data);
    } catch (err) {
      setError('Failed to check GitHub status');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedRepos = async () => {
    try {
      const res = await fetch('/api/github/repos?linked=true');
      if (res.ok) {
        const data = await res.json();
        setLinkedRepos(data.repos || []);
      }
    } catch (err) {
      console.error('Failed to fetch linked repos:', err);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      setError('Please enter a Personal Access Token');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/github/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: accessToken.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      setAuthStatus(data);
      setAccessToken('');
      setSuccess('Successfully connected to GitHub!');
      fetchLinkedRepos();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub? This will remove your saved token.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/github/auth', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      setAuthStatus({ authenticated: false });
      setSuccess('GitHub disconnected');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-hacker-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
          {'>'} GITHUB_INTEGRATION
        </h3>
        <button
          onClick={fetchAuthStatus}
          className="px-3 py-1 text-xs font-mono border border-hacker-green/30 rounded hover:bg-hacker-green/10 transition-colors"
        >
          [REFRESH]
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm font-mono">
          [ERROR] {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm font-mono">
          [SUCCESS] {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Authentication Card */}
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> AUTHENTICATION
          </h4>

          {authStatus?.authenticated ? (
            <div className="space-y-4">
              {/* Connected User Info */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-hacker-surface/50 border border-hacker-green/20">
                {authStatus.avatarUrl && (
                  <img
                    src={authStatus.avatarUrl}
                    alt={authStatus.username}
                    className="w-12 h-12 rounded-full border-2 border-hacker-green/50"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-hacker-text">{authStatus.username}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-hacker-green/20 text-hacker-green border border-hacker-green/30">
                      CONNECTED
                    </span>
                  </div>
                  {authStatus.profileUrl && (
                    <a
                      href={authStatus.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-hacker-cyan hover:underline font-mono"
                    >
                      View Profile →
                    </a>
                  )}
                </div>
              </div>

              {/* Token Scopes */}
              {authStatus.tokenScopes?.length > 0 && (
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">TOKEN SCOPES</label>
                  <div className="flex flex-wrap gap-2">
                    {authStatus.tokenScopes.map(scope => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs font-mono rounded bg-hacker-surface border border-hacker-purple/30 text-hacker-purple"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Validated */}
              {authStatus.lastValidated && (
                <div className="text-xs font-mono text-hacker-text-dim">
                  Last validated: {new Date(authStatus.lastValidated).toLocaleString()}
                </div>
              )}

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="w-full py-2 px-4 text-sm font-mono rounded border border-hacker-error/50 text-hacker-error hover:bg-hacker-error/10 transition-colors disabled:opacity-50"
              >
                {saving ? '[DISCONNECTING...]' : '[DISCONNECT GITHUB]'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-hacker-text-dim mb-2">
                  PERSONAL ACCESS TOKEN
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 pr-10 rounded bg-hacker-surface border border-hacker-green/30 text-hacker-text font-mono text-sm focus:border-hacker-green focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-hacker-text-dim hover:text-hacker-text"
                  >
                    {showToken ? '[HIDE]' : '[SHOW]'}
                  </button>
                </div>
              </div>

              {/* Required Scopes Info */}
              <div className="p-3 rounded bg-hacker-surface/50 border border-hacker-cyan/20">
                <div className="text-xs font-mono text-hacker-cyan mb-2">REQUIRED SCOPES:</div>
                <div className="text-xs font-mono text-hacker-text-dim space-y-1">
                  <div><span className="text-hacker-green">repo</span> - Full repository access</div>
                  <div><span className="text-hacker-green">read:org</span> - Read organization data</div>
                  <div><span className="text-hacker-green">workflow</span> - GitHub Actions access</div>
                </div>
              </div>

              {/* Create Token Link */}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=Command%20Portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-hacker-cyan hover:underline"
              >
                [CREATE NEW TOKEN ON GITHUB →]
              </a>

              <button
                type="submit"
                disabled={saving || !accessToken.trim()}
                className="w-full py-2.5 px-4 text-sm font-mono rounded bg-hacker-green/20 border border-hacker-green/50 text-hacker-green hover:bg-hacker-green/30 transition-colors disabled:opacity-50"
              >
                {saving ? '[CONNECTING...]' : '[CONNECT GITHUB]'}
              </button>
            </form>
          )}
        </div>

        {/* Linked Repositories Card */}
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> LINKED REPOSITORIES ({linkedRepos.length})
          </h4>

          {linkedRepos.length === 0 ? (
            <div className="text-center py-8 text-hacker-text-dim font-mono text-sm">
              No repositories linked yet.
              <br />
              <span className="text-xs">Link repos from the Project's GitHub panel</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {linkedRepos.map(repo => (
                <div
                  key={repo.id}
                  className="p-3 rounded bg-hacker-surface/50 border border-hacker-purple/20 hover:border-hacker-purple/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-hacker-cyan hover:underline"
                      >
                        {repo.fullName}
                      </a>
                      <div className="text-xs text-hacker-text-dim font-mono mt-0.5">
                        {repo.isPrivate ? '🔒 Private' : '🌐 Public'} • {repo.defaultBranch}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {repo.lastSyncStatus && (
                        <span className={`w-2 h-2 rounded-full ${
                          repo.lastSyncStatus === 'synced' ? 'bg-hacker-green' :
                          repo.lastSyncStatus === 'ahead' ? 'bg-hacker-warning' :
                          repo.lastSyncStatus === 'behind' ? 'bg-hacker-warning' :
                          'bg-hacker-error'
                        }`} title={repo.lastSyncStatus} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="hacker-card p-4 xl:col-span-2">
          <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> QUICK ACTIONS
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-green/20 hover:border-hacker-green/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">🔑</div>
              <div className="text-xs font-mono text-hacker-text-dim">Manage Tokens</div>
            </a>
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-cyan/20 hover:border-hacker-cyan/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">➕</div>
              <div className="text-xs font-mono text-hacker-text-dim">New Repository</div>
            </a>
            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-purple/20 hover:border-hacker-purple/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">⚙️</div>
              <div className="text-xs font-mono text-hacker-text-dim">GitHub Apps</div>
            </a>
            <a
              href="https://github.com/settings/security"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-warning/20 hover:border-hacker-warning/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">🛡️</div>
              <div className="text-xs font-mono text-hacker-text-dim">Security</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cloudflare Settings Tab Component
function CloudflareSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [routes, setRoutes] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [tunnelStatus, setTunnelStatus] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [formData, setFormData] = useState({
    apiToken: '',
    accountId: '',
    tunnelId: '',
    zoneId: '',
    zoneName: 'wbtlabs.com',
    tunnelName: '',
    defaultSubdomain: '',
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchRoutes();
    fetchTunnelStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cloudflare/settings');
      const data = await res.json();
      if (data.configured) {
        setSettings(data);
        setFormData({
          apiToken: '', // Never returned from server
          accountId: data.accountId || '',
          tunnelId: data.tunnelId || '',
          zoneId: data.zoneId || '',
          zoneName: data.zoneName || 'wbtlabs.com',
          tunnelName: data.tunnelName || '',
          defaultSubdomain: data.defaultSubdomain || '',
        });
      }
    } catch (err) {
      setError('Failed to fetch Cloudflare settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      // Use mapped routes to get project cross-referencing and orphaned status
      const res = await fetch('/api/cloudflare/routes/mapped');
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
        setRouteSummary(data.summary || null);
      } else {
        // Fallback to regular routes if mapped fails
        const fallbackRes = await fetch('/api/cloudflare/routes');
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setRoutes((data.routes || []).map(r => ({ ...r, isOrphaned: true })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    }
  };

  const fetchTunnelStatus = async () => {
    try {
      const res = await fetch('/api/cloudflare/tunnel/status');
      if (res.ok) {
        const data = await res.json();
        setTunnelStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch tunnel status:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    setSyncStats(null);

    try {
      const res = await fetch('/api/cloudflare/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncStats(data);
      setSuccess(`Synced ${data.synced} routes from Cloudflare (${data.skipped} skipped, ${data.errors} errors)`);
      fetchRoutes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/cloudflare/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data);
      setSuccess('Cloudflare settings saved successfully!');
      setFormData(prev => ({ ...prev, apiToken: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Cloudflare? This will remove all settings.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/cloudflare/settings', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      setSettings(null);
      setFormData({
        apiToken: '',
        accountId: '',
        tunnelId: '',
        zoneId: '',
        zoneName: 'wbtlabs.com',
        tunnelName: '',
        defaultSubdomain: '',
      });
      setSuccess('Cloudflare disconnected');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/cloudflare/validate');
      const data = await res.json();

      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Validation failed');
      }

      setSuccess('Configuration validated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestartCloudflared = async () => {
    if (!confirm('Restart cloudflared service? This will briefly interrupt all tunnel connections.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/cloudflare/restart', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to restart');
      }

      setSuccess('cloudflared service restarted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (hostname) => {
    if (!confirm(`Delete route ${hostname}? This will remove the DNS record and tunnel config.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/cloudflare/publish/${encodeURIComponent(hostname)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete route');
      }
      setSuccess(`Route ${hostname} deleted`);
      fetchRoutes();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-hacker-warning border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider font-mono">
          {'>'} CLOUDFLARE_TUNNELS
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchSettings(); fetchRoutes(); fetchTunnelStatus(); }}
            className="px-3 py-1 text-xs font-mono border border-hacker-warning/30 rounded hover:bg-hacker-warning/10 transition-colors"
          >
            [REFRESH]
          </button>
          {settings?.configured && (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-3 py-1 text-xs font-mono border border-hacker-green/30 rounded hover:bg-hacker-green/10 transition-colors disabled:opacity-50"
              >
                {syncing ? '[SYNCING...]' : '[SYNC ROUTES]'}
              </button>
              <button
                onClick={handleValidate}
                disabled={saving}
                className="px-3 py-1 text-xs font-mono border border-hacker-cyan/30 rounded hover:bg-hacker-cyan/10 transition-colors"
              >
                [VALIDATE]
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tunnel Status Banner */}
      {tunnelStatus && settings?.configured && (
        <div className={`p-3 rounded-lg border ${
          tunnelStatus.status === 'healthy'
            ? 'bg-hacker-green/10 border-hacker-green/30'
            : 'bg-hacker-error/10 border-hacker-error/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${tunnelStatus.status === 'healthy' ? 'bg-hacker-green animate-pulse' : 'bg-hacker-error'}`} />
              <span className="font-mono text-sm">
                Tunnel: <span className={tunnelStatus.status === 'healthy' ? 'text-hacker-green' : 'text-hacker-error'}>
                  {tunnelStatus.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </span>
              {tunnelStatus.connections && (
                <span className="text-xs text-hacker-text-dim font-mono">
                  | {tunnelStatus.connections} connections
                </span>
              )}
            </div>
            <span className="text-xs text-hacker-text-dim font-mono">
              {tunnelStatus.ingressCount} ingress rules
            </span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm font-mono">
          [ERROR] {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm font-mono">
          [SUCCESS] {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Configuration Card */}
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> CONFIGURATION
          </h4>

          {settings?.configured ? (
            <div className="space-y-4">
              {/* Connected Status */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-hacker-surface/50 border border-hacker-warning/20">
                <div className="w-12 h-12 rounded-full border-2 border-hacker-warning/50 flex items-center justify-center bg-hacker-warning/10">
                  <svg className="w-6 h-6 text-hacker-warning" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-hacker-text">{settings.tunnelName || 'Tunnel'}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-hacker-warning/20 text-hacker-warning border border-hacker-warning/30">
                      CONNECTED
                    </span>
                  </div>
                  <div className="text-xs text-hacker-text-dim font-mono mt-0.5">
                    Zone: {settings.zoneName} | Tunnel ID: {settings.tunnelId?.slice(0, 8)}...
                  </div>
                </div>
              </div>

              {/* Settings Display */}
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-hacker-text-dim">account_id</span>
                  <span className="text-hacker-text">{settings.accountId?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hacker-text-dim">zone_id</span>
                  <span className="text-hacker-text">{settings.zoneId?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hacker-text-dim">last_validated</span>
                  <span className="text-hacker-cyan">{settings.lastValidated ? new Date(settings.lastValidated).toLocaleString() : 'Never'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleRestartCloudflared}
                  disabled={saving}
                  className="flex-1 py-2 px-4 text-sm font-mono rounded border border-hacker-cyan/50 text-hacker-cyan hover:bg-hacker-cyan/10 transition-colors disabled:opacity-50"
                >
                  [RESTART SERVICE]
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="flex-1 py-2 px-4 text-sm font-mono rounded border border-hacker-error/50 text-hacker-error hover:bg-hacker-error/10 transition-colors disabled:opacity-50"
                >
                  [DISCONNECT]
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-hacker-text-dim mb-2">API TOKEN</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.apiToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiToken: e.target.value }))}
                    placeholder="Enter Cloudflare API token"
                    className="w-full px-4 py-2.5 pr-10 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-sm focus:border-hacker-warning focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-hacker-text-dim hover:text-hacker-text"
                  >
                    {showToken ? '[HIDE]' : '[SHOW]'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">ACCOUNT ID</label>
                  <input
                    type="text"
                    value={formData.accountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    placeholder="d061822f..."
                    className="w-full px-3 py-2 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-sm focus:border-hacker-warning focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">TUNNEL ID</label>
                  <input
                    type="text"
                    value={formData.tunnelId}
                    onChange={(e) => setFormData(prev => ({ ...prev, tunnelId: e.target.value }))}
                    placeholder="f86095ee..."
                    className="w-full px-3 py-2 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-sm focus:border-hacker-warning focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">ZONE ID</label>
                  <input
                    type="text"
                    value={formData.zoneId}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoneId: e.target.value }))}
                    placeholder="6547d2d7..."
                    className="w-full px-3 py-2 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-sm focus:border-hacker-warning focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">ZONE NAME</label>
                  <input
                    type="text"
                    value={formData.zoneName}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoneName: e.target.value }))}
                    placeholder="wbtlabs.com"
                    className="w-full px-3 py-2 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-sm focus:border-hacker-warning focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-hacker-text-dim mb-2">TUNNEL NAME (optional)</label>
                <input
                  type="text"
                  value={formData.tunnelName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tunnelName: e.target.value }))}
                  placeholder="my-tunnel"
                  className="w-full px-3 py-2 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-sm focus:border-hacker-warning focus:outline-none"
                />
              </div>

              {/* Info Box */}
              <div className="p-3 rounded bg-hacker-surface/50 border border-hacker-cyan/20">
                <div className="text-xs font-mono text-hacker-cyan mb-2">TOKEN PERMISSIONS REQUIRED:</div>
                <div className="text-xs font-mono text-hacker-text-dim space-y-1">
                  <div><span className="text-hacker-warning">Zone:DNS:Edit</span> - Create DNS records</div>
                  <div><span className="text-hacker-warning">Account:Cloudflare Tunnel:Edit</span> - Modify tunnel config</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !formData.apiToken.trim() || !formData.accountId.trim()}
                className="w-full py-2.5 px-4 text-sm font-mono rounded bg-hacker-warning/20 border border-hacker-warning/50 text-hacker-warning hover:bg-hacker-warning/30 transition-colors disabled:opacity-50"
              >
                {saving ? '[SAVING...]' : '[SAVE CONFIGURATION]'}
              </button>
            </form>
          )}
        </div>

        {/* Published Routes Card - Full Width */}
        <div className="hacker-card p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider flex items-center gap-2">
              <span>&#9654;</span> PUBLISHED ROUTES ({routes.length})
            </h4>
            {routes.length > 0 && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1" title="Port is listening">
                  <span className="w-2 h-2 rounded-full bg-hacker-green" />
                  {routes.filter(r => r.portActive).length} Running
                </span>
                <span className="flex items-center gap-1" title="Port not listening">
                  <span className="w-2 h-2 rounded-full bg-hacker-error" />
                  {routes.filter(r => !r.portActive).length} Down
                </span>
                {routeSummary && (
                  <>
                    <span className="flex items-center gap-1" title="Linked to a project">
                      <span className="w-2 h-2 rounded-full bg-hacker-cyan" />
                      {routeSummary.linked} Linked
                    </span>
                    <span className="flex items-center gap-1" title="Routes without a connected project">
                      <span className="w-2 h-2 rounded-full bg-hacker-warning" />
                      {routeSummary.orphaned} Orphaned
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {routes.length === 0 ? (
            <div className="text-center py-8 text-hacker-text-dim font-mono text-sm">
              No routes in database.
              <br />
              <span className="text-xs">Click [SYNC ROUTES] to import existing routes from Cloudflare</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-left text-xs text-hacker-text-dim border-b border-hacker-border">
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Hostname</th>
                    <th className="pb-2 pr-4">Project</th>
                    <th className="pb-2 pr-4">Port</th>
                    <th className="pb-2 pr-4">Last Checked</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hacker-border/50">
                  {routes.map(route => (
                    <tr key={route.id} className="hover:bg-hacker-surface/30 transition-colors">
                      <td className="py-2 pr-4">
                        {/* Show actual running state based on portActive */}
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                          route.portActive ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/30' :
                          route.status === 'PENDING' ? 'bg-hacker-warning/20 text-hacker-warning border border-hacker-warning/30' :
                          'bg-hacker-error/20 text-hacker-error border border-hacker-error/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            route.portActive ? 'bg-hacker-green' :
                            route.status === 'PENDING' ? 'bg-hacker-warning animate-pulse' :
                            'bg-hacker-error'
                          }`} />
                          {route.portActive ? 'RUNNING' : route.status === 'PENDING' ? 'PENDING' : 'DOWN'}
                        </span>
                        {route.portProcess && route.portActive && (
                          <div className="text-[10px] text-hacker-text-dim mt-0.5">{route.portProcess}</div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <a
                          href={`https://${route.hostname}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-hacker-cyan hover:underline flex items-center gap-1"
                        >
                          {route.hostname}
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {route.description && (
                          <div className="text-xs text-hacker-text-dim mt-0.5">{route.description}</div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {route.project ? (
                          <span className="text-hacker-green" title={`Linked via ${route.matchMethod}`}>
                            {route.project.name}
                          </span>
                        ) : route.isOrphaned ? (
                          <span className="inline-flex items-center gap-1 text-hacker-error">
                            <span title="No project linked">ORPHANED</span>
                          </span>
                        ) : (
                          <span className="text-hacker-text-dim">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="text-hacker-purple">{route.localPort}</span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-hacker-text-dim">
                        {route.lastCheckedAt ? new Date(route.lastCheckedAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleDeleteRoute(route.hostname)}
                          className="p-1 text-hacker-error/50 hover:text-hacker-error transition-colors"
                          title="Delete route"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sync Stats */}
          {syncStats && (
            <div className="mt-4 p-3 rounded bg-hacker-surface/50 border border-hacker-green/20">
              <div className="text-xs font-mono text-hacker-green mb-2">LAST SYNC RESULTS:</div>
              <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-hacker-text-dim">Synced: </span>
                  <span className="text-hacker-green">{syncStats.synced}</span>
                </div>
                <div>
                  <span className="text-hacker-text-dim">Skipped: </span>
                  <span className="text-hacker-warning">{syncStats.skipped}</span>
                </div>
                <div>
                  <span className="text-hacker-text-dim">Errors: </span>
                  <span className="text-hacker-error">{syncStats.errors}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="hacker-card p-4 xl:col-span-2">
          <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> QUICK ACTIONS
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a
              href="https://one.dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-warning/20 hover:border-hacker-warning/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">&#9729;</div>
              <div className="text-xs font-mono text-hacker-text-dim">Dashboard</div>
            </a>
            <a
              href={settings?.accountId ? `https://one.dash.cloudflare.com/${settings.accountId}/networks/connectors/cloudflare-tunnels` : 'https://one.dash.cloudflare.com/'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-cyan/20 hover:border-hacker-cyan/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">&#128279;</div>
              <div className="text-xs font-mono text-hacker-text-dim">Tunnels</div>
            </a>
            <a
              href={settings?.zoneId ? `https://dash.cloudflare.com/${settings.accountId}/${settings.zoneName}/dns` : 'https://dash.cloudflare.com/'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-purple/20 hover:border-hacker-purple/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">&#127760;</div>
              <div className="text-xs font-mono text-hacker-text-dim">DNS Records</div>
            </a>
            <a
              href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/configuration-file/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded bg-hacker-surface/50 border border-hacker-green/20 hover:border-hacker-green/50 transition-colors text-center"
            >
              <div className="text-2xl mb-1">&#128218;</div>
              <div className="text-xs font-mono text-hacker-text-dim">Docs</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ onClose, initialTab = null }) {
  const [activeTab, setActiveTab] = useState(initialTab || TABS.OVERVIEW);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [systemInfo, setSystemInfo] = useState(null);
  const [history, setHistory] = useState({ entries: [], total: 0 });
  const [projects, setProjects] = useState([]);
  const [mcpConfig, setMcpConfig] = useState(null);
  const [claudeMd, setClaudeMd] = useState({ content: '', exists: false });
  const [selectedProject, setSelectedProject] = useState('__global__');
  const [claudeMdEdited, setClaudeMdEdited] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Docker states
  const [dockerSystem, setDockerSystem] = useState(null);
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [containerAction, setContainerAction] = useState(null);

  // Server states
  const [serverStatus, setServerStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  // Stack states
  const [stackServices, setStackServices] = useState([]);
  const [stackHealth, setStackHealth] = useState(null);

  // Delete project states
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { name, permanent: false }

  // Fetch system info
  const fetchSystemInfo = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/admin/system');
      const data = await res.json();
      setSystemInfo(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching system info:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/history?limit=50');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/projects-extended');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectName, permanent = false) => {
    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(projectName)}?permanent=${permanent}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete project');
      }
      // Refresh projects list
      await fetchProjects();
      setDeleteConfirm(null);
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Error deleting project:', err);
      return { success: false, error: err.message };
    }
  }, [fetchProjects]);

  // Toggle skip permissions for a project
  const toggleProjectSkipPermissions = useCallback(async (projectName, currentValue) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipPermissions: !currentValue })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update project settings');
      }
      // Update local state
      setProjects(prev => prev.map(p =>
        p.name === projectName ? { ...p, skipPermissions: !currentValue } : p
      ));
      return { success: true };
    } catch (err) {
      console.error('Error updating project settings:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Fetch MCP config
  const fetchMcpConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mcp');
      const data = await res.json();
      setMcpConfig(data);
    } catch (err) {
      console.error('Error fetching MCP config:', err);
    }
  }, []);

  // Fetch CLAUDE.md
  const fetchClaudeMd = useCallback(async (projectName) => {
    try {
      setLoading(true);
      const endpoint = projectName === '__global__'
        ? '/api/admin/claude-md-global'
        : `/api/admin/claude-md/${projectName}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setClaudeMd(data);
      setClaudeMdEdited(data.content || '');
      setHasUnsavedChanges(false);
    } catch (err) {
      setError('Failed to load CLAUDE.md');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save CLAUDE.md
  const saveClaudeMd = async () => {
    try {
      setLoading(true);
      const endpoint = selectedProject === '__global__'
        ? '/api/admin/claude-md-global'
        : `/api/admin/claude-md/${selectedProject}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: claudeMdEdited }),
      });
      if (res.ok) {
        setHasUnsavedChanges(false);
        await fetchClaudeMd(selectedProject);
      } else {
        setError('Failed to save CLAUDE.md');
      }
    } catch (err) {
      setError('Failed to save CLAUDE.md');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Docker data
  const fetchDockerData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [systemRes, containersRes, imagesRes, volumesRes, networksRes] = await Promise.all([
        fetch('/api/docker/system'),
        fetch('/api/docker/containers?all=true'),
        fetch('/api/docker/images'),
        fetch('/api/docker/volumes'),
        fetch('/api/docker/networks'),
      ]);

      if (systemRes.ok) setDockerSystem(await systemRes.json());
      if (containersRes.ok) setContainers(await containersRes.json());
      if (imagesRes.ok) setImages(await imagesRes.json());
      if (volumesRes.ok) setVolumes(await volumesRes.json());
      if (networksRes.ok) setNetworks(await networksRes.json());
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching Docker data:', err);
      setError('Failed to load Docker data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Container action handler
  const handleContainerAction = async (containerId, action) => {
    try {
      setContainerAction({ containerId, action });
      const res = await fetch(`/api/docker/containers/${containerId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchDockerData();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${action} container`);
      }
    } catch (err) {
      setError(`Failed to ${action} container`);
    } finally {
      setContainerAction(null);
    }
  };

  // Fetch Server data
  const fetchServerData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [statusRes, servicesRes, logsRes] = await Promise.all([
        fetch('/api/server/status'),
        fetch('/api/server/services'),
        fetch('/api/server/logs?lines=50'),
      ]);

      if (statusRes.ok) setServerStatus(await statusRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSystemLogs(logsData.logs || []);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching server data:', err);
      setError('Failed to load server data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Server action handler (reboot/shutdown)
  const handleServerAction = async (action) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/server/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: action.toUpperCase(), delay: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setError(null);
        alert(data.message);
      } else {
        setError(data.error || `Failed to ${action}`);
      }
    } catch (err) {
      setError(`Failed to ${action}`);
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  // Fetch Stack data
  const fetchStackData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [servicesRes, healthRes] = await Promise.all([
        fetch('/api/stack/services'),
        fetch('/api/stack/health'),
      ]);

      if (servicesRes.ok) setStackServices(await servicesRes.json());
      if (healthRes.ok) setStackHealth(await healthRes.json());
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching stack data:', err);
      setError('Failed to load stack data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Stack service restart
  const handleStackRestart = async (serviceId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stack/services/${serviceId}/restart`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchStackData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to restart service');
      }
    } catch (err) {
      setError('Failed to restart service');
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === TABS.OVERVIEW) {
      fetchSystemInfo();
      const interval = setInterval(fetchSystemInfo, 5000);
      return () => clearInterval(interval);
    }
    if (activeTab === TABS.DOCKER) {
      fetchDockerData();
      const interval = setInterval(fetchDockerData, 10000);
      return () => clearInterval(interval);
    }
    if (activeTab === TABS.SERVER) {
      fetchServerData();
      const interval = setInterval(fetchServerData, 5000);
      return () => clearInterval(interval);
    }
    if (activeTab === TABS.STACK) {
      fetchStackData();
      const interval = setInterval(fetchStackData, 15000);
      return () => clearInterval(interval);
    }
    if (activeTab === TABS.HISTORY) fetchHistory();
    if (activeTab === TABS.PROJECTS) fetchProjects();
    if (activeTab === TABS.MCP) fetchMcpConfig();
    if (activeTab === TABS.CLAUDE_MD) {
      fetchProjects();
      fetchClaudeMd(selectedProject);
    }
  }, [activeTab, fetchSystemInfo, fetchDockerData, fetchServerData, fetchStackData, fetchHistory, fetchProjects, fetchMcpConfig, fetchClaudeMd, selectedProject]);

  // Tab button component
  const TabButton = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 ${
        activeTab === tab
          ? 'text-hacker-green border-hacker-green bg-hacker-green/5'
          : 'text-hacker-text-dim border-transparent hover:text-hacker-green/70 hover:border-hacker-green/30'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-hacker-bg/98 backdrop-blur-xl overflow-hidden flex flex-col scan-lines">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-hacker-green/20 glass-panel">
        <div className="flex items-center gap-6">
          {/* ASCII Happy Face */}
          <div className="hidden lg:block">
            <pre className="ascii-art text-[4px] leading-[4px] select-none">{HAPPY_FACE}</pre>
          </div>

          <div>
            <h1 className="text-xl font-bold font-display tracking-wider neon-text flex items-center gap-3">
              <span className="text-2xl">{'>'}_</span>
              COMMAND PORTAL
            </h1>
            <p className="text-xs text-hacker-text-dim mt-1 font-mono">
              <span className="text-hacker-green">root@portal</span>
              <span className="text-hacker-text-dim">:</span>
              <span className="text-hacker-cyan">~/system</span>
              <span className="text-hacker-text-dim">$</span>
              <span className="cursor-blink ml-1"></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicators */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-hacker-cyan animate-spin' : 'bg-hacker-green animate-pulse-glow'}`} />
              <span className={isRefreshing ? 'text-hacker-cyan' : 'text-hacker-green'}>
                {isRefreshing ? 'SYNCING' : 'LIVE'}
              </span>
            </div>
            <div className="text-hacker-text-dim" title={`Last updated: ${lastUpdated.toLocaleString()}`}>
              {lastUpdated.toLocaleTimeString()}
            </div>
          </div>

          <button
            onClick={onClose}
            className="hacker-btn flex items-center gap-2"
          >
            <span>[ESC]</span>
            <span className="hidden sm:inline">EXIT</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="relative z-10 flex items-center gap-1 px-6 border-b border-hacker-green/10 bg-hacker-surface/50 overflow-x-auto">
        <TabButton
          tab={TABS.OVERVIEW}
          label="OVERVIEW"
          icon={<span className="text-lg">&#9632;</span>}
        />
        <TabButton
          tab={TABS.SERVER}
          label="SERVER"
          icon={<span className="text-lg">&#9211;</span>}
        />
        <TabButton
          tab={TABS.DOCKER}
          label="DOCKER"
          icon={<span className="text-lg">&#128230;</span>}
        />
        <TabButton
          tab={TABS.STACK}
          label="STACK"
          icon={<span className="text-lg">&#9733;</span>}
        />
        <TabButton
          tab={TABS.HISTORY}
          label="HISTORY"
          icon={<span className="text-lg">&#8986;</span>}
        />
        <TabButton
          tab={TABS.CLAUDE_MD}
          label="CLAUDE.MD"
          icon={<span className="text-lg">&#9998;</span>}
        />
        <TabButton
          tab={TABS.MCP}
          label="MCP"
          icon={<span className="text-lg">&#9881;</span>}
        />
        <TabButton
          tab={TABS.PROJECTS}
          label="PROJECTS"
          icon={<span className="text-lg">&#128193;</span>}
        />
        <TabButton
          tab={TABS.TOOLS}
          label="TOOLS"
          icon={<span className="text-lg">&#128295;</span>}
        />
        <TabButton
          tab={TABS.AGENTS}
          label="AGENTS"
          icon={<span className="text-lg">&#129302;</span>}
        />
        <TabButton
          tab={TABS.MONITORING}
          label="MONITORING"
          icon={<span className="text-lg">&#128200;</span>}
        />
        <TabButton
          tab={TABS.DEVTOOLS}
          label="DEVTOOLS"
          icon={<span className="text-lg">&#128736;</span>}
        />
        <TabButton
          tab={TABS.SECURITY}
          label="SECURITY"
          icon={<span className="text-lg">&#128274;</span>}
        />
        <TabButton
          tab={TABS.GITHUB}
          label="GITHUB"
          icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>}
        />
        <TabButton
          tab={TABS.CLOUDFLARE}
          label="CLOUDFLARE"
          icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.5765-.4961-.9873-.5049l-8.1084-.1113c-.0537-.0009-.1025-.0229-.1377-.0615-.0351-.0385-.0545-.0903-.0535-.1435.0019-.0463.0257-.0885.0618-.1182.0361-.0298.0833-.0452.1308-.0412l8.1608.1122c.8662.0322 1.7933-.6133 2.1033-1.4697l.393-1.0875c.0425-.1173.0634-.242.0567-.3672-.244-4.4717-4.0044-8.0528-8.5438-8.0528-4.5223 0-8.2779 3.5588-8.5438 8.0528-.0067.1253.0142.25.0567.3672l.393 1.0875c.3057.8564 1.2329 1.5019 2.1033 1.4697l8.1608-.1122c.0475-.004.095.0114.1308.0412.0361.0297.06.0719.0618.1182.001.0532-.0184.105-.0535.1435-.0352.0386-.084.0606-.1377.0615l-8.1084.1113c-.4108.0088-.7627.1885-.9873.5049-.2461.3447-.3028.8086-.1553 1.3154l.1113.3838c.3516 1.2109 1.4458 2.0557 2.7159 2.0997l10.6702.5879c.0195.001.0382-.0049.0533-.017.0152-.0121.0259-.0299.0299-.0496.0027-.0139.0023-.0281-.0013-.0419-.0035-.0137-.0102-.0268-.0194-.0382l-.8799-1.09c-.3594-.4448-.8928-.7051-1.5005-.7305L5.6558 15.641c-.0427-.0018-.0817-.0228-.1057-.0572-.024-.0343-.0314-.0783-.0199-.1196l.0225-.0813c.0398-.1462.1769-.249.3272-.249l11.5008.1123c.8457 0 1.6436-.4443 2.0932-1.1641.3232-.5145.4531-1.0898.3876-1.7217l-.1201-.9151c-.0177-.1357-.0295-.2717-.0295-.4082 0-1.2656.5122-2.4072 1.3438-3.2383.8315-.831 1.9731-1.3428 3.2387-1.3428 1.2656 0 2.4072.5118 3.2383 1.3428.831.8311 1.3428 1.9727 1.3428 3.2383 0 .1365-.0118.2726-.0295.4082l-.1201.9151c-.0655.6319.0644 1.2072.3876 1.7217.4496.7198 1.2475 1.1641 2.0932 1.1641z"/></svg>}
        />
        <TabButton
          tab={TABS.SETTINGS}
          label="SETTINGS"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="relative z-10 mx-6 mt-4 p-3 neon-border bg-hacker-error/10 rounded-lg text-hacker-error text-sm flex items-center justify-between font-mono">
          <span>[ERROR] {error}</span>
          <button onClick={() => setError(null)} className="hover:text-hacker-text">
            [X]
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        {/* Overview Tab */}
        {activeTab === TABS.OVERVIEW && (
          <div className="space-y-6 animate-fade-in">
            {/* Hero Stats */}
            {systemInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="hacker-card text-center">
                  <div className="stat-value">{systemInfo.system?.cpuCount || 0}</div>
                  <div className="stat-label">CPU CORES</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value">{systemInfo.system?.memoryUsedPercent}%</div>
                  <div className="stat-label">MEMORY</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value neon-text-cyan" style={{color: '#00d4ff'}}>{systemInfo.sessions?.active || 0}</div>
                  <div className="stat-label">SESSIONS</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value neon-text-purple" style={{color: '#bd00ff'}}>{formatUptime(systemInfo.system?.uptime || 0)}</div>
                  <div className="stat-label">UPTIME</div>
                </div>
              </div>
            )}

            {/* System Details */}
            {systemInfo && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* System Card */}
                <div className="hacker-card">
                  <h3 className="text-sm font-semibold text-hacker-green mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <span>&#9654;</span> SYSTEM INFO
                  </h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">hostname</span>
                      <span className="text-hacker-cyan">{systemInfo.system?.hostname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">platform</span>
                      <span className="text-hacker-text">{systemInfo.system?.platform} ({systemInfo.system?.arch})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">cpu_model</span>
                      <span className="text-hacker-text text-xs truncate max-w-[180px]">{systemInfo.system?.cpuModel?.split(' ').slice(0,3).join(' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">uptime</span>
                      <span className="text-hacker-green">{formatUptime(systemInfo.system?.uptime)}</span>
                    </div>
                  </div>
                </div>

                {/* Memory Card */}
                <div className="hacker-card">
                  <h3 className="text-sm font-semibold text-hacker-green mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <span>&#9654;</span> MEMORY
                  </h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">total</span>
                      <span className="text-hacker-text">{formatBytes(systemInfo.system?.totalMemory)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">free</span>
                      <span className="text-hacker-green">{formatBytes(systemInfo.system?.freeMemory)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">used</span>
                      <span className={parseFloat(systemInfo.system?.memoryUsedPercent) > 80 ? 'text-hacker-error' : 'text-hacker-cyan'}>
                        {systemInfo.system?.memoryUsedPercent}%
                      </span>
                    </div>
                    <div className="hacker-progress mt-2">
                      <div
                        className="hacker-progress-bar"
                        style={{ width: `${systemInfo.system?.memoryUsedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Disk Card */}
                {systemInfo.disk && (
                  <div className="hacker-card">
                    <h3 className="text-sm font-semibold text-hacker-green mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <span>&#9654;</span> DISK
                    </h3>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-hacker-text-dim">size</span>
                        <span className="text-hacker-text">{systemInfo.disk.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hacker-text-dim">used</span>
                        <span className="text-hacker-warning">{systemInfo.disk.used}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hacker-text-dim">available</span>
                        <span className="text-hacker-green">{systemInfo.disk.available}</span>
                      </div>
                      <div className="hacker-progress mt-2">
                        <div
                          className="hacker-progress-bar"
                          style={{
                            width: systemInfo.disk.usePercent,
                            background: parseInt(systemInfo.disk.usePercent) > 80
                              ? 'linear-gradient(90deg, #cc3300, #ff3333)'
                              : 'linear-gradient(90deg, #00cc33, #00ff41)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sessions Card */}
                <div className="hacker-card">
                  <h3 className="text-sm font-semibold text-hacker-green mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <span>&#9654;</span> SESSIONS
                  </h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">active_pty</span>
                      <span className="text-hacker-green">{systemInfo.sessions?.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">connected</span>
                      <span className="text-hacker-cyan">{systemInfo.sessions?.connected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">tmux</span>
                      <span className="text-hacker-purple">{systemInfo.sessions?.tmux?.length || 0}</span>
                    </div>
                  </div>
                  {systemInfo.sessions?.tmux?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-hacker-green/10">
                      <div className="flex flex-wrap gap-2">
                        {systemInfo.sessions.tmux.map(s => (
                          <span key={s} className="hacker-badge hacker-badge-green">
                            {s.replace('cp-', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Claude Stats Card */}
                {systemInfo.claude && (
                  <div className="hacker-card">
                    <h3 className="text-sm font-semibold text-hacker-green mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <span>&#9654;</span> CLAUDE DATA
                    </h3>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-hacker-text-dim">history_size</span>
                        <span className="text-hacker-text">{formatBytes(systemInfo.claude.historySize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hacker-text-dim">projects</span>
                        <span className="text-hacker-cyan">{systemInfo.claude.projectsCount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Process Card */}
                <div className="hacker-card">
                  <h3 className="text-sm font-semibold text-hacker-green mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <span>&#9654;</span> PROCESS
                  </h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">pid</span>
                      <span className="text-hacker-warning">{systemInfo.process?.pid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">node</span>
                      <span className="text-hacker-green">{systemInfo.process?.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">heap_used</span>
                      <span className="text-hacker-text">{formatBytes(systemInfo.process?.memoryUsage?.heapUsed)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Server Management Tab */}
        {activeTab === TABS.SERVER && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} SERVER_MANAGEMENT
              </h3>
              <button
                onClick={fetchServerData}
                disabled={loading}
                className="hacker-btn text-xs"
              >
                {loading ? '[LOADING...]' : '[REFRESH]'}
              </button>
            </div>

            {/* Server Status Cards */}
            {serverStatus && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="hacker-card text-center">
                  <div className="stat-value">{serverStatus.cpu?.count || '--'}</div>
                  <div className="stat-label">CPU CORES</div>
                  <div className="text-xs text-hacker-text-dim mt-1">{serverStatus.cpu?.load || '0'}% load</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value" style={{color: parseFloat(serverStatus.memory?.usedPercent) > 80 ? '#ff3333' : '#00ff41'}}>
                    {serverStatus.memory?.usedPercent || '--'}%
                  </div>
                  <div className="stat-label">MEMORY</div>
                  <div className="text-xs text-hacker-text-dim mt-1">{serverStatus.memory?.used || '0'} / {serverStatus.memory?.total || '0'}</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value neon-text-cyan" style={{color: '#00d4ff'}}>
                    {serverStatus.disk?.usedPercent || '--'}%
                  </div>
                  <div className="stat-label">DISK</div>
                  <div className="text-xs text-hacker-text-dim mt-1">{serverStatus.disk?.used || '0'} / {serverStatus.disk?.total || '0'}</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value neon-text-purple" style={{color: '#bd00ff'}}>
                    {serverStatus.uptime ? formatUptime(serverStatus.uptime) : '--'}
                  </div>
                  <div className="stat-label">UPTIME</div>
                  <div className="text-xs text-hacker-text-dim mt-1">{serverStatus.hostname || 'localhost'}</div>
                </div>
              </div>
            )}

            {/* System Controls */}
            <div className="hacker-card">
              <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>&#9888;</span> SYSTEM CONTROLS
              </h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setConfirmAction('reboot')}
                  className="hacker-btn bg-hacker-warning/10 border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/20"
                >
                  [REBOOT SYSTEM]
                </button>
              </div>
              <p className="text-xs text-hacker-text-dim mt-4 font-mono">
                System will reboot in 1 minute after confirmation.
              </p>
            </div>

            {/* Confirmation Modal */}
            {confirmAction && (
              <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
                <div className="hacker-card max-w-md mx-4 p-6">
                  <h4 className="text-lg font-bold text-hacker-error mb-4 uppercase">
                    Confirm {confirmAction}
                  </h4>
                  <p className="text-sm text-hacker-text mb-4">
                    Are you sure you want to {confirmAction} the system? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleServerAction(confirmAction)}
                      disabled={loading}
                      className="hacker-btn flex-1 bg-hacker-error/20 border-hacker-error text-hacker-error hover:bg-hacker-error/30"
                    >
                      {loading ? '[EXECUTING...]' : `[CONFIRM ${confirmAction.toUpperCase()}]`}
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="hacker-btn flex-1"
                    >
                      [CANCEL]
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Services List */}
              <div className="hacker-card">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> SYSTEMD SERVICES [{services.length}]
                </h4>
                {services.length === 0 ? (
                  <p className="text-xs text-hacker-text-dim font-mono">Loading services...</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {services.map(service => {
                      const isActive = service.active === 'active';
                      return (
                        <div
                          key={service.unit}
                          className="flex items-center justify-between p-2 bg-hacker-bg/50 border border-hacker-green/10 rounded"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isActive ? 'bg-hacker-green' : 'bg-hacker-error'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-xs text-hacker-text truncate">
                                {service.unit?.replace('.service', '')}
                              </div>
                              <div className="text-[10px] text-hacker-text-dim truncate">
                                {service.description}
                              </div>
                            </div>
                          </div>
                          <span className={`hacker-badge text-[10px] ${
                            isActive ? 'hacker-badge-green' : 'hacker-badge-error'
                          }`}>
                            {service.sub || service.active}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* System Logs */}
              <div className="hacker-card">
                <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> SYSTEM LOGS
                </h4>
                {systemLogs.length === 0 ? (
                  <p className="text-xs text-hacker-text-dim font-mono">Loading logs...</p>
                ) : (
                  <div className="bg-black/50 rounded p-3 max-h-80 overflow-y-auto">
                    <pre className="font-mono text-[10px] text-hacker-text-dim whitespace-pre-wrap">
                      {systemLogs.slice(0, 50).map((log, i) => (
                        <div key={i} className="hover:text-hacker-text py-0.5">
                          {log}
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Network Info */}
            {serverStatus?.network && serverStatus.network.length > 0 && (
              <div className="hacker-card">
                <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> NETWORK INTERFACES
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {serverStatus.network.map((iface, idx) => (
                    <div key={idx} className="p-3 bg-hacker-bg/50 border border-hacker-cyan/10 rounded">
                      <div className="font-mono text-sm text-hacker-cyan mb-1">{iface.name}</div>
                      <div className="text-xs text-hacker-text-dim">
                        {iface.address || 'No IP'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Docker Management Tab */}
        {activeTab === TABS.DOCKER && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} DOCKER_MANAGEMENT
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDockerData}
                  disabled={loading}
                  className="hacker-btn text-xs"
                >
                  {loading ? '[LOADING...]' : '[REFRESH]'}
                </button>
              </div>
            </div>

            {/* Docker Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="hacker-card text-center">
                <div className="stat-value">{dockerSystem?.containers?.total || containers.length}</div>
                <div className="stat-label">CONTAINERS</div>
              </div>
              <div className="hacker-card text-center">
                <div className="stat-value neon-text-cyan" style={{color: '#00d4ff'}}>
                  {dockerSystem?.containers?.running || containers.filter(c => c.State === 'running').length}
                </div>
                <div className="stat-label">RUNNING</div>
              </div>
              <div className="hacker-card text-center">
                <div className="stat-value neon-text-purple" style={{color: '#bd00ff'}}>{images.length}</div>
                <div className="stat-label">IMAGES</div>
              </div>
              <div className="hacker-card text-center">
                <div className="stat-value">{volumes.length}</div>
                <div className="stat-label">VOLUMES</div>
              </div>
            </div>

            {/* Docker System Info */}
            {dockerSystem && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-green mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span>&#9654;</span> ENGINE
                  </h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">version</span>
                      <span className="text-hacker-cyan">{dockerSystem.serverVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">os</span>
                      <span className="text-hacker-text">{dockerSystem.operatingSystem}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">arch</span>
                      <span className="text-hacker-text">{dockerSystem.architecture}</span>
                    </div>
                  </div>
                </div>
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-cyan mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span>&#9654;</span> RESOURCES
                  </h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">cpus</span>
                      <span className="text-hacker-green">{dockerSystem.cpus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">memory</span>
                      <span className="text-hacker-text">{formatBytes(dockerSystem.memTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">networks</span>
                      <span className="text-hacker-text">{networks.length}</span>
                    </div>
                  </div>
                </div>
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-purple mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span>&#9654;</span> COUNTS
                  </h4>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">paused</span>
                      <span className="text-hacker-warning">{dockerSystem.containers?.paused || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">stopped</span>
                      <span className="text-hacker-error">{dockerSystem.containers?.stopped || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hacker-text-dim">images</span>
                      <span className="text-hacker-text">{dockerSystem.images || images.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Container List */}
            <div className="hacker-card">
              <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>&#9654;</span> CONTAINERS [{containers.length}]
              </h4>
              {containers.length === 0 ? (
                <p className="text-xs text-hacker-text-dim font-mono">No containers found</p>
              ) : (
                <div className="space-y-2">
                  {containers.map(container => {
                    // API returns lowercase properties (name, state, id, image, status)
                    const isRunning = container.state === 'running';
                    const name = container.name || container.id?.substring(0, 12) || 'unnamed';
                    const isActioning = containerAction?.containerId === (container.id || container.fullId);

                    return (
                      <div
                        key={container.id || container.fullId}
                        className="flex items-center justify-between p-3 bg-hacker-bg/50 border border-hacker-green/10 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isRunning ? 'bg-hacker-green animate-pulse-glow' : 'bg-hacker-error'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-sm text-hacker-text truncate">{name}</div>
                            <div className="text-xs text-hacker-text-dim truncate">
                              {container.image} | {container.status}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`hacker-badge text-[10px] ${
                            isRunning ? 'hacker-badge-green' : 'hacker-badge-error'
                          }`}>
                            {container.state?.toUpperCase()}
                          </span>
                          {isRunning ? (
                            <>
                              <button
                                onClick={() => handleContainerAction(container.id || container.fullId, 'stop')}
                                disabled={isActioning}
                                className="hacker-btn text-[10px] px-2 py-1 border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10"
                              >
                                {isActioning && containerAction?.action === 'stop' ? '...' : 'STOP'}
                              </button>
                              <button
                                onClick={() => handleContainerAction(container.id || container.fullId, 'restart')}
                                disabled={isActioning}
                                className="hacker-btn text-[10px] px-2 py-1 border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/10"
                              >
                                {isActioning && containerAction?.action === 'restart' ? '...' : 'RESTART'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleContainerAction(container.id || container.fullId, 'start')}
                              disabled={isActioning}
                              className="hacker-btn text-[10px] px-2 py-1 border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10"
                            >
                              {isActioning && containerAction?.action === 'start' ? '...' : 'START'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Images Section */}
            <div className="hacker-card">
              <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>&#9654;</span> IMAGES [{images.length}]
              </h4>
              {images.length === 0 ? (
                <p className="text-xs text-hacker-text-dim font-mono">No images found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {images.slice(0, 12).map(image => {
                    const tag = image.RepoTags?.[0] || '<none>:<none>';
                    const [repo, version] = tag.split(':');
                    return (
                      <div
                        key={image.Id}
                        className="p-2 bg-hacker-bg/50 border border-hacker-purple/10 rounded text-xs font-mono"
                      >
                        <div className="text-hacker-text truncate">{repo}</div>
                        <div className="flex justify-between text-hacker-text-dim">
                          <span className="text-hacker-purple">{version}</span>
                          <span>{formatBytes(image.Size)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {images.length > 12 && (
                    <div className="p-2 bg-hacker-bg/50 border border-hacker-purple/10 rounded text-xs font-mono text-center text-hacker-purple">
                      +{images.length - 12} more images
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sovereign Stack Tab */}
        {activeTab === TABS.STACK && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} SOVEREIGN_STACK
              </h3>
              <button
                onClick={fetchStackData}
                disabled={loading}
                className="hacker-btn text-xs"
              >
                {loading ? '[CHECKING...]' : '[HEALTH CHECK]'}
              </button>
            </div>

            {/* Stack Health Summary */}
            {stackHealth && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="hacker-card text-center">
                  <div className="stat-value">{stackHealth.total || stackServices.length}</div>
                  <div className="stat-label">TOTAL SERVICES</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value" style={{color: '#00ff41'}}>{stackHealth.healthy || 0}</div>
                  <div className="stat-label">HEALTHY</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value neon-text-cyan" style={{color: '#ffb000'}}>{stackHealth.unhealthy || 0}</div>
                  <div className="stat-label">UNHEALTHY</div>
                </div>
                <div className="hacker-card text-center">
                  <div className="stat-value neon-text-purple" style={{color: stackHealth.status === 'healthy' ? '#00ff41' : '#ff3333'}}>
                    {stackHealth.status?.toUpperCase() || 'UNKNOWN'}
                  </div>
                  <div className="stat-label">OVERALL STATUS</div>
                </div>
              </div>
            )}

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stackServices.length === 0 ? (
                <div className="col-span-full hacker-card text-center">
                  <p className="text-hacker-text-dim font-mono">Loading stack services...</p>
                </div>
              ) : (
                stackServices.map(service => {
                  const isHealthy = service.status === 'healthy';
                  const icons = {
                    authentik: '🛡️',
                    openwebui: '💬',
                    silverbullet: '📝',
                    plane: '📋',
                    n8n: '⚡',
                    voiceRouter: '🎤',
                    monitoring: '📊',
                  };
                  const icon = icons[service.id] || '🔧';

                  return (
                    <div key={service.id} className="hacker-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-hacker-cyan flex items-center gap-2">
                          <span>{icon}</span> {service.name}
                        </h4>
                        <span className={`hacker-badge text-[10px] ${
                          isHealthy ? 'hacker-badge-green' : 'hacker-badge-error'
                        }`}>
                          {service.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="text-xs text-hacker-text-dim font-mono mb-2">{service.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-hacker-text-dim">Port: {service.port}</span>
                        <div className="flex items-center gap-2">
                          {service.url && (
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hacker-btn text-[10px] px-2 py-1"
                            >
                              OPEN
                            </a>
                          )}
                          <button
                            onClick={() => handleStackRestart(service.id)}
                            disabled={loading}
                            className="hacker-btn text-[10px] px-2 py-1 border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/10"
                          >
                            RESTART
                          </button>
                        </div>
                      </div>
                      {/* Health indicator bar */}
                      <div className="mt-3">
                        <div className="hacker-progress h-1">
                          <div
                            className="hacker-progress-bar"
                            style={{
                              width: isHealthy ? '100%' : '30%',
                              background: isHealthy
                                ? 'linear-gradient(90deg, #00cc33, #00ff41)'
                                : 'linear-gradient(90deg, #cc3333, #ff3333)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Actions */}
            <div className="hacker-card">
              <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>&#9654;</span> QUICK LAUNCH
              </h4>
              <div className="flex flex-wrap gap-2">
                {stackServices.filter(s => s.url).map(service => (
                  <a
                    key={service.id}
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hacker-btn text-xs flex items-center gap-2 ${
                      service.status === 'healthy'
                        ? 'border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10'
                        : 'border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      service.status === 'healthy' ? 'bg-hacker-green' : 'bg-hacker-error'
                    }`} />
                    {service.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Last Check Time */}
            {stackHealth?.timestamp && (
              <p className="text-xs text-hacker-text-dim font-mono">
                Last health check: {formatTime(stackHealth.timestamp)}
              </p>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === TABS.HISTORY && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} SESSION_HISTORY [{history.total}]
              </h3>
              <button
                onClick={fetchHistory}
                disabled={loading}
                className="hacker-btn text-xs"
              >
                {loading ? '[LOADING...]' : '[REFRESH]'}
              </button>
            </div>

            <div className="space-y-2">
              {history.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="hacker-card p-4"
                >
                  <p className="text-sm text-hacker-text font-mono truncate mb-2">
                    <span className="text-hacker-green">$</span> {entry.display?.substring(0, 150)}
                    {entry.display?.length > 150 && '...'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-hacker-text-dim font-mono">
                    <span className="text-hacker-cyan">{formatTime(entry.timestamp)}</span>
                    {entry.project && (
                      <span className="hacker-badge hacker-badge-purple text-[10px]">
                        {entry.project.split('/').pop()}
                      </span>
                    )}
                    {entry.sessionId && (
                      <span className="text-hacker-text-dim">
                        #{entry.sessionId.substring(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions Editor Tab */}
        {activeTab === TABS.CLAUDE_MD && (
          <div className="h-full flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    fetchClaudeMd(e.target.value);
                  }}
                  className="hacker-input text-sm"
                >
                  <option value="__global__">~/.claude/CLAUDE.md (GLOBAL)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name}/CLAUDE.md {p.hasClaudeMd ? '' : '(NEW)'}
                    </option>
                  ))}
                </select>
                {hasUnsavedChanges && (
                  <span className="hacker-badge hacker-badge-warning text-xs">UNSAVED</span>
                )}
              </div>
              <button
                onClick={saveClaudeMd}
                disabled={loading || !hasUnsavedChanges}
                className="hacker-btn disabled:opacity-50"
              >
                {loading ? '[SAVING...]' : '[SAVE]'}
              </button>
            </div>

            <div className="flex-1 min-h-0">
              <textarea
                value={claudeMdEdited}
                onChange={(e) => {
                  setClaudeMdEdited(e.target.value);
                  setHasUnsavedChanges(e.target.value !== claudeMd.content);
                }}
                className="w-full h-full hacker-input resize-none font-mono text-sm"
                placeholder="# Project instructions..."
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* MCP Servers Tab */}
        {activeTab === TABS.MCP && (
          <div className="space-y-6 animate-fade-in">
            <MCPServerManager />
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === TABS.PROJECTS && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} PROJECTS [{projects.length}]
              </h3>
              <div className="flex items-center gap-3">
                {/* Stats summary */}
                <div className="hidden md:flex items-center gap-4 text-xs font-mono">
                  <span className="text-hacker-text-dim">
                    AVG: <span className="text-hacker-cyan">
                      {projects.length > 0
                        ? Math.round(projects.reduce((sum, p) => sum + (p.completion?.percentage || 0), 0) / projects.length)
                        : 0}%
                    </span>
                  </span>
                  <span className="text-hacker-text-dim">
                    ACTIVE: <span className="text-hacker-green">{projects.filter(p => p.hasActiveSession).length}</span>
                  </span>
                </div>
                <button onClick={fetchProjects} className="hacker-btn text-xs">
                  {loading ? '[SCANNING...]' : '[REFRESH]'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map(project => {
                const completion = project.completion || { percentage: 0, missing: [], scores: {} };
                const completionClass = completion.percentage >= 80 ? 'text-hacker-green' :
                                        completion.percentage >= 60 ? 'text-hacker-cyan' :
                                        completion.percentage >= 40 ? 'text-hacker-warning' : 'text-hacker-error';
                const barColor = completion.percentage >= 80 ? 'bg-hacker-green' :
                                 completion.percentage >= 60 ? 'bg-hacker-cyan' :
                                 completion.percentage >= 40 ? 'bg-hacker-warning' : 'bg-hacker-error';

                return (
                  <div key={project.id} className="hacker-card p-4 flex flex-col group/card">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            project.hasActiveSession ? 'bg-hacker-green animate-pulse-glow' : 'bg-hacker-border'
                          }`}
                        />
                        <span className="font-semibold text-sm truncate text-hacker-text font-mono">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold font-display ${completionClass}`}>
                          {completion.percentage}%
                        </span>
                        <button
                          onClick={() => setDeleteConfirm({ name: project.name, permanent: false })}
                          className="p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-hacker-error/20"
                          title="Delete project"
                        >
                          <svg className="w-4 h-4 text-hacker-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-xs text-hacker-text-dim mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Completion Bar */}
                    <div className="mb-3">
                      <div className="hacker-progress">
                        <div
                          className={`hacker-progress-bar ${barColor}`}
                          style={{
                            width: `${completion.percentage}%`,
                            background: completion.percentage >= 80 ? 'linear-gradient(90deg, #00cc33, #00ff41)' :
                                        completion.percentage >= 60 ? 'linear-gradient(90deg, #00a8cc, #00d4ff)' :
                                        completion.percentage >= 40 ? 'linear-gradient(90deg, #cc8800, #ffb000)' :
                                        'linear-gradient(90deg, #cc3333, #ff3333)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Technologies */}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {project.technologies.slice(0, 5).map(tech => (
                          <span key={tech} className="px-2 py-0.5 text-[10px] bg-hacker-surface border border-hacker-border rounded font-mono text-hacker-text-dim">
                            {tech}
                          </span>
                        ))}
                        {project.technologies.length > 5 && (
                          <span className="px-2 py-0.5 text-[10px] bg-hacker-surface border border-hacker-border rounded font-mono text-hacker-cyan">
                            +{project.technologies.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {project.hasActiveSession && (
                        <span className="hacker-badge hacker-badge-green text-[10px]">ACTIVE</span>
                      )}
                      {project.hasClaudeMd && (
                        <span className="hacker-badge hacker-badge-cyan text-[10px]">PROJECT.MD</span>
                      )}
                      {project.hasSessionData && (
                        <span className="hacker-badge hacker-badge-purple text-[10px]">SESSIONS</span>
                      )}
                      {/* Skip Permissions Toggle */}
                      <button
                        onClick={() => toggleProjectSkipPermissions(project.name, project.skipPermissions)}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 ${
                          project.skipPermissions
                            ? 'bg-hacker-warning/20 border border-hacker-warning/50 text-hacker-warning hover:bg-hacker-warning/30'
                            : 'bg-hacker-surface border border-hacker-border text-hacker-text-dim hover:border-hacker-warning/50 hover:text-hacker-warning'
                        }`}
                        title={project.skipPermissions
                          ? 'Click to require permission prompts'
                          : 'Click to skip permission prompts (--dangerously-skip-permissions)'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d={project.skipPermissions
                              ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"} />
                        </svg>
                        {project.skipPermissions ? 'SKIP-PERMS' : 'NORMAL'}
                      </button>
                    </div>

                    {/* Missing Items Callout */}
                    {completion.missing && completion.missing.length > 0 && (
                      <div className="mt-auto pt-3 border-t border-hacker-border/30">
                        <div className="text-[10px] uppercase tracking-wider text-hacker-error mb-1.5 font-semibold flex items-center gap-1">
                          <span>&#9888;</span> MISSING
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {completion.missing.slice(0, 4).map(item => (
                            <span
                              key={item}
                              className="px-1.5 py-0.5 text-[9px] bg-hacker-error/10 border border-hacker-error/30 rounded text-hacker-error/80 font-mono"
                            >
                              {item}
                            </span>
                          ))}
                          {completion.missing.length > 4 && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-hacker-error/10 border border-hacker-error/30 rounded text-hacker-error font-mono">
                              +{completion.missing.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Last Modified */}
                    {project.lastModified && (
                      <div className="mt-2 text-[10px] text-hacker-text-dim font-mono">
                        Last modified: {new Date(project.lastModified).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            {projects.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                <div className="hacker-card p-3 text-center">
                  <div className="stat-value text-xl">{projects.length}</div>
                  <div className="stat-label text-[10px]">TOTAL</div>
                </div>
                <div className="hacker-card p-3 text-center">
                  <div className="stat-value text-xl" style={{color: '#00ff41'}}>
                    {projects.filter(p => (p.completion?.percentage || 0) >= 80).length}
                  </div>
                  <div className="stat-label text-[10px]">EXCELLENT (80%+)</div>
                </div>
                <div className="hacker-card p-3 text-center">
                  <div className="stat-value text-xl" style={{color: '#00d4ff'}}>
                    {projects.filter(p => (p.completion?.percentage || 0) >= 60 && (p.completion?.percentage || 0) < 80).length}
                  </div>
                  <div className="stat-label text-[10px]">GOOD (60-79%)</div>
                </div>
                <div className="hacker-card p-3 text-center">
                  <div className="stat-value text-xl" style={{color: '#ffb000'}}>
                    {projects.filter(p => (p.completion?.percentage || 0) >= 40 && (p.completion?.percentage || 0) < 60).length}
                  </div>
                  <div className="stat-label text-[10px]">MEDIUM (40-59%)</div>
                </div>
                <div className="hacker-card p-3 text-center">
                  <div className="stat-value text-xl" style={{color: '#ff3333'}}>
                    {projects.filter(p => (p.completion?.percentage || 0) < 40).length}
                  </div>
                  <div className="stat-label text-[10px]">NEEDS WORK (&lt;40%)</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === TABS.TOOLS && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} DEV_TOOLS
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* API Tester */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> API TESTER
                </h4>
                <ApiTester embedded={true} />
              </div>

              {/* Git Workflow */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> GIT WORKFLOW
                </h4>
                <GitWorkflow embedded={true} />
              </div>

              {/* File Browser */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> FILE BROWSER
                </h4>
                <FileBrowser embedded={true} />
              </div>

              {/* Diff Viewer */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> DIFF VIEWER
                </h4>
                <DiffViewer embedded={true} />
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === TABS.AGENTS && (
          <div className="space-y-6 animate-fade-in">
            <AgentManager />
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === TABS.MONITORING && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} MONITORING_CENTER
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Uptime Display */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> UPTIME MONITOR
                </h4>
                <UptimeWidget />
              </div>

              {/* Network Stats */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> NETWORK STATS
                </h4>
                <NetworkWidget />
              </div>

              {/* Cost Dashboard */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> API COSTS
                </h4>
                <CostWidget />
              </div>

              {/* Alert Rules */}
              <div className="hacker-card p-4 lg:col-span-2 xl:col-span-3">
                <h4 className="text-sm font-semibold text-hacker-error mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> ALERT RULES
                </h4>
                <AlertRuleEditor embedded={true} />
              </div>
            </div>
          </div>
        )}

        {/* DevTools Tab */}
        {activeTab === TABS.DEVTOOLS && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} DEVELOPER_TOOLS
              </h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Database Browser */}
              <div className="hacker-card p-4 xl:col-span-2">
                <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> DATABASE BROWSER
                </h4>
                <DatabaseBrowser embedded={true} />
              </div>

              {/* Dependency Dashboard */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> DEPENDENCIES
                </h4>
                <DependencyDashboard embedded={true} />
              </div>

              {/* Log Viewer */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> LOG VIEWER
                </h4>
                <LogViewer embedded={true} />
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === TABS.SECURITY && (
          <SecurityDashboard selectedProject={selectedProject} />
        )}

        {/* GitHub Tab */}
        {activeTab === TABS.GITHUB && (
          <GitHubSettingsTab />
        )}

        {/* Cloudflare Tab */}
        {activeTab === TABS.CLOUDFLARE && (
          <CloudflareSettingsTab />
        )}

        {/* Settings Tab */}
        {activeTab === TABS.SETTINGS && (
          <SettingsPanel />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="hacker-card p-6 max-w-md w-full mx-4 border-hacker-error/50">
            <h3 className="text-lg font-bold text-hacker-error mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              DELETE PROJECT
            </h3>
            <p className="text-hacker-text mb-4">
              Are you sure you want to delete <span className="font-bold text-hacker-cyan">{deleteConfirm.name}</span>?
            </p>
            <div className="mb-4 p-3 bg-hacker-surface rounded border border-hacker-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirm.permanent}
                  onChange={(e) => setDeleteConfirm({ ...deleteConfirm, permanent: e.target.checked })}
                  className="w-4 h-4 accent-hacker-error"
                />
                <span className="text-sm text-hacker-text-dim">
                  Permanently delete (cannot be recovered)
                </span>
              </label>
              <p className="text-xs text-hacker-text-dim mt-2">
                {deleteConfirm.permanent
                  ? 'Project will be permanently deleted from disk.'
                  : 'Project will be moved to ~/.Trash for recovery.'}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="hacker-btn"
              >
                CANCEL
              </button>
              <button
                onClick={() => deleteProject(deleteConfirm.name, deleteConfirm.permanent)}
                className="px-4 py-2 bg-hacker-error text-white font-mono text-sm rounded hover:bg-hacker-error/80 transition-colors"
              >
                {deleteConfirm.permanent ? 'DELETE PERMANENTLY' : 'MOVE TO TRASH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-hacker-green/10 bg-hacker-surface/50 font-mono text-xs text-hacker-text-dim flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-hacker-green">CP://SYSTEM</span>
          <span>v2.10.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TAB: {activeTab.toUpperCase()}</span>
          <span className="text-hacker-cyan">{new Date().toLocaleDateString()}</span>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;
