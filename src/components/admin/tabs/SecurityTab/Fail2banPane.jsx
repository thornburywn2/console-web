/**
 * Fail2banPane Component
 * Fail2ban status and jail management
 */

import { useState, useEffect, useCallback } from 'react';
import { formatTime } from '../../utils';

export function Fail2banPane() {
  const [fail2banStatus, setFail2banStatus] = useState({ installed: false, jails: [] });
  const [sshSessions, setSshSessions] = useState([]);
  const [sshFailedAttempts, setSshFailedAttempts] = useState([]);
  const [sshKeys, setSshKeys] = useState([]);
  const [openPorts, setOpenPorts] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        fail2banRes,
        sshSessionsRes,
        sshFailedRes,
        sshKeysRes,
        openPortsRes,
        lastLoginsRes
      ] = await Promise.all([
        fetch('/api/infra/security/fail2ban/status'),
        fetch('/api/infra/security/ssh/sessions'),
        fetch('/api/infra/security/ssh/failed'),
        fetch('/api/infra/security/ssh/keys'),
        fetch('/api/infra/security/ports'),
        fetch('/api/infra/security/last-logins')
      ]);

      if (fail2banRes.ok) setFail2banStatus(await fail2banRes.json());
      if (sshSessionsRes.ok) {
        const data = await sshSessionsRes.json();
        setSshSessions(data.sessions || []);
      }
      if (sshFailedRes.ok) {
        const data = await sshFailedRes.json();
        setSshFailedAttempts(data.attempts || []);
      }
      if (sshKeysRes.ok) {
        const data = await sshKeysRes.json();
        setSshKeys(data.keys || []);
      }
      if (openPortsRes.ok) {
        const data = await openPortsRes.json();
        setOpenPorts(data.ports || []);
      }
      if (lastLoginsRes.ok) {
        const data = await lastLoginsRes.json();
        setLastLogins(data.logins || []);
      }
    } catch (err) {
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unbanIP = useCallback(async (jail, ip) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/infra/security/fail2ban/${jail}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error('Error unbanning IP:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSecurityData]);

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [fetchSecurityData]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className={`stat-value ${fail2banStatus.installed ? 'text-hacker-green' : 'text-hacker-error'}`}>
            {fail2banStatus.installed ? 'INSTALLED' : 'NOT FOUND'}
          </div>
          <div className="stat-label">FAIL2BAN</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-warning">
            {fail2banStatus.jails?.reduce((sum, j) => sum + (j.currentlyBanned || 0), 0) || 0}
          </div>
          <div className="stat-label">BANNED IPs</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{sshSessions.length}</div>
          <div className="stat-label">SSH SESSIONS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-error">{sshFailedAttempts.length}</div>
          <div className="stat-label">FAILED ATTEMPTS</div>
        </div>
      </div>

      {/* Fail2ban Jails */}
      {fail2banStatus.installed && (
        <div className="hacker-card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider">
              FAIL2BAN JAILS
            </h4>
            <button
              onClick={fetchSecurityData}
              disabled={loading}
              className="hacker-btn text-xs"
            >
              {loading ? '[LOADING...]' : '[REFRESH]'}
            </button>
          </div>
          {fail2banStatus.jails?.length === 0 ? (
            <p className="text-xs text-hacker-text-dim font-mono">No jails configured</p>
          ) : (
            <div className="space-y-3">
              {fail2banStatus.jails?.map(jail => (
                <div key={jail.name} className="p-3 bg-hacker-surface rounded border border-hacker-warning/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${jail.enabled ? 'bg-hacker-green' : 'bg-hacker-error'}`} />
                      <span className="font-mono text-sm text-hacker-warning">{jail.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-hacker-text-dim">
                        Banned: <span className="text-hacker-error">{jail.currentlyBanned || 0}</span>
                      </span>
                      <span className="text-hacker-text-dim">
                        Total: <span className="text-hacker-cyan">{jail.totalBanned || 0}</span>
                      </span>
                    </div>
                  </div>
                  {jail.bannedIPs && jail.bannedIPs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {jail.bannedIPs.map(ip => (
                        <span
                          key={ip}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-hacker-error/10 border border-hacker-error/30 rounded"
                        >
                          <span className="text-hacker-error">{ip}</span>
                          <button
                            onClick={() => unbanIP(jail.name, ip)}
                            className="text-hacker-text-dim hover:text-hacker-green ml-1"
                            title="Unban IP"
                          >
                            &#10005;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active SSH Sessions */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
          ACTIVE SSH SESSIONS [{sshSessions.length}]
        </h4>
        {sshSessions.length === 0 ? (
          <p className="text-xs text-hacker-text-dim font-mono">No active SSH sessions</p>
        ) : (
          <div className="space-y-2">
            {sshSessions.map((session, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-hacker-green animate-pulse" />
                  <span className="font-mono text-sm text-hacker-cyan">{session.user}</span>
                  <span className="text-xs text-hacker-text-dim">from {session.ip}</span>
                </div>
                <span className="text-xs text-hacker-text-dim font-mono">{session.since}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failed SSH Attempts */}
      {sshFailedAttempts.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-error mb-4 uppercase tracking-wider">
            FAILED SSH ATTEMPTS [{sshFailedAttempts.length}]
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sshFailedAttempts.slice(0, 20).map((attempt, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-error/20">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-hacker-error" />
                  <span className="font-mono text-sm text-hacker-error">{attempt.user || 'unknown'}</span>
                  <span className="text-xs text-hacker-text-dim">from {attempt.ip}</span>
                </div>
                <span className="text-xs text-hacker-text-dim font-mono">{attempt.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Ports */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
          LISTENING PORTS [{openPorts.length}]
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {openPorts.slice(0, 20).map((port, idx) => (
            <div key={idx} className="p-2 bg-hacker-surface rounded border border-hacker-border text-xs font-mono">
              <div className="text-hacker-purple">{port.port}/{port.protocol}</div>
              <div className="text-hacker-text-dim truncate">{port.process || port.service}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Logins */}
      {lastLogins.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider">
            RECENT LOGINS
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
            {lastLogins.slice(0, 10).map((login, idx) => (
              <div key={idx} className="flex items-center gap-3 py-1 hover:bg-hacker-surface/30">
                <span className="text-hacker-cyan">{login.user}</span>
                <span className="text-hacker-text-dim">{login.terminal}</span>
                <span className="text-hacker-text-dim">{login.ip}</span>
                <span className="text-hacker-text-dim ml-auto">{login.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SSH Keys */}
      {sshKeys.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
            AUTHORIZED SSH KEYS [{sshKeys.length}]
          </h4>
          <div className="space-y-2">
            {sshKeys.map((key, idx) => (
              <div key={idx} className="p-2 bg-hacker-surface rounded border border-hacker-border text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-hacker-cyan">{key.type}</span>
                  <span className="text-hacker-text-dim">{key.comment || 'No comment'}</span>
                </div>
                <div className="text-hacker-text-dim truncate mt-1">{key.fingerprint}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Fail2banPane;
