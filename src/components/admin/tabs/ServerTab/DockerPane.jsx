/**
 * DockerPane Component
 * Docker container, image, and volume management
 */

import { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../../utils';

export function DockerPane() {
  const [dockerSystem, setDockerSystem] = useState(null);
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [containerAction, setContainerAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [partialErrors, setPartialErrors] = useState([]);

  const fetchDockerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPartialErrors([]);

      const errors = [];

      // Use Promise.allSettled to handle partial failures
      const [systemRes, containersRes, imagesRes, volumesRes, networksRes] = await Promise.allSettled([
        fetch('/api/docker/system'),
        fetch('/api/docker/containers?all=true'),
        fetch('/api/docker/images'),
        fetch('/api/docker/volumes'),
        fetch('/api/docker/networks')
      ]);

      // Process system info
      if (systemRes.status === 'fulfilled' && systemRes.value.ok) {
        setDockerSystem(await systemRes.value.json());
      } else if (systemRes.status === 'rejected') {
        errors.push('System info: Network error');
      } else if (!systemRes.value.ok) {
        errors.push(`System info: ${systemRes.value.status} ${systemRes.value.statusText}`);
      }

      // Process containers
      if (containersRes.status === 'fulfilled' && containersRes.value.ok) {
        const data = await containersRes.value.json();
        setContainers(Array.isArray(data) ? data : []);
      } else if (containersRes.status === 'rejected') {
        errors.push('Containers: Network error');
      } else if (!containersRes.value.ok) {
        errors.push(`Containers: ${containersRes.value.status} ${containersRes.value.statusText}`);
      }

      // Process images
      if (imagesRes.status === 'fulfilled' && imagesRes.value.ok) {
        const data = await imagesRes.value.json();
        setImages(Array.isArray(data) ? data : []);
      } else if (imagesRes.status === 'rejected') {
        errors.push('Images: Network error');
      } else if (!imagesRes.value.ok) {
        errors.push(`Images: ${imagesRes.value.status} ${imagesRes.value.statusText}`);
      }

      // Process volumes
      if (volumesRes.status === 'fulfilled' && volumesRes.value.ok) {
        const data = await volumesRes.value.json();
        setVolumes(Array.isArray(data) ? data : []);
      } else if (volumesRes.status === 'rejected') {
        errors.push('Volumes: Network error');
      } else if (!volumesRes.value.ok) {
        errors.push(`Volumes: ${volumesRes.value.status} ${volumesRes.value.statusText}`);
      }

      // Process networks
      if (networksRes.status === 'fulfilled' && networksRes.value.ok) {
        const data = await networksRes.value.json();
        setNetworks(Array.isArray(data) ? data : []);
      } else if (networksRes.status === 'rejected') {
        errors.push('Networks: Network error');
      } else if (!networksRes.value.ok) {
        errors.push(`Networks: ${networksRes.value.status} ${networksRes.value.statusText}`);
      }

      // Set partial errors if some but not all requests failed
      if (errors.length > 0 && errors.length < 5) {
        setPartialErrors(errors);
      } else if (errors.length === 5) {
        // All requests failed - show full error
        setError('Failed to connect to Docker. Is Docker daemon running?');
      }
    } catch (err) {
      console.error('Error fetching Docker data:', err);
      setError(err.message || 'Failed to fetch Docker data');
    } finally {
      setLoading(false);
    }
  }, []);

  const [actionError, setActionError] = useState(null);

  const handleContainerAction = useCallback(async (containerId, action) => {
    try {
      setContainerAction({ containerId, action });
      setActionError(null);
      const res = await fetch(`/api/docker/containers/${containerId}/${action}`, { method: 'POST' });
      if (res.ok) {
        fetchDockerData();
      } else {
        const errorText = await res.text().catch(() => res.statusText);
        setActionError(`Failed to ${action} container: ${errorText || res.status}`);
      }
    } catch (err) {
      console.error(`Error ${action} container:`, err);
      setActionError(`Failed to ${action} container: ${err.message || 'Network error'}`);
    } finally {
      setContainerAction(null);
    }
  }, [fetchDockerData]);

  useEffect(() => {
    fetchDockerData();
    // Use 30-second interval to avoid rate limiting (5 concurrent API calls)
    const interval = setInterval(fetchDockerData, 30000);
    return () => clearInterval(interval);
  }, [fetchDockerData]);

  return (
    <div className="space-y-6">
      {/* Full Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-lg">!</span>
              <div>
                <div className="text-red-400 font-semibold text-sm">Docker Error</div>
                <div className="text-red-300/80 text-xs font-mono mt-1">{error}</div>
              </div>
            </div>
            <button
              onClick={fetchDockerData}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-mono bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded transition-colors"
            >
              {loading ? 'RETRYING...' : 'RETRY'}
            </button>
          </div>
        </div>
      )}

      {/* Partial Error State */}
      {partialErrors.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 text-sm mt-0.5">!</span>
              <div>
                <div className="text-yellow-400 font-semibold text-xs">Partial Data Load</div>
                <div className="text-yellow-300/70 text-xs font-mono mt-1 space-y-0.5">
                  {partialErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={fetchDockerData}
              disabled={loading}
              className="px-2 py-1 text-[10px] font-mono bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded transition-colors flex-shrink-0"
            >
              {loading ? '...' : 'RETRY'}
            </button>
          </div>
        </div>
      )}

      {/* Action Error State */}
      {actionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-sm">!</span>
              <span className="text-red-300/80 text-xs font-mono">{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Docker Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value">{dockerSystem?.containers?.total || containers.length}</div>
          <div className="stat-label">CONTAINERS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value" style={{color: '#00d4ff'}}>
            {dockerSystem?.containers?.running || containers.filter(c => c.state === 'running').length}
          </div>
          <div className="stat-label">RUNNING</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value" style={{color: '#bd00ff'}}>{images.length}</div>
          <div className="stat-label">IMAGES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value">{volumes.length}</div>
          <div className="stat-label">VOLUMES</div>
        </div>
      </div>

      {/* Docker System Info */}
      {dockerSystem && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-green mb-3 uppercase tracking-wider flex items-center gap-2">
              <span>&#9654;</span> ENGINE
            </h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">version</span>
                <span className="text-hacker-cyan">{dockerSystem.serverVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">os</span>
                <span className="text-hacker-text">{dockerSystem.operatingSystem}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">arch</span>
                <span className="text-hacker-text">{dockerSystem.architecture}</span>
              </div>
            </div>
          </div>
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-cyan mb-3 uppercase tracking-wider flex items-center gap-2">
              <span>&#9654;</span> RESOURCES
            </h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">cpus</span>
                <span className="text-hacker-green">{dockerSystem.cpus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">memory</span>
                <span className="text-hacker-text">{formatBytes(dockerSystem.memTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">networks</span>
                <span className="text-hacker-text">{networks.length}</span>
              </div>
            </div>
          </div>
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-3 uppercase tracking-wider flex items-center gap-2">
              <span>&#9654;</span> COUNTS
            </h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">paused</span>
                <span className="text-hacker-warning">{dockerSystem.containers?.paused || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">stopped</span>
                <span className="text-hacker-error">{dockerSystem.containers?.stopped || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hacker-text-dim">images</span>
                <span className="text-hacker-text">{dockerSystem.images || images.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container List */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> CONTAINERS [{containers.length}]
          </h4>
          <button
            onClick={fetchDockerData}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>
        {containers.length === 0 ? (
          <p className="text-xs text-hacker-text-dim font-mono">No containers found</p>
        ) : (
          <div className="space-y-2">
            {containers.map(container => {
              const isRunning = container.state === 'running';
              const name = container.name || container.id?.substring(0, 12) || 'unnamed';
              const isActioning = containerAction?.containerId === (container.id || container.fullId);

              return (
                <div
                  key={container.id || container.fullId}
                  className="flex items-center justify-between p-3 bg-hacker-bg/50 border border-hacker-green/10 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isRunning ? 'bg-hacker-green animate-pulse-glow' : 'bg-hacker-error'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm text-hacker-text truncate">{name}</div>
                      <div className="text-xs text-hacker-text-dim truncate">
                        {container.image} | {container.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`hacker-badge text-[10px] ${
                      isRunning ? 'hacker-badge-green' : 'hacker-badge-error'
                    }`}>
                      {container.state?.toUpperCase()}
                    </span>
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => handleContainerAction(container.id || container.fullId, 'stop')}
                          disabled={isActioning}
                          className="hacker-btn text-[10px] px-2 py-1 border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10"
                        >
                          {isActioning && containerAction?.action === 'stop' ? '...' : 'STOP'}
                        </button>
                        <button
                          onClick={() => handleContainerAction(container.id || container.fullId, 'restart')}
                          disabled={isActioning}
                          className="hacker-btn text-[10px] px-2 py-1 border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/10"
                        >
                          {isActioning && containerAction?.action === 'restart' ? '...' : 'RESTART'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleContainerAction(container.id || container.fullId, 'start')}
                        disabled={isActioning}
                        className="hacker-btn text-[10px] px-2 py-1 border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10"
                      >
                        {isActioning && containerAction?.action === 'start' ? '...' : 'START'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Images Section */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>&#9654;</span> IMAGES [{images.length}]
        </h4>
        {images.length === 0 ? (
          <p className="text-xs text-hacker-text-dim font-mono">No images found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {images.slice(0, 12).map(image => {
              const tag = image.RepoTags?.[0] || '<none>:<none>';
              const [repo, version] = tag.split(':');
              return (
                <div
                  key={image.Id}
                  className="p-2 bg-hacker-bg/50 border border-hacker-purple/10 rounded text-xs font-mono"
                >
                  <div className="text-hacker-text truncate">{repo}</div>
                  <div className="flex justify-between text-hacker-text-dim">
                    <span className="text-hacker-purple">{version}</span>
                    <span>{formatBytes(image.Size)}</span>
                  </div>
                </div>
              );
            })}
            {images.length > 12 && (
              <div className="p-2 bg-hacker-bg/50 border border-hacker-purple/10 rounded text-xs font-mono text-center text-hacker-purple">
                +{images.length - 12} more images
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DockerPane;
