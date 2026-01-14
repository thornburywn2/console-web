import { useState, useEffect, useCallback } from 'react';

/**
 * CloudflarePublishPanel - Allows publishing a project to Cloudflare Tunnel
 * Shows only this project's tunnel route - simplified for per-project use
 * Port changes update CLAUDE.md and can restart the project
 */
function CloudflarePublishPanel({ project, onRefresh }) {
  const [settings, setSettings] = useState(null);
  const [route, setRoute] = useState(null);
  const [tunnelStatus, setTunnelStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [updatingPort, setUpdatingPort] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    subdomain: '',
    localPort: '',
    description: ''
  });
  const [syncing, setSyncing] = useState(false);

  // Reset all state when project changes
  const resetState = useCallback(() => {
    setRoute(null);
    setError('');
    setSuccess('');
    setFormData({
      subdomain: '',
      localPort: '',
      description: ''
    });
  }, []);

  // Fetch data for current project
  const fetchData = useCallback(async () => {
    if (!project?.name) return;

    setLoading(true);
    setError('');

    try {
      // Fetch Cloudflare settings
      const settingsRes = await fetch('/api/cloudflare/settings');
      const settingsData = await settingsRes.json();
      setSettings(settingsData);

      if (settingsData.configured) {
        // Fetch tunnel status
        try {
          const statusRes = await fetch('/api/cloudflare/tunnel/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setTunnelStatus(statusData);
          }
        } catch (e) {
          console.warn('Could not fetch tunnel status:', e);
        }

        // Fetch existing route for THIS project only
        const routeRes = await fetch(`/api/cloudflare/routes/${encodeURIComponent(project.name)}`);
        if (routeRes.ok) {
          const routeData = await routeRes.json();

          // Use configured subdomain from CLAUDE.md if available, otherwise fall back to project name
          const configuredSubdomain = routeData.projectSubdomain;
          const configuredPort = routeData.projectPort;

          // If no routes found but project has configured subdomain, auto-sync from Cloudflare
          if (routeData.routes?.length === 0 && configuredSubdomain) {
            console.log('[CloudflarePublishPanel] No routes found, auto-syncing from Cloudflare...');
            try {
              const syncRes = await fetch('/api/cloudflare/sync', { method: 'POST' });
              if (syncRes.ok) {
                // Re-fetch routes after sync
                const retryRes = await fetch(`/api/cloudflare/routes/${encodeURIComponent(project.name)}`);
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  if (retryData.routes?.length > 0) {
                    setRoute(retryData.routes[0]);
                  } else {
                    setRoute(null);
                  }
                }
              }
            } catch (syncErr) {
              console.warn('[CloudflarePublishPanel] Auto-sync failed:', syncErr);
            }
          } else if (routeData.routes?.length > 0) {
            setRoute(routeData.routes[0]);
          } else {
            setRoute(null);
          }

          setFormData(prev => ({
            ...prev,
            subdomain: prev.subdomain || configuredSubdomain || project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            localPort: prev.localPort || (configuredPort ? String(configuredPort) : '')
          }));
        } else {
          // Fallback to project name if API fails
          setFormData(prev => ({
            ...prev,
            subdomain: prev.subdomain || project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
          }));
        }
      } else {
        // Cloudflare not configured - still set defaults
        setFormData(prev => ({
          ...prev,
          subdomain: prev.subdomain || project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        }));
      }
    } catch (err) {
      console.error('Error fetching Cloudflare data:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.name]);

  // Reset and fetch when project changes
  useEffect(() => {
    resetState();
    fetchData();
  }, [project?.name, resetState, fetchData]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!formData.subdomain || !formData.localPort) {
      setError('Subdomain and local port are required');
      return;
    }

    setPublishing(true);
    setError('');
    setSuccess('');

    try {
      // First update CLAUDE.md with the port
      await fetch(`/api/admin/claude-md/${encodeURIComponent(project.name)}/port`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: parseInt(formData.localPort, 10) })
      });

      const res = await fetch('/api/cloudflare/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.name,
          subdomain: formData.subdomain,
          localPort: parseInt(formData.localPort, 10),
          description: formData.description || `Published from ${project.name}`
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      setSuccess(`Published to ${data.route.hostname}`);
      setRoute(data.route);
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!route?.hostname) return;
    if (!confirm(`Unpublish ${route.hostname}? This will remove the public route.`)) return;

    setPublishing(true);
    setError('');

    try {
      const res = await fetch(`/api/cloudflare/publish/${encodeURIComponent(route.hostname)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unpublish');
      }

      setSuccess('Route unpublished');
      setRoute(null);
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Sync routes from Cloudflare to fix drift
  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/cloudflare/sync', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }
      const data = await res.json();
      setSuccess(`Synced ${data.synced} routes`);
      // Refresh data after sync
      await fetchData();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePort = async (newPort) => {
    if (!route || !newPort) return;

    const portNum = parseInt(newPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Invalid port number');
      return;
    }

    if (portNum === route.localPort) return;

    if (!confirm(`Change port from ${route.localPort} to ${portNum}? This will update CLAUDE.md and restart the project if running.`)) return;

    setUpdatingPort(true);
    setError('');
    setSuccess('');

    try {
      // Update CLAUDE.md with new port
      await fetch(`/api/admin/claude-md/${encodeURIComponent(project.name)}/port`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum })
      });

      // Update the Cloudflare route
      const res = await fetch(`/api/cloudflare/routes/${encodeURIComponent(route.hostname)}/port`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localPort: portNum })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update port');
      }

      // Restart project if running
      try {
        await fetch(`/api/projects/${encodeURIComponent(project.name)}/restart`, {
          method: 'POST'
        });
      } catch (e) {
        console.warn('Could not restart project:', e);
      }

      setSuccess(`Port updated to ${portNum}`);
      fetchData(); // Refresh route data
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingPort(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-4 h-4 border-2 border-hacker-warning border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!settings?.configured) {
    return (
      <div className="text-center py-3">
        <div className="text-xs text-hacker-text-dim font-mono mb-2">
          Cloudflare not configured
        </div>
        <span className="text-xs font-mono text-hacker-warning">
          Configure in Admin Dashboard
        </span>
      </div>
    );
  }

  // Get zone name, truncate if too long
  const zoneName = settings.zoneName || 'example.com';
  const displayZone = zoneName.length > 12 ? zoneName.slice(0, 10) + '..' : zoneName;

  return (
    <div className="space-y-3">
      {/* Tunnel Status Mini Banner with Sync */}
      {tunnelStatus && (
        <div className={`p-2 rounded border flex items-center justify-between ${
          tunnelStatus.status === 'healthy'
            ? 'bg-hacker-green/10 border-hacker-green/30'
            : 'bg-hacker-error/10 border-hacker-error/30'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              tunnelStatus.status === 'healthy' ? 'bg-hacker-green animate-pulse' : 'bg-hacker-error'
            }`} />
            <span className="text-[10px] font-mono uppercase">
              {tunnelStatus.status === 'healthy' ? 'TUNNEL OK' : 'TUNNEL DOWN'}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-[10px] font-mono text-hacker-cyan hover:text-hacker-green disabled:opacity-50 transition-colors"
            title="Sync routes from Cloudflare"
          >
            {syncing ? '[...]' : '[SYNC]'}
          </button>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="p-2 rounded bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-xs font-mono">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 rounded bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-xs font-mono">
          {success}
        </div>
      )}

      {/* Current Project Section */}
      <div className="text-[10px] font-mono text-hacker-text-dim uppercase mb-2">
        {project?.name || 'PROJECT'}
      </div>

      {route ? (
        // Published State - Show current route info
        <div className="space-y-3">
          <div className="p-3 rounded bg-hacker-surface/50 border border-hacker-warning/30">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${
                route.status === 'ACTIVE' ? 'bg-hacker-green' :
                route.status === 'PENDING' ? 'bg-hacker-warning animate-pulse' :
                'bg-hacker-error'
              }`} />
              <span className="text-xs font-mono text-hacker-text-dim uppercase">
                {route.status}
              </span>
              {route.authentikEnabled && (
                <span className="text-[9px] font-mono text-hacker-purple bg-hacker-purple/10 px-1 rounded">
                  SSO
                </span>
              )}
            </div>
            <a
              href={`https://${route.hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-hacker-warning hover:underline break-all"
            >
              {route.hostname}
            </a>

            {/* Editable Port */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-hacker-text-dim font-mono">Port:</span>
              <input
                type="number"
                defaultValue={route.localPort}
                min="1"
                max="65535"
                onBlur={(e) => handleUpdatePort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdatePort(e.target.value)}
                disabled={updatingPort}
                className="w-20 px-2 py-1 rounded bg-hacker-surface border border-hacker-border/50 text-hacker-text font-mono text-xs focus:border-hacker-warning focus:outline-none disabled:opacity-50"
              />
              {updatingPort && (
                <div className="animate-spin w-3 h-3 border border-hacker-warning border-t-transparent rounded-full" />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://${route.hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-3 text-xs font-mono rounded border border-hacker-cyan/50 text-hacker-cyan hover:bg-hacker-cyan/10 transition-colors text-center"
            >
              [OPEN]
            </a>
            <button
              onClick={handleUnpublish}
              disabled={publishing}
              className="flex-1 py-1.5 px-3 text-xs font-mono rounded border border-hacker-error/50 text-hacker-error hover:bg-hacker-error/10 transition-colors disabled:opacity-50"
            >
              {publishing ? '[...]' : '[UNPUBLISH]'}
            </button>
          </div>
        </div>
      ) : (
        // Publish Form - Simplified with better layout
        <form onSubmit={handlePublish} className="space-y-3">
          <div>
            <label className="block text-[10px] font-mono text-hacker-text-dim mb-1 uppercase">
              Subdomain
            </label>
            <div className="flex items-stretch">
              <input
                type="text"
                value={formData.subdomain}
                onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                placeholder="my-app"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-l bg-hacker-surface border border-r-0 border-hacker-warning/30 text-hacker-text font-mono text-xs focus:border-hacker-warning focus:outline-none"
              />
              <span
                className="flex-shrink-0 px-1.5 py-1.5 rounded-r bg-hacker-surface/50 border border-hacker-warning/30 text-hacker-text-dim font-mono text-[10px] flex items-center"
                title={`.${zoneName}`}
              >
                .{displayZone}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-hacker-text-dim mb-1 uppercase">
              Local Port
            </label>
            <input
              type="number"
              value={formData.localPort}
              onChange={(e) => setFormData(prev => ({ ...prev, localPort: e.target.value }))}
              placeholder="3000"
              min="1"
              max="65535"
              className="w-full px-2 py-1.5 rounded bg-hacker-surface border border-hacker-warning/30 text-hacker-text font-mono text-xs focus:border-hacker-warning focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={publishing || !formData.subdomain || !formData.localPort}
            className="w-full py-2 px-4 text-xs font-mono rounded bg-hacker-warning/20 border border-hacker-warning/50 text-hacker-warning hover:bg-hacker-warning/30 transition-colors disabled:opacity-50"
          >
            {publishing ? '[PUBLISHING...]' : '[PUBLISH]'}
          </button>
        </form>
      )}
    </div>
  );
}

export default CloudflarePublishPanel;
