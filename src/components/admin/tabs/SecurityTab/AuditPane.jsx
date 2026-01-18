/**
 * AuditPane Component
 * Enterprise Mission Control - Phase 4
 * Security audit log viewer (Admin only)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { auditApi } from '../../../../services/api.js';

// Action type colors and icons
const ACTION_CONFIG = {
  CREATE: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '+' },
  READ: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '👁' },
  UPDATE: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '✎' },
  DELETE: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '✗' },
  EXECUTE: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: '▶' },
  LOGIN: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: '🔐' },
  LOGOUT: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '🚪' },
};

// Resource icons
const RESOURCE_ICONS = {
  session: '💻',
  project: '📁',
  agent: '🤖',
  user: '👤',
  settings: '⚙️',
  firewall: '🔥',
  docker: '🐳',
  audit_log: '📋',
};

function formatDate(date) {
  return new Date(date).toLocaleString();
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function AuditPane() {
  // State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // Stats period
  const [statsPeriod, setStatsPeriod] = useState(7);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        ...filters,
        limit,
        offset,
        sort: sortField,
        order: sortOrder,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key] && params[key] !== 0) delete params[key];
      });

      const data = await auditApi.list(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters, limit, offset, sortField, sortOrder]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await auditApi.getStats(statsPeriod);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  }, [statsPeriod]);

  // Initial load
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0); // Reset pagination
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setOffset(0);
  };

  // Export CSV
  const handleExport = async () => {
    try {
      setLoading(true);
      const blob = await auditApi.exportCsv(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Audit logs exported');
    } catch (err) {
      setError(err.getUserMessage?.() || err.message || 'Failed to export');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const goToPage = (page) => {
    setOffset((page - 1) * limit);
  };

  // Unique values for filter dropdowns
  const uniqueActions = useMemo(() => {
    return [...new Set(logs.map(l => l.action))].filter(Boolean).sort();
  }, [logs]);

  const uniqueResources = useMemo(() => {
    return [...new Set(logs.map(l => l.resource))].filter(Boolean).sort();
  }, [logs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm font-mono flex items-center justify-between">
          <span>[ERROR] {error}</span>
          <button onClick={() => setError('')} className="hover:text-hacker-text">&#10005;</button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm font-mono flex items-center justify-between">
          <span>[SUCCESS] {success}</span>
          <button onClick={() => setSuccess('')} className="hover:text-hacker-text">&#10005;</button>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="hacker-card text-center">
            <div className="stat-value text-hacker-cyan">{stats.totalLogs?.toLocaleString()}</div>
            <div className="stat-label">TOTAL EVENTS</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value text-hacker-green">{stats.uniqueUsers}</div>
            <div className="stat-label">UNIQUE USERS</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value text-yellow-400">{stats.byAction?.UPDATE || 0}</div>
            <div className="stat-label">UPDATES</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value text-red-400">{stats.byAction?.DELETE || 0}</div>
            <div className="stat-label">DELETES</div>
          </div>
        </div>
      )}

      {/* Action Breakdown */}
      {stats?.byAction && (
        <div className="hacker-card">
          <h3 className="text-sm font-mono text-hacker-text-dim mb-3">Actions (Last {statsPeriod} days)</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byAction).map(([action, count]) => {
              const config = ACTION_CONFIG[action] || { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '?' };
              return (
                <span
                  key={action}
                  className={`px-2 py-1 rounded text-xs font-mono ${config.bg} ${config.color}`}
                >
                  {config.icon} {action}: {count}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            {[7, 14, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setStatsPeriod(days)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  statsPeriod === days
                    ? 'bg-hacker-cyan/30 text-hacker-cyan'
                    : 'bg-white/5 text-hacker-text-dim hover:bg-white/10'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono text-hacker-text-dim">Filters</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilters({ userId: '', action: '', resource: '', search: '', startDate: '', endDate: '' });
                setOffset(0);
              }}
              className="px-2 py-1 text-xs font-mono text-hacker-text-dim hover:text-hacker-text transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-3 py-1 text-xs font-mono bg-hacker-cyan/20 text-hacker-cyan rounded hover:bg-hacker-cyan/30 transition-colors disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="hacker-input text-xs"
          />

          {/* User ID */}
          <input
            type="text"
            placeholder="User ID..."
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            className="hacker-input text-xs"
          />

          {/* Action */}
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="hacker-input text-xs"
          >
            <option value="">All Actions</option>
            {['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'LOGIN', 'LOGOUT'].map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          {/* Resource */}
          <select
            value={filters.resource}
            onChange={(e) => handleFilterChange('resource', e.target.value)}
            className="hacker-input text-xs"
          >
            <option value="">All Resources</option>
            {uniqueResources.map(resource => (
              <option key={resource} value={resource}>{resource}</option>
            ))}
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="hacker-input text-xs"
            title="Start Date"
          />

          {/* End Date */}
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="hacker-input text-xs"
            title="End Date"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="hacker-card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono text-hacker-text-dim">
            Audit Logs ({total.toLocaleString()} total)
          </h3>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-2 py-1 text-xs font-mono text-hacker-text-dim hover:text-hacker-text transition-colors disabled:opacity-50"
          >
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-hacker-border/30">
                <th
                  className="text-left py-2 px-2 text-hacker-text-dim cursor-pointer hover:text-hacker-text"
                  onClick={() => handleSort('timestamp')}
                >
                  Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-2 px-2 text-hacker-text-dim cursor-pointer hover:text-hacker-text"
                  onClick={() => handleSort('userId')}
                >
                  User {sortField === 'userId' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-2 px-2 text-hacker-text-dim cursor-pointer hover:text-hacker-text"
                  onClick={() => handleSort('action')}
                >
                  Action {sortField === 'action' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-2 px-2 text-hacker-text-dim cursor-pointer hover:text-hacker-text"
                  onClick={() => handleSort('resource')}
                >
                  Resource {sortField === 'resource' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-2 px-2 text-hacker-text-dim">IP</th>
                <th className="text-left py-2 px-2 text-hacker-text-dim">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-hacker-text-dim">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-hacker-text-dim">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionConfig = ACTION_CONFIG[log.action] || { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '?' };
                  const resourceIcon = RESOURCE_ICONS[log.resource] || '📄';

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-hacker-border/10 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-2 px-2 text-hacker-text-dim" title={formatDate(log.timestamp)}>
                        {formatRelativeTime(log.timestamp)}
                      </td>
                      <td className="py-2 px-2 text-hacker-text truncate max-w-[150px]" title={log.userId}>
                        {log.userId}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded ${actionConfig.bg} ${actionConfig.color}`}>
                          {actionConfig.icon} {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-hacker-text">
                          {resourceIcon} {log.resource}
                          {log.resourceId && (
                            <span className="text-hacker-text-dim ml-1">#{log.resourceId.slice(0, 8)}</span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-hacker-text-dim">{log.ipAddress || '-'}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-hacker-cyan hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-hacker-border/30">
            <div className="text-xs text-hacker-text-dim">
              Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs font-mono bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs font-mono bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-xs font-mono text-hacker-text-dim">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs font-mono bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs font-mono bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="hacker-card w-full max-w-2xl max-h-[80vh] overflow-auto m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-hacker-cyan">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-hacker-text-dim hover:text-hacker-text"
              >
                &#10005;
              </button>
            </div>

            <div className="space-y-4 text-sm font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">ID</div>
                  <div className="text-hacker-text break-all">{selectedLog.id}</div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">Timestamp</div>
                  <div className="text-hacker-text">{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">User ID</div>
                  <div className="text-hacker-text break-all">{selectedLog.userId}</div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">Action</div>
                  <div>
                    {(() => {
                      const config = ACTION_CONFIG[selectedLog.action] || { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '?' };
                      return (
                        <span className={`px-2 py-1 rounded ${config.bg} ${config.color}`}>
                          {config.icon} {selectedLog.action}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">Resource</div>
                  <div className="text-hacker-text">
                    {RESOURCE_ICONS[selectedLog.resource] || '📄'} {selectedLog.resource}
                  </div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">Resource ID</div>
                  <div className="text-hacker-text break-all">{selectedLog.resourceId || '-'}</div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">IP Address</div>
                  <div className="text-hacker-text">{selectedLog.ipAddress || '-'}</div>
                </div>
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">User Agent</div>
                  <div className="text-hacker-text text-xs truncate" title={selectedLog.userAgent}>
                    {selectedLog.userAgent || '-'}
                  </div>
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <div className="text-hacker-text-dim text-xs mb-1">Metadata</div>
                  <pre className="bg-black/30 rounded p-3 overflow-auto max-h-64 text-xs text-hacker-text">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-mono bg-hacker-border/30 rounded hover:bg-hacker-border/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditPane;
