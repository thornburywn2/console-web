/**
 * ObservabilityPane Component
 * Jaeger, Loki, and Promtail management
 * Three internal tabs: Stack Status, Traces, Logs
 */

import { useState, useEffect, useCallback } from 'react';
import { formatTime } from '../../utils';

// Internal tab constants
const OTEL_TABS = {
  STACK: 'stack',
  TRACES: 'traces',
  LOGS: 'logs',
};

export function ObservabilityPane() {
  const [activeTab, setActiveTab] = useState(OTEL_TABS.STACK);
  const [stackStatus, setStackStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Traces state
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [operations, setOperations] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState('');
  const [traces, setTraces] = useState([]);
  const [traceLimit, setTraceLimit] = useState(20);

  // Logs state
  const [logQuery, setLogQuery] = useState('{job="console-web"}');
  const [logResults, setLogResults] = useState([]);
  const [labels, setLabels] = useState([]);
  const [logLimit, setLogLimit] = useState(100);

  // Fetch stack status
  const fetchStackStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/observability/stack/status');
      if (res.ok) {
        const data = await res.json();
        setStackStatus(data);
      } else {
        setError('Failed to fetch stack status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Stack control actions
  const handleStackAction = async (action) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/observability/stack/${action}`, { method: 'POST' });
      if (res.ok) {
        await fetchStackStatus();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${action} stack`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch services from Jaeger
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  }, []);

  // Fetch operations for a service
  const fetchOperations = useCallback(async (service) => {
    if (!service) return;
    try {
      const res = await fetch(`/api/observability/operations/${encodeURIComponent(service)}`);
      if (res.ok) {
        const data = await res.json();
        setOperations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch operations:', err);
    }
  }, []);

  // Search traces
  const searchTraces = useCallback(async () => {
    if (!selectedService) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        service: selectedService,
        limit: String(traceLimit),
      });
      if (selectedOperation) params.set('operation', selectedOperation);

      const res = await fetch(`/api/observability/traces?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data.data || []);
      }
    } catch (err) {
      console.error('Failed to search traces:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedService, selectedOperation, traceLimit]);

  // Fetch labels from Loki
  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/loki/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  }, []);

  // Execute Loki query
  const executeLogQuery = useCallback(async () => {
    if (!logQuery.trim()) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        query: logQuery,
        limit: String(logLimit),
      });
      const res = await fetch(`/api/observability/loki/query?${params}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data?.result || [];
        // Flatten log entries
        const entries = [];
        for (const stream of results) {
          for (const [ts, line] of stream.values || []) {
            entries.push({
              timestamp: ts,
              labels: stream.stream,
              line,
            });
          }
        }
        setLogResults(entries);
      }
    } catch (err) {
      console.error('Failed to execute log query:', err);
    } finally {
      setLoading(false);
    }
  }, [logQuery, logLimit]);

  // Initial fetch
  useEffect(() => {
    fetchStackStatus();
    const interval = setInterval(fetchStackStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStackStatus]);

  // Fetch services when traces tab is active
  useEffect(() => {
    if (activeTab === OTEL_TABS.TRACES) {
      fetchServices();
    }
  }, [activeTab, fetchServices]);

  // Fetch operations when service changes
  useEffect(() => {
    if (selectedService) {
      fetchOperations(selectedService);
    }
  }, [selectedService, fetchOperations]);

  // Fetch labels when logs tab is active
  useEffect(() => {
    if (activeTab === OTEL_TABS.LOGS) {
      fetchLabels();
    }
  }, [activeTab, fetchLabels]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
      case 'healthy':
        return 'text-hacker-green';
      case 'stopped':
      case 'unhealthy':
        return 'text-hacker-error';
      default:
        return 'text-hacker-warning';
    }
  };

  const getLogLevelColor = (line) => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('fatal')) return 'text-red-400';
    if (lower.includes('warn')) return 'text-yellow-400';
    if (lower.includes('info')) return 'text-blue-400';
    if (lower.includes('debug')) return 'text-gray-400';
    return 'text-hacker-text';
  };

  return (
    <div className="space-y-6">
      {/* Internal Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-hacker-border pb-2">
        {Object.entries(OTEL_TABS).map(([key, value]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === value
                ? 'text-hacker-cyan border-b-2 border-hacker-cyan bg-hacker-cyan/5'
                : 'text-hacker-text-dim hover:text-hacker-text'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="hacker-card border-hacker-error/50 bg-hacker-error/10">
          <p className="text-sm text-hacker-error font-mono">{error}</p>
        </div>
      )}

      {/* Stack Status Tab */}
      {activeTab === OTEL_TABS.STACK && (
        <div className="space-y-6">
          {/* Stack Health Summary */}
          {stackStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="hacker-card text-center">
                <div className="stat-value">{stackStatus.total || 3}</div>
                <div className="stat-label">TOTAL SERVICES</div>
              </div>
              <div className="hacker-card text-center">
                <div className="stat-value text-hacker-green">{stackStatus.running || 0}</div>
                <div className="stat-label">RUNNING</div>
              </div>
              <div className="hacker-card text-center">
                <div className={`stat-value ${stackStatus.healthy ? 'text-hacker-green' : 'text-hacker-error'}`}>
                  {stackStatus.healthy ? 'YES' : 'NO'}
                </div>
                <div className="stat-label">HEALTHY</div>
              </div>
              <div className="hacker-card text-center">
                <div className={`stat-value ${stackStatus.configured ? 'text-hacker-green' : 'text-hacker-warning'}`}>
                  {stackStatus.configured ? 'YES' : 'NO'}
                </div>
                <div className="stat-label">CONFIGURED</div>
              </div>
            </div>
          )}

          {/* Stack Controls */}
          <div className="hacker-card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-hacker-purple uppercase tracking-wider">
                OBSERVABILITY STACK CONTROL
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStackAction('start')}
                  disabled={loading}
                  className="hacker-btn text-xs border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10"
                >
                  [START]
                </button>
                <button
                  onClick={() => handleStackAction('stop')}
                  disabled={loading}
                  className="hacker-btn text-xs border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10"
                >
                  [STOP]
                </button>
                <button
                  onClick={() => handleStackAction('restart')}
                  disabled={loading}
                  className="hacker-btn text-xs border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/10"
                >
                  [RESTART]
                </button>
                <button
                  onClick={fetchStackStatus}
                  disabled={loading}
                  className="hacker-btn text-xs"
                >
                  {loading ? '[LOADING...]' : '[REFRESH]'}
                </button>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
              OBSERVABILITY SERVICES
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stackStatus?.services ? (
                Object.entries(stackStatus.services).map(([key, service]) => (
                  <div key={key} className="hacker-card bg-hacker-surface/30">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-semibold text-hacker-cyan flex items-center gap-2">
                        <span>
                          {key === 'jaeger' ? '\u{1F50D}' : key === 'loki' ? '\u{1F4DC}' : '\u{1F4E1}'}
                        </span>
                        {service.name || key.toUpperCase()}
                      </h5>
                      <span className={`hacker-badge text-[10px] ${
                        service.running ? 'hacker-badge-green' : 'hacker-badge-error'
                      }`}>
                        {service.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-xs text-hacker-text-dim font-mono space-y-1">
                      {service.container && <p>Container: {service.container}</p>}
                      {service.ports && <p>Port: {service.ports}</p>}
                      {service.uptime && <p>Uptime: {service.uptime}</p>}
                      {service.cpu && <p>CPU: {service.cpu}%</p>}
                      {service.memory?.percent && <p>Memory: {service.memory.percent}%</p>}
                    </div>
                    <div className="mt-3">
                      <div className="hacker-progress h-1">
                        <div
                          className="hacker-progress-bar"
                          style={{
                            width: service.running ? '100%' : '0%',
                            background: service.running
                              ? 'linear-gradient(90deg, #00cc33, #00ff41)'
                              : 'linear-gradient(90deg, #cc3333, #ff3333)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center">
                  <p className="text-hacker-text-dim font-mono">
                    {loading ? 'Loading...' : 'No services found. Is the stack configured?'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
              QUICK LINKS
            </h4>
            <div className="flex flex-wrap gap-2">
              <a
                href="http://localhost:16686"
                target="_blank"
                rel="noopener noreferrer"
                className="hacker-btn text-xs flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${stackStatus?.services?.jaeger?.running ? 'bg-hacker-green' : 'bg-hacker-error'}`} />
                Jaeger UI
              </a>
              <a
                href="http://localhost:3100/ready"
                target="_blank"
                rel="noopener noreferrer"
                className="hacker-btn text-xs flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${stackStatus?.services?.loki?.running ? 'bg-hacker-green' : 'bg-hacker-error'}`} />
                Loki Health
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Traces Tab (Jaeger) */}
      {activeTab === OTEL_TABS.TRACES && (
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
              TRACE SEARCH
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-hacker-text-dim mb-1">Service</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="hacker-input w-full text-sm"
                >
                  <option value="">Select service...</option>
                  {services.map(svc => (
                    <option key={svc} value={svc}>{svc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-hacker-text-dim mb-1">Operation</label>
                <select
                  value={selectedOperation}
                  onChange={(e) => setSelectedOperation(e.target.value)}
                  className="hacker-input w-full text-sm"
                  disabled={!selectedService}
                >
                  <option value="">All operations</option>
                  {operations.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-hacker-text-dim mb-1">Limit</label>
                <select
                  value={traceLimit}
                  onChange={(e) => setTraceLimit(Number(e.target.value))}
                  className="hacker-input w-full text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={searchTraces}
                  disabled={!selectedService || loading}
                  className="hacker-btn w-full"
                >
                  {loading ? '[SEARCHING...]' : '[SEARCH TRACES]'}
                </button>
              </div>
            </div>
          </div>

          {/* Trace Results */}
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
              TRACE RESULTS ({traces.length})
            </h4>
            {traces.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {traces.map((trace, idx) => (
                  <div key={trace.traceID || idx} className="hacker-card bg-hacker-surface/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-hacker-cyan font-mono">
                        {trace.traceID?.substring(0, 16) || 'Unknown'}...
                      </span>
                      <span className="text-xs text-hacker-text-dim">
                        {trace.spans?.[0]?.operationName || 'Unknown operation'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-hacker-text-dim">
                      <span>Spans: {trace.spans?.length || 0}</span>
                      <span>Duration: {(trace.spans?.[0]?.duration / 1000 || 0).toFixed(2)}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-hacker-text-dim font-mono text-center py-8">
                {selectedService ? 'No traces found. Try searching.' : 'Select a service to search traces.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab (Loki) */}
      {activeTab === OTEL_TABS.LOGS && (
        <div className="space-y-6">
          {/* Query Controls */}
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
              LOG QUERY (LOGQL)
            </h4>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder='{job="console-web"}'
                  className="hacker-input flex-1 font-mono text-sm"
                />
                <select
                  value={logLimit}
                  onChange={(e) => setLogLimit(Number(e.target.value))}
                  className="hacker-input w-24 text-sm"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <button
                  onClick={executeLogQuery}
                  disabled={loading}
                  className="hacker-btn"
                >
                  {loading ? '[QUERYING...]' : '[QUERY]'}
                </button>
              </div>

              {/* Available Labels */}
              {labels.length > 0 && (
                <div className="text-xs text-hacker-text-dim">
                  <span className="text-hacker-purple">Labels: </span>
                  {labels.map((label, idx) => (
                    <span key={label}>
                      <button
                        onClick={() => setLogQuery(`{${label}=~".+"}`)}
                        className="text-hacker-cyan hover:underline"
                      >
                        {label}
                      </button>
                      {idx < labels.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Log Results */}
          <div className="hacker-card">
            <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
              LOG ENTRIES ({logResults.length})
            </h4>
            {logResults.length > 0 ? (
              <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                {logResults.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 p-2 bg-hacker-surface/30 rounded hover:bg-hacker-surface/50"
                  >
                    <span className="text-hacker-text-dim whitespace-nowrap">
                      {new Date(Number(entry.timestamp) / 1000000).toLocaleTimeString()}
                    </span>
                    <span className={`flex-1 break-all ${getLogLevelColor(entry.line)}`}>
                      {entry.line}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-hacker-text-dim font-mono text-center py-8">
                Enter a LogQL query and click Query to search logs.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ObservabilityPane;
