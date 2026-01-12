/**
 * Schedule Manager Component
 * Cron job scheduler UI for automated tasks
 */

import { useState, useEffect, useCallback } from 'react';

// Common cron presets
const CRON_PRESETS = [
  { label: 'Every minute', cron: '* * * * *' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Daily at midnight', cron: '0 0 * * *' },
  { label: 'Daily at 9am', cron: '0 9 * * *' },
  { label: 'Weekly on Monday', cron: '0 0 * * 1' },
  { label: 'Monthly on 1st', cron: '0 0 1 * *' },
];

// Parse cron to human readable
const describeCron = (cron) => {
  if (!cron) return 'Invalid';
  const parts = cron.split(' ');
  if (parts.length !== 5) return 'Invalid format';

  const [minute, hour, day, month, weekday] = parts;

  // Match presets
  const preset = CRON_PRESETS.find(p => p.cron === cron);
  if (preset) return preset.label;

  // Basic description
  let desc = 'At ';
  if (minute === '*') desc += 'every minute';
  else if (minute.startsWith('*/')) desc += 'every ' + minute.slice(2) + ' minutes';
  else desc += minute + ' minute(s)';

  if (hour !== '*') {
    if (hour.startsWith('*/')) desc += ' of every ' + hour.slice(2) + ' hours';
    else desc += ' at ' + hour + ':00';
  }

  return desc;
};

// Calculate next run time
const getNextRun = (cron) => {
  if (!cron) return null;
  // Simplified - would use a proper cron parser in production
  const now = new Date();
  const next = new Date(now.getTime() + 60000); // Default to 1 minute from now
  return next.toLocaleString();
};

function TaskRow({ task, onToggle, onEdit, onDelete, onRunNow }) {
  const [running, setRunning] = useState(false);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await onRunNow(task.id);
    } finally {
      setRunning(false);
    }
  };

  return (
    <tr className="hover:bg-white/5">
      <td className="px-3 py-2">
        <label className="relative inline-flex cursor-pointer">
          <input
            type="checkbox"
            checked={task.enabled}
            onChange={() => onToggle(task.id)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 rounded-full peer bg-white/10 peer-checked:bg-green-500/50" />
          <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </label>
      </td>
      <td className="px-3 py-2">
        <div className="text-sm text-primary">{task.name}</div>
        <div className="text-xs text-muted font-mono">{task.command?.substring(0, 50)}...</div>
      </td>
      <td className="px-3 py-2">
        <div className="text-xs font-mono text-accent">{task.cron}</div>
        <div className="text-xs text-muted">{describeCron(task.cron)}</div>
      </td>
      <td className="px-3 py-2 text-xs text-muted">
        {task.lastRun ? new Date(task.lastRun).toLocaleString() : 'Never'}
      </td>
      <td className="px-3 py-2 text-xs text-secondary">
        {task.enabled ? getNextRun(task.cron) : '-'}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleRunNow}
            disabled={running}
            className="p-1 text-muted hover:text-green-400"
            title="Run now"
          >
            {running ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} strokeDasharray="31.4 31.4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          <button onClick={() => onEdit(task)} className="p-1 text-muted hover:text-primary" title="Edit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-muted hover:text-red-400" title="Delete">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function TaskEditor({ task, onSave, onCancel }) {
  const [name, setName] = useState(task?.name || '');
  const [command, setCommand] = useState(task?.command || '');
  const [cron, setCron] = useState(task?.cron || '0 * * * *');
  const [projectId, setProjectId] = useState(task?.projectId || '');
  const [enabled, setEnabled] = useState(task?.enabled !== false);

  const handleSave = () => {
    onSave({
      id: task?.id,
      name,
      command,
      cron,
      projectId: projectId || null,
      enabled,
    });
  };

  return (
    <div className="p-4 space-y-4" style={{ background: 'var(--bg-glass)', borderRadius: '8px' }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">Task Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My scheduled task"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">Schedule</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="* * * * *"
              className="flex-1 px-3 py-2 rounded text-sm font-mono"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            />
            <select
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="px-2 py-2 rounded text-sm"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="">Custom</option>
              {CRON_PRESETS.map(p => (
                <option key={p.cron} value={p.cron}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted mt-1">{describeCron(cron)}</div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-secondary mb-1">Command</label>
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command to run..."
          className="w-full px-3 py-2 rounded text-sm font-mono"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-secondary">Enabled</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !command || !cron}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
          >
            {task?.id ? 'Update' : 'Create'} Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleManager({ isOpen, onClose, embedded = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workflows/scheduled');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen, fetchTasks]);

  const handleSaveTask = async (taskData) => {
    try {
      const method = taskData.id ? 'PUT' : 'POST';
      const url = taskData.id
        ? '/api/workflows/scheduled/' + taskData.id
        : '/api/workflows/scheduled';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        await fetchTasks();
        setShowEditor(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleToggle = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      await handleSaveTask({ ...task, enabled: !task.enabled });
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch('/api/workflows/scheduled/' + id, { method: 'DELETE' });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleRunNow = async (id) => {
    try {
      await fetch('/api/workflows/scheduled/' + id + '/run', { method: 'POST' });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to run task:', error);
    }
  };

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Task list */}
      <div className="space-y-2">
        {tasks.length > 0 ? tasks.slice(0, 3).map(task => (
          <div key={task.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${task.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-sm text-secondary">{task.name}</span>
            </div>
            <span className="text-xs text-muted">{task.schedule}</span>
          </div>
        )) : (
          <div className="text-center py-4 text-xs text-muted">No scheduled tasks</div>
        )}
      </div>

      {/* Quick add button */}
      <button
        onClick={() => setShowEditor(true)}
        className="w-full py-2 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30"
      >
        + Add Scheduled Task
      </button>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Scheduled Tasks</h2>
            <span className="text-xs text-muted">({tasks.filter(t => t.enabled).length} active)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingTask(null); setShowEditor(true); }}
              className="px-3 py-1.5 text-sm bg-accent/20 text-accent rounded hover:bg-accent/30"
            >
              + New Task
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {showEditor && (
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <TaskEditor
                task={editingTask}
                onSave={handleSaveTask}
                onCancel={() => { setShowEditor(false); setEditingTask(null); }}
              />
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-muted">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted mb-4">No scheduled tasks yet</p>
              <button
                onClick={() => setShowEditor(true)}
                className="px-4 py-2 bg-accent/20 text-accent rounded hover:bg-accent/30"
              >
                Create Your First Task
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted uppercase" style={{ background: 'var(--bg-tertiary)' }}>
                  <th className="px-3 py-2 text-left w-12">On</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Schedule</th>
                  <th className="px-3 py-2 text-left">Last Run</th>
                  <th className="px-3 py-2 text-left">Next Run</th>
                  <th className="px-3 py-2 text-left w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onEdit={(t) => { setEditingTask(t); setShowEditor(true); }}
                    onDelete={handleDelete}
                    onRunNow={handleRunNow}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>Cron format: minute hour day month weekday</span>
          <span>{tasks.length} total tasks</span>
        </div>
      </div>
    </div>
  );
}
