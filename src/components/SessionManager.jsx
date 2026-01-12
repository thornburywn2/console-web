import { useState, useMemo } from 'react';

function SessionManager({ projects, onKillSession, onSelectProject }) {
  const [confirmKillAll, setConfirmKillAll] = useState(false);

  // Get active sessions from projects
  const activeSessions = useMemo(() => {
    return projects.filter((p) => p.hasActiveSession);
  }, [projects]);

  // Handle kill all sessions
  const handleKillAll = () => {
    if (!confirmKillAll) {
      setConfirmKillAll(true);
      setTimeout(() => setConfirmKillAll(false), 3000);
      return;
    }

    activeSessions.forEach((session) => {
      onKillSession(session.path);
    });
    setConfirmKillAll(false);
  };

  // Format duration from session start
  const formatDuration = (startTime) => {
    if (!startTime) return 'N/A';
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const diff = Math.floor((now - start) / 1000);

    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);

    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-2">
      {/* Header with kill all button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-hacker-text-dim font-mono">
          {activeSessions.length} active
        </span>
        {activeSessions.length > 0 && (
          <button
            onClick={handleKillAll}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              confirmKillAll
                ? 'bg-hacker-error text-white'
                : 'text-hacker-error/70 hover:text-hacker-error hover:bg-hacker-error/10'
            }`}
            title={confirmKillAll ? 'Click again to confirm' : 'Kill all sessions'}
          >
            {confirmKillAll ? '[CONFIRM]' : '[KILL ALL]'}
          </button>
        )}
      </div>

      {/* Sessions list */}
      {activeSessions.length === 0 ? (
        <div className="text-xs text-hacker-text-dim text-center py-3 font-mono">
          [NO_ACTIVE_SESSIONS]
        </div>
      ) : (
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {activeSessions.map((session) => (
            <SessionItem
              key={session.path}
              session={session}
              onSelect={() => onSelectProject(session)}
              onKill={() => onKillSession(session.path)}
              formatDuration={formatDuration}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionItem({ session, onSelect, onKill, formatDuration }) {
  const [confirmKill, setConfirmKill] = useState(false);

  const handleKill = (e) => {
    e.stopPropagation();
    if (!confirmKill) {
      setConfirmKill(true);
      setTimeout(() => setConfirmKill(false), 3000);
      return;
    }
    onKill();
    setConfirmKill(false);
  };

  return (
    <div
      className="bg-hacker-bg/50 rounded px-2 py-1.5 border border-hacker-purple/10 hover:border-hacker-purple/30 transition-colors group cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-hacker-purple animate-pulse-glow flex-shrink-0" />
          <span className="text-xs font-mono text-hacker-text truncate">{session.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-hacker-text-dim font-mono">
            {formatDuration(session.sessionStart)}
          </span>
          <button
            onClick={handleKill}
            className={`p-1 rounded transition-colors ${
              confirmKill
                ? 'bg-hacker-error text-white'
                : 'opacity-0 group-hover:opacity-100 hover:bg-hacker-error/20 text-hacker-error/70 hover:text-hacker-error'
            }`}
            title={confirmKill ? 'Click again to confirm' : 'Kill session'}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionManager;
