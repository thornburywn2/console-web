/**
 * GitHub Project Panel
 * Displays GitHub info and actions for a project in the RightSidebar
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { githubProjectsApi } from '../services/api.js';

// GitHub Octocat icon
function GitHubIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

// Status color map
const STATUS_COLORS = {
  synced: 'var(--accent-primary)',
  ahead: '#f59e0b',
  behind: '#f97316',
  diverged: '#ef4444',
  error: '#ef4444'
};

// Workflow conclusion colors
const CONCLUSION_COLORS = {
  success: '#22c55e',
  failure: '#ef4444',
  cancelled: '#6b7280',
  skipped: '#9ca3af'
};

export default function GitHubProjectPanel({ project, onRefresh, onOpenSettings }) {
  const [githubData, setGithubData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', isPrivate: true });
  const [workflowRuns, setWorkflowRuns] = useState([]);

  // Fetch GitHub data for project
  const fetchGitHubData = useCallback(async () => {
    if (!project?.name) return;

    setLoading(true);
    setError('');

    try {
      const data = await githubProjectsApi.get(project.name);
      setGithubData(data);

      // Fetch workflow runs if linked
      if (data.linked) {
        try {
          const runsData = await githubProjectsApi.getRuns(project.name, 5);
          setWorkflowRuns(runsData.runs || []);
        } catch {
          // Workflow runs are optional, don't fail on error
        }
      }
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      if (message !== 'GitHub not authenticated') {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [project?.name]);

  useEffect(() => {
    fetchGitHubData();
  }, [fetchGitHubData]);

  // Sync actions
  const handlePush = async () => {
    setSyncing('push');
    try {
      await githubProjectsApi.push(project.name);
      await fetchGitHubData();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setSyncing(null);
    }
  };

  const handlePull = async () => {
    setSyncing('pull');
    try {
      await githubProjectsApi.pull(project.name);
      await fetchGitHubData();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setSyncing(null);
    }
  };

  const handleFetch = async () => {
    setSyncing('fetch');
    try {
      await githubProjectsApi.fetch(project.name);
      await fetchGitHubData();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setSyncing(null);
    }
  };

  // Create new repo
  const handleCreateRepo = async (e) => {
    e.preventDefault();
    setSyncing('create');
    setError('');

    try {
      await githubProjectsApi.create(project.name, {
        name: createForm.name || project.name,
        isPrivate: createForm.isPrivate
      });

      setShowCreateForm(false);
      await fetchGitHubData();
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setSyncing(null);
    }
  };

  // Unlink repo
  const handleUnlink = async () => {
    if (!confirm('Unlink this GitHub repository? (This will not delete the remote repo)')) return;

    try {
      await githubProjectsApi.unlink(project.name);
      setGithubData({ linked: false });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    }
  };

  if (!project) {
    return (
      <div className="text-sm text-muted text-center py-4">
        Select a project to view GitHub info
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not linked - show connect options
  if (!githubData?.linked) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted text-center py-2">
          Not linked to GitHub
        </div>

        {/* Create New Repo */}
        {showCreateForm ? (
          <form onSubmit={handleCreateRepo} className="space-y-3">
            <div>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder={project.name}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                checked={createForm.isPrivate}
                onChange={(e) => setCreateForm(f => ({ ...f, isPrivate: e.target.checked }))}
                className="rounded"
              />
              Private repository
            </label>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-2 text-sm rounded"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={syncing === 'create'}
                className="flex-1 py-2 text-sm font-medium rounded"
                style={{ background: 'var(--accent-primary)', color: 'black' }}
              >
                {syncing === 'create' ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded transition-colors"
            style={{ background: 'var(--accent-primary)', color: 'black' }}
          >
            <GitHubIcon className="w-4 h-4" />
            Push to GitHub
          </button>
        )}

        {/* Settings Link */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full py-2 text-sm text-accent hover:underline"
          >
            GitHub Settings
          </button>
        )}
      </div>
    );
  }

  const repo = githubData.repo;

  return (
    <div className="space-y-3">
      {/* Repo Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent hover:underline flex items-center gap-1"
          >
            <GitHubIcon className="w-3.5 h-3.5" />
            {repo.fullName}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {repo.isPrivate ? (
            <span className="px-1.5 py-0.5 text-2xs rounded bg-yellow-500/20 text-yellow-400">
              Private
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-2xs rounded bg-green-500/20 text-green-400">
              Public
            </span>
          )}
        </div>

        {/* Sync Status */}
        <div
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <span className="text-muted">Status:</span>
          <span
            className="font-medium"
            style={{ color: STATUS_COLORS[repo.lastSyncStatus] || 'var(--text-secondary)' }}
          >
            {repo.lastSyncStatus === 'synced' && 'Synced'}
            {repo.lastSyncStatus === 'ahead' && `${repo.aheadBy} ahead`}
            {repo.lastSyncStatus === 'behind' && `${repo.behindBy} behind`}
            {repo.lastSyncStatus === 'diverged' && `${repo.aheadBy}↑ ${repo.behindBy}↓`}
            {repo.lastSyncStatus === 'error' && 'Error'}
            {!repo.lastSyncStatus && 'Unknown'}
          </span>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleFetch}
          disabled={syncing}
          className="flex-1 py-1.5 text-xs rounded flex items-center justify-center gap-1 transition-colors hover:bg-white/10"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          title="Fetch from remote"
        >
          {syncing === 'fetch' ? (
            <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Fetch
        </button>
        <button
          onClick={handlePull}
          disabled={syncing || repo.behindBy === 0}
          className="flex-1 py-1.5 text-xs rounded flex items-center justify-center gap-1 transition-colors hover:bg-white/10"
          style={{
            background: repo.behindBy > 0 ? 'var(--accent-secondary)' : 'var(--bg-tertiary)',
            color: repo.behindBy > 0 ? 'black' : 'var(--text-muted)'
          }}
          title="Pull from remote"
        >
          {syncing === 'pull' ? (
            <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          Pull
        </button>
        <button
          onClick={handlePush}
          disabled={syncing || repo.aheadBy === 0}
          className="flex-1 py-1.5 text-xs rounded flex items-center justify-center gap-1 transition-colors hover:bg-white/10"
          style={{
            background: repo.aheadBy > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: repo.aheadBy > 0 ? 'black' : 'var(--text-muted)'
          }}
          title="Push to remote"
        >
          {syncing === 'push' ? (
            <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
          Push
        </button>
      </div>

      {/* Workflow Runs */}
      {workflowRuns.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted">Recent Workflows</div>
          {workflowRuns.slice(0, 3).map(run => (
            <a
              key={run.id}
              href={run.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-white/5 transition-colors"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="truncate text-secondary">{run.name}</span>
              <span
                className="flex items-center gap-1"
                style={{ color: CONCLUSION_COLORS[run.conclusion] || 'var(--text-muted)' }}
              >
                {run.status === 'in_progress' ? (
                  <span className="animate-spin w-2.5 h-2.5 border border-current border-t-transparent rounded-full" />
                ) : run.conclusion === 'success' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : run.conclusion === 'failure' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : null}
                #{run.runNumber}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
          {error}
        </div>
      )}

      {/* Unlink */}
      <button
        onClick={handleUnlink}
        className="w-full py-1.5 text-xs text-muted hover:text-red-400 transition-colors"
      >
        Unlink Repository
      </button>
    </div>
  );
}
