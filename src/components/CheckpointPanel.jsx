/**
 * Checkpoint Panel Component
 * Session and project state snapshots for rollback capability
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { CHECKPOINT_TYPES, formatSize, formatRelativeTime } from './checkpoint-panel';
import { checkpointsApi } from '../services/api.js';

export default function CheckpointPanel({
  projectId,
  projectPath,
  sessionId,
  isOpen,
  onClose,
}) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [showDetails, setShowDetails] = useState(null);

  // New checkpoint state
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointDescription, setCheckpointDescription] = useState('');
  const [includeGit, setIncludeGit] = useState(true);
  const [includeFiles, setIncludeFiles] = useState(false);
  const [filePaths, setFilePaths] = useState('');

  // Fetch checkpoints
  const fetchCheckpoints = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await checkpointsApi.getByProject(projectId);
      setCheckpoints(data);
    } catch (err) {
      console.error('Failed to fetch checkpoints:', err.getUserMessage?.() || err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await checkpointsApi.getStats(projectId);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch checkpoint stats:', err.getUserMessage?.() || err.message);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      fetchCheckpoints();
      fetchStats();
    }
  }, [isOpen, fetchCheckpoints, fetchStats]);

  // Create checkpoint
  const createCheckpoint = async () => {
    setCreating(true);
    try {
      await checkpointsApi.create({
        projectId,
        sessionId,
        name: checkpointName || undefined,
        description: checkpointDescription || undefined,
        type: 'MANUAL',
        includeGit,
        includeFiles,
        filePaths: includeFiles ? filePaths.split('\n').filter(p => p.trim()) : [],
      });

      setCheckpointName('');
      setCheckpointDescription('');
      setIncludeFiles(false);
      setFilePaths('');
      await fetchCheckpoints();
      await fetchStats();
    } catch (err) {
      console.error('Failed to create checkpoint:', err.getUserMessage?.() || err.message);
    } finally {
      setCreating(false);
    }
  };

  // Restore checkpoint
  const restoreCheckpoint = async (id) => {
    if (!confirm('Restore from this checkpoint? This will modify files in the project.')) {
      return;
    }

    setRestoring(id);
    try {
      const result = await checkpointsApi.restore(id, {
        restoreGit: true,
        restoreFiles: true,
      });

      const warnings = result.results?.warnings || [];
      if (warnings.length > 0) {
        alert('Restored with warnings:\n' + warnings.join('\n'));
      } else {
        alert('Checkpoint restored successfully!');
      }
    } catch (err) {
      console.error('Failed to restore checkpoint:', err.getUserMessage?.() || err.message);
      alert('Failed to restore checkpoint');
    } finally {
      setRestoring(null);
    }
  };

  // Toggle pin
  const togglePin = async (checkpoint) => {
    try {
      await checkpointsApi.update(checkpoint.id, { isPinned: !checkpoint.isPinned });
      await fetchCheckpoints();
    } catch (err) {
      console.error('Failed to toggle pin:', err.getUserMessage?.() || err.message);
    }
  };

  // Delete checkpoint
  const deleteCheckpoint = async (id) => {
    if (!confirm('Delete this checkpoint?')) return;

    try {
      await checkpointsApi.delete(id);
      await fetchCheckpoints();
      await fetchStats();
    } catch (err) {
      console.error('Failed to delete checkpoint:', err.getUserMessage?.() || err.message);
    }
  };

  // Cleanup expired
  const cleanupExpired = async () => {
    if (!confirm('Delete all expired checkpoints?')) return;

    try {
      const result = await checkpointsApi.cleanup();
      alert(`Cleaned up ${result.deleted} expired checkpoints`);
      await fetchCheckpoints();
      await fetchStats();
    } catch (err) {
      console.error('Failed to cleanup checkpoints:', err.getUserMessage?.() || err.message);
    }
  };

  if (!isOpen) return null;

  const typeInfo = (type) => CHECKPOINT_TYPES[type] || CHECKPOINT_TYPES.MANUAL;

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Checkpoints</h2>
            {stats && (
              <span className="text-xs text-muted">
                ({stats.total} total, {stats.pinned} pinned)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cleanupExpired}
              className="px-3 py-1.5 text-sm text-muted hover:text-primary hover:bg-white/5 rounded"
              title="Clean up expired checkpoints"
            >
              Cleanup
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
          {/* Stats bar */}
          {stats && (
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(stats.byType || {}).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: 'var(--bg-glass)' }}
                >
                  <span className="text-lg">{typeInfo(type).icon}</span>
                  <div>
                    <div className="text-xs text-muted">{typeInfo(type).label}</div>
                    <div className="text-sm font-medium text-primary">{count}</div>
                  </div>
                </div>
              ))}
              <div
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{ background: 'var(--bg-glass)' }}
              >
                <span className="text-lg">💾</span>
                <div>
                  <div className="text-xs text-muted">Total Size</div>
                  <div className="text-sm font-medium text-primary">{formatSize(stats.totalSizeBytes)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Create checkpoint */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <h3 className="text-sm font-medium text-primary mb-3">Create Checkpoint</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={checkpointName}
                  onChange={(e) => setCheckpointName(e.target.value)}
                  placeholder="Checkpoint name (optional)"
                  className="px-3 py-2 rounded text-sm"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
                <input
                  type="text"
                  value={checkpointDescription}
                  onChange={(e) => setCheckpointDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="px-3 py-2 rounded text-sm"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGit}
                    onChange={(e) => setIncludeGit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-secondary">Include Git state</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFiles}
                    onChange={(e) => setIncludeFiles(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-secondary">Include file snapshots</span>
                </label>
              </div>

              {includeFiles && (
                <textarea
                  value={filePaths}
                  onChange={(e) => setFilePaths(e.target.value)}
                  placeholder="File paths to snapshot (one per line, relative to project root)"
                  rows={3}
                  className="w-full px-3 py-2 rounded text-sm font-mono"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
              )}

              <div className="flex justify-end">
                <button
                  onClick={createCheckpoint}
                  disabled={creating}
                  className="px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent/80 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Checkpoint
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Checkpoint list */}
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">Checkpoint History</h3>
            {loading ? (
              <div className="p-8 text-center text-muted">Loading checkpoints...</div>
            ) : checkpoints.length === 0 ? (
              <div className="p-8 text-center rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <div className="text-4xl mb-3">📍</div>
                <p className="text-muted mb-2">No checkpoints yet</p>
                <p className="text-xs text-muted">Create your first checkpoint above to enable rollback capability</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checkpoints.map(checkpoint => (
                  <div
                    key={checkpoint.id}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'var(--bg-glass)' }}
                  >
                    <div className="flex items-center gap-3 p-3 group">
                      {/* Type icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${checkpoint.isPinned ? 'bg-yellow-500/20' : 'bg-accent/20'}`}>
                        {checkpoint.isPinned ? '📌' : typeInfo(checkpoint.type).icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-primary truncate">
                            {checkpoint.name || `Checkpoint ${formatRelativeTime(checkpoint.createdAt)}`}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${typeInfo(checkpoint.type).color} bg-white/5`}>
                            {typeInfo(checkpoint.type).label}
                          </span>
                          {checkpoint.gitDirty && (
                            <span className="text-xs px-1.5 py-0.5 rounded text-yellow-400 bg-yellow-500/10">
                              dirty
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span>{formatRelativeTime(checkpoint.createdAt)}</span>
                          {checkpoint.gitBranch && (
                            <span className="font-mono">
                              {checkpoint.gitBranch}
                              {checkpoint.gitCommit && ` @ ${checkpoint.gitCommit.substring(0, 7)}`}
                            </span>
                          )}
                          {checkpoint.sizeBytes > 0 && (
                            <span>{formatSize(checkpoint.sizeBytes)}</span>
                          )}
                        </div>
                        {checkpoint.description && (
                          <p className="text-xs text-muted mt-1 truncate">{checkpoint.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowDetails(showDetails === checkpoint.id ? null : checkpoint.id)}
                          className="p-1.5 text-muted hover:text-primary hover:bg-white/10 rounded"
                          title="Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => togglePin(checkpoint)}
                          className={`p-1.5 rounded ${checkpoint.isPinned ? 'text-yellow-400 bg-yellow-500/10' : 'text-muted hover:text-yellow-400 hover:bg-white/10'}`}
                          title={checkpoint.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <svg className="w-4 h-4" fill={checkpoint.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => restoreCheckpoint(checkpoint.id)}
                          disabled={restoring === checkpoint.id}
                          className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                        >
                          {restoring === checkpoint.id ? 'Restoring...' : 'Restore'}
                        </button>
                        <button
                          onClick={() => deleteCheckpoint(checkpoint.id)}
                          className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {showDetails === checkpoint.id && (
                      <div
                        className="px-4 pb-4 pt-2 text-xs space-y-2"
                        style={{ borderTop: '1px solid var(--border-subtle)' }}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted">Created:</span>
                            <span className="ml-2 text-secondary">{new Date(checkpoint.createdAt).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted">Type:</span>
                            <span className="ml-2 text-secondary">{checkpoint.type}</span>
                          </div>
                          {checkpoint.workingDir && (
                            <div className="col-span-2">
                              <span className="text-muted">Working Dir:</span>
                              <span className="ml-2 text-secondary font-mono">{checkpoint.workingDir}</span>
                            </div>
                          )}
                          {checkpoint.openFiles && checkpoint.openFiles.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted">Open Files:</span>
                              <div className="ml-2 mt-1 space-y-1">
                                {checkpoint.openFiles.map((file, i) => (
                                  <div key={i} className="text-secondary font-mono bg-white/5 px-2 py-0.5 rounded inline-block mr-1">
                                    {file}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span className="font-mono truncate">{projectPath || projectId}</span>
          {stats && <span>Total: {formatSize(stats.totalSizeBytes)}</span>}
        </div>
      </div>
    </div>
  );
}
