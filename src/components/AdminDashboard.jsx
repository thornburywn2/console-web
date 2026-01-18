/**
 * AdminDashboard - Main Admin Shell Component
 * Refactored to use extracted tab components
 *
 * Navigation Structure:
 * PROJECTS | SETTINGS | AUTOMATION | SERVER | SECURITY | HISTORY
 *
 * Experimental (when enabled):
 * DEV | CODE PUPPY | TABBY | SWARM
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Import extracted tab components
import ProjectsTab from './admin/tabs/ProjectsTab';
import SettingsTab from './admin/tabs/SettingsTab';
import AutomationTab from './admin/tabs/AutomationTab';
import ServerTab from './admin/tabs/ServerTab';
import SecurityTab from './admin/tabs/SecurityTab';
import HistoryTab from './admin/tabs/HistoryTab';

// Import tab constants and RBAC utilities (Phase 3)
import { TABS, migrateTab, canAccessTab, TAB_PERMISSIONS } from './admin/constants';

// Import auth hook for RBAC (Phase 3)
import { useAuth } from '../hooks/useAuth';

// Import experimental components
import TabbyDashboard from './TabbyDashboard';
import SwarmDashboard from './SwarmDashboard';
import CodePuppyDashboard from './CodePuppyDashboard';

// Import development tools
import ApiTester from './ApiTester';
import DatabaseBrowser from './DatabaseBrowser';
import DiffViewer from './DiffViewer';
import FileBrowser from './FileBrowser';
import LogViewer from './LogViewer';
import DependencyDashboard from './DependencyDashboard';
import GitWorkflow from './GitWorkflow';

// Project management components
import ProjectCreator from './ProjectCreator';
import ComplianceChecker from './ComplianceChecker';

// Re-export for use in SettingsPanel
export { GitHubSettingsTab, CloudflareSettingsTab };

// Re-export TABS for backward compatibility
export { TABS };

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

/**
 * GitHubSettingsTab - GitHub Integration Settings
 * Used by SettingsPanel in Integrations section
 */
function GitHubSettingsTab() {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState([]);

  useEffect(() => {
    fetchAuthStatus();
    fetchLinkedRepos();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      setLoading(true);
      const data = await api.get('/github/auth');
      setAuthStatus(data);
    } catch (err) {
      setError('Failed to check GitHub status');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedRepos = async () => {
    try {
      const data = await api.get('/github/repos?linked=true');
      setLinkedRepos(data.repos || []);
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
      const data = await api.post('/github/auth', { accessToken: accessToken.trim() });
      setAuthStatus(data);
      setAccessToken('');
      setSuccess('Successfully connected to GitHub!');
      fetchLinkedRepos();
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub?')) return;
    setSaving(true);
    setError('');
    try {
      await api.delete('/github/auth');
      setAuthStatus({ authenticated: false });
      setSuccess('GitHub disconnected');
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
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
        <button onClick={fetchAuthStatus} className="px-3 py-1 text-xs font-mono border border-hacker-green/30 rounded hover:bg-hacker-green/10">[REFRESH]</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm font-mono">[ERROR] {error}</div>}
      {success && <div className="p-3 rounded-lg bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm font-mono">[SUCCESS] {success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> AUTHENTICATION
          </h4>

          {authStatus?.authenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-hacker-surface/50 border border-hacker-green/20">
                {authStatus.avatarUrl && <img src={authStatus.avatarUrl} alt={authStatus.username} className="w-12 h-12 rounded-full border-2 border-hacker-green/50" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-hacker-text">{authStatus.username}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-hacker-green/20 text-hacker-green border border-hacker-green/30">CONNECTED</span>
                  </div>
                  {authStatus.profileUrl && <a href={authStatus.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-hacker-cyan hover:underline font-mono">View Profile →</a>}
                </div>
              </div>
              {authStatus.tokenScopes?.length > 0 && (
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">TOKEN SCOPES</label>
                  <div className="flex flex-wrap gap-2">
                    {authStatus.tokenScopes.map(scope => <span key={scope} className="px-2 py-1 text-xs font-mono rounded bg-hacker-surface border border-hacker-purple/30 text-hacker-purple">{scope}</span>)}
                  </div>
                </div>
              )}
              <button onClick={handleDisconnect} disabled={saving} className="w-full py-2 px-4 text-sm font-mono rounded border border-hacker-error/50 text-hacker-error hover:bg-hacker-error/10 disabled:opacity-50">
                {saving ? '[DISCONNECTING...]' : '[DISCONNECT GITHUB]'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-hacker-text-dim mb-2">PERSONAL ACCESS TOKEN</label>
                <div className="relative">
                  <input type={showToken ? 'text' : 'password'} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" className="input-glass font-mono pr-10" />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-hacker-text-dim hover:text-hacker-text">{showToken ? '[HIDE]' : '[SHOW]'}</button>
                </div>
              </div>
              <div className="p-3 rounded bg-hacker-surface/50 border border-hacker-cyan/20">
                <div className="text-xs font-mono text-hacker-cyan mb-2">REQUIRED SCOPES:</div>
                <div className="text-xs font-mono text-hacker-text-dim space-y-1">
                  <div><span className="text-hacker-green">repo</span> - Full repository access</div>
                  <div><span className="text-hacker-green">read:org</span> - Read organization data</div>
                  <div><span className="text-hacker-green">workflow</span> - GitHub Actions access</div>
                </div>
              </div>
              <a href="https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=Command%20Portal" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-hacker-cyan hover:underline">[CREATE NEW TOKEN ON GITHUB →]</a>
              <button type="submit" disabled={saving || !accessToken.trim()} className="w-full py-2.5 px-4 text-sm font-mono rounded bg-hacker-green/20 border border-hacker-green/50 text-hacker-green hover:bg-hacker-green/30 disabled:opacity-50">
                {saving ? '[CONNECTING...]' : '[CONNECT GITHUB]'}
              </button>
            </form>
          )}
        </div>

        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> LINKED REPOSITORIES ({linkedRepos.length})
          </h4>
          {linkedRepos.length === 0 ? (
            <div className="text-center py-8 text-hacker-text-dim font-mono text-sm">No repositories linked yet.<br /><span className="text-xs">Link repos from the Project's GitHub panel</span></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {linkedRepos.map(repo => (
                <div key={repo.id} className="p-3 rounded bg-hacker-surface/50 border border-hacker-purple/20 hover:border-hacker-purple/40">
                  <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-hacker-cyan hover:underline">{repo.fullName}</a>
                  <div className="text-xs text-hacker-text-dim font-mono mt-0.5">{repo.isPrivate ? '🔒 Private' : '🌐 Public'} • {repo.defaultBranch}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * CloudflareSettingsTab - Cloudflare Tunnel Settings
 * Used by SettingsPanel in Integrations section
 */
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
    apiToken: '', accountId: '', tunnelId: '', zoneId: '', zoneName: 'example.com', tunnelName: '', defaultSubdomain: '',
  });

  useEffect(() => {
    fetchSettings();
    fetchRoutes();
    fetchTunnelStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get('/cloudflare/settings');
      if (data.configured) {
        setSettings(data);
        setFormData({ apiToken: '', accountId: data.accountId || '', tunnelId: data.tunnelId || '', zoneId: data.zoneId || '', zoneName: data.zoneName || 'example.com', tunnelName: data.tunnelName || '', defaultSubdomain: data.defaultSubdomain || '' });
      }
    } catch (err) {
      setError('Failed to fetch Cloudflare settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const data = await api.get('/cloudflare/routes/mapped');
      setRoutes(data.routes || []);
      setRouteSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    }
  };

  const fetchTunnelStatus = async () => {
    try {
      const data = await api.get('/cloudflare/tunnel/status');
      setTunnelStatus(data);
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
      const data = await api.post('/cloudflare/sync');
      setSyncStats(data);
      setSuccess(`Synced ${data.synced} routes from Cloudflare`);
      fetchRoutes();
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
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
      const data = await api.post('/cloudflare/settings', formData);
      setSettings(data);
      setSuccess('Cloudflare settings saved successfully!');
      setFormData(prev => ({ ...prev, apiToken: '' }));
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Cloudflare?')) return;
    setSaving(true);
    try {
      await api.delete('/cloudflare/settings');
      setSettings(null);
      setFormData({ apiToken: '', accountId: '', tunnelId: '', zoneId: '', zoneName: 'example.com', tunnelName: '', defaultSubdomain: '' });
      setSuccess('Cloudflare disconnected');
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-hacker-warning border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider font-mono">{'>'} CLOUDFLARE_TUNNELS</h3>
        <div className="flex gap-2">
          <button onClick={() => { fetchSettings(); fetchRoutes(); fetchTunnelStatus(); }} className="px-3 py-1 text-xs font-mono border border-hacker-warning/30 rounded hover:bg-hacker-warning/10">[REFRESH]</button>
          {settings?.configured && (
            <>
              <button onClick={handleSync} disabled={syncing} className="px-3 py-1 text-xs font-mono border border-hacker-green/30 rounded hover:bg-hacker-green/10 disabled:opacity-50">{syncing ? '[SYNCING...]' : '[SYNC ROUTES]'}</button>
            </>
          )}
        </div>
      </div>

      {tunnelStatus && settings?.configured && (
        <div className={`p-3 rounded-lg border ${tunnelStatus.status === 'healthy' ? 'bg-hacker-green/10 border-hacker-green/30' : 'bg-hacker-error/10 border-hacker-error/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${tunnelStatus.status === 'healthy' ? 'bg-hacker-green animate-pulse' : 'bg-hacker-error'}`} />
              <span className="font-mono text-sm">Tunnel: <span className={tunnelStatus.status === 'healthy' ? 'text-hacker-green' : 'text-hacker-error'}>{tunnelStatus.status?.toUpperCase()}</span></span>
            </div>
          </div>
        </div>
      )}

      {error && <div className="p-3 rounded-lg bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm font-mono">[ERROR] {error}</div>}
      {success && <div className="p-3 rounded-lg bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm font-mono">[SUCCESS] {success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> CONFIGURATION</h4>
          {settings?.configured ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-hacker-surface/50 border border-hacker-warning/20">
                <div className="w-12 h-12 rounded-full border-2 border-hacker-warning/50 flex items-center justify-center bg-hacker-warning/10">
                  <span className="text-hacker-warning text-xl">☁️</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-hacker-text">{settings.tunnelName || 'Tunnel'}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-hacker-warning/20 text-hacker-warning border border-hacker-warning/30">CONNECTED</span>
                  </div>
                  <div className="text-xs text-hacker-text-dim font-mono">Zone: {settings.zoneName}</div>
                </div>
              </div>
              <button onClick={handleDisconnect} disabled={saving} className="w-full py-2 px-4 text-sm font-mono rounded border border-hacker-error/50 text-hacker-error hover:bg-hacker-error/10 disabled:opacity-50">[DISCONNECT]</button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-hacker-text-dim mb-2">API TOKEN</label>
                <input type={showToken ? 'text' : 'password'} value={formData.apiToken} onChange={(e) => setFormData(prev => ({ ...prev, apiToken: e.target.value }))} placeholder="Enter Cloudflare API token" className="input-glass font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">ACCOUNT ID</label>
                  <input type="text" value={formData.accountId} onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))} className="input-glass font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-hacker-text-dim mb-2">TUNNEL ID</label>
                  <input type="text" value={formData.tunnelId} onChange={(e) => setFormData(prev => ({ ...prev, tunnelId: e.target.value }))} className="input-glass font-mono" />
                </div>
              </div>
              <button type="submit" disabled={saving || !formData.apiToken.trim()} className="w-full py-2.5 px-4 text-sm font-mono rounded bg-hacker-warning/20 border border-hacker-warning/50 text-hacker-warning hover:bg-hacker-warning/30 disabled:opacity-50">
                {saving ? '[SAVING...]' : '[SAVE CONFIGURATION]'}
              </button>
            </form>
          )}
        </div>

        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> PUBLISHED ROUTES ({routes.length})</h4>
          {routes.length === 0 ? (
            <div className="text-center py-8 text-hacker-text-dim font-mono text-sm">No routes configured.<br /><span className="text-xs">Use [SYNC ROUTES] to import from Cloudflare</span></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {routes.slice(0, 10).map(route => (
                <div key={route.id} className="p-3 rounded bg-hacker-surface/50 border border-hacker-cyan/20">
                  <a href={`https://${route.hostname}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-hacker-cyan hover:underline">{route.hostname}</a>
                  <div className="text-xs text-hacker-text-dim font-mono mt-0.5">Port: {route.localPort}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main AdminDashboard Component
 */
function AdminDashboard({ onClose, initialTab = null, currentProject = null }) {
  // RBAC: Get auth utilities (Phase 3)
  const { hasRole, userRole } = useAuth();

  // Migrate old tab values if needed
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return migrateTab(initialTab);
    return TABS.PROJECTS;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User settings (for experimental features toggle)
  const [userSettings, setUserSettings] = useState(null);

  // Application branding
  const [appName, setAppName] = useState('Command Portal');

  // Modal states
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [claudeMdModalProject, setClaudeMdModalProject] = useState(null);
  const [claudeMd, setClaudeMd] = useState({ content: '', exists: false });
  const [claudeMdEdited, setClaudeMdEdited] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [renameProject, setRenameProject] = useState(null);
  const [complianceCheckProject, setComplianceCheckProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch user settings on mount
  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const data = await api.get('/settings');
      setUserSettings(data);
      if (data.appName) setAppName(data.appName);
    } catch (err) {
      console.error('Error fetching user settings:', err);
    }
  };

  // CLAUDE.md operations
  const fetchClaudeMd = useCallback(async (projectName) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/claude-md/${encodeURIComponent(projectName)}`);
      setClaudeMd(data);
      setClaudeMdEdited(data.content || '');
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error fetching CLAUDE.md:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveClaudeMd = useCallback(async () => {
    if (!claudeMdModalProject) return;
    try {
      setLoading(true);
      await api.put(`/admin/claude-md/${encodeURIComponent(claudeMdModalProject)}`, { content: claudeMdEdited });
      setClaudeMd({ content: claudeMdEdited, exists: true });
      setHasUnsavedChanges(false);
      setSuccess('CLAUDE.md saved');
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : 'Failed to save CLAUDE.md');
    } finally {
      setLoading(false);
    }
  }, [claudeMdModalProject, claudeMdEdited]);

  // Project operations
  const deleteProject = useCallback(async (projectName, permanent = false) => {
    try {
      await api.delete(`/admin/projects/${encodeURIComponent(projectName)}?permanent=${permanent}`);
      setDeleteConfirm(null);
      setSuccess(`Project ${permanent ? 'deleted' : 'moved to trash'}`);
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    }
  }, []);

  const handleRenameProject = useCallback(async (oldName, newName) => {
    try {
      await api.put(`/admin/projects/${encodeURIComponent(oldName)}/rename`, { newName });
      setRenameProject(null);
      setSuccess(`Project renamed to ${newName}`);
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    }
  }, []);

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
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-hacker-cyan animate-spin' : 'bg-hacker-green animate-pulse-glow'}`} />
              <span className={isRefreshing ? 'text-hacker-cyan' : 'text-hacker-green'}>
                {isRefreshing ? 'SYNCING' : 'LIVE'}
              </span>
            </div>
            <div className="text-hacker-text-dim">{lastUpdated.toLocaleTimeString()}</div>
          </div>
          <button onClick={onClose} className="hacker-btn flex items-center gap-2">
            <span>[ESC]</span>
            <span className="hidden sm:inline">EXIT</span>
          </button>
        </div>
      </header>

      {/* Main Tab Navigation - RBAC filtered (Phase 3) */}
      <div className="relative z-10 flex items-center gap-1 px-6 border-b border-hacker-green/10 bg-hacker-surface/50 overflow-x-auto">
        {/* User-level tabs - always visible */}
        <TabButton tab={TABS.PROJECTS} label="PROJECTS" icon={<span className="text-lg">&#128193;</span>} />
        <TabButton tab={TABS.SETTINGS} label="SETTINGS" icon={<span className="text-lg">&#9881;</span>} />
        <TabButton tab={TABS.AUTOMATION} label="AUTOMATION" icon={<span className="text-lg">&#129302;</span>} />

        {/* Admin-only tabs (Phase 3 RBAC) */}
        {canAccessTab(TABS.SERVER, hasRole) && (
          <TabButton tab={TABS.SERVER} label="SERVER" icon={<span className="text-lg">&#9211;</span>} />
        )}
        {canAccessTab(TABS.SECURITY, hasRole) && (
          <TabButton tab={TABS.SECURITY} label="SECURITY" icon={<span className="text-lg">&#128274;</span>} />
        )}

        <TabButton tab={TABS.HISTORY} label="HISTORY" icon={<span className="text-lg">&#8986;</span>} />

        {/* Experimental tabs - require both setting AND permission */}
        {userSettings?.showExperimentalFeatures && (
          <>
            <span className="text-hacker-text-dim/30 mx-1">|</span>
            {canAccessTab(TABS.DEVELOPMENT, hasRole) && (
              <TabButton tab={TABS.DEVELOPMENT} label="DEV" icon={<span className="text-lg">&#128295;</span>} />
            )}
            {canAccessTab(TABS.CODE_PUPPY, hasRole) && (
              <TabButton tab={TABS.CODE_PUPPY} label="CODE PUPPY" icon={<span className="text-lg">&#128021;</span>} />
            )}
            {canAccessTab(TABS.TABBY, hasRole) && (
              <TabButton tab={TABS.TABBY} label="TABBY" icon={<span className="text-lg">&#128049;</span>} />
            )}
            {canAccessTab(TABS.SWARM, hasRole) && (
              <TabButton tab={TABS.SWARM} label="SWARM" icon={<span className="text-lg">&#129433;</span>} />
            )}
          </>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="relative z-10 mx-6 mt-4 p-3 neon-border bg-hacker-error/10 rounded-lg text-hacker-error text-sm flex items-center justify-between font-mono">
          <span>[ERROR] {error}</span>
          <button onClick={() => setError(null)} className="hover:text-hacker-text">[X]</button>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="relative z-10 mx-6 mt-4 p-3 neon-border bg-hacker-green/10 rounded-lg text-hacker-green text-sm flex items-center justify-between font-mono">
          <span>[SUCCESS] {success}</span>
          <button onClick={() => setSuccess(null)} className="hover:text-hacker-text">[X]</button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        {/* Main Tabs */}
        {activeTab === TABS.PROJECTS && (
          <ProjectsTab
            onEditClaudeMd={(projectName) => {
              setSelectedProject(projectName);
              fetchClaudeMd(projectName);
              setClaudeMdModalProject(projectName);
            }}
            onCreateProject={() => setShowProjectCreator(true)}
            onRenameProject={setRenameProject}
            onDeleteProject={setDeleteConfirm}
            onComplianceCheck={setComplianceCheckProject}
          />
        )}

        {activeTab === TABS.SETTINGS && <SettingsTab />}

        {activeTab === TABS.AUTOMATION && <AutomationTab currentProject={currentProject} />}

        {/* Admin-only tabs with RBAC check (Phase 3) */}
        {activeTab === TABS.SERVER && (
          canAccessTab(TABS.SERVER, hasRole) ? (
            <ServerTab />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <svg className="w-16 h-16 text-hacker-error/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-mono text-hacker-error mb-2">ACCESS DENIED</h3>
              <p className="text-sm text-hacker-text-dim font-mono">Server management requires ADMIN role or higher</p>
              <p className="text-xs text-hacker-text-dim/50 font-mono mt-2">Current role: {userRole}</p>
            </div>
          )
        )}

        {activeTab === TABS.SECURITY && (
          canAccessTab(TABS.SECURITY, hasRole) ? (
            <SecurityTab selectedProject={selectedProject} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <svg className="w-16 h-16 text-hacker-error/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-mono text-hacker-error mb-2">ACCESS DENIED</h3>
              <p className="text-sm text-hacker-text-dim font-mono">Security management requires ADMIN role or higher</p>
              <p className="text-xs text-hacker-text-dim/50 font-mono mt-2">Current role: {userRole}</p>
            </div>
          )
        )}

        {activeTab === TABS.HISTORY && <HistoryTab />}

        {/* Experimental Tabs */}
        {userSettings?.showExperimentalFeatures && activeTab === TABS.DEVELOPMENT && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">{'>'} DEVELOPMENT_TOOLS</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> API TESTER</h4>
                <ApiTester embedded={true} />
              </div>
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> GIT WORKFLOW</h4>
                <GitWorkflow embedded={true} projectPath={currentProject?.path} />
              </div>
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> FILE BROWSER</h4>
                <FileBrowser embedded={true} projectPath={currentProject?.path} />
              </div>
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> DIFF VIEWER</h4>
                <DiffViewer embedded={true} />
              </div>
            </div>
            <div className="hacker-card p-4">
              <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> DATABASE BROWSER</h4>
              <DatabaseBrowser embedded={true} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> DEPENDENCIES</h4>
                <DependencyDashboard embedded={true} projectPath={currentProject?.path} />
              </div>
              <div className="hacker-card p-4">
                <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2"><span>&#9654;</span> LOG VIEWER</h4>
                <LogViewer embedded={true} />
              </div>
            </div>
          </div>
        )}

        {userSettings?.showExperimentalFeatures && activeTab === TABS.CODE_PUPPY && (
          <CodePuppyDashboard onClose={() => setActiveTab(TABS.PROJECTS)} />
        )}

        {userSettings?.showExperimentalFeatures && activeTab === TABS.TABBY && (
          <TabbyDashboard onClose={() => setActiveTab(TABS.PROJECTS)} />
        )}

        {userSettings?.showExperimentalFeatures && activeTab === TABS.SWARM && (
          <SwarmDashboard projectPath={selectedProject?.path} socket={null} onClose={() => setActiveTab(TABS.PROJECTS)} />
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-hacker-green/10 bg-hacker-surface/50 font-mono text-xs text-hacker-text-dim flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-hacker-green">CP://SYSTEM</span>
          <span>v1.0.22</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TAB: {activeTab.toUpperCase()}</span>
          <span className="text-hacker-cyan">{new Date().toLocaleDateString()}</span>
        </div>
      </footer>

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
                {hasUnsavedChanges && <span className="hacker-badge hacker-badge-warning text-xs">UNSAVED</span>}
                <button onClick={saveClaudeMd} disabled={loading || !hasUnsavedChanges} className="hacker-btn disabled:opacity-50">{loading ? '[SAVING...]' : '[SAVE]'}</button>
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
                >[CLOSE]</button>
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
                <input type="checkbox" checked={deleteConfirm.permanent} onChange={(e) => setDeleteConfirm({ ...deleteConfirm, permanent: e.target.checked })} className="w-4 h-4 accent-hacker-error" />
                <span className="text-sm text-hacker-text-dim">Permanently delete (cannot be recovered)</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="hacker-btn">CANCEL</button>
              <button onClick={() => deleteProject(deleteConfirm.name, deleteConfirm.permanent)} className="px-4 py-2 bg-hacker-error text-white font-mono text-sm rounded hover:bg-hacker-error/80">
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
            <p className="text-hacker-text mb-4">Current name: <span className="font-bold text-hacker-cyan">{renameProject.name}</span></p>
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
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRenameProject(null)} className="hacker-btn">CANCEL</button>
              <button
                onClick={() => handleRenameProject(renameProject.name, renameProject.newName)}
                disabled={!renameProject.newName || renameProject.newName === renameProject.name}
                className="px-4 py-2 bg-hacker-cyan text-hacker-bg font-mono text-sm rounded hover:bg-hacker-cyan/80 disabled:opacity-50"
              >RENAME</button>
            </div>
          </div>
        </div>
      )}

      {/* Project Creator Modal */}
      <ProjectCreator
        isOpen={showProjectCreator}
        onClose={() => setShowProjectCreator(false)}
        onProjectCreated={() => setShowProjectCreator(false)}
      />

      {/* Compliance Checker Modal */}
      <ComplianceChecker
        isOpen={!!complianceCheckProject}
        projectPath={complianceCheckProject?.path}
        projectName={complianceCheckProject?.name}
        onClose={() => setComplianceCheckProject(null)}
        onMigrate={() => {}}
      />
    </div>
  );
}

export default AdminDashboard;
