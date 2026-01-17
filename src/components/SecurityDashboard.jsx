import { useState, useEffect, useCallback } from 'react';
import { ToolStatus, SECURITY_TOOLS, SCAN_TYPES } from './security-dashboard';

export default function SecurityDashboard({ selectedProject, embedded = false }) {
  const [toolStatuses, setToolStatuses] = useState({});
  const [scanning, setScanning] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [selectedScan, setSelectedScan] = useState(null);
  const [projects, setProjects] = useState([]);
  const [targetProject, setTargetProject] = useState(selectedProject || '');
  const [logs, setLogs] = useState([]);
  const [recentScans, setRecentScans] = useState([]);

  // Fetch projects for dropdown
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        // API returns array directly, not { projects: [...] }
        const projectList = Array.isArray(data) ? data : (data.projects || []);
        setProjects(projectList);
        if (!targetProject && projectList.length > 0) {
          setTargetProject(projectList[0].name);
        }
      })
      .catch(console.error);
  }, []);

  // Check tool installation status
  useEffect(() => {
    checkToolStatuses();
  }, []);

  const checkToolStatuses = async () => {
    const statuses = {};
    for (const tool of SECURITY_TOOLS) {
      statuses[tool.id] = ToolStatus.CHECKING;
    }
    setToolStatuses(statuses);

    try {
      const response = await fetch('/api/lifecycle/tools/status');
      if (response.ok) {
        const data = await response.json();
        setToolStatuses(data.tools || {});
      }
    } catch (error) {
      console.error('Failed to check tool statuses:', error);
      // Mark all as unknown
      const errorStatuses = {};
      for (const tool of SECURITY_TOOLS) {
        errorStatuses[tool.id] = ToolStatus.ERROR;
      }
      setToolStatuses(errorStatuses);
    }
  };

  // Run a scan
  const runScan = async (scanType) => {
    if (!targetProject) {
      alert('Please select a project first');
      return;
    }

    setScanning(scanType.id);
    setSelectedScan(scanType.id);
    setLogs([`Starting ${scanType.name} for ${targetProject}...`]);

    try {
      const response = await fetch('/api/lifecycle/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: scanType.agent,
          command: scanType.command,
          project: targetProject
        })
      });

      const data = await response.json();

      if (data.output) {
        // Parse output into log lines
        const outputLines = data.output.split('\n').filter(line => line.trim());
        setLogs(prev => [...prev, ...outputLines]);
      }

      setScanResults(prev => ({
        ...prev,
        [scanType.id]: {
          success: data.success,
          timestamp: new Date().toISOString(),
          output: data.output,
          exitCode: data.exitCode,
          summary: data.summary
        }
      }));

      // Add to recent scans
      setRecentScans(prev => [{
        type: scanType.id,
        name: scanType.name,
        project: targetProject,
        timestamp: new Date().toISOString(),
        success: data.success
      }, ...prev.slice(0, 9)]);

    } catch (error) {
      console.error('Scan failed:', error);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
      setScanResults(prev => ({
        ...prev,
        [scanType.id]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setScanning(null);
    }
  };

  // Install a tool
  const installTool = async (tool) => {
    setToolStatuses(prev => ({ ...prev, [tool.id]: ToolStatus.CHECKING }));
    setLogs(prev => [...prev, `Installing ${tool.name}...`, `Command: ${tool.installCmd}`]);

    try {
      const response = await fetch('/api/lifecycle/tools/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.id, command: tool.installCmd })
      });

      const data = await response.json();

      if (data.success) {
        setToolStatuses(prev => ({ ...prev, [tool.id]: ToolStatus.INSTALLED }));
        setLogs(prev => [...prev, `${tool.name} installed successfully`]);
      } else {
        setToolStatuses(prev => ({ ...prev, [tool.id]: ToolStatus.ERROR }));
        setLogs(prev => [...prev, `Failed to install ${tool.name}: ${data.error}`]);
      }
    } catch (error) {
      setToolStatuses(prev => ({ ...prev, [tool.id]: ToolStatus.ERROR }));
      setLogs(prev => [...prev, `Installation error: ${error.message}`]);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case ToolStatus.INSTALLED: return 'text-hacker-green';
      case ToolStatus.MISSING: return 'text-hacker-warning';
      case ToolStatus.CHECKING: return 'text-hacker-cyan animate-pulse';
      case ToolStatus.ERROR: return 'text-hacker-error';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case ToolStatus.INSTALLED: return '✓';
      case ToolStatus.MISSING: return '✗';
      case ToolStatus.CHECKING: return '◌';
      case ToolStatus.ERROR: return '!';
      default: return '?';
    }
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
          {'>'} SECURITY_&_COMPLIANCE
        </h3>
        <button
          onClick={checkToolStatuses}
          className="px-3 py-1 text-xs bg-hacker-dark border border-hacker-green/30 text-hacker-green rounded hover:bg-hacker-green/10 transition-colors"
        >
          Refresh Status
        </button>
      </div>

      {/* Project Selector */}
      <div className="hacker-card p-4">
        <label className="block text-xs text-hacker-cyan mb-2 uppercase tracking-wider">
          Target Project
        </label>
        <select
          value={targetProject}
          onChange={(e) => setTargetProject(e.target.value)}
          className="w-full bg-hacker-darker border border-hacker-green/30 rounded px-3 py-2 text-hacker-text text-sm focus:outline-none focus:border-hacker-green"
        >
          <option value="">Select a project...</option>
          {projects.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Tool Status Grid */}
      <div className="hacker-card p-4">
        <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>&#9654;</span> INSTALLED TOOLS
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {SECURITY_TOOLS.map(tool => (
            <div
              key={tool.id}
              className="bg-hacker-darker border border-hacker-green/20 rounded p-3 hover:border-hacker-green/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-hacker-text">{tool.name}</span>
                <span className={`text-sm ${getStatusColor(toolStatuses[tool.id])}`}>
                  {getStatusIcon(toolStatuses[tool.id])}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tool.description}</p>
              {toolStatuses[tool.id] === ToolStatus.MISSING && (
                <button
                  onClick={() => installTool(tool)}
                  className="w-full px-2 py-1 text-xs bg-hacker-green/10 border border-hacker-green/30 text-hacker-green rounded hover:bg-hacker-green/20 transition-colors"
                >
                  Install
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scan Actions */}
      <div className="hacker-card p-4">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>&#9654;</span> RUN SCANS
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {SCAN_TYPES.map(scan => (
            <button
              key={scan.id}
              onClick={() => runScan(scan)}
              disabled={scanning || !targetProject}
              className={`p-4 rounded border transition-all text-left ${
                scanning === scan.id
                  ? 'bg-hacker-green/20 border-hacker-green animate-pulse'
                  : scanResults[scan.id]?.success === false
                  ? 'bg-hacker-error/10 border-hacker-error/30 hover:border-hacker-error'
                  : scanResults[scan.id]?.success
                  ? 'bg-hacker-green/10 border-hacker-green/30 hover:border-hacker-green'
                  : 'bg-hacker-darker border-hacker-green/20 hover:border-hacker-cyan'
              } ${!targetProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{scan.icon}</span>
                <span className="text-sm font-medium text-hacker-text">{scan.name}</span>
              </div>
              <p className="text-xs text-gray-500">{scan.description}</p>
              {scanResults[scan.id] && (
                <div className="mt-2 text-xs">
                  {scanResults[scan.id].success ? (
                    <span className="text-hacker-green">Last scan: Passed</span>
                  ) : (
                    <span className="text-hacker-error">Last scan: Issues found</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scans */}
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> RECENT SCANS
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentScans.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No scans run yet</p>
            ) : (
              recentScans.map((scan, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded border ${
                    scan.success
                      ? 'border-hacker-green/20 bg-hacker-green/5'
                      : 'border-hacker-error/20 bg-hacker-error/5'
                  }`}
                >
                  <div>
                    <span className="text-xs font-medium text-hacker-text">{scan.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{scan.project}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${scan.success ? 'text-hacker-green' : 'text-hacker-error'}`}>
                      {scan.success ? 'PASS' : 'FAIL'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Log Output */}
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> SCAN OUTPUT
          </h4>
          <div className="bg-black/50 rounded p-3 h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">Run a scan to see output...</p>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className={`${
                  line.includes('Error') || line.includes('✗') ? 'text-hacker-error' :
                  line.includes('✓') || line.includes('SUCCESS') ? 'text-hacker-green' :
                  line.includes('⚠') || line.includes('WARNING') ? 'text-hacker-warning' :
                  'text-hacker-text'
                }`}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Scan Result Details */}
      {selectedScan && scanResults[selectedScan] && (
        <div className="hacker-card p-4">
          <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> DETAILED RESULTS: {SCAN_TYPES.find(s => s.id === selectedScan)?.name}
          </h4>
          <pre className="bg-black/50 rounded p-4 text-xs text-hacker-text overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap">
            {scanResults[selectedScan].output || 'No detailed output available'}
          </pre>
        </div>
      )}

      {/* Quick Actions */}
      <div className="hacker-card p-4">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>&#9654;</span> QUICK COMMANDS
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-hacker-darker rounded p-3">
            <h5 className="text-xs text-hacker-cyan mb-2">Security Scan</h5>
            <code className="text-xs text-gray-400 block bg-black/30 p-2 rounded">
              bash ~/Projects/agents/lifecycle/AGENT-018-SECURITY.sh scan .
            </code>
          </div>
          <div className="bg-hacker-darker rounded p-3">
            <h5 className="text-xs text-hacker-cyan mb-2">Quality Gate</h5>
            <code className="text-xs text-gray-400 block bg-black/30 p-2 rounded">
              bash ~/Projects/agents/lifecycle/AGENT-019-QUALITY-GATE.sh all .
            </code>
          </div>
          <div className="bg-hacker-darker rounded p-3">
            <h5 className="text-xs text-hacker-cyan mb-2">Performance Audit</h5>
            <code className="text-xs text-gray-400 block bg-black/30 p-2 rounded">
              bash ~/Projects/agents/lifecycle/AGENT-022-PERFORMANCE.sh analyze .
            </code>
          </div>
          <div className="bg-hacker-darker rounded p-3">
            <h5 className="text-xs text-hacker-cyan mb-2">Pre-commit Setup</h5>
            <code className="text-xs text-gray-400 block bg-black/30 p-2 rounded">
              bash ~/Projects/agents/lifecycle/AGENT-023-PRECOMMIT.sh all .
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export widget for embedding
export function SecurityWidget({ project }) {
  const [lastScan, setLastScan] = useState(null);
  const [scanning, setScanning] = useState(false);

  const runQuickScan = async () => {
    if (!project) return;
    setScanning(true);

    try {
      const response = await fetch('/api/lifecycle/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'AGENT-018-SECURITY',
          command: 'scan',
          project
        })
      });

      const data = await response.json();
      setLastScan({
        success: data.success,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setLastScan({ success: false, error: error.message });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Quick Security Check</span>
        <button
          onClick={runQuickScan}
          disabled={scanning || !project}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            scanning
              ? 'bg-hacker-cyan/20 text-hacker-cyan animate-pulse'
              : 'bg-hacker-green/10 text-hacker-green hover:bg-hacker-green/20'
          }`}
        >
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      {lastScan && (
        <div className={`text-xs p-2 rounded ${
          lastScan.success ? 'bg-hacker-green/10 text-hacker-green' : 'bg-hacker-error/10 text-hacker-error'
        }`}>
          {lastScan.success ? 'No issues found' : 'Issues detected'}
        </div>
      )}
    </div>
  );
}
