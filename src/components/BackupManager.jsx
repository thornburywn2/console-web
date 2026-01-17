/**
 * Backup Manager Component
 * Automated project backup scheduling and management
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { backupsApi } from '../services/api.js';

const BACKUP_STRATEGIES = [
  { id: 'full', name: 'Full Backup', description: 'Complete project copy', icon: '📦' },
  { id: 'incremental', name: 'Incremental', description: 'Only changed files', icon: '📈' },
  { id: 'git', name: 'Git Bundle', description: 'Git repository bundle', icon: '📦' },
];

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
];

export default function BackupManager({
  projectPath,
  isOpen,
  onClose,
}) {
  const [backups, setBackups] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // New backup state
  const [backupName, setBackupName] = useState('');
  const [strategy, setStrategy] = useState('full');
  const [destination, setDestination] = useState('');

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleCron, setScheduleCron] = useState('0 2 * * *');
  const [retentionDays, setRetentionDays] = useState(30);

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const data = await backupsApi.list(projectPath);
      setBackups(data.backups || []);
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen) fetchBackups();
  }, [isOpen, fetchBackups]);

  // Create backup
  const createBackup = async () => {
    setCreating(true);
    try {
      await backupsApi.create(projectPath, {
        name: backupName || 'Backup ' + new Date().toISOString().slice(0, 10),
        strategy,
        destination: destination || undefined,
      });
      setBackupName('');
      await fetchBackups();
    } catch (err) {
      console.error('Failed to create backup:', err);
    } finally {
      setCreating(false);
    }
  };

  // Restore backup
  const restoreBackup = async (backupId) => {
    if (!confirm('Are you sure you want to restore this backup? Current files will be overwritten.')) {
      return;
    }

    try {
      await backupsApi.restore(projectPath, backupId);
      alert('Backup restored successfully');
    } catch (err) {
      console.error('Failed to restore backup:', err);
    }
  };

  // Delete backup
  const deleteBackup = async (backupId) => {
    if (!confirm('Delete this backup?')) return;

    try {
      await backupsApi.delete(projectPath, backupId);
      await fetchBackups();
    } catch (err) {
      console.error('Failed to delete backup:', err);
    }
  };

  // Save schedule
  const saveSchedule = async () => {
    try {
      await backupsApi.saveSchedule(projectPath, {
        enabled: scheduleEnabled,
        cron: scheduleCron,
        strategy,
        retentionDays,
      });
      await fetchBackups();
      setShowScheduler(false);
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return size.toFixed(1) + ' ' + units[unit];
  };

  if (!isOpen) return null;

  const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Backup Manager</h2>
            <span className="text-xs text-muted">({backups.length} backups, {formatSize(totalSize)})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className={'px-3 py-1.5 text-sm rounded ' + (showScheduler ? 'bg-accent text-white' : 'bg-accent/20 text-accent hover:bg-accent/30')}
            >
              Schedule
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
          {/* Schedule panel */}
          {showScheduler && (
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-medium text-primary mb-3">Automated Backup Schedule</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-secondary">Enable automatic backups</span>
                </label>

                {scheduleEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted mb-1">Schedule (Cron)</label>
                        <select
                          value={scheduleCron}
                          onChange={(e) => setScheduleCron(e.target.value)}
                          className="w-full px-3 py-2 rounded text-sm"
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                        >
                          <option value="0 * * * *">Every hour</option>
                          <option value="0 */6 * * *">Every 6 hours</option>
                          <option value="0 0 * * *">Daily at midnight</option>
                          <option value="0 2 * * *">Daily at 2am</option>
                          <option value="0 0 * * 0">Weekly on Sunday</option>
                          <option value="0 0 1 * *">Monthly on 1st</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Retention</label>
                        <select
                          value={retentionDays}
                          onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                          className="w-full px-3 py-2 rounded text-sm"
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                        >
                          {RETENTION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted mb-1">Strategy</label>
                      <div className="flex gap-2">
                        {BACKUP_STRATEGIES.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setStrategy(s.id)}
                            className={'flex items-center gap-2 px-3 py-2 rounded text-sm ' +
                              (strategy === s.id ? 'bg-accent/20 text-accent' : 'bg-white/5 text-secondary hover:bg-white/10')}
                          >
                            <span>{s.icon}</span>
                            <span>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="px-3 py-1.5 text-sm text-muted hover:text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSchedule}
                    className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80"
                  >
                    Save Schedule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create backup */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <h3 className="text-sm font-medium text-primary mb-3">Create Backup Now</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {BACKUP_STRATEGIES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  className={'flex flex-col items-center gap-1 p-3 rounded-lg text-center ' +
                    (strategy === s.id ? 'bg-accent/20 text-accent ring-1 ring-accent' : 'bg-white/5 text-secondary hover:bg-white/10')}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted">{s.description}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Backup name (optional)"
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
              />
              <button
                onClick={createBackup}
                disabled={creating}
                className="px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent/80 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
          </div>

          {/* Backup list */}
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">Backup History</h3>
            {loading ? (
              <div className="p-4 text-center text-muted">Loading backups...</div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <p className="text-muted mb-2">No backups yet</p>
                <p className="text-xs text-muted">Create your first backup above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map(backup => (
                  <div
                    key={backup.id}
                    className="flex items-center gap-3 p-3 rounded-lg group"
                    style={{ background: 'var(--bg-glass)' }}
                  >
                    <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center text-xl">
                      {BACKUP_STRATEGIES.find(s => s.id === backup.strategy)?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary truncate">{backup.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span>{new Date(backup.createdAt).toLocaleString()}</span>
                        <span>{formatSize(backup.size)}</span>
                        <span className="capitalize">{backup.strategy}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => restoreBackup(backup.id)}
                        className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="p-1 text-muted hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
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
          <span className="font-mono truncate">{projectPath}</span>
          <span>Total: {formatSize(totalSize)}</span>
        </div>
      </div>
    </div>
  );
}
