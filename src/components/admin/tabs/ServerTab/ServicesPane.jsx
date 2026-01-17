/**
 * ServicesPane Component
 * Systemd services management
 */

import { useState, useEffect, useCallback } from 'react';

export function ServicesPane() {
  const [services, setServices] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchServerData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, servicesRes, logsRes] = await Promise.all([
        fetch('/api/server/status'),
        fetch('/api/server/services'),
        fetch('/api/server/logs?lines=50')
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setServerStatus(data);
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        // API returns array directly
        setServices(Array.isArray(data) ? data : []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setSystemLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching server data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleServerAction = useCallback(async (action) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/server/${action}`, { method: 'POST' });
      if (res.ok) {
        setConfirmAction(null);
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServerData();
    // Use 15-second interval to avoid rate limiting
    const interval = setInterval(fetchServerData, 15000);
    return () => clearInterval(interval);
  }, [fetchServerData]);

  return (
    <div className="space-y-6">
      {/* System Controls */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider flex items-center gap-2">
            <span>&#9888;</span> SYSTEM CONTROLS
          </h4>
          <button
            onClick={fetchServerData}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setConfirmAction('reboot')}
            className="hacker-btn bg-hacker-warning/10 border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/20"
          >
            [REBOOT SYSTEM]
          </button>
        </div>
        <p className="text-xs text-hacker-text-dim mt-4 font-mono">
          System will reboot in 1 minute after confirmation.
        </p>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="hacker-card max-w-md mx-4 p-6">
            <h4 className="text-lg font-bold text-hacker-error mb-4 uppercase">
              Confirm {confirmAction}
            </h4>
            <p className="text-sm text-hacker-text mb-4">
              Are you sure you want to {confirmAction} the system? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleServerAction(confirmAction)}
                disabled={loading}
                className="hacker-btn flex-1 bg-hacker-error/20 border-hacker-error text-hacker-error hover:bg-hacker-error/30"
              >
                {loading ? '[EXECUTING...]' : `[CONFIRM ${confirmAction.toUpperCase()}]`}
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="hacker-btn flex-1"
              >
                [CANCEL]
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Services List */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> SYSTEMD SERVICES [{services.length}]
          </h4>
          {services.length === 0 ? (
            <p className="text-xs text-hacker-text-dim font-mono">Loading services...</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {services.map((service, idx) => {
                const isActive = service.active === 'active';
                return (
                  <div
                    key={service.name || service.unit || idx}
                    className="flex items-center justify-between p-2 bg-hacker-bg/50 border border-hacker-green/10 rounded"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-hacker-green' : 'bg-hacker-error'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs text-hacker-text truncate">
                          {(service.unit || service.name)?.replace('.service', '')}
                        </div>
                        <div className="text-[10px] text-hacker-text-dim truncate">
                          {service.description}
                        </div>
                      </div>
                    </div>
                    <span className={`hacker-badge text-[10px] ${
                      isActive ? 'hacker-badge-green' : 'hacker-badge-error'
                    }`}>
                      {service.sub || service.active}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Logs */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> SYSTEM LOGS
          </h4>
          {systemLogs.length === 0 ? (
            <p className="text-xs text-hacker-text-dim font-mono">Loading logs...</p>
          ) : (
            <div className="bg-black/50 rounded p-3 max-h-80 overflow-y-auto">
              <pre className="font-mono text-[10px] text-hacker-text-dim whitespace-pre-wrap">
                {systemLogs.slice(0, 50).map((log, i) => (
                  <div key={i} className="hover:text-hacker-text py-0.5">
                    {log}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Network Info */}
      {serverStatus?.network && serverStatus.network.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> NETWORK INTERFACES
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {serverStatus.network.map((iface, idx) => (
              <div key={idx} className="p-3 bg-hacker-bg/50 border border-hacker-cyan/10 rounded">
                <div className="font-mono text-sm text-hacker-cyan mb-1">{iface.name}</div>
                <div className="text-xs text-hacker-text-dim">
                  {iface.address || 'No IP'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ServicesPane;
