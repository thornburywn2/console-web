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

  const fetchDockerData = useCallback(async () => {
    try {
      setLoading(true);
      const [systemRes, containersRes, imagesRes, volumesRes, networksRes] = await Promise.all([
        fetch('/api/docker/system'),
        fetch('/api/docker/containers?all=true'),
        fetch('/api/docker/images'),
        fetch('/api/docker/volumes'),
        fetch('/api/docker/networks')
      ]);

      if (systemRes.ok) setDockerSystem(await systemRes.json());
      if (containersRes.ok) {
        const data = await containersRes.json();
        // API returns array directly
        setContainers(Array.isArray(data) ? data : []);
      }
      if (imagesRes.ok) {
        const data = await imagesRes.json();
        // API returns array directly
        setImages(Array.isArray(data) ? data : []);
      }
      if (volumesRes.ok) {
        const data = await volumesRes.json();
        // API returns array directly
        setVolumes(Array.isArray(data) ? data : []);
      }
      if (networksRes.ok) {
        const data = await networksRes.json();
        // API returns array directly
        setNetworks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching Docker data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleContainerAction = useCallback(async (containerId, action) => {
    try {
      setContainerAction({ containerId, action });
      const res = await fetch(`/api/docker/containers/${containerId}/${action}`, { method: 'POST' });
      if (res.ok) {
        fetchDockerData();
      }
    } catch (err) {
      console.error(`Error ${action} container:`, err);
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
