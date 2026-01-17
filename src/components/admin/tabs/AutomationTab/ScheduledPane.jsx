/**
 * ScheduledPane Component
 * Cron jobs and systemd timer management
 * Extracted from AdminDashboard.jsx INFRA_TABS.SCHEDULED
 */

import { useState, useEffect, useCallback } from 'react';

export function ScheduledPane() {
  // State
  const [cronJobs, setCronJobs] = useState([]);
  const [systemdTimers, setSystemdTimers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddCron, setShowAddCron] = useState(false);
  const [newCron, setNewCron] = useState({
    minute: '*',
    hour: '*',
    dom: '*',
    month: '*',
    dow: '*',
    command: ''
  });

  // Fetch scheduled tasks
  const fetchScheduledTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [cronRes, timersRes] = await Promise.all([
        fetch('/api/infra/scheduled/cron'),
        fetch('/api/infra/scheduled/timers')
      ]);
      if (cronRes.ok) {
        const data = await cronRes.json();
        setCronJobs(data.jobs || []);
      }
      if (timersRes.ok) {
        const data = await timersRes.json();
        setSystemdTimers(data.timers || []);
      }
    } catch (err) {
      console.error('Error fetching scheduled tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add cron job
  const addCronJob = useCallback(async (schedule, command) => {
    try {
      setLoading(true);
      const res = await fetch('/api/infra/scheduled/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, command })
      });
      if (res.ok) {
        fetchScheduledTasks();
      }
    } catch (err) {
      console.error('Error adding cron job:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduledTasks]);

  // Delete cron job
  const deleteCronJob = useCallback(async (index) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/infra/scheduled/cron/${index}`, { method: 'DELETE' });
      if (res.ok) {
        fetchScheduledTasks();
      }
    } catch (err) {
      console.error('Error deleting cron job:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduledTasks]);

  // Toggle systemd timer
  const toggleTimer = useCallback(async (timerName, isActive) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/infra/scheduled/timers/${timerName}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchScheduledTasks();
      }
    } catch (err) {
      console.error('Error toggling timer:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduledTasks]);

  // Load on mount
  useEffect(() => {
    fetchScheduledTasks();
  }, [fetchScheduledTasks]);

  return (
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
          <div className="flex items-center gap-2">
            <button
              onClick={fetchScheduledTasks}
              disabled={loading}
              className="hacker-btn text-xs"
            >
              {loading ? '[LOADING...]' : '[REFRESH]'}
            </button>
            <button
              onClick={() => setShowAddCron(!showAddCron)}
              className="hacker-btn text-xs"
            >
              {showAddCron ? 'CANCEL' : '+ ADD CRON'}
            </button>
          </div>
        </div>

        {/* Add Cron Form */}
        {showAddCron && (
          <div className="mb-4 p-3 bg-hacker-surface rounded border border-hacker-cyan/30">
            <div className="grid grid-cols-6 gap-2 mb-3">
              <input
                type="text"
                placeholder="min"
                value={newCron.minute}
                onChange={e => setNewCron(c => ({...c, minute: e.target.value}))}
                className="input-glass text-xs !py-1"
              />
              <input
                type="text"
                placeholder="hour"
                value={newCron.hour}
                onChange={e => setNewCron(c => ({...c, hour: e.target.value}))}
                className="input-glass text-xs !py-1"
              />
              <input
                type="text"
                placeholder="dom"
                value={newCron.dom}
                onChange={e => setNewCron(c => ({...c, dom: e.target.value}))}
                className="input-glass text-xs !py-1"
              />
              <input
                type="text"
                placeholder="mon"
                value={newCron.month}
                onChange={e => setNewCron(c => ({...c, month: e.target.value}))}
                className="input-glass text-xs !py-1"
              />
              <input
                type="text"
                placeholder="dow"
                value={newCron.dow}
                onChange={e => setNewCron(c => ({...c, dow: e.target.value}))}
                className="input-glass text-xs !py-1"
              />
              <button
                onClick={() => {
                  const schedule = `${newCron.minute} ${newCron.hour} ${newCron.dom} ${newCron.month} ${newCron.dow}`;
                  addCronJob(schedule, newCron.command);
                  setNewCron({ minute: '*', hour: '*', dom: '*', month: '*', dow: '*', command: '' });
                  setShowAddCron(false);
                }}
                disabled={loading || !newCron.command.trim()}
                className="hacker-btn text-xs border-hacker-green/30 text-hacker-green"
              >
                ADD
              </button>
            </div>
            <input
              type="text"
              placeholder="Command to run..."
              value={newCron.command}
              onChange={e => setNewCron(c => ({...c, command: e.target.value}))}
              className="w-full bg-black border border-hacker-border rounded px-3 py-2 text-xs text-hacker-text focus:border-hacker-cyan outline-none font-mono"
            />
            <p className="text-[10px] text-hacker-text-dim mt-2">
              Format: minute hour day-of-month month day-of-week (use * for any)
            </p>
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
                  &#10005;
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
  );
}

export default ScheduledPane;
