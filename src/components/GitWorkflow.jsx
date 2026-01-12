/**
 * Git Workflow Component
 * Git automation panel for common operations
 */

import { useState, useEffect, useCallback } from 'react';

const GIT_OPERATIONS = [
  { id: 'status', name: 'Status', icon: '📋', description: 'View repository status' },
  { id: 'pull', name: 'Pull', icon: '⬇️', description: 'Pull latest changes' },
  { id: 'push', name: 'Push', icon: '⬆️', description: 'Push commits to remote' },
  { id: 'commit', name: 'Commit', icon: '💾', description: 'Commit staged changes' },
  { id: 'stash', name: 'Stash', icon: '📦', description: 'Stash current changes' },
  { id: 'branch', name: 'Branch', icon: '🌿', description: 'Create new branch' },
];

export default function GitWorkflow({
  projectPath,
  isOpen,
  onClose,
  onExecute,
  embedded = false,
}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  // Fetch git status
  const fetchStatus = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const response = await fetch('/api/git/' + encodeURIComponent(projectPath) + '/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch git status:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // Execute git operation
  const executeOperation = async (operation, params = {}) => {
    setExecuting(operation);
    setError(null);
    setOutput('');

    try {
      const response = await fetch('/api/git/' + encodeURIComponent(projectPath) + '/' + operation, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.output || 'Operation completed successfully');
        if (onExecute) onExecute(operation, data);
        // Refresh status
        setTimeout(fetchStatus, 500);
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(null);
    }
  };

  // Quick commit
  const handleQuickCommit = async () => {
    if (!commitMessage.trim()) return;
    await executeOperation('commit', { message: commitMessage, addAll: true });
    setCommitMessage('');
  };

  // Create branch
  const handleCreateBranch = async () => {
    if (!branchName.trim()) return;
    await executeOperation('branch', { name: branchName });
    setBranchName('');
  };

  // Generate AI commit message
  const generateCommitMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/commit-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });
      if (response.ok) {
        const data = await response.json();
        setCommitMessage(data.message || '');
      }
    } catch (err) {
      console.error('Failed to generate commit message:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !embedded) return null;

  const hasChanges = status && (status.staged?.length > 0 || status.unstaged?.length > 0 || status.untracked?.length > 0);
  const canPush = status && status.ahead > 0;
  const canPull = status && status.behind > 0;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        {GIT_OPERATIONS.slice(0, 3).map(op => (
          <button
            key={op.id}
            onClick={() => executeOperation(op.id)}
            disabled={executing !== null}
            className="p-2 text-xs rounded hover:bg-white/10 flex flex-col items-center gap-1"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="text-lg">{op.icon}</span>
            <span className="text-muted">{op.name}</span>
          </button>
        ))}
      </div>

      {/* Quick commit */}
      <div className="flex gap-2">
        <input
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="flex-1 px-3 py-2 text-sm rounded"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        />
        <button
          onClick={handleQuickCommit}
          disabled={!commitMessage.trim() || executing !== null}
          className="px-3 py-2 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          Commit
        </button>
      </div>

      {/* Output */}
      {(output || error) && (
        <div className="p-2 rounded text-xs font-mono max-h-24 overflow-auto"
          style={{ background: 'var(--bg-tertiary)', color: error ? '#e74c3c' : 'var(--text-secondary)' }}>
          {error || output}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Git Workflow</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 text-muted hover:text-primary rounded"
              title="Refresh"
            >
              <svg className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Repository status */}
          {status && (
            <div className="grid grid-cols-2 gap-4">
              {/* Branch info */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-sm font-medium text-primary">Branch</span>
                </div>
                <div className="font-mono text-accent">{status.branch || 'unknown'}</div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  {status.ahead > 0 && (
                    <span className="text-green-400">↑ {status.ahead} ahead</span>
                  )}
                  {status.behind > 0 && (
                    <span className="text-yellow-400">↓ {status.behind} behind</span>
                  )}
                  {!status.ahead && !status.behind && (
                    <span className="text-muted">Up to date</span>
                  )}
                </div>
              </div>

              {/* Changes summary */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-primary">Changes</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-400">{status.staged?.length || 0} staged</span>
                  <span className="text-yellow-400">{status.unstaged?.length || 0} modified</span>
                  <span className="text-muted">{status.untracked?.length || 0} untracked</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => executeOperation('pull')}
                disabled={executing || !canPull}
                className={'flex items-center gap-2 p-3 rounded-lg transition-colors ' +
                  (canPull ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-white/5 text-muted')}
              >
                <span>⬇️</span>
                <span className="text-sm">Pull</span>
                {executing === 'pull' && <span className="text-xs animate-pulse">...</span>}
              </button>
              <button
                onClick={() => executeOperation('push')}
                disabled={executing || !canPush}
                className={'flex items-center gap-2 p-3 rounded-lg transition-colors ' +
                  (canPush ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-white/5 text-muted')}
              >
                <span>⬆️</span>
                <span className="text-sm">Push</span>
                {executing === 'push' && <span className="text-xs animate-pulse">...</span>}
              </button>
              <button
                onClick={() => executeOperation('stash')}
                disabled={executing || !hasChanges}
                className={'flex items-center gap-2 p-3 rounded-lg transition-colors ' +
                  (hasChanges ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-white/5 text-muted')}
              >
                <span>📦</span>
                <span className="text-sm">Stash</span>
                {executing === 'stash' && <span className="text-xs animate-pulse">...</span>}
              </button>
            </div>
          </div>

          {/* Quick commit */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-secondary">Quick Commit</h3>
              <button
                onClick={generateCommitMessage}
                disabled={loading || !hasChanges}
                className="text-xs text-accent hover:underline disabled:opacity-50"
              >
                Generate with AI
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickCommit()}
              />
              <button
                onClick={handleQuickCommit}
                disabled={!commitMessage.trim() || !hasChanges || executing}
                className="px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent/80 disabled:opacity-50"
              >
                {executing === 'commit' ? 'Committing...' : 'Commit All'}
              </button>
            </div>
            <p className="text-xs text-muted mt-1">This will stage all changes and commit</p>
          </div>

          {/* Create branch */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <h3 className="text-sm font-medium text-secondary mb-2">Create Branch</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="feature/my-feature"
                className="flex-1 px-3 py-2 rounded text-sm font-mono"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
              />
              <button
                onClick={handleCreateBranch}
                disabled={!branchName.trim() || executing}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded text-sm hover:bg-purple-500/30 disabled:opacity-50"
              >
                {executing === 'branch' ? 'Creating...' : 'Create & Switch'}
              </button>
            </div>
          </div>

          {/* Output/Error */}
          {(output || error) && (
            <div className={'p-3 rounded-lg font-mono text-sm ' + (error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400')}>
              <pre className="whitespace-pre-wrap">{error || output}</pre>
            </div>
          )}

          {/* Changed files */}
          {status && (status.staged?.length > 0 || status.unstaged?.length > 0) && (
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Changed Files</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(status.staged || []).map((file, i) => (
                  <div key={'staged-' + i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-green-400">staged</span>
                    <span className="font-mono text-secondary">{file}</span>
                  </div>
                ))}
                {(status.unstaged || []).map((file, i) => (
                  <div key={'unstaged-' + i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-yellow-400">modified</span>
                    <span className="font-mono text-secondary">{file}</span>
                  </div>
                ))}
                {(status.untracked || []).map((file, i) => (
                  <div key={'untracked-' + i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-muted">new</span>
                    <span className="font-mono text-secondary">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span className="font-mono truncate">{projectPath}</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
