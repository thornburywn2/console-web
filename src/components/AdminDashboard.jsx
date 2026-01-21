/**
 * AdminDashboard - Two-Column Layout with Vertical Navigation
 * Clean, cohesive design matching the sidebars
 *
 * Layout:
 * - Left: AdminNav sidebar (200px)
 * - Right: Content area with tab content
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Import navigation component
import AdminNav from './admin/AdminNav';

// Import tab components
import ProjectsTab from './admin/tabs/ProjectsTab';
import SettingsTab from './admin/tabs/SettingsTab';
import AutomationTab from './admin/tabs/AutomationTab';
import ServerTab from './admin/tabs/ServerTab';
import SecurityTab from './admin/tabs/SecurityTab';
import HistoryTab from './admin/tabs/HistoryTab';

// Import tab constants and RBAC utilities
import {
  TABS,
  AUTOMATION_TABS,
  SERVER_TABS,
  SECURITY_TABS,
  migrateTab,
  canAccessTab,
  DEFAULT_SUB_TABS,
} from './admin/constants';

// Import auth hook for RBAC
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

// Import shared panel component
import Panel, { PanelGroup } from './shared/Panel';

// Re-export for use in SettingsPanel
export { GitHubSettingsTab, CloudflareSettingsTab };

// Re-export TABS for backward compatibility
export { TABS };

/**
 * GitHubSettingsTab - GitHub Integration Settings
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
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-mono">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelGroup>
          <Panel id="github-auth" title="Authentication" icon="🔐" defaultExpanded={true}>
            {authStatus?.authenticated ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  {authStatus.avatarUrl && (
                    <img src={authStatus.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--text-primary)]">{authStatus.username}</span>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">Connected</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="w-full py-2 px-4 text-sm font-mono rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {saving ? 'Disconnecting...' : 'Disconnect GitHub'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-muted)] mb-2">Personal Access Token</label>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="ghp_xxxx"
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !accessToken.trim()}
                  className="w-full py-2 px-4 text-sm font-mono rounded bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/50 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30 disabled:opacity-50"
                >
                  {saving ? 'Connecting...' : 'Connect GitHub'}
                </button>
              </form>
            )}
          </Panel>
        </PanelGroup>

        <PanelGroup>
          <Panel id="github-repos" title="Linked Repositories" icon="📂" badge={linkedRepos.length} defaultExpanded={true}>
            {linkedRepos.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] font-mono">No repositories linked</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {linkedRepos.map(repo => (
                  <div key={repo.id} className="p-2 rounded bg-[var(--bg-tertiary)] text-xs font-mono">
                    <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                      {repo.fullName}
                    </a>
                    <div className="text-[var(--text-muted)]">{repo.isPrivate ? '🔒 Private' : '🌐 Public'}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

/**
 * CloudflareSettingsTab - Cloudflare Tunnel Settings
 */
function CloudflareSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [routes, setRoutes] = useState([]);
  const [formData, setFormData] = useState({
    apiToken: '', accountId: '', tunnelId: '', zoneName: 'example.com',
  });

  useEffect(() => {
    fetchSettings();
    fetchRoutes();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get('/cloudflare/settings');
      if (data.configured) {
        setSettings(data);
        setFormData(prev => ({ ...prev, accountId: data.accountId || '', tunnelId: data.tunnelId || '', zoneName: data.zoneName || 'example.com' }));
      }
    } catch {
      setError('Failed to fetch Cloudflare settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const data = await api.get('/cloudflare/routes/mapped');
      setRoutes(data.routes || []);
    } catch {
      console.error('Failed to fetch routes');
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
      setSuccess('Cloudflare settings saved!');
      setFormData(prev => ({ ...prev, apiToken: '' }));
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Cloudflare?')) return;
    setSaving(true);
    try {
      await api.delete('/cloudflare/settings');
      setSettings(null);
      setSuccess('Cloudflare disconnected');
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-mono">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelGroup>
          <Panel id="cf-config" title="Configuration" icon="☁️" defaultExpanded={true}>
            {settings?.configured ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-primary)] font-mono">{settings.tunnelName || 'Tunnel'}</span>
                    <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">Connected</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-mono mt-1">Zone: {settings.zoneName}</div>
                </div>
                <button onClick={handleDisconnect} disabled={saving} className="w-full py-2 px-4 text-sm font-mono rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                  {saving ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">API Token</label>
                  <input type="password" value={formData.apiToken} onChange={(e) => setFormData(prev => ({ ...prev, apiToken: e.target.value }))} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">Account ID</label>
                    <input type="text" value={formData.accountId} onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">Tunnel ID</label>
                    <input type="text" value={formData.tunnelId} onChange={(e) => setFormData(prev => ({ ...prev, tunnelId: e.target.value }))} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/50" />
                  </div>
                </div>
                <button type="submit" disabled={saving || !formData.apiToken.trim()} className="w-full py-2 px-4 text-sm font-mono rounded bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </form>
            )}
          </Panel>
        </PanelGroup>

        <PanelGroup>
          <Panel id="cf-routes" title="Published Routes" icon="🌐" badge={routes.length} defaultExpanded={true}>
            {routes.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] font-mono">No routes configured</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {routes.slice(0, 10).map(route => (
                  <div key={route.id} className="p-2 rounded bg-[var(--bg-tertiary)] text-xs font-mono">
                    <a href={`https://${route.hostname}`} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                      {route.hostname}
                    </a>
                    <div className="text-[var(--text-muted)]">Port: {route.localPort}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

/**
 * DevToolsContent - Development tools panel content
 */
function DevToolsContent({ currentProject }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <PanelGroup>
          <Panel id="dev-api" title="API Tester" icon="🔌" defaultExpanded={true}>
            <ApiTester embedded={true} />
          </Panel>
        </PanelGroup>

        <PanelGroup>
          <Panel id="dev-git" title="Git Workflow" icon="🔀" defaultExpanded={true}>
            <GitWorkflow embedded={true} projectPath={currentProject?.path} />
          </Panel>
        </PanelGroup>

        <PanelGroup>
          <Panel id="dev-files" title="File Browser" icon="📁" defaultExpanded={true}>
            <FileBrowser embedded={true} projectPath={currentProject?.path} />
          </Panel>
        </PanelGroup>

        <PanelGroup>
          <Panel id="dev-diff" title="Diff Viewer" icon="📝" defaultExpanded={true}>
            <DiffViewer embedded={true} />
          </Panel>
        </PanelGroup>
      </div>

      <PanelGroup>
        <Panel id="dev-db" title="Database Browser" icon="💾" defaultExpanded={true}>
          <DatabaseBrowser embedded={true} />
        </Panel>
      </PanelGroup>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelGroup>
          <Panel id="dev-deps" title="Dependencies" icon="📦" defaultExpanded={true}>
            <DependencyDashboard embedded={true} projectPath={currentProject?.path} />
          </Panel>
        </PanelGroup>

        <PanelGroup>
          <Panel id="dev-logs" title="Log Viewer" icon="📜" defaultExpanded={true}>
            <LogViewer embedded={true} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

/**
 * Main AdminDashboard Component
 */
function AdminDashboard({ onClose, initialTab = null, currentProject = null }) {
  const { hasRole, userRole } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return migrateTab(initialTab);
    return TABS.PROJECTS;
  });

  const [activeSubTab, setActiveSubTab] = useState(() => {
    return DEFAULT_SUB_TABS[activeTab] || null;
  });

  // UI state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // User settings
  const [userSettings, setUserSettings] = useState(null);

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
  const [loading, setLoading] = useState(false);

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get('/settings');
        setUserSettings(data);
      } catch {
        console.error('Error fetching user settings');
      }
    };
    fetchSettings();
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setActiveSubTab(DEFAULT_SUB_TABS[tab] || null);
  }, []);

  // CLAUDE.md operations
  const fetchClaudeMd = useCallback(async (projectName) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/claude-md/${encodeURIComponent(projectName)}`);
      setClaudeMd(data);
      setClaudeMdEdited(data.content || '');
      setHasUnsavedChanges(false);
    } catch {
      console.error('Error fetching CLAUDE.md');
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
      await api.post(`/projects/${encodeURIComponent(oldName)}/rename`, { newName });
      setRenameProject(null);
      setSuccess(`Project renamed to ${newName}`);
    } catch (err) {
      setError(err.getUserMessage ? err.getUserMessage() : err.message);
    }
  }, []);

  // Access denied component
  const AccessDenied = ({ requiredRole }) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <svg className="w-16 h-16 text-red-500/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 className="text-lg font-mono text-red-400 mb-2">Access Denied</h3>
      <p className="text-sm text-[var(--text-muted)] font-mono">Requires {requiredRole} role or higher</p>
      <p className="text-xs text-[var(--text-muted)]/50 font-mono mt-2">Current role: {userRole}</p>
    </div>
  );

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case TABS.PROJECTS:
        return (
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
        );

      case TABS.SETTINGS:
        return <SettingsTab />;

      case TABS.AUTOMATION:
        return <AutomationTab currentProject={currentProject} activeSubTab={activeSubTab} />;

      case TABS.SERVER:
        return canAccessTab(TABS.SERVER, hasRole) ? (
          <ServerTab activeSubTab={activeSubTab} />
        ) : (
          <AccessDenied requiredRole="ADMIN" />
        );

      case TABS.SECURITY:
        return canAccessTab(TABS.SECURITY, hasRole) ? (
          <SecurityTab selectedProject={selectedProject} activeSubTab={activeSubTab} />
        ) : (
          <AccessDenied requiredRole="ADMIN" />
        );

      case TABS.HISTORY:
        return <HistoryTab />;

      case TABS.DEVELOPMENT:
        return userSettings?.showExperimentalFeatures ? (
          <DevToolsContent currentProject={currentProject} />
        ) : null;

      case TABS.CODE_PUPPY:
        return userSettings?.showExperimentalFeatures ? (
          <CodePuppyDashboard onClose={() => handleTabChange(TABS.PROJECTS)} />
        ) : null;

      case TABS.TABBY:
        return userSettings?.showExperimentalFeatures ? (
          <TabbyDashboard onClose={() => handleTabChange(TABS.PROJECTS)} />
        ) : null;

      case TABS.SWARM:
        return userSettings?.showExperimentalFeatures ? (
          <SwarmDashboard projectPath={selectedProject?.path} socket={null} onClose={() => handleTabChange(TABS.PROJECTS)} />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[var(--bg-base)]">
      {/* Navigation Sidebar */}
      <AdminNav
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onTabChange={handleTabChange}
        onSubTabChange={setActiveSubTab}
        showExperimentalFeatures={userSettings?.showExperimentalFeatures}
        onClose={onClose}
      />

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
          <div>
            <h1 className="text-lg font-semibold text-[var(--accent-primary)] font-mono tracking-wide uppercase">
              {activeTab.replace(/_/g, ' ')}
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              {activeSubTab ? activeSubTab.replace(/_/g, ' ').toUpperCase() : 'Admin Dashboard'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-mono rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>
        </header>

        {/* Notifications */}
        {(error || success) && (
          <div className="px-6 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-300">×</button>
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-mono flex items-center justify-between">
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="hover:text-emerald-300">×</button>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>

      {/* Modals */}
      {/* CLAUDE.md Editor */}
      {claudeMdModalProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-6 w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--accent-primary)] font-mono">
                CLAUDE.md - {claudeMdModalProject}
              </h3>
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">Unsaved</span>
                )}
                <button
                  onClick={saveClaudeMd}
                  disabled={loading || !hasUnsavedChanges}
                  className="px-3 py-1.5 text-sm font-mono rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) return;
                    setClaudeMdModalProject(null);
                    setHasUnsavedChanges(false);
                  }}
                  className="px-3 py-1.5 text-sm font-mono rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5"
                >
                  Close
                </button>
              </div>
            </div>
            <textarea
              value={claudeMdEdited}
              onChange={(e) => {
                setClaudeMdEdited(e.target.value);
                setHasUnsavedChanges(e.target.value !== claudeMd.content);
              }}
              className="flex-1 w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded font-mono text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent-primary)]/50"
              placeholder="# Project instructions..."
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-400 mb-4">Delete Project</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Delete <span className="font-mono text-[var(--accent-primary)]">{deleteConfirm.name}</span>?
            </p>
            <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirm.permanent}
                  onChange={(e) => setDeleteConfirm({ ...deleteConfirm, permanent: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--text-muted)]">Permanently delete (cannot be recovered)</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-mono rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5">
                Cancel
              </button>
              <button onClick={() => deleteProject(deleteConfirm.name, deleteConfirm.permanent)} className="px-4 py-2 text-sm font-mono rounded bg-red-500 text-white hover:bg-red-600">
                {deleteConfirm.permanent ? 'Delete Permanently' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Project */}
      {renameProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--accent-primary)] mb-4">Rename Project</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Current: <span className="font-mono text-[var(--accent-primary)]">{renameProject.name}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-muted)] mb-2">New name:</label>
              <input
                type="text"
                value={renameProject.newName}
                onChange={(e) => setRenameProject({ ...renameProject, newName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameProject(renameProject.name, renameProject.newName);
                  if (e.key === 'Escape') setRenameProject(null);
                }}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/50"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRenameProject(null)} className="px-4 py-2 text-sm font-mono rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={() => handleRenameProject(renameProject.name, renameProject.newName)}
                disabled={!renameProject.newName || renameProject.newName === renameProject.name}
                className="px-4 py-2 text-sm font-mono rounded bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/90 disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Creator */}
      <ProjectCreator
        isOpen={showProjectCreator}
        onClose={() => setShowProjectCreator(false)}
        onProjectCreated={() => setShowProjectCreator(false)}
      />

      {/* Compliance Checker */}
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
