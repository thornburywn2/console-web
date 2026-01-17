/**
 * Docker Widget Component
 * Displays Docker container status
 */

import { useState, useEffect } from 'react';

export default function DockerWidget() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/docker/containers');
        if (!response.ok) {
          throw new Error('Failed to fetch containers');
        }
        const data = await response.json();
        // Handle both array and object with containers property
        const containerList = Array.isArray(data) ? data : (data.containers || []);
        setContainers(containerList.slice(0, 8));
        setError(null);
      } catch (err) {
        console.error('Docker fetch error:', err);
        setError(err.message);
        setContainers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchContainers();
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-4 h-4 border-2 border-hacker-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-center py-3 font-mono" style={{ color: 'var(--status-error)' }}>
        {error}
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="text-xs text-center py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
        No containers found
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {containers.map((container) => {
        const name = container.Names?.[0]?.replace(/^\//, '') || container.name || 'unknown';
        const state = container.State || container.state || 'unknown';
        const isRunning = state === 'running';

        return (
          <div
            key={container.Id || container.id || name}
            className="flex items-center gap-2 p-1.5 rounded text-xs"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-green-500' : 'bg-yellow-500'}`}
            />
            <span className="font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
              {name}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: isRunning ? 'var(--accent-primary)' : 'var(--status-warning)' }}
            >
              {state}
            </span>
          </div>
        );
      })}
    </div>
  );
}
