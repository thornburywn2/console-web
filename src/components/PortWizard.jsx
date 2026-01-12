import { useState, useEffect, useCallback } from 'react';

// Common port ranges for reference
const PORT_RANGES = {
  webApps: { start: 3000, end: 3999, label: 'Web Apps', color: 'green' },
  devServers: { start: 5000, end: 5999, label: 'Dev Servers', color: 'cyan' },
  apis: { start: 8000, end: 8999, label: 'APIs', color: 'purple' },
  databases: { start: 9000, end: 9999, label: 'Databases', color: 'warning' },
};

function PortWizard({ projects = [], onSelectProject }) {
  const [ports, setPorts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState('all');
  const [confirmKill, setConfirmKill] = useState(null);

  // Extract project name from path
  const getProjectName = (projectPath) => {
    if (!projectPath) return null;
    return projectPath.split('/').pop();
  };

  // Find project by path or name
  const findProject = (portData) => {
    if (!portData.project) return null;
    return projects.find(p =>
      p.path === portData.project ||
      p.name === getProjectName(portData.project)
    );
  };

  // Fetch ports data
  const fetchPorts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ports');
      if (!response.ok) throw new Error('Failed to fetch ports');
      const data = await response.json();
      setPorts(data.ports || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching ports:', err);
      setError('Failed to load port data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchPorts();
    const interval = setInterval(fetchPorts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchPorts]);

  // Trigger fresh port scan
  const handleScan = async () => {
    try {
      setIsScanning(true);
      const response = await fetch('/api/ports/scan', { method: 'POST' });
      if (!response.ok) throw new Error('Scan failed');
      const data = await response.json();
      setPorts(data.ports || []);
      setError(null);
    } catch (err) {
      console.error('Error scanning ports:', err);
      setError('Port scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  // Kill process on port
  const handleKillPort = async (port) => {
    if (confirmKill !== port) {
      setConfirmKill(port);
      setTimeout(() => setConfirmKill(null), 3000);
      return;
    }

    try {
      const response = await fetch(`/api/ports/kill/${port}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to kill process');
      setConfirmKill(null);
      fetchPorts(); // Refresh list
    } catch (err) {
      console.error('Error killing port:', err);
      setError(`Failed to kill process on port ${port}`);
    }
  };

  // Filter ports by selected range
  const filteredPorts = ports.filter((port) => {
    if (selectedRange === 'all') return true;
    const range = PORT_RANGES[selectedRange];
    return range && port.port >= range.start && port.port <= range.end;
  });

  // Generate port range visualization
  const renderPortMap = () => {
    const minPort = 3000;
    const maxPort = 9999;
    const totalRange = maxPort - minPort;

    const colorMap = {
      green: 'rgba(16, 185, 129, 0.15)',
      cyan: 'rgba(6, 182, 212, 0.15)',
      purple: 'rgba(139, 92, 246, 0.15)',
      warning: 'rgba(245, 158, 11, 0.15)',
    };

    return (
      <div className="mb-3">
        <div className="text-xs mb-1 font-mono" style={{ color: 'var(--text-secondary)' }}>PORT MAP (3000-9999)</div>
        <div className="port-map">
          {/* Range backgrounds */}
          {Object.entries(PORT_RANGES).map(([key, range]) => {
            const left = ((range.start - minPort) / totalRange) * 100;
            const width = ((range.end - range.start) / totalRange) * 100;
            return (
              <div
                key={key}
                className="port-map-range"
                style={{ left: `${left}%`, width: `${width}%`, background: colorMap[range.color] }}
                title={range.label}
              />
            );
          })}

          {/* Active ports */}
          {ports.map((p, index) => {
            const position = ((p.port - minPort) / totalRange) * 100;
            if (position < 0 || position > 100) return null;
            return (
              <div
                key={`${p.port}-${index}`}
                className="port-map-indicator"
                style={{ left: `${position}%` }}
                title={`Port ${p.port}: ${p.process}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
          <span>3000</span>
          <span>6000</span>
          <span>9999</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="input-glass rounded px-2 py-1 text-xs font-mono"
            style={{ width: 'auto' }}
          >
            <option value="all">All Ports</option>
            {Object.entries(PORT_RANGES).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="btn-icon disabled:opacity-50"
            title="Scan ports"
          >
            <svg
              className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button
            onClick={fetchPorts}
            disabled={isLoading}
            className="btn-icon disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-xs rounded px-2 py-1 font-mono" style={{ color: 'var(--status-error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {error}
        </div>
      )}

      {/* Port map visualization */}
      {renderPortMap()}

      {/* Active ports list */}
      <div>
        <div className="text-xs mb-1 font-mono flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
          <span>ACTIVE ({filteredPorts.length})</span>
        </div>

        {isLoading && ports.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <svg className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : filteredPorts.length === 0 ? (
          <div className="text-xs text-center py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>No active ports</div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {filteredPorts.map((p, index) => {
              const project = findProject(p);
              const projectName = project?.name || getProjectName(p.project);
              const isClickable = project && onSelectProject;

              return (
                <div
                  key={`${p.port}-${index}`}
                  className={`list-item group ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={isClickable ? () => onSelectProject(project) : undefined}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') onSelectProject(project); } : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`list-item-indicator ${p.isRegistered ? 'active' : ''}`} style={!p.isRegistered ? { background: 'var(--status-warning)', opacity: 0.7 } : {}} title={p.isRegistered ? 'Registered in PORTS.md' : 'Not registered'} />
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>{p.port}</span>
                    <span className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                      {p.registeredName || p.process}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {projectName && (
                      <span
                        className="text-[10px] font-mono truncate max-w-[80px]"
                        style={{ color: isClickable ? 'var(--accent-secondary)' : 'var(--text-muted)' }}
                        title={`${projectName}${isClickable ? ' (click to open)' : ''}`}
                      >
                        {projectName}
                      </span>
                    )}
                    {p.killable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleKillPort(p.port); }}
                        className="p-1 rounded transition-colors"
                        style={{
                          background: confirmKill === p.port ? 'var(--status-error)' : 'transparent',
                          color: confirmKill === p.port ? 'white' : 'var(--status-error)',
                          opacity: confirmKill === p.port ? 1 : 0,
                        }}
                        onMouseEnter={(e) => { if (confirmKill !== p.port) e.target.style.opacity = 1; }}
                        onMouseLeave={(e) => { if (confirmKill !== p.port) e.target.style.opacity = 0; }}
                        title={confirmKill === p.port ? 'Click again to confirm' : 'Kill process'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Port ranges legend */}
      <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
        {Object.entries(PORT_RANGES).map(([key, range]) => {
          const colorMap = {
            green: 'var(--accent-primary)',
            cyan: 'var(--accent-secondary)',
            purple: 'var(--accent-tertiary)',
            warning: 'var(--status-warning)',
          };
          return (
            <div key={key} className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: colorMap[range.color], opacity: 0.5 }} />
              <span>
                {range.start}-{range.end}
              </span>
              <span style={{ color: colorMap[range.color] }}>{range.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PortWizard;
