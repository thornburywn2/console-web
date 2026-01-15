import { useState, useEffect, useCallback } from 'react';

// Import components for Development tab
import ApiTester from './ApiTester';
import DatabaseBrowser from './DatabaseBrowser';
import DiffViewer from './DiffViewer';
import FileBrowser from './FileBrowser';
import LogViewer from './LogViewer';
import DependencyDashboard from './DependencyDashboard';
import GitWorkflow from './GitWorkflow';

// Agent and MCP components
import AgentManager from './AgentManager';
import AgentMarketplace from './AgentMarketplace';
import MCPServerManager from './MCPServerManager';

// Settings Panel
import SettingsPanel from './SettingsPanel';

// Security Dashboard
import SecurityDashboard from './SecurityDashboard';

// P2: Tabby Code Completion
import TabbyDashboard from './TabbyDashboard';

// P3: Claude Flow Multi-Agent Swarms
import SwarmDashboard from './SwarmDashboard';

// Code Puppy AI Coding Assistant
import CodePuppyDashboard from './CodePuppyDashboard';

// Project Templates
import ProjectCreator from './ProjectCreator';
import ComplianceChecker, { ComplianceBadge } from './ComplianceChecker';

// Tab options - exported for use by other components
// Exported for use in SettingsPanel integrations section
export { GitHubSettingsTab, CloudflareSettingsTab };

export const TABS = {
  // Main tabs (in display order)
  PROJECTS: 'projects', // Primary - project management with CLAUDE.md editor
  INFRASTRUCTURE: 'infrastructure', // System management + Settings (merged)
  AGENTS: 'agents', // Has sub-tabs: MY_AGENTS, MARKETPLACE
  MCP: 'mcp', // MCP Server catalog (next to agents)
  SECURITY: 'security', // Security scanning dashboard
  HISTORY: 'history', // Session history (last)
  // Experimental (hidden by default, enable in Settings)
  DEVELOPMENT: 'development', // Dev tools - API tester, database browser, etc.
  CODE_PUPPY: 'code_puppy', // Code Puppy AI assistant
  TABBY: 'tabby', // Tabby code completion
  SWARM: 'swarm', // Claude Flow multi-agent swarms
};

// Infrastructure sub-tabs (includes Settings as sub-tab now)
const INFRA_TABS = {
  // Settings (first - default pane)
  SETTINGS: 'settings',
  // System
  SERVICES: 'services',
  DOCKER: 'docker',
  STACK: 'stack',
  PACKAGES: 'packages',
  LOGS: 'logs',
  PROCESSES: 'processes',
  // Network & Security
  NETWORK: 'network',
  FIREWALL: 'firewall',
  FAIL2BAN: 'security', // Renamed from SECURITY for clarity
  // Users & Auth
  AUTHENTIK: 'authentik',
  USERS: 'users',
  // Automation
  SCHEDULED: 'scheduled',
};

// Agents sub-tabs
const AGENT_TABS = {
  MY_AGENTS: 'my_agents',
  MARKETPLACE: 'marketplace',
};

// ASCII Art - Terminal/Console Window
const HACKER_ASCII = `
 ┌─────────────────────────┐
 │ ● ○ ○  CONSOLE.web     │
 ├─────────────────────────┤
 │ > claude --project _    │
 │ > npm run dev           │
 │ > git push origin main  │
 │                         │
 │ █ Ready_                │
 └─────────────────────────┘
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
                    className="input-glass font-mono pr-10"
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
    zoneName: 'example.com',
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
          zoneName: data.zoneName || 'example.com',
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
        zoneName: 'example.com',
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

  const handleToggleWebsocket = async (hostname, currentEnabled) => {
    try {
      const res = await fetch(`/api/cloudflare/routes/${encodeURIComponent(hostname)}/websocket`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to toggle WebSocket');
      }

      setSuccess(`WebSocket ${!currentEnabled ? 'enabled' : 'disabled'} for ${hostname}`);
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
                    className="input-glass font-mono pr-10"
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
                    className="input-glass font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">TUNNEL ID</label>
                  <input
                    type="text"
                    value={formData.tunnelId}
                    onChange={(e) => setFormData(prev => ({ ...prev, tunnelId: e.target.value }))}
                    placeholder="f86095ee..."
                    className="input-glass font-mono"
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
                    className="input-glass font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">ZONE NAME</label>
                  <input
                    type="text"
                    value={formData.zoneName}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoneName: e.target.value }))}
                    placeholder="example.com"
                    className="input-glass font-mono"
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
                  className="input-glass font-mono"
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
                    <th className="pb-2 pr-4" title="WebSocket Support (wss://)">WS</th>
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
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => handleToggleWebsocket(route.hostname, route.websocketEnabled)}
                          className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                            route.websocketEnabled
                              ? 'bg-hacker-cyan/20 text-hacker-cyan border border-hacker-cyan/30 hover:bg-hacker-cyan/30'
                              : 'bg-hacker-surface text-hacker-text-dim border border-hacker-border hover:bg-hacker-surface/70'
                          }`}
                          title={route.websocketEnabled ? 'WebSocket enabled - Click to disable' : 'WebSocket disabled - Click to enable for wss:// support'}
                        >
                          {route.websocketEnabled ? 'ON' : 'OFF'}
                        </button>
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

function AdminDashboard({ onClose, initialTab = null, currentProject = null }) {
  const [activeTab, setActiveTab] = useState(initialTab || TABS.PROJECTS);
  const [infraSubTab, setInfraSubTab] = useState(INFRA_TABS.SETTINGS);
  const [agentSubTab, setAgentSubTab] = useState(AGENT_TABS.MY_AGENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claudeMdModalProject, setClaudeMdModalProject] = useState(null); // For per-project CLAUDE.md editing

  // Application branding
  const [appName, setAppName] = useState('Command Portal');

  // Data states
  const [systemInfo, setSystemInfo] = useState(null);
  const [history, setHistory] = useState({ entries: [], total: 0 });
  const [projects, setProjects] = useState([]);
  const [projectSortBy, setProjectSortBy] = useState('name'); // name, completion, lastModified
  const [projectSortOrder, setProjectSortOrder] = useState('asc'); // asc, desc
  const [renameProject, setRenameProject] = useState(null); // { name: string, newName: string }
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [complianceCheckProject, setComplianceCheckProject] = useState(null); // { path: string, name: string }
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

  // Package management states
  const [packages, setPackages] = useState({ packages: [], total: 0 });
  const [packageSearch, setPackageSearch] = useState('');
  const [packageUpdates, setPackageUpdates] = useState({ updates: [], count: 0 });
  const [packageSearchResults, setPackageSearchResults] = useState([]);
  const [packageActionLoading, setPackageActionLoading] = useState(false);

  // Log viewer states
  const [logs, setLogs] = useState([]);
  const [logUnits, setLogUnits] = useState([]);
  const [logFilter, setLogFilter] = useState({ unit: '', priority: '', search: '', lines: 100 });
  const [logLoading, setLogLoading] = useState(false);
  const [logDiskUsage, setLogDiskUsage] = useState(null);

  // Process management states
  const [processes, setProcesses] = useState([]);
  const [processSort, setProcessSort] = useState('cpu');
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);

  // Network diagnostics states
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [networkConnections, setNetworkConnections] = useState([]);
  const [pingResult, setPingResult] = useState(null);
  const [dnsResult, setDnsResult] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(false);

  // Security monitoring states
  const [sshSessions, setSshSessions] = useState([]);
  const [sshFailedAttempts, setSshFailedAttempts] = useState([]);
  const [sshKeys, setSshKeys] = useState([]);
  const [fail2banStatus, setFail2banStatus] = useState({ installed: false, jails: [] });
  const [openPorts, setOpenPorts] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Scheduled tasks states
  const [cronJobs, setCronJobs] = useState([]);
  const [systemdTimers, setSystemdTimers] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [newCronJob, setNewCronJob] = useState({ schedule: '', command: '' });
  const [showAddCron, setShowAddCron] = useState(false);
  const [newCron, setNewCron] = useState({ minute: '*', hour: '*', dom: '*', month: '*', dow: '*', command: '' });

  // Authentik user management states
  const [authentikStatus, setAuthentikStatus] = useState(null);
  const [authentikSettings, setAuthentikSettings] = useState(null);
  const [authentikTokenInput, setAuthentikTokenInput] = useState('');
  const [authentikSaving, setAuthentikSaving] = useState(false);
  const [authentikUsers, setAuthentikUsers] = useState({ users: [], pagination: {} });
  const [authentikGroups, setAuthentikGroups] = useState([]);
  const [authentikLoading, setAuthentikLoading] = useState(false);
  const [authentikSearch, setAuthentikSearch] = useState('');
  const [selectedAuthentikUser, setSelectedAuthentikUser] = useState(null);
  const [showAddAuthentikUser, setShowAddAuthentikUser] = useState(false);
  const [newAuthentikUser, setNewAuthentikUser] = useState({ username: '', name: '', email: '', password: '', groups: [] });

  // Server user management states
  const [serverUsers, setServerUsers] = useState([]);
  const [serverGroups, setServerGroups] = useState([]);
  const [serverShells, setServerShells] = useState([]);
  const [serverUsersLoading, setServerUsersLoading] = useState(false);
  const [showSystemUsers, setShowSystemUsers] = useState(false);
  const [showAddServerUser, setShowAddServerUser] = useState(false);
  const [newServerUser, setNewServerUser] = useState({ username: '', fullName: '', shell: '/bin/bash', groups: [] });
  const [selectedServerUser, setSelectedServerUser] = useState(null);

  // Firewall (UFW) states
  const [firewallStatus, setFirewallStatus] = useState(null);
  const [firewallRules, setFirewallRules] = useState([]);
  const [firewallApps, setFirewallApps] = useState([]);
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [showAddFirewallRule, setShowAddFirewallRule] = useState(false);
  const [newFirewallRule, setNewFirewallRule] = useState({ action: 'allow', port: '', protocol: 'tcp', from: 'any', comment: '' });
  const [firewallLogs, setFirewallLogs] = useState([]);
  const [firewallLogsLoading, setFirewallLogsLoading] = useState(false);
  const [projectPorts, setProjectPorts] = useState([]);
  const [projectPortsLoading, setProjectPortsLoading] = useState(false);
  const [syncingPorts, setSyncingPorts] = useState(false);

  // Additional UI state aliases for infrastructure
  const [packageFilter, setPackageFilter] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [pingHostInput, setPingHostInput] = useState('');
  const [dnsHostInput, setDnsHostInput] = useState('');

  // User settings (for experimental features toggle)
  const [userSettings, setUserSettings] = useState(null);

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

  // Sort projects helper
  const sortedProjects = [...projects].sort((a, b) => {
    let comparison = 0;
    switch (projectSortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'completion':
        comparison = (a.completion?.percentage || 0) - (b.completion?.percentage || 0);
        break;
      case 'lastModified':
        comparison = new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
        break;
      case 'active':
        comparison = (a.hasActiveSession ? 1 : 0) - (b.hasActiveSession ? 1 : 0);
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }
    return projectSortOrder === 'asc' ? comparison : -comparison;
  });

  // Rename project handler
  const handleRenameProject = useCallback(async (oldName, newName) => {
    if (!newName || newName === oldName) {
      setRenameProject(null);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${encodeURIComponent(oldName)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rename project');
      }
      // Refresh projects list
      fetchProjects();
      setRenameProject(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  // ============================================
  // INFRASTRUCTURE MANAGEMENT FETCH FUNCTIONS
  // ============================================

  // Fetch packages list
  const fetchPackages = useCallback(async (search = '') => {
    try {
      setPackageActionLoading(true);
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.append('search', search);
      const res = await fetch(`/api/infra/packages?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setPackageActionLoading(false);
    }
  }, []);

  // Fetch package updates
  const fetchPackageUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/infra/packages/updates');
      if (res.ok) {
        const data = await res.json();
        setPackageUpdates(data);
      }
    } catch (err) {
      console.error('Error fetching package updates:', err);
    }
  }, []);

  // Search available packages
  const searchAvailablePackages = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setPackageSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/infra/packages/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPackageSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Error searching packages:', err);
    }
  }, []);

  // Install package
  const installPackage = useCallback(async (packageName) => {
    try {
      setPackageActionLoading(true);
      const res = await fetch('/api/infra/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchPackages(packageSearch);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setPackageActionLoading(false);
    }
  }, [fetchPackages, packageSearch]);

  // Remove package
  const removePackage = useCallback(async (packageName, purge = false) => {
    try {
      setPackageActionLoading(true);
      const res = await fetch('/api/infra/packages/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName, purge })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchPackages(packageSearch);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setPackageActionLoading(false);
    }
  }, [fetchPackages, packageSearch]);

  // Upgrade all packages
  const upgradeAllPackages = useCallback(async () => {
    try {
      setPackageActionLoading(true);
      const res = await fetch('/api/infra/packages/upgrade', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchPackageUpdates();
      return { success: true, output: data.output };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setPackageActionLoading(false);
    }
  }, [fetchPackageUpdates]);

  // Fetch logs
  const fetchLogs = useCallback(async (filters = {}) => {
    try {
      setLogLoading(true);
      const params = new URLSearchParams();
      if (filters.unit) params.append('unit', filters.unit);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      params.append('lines', filters.lines || '100');

      const [logsRes, diskRes] = await Promise.all([
        fetch(`/api/infra/logs?${params}`),
        fetch('/api/infra/logs/disk-usage')
      ]);
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
      if (diskRes.ok) {
        const diskData = await diskRes.json();
        setLogDiskUsage(diskData.usage || null);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogLoading(false);
    }
  }, []);

  // Fetch log units
  const fetchLogUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/infra/logs/units');
      if (res.ok) {
        const data = await res.json();
        setLogUnits(data.units || []);
      }
    } catch (err) {
      console.error('Error fetching log units:', err);
    }
  }, []);

  // Fetch processes
  const fetchProcesses = useCallback(async (sort = 'cpu') => {
    try {
      setProcessLoading(true);
      const res = await fetch(`/api/infra/processes?sort=${sort}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes || []);
      }
    } catch (err) {
      console.error('Error fetching processes:', err);
    } finally {
      setProcessLoading(false);
    }
  }, []);

  // Kill process
  const killProcess = useCallback(async (pid, signal = 'TERM') => {
    try {
      const res = await fetch(`/api/infra/processes/${pid}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchProcesses(processSort);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchProcesses, processSort]);

  // Fetch network interfaces
  const fetchNetworkInterfaces = useCallback(async () => {
    try {
      setNetworkLoading(true);
      const [interfacesRes, connectionsRes] = await Promise.all([
        fetch('/api/infra/network/interfaces'),
        fetch('/api/infra/network/connections')
      ]);
      if (interfacesRes.ok) setNetworkInterfaces((await interfacesRes.json()).interfaces || []);
      if (connectionsRes.ok) setNetworkConnections((await connectionsRes.json()).connections || []);
    } catch (err) {
      console.error('Error fetching network data:', err);
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  // Ping host
  const pingHost = useCallback(async (host) => {
    try {
      setNetworkLoading(true);
      const res = await fetch('/api/infra/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, count: 4 })
      });
      const data = await res.json();
      setPingResult(data);
    } catch (err) {
      console.error('Error pinging host:', err);
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  // DNS lookup
  const dnsLookup = useCallback(async (host, type = 'A') => {
    try {
      setNetworkLoading(true);
      const res = await fetch('/api/infra/network/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, type })
      });
      const data = await res.json();
      setDnsResult(data);
    } catch (err) {
      console.error('Error doing DNS lookup:', err);
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  // Fetch security data
  const fetchSecurityData = useCallback(async () => {
    try {
      setSecurityLoading(true);
      const [sessionsRes, failedRes, keysRes, fail2banRes, portsRes, loginsRes] = await Promise.all([
        fetch('/api/infra/security/ssh/sessions'),
        fetch('/api/infra/security/ssh/failed'),
        fetch('/api/infra/security/ssh/keys'),
        fetch('/api/infra/security/fail2ban/status'),
        fetch('/api/infra/security/ports'),
        fetch('/api/infra/security/last-logins')
      ]);
      if (sessionsRes.ok) setSshSessions((await sessionsRes.json()).sessions || []);
      if (failedRes.ok) setSshFailedAttempts((await failedRes.json()).attempts || []);
      if (keysRes.ok) setSshKeys((await keysRes.json()).keys || []);
      if (fail2banRes.ok) setFail2banStatus(await fail2banRes.json());
      if (portsRes.ok) setOpenPorts((await portsRes.json()).ports || []);
      if (loginsRes.ok) setLastLogins((await loginsRes.json()).logins || []);
    } catch (err) {
      console.error('Error fetching security data:', err);
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  // Unban IP
  const unbanIP = useCallback(async (jail, ip) => {
    try {
      const res = await fetch('/api/infra/security/fail2ban/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jail, ip })
      });
      if (!res.ok) throw new Error('Failed to unban IP');
      fetchSecurityData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchSecurityData]);

  // Fetch scheduled tasks
  const fetchScheduledTasks = useCallback(async () => {
    try {
      setScheduledLoading(true);
      const [cronRes, timersRes] = await Promise.all([
        fetch('/api/infra/scheduled/cron'),
        fetch('/api/infra/scheduled/timers')
      ]);
      if (cronRes.ok) setCronJobs((await cronRes.json()).jobs || []);
      if (timersRes.ok) setSystemdTimers((await timersRes.json()).timers || []);
    } catch (err) {
      console.error('Error fetching scheduled tasks:', err);
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  // Toggle timer
  const toggleTimer = useCallback(async (timerName, enabled) => {
    try {
      const res = await fetch(`/api/infra/scheduled/timers/${timerName}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Failed to toggle timer');
      fetchScheduledTasks();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchScheduledTasks]);

  // Add cron job
  const addCronJob = useCallback(async (schedule, command) => {
    try {
      const res = await fetch('/api/infra/scheduled/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, command })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchScheduledTasks();
      setNewCronJob({ schedule: '', command: '' });
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchScheduledTasks]);

  // Delete cron job
  const deleteCronJob = useCallback(async (index) => {
    try {
      const res = await fetch(`/api/infra/scheduled/cron/${index}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete cron job');
      fetchScheduledTasks();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchScheduledTasks]);

  // ============================================
  // AUTHENTIK USER MANAGEMENT FUNCTIONS
  // ============================================

  const fetchAuthentikSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/authentik/settings');
      if (res.ok) setAuthentikSettings(await res.json());
    } catch (err) {
      console.error('Error fetching Authentik settings:', err);
    }
  }, []);

  const saveAuthentikToken = useCallback(async (token) => {
    try {
      setAuthentikSaving(true);
      const res = await fetch('/api/admin-users/authentik/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: token })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthentikSettings(data);
        setAuthentikTokenInput('');
        // Refresh status and users
        fetchAuthentikStatus();
        fetchAuthentikUsers();
        fetchAuthentikGroups();
      } else {
        alert(data.error || 'Failed to save token');
      }
    } catch (err) {
      console.error('Error saving Authentik token:', err);
      alert('Failed to save token');
    } finally {
      setAuthentikSaving(false);
    }
  }, []);

  const fetchAuthentikStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/authentik/status');
      if (res.ok) setAuthentikStatus(await res.json());
    } catch (err) {
      console.error('Error fetching Authentik status:', err);
    }
  }, []);

  const fetchAuthentikUsers = useCallback(async (search = '') => {
    try {
      setAuthentikLoading(true);
      const params = new URLSearchParams({ page: 1, pageSize: 50 });
      if (search) params.append('search', search);
      const res = await fetch(`/api/admin-users/authentik/users?${params}`);
      if (res.ok) setAuthentikUsers(await res.json());
    } catch (err) {
      console.error('Error fetching Authentik users:', err);
    } finally {
      setAuthentikLoading(false);
    }
  }, []);

  const fetchAuthentikGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/authentik/groups');
      if (res.ok) setAuthentikGroups((await res.json()).groups || []);
    } catch (err) {
      console.error('Error fetching Authentik groups:', err);
    }
  }, []);

  const createAuthentikUser = useCallback(async (userData) => {
    try {
      const res = await fetch('/api/admin-users/authentik/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchAuthentikUsers(authentikSearch);
      setShowAddAuthentikUser(false);
      setNewAuthentikUser({ username: '', name: '', email: '', password: '', groups: [] });
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchAuthentikUsers, authentikSearch]);

  const toggleAuthentikUserActive = useCallback(async (userId, isActive) => {
    try {
      const res = await fetch(`/api/admin-users/authentik/users/${userId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error('Failed to toggle user status');
      fetchAuthentikUsers(authentikSearch);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchAuthentikUsers, authentikSearch]);

  const deleteAuthentikUser = useCallback(async (userId) => {
    try {
      const res = await fetch(`/api/admin-users/authentik/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchAuthentikUsers(authentikSearch);
      setSelectedAuthentikUser(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchAuthentikUsers, authentikSearch]);

  // ============================================
  // SERVER USER MANAGEMENT FUNCTIONS
  // ============================================

  const fetchServerUsers = useCallback(async () => {
    try {
      setServerUsersLoading(true);
      const res = await fetch(`/api/admin-users/server/users?showSystem=${showSystemUsers}`);
      if (res.ok) setServerUsers((await res.json()).users || []);
    } catch (err) {
      console.error('Error fetching server users:', err);
    } finally {
      setServerUsersLoading(false);
    }
  }, [showSystemUsers]);

  const fetchServerGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/server/groups?showSystem=false');
      if (res.ok) setServerGroups((await res.json()).groups || []);
    } catch (err) {
      console.error('Error fetching server groups:', err);
    }
  }, []);

  const fetchServerShells = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/server/shells');
      if (res.ok) setServerShells((await res.json()).shells || []);
    } catch (err) {
      console.error('Error fetching shells:', err);
    }
  }, []);

  const createServerUser = useCallback(async (userData) => {
    try {
      const res = await fetch('/api/admin-users/server/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchServerUsers();
      setShowAddServerUser(false);
      setNewServerUser({ username: '', fullName: '', shell: '/bin/bash', groups: [] });
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchServerUsers]);

  const deleteServerUser = useCallback(async (username, removeHome = false) => {
    try {
      const res = await fetch(`/api/admin-users/server/users/${username}?removeHome=${removeHome}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchServerUsers();
      setSelectedServerUser(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchServerUsers]);

  // ============================================
  // FIREWALL (UFW) MANAGEMENT FUNCTIONS
  // ============================================

  const fetchFirewallStatus = useCallback(async () => {
    try {
      setFirewallLoading(true);
      const [statusRes, rulesRes, appsRes] = await Promise.all([
        fetch('/api/admin-users/firewall/status'),
        fetch('/api/admin-users/firewall/rules'),
        fetch('/api/admin-users/firewall/app-list')
      ]);
      if (statusRes.ok) setFirewallStatus(await statusRes.json());
      if (rulesRes.ok) setFirewallRules((await rulesRes.json()).rules || []);
      if (appsRes.ok) setFirewallApps((await appsRes.json()).apps || []);
    } catch (err) {
      console.error('Error fetching firewall status:', err);
    } finally {
      setFirewallLoading(false);
    }
  }, []);

  const toggleFirewall = useCallback(async (enable) => {
    try {
      const endpoint = enable ? '/api/admin-users/firewall/enable' : '/api/admin-users/firewall/disable';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle firewall');
      fetchFirewallStatus();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchFirewallStatus]);

  const addFirewallRule = useCallback(async (ruleData) => {
    try {
      const res = await fetch('/api/admin-users/firewall/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchFirewallStatus();
      setShowAddFirewallRule(false);
      setNewFirewallRule({ action: 'allow', port: '', protocol: 'tcp', from: 'any', comment: '' });
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchFirewallStatus]);

  const deleteFirewallRule = useCallback(async (ruleNumber) => {
    try {
      const res = await fetch(`/api/admin-users/firewall/rules/${ruleNumber}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        // Check if it's a protected SSH rule
        if (data.protected) {
          setError('SSH rules cannot be deleted - SSH access is protected');
          return { success: false, error: data.error, protected: true };
        }
        throw new Error(data.error || 'Failed to delete rule');
      }
      fetchFirewallStatus();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchFirewallStatus]);

  const setFirewallDefault = useCallback(async (direction, policy) => {
    try {
      const res = await fetch('/api/admin-users/firewall/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, policy })
      });
      if (!res.ok) throw new Error('Failed to set default policy');
      fetchFirewallStatus();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [fetchFirewallStatus]);

  const fetchFirewallLogs = useCallback(async () => {
    try {
      setFirewallLogsLoading(true);
      const res = await fetch('/api/admin-users/firewall/logs');
      if (res.ok) {
        const data = await res.json();
        setFirewallLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching firewall logs:', err);
    } finally {
      setFirewallLogsLoading(false);
    }
  }, []);

  // Helper to check if a firewall rule is SSH (protected)
  const isSSHRule = (rule) => {
    const port = (rule.port || '').toString().toLowerCase();
    return port.includes('22') || port.includes('ssh') || port === 'openssh';
  };

  // Fetch project ports (from published routes and listening processes)
  const fetchProjectPorts = useCallback(async () => {
    try {
      setProjectPortsLoading(true);
      const res = await fetch('/api/admin-users/firewall/project-ports');
      if (res.ok) {
        const data = await res.json();
        setProjectPorts(data.ports || []);
      }
    } catch (err) {
      console.error('Error fetching project ports:', err);
    } finally {
      setProjectPortsLoading(false);
    }
  }, []);

  // Sync all project ports to firewall (SSH is ALWAYS ensured)
  const syncProjectPorts = useCallback(async () => {
    try {
      setSyncingPorts(true);
      const res = await fetch('/api/admin-users/firewall/sync-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Show success message with summary
      const { summary } = data;
      setSuccess(`Firewall synced! SSH: ${summary.sshStatus}, Added: ${summary.portsAdded} ports, Skipped: ${summary.portsSkipped} (already exist)`);

      // Refresh firewall status and project ports
      fetchFirewallStatus();
      fetchProjectPorts();

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSyncingPorts(false);
    }
  }, [fetchFirewallStatus, fetchProjectPorts]);

  // Fetch user settings on mount (for experimental features toggle and app name)
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setUserSettings(data);
          if (data.appName) {
            setAppName(data.appName);
          }
        }
      } catch (err) {
        console.error('Error fetching user settings:', err);
      }
    };
    fetchUserSettings();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === TABS.INFRASTRUCTURE) {
      // Fetch based on active infrastructure sub-tab
      if (infraSubTab === INFRA_TABS.DOCKER) {
        fetchDockerData();
        const interval = setInterval(fetchDockerData, 10000);
        return () => clearInterval(interval);
      }
      if (infraSubTab === INFRA_TABS.SERVICES) {
        fetchServerData();
        const interval = setInterval(fetchServerData, 5000);
        return () => clearInterval(interval);
      }
      if (infraSubTab === INFRA_TABS.STACK) {
        fetchStackData();
        const interval = setInterval(fetchStackData, 15000);
        return () => clearInterval(interval);
      }
      if (infraSubTab === INFRA_TABS.PACKAGES) {
        fetchPackages();
        fetchPackageUpdates();
      }
      if (infraSubTab === INFRA_TABS.LOGS) {
        fetchLogs(logFilter);
        fetchLogUnits();
      }
      if (infraSubTab === INFRA_TABS.PROCESSES) {
        fetchProcesses(processSort);
        // Refresh every 30 seconds instead of 5 to reduce CPU usage
        const interval = setInterval(() => fetchProcesses(processSort), 30000);
        return () => clearInterval(interval);
      }
      if (infraSubTab === INFRA_TABS.NETWORK) {
        fetchNetworkInterfaces();
      }
      if (infraSubTab === INFRA_TABS.SECURITY) {
        fetchSecurityData();
        const interval = setInterval(fetchSecurityData, 30000);
        return () => clearInterval(interval);
      }
      if (infraSubTab === INFRA_TABS.SCHEDULED) {
        fetchScheduledTasks();
      }
      if (infraSubTab === INFRA_TABS.AUTHENTIK) {
        fetchAuthentikSettings();
        fetchAuthentikStatus();
        fetchAuthentikUsers(authentikSearch);
        fetchAuthentikGroups();
      }
      if (infraSubTab === INFRA_TABS.USERS) {
        fetchServerUsers();
        fetchServerGroups();
        fetchServerShells();
      }
      if (infraSubTab === INFRA_TABS.FIREWALL) {
        fetchFirewallStatus();
        fetchFirewallLogs();
        fetchProjectPorts();
      }
    }
    if (activeTab === TABS.HISTORY) fetchHistory();
    if (activeTab === TABS.PROJECTS) fetchProjects();
    if (activeTab === TABS.MCP) fetchMcpConfig();
  }, [activeTab, infraSubTab, fetchSystemInfo, fetchDockerData, fetchServerData, fetchStackData, fetchHistory, fetchProjects, fetchMcpConfig, fetchPackages, fetchPackageUpdates, fetchLogs, fetchLogUnits, logFilter, fetchProcesses, processSort, fetchNetworkInterfaces, fetchSecurityData, fetchScheduledTasks, fetchAuthentikSettings, fetchAuthentikStatus, fetchAuthentikUsers, fetchAuthentikGroups, authentikSearch, fetchServerUsers, fetchServerGroups, fetchServerShells, fetchFirewallStatus, fetchFirewallLogs, fetchProjectPorts]);

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
            <pre className="ascii-art text-[6px] leading-[6px] select-none text-hacker-green">{HACKER_ASCII}</pre>
          </div>

          <div>
            <h1 className="text-xl font-bold font-display tracking-wider neon-text flex items-center gap-3 uppercase">
              <span className="text-2xl">{'>'}_</span>
              {appName}
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

      {/* Tabs - Main navigation */}
      <div className="relative z-10 flex items-center gap-1 px-6 border-b border-hacker-green/10 bg-hacker-surface/50 overflow-x-auto">
        {/* Core tabs */}
        <TabButton
          tab={TABS.PROJECTS}
          label="PROJECTS"
          icon={<span className="text-lg">&#128193;</span>}
        />
        <TabButton
          tab={TABS.INFRASTRUCTURE}
          label="SYSTEM"
          icon={<span className="text-lg">&#9211;</span>}
        />
        <TabButton
          tab={TABS.AGENTS}
          label="AGENTS"
          icon={<span className="text-lg">&#129302;</span>}
        />
        <TabButton
          tab={TABS.MCP}
          label="MCP"
          icon={<span className="text-lg">&#9881;</span>}
        />
        <TabButton
          tab={TABS.SECURITY}
          label="SECURITY"
          icon={<span className="text-lg">&#128274;</span>}
        />
        <TabButton
          tab={TABS.HISTORY}
          label="HISTORY"
          icon={<span className="text-lg">&#8986;</span>}
        />
        {/* Experimental tabs - only shown if enabled in settings */}
        {userSettings?.showExperimentalFeatures && (
          <>
            <span className="text-hacker-text-dim/30 mx-1">|</span>
            <TabButton
              tab={TABS.DEVELOPMENT}
              label="DEV"
              icon={<span className="text-lg">&#128295;</span>}
            />
            <TabButton
              tab={TABS.CODE_PUPPY}
              label="CODE PUPPY"
              icon={<span className="text-lg">&#128021;</span>}
            />
            <TabButton
              tab={TABS.TABBY}
              label="TABBY"
              icon={<span className="text-lg">&#128049;</span>}
            />
            <TabButton
              tab={TABS.SWARM}
              label="SWARM"
              icon={<span className="text-lg">&#129433;</span>}
            />
          </>
        )}
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

      {/* Success Banner */}
      {success && (
        <div className="relative z-10 mx-6 mt-4 p-3 neon-border bg-hacker-green/10 rounded-lg text-hacker-green text-sm flex items-center justify-between font-mono">
          <span>[SUCCESS] {success}</span>
          <button onClick={() => setSuccess(null)} className="hover:text-hacker-text">
            [X]
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        {/* Infrastructure Tab - System Management + Settings */}
        {activeTab === TABS.INFRASTRUCTURE && (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-tab Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-hacker-surface/50 rounded-lg p-1 border border-hacker-green/20">
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.SETTINGS)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.SETTINGS
                      ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/50'
                      : 'text-hacker-text-dim hover:text-hacker-green/70'
                  }`}
                >
                  SETTINGS
                </button>
                <span className="text-hacker-text-dim/30 mx-1">|</span>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.SERVICES)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.SERVICES
                      ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/50'
                      : 'text-hacker-text-dim hover:text-hacker-green/70'
                  }`}
                >
                  SERVICES
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.DOCKER)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.DOCKER
                      ? 'bg-hacker-cyan/20 text-hacker-cyan border border-hacker-cyan/50'
                      : 'text-hacker-text-dim hover:text-hacker-cyan/70'
                  }`}
                >
                  DOCKER
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.STACK)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.STACK
                      ? 'bg-hacker-purple/20 text-hacker-purple border border-hacker-purple/50'
                      : 'text-hacker-text-dim hover:text-hacker-purple/70'
                  }`}
                >
                  STACK
                </button>
                <span className="text-hacker-text-dim/30 mx-1">|</span>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.PACKAGES)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1 ${
                    infraSubTab === INFRA_TABS.PACKAGES
                      ? 'bg-hacker-warning/20 text-hacker-warning border border-hacker-warning/50'
                      : 'text-hacker-text-dim hover:text-hacker-warning/70'
                  }`}
                >
                  PACKAGES
                  {packageUpdates.count > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-hacker-error rounded-full">{packageUpdates.count}</span>
                  )}
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.LOGS)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.LOGS
                      ? 'bg-hacker-blue/20 text-hacker-blue border border-hacker-blue/50'
                      : 'text-hacker-text-dim hover:text-hacker-blue/70'
                  }`}
                >
                  LOGS
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.PROCESSES)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.PROCESSES
                      ? 'bg-hacker-cyan/20 text-hacker-cyan border border-hacker-cyan/50'
                      : 'text-hacker-text-dim hover:text-hacker-cyan/70'
                  }`}
                >
                  PROCESSES
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.NETWORK)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.NETWORK
                      ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/50'
                      : 'text-hacker-text-dim hover:text-hacker-green/70'
                  }`}
                >
                  NETWORK
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.SECURITY)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.SECURITY
                      ? 'bg-hacker-error/20 text-hacker-error border border-hacker-error/50'
                      : 'text-hacker-text-dim hover:text-hacker-error/70'
                  }`}
                  title="Fail2ban & System Security"
                >
                  FAIL2BAN
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.SCHEDULED)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.SCHEDULED
                      ? 'bg-hacker-purple/20 text-hacker-purple border border-hacker-purple/50'
                      : 'text-hacker-text-dim hover:text-hacker-purple/70'
                  }`}
                >
                  SCHEDULED
                </button>
                <span className="text-hacker-text-dim/30">|</span>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.AUTHENTIK)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.AUTHENTIK
                      ? 'bg-hacker-warning/20 text-hacker-warning border border-hacker-warning/50'
                      : 'text-hacker-text-dim hover:text-hacker-warning/70'
                  }`}
                >
                  AUTHENTIK
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.USERS)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.USERS
                      ? 'bg-hacker-cyan/20 text-hacker-cyan border border-hacker-cyan/50'
                      : 'text-hacker-text-dim hover:text-hacker-cyan/70'
                  }`}
                >
                  USERS
                </button>
                <button
                  onClick={() => setInfraSubTab(INFRA_TABS.FIREWALL)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    infraSubTab === INFRA_TABS.FIREWALL
                      ? 'bg-hacker-error/20 text-hacker-error border border-hacker-error/50'
                      : 'text-hacker-text-dim hover:text-hacker-error/70'
                  }`}
                >
                  FIREWALL
                </button>
              </div>
              <button
                onClick={() => {
                  if (infraSubTab === INFRA_TABS.SERVICES) fetchServerData();
                  else if (infraSubTab === INFRA_TABS.DOCKER) fetchDockerData();
                  else if (infraSubTab === INFRA_TABS.STACK) fetchStackData();
                  else if (infraSubTab === INFRA_TABS.PACKAGES) { fetchPackages(); fetchPackageUpdates(); }
                  else if (infraSubTab === INFRA_TABS.LOGS) fetchLogs(logFilter);
                  else if (infraSubTab === INFRA_TABS.PROCESSES) fetchProcesses(processSort);
                  else if (infraSubTab === INFRA_TABS.NETWORK) fetchNetworkInterfaces();
                  else if (infraSubTab === INFRA_TABS.SECURITY) fetchSecurityData();
                  else if (infraSubTab === INFRA_TABS.SCHEDULED) fetchScheduledTasks();
                  else if (infraSubTab === INFRA_TABS.AUTHENTIK) { fetchAuthentikSettings(); fetchAuthentikStatus(); fetchAuthentikUsers(authentikSearch); fetchAuthentikGroups(); }
                  else if (infraSubTab === INFRA_TABS.USERS) { fetchServerUsers(); fetchServerGroups(); }
                  else if (infraSubTab === INFRA_TABS.FIREWALL) { fetchFirewallStatus(); fetchFirewallLogs(); fetchProjectPorts(); }
                }}
                disabled={loading}
                className="hacker-btn text-xs"
              >
                {loading ? '[LOADING...]' : '[REFRESH]'}
              </button>
            </div>

            {/* Services Sub-Tab Content */}
            {infraSubTab === INFRA_TABS.SERVICES && (
              <div className="space-y-6">

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

            {/* Docker Sub-Tab Content */}
            {infraSubTab === INFRA_TABS.DOCKER && (
              <div className="space-y-6">

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

            {/* Stack Sub-Tab Content */}
            {infraSubTab === INFRA_TABS.STACK && (
              <div className="space-y-6">

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

            {/* PACKAGES Sub-tab */}
            {infraSubTab === INFRA_TABS.PACKAGES && (
              <div className="space-y-6">
                {/* Package Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="hacker-card text-center">
                    <div className="stat-value">{packages.total || packages.packages?.length || 0}</div>
                    <div className="stat-label">INSTALLED</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value" style={{color: packageUpdates.count > 0 ? '#ffb000' : '#00ff41'}}>
                      {packageUpdates.count || 0}
                    </div>
                    <div className="stat-label">UPDATES</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-cyan">{packageSearchResults.length}</div>
                    <div className="stat-label">SEARCH RESULTS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <button
                      onClick={upgradeAllPackages}
                      disabled={loading || packageUpdates.count === 0}
                      className="hacker-btn text-xs w-full h-full flex items-center justify-center gap-2"
                    >
                      {loading ? 'UPGRADING...' : 'UPGRADE ALL'}
                    </button>
                  </div>
                </div>

                {/* Package Search & Install */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                    SEARCH & INSTALL PACKAGES
                  </h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Search packages (e.g., nginx, vim, htop)..."
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchAvailablePackages(packageSearch)}
                      className="input-glass font-mono flex-1"
                    />
                    <button
                      onClick={() => searchAvailablePackages(packageSearch)}
                      disabled={loading || !packageSearch.trim()}
                      className="hacker-btn px-4"
                    >
                      {loading ? 'SEARCHING...' : 'SEARCH'}
                    </button>
                  </div>

                  {/* Search Results */}
                  {packageSearchResults.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                      {packageSearchResults.map(pkg => (
                        <div key={pkg.package} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono text-hacker-cyan">{pkg.package}</span>
                            <span className="text-xs text-hacker-text-dim ml-2">{pkg.version}</span>
                            {pkg.description && (
                              <p className="text-xs text-hacker-text-dim truncate">{pkg.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => installPackage(pkg.package)}
                            disabled={loading}
                            className="hacker-btn text-xs ml-2 border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10"
                          >
                            INSTALL
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Updates */}
                {packageUpdates.count > 0 && (
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
                      AVAILABLE UPDATES ({packageUpdates.count})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(packageUpdates.updates || []).map(pkg => (
                        <div key={pkg.package} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-warning/30">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-mono text-hacker-warning">{pkg.package}</span>
                            <div className="text-xs text-hacker-text-dim">
                              {pkg.current} → <span className="text-hacker-green">{pkg.available}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => installPackage(pkg.package)}
                            disabled={loading}
                            className="hacker-btn text-xs border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/10"
                          >
                            UPDATE
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Installed Packages */}
                <div className="hacker-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-hacker-green uppercase tracking-wider">
                      INSTALLED PACKAGES ({packages.total || packages.packages?.length || 0})
                    </h4>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={packageFilter}
                      onChange={(e) => setPackageFilter(e.target.value)}
                      className="input-glass text-xs w-40 !py-1"
                    />
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                    {(packages.packages || [])
                      .filter(pkg => !packageFilter || pkg.name?.toLowerCase().includes(packageFilter.toLowerCase()))
                      .slice(0, 100)
                      .map(pkg => (
                        <div key={pkg.name} className="flex items-center justify-between p-2 hover:bg-hacker-surface rounded group">
                          <div className="flex-1 min-w-0">
                            <span className="text-hacker-text">{pkg.name}</span>
                            <span className="text-hacker-text-dim ml-2">{pkg.version}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Remove package ${pkg.name}?`)) removePackage(pkg.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-hacker-error hover:text-hacker-error/80 transition-opacity"
                            title="Remove package"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    {(packages.packages?.length || 0) > 100 && (
                      <p className="text-hacker-text-dim text-center py-2">
                        Showing 100 of {packages.packages?.length || 0} packages. Use filter to find more.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LOGS Sub-tab */}
            {infraSubTab === INFRA_TABS.LOGS && (
              <div className="space-y-4">
                {/* Log Controls */}
                <div className="hacker-card">
                  <div className="flex flex-wrap gap-3 items-center">
                    <select
                      value={logFilter.unit}
                      onChange={(e) => setLogFilter(f => ({ ...f, unit: e.target.value }))}
                      className="select-glass"
                    >
                      <option value="">All Units</option>
                      {logUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <select
                      value={logFilter.priority}
                      onChange={(e) => setLogFilter(f => ({ ...f, priority: e.target.value }))}
                      className="select-glass"
                    >
                      <option value="">All Priorities</option>
                      <option value="0">Emergency</option>
                      <option value="1">Alert</option>
                      <option value="2">Critical</option>
                      <option value="3">Error</option>
                      <option value="4">Warning</option>
                      <option value="5">Notice</option>
                      <option value="6">Info</option>
                      <option value="7">Debug</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={logFilter.search}
                      onChange={(e) => setLogFilter(f => ({ ...f, search: e.target.value }))}
                      className="input-glass font-mono flex-1 min-w-[200px]"
                    />
                    <input
                      type="number"
                      value={logFilter.lines}
                      onChange={(e) => setLogFilter(f => ({ ...f, lines: parseInt(e.target.value) || 100 }))}
                      min="10"
                      max="1000"
                      className="input-glass font-mono w-20"
                      title="Number of lines"
                    />
                    <button
                      onClick={() => fetchLogs(logFilter)}
                      disabled={loading}
                      className="hacker-btn"
                    >
                      {loading ? 'LOADING...' : 'FETCH'}
                    </button>
                  </div>
                </div>

                {/* Disk Usage for Logs */}
                {logDiskUsage && (
                  <div className="hacker-card p-3">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-hacker-text-dim">Journal Disk Usage:</span>
                      <span className="text-hacker-cyan">{logDiskUsage}</span>
                    </div>
                  </div>
                )}

                {/* Log Output */}
                <div className="hacker-card p-0 overflow-hidden">
                  <div className="bg-black p-4 font-mono text-xs overflow-x-auto max-h-[600px] overflow-y-auto">
                    {logs.length === 0 ? (
                      <p className="text-hacker-text-dim">No logs to display. Click FETCH to load logs.</p>
                    ) : (
                      logs.map((log, idx) => {
                        const priorityColors = {
                          '0': 'text-red-500 font-bold', // Emergency
                          '1': 'text-red-400 font-bold', // Alert
                          '2': 'text-red-400',           // Critical
                          '3': 'text-hacker-error',      // Error
                          '4': 'text-hacker-warning',    // Warning
                          '5': 'text-hacker-cyan',       // Notice
                          '6': 'text-hacker-text',       // Info
                          '7': 'text-hacker-text-dim',   // Debug
                        };
                        const colorClass = priorityColors[log.priority] || 'text-hacker-text';
                        return (
                          <div key={idx} className={`${colorClass} hover:bg-white/5 py-0.5`}>
                            <span className="text-hacker-text-dim">{log.timestamp}</span>
                            <span className="text-hacker-purple ml-2">[{log.unit}]</span>
                            <span className="ml-2">{log.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PROCESSES Sub-tab */}
            {infraSubTab === INFRA_TABS.PROCESSES && (
              <div className="space-y-4">
                {/* Process Controls */}
                <div className="hacker-card">
                  <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-hacker-text-dim font-mono">SORT BY:</span>
                      {['cpu', 'memory', 'pid', 'name'].map(sort => (
                        <button
                          key={sort}
                          onClick={() => setProcessSort(sort)}
                          className={`hacker-btn text-xs ${processSort === sort ? 'bg-hacker-green/20 border-hacker-green' : ''}`}
                        >
                          {sort.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Filter processes..."
                        value={processFilter}
                        onChange={(e) => setProcessFilter(e.target.value)}
                        className="input-glass text-xs w-48 !py-1.5"
                      />
                      <span className="text-xs text-hacker-text-dim font-mono">
                        {processes.length} processes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Process Table */}
                <div className="hacker-card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-hacker-surface border-b border-hacker-border">
                        <tr>
                          <th className="text-left p-3 text-hacker-text-dim">PID</th>
                          <th className="text-left p-3 text-hacker-text-dim">USER</th>
                          <th className="text-left p-3 text-hacker-text-dim">CPU%</th>
                          <th className="text-left p-3 text-hacker-text-dim">MEM%</th>
                          <th className="text-left p-3 text-hacker-text-dim">VSZ</th>
                          <th className="text-left p-3 text-hacker-text-dim">RSS</th>
                          <th className="text-left p-3 text-hacker-text-dim">STAT</th>
                          <th className="text-left p-3 text-hacker-text-dim">TIME</th>
                          <th className="text-left p-3 text-hacker-text-dim">COMMAND</th>
                          <th className="text-center p-3 text-hacker-text-dim">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processes
                          .filter(p => !processFilter ||
                            p.command?.toLowerCase().includes(processFilter.toLowerCase()) ||
                            p.user?.toLowerCase().includes(processFilter.toLowerCase()) ||
                            p.pid?.toString().includes(processFilter)
                          )
                          .slice(0, 50)
                          .map(proc => {
                            const cpuHigh = parseFloat(proc.cpu) > 50;
                            const memHigh = parseFloat(proc.memory) > 50;
                            return (
                              <tr key={proc.pid} className="border-b border-hacker-border/50 hover:bg-hacker-surface/50">
                                <td className="p-2 text-hacker-cyan">{proc.pid}</td>
                                <td className="p-2 text-hacker-purple">{proc.user}</td>
                                <td className={`p-2 ${cpuHigh ? 'text-hacker-error font-bold' : 'text-hacker-text'}`}>
                                  {proc.cpu}%
                                </td>
                                <td className={`p-2 ${memHigh ? 'text-hacker-warning font-bold' : 'text-hacker-text'}`}>
                                  {proc.memory}%
                                </td>
                                <td className="p-2 text-hacker-text-dim">{proc.vsz}</td>
                                <td className="p-2 text-hacker-text-dim">{proc.rss}</td>
                                <td className="p-2 text-hacker-text">{proc.stat}</td>
                                <td className="p-2 text-hacker-text-dim">{proc.time}</td>
                                <td className="p-2 text-hacker-text max-w-xs truncate" title={proc.command}>
                                  {proc.command}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => {
                                      if (confirm(`Kill process ${proc.pid} (${proc.command?.substring(0, 30)}...)?`)) {
                                        killProcess(proc.pid);
                                      }
                                    }}
                                    className="text-hacker-error hover:text-hacker-error/80"
                                    title="Kill process"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {processes.length > 50 && (
                    <p className="text-xs text-hacker-text-dim text-center py-2 border-t border-hacker-border">
                      Showing top 50 of {processes.length} processes
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* NETWORK Sub-tab */}
            {infraSubTab === INFRA_TABS.NETWORK && (
              <div className="space-y-6">
                {/* Network Interfaces */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider">
                    NETWORK INTERFACES
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {networkInterfaces.map(iface => (
                      <div key={iface.name} className="p-3 bg-hacker-surface rounded border border-hacker-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-hacker-cyan">{iface.name}</span>
                          <span className={`text-xs ${iface.state === 'UP' ? 'text-hacker-green' : 'text-hacker-text-dim'}`}>
                            {iface.state}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          {iface.ipv4 && <div><span className="text-hacker-text-dim">IPv4:</span> <span className="text-hacker-text">{iface.ipv4}</span></div>}
                          {iface.ipv6 && <div><span className="text-hacker-text-dim">IPv6:</span> <span className="text-hacker-text">{iface.ipv6}</span></div>}
                          {iface.mac && <div><span className="text-hacker-text-dim">MAC:</span> <span className="text-hacker-text">{iface.mac}</span></div>}
                          {iface.mtu && <div><span className="text-hacker-text-dim">MTU:</span> <span className="text-hacker-text">{iface.mtu}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Network Diagnostics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ping Tool */}
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                      PING TEST
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Host or IP..."
                        value={pingHostInput}
                        onChange={(e) => setPingHostInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && pingHost(pingHostInput)}
                        className="input-glass font-mono flex-1"
                      />
                      <button
                        onClick={() => pingHost(pingHostInput)}
                        disabled={loading || !pingHostInput.trim()}
                        className="hacker-btn"
                      >
                        PING
                      </button>
                    </div>
                    {pingResult && (
                      <div className="bg-black p-3 rounded font-mono text-xs max-h-40 overflow-y-auto">
                        <pre className="text-hacker-text whitespace-pre-wrap">{pingResult}</pre>
                      </div>
                    )}
                  </div>

                  {/* DNS Lookup */}
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                      DNS LOOKUP
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Domain name..."
                        value={dnsHostInput}
                        onChange={(e) => setDnsHostInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && dnsLookup(dnsHostInput)}
                        className="input-glass font-mono flex-1"
                      />
                      <button
                        onClick={() => dnsLookup(dnsHostInput)}
                        disabled={loading || !dnsHostInput.trim()}
                        className="hacker-btn"
                      >
                        LOOKUP
                      </button>
                    </div>
                    {dnsResult && (
                      <div className="bg-black p-3 rounded font-mono text-xs max-h-40 overflow-y-auto">
                        <pre className="text-hacker-text whitespace-pre-wrap">{dnsResult}</pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Connections */}
                {networkConnections.length > 0 && (
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
                      ACTIVE CONNECTIONS ({networkConnections.length})
                    </h4>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-xs font-mono">
                        <thead className="bg-hacker-surface sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-hacker-text-dim">PROTO</th>
                            <th className="text-left p-2 text-hacker-text-dim">LOCAL</th>
                            <th className="text-left p-2 text-hacker-text-dim">REMOTE</th>
                            <th className="text-left p-2 text-hacker-text-dim">STATE</th>
                            <th className="text-left p-2 text-hacker-text-dim">PID/PROGRAM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {networkConnections.slice(0, 50).map((conn, idx) => (
                            <tr key={idx} className="border-b border-hacker-border/30 hover:bg-hacker-surface/50">
                              <td className="p-2 text-hacker-purple">{conn.proto}</td>
                              <td className="p-2 text-hacker-text">{conn.local}</td>
                              <td className="p-2 text-hacker-text">{conn.remote}</td>
                              <td className={`p-2 ${conn.state === 'ESTABLISHED' ? 'text-hacker-green' : 'text-hacker-text-dim'}`}>
                                {conn.state}
                              </td>
                              <td className="p-2 text-hacker-cyan">{conn.program}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECURITY Sub-tab */}
            {infraSubTab === INFRA_TABS.SECURITY && (
              <div className="space-y-6">
                {/* Security Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-cyan">{sshSessions.length}</div>
                    <div className="stat-label">SSH SESSIONS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value" style={{color: sshFailedAttempts.length > 10 ? '#ff3333' : '#ffb000'}}>
                      {sshFailedAttempts.length}
                    </div>
                    <div className="stat-label">FAILED LOGINS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-purple">{openPorts.length}</div>
                    <div className="stat-label">OPEN PORTS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value" style={{color: fail2banStatus?.banned > 0 ? '#ff3333' : '#00ff41'}}>
                      {fail2banStatus?.banned || 0}
                    </div>
                    <div className="stat-label">BANNED IPs</div>
                  </div>
                </div>

                {/* SSH Sessions */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider">
                    ACTIVE SSH SESSIONS
                  </h4>
                  {sshSessions.length === 0 ? (
                    <p className="text-xs text-hacker-text-dim font-mono">No active SSH sessions</p>
                  ) : (
                    <div className="space-y-2">
                      {sshSessions.map((session, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border">
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-hacker-cyan">{session.user}</span>
                            <span className="text-hacker-text">{session.from}</span>
                            <span className="text-hacker-text-dim">{session.tty}</span>
                            <span className="text-hacker-text-dim">{session.login}</span>
                          </div>
                          <span className="text-xs text-hacker-green">{session.idle || 'active'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Failed Logins */}
                {sshFailedAttempts.length > 0 && (
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-error mb-4 uppercase tracking-wider">
                      FAILED LOGIN ATTEMPTS ({sshFailedAttempts.length})
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
                      {sshFailedAttempts.slice(0, 50).map((login, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-1.5 hover:bg-hacker-surface rounded">
                          <span className="text-hacker-text-dim w-32">{login.timestamp}</span>
                          <span className="text-hacker-warning">{login.user}</span>
                          <span className="text-hacker-error">{login.ip}</span>
                          <span className="text-hacker-text-dim flex-1 truncate">{login.method}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fail2Ban Status */}
                {fail2banStatus && (
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                      FAIL2BAN STATUS
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-hacker-text-dim mb-2">Active Jails:</p>
                        <div className="flex flex-wrap gap-2">
                          {fail2banStatus.jails?.map(jail => (
                            <span key={jail} className="hacker-badge hacker-badge-purple text-xs">{jail}</span>
                          ))}
                        </div>
                      </div>
                      {fail2banStatus.bannedIPs?.length > 0 && (
                        <div>
                          <p className="text-xs text-hacker-text-dim mb-2">Banned IPs:</p>
                          <div className="space-y-1">
                            {fail2banStatus.bannedIPs.map((banned, idx) => {
                              const ip = typeof banned === 'string' ? banned : banned.ip;
                              const jail = typeof banned === 'string' ? 'sshd' : (banned.jail || 'sshd');
                              return (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-xs font-mono text-hacker-error">{ip}</span>
                                  <button
                                    onClick={() => unbanIP(jail, ip)}
                                    className="text-xs text-hacker-cyan hover:underline"
                                  >
                                    UNBAN
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Open Ports */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
                    LISTENING PORTS ({openPorts.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {openPorts.map((port, idx) => (
                      <div key={idx} className="p-2 bg-hacker-surface rounded border border-hacker-border text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-hacker-cyan font-bold">{port.port}</span>
                          <span className="text-hacker-text-dim">{port.proto}</span>
                        </div>
                        <div className="text-hacker-text truncate" title={port.program}>
                          {port.program}
                        </div>
                        <div className="text-hacker-text-dim text-[10px]">{port.address}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULED Sub-tab */}
            {infraSubTab === INFRA_TABS.SCHEDULED && (
              <div className="space-y-6">
                {/* Scheduled Tasks Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-cyan">{cronJobs.length}</div>
                    <div className="stat-label">CRON JOBS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-purple">{systemdTimers.length}</div>
                    <div className="stat-label">SYSTEMD TIMERS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-green">
                      {systemdTimers.filter(t => t.active).length}
                    </div>
                    <div className="stat-label">ACTIVE TIMERS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-warning">
                      {cronJobs.length + systemdTimers.length}
                    </div>
                    <div className="stat-label">TOTAL TASKS</div>
                  </div>
                </div>

                {/* Cron Jobs */}
                <div className="hacker-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
                      CRON JOBS
                    </h4>
                    <button
                      onClick={() => setShowAddCron(!showAddCron)}
                      className="hacker-btn text-xs"
                    >
                      {showAddCron ? 'CANCEL' : '+ ADD CRON'}
                    </button>
                  </div>

                  {/* Add Cron Form */}
                  {showAddCron && (
                    <div className="mb-4 p-3 bg-hacker-surface rounded border border-hacker-cyan/30">
                      <div className="grid grid-cols-6 gap-2 mb-3">
                        <input type="text" placeholder="min" value={newCron.minute} onChange={e => setNewCron(c => ({...c, minute: e.target.value}))} className="input-glass text-xs !py-1" />
                        <input type="text" placeholder="hour" value={newCron.hour} onChange={e => setNewCron(c => ({...c, hour: e.target.value}))} className="input-glass text-xs !py-1" />
                        <input type="text" placeholder="dom" value={newCron.dom} onChange={e => setNewCron(c => ({...c, dom: e.target.value}))} className="input-glass text-xs !py-1" />
                        <input type="text" placeholder="mon" value={newCron.month} onChange={e => setNewCron(c => ({...c, month: e.target.value}))} className="input-glass text-xs !py-1" />
                        <input type="text" placeholder="dow" value={newCron.dow} onChange={e => setNewCron(c => ({...c, dow: e.target.value}))} className="input-glass text-xs !py-1" />
                        <button onClick={() => {
                          const schedule = `${newCron.minute} ${newCron.hour} ${newCron.dom} ${newCron.month} ${newCron.dow}`;
                          addCronJob(schedule, newCron.command);
                          setNewCron({ minute: '*', hour: '*', dom: '*', month: '*', dow: '*', command: '' });
                          setShowAddCron(false);
                        }} disabled={loading || !newCron.command.trim()} className="hacker-btn text-xs border-hacker-green/30 text-hacker-green">ADD</button>
                      </div>
                      <input
                        type="text"
                        placeholder="Command to run..."
                        value={newCron.command}
                        onChange={e => setNewCron(c => ({...c, command: e.target.value}))}
                        className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-xs text-hacker-text focus:border-hacker-cyan outline-none font-mono"
                      />
                      <p className="text-[10px] text-hacker-text-dim mt-2">Format: minute hour day-of-month month day-of-week (use * for any)</p>
                    </div>
                  )}

                  {cronJobs.length === 0 ? (
                    <p className="text-xs text-hacker-text-dim font-mono">No cron jobs configured for current user</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cronJobs.map((job, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border group">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono">
                              <span className="text-hacker-purple">{job.schedule}</span>
                              <span className="text-hacker-text ml-2">{job.command}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm('Delete this cron job?')) deleteCronJob(idx);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-hacker-error hover:text-hacker-error/80 ml-2 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Systemd Timers */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                    SYSTEMD TIMERS
                  </h4>
                  {systemdTimers.length === 0 ? (
                    <p className="text-xs text-hacker-text-dim font-mono">No systemd timers found</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {systemdTimers.map((timer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-hacker-surface rounded border border-hacker-border">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${timer.active ? 'bg-hacker-green' : 'bg-hacker-text-dim'}`} />
                              <span className="text-sm font-mono text-hacker-cyan">{timer.name}</span>
                            </div>
                            <div className="text-xs text-hacker-text-dim font-mono">
                              Next: {timer.next || 'N/A'} | Last: {timer.last || 'N/A'}
                            </div>
                            {timer.description && (
                              <div className="text-xs text-hacker-text-dim mt-1 truncate">{timer.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleTimer(timer.name, timer.active)}
                            className={`hacker-btn text-xs ml-2 ${
                              timer.active
                                ? 'border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10'
                                : 'border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10'
                            }`}
                          >
                            {timer.active ? 'STOP' : 'START'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AUTHENTIK Sub-tab */}
            {infraSubTab === INFRA_TABS.AUTHENTIK && (
              <div className="space-y-6">
                {/* API Token Configuration */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                    API TOKEN CONFIGURATION
                  </h4>
                  <div className="space-y-4">
                    {authentikSettings?.hasToken ? (
                      <div className="flex items-center justify-between p-3 bg-hacker-green/10 border border-hacker-green/30 rounded">
                        <div>
                          <span className="text-hacker-green font-mono text-sm">Token configured: </span>
                          <code className="text-hacker-text-dim">{authentikSettings.tokenPreview}</code>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Remove current token?')) {
                              saveAuthentikToken('');
                            }
                          }}
                          className="text-xs text-hacker-error hover:text-hacker-error/70"
                        >
                          REMOVE
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-hacker-warning/10 border border-hacker-warning/30 rounded">
                        <p className="text-sm text-hacker-warning font-mono mb-3">
                          Enter your Authentik API token to enable user management.
                        </p>
                        <p className="text-xs text-hacker-text-dim mb-3">
                          Create a token in Authentik: Admin &gt; System &gt; Tokens and App Passwords &gt; Create
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter Authentik API Token..."
                        value={authentikTokenInput}
                        onChange={e => setAuthentikTokenInput(e.target.value)}
                        className="flex-1 bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-purple outline-none font-mono"
                      />
                      <button
                        onClick={() => saveAuthentikToken(authentikTokenInput)}
                        disabled={!authentikTokenInput || authentikSaving}
                        className="hacker-btn text-xs border-hacker-purple/30 text-hacker-purple disabled:opacity-50"
                      >
                        {authentikSaving ? 'SAVING...' : 'SAVE TOKEN'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connection Status */}
                <div className="hacker-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider">
                      CONNECTION STATUS
                    </h4>
                    <div className={`px-3 py-1 rounded text-xs font-bold ${authentikStatus?.connected ? 'bg-hacker-green/20 text-hacker-green' : 'bg-hacker-error/20 text-hacker-error'}`}>
                      {authentikStatus?.connected ? 'CONNECTED' : 'DISCONNECTED'}
                    </div>
                  </div>
                  {authentikStatus?.connected && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                        <div className="text-2xl font-bold text-hacker-cyan">{authentikUsers.pagination?.count || 0}</div>
                        <div className="text-xs text-hacker-text-dim">Users</div>
                      </div>
                      <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                        <div className="text-2xl font-bold text-hacker-purple">{authentikGroups.length}</div>
                        <div className="text-xs text-hacker-text-dim">Groups</div>
                      </div>
                      <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                        <div className="text-sm font-mono text-hacker-warning truncate">{authentikStatus.url}</div>
                        <div className="text-xs text-hacker-text-dim">Server</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Management */}
                {authentikStatus?.connected && (
                  <div className="hacker-card">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider">
                        AUTHENTIK USERS
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={authentikSearch}
                          onChange={e => setAuthentikSearch(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && fetchAuthentikUsers(authentikSearch)}
                          className="bg-black border border-hacker-border rounded px-3 py-1.5 text-xs text-hacker-text focus:border-hacker-warning outline-none font-mono w-40"
                        />
                        <button
                          onClick={() => fetchAuthentikUsers(authentikSearch)}
                          className="hacker-btn text-xs"
                        >
                          SEARCH
                        </button>
                        <button
                          onClick={() => setShowAddAuthentikUser(true)}
                          className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
                        >
                          + ADD USER
                        </button>
                      </div>
                    </div>

                    {/* Add User Modal */}
                    {showAddAuthentikUser && (
                      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-hacker-bg border border-hacker-warning/50 rounded-lg p-6 w-full max-w-md">
                          <h3 className="text-lg font-bold text-hacker-warning mb-4">Create Authentik User</h3>
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Username"
                              value={newAuthentikUser.username}
                              onChange={e => setNewAuthentikUser(u => ({...u, username: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-warning outline-none font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={newAuthentikUser.name}
                              onChange={e => setNewAuthentikUser(u => ({...u, name: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-warning outline-none font-mono"
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={newAuthentikUser.email}
                              onChange={e => setNewAuthentikUser(u => ({...u, email: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-warning outline-none font-mono"
                            />
                            <input
                              type="password"
                              placeholder="Password (min 8 chars)"
                              value={newAuthentikUser.password}
                              onChange={e => setNewAuthentikUser(u => ({...u, password: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-warning outline-none font-mono"
                            />
                            <div className="flex justify-end gap-2 mt-4">
                              <button onClick={() => setShowAddAuthentikUser(false)} className="hacker-btn text-xs">Cancel</button>
                              <button
                                onClick={() => createAuthentikUser(newAuthentikUser)}
                                disabled={!newAuthentikUser.username || newAuthentikUser.password.length < 8}
                                className="hacker-btn text-xs border-hacker-green/30 text-hacker-green disabled:opacity-50"
                              >
                                Create User
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Users Table */}
                    {authentikLoading ? (
                      <div className="text-center py-8 text-hacker-text-dim animate-pulse">Loading users...</div>
                    ) : authentikUsers.users.length === 0 ? (
                      <p className="text-xs text-hacker-text-dim font-mono">No users found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-left text-hacker-text-dim border-b border-hacker-border">
                              <th className="pb-2 pr-4">USERNAME</th>
                              <th className="pb-2 pr-4">NAME</th>
                              <th className="pb-2 pr-4">EMAIL</th>
                              <th className="pb-2 pr-4">STATUS</th>
                              <th className="pb-2 pr-4">GROUPS</th>
                              <th className="pb-2 pr-4">LAST LOGIN</th>
                              <th className="pb-2 text-right">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {authentikUsers.users.map(user => (
                              <tr key={user.pk} className="border-b border-hacker-border/30 hover:bg-hacker-surface/50">
                                <td className="py-2 pr-4 text-hacker-cyan">{user.username}</td>
                                <td className="py-2 pr-4 text-hacker-text">{user.name}</td>
                                <td className="py-2 pr-4 text-hacker-text-dim">{user.email || '-'}</td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${user.isActive ? 'bg-hacker-green/20 text-hacker-green' : 'bg-hacker-error/20 text-hacker-error'}`}>
                                    {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                  {user.isSuperuser && (
                                    <span className="ml-1 px-2 py-0.5 rounded text-[10px] bg-hacker-purple/20 text-hacker-purple">ADMIN</span>
                                  )}
                                </td>
                                <td className="py-2 pr-4 text-hacker-text-dim">{user.groups?.join(', ') || '-'}</td>
                                <td className="py-2 pr-4 text-hacker-text-dim">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={() => toggleAuthentikUserActive(user.pk, !user.isActive)}
                                    className={`text-xs mr-2 ${user.isActive ? 'text-hacker-error hover:text-hacker-error/70' : 'text-hacker-green hover:text-hacker-green/70'}`}
                                  >
                                    {user.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete user ${user.username}?`)) deleteAuthentikUser(user.pk);
                                    }}
                                    className="text-xs text-hacker-error hover:text-hacker-error/70"
                                  >
                                    DELETE
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* USERS Sub-tab (Server Users) */}
            {infraSubTab === INFRA_TABS.USERS && (
              <div className="space-y-6">
                {/* Server Users Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-cyan">{serverUsers.length}</div>
                    <div className="stat-label">USERS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-purple">{serverGroups.length}</div>
                    <div className="stat-label">GROUPS</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-green">
                      {serverUsers.filter(u => u.shell !== '/usr/sbin/nologin' && u.shell !== '/bin/false').length}
                    </div>
                    <div className="stat-label">LOGIN ENABLED</div>
                  </div>
                  <div className="hacker-card text-center">
                    <div className="stat-value text-hacker-warning">
                      {serverUsers.filter(u => u.groups?.includes('sudo') || u.groups?.includes('wheel')).length}
                    </div>
                    <div className="stat-label">SUDOERS</div>
                  </div>
                </div>

                {/* Server Users List */}
                <div className="hacker-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
                      SERVER USERS
                    </h4>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-hacker-text-dim cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSystemUsers}
                          onChange={e => setShowSystemUsers(e.target.checked)}
                          className="rounded border-hacker-border bg-black text-hacker-cyan focus:ring-hacker-cyan"
                        />
                        Show System Users
                      </label>
                      <button
                        onClick={() => setShowAddServerUser(true)}
                        className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
                      >
                        + ADD USER
                      </button>
                    </div>
                  </div>

                  {/* Add Server User Modal */}
                  {showAddServerUser && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                      <div className="bg-hacker-bg border border-hacker-cyan/50 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-hacker-cyan mb-4">Create Server User</h3>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Username (lowercase, no spaces)"
                            value={newServerUser.username}
                            onChange={e => setNewServerUser(u => ({...u, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')}))}
                            className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-cyan outline-none font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newServerUser.fullName}
                            onChange={e => setNewServerUser(u => ({...u, fullName: e.target.value}))}
                            className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-cyan outline-none font-mono"
                          />
                          <select
                            value={newServerUser.shell}
                            onChange={e => setNewServerUser(u => ({...u, shell: e.target.value}))}
                            className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-cyan outline-none font-mono"
                          >
                            {serverShells.map(shell => (
                              <option key={shell} value={shell}>{shell}</option>
                            ))}
                          </select>
                          <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowAddServerUser(false)} className="hacker-btn text-xs">Cancel</button>
                            <button
                              onClick={() => createServerUser(newServerUser)}
                              disabled={!newServerUser.username}
                              className="hacker-btn text-xs border-hacker-green/30 text-hacker-green disabled:opacity-50"
                            >
                              Create User
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users Table */}
                  {serverUsersLoading ? (
                    <div className="text-center py-8 text-hacker-text-dim animate-pulse">Loading users...</div>
                  ) : serverUsers.length === 0 ? (
                    <p className="text-xs text-hacker-text-dim font-mono">No users found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="text-left text-hacker-text-dim border-b border-hacker-border">
                            <th className="pb-2 pr-4">USERNAME</th>
                            <th className="pb-2 pr-4">UID</th>
                            <th className="pb-2 pr-4">NAME</th>
                            <th className="pb-2 pr-4">SHELL</th>
                            <th className="pb-2 pr-4">GROUPS</th>
                            <th className="pb-2 pr-4">HOME</th>
                            <th className="pb-2 pr-4">LAST LOGIN</th>
                            <th className="pb-2 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverUsers.map(user => (
                            <tr key={user.username} className={`border-b border-hacker-border/30 hover:bg-hacker-surface/50 ${user.isSystem ? 'opacity-60' : ''}`}>
                              <td className="py-2 pr-4 text-hacker-cyan">{user.username}</td>
                              <td className="py-2 pr-4 text-hacker-text-dim">{user.uid}</td>
                              <td className="py-2 pr-4 text-hacker-text">{user.fullName || '-'}</td>
                              <td className="py-2 pr-4 text-hacker-purple">{user.shell?.split('/').pop()}</td>
                              <td className="py-2 pr-4 text-hacker-text-dim max-w-[150px] truncate" title={user.groups?.join(', ')}>
                                {user.groups?.slice(0, 3).join(', ')}
                                {user.groups?.length > 3 && `... +${user.groups.length - 3}`}
                              </td>
                              <td className="py-2 pr-4 text-hacker-text-dim">{user.home}</td>
                              <td className="py-2 pr-4 text-hacker-text-dim">{user.lastLogin || 'Never'}</td>
                              <td className="py-2 text-right">
                                {!user.isSystem && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete user ${user.username}? This cannot be undone.`)) {
                                        const removeHome = confirm('Also remove home directory?');
                                        deleteServerUser(user.username, removeHome);
                                      }
                                    }}
                                    className="text-xs text-hacker-error hover:text-hacker-error/70"
                                  >
                                    DELETE
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Server Groups */}
                <div className="hacker-card">
                  <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                    SERVER GROUPS
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {serverGroups.map(group => (
                      <div key={group.name} className="p-2 bg-hacker-surface rounded border border-hacker-border">
                        <div className="text-xs font-mono text-hacker-cyan">{group.name}</div>
                        <div className="text-[10px] text-hacker-text-dim">GID: {group.gid}</div>
                        {group.members.length > 0 && (
                          <div className="text-[10px] text-hacker-purple mt-1">{group.members.length} members</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FIREWALL Sub-tab */}
            {infraSubTab === INFRA_TABS.FIREWALL && (
              <div className="space-y-6">
                {/* Sudo Setup Required */}
                {firewallStatus?.needsSudo && (
                  <div className="hacker-card border-hacker-warning/50">
                    <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
                      SUDO SETUP REQUIRED
                    </h4>
                    <p className="text-sm text-hacker-text mb-4">
                      UFW requires passwordless sudo access. Run this command in your terminal:
                    </p>
                    <div className="bg-black p-4 rounded font-mono text-xs text-hacker-cyan mb-4 overflow-x-auto">
                      echo "$USER ALL=(ALL) NOPASSWD: /usr/sbin/ufw" | sudo tee /etc/sudoers.d/ufw-nopasswd && sudo chmod 440 /etc/sudoers.d/ufw-nopasswd
                    </div>
                    <button
                      onClick={() => fetchFirewallStatus()}
                      className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
                    >
                      CHECK AGAIN
                    </button>
                  </div>
                )}

                {/* Firewall Status */}
                {!firewallStatus?.needsSudo && (
                  <div className="hacker-card">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-hacker-error uppercase tracking-wider">
                        UFW FIREWALL
                      </h4>
                      {firewallStatus?.installed && !firewallStatus?.needsSudo && (
                        <button
                          onClick={() => toggleFirewall(!firewallStatus.active)}
                          className={`hacker-btn text-xs ${
                            firewallStatus.active
                              ? 'border-hacker-error/30 text-hacker-error'
                              : 'border-hacker-green/30 text-hacker-green'
                          }`}
                        >
                          {firewallStatus.active ? 'DISABLE' : 'ENABLE'}
                        </button>
                      )}
                    </div>

                    {!firewallStatus?.installed ? (
                      <div className="p-4 bg-hacker-warning/10 border border-hacker-warning/30 rounded">
                        <p className="text-sm text-hacker-warning font-mono">
                          UFW is not installed. Install with: <code className="bg-black px-2 py-1 rounded">sudo apt install ufw</code>
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                          <div className={`text-lg font-bold ${firewallStatus.active ? 'text-hacker-green' : 'text-hacker-error'}`}>
                            {firewallStatus.active ? 'ACTIVE' : 'INACTIVE'}
                          </div>
                          <div className="text-xs text-hacker-text-dim">Status</div>
                        </div>
                        <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                          <div className="text-lg font-bold text-hacker-cyan">{firewallRules.length}</div>
                          <div className="text-xs text-hacker-text-dim">Rules</div>
                        </div>
                        <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                          <div className={`text-lg font-bold ${firewallStatus.defaultIncoming === 'deny' ? 'text-hacker-green' : 'text-hacker-warning'}`}>
                            {firewallStatus.defaultIncoming?.toUpperCase()}
                          </div>
                          <div className="text-xs text-hacker-text-dim">Incoming</div>
                        </div>
                        <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                          <div className={`text-lg font-bold ${firewallStatus.defaultOutgoing === 'allow' ? 'text-hacker-green' : 'text-hacker-warning'}`}>
                            {firewallStatus.defaultOutgoing?.toUpperCase()}
                          </div>
                          <div className="text-xs text-hacker-text-dim">Outgoing</div>
                        </div>
                        <div className="text-center p-3 bg-hacker-surface rounded border border-hacker-border">
                          <div className="text-lg font-bold text-hacker-purple">{firewallStatus.logging?.toUpperCase() || 'OFF'}</div>
                          <div className="text-xs text-hacker-text-dim">Logging</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Ports - Auto-Import Section */}
                {firewallStatus?.installed && !firewallStatus?.needsSudo && (
                  <div className="hacker-card">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
                        PROJECT PORTS
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={fetchProjectPorts}
                          disabled={projectPortsLoading}
                          className="hacker-btn text-xs border-hacker-border text-hacker-text-dim"
                        >
                          {projectPortsLoading ? 'SCANNING...' : 'REFRESH'}
                        </button>
                        <button
                          onClick={syncProjectPorts}
                          disabled={syncingPorts}
                          className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
                        >
                          {syncingPorts ? 'SYNCING...' : 'SYNC ALL TO FIREWALL'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-hacker-text-dim mb-4 font-mono">
                      Ports from published routes and listening processes. SSH (port 22) is ALWAYS protected.
                    </p>

                    {projectPortsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin h-6 w-6 border-2 border-hacker-cyan border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-xs text-hacker-text-dim mt-2">Scanning ports...</p>
                      </div>
                    ) : projectPorts.length === 0 ? (
                      <div className="text-center py-4 text-hacker-text-dim text-sm">
                        No project ports found. Publish projects via Cloudflare or start dev servers.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm font-mono">
                          <thead>
                            <tr className="text-hacker-text-dim text-xs border-b border-hacker-border">
                              <th className="text-left pb-2">Port</th>
                              <th className="text-left pb-2">Hostname / Process</th>
                              <th className="text-left pb-2">Source</th>
                              <th className="text-left pb-2">In Firewall</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectPorts.map((port, idx) => (
                              <tr key={idx} className="border-b border-hacker-border/30 hover:bg-hacker-surface/50">
                                <td className="py-2 text-hacker-cyan">{port.port}</td>
                                <td className="py-2 text-hacker-text">
                                  {port.hostname || port.subdomain || port.process || '-'}
                                </td>
                                <td className="py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    port.source === 'published_route' ? 'bg-hacker-purple/20 text-hacker-purple' :
                                    port.source === 'listening' ? 'bg-hacker-warning/20 text-hacker-warning' :
                                    'bg-hacker-green/20 text-hacker-green'
                                  }`}>
                                    {port.source === 'published_route' ? 'Route' :
                                     port.source === 'listening' ? 'Process' : 'Both'}
                                  </span>
                                </td>
                                <td className="py-2">
                                  {port.inFirewall ? (
                                    <span className="text-hacker-green flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      YES
                                    </span>
                                  ) : (
                                    <span className="text-hacker-warning flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      NO
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Summary */}
                    {projectPorts.length > 0 && (
                      <div className="mt-4 flex items-center gap-4 text-xs text-hacker-text-dim">
                        <span>Total: <span className="text-hacker-cyan">{projectPorts.length}</span></span>
                        <span>In Firewall: <span className="text-hacker-green">{projectPorts.filter(p => p.inFirewall).length}</span></span>
                        <span>Not in Firewall: <span className="text-hacker-warning">{projectPorts.filter(p => !p.inFirewall).length}</span></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Firewall Rules */}
                {firewallStatus?.installed && !firewallStatus?.needsSudo && (
                  <div className="hacker-card">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-hacker-error uppercase tracking-wider">
                        FIREWALL RULES
                      </h4>
                      <button
                        onClick={() => setShowAddFirewallRule(true)}
                        className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
                      >
                        + ADD RULE
                      </button>
                    </div>

                    {/* Add Rule Modal */}
                    {showAddFirewallRule && (
                      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
                        <div className="bg-hacker-bg border border-hacker-error/50 rounded-lg p-6 w-full max-w-md shadow-2xl">
                          <h3 className="text-lg font-bold text-hacker-error mb-4">Add Firewall Rule</h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={newFirewallRule.action}
                                onChange={e => setNewFirewallRule(r => ({...r, action: e.target.value}))}
                                className="bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-error outline-none font-mono"
                              >
                                <option value="allow">ALLOW</option>
                                <option value="deny">DENY</option>
                                <option value="reject">REJECT</option>
                                <option value="limit">LIMIT</option>
                              </select>
                              <select
                                value={newFirewallRule.protocol}
                                onChange={e => setNewFirewallRule(r => ({...r, protocol: e.target.value}))}
                                className="bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-error outline-none font-mono"
                              >
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="">TCP/UDP</option>
                              </select>
                            </div>
                            <input
                              type="text"
                              placeholder="Port (e.g., 22, 80, 443, 8000:9000)"
                              value={newFirewallRule.port}
                              onChange={e => setNewFirewallRule(r => ({...r, port: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-error outline-none font-mono"
                            />
                            <input
                              type="text"
                              placeholder="From IP/CIDR (e.g., 192.168.1.0/24, any)"
                              value={newFirewallRule.from}
                              onChange={e => setNewFirewallRule(r => ({...r, from: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-error outline-none font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Comment (optional)"
                              value={newFirewallRule.comment}
                              onChange={e => setNewFirewallRule(r => ({...r, comment: e.target.value}))}
                              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-sm text-hacker-text focus:border-hacker-error outline-none font-mono"
                            />
                            <div className="flex justify-end gap-2 mt-4">
                              <button onClick={() => setShowAddFirewallRule(false)} className="hacker-btn text-xs">Cancel</button>
                              <button
                                onClick={() => addFirewallRule(newFirewallRule)}
                                disabled={!newFirewallRule.port}
                                className="hacker-btn text-xs border-hacker-green/30 text-hacker-green disabled:opacity-50"
                              >
                                Add Rule
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rules Table */}
                    {firewallLoading ? (
                      <div className="text-center py-8 text-hacker-text-dim animate-pulse">Loading rules...</div>
                    ) : firewallRules.length === 0 ? (
                      <p className="text-xs text-hacker-text-dim font-mono">No firewall rules configured</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-left text-hacker-text-dim border-b border-hacker-border">
                              <th className="pb-2 pr-4">#</th>
                              <th className="pb-2 pr-4">PORT/SERVICE</th>
                              <th className="pb-2 pr-4">ACTION</th>
                              <th className="pb-2 pr-4">DIRECTION</th>
                              <th className="pb-2 pr-4">FROM</th>
                              <th className="pb-2 text-right">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {firewallRules.map(rule => (
                              <tr key={rule.number} className="border-b border-hacker-border/30 hover:bg-hacker-surface/50">
                                <td className="py-2 pr-4 text-hacker-text-dim">{rule.number}</td>
                                <td className="py-2 pr-4 text-hacker-cyan">
                                  {rule.port}
                                  {isSSHRule(rule) && (
                                    <span className="ml-2 text-hacker-warning" title="SSH is protected - cannot be deleted">
                                      🔒
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    rule.action === 'ALLOW' ? 'bg-hacker-green/20 text-hacker-green' :
                                    rule.action === 'LIMIT' ? 'bg-hacker-warning/20 text-hacker-warning' :
                                    'bg-hacker-error/20 text-hacker-error'
                                  }`}>
                                    {rule.action}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-hacker-purple">{rule.direction}</td>
                                <td className="py-2 pr-4 text-hacker-text-dim">{rule.from}</td>
                                <td className="py-2 text-right">
                                  {isSSHRule(rule) ? (
                                    <span className="text-xs text-hacker-text-dim" title="SSH access is protected">
                                      PROTECTED
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete rule #${rule.number} (${rule.port})?`)) deleteFirewallRule(rule.number);
                                      }}
                                      className="text-xs text-hacker-error hover:text-hacker-error/70"
                                    >
                                      DELETE
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Application Profiles */}
                {firewallStatus?.installed && !firewallStatus?.needsSudo && firewallApps.length > 0 && (
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
                      APPLICATION PROFILES
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {firewallApps.map(app => (
                        <button
                          key={app}
                          onClick={() => {
                            if (confirm(`Add ALLOW rule for "${app}"?`)) {
                              addFirewallRule({ action: 'allow', port: app, from: 'any' });
                            }
                          }}
                          className="p-2 bg-hacker-surface rounded border border-hacker-border hover:border-hacker-purple/50 text-left transition-colors"
                        >
                          <div className="text-xs font-mono text-hacker-purple truncate">{app}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {firewallStatus?.installed && (
                  <div className="hacker-card">
                    <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
                      QUICK ACTIONS
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => addFirewallRule({ action: 'allow', port: '22', protocol: 'tcp', from: 'any', comment: 'SSH' })}
                        className="hacker-btn text-xs"
                      >
                        Allow SSH (22)
                      </button>
                      <button
                        onClick={() => addFirewallRule({ action: 'allow', port: '80', protocol: 'tcp', from: 'any', comment: 'HTTP' })}
                        className="hacker-btn text-xs"
                      >
                        Allow HTTP (80)
                      </button>
                      <button
                        onClick={() => addFirewallRule({ action: 'allow', port: '443', protocol: 'tcp', from: 'any', comment: 'HTTPS' })}
                        className="hacker-btn text-xs"
                      >
                        Allow HTTPS (443)
                      </button>
                      <button
                        onClick={() => setFirewallDefault('incoming', 'deny')}
                        className="hacker-btn text-xs border-hacker-error/30 text-hacker-error"
                      >
                        Default Deny Incoming
                      </button>
                      <button
                        onClick={() => setFirewallDefault('outgoing', 'allow')}
                        className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
                      >
                        Default Allow Outgoing
                      </button>
                    </div>
                  </div>
                )}

                {/* Firewall Logs */}
                {firewallStatus?.installed && !firewallStatus?.needsSudo && (
                  <div className="hacker-card">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
                        FIREWALL LOGS
                      </h4>
                      <button
                        onClick={fetchFirewallLogs}
                        disabled={firewallLogsLoading}
                        className="hacker-btn text-xs"
                      >
                        {firewallLogsLoading ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                    {firewallLogsLoading ? (
                      <div className="text-center py-8 text-hacker-text-dim animate-pulse">Loading logs...</div>
                    ) : firewallLogs.length === 0 ? (
                      <div className="p-4 bg-hacker-surface rounded border border-hacker-border">
                        {!firewallStatus?.active ? (
                          <>
                            <p className="text-sm text-hacker-warning font-mono">
                              Firewall is INACTIVE - no traffic is being filtered.
                            </p>
                            <p className="text-xs text-hacker-text-dim mt-2">
                              Enable firewall first to generate logs: <code className="bg-black px-2 py-1 rounded">sudo ufw enable</code>
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-hacker-text-dim font-mono">
                              No firewall logs found. UFW logging may be disabled or no blocked traffic yet.
                            </p>
                            <p className="text-xs text-hacker-text-dim mt-2">
                              Enable logging: <code className="bg-black px-2 py-1 rounded">sudo ufw logging on</code>
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto bg-black rounded p-3 border border-hacker-border">
                        {firewallLogs.map((log, idx) => (
                          <div key={idx} className="font-mono text-xs">
                            {log.type === 'BLOCK' || log.raw?.includes('BLOCK') ? (
                              <span className="text-hacker-error">{log.raw || log.message}</span>
                            ) : log.type === 'ALLOW' || log.raw?.includes('ALLOW') ? (
                              <span className="text-hacker-green">{log.raw || log.message}</span>
                            ) : (
                              <span className="text-hacker-text-dim">{log.raw || log.message || JSON.stringify(log)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settings Sub-Tab Content */}
            {infraSubTab === INFRA_TABS.SETTINGS && (
              <SettingsPanel />
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
              {(history.entries || []).map((entry, idx) => (
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

        {/* MCP Servers Tab */}
        {activeTab === TABS.MCP && (
          <div className="space-y-6 animate-fade-in">
            <MCPServerManager />
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === TABS.PROJECTS && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} PROJECTS [{projects.length}]
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sorting Controls */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-hacker-text-dim">SORT:</span>
                  <select
                    value={projectSortBy}
                    onChange={(e) => setProjectSortBy(e.target.value)}
                    className="input-glass text-xs !py-1"
                  >
                    <option value="name">Name</option>
                    <option value="completion">Completion</option>
                    <option value="lastModified">Last Modified</option>
                    <option value="active">Active</option>
                  </select>
                  <button
                    onClick={() => setProjectSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    className="p-1 rounded hover:bg-hacker-surface border border-hacker-border"
                    title={projectSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    <svg className="w-4 h-4 text-hacker-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {projectSortOrder === 'asc' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                      )}
                    </svg>
                  </button>
                </div>
                {/* Stats summary */}
                <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
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
                <button
                  onClick={() => setShowProjectCreator(true)}
                  className="hacker-btn text-xs bg-hacker-green/20 border-hacker-green text-hacker-green hover:bg-hacker-green/30"
                >
                  [+ NEW PROJECT]
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedProjects.map(project => {
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
                        {/* Rename button */}
                        <button
                          onClick={() => setRenameProject({ name: project.name, newName: project.name })}
                          className="p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-hacker-cyan/20"
                          title="Rename project"
                        >
                          <svg className="w-4 h-4 text-hacker-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete button */}
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

                    {/* Status Icons Row */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {/* Git initialized */}
                      <span
                        className={`p-1 rounded ${project.hasGit ? 'text-hacker-green' : 'text-hacker-text-dim opacity-40'}`}
                        title={project.hasGit ? 'Git initialized' : 'No git repository'}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </span>
                      {/* GitHub connected */}
                      <span
                        className={`p-1 rounded ${project.hasGithub ? 'text-hacker-purple' : 'text-hacker-text-dim opacity-40'}`}
                        title={project.hasGithub ? `GitHub: ${project.githubRepo || 'connected'}` : 'Not connected to GitHub'}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </span>
                      {/* Has tests */}
                      <span
                        className={`p-1 rounded ${project.hasTests ? 'text-hacker-cyan' : 'text-hacker-text-dim opacity-40'}`}
                        title={project.hasTests ? 'Has test suite' : 'No tests found'}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      {/* Has Docker */}
                      <span
                        className={`p-1 rounded ${project.hasDocker ? 'text-hacker-blue' : 'text-hacker-text-dim opacity-40'}`}
                        title={project.hasDocker ? 'Docker configured' : 'No Docker configuration'}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.185.185 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>
                        </svg>
                      </span>
                      {/* Has TypeScript */}
                      <span
                        className={`p-1 rounded ${project.technologies?.includes('TypeScript') ? 'text-hacker-blue' : 'text-hacker-text-dim opacity-40'}`}
                        title={project.technologies?.includes('TypeScript') ? 'TypeScript project' : 'No TypeScript'}
                      >
                        <span className="text-[10px] font-bold">TS</span>
                      </span>
                      {/* Has CLAUDE.md */}
                      <span
                        className={`p-1 rounded ${project.hasClaudeMd ? 'text-hacker-warning' : 'text-hacker-text-dim opacity-40'}`}
                        title={project.hasClaudeMd ? 'Has CLAUDE.md instructions' : 'No CLAUDE.md'}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
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
                      {/* CLAUDE.md Edit Button */}
                      <button
                        onClick={() => {
                          setSelectedProject(project.name);
                          fetchClaudeMd(project.name);
                          setClaudeMdModalProject(project.name);
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 ${
                          project.hasClaudeMd
                            ? 'bg-hacker-cyan/20 border border-hacker-cyan/50 text-hacker-cyan hover:bg-hacker-cyan/30'
                            : 'bg-hacker-surface border border-hacker-border text-hacker-text-dim hover:border-hacker-cyan/50 hover:text-hacker-cyan'
                        }`}
                        title={project.hasClaudeMd ? 'Edit project CLAUDE.md' : 'Create project CLAUDE.md'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {project.hasClaudeMd ? 'CLAUDE.MD' : 'NEW CLAUDE.MD'}
                      </button>
                      {/* Compliance Check Button */}
                      <button
                        onClick={() => setComplianceCheckProject({
                          path: project.path || project.name,
                          name: project.name
                        })}
                        className="px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 bg-hacker-surface border border-hacker-border text-hacker-text-dim hover:border-hacker-purple/50 hover:text-hacker-purple"
                        title="Check project compliance with standards"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        COMPLIANCE
                      </button>
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

        {/* Development Tab - Merged TOOLS + DEVTOOLS */}
        {activeTab === TABS.DEVELOPMENT && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
                {'>'} DEVELOPMENT_TOOLS
              </h3>
            </div>

            {/* Row 1: API, Git, Files, Diff */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
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
                  <span>&#9654;</span> GIT WORKFLOW {currentProject && <span className="text-hacker-text-dim text-xs">({currentProject.name})</span>}
                </h4>
                <GitWorkflow embedded={true} projectPath={currentProject?.path} />
              </div>

              {/* File Browser */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> FILE BROWSER {currentProject && <span className="text-hacker-text-dim text-xs">({currentProject.name})</span>}
                </h4>
                <FileBrowser embedded={true} projectPath={currentProject?.path} />
              </div>

              {/* Diff Viewer */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> DIFF VIEWER
                </h4>
                <DiffViewer embedded={true} />
              </div>
            </div>

            {/* Row 2: Database Browser (full width) */}
            <div className="hacker-card p-4">
              <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
                <span>&#9654;</span> DATABASE BROWSER
              </h4>
              <DatabaseBrowser embedded={true} />
            </div>

            {/* Row 3: Dependencies & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dependency Dashboard */}
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>&#9654;</span> DEPENDENCIES {currentProject && <span className="text-hacker-text-dim text-xs">({currentProject.name})</span>}
                </h4>
                <DependencyDashboard embedded={true} projectPath={currentProject?.path} />
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

        {/* Agents Tab */}
        {activeTab === TABS.AGENTS && (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-tab navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-hacker-surface/50 rounded-lg p-1 border border-hacker-green/20">
                <button
                  onClick={() => setAgentSubTab(AGENT_TABS.MY_AGENTS)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    agentSubTab === AGENT_TABS.MY_AGENTS
                      ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/50'
                      : 'text-hacker-text-dim hover:text-hacker-green/70'
                  }`}
                >
                  MY AGENTS
                </button>
                <button
                  onClick={() => setAgentSubTab(AGENT_TABS.MARKETPLACE)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                    agentSubTab === AGENT_TABS.MARKETPLACE
                      ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/50'
                      : 'text-hacker-text-dim hover:text-hacker-green/70'
                  }`}
                >
                  MARKETPLACE
                </button>
              </div>
            </div>

            {/* My Agents sub-tab */}
            {agentSubTab === AGENT_TABS.MY_AGENTS && (
              <AgentManager />
            )}

            {/* Marketplace sub-tab */}
            {agentSubTab === AGENT_TABS.MARKETPLACE && (
              <AgentMarketplace
                projects={projects}
                onInstall={() => {
                  // Switch to My Agents after install
                  setAgentSubTab(AGENT_TABS.MY_AGENTS);
                }}
              />
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === TABS.SECURITY && (
          <SecurityDashboard selectedProject={selectedProject} />
        )}

        {/* Code Puppy AI Coding Assistant Tab */}
        {activeTab === TABS.CODE_PUPPY && (
          <CodePuppyDashboard
            onClose={() => setActiveTab(TABS.PROJECTS)}
            socket={null}
            projects={projects}
          />
        )}

        {/* P2: Tabby Code Completion Tab - Experimental */}
        {userSettings?.showExperimentalFeatures && activeTab === TABS.TABBY && (
          <TabbyDashboard onClose={() => setActiveTab(TABS.PROJECTS)} />
        )}

        {/* P3: Claude Flow Swarm Tab - Experimental */}
        {userSettings?.showExperimentalFeatures && activeTab === TABS.SWARM && (
          <SwarmDashboard
            projectPath={selectedProject?.path}
            socket={null}
            onClose={() => setActiveTab(TABS.PROJECTS)}
          />
        )}
      </div>

      {/* CLAUDE.md Editor Modal */}
      {claudeMdModalProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="hacker-card p-6 w-full max-w-4xl mx-4 h-[80vh] flex flex-col border-hacker-cyan/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-hacker-cyan flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                CLAUDE.MD - {claudeMdModalProject}
              </h3>
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <span className="hacker-badge hacker-badge-warning text-xs">UNSAVED</span>
                )}
                <button
                  onClick={saveClaudeMd}
                  disabled={loading || !hasUnsavedChanges}
                  className="hacker-btn disabled:opacity-50"
                >
                  {loading ? '[SAVING...]' : '[SAVE]'}
                </button>
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (window.confirm('You have unsaved changes. Discard them?')) {
                        setClaudeMdModalProject(null);
                        setHasUnsavedChanges(false);
                      }
                    } else {
                      setClaudeMdModalProject(null);
                    }
                  }}
                  className="hacker-btn"
                >
                  [CLOSE]
                </button>
              </div>
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
        </div>
      )}

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

      {/* Rename Project Modal */}
      {renameProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="hacker-card p-6 max-w-md w-full mx-4 border-hacker-cyan/50">
            <h3 className="text-lg font-bold text-hacker-cyan mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              RENAME PROJECT
            </h3>
            <p className="text-hacker-text mb-4">
              Current name: <span className="font-bold text-hacker-cyan">{renameProject.name}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-hacker-text-dim mb-2">New project name:</label>
              <input
                type="text"
                value={renameProject.newName}
                onChange={(e) => setRenameProject({ ...renameProject, newName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameProject(renameProject.name, renameProject.newName);
                  if (e.key === 'Escape') setRenameProject(null);
                }}
                className="w-full px-3 py-2 bg-hacker-bg border border-hacker-border rounded font-mono text-hacker-text focus:border-hacker-cyan focus:outline-none"
                placeholder="Enter new name..."
                autoFocus
              />
              <p className="text-xs text-hacker-text-dim mt-2">
                This will rename the project folder on disk.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRenameProject(null)}
                className="hacker-btn"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleRenameProject(renameProject.name, renameProject.newName)}
                disabled={!renameProject.newName || renameProject.newName === renameProject.name}
                className="px-4 py-2 bg-hacker-cyan text-hacker-bg font-mono text-sm rounded hover:bg-hacker-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                RENAME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-hacker-green/10 bg-hacker-surface/50 font-mono text-xs text-hacker-text-dim flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-hacker-green">CP://SYSTEM</span>
          <span>v1.1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TAB: {activeTab.toUpperCase()}</span>
          <span className="text-hacker-cyan">{new Date().toLocaleDateString()}</span>
        </div>
      </footer>

      {/* Project Creator Modal */}
      <ProjectCreator
        isOpen={showProjectCreator}
        onClose={() => setShowProjectCreator(false)}
        onProjectCreated={(project) => {
          fetchProjects();
          setShowProjectCreator(false);
        }}
      />

      {/* Compliance Checker Modal */}
      <ComplianceChecker
        isOpen={!!complianceCheckProject}
        projectPath={complianceCheckProject?.path}
        projectName={complianceCheckProject?.name}
        onClose={() => setComplianceCheckProject(null)}
        onMigrate={() => fetchProjects()}
      />
    </div>
  );
}

export default AdminDashboard;
