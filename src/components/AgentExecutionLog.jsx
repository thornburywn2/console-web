/**
 * AgentExecutionLog Component
 * Displays paginated table of agent execution history
 * Sortable columns, status badges, duration calculation
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { agentExecutionsApi } from '../services/api.js';

const STATUS_STYLES = {
  SUCCESS: 'bg-green-500/20 text-green-400 border-green-500/30',
  FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
  RUNNING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANCELLED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PENDING: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

const STATUS_ICONS = {
  SUCCESS: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  FAILED: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  RUNNING: (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  CANCELLED: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  PENDING: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  )
};

function formatDuration(startedAt, endedAt) {
  if (!startedAt) return '-';

  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diff = Math.floor((end - start) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function AgentExecutionLog({ agentId }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [sortField, setSortField] = useState('startedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedExecution, setSelectedExecution] = useState(null);

  const fetchExecutions = useCallback(async () => {
    if (!agentId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await agentExecutionsApi.list(agentId, pagination.page, pagination.limit);
      setExecutions(data.executions || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  // Sort executions locally
  const sortedExecutions = [...executions].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'startedAt' || sortField === 'endedAt') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading && executions.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-700/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-400">
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg font-medium">No executions yet</p>
        <p className="text-sm mt-1">Run the agent to see execution history here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
              <th
                className="pb-3 pr-4 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th
                className="pb-3 pr-4 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('startedAt')}
              >
                <div className="flex items-center gap-1">
                  Started
                  <SortIcon field="startedAt" />
                </div>
              </th>
              <th
                className="pb-3 pr-4 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('endedAt')}
              >
                <div className="flex items-center gap-1">
                  Duration
                  <SortIcon field="endedAt" />
                </div>
              </th>
              <th className="pb-3 pr-4">Trigger</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {sortedExecutions.map((execution) => (
              <tr
                key={execution.id}
                className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${
                  selectedExecution?.id === execution.id ? 'bg-gray-700/50' : ''
                }`}
                onClick={() => setSelectedExecution(
                  selectedExecution?.id === execution.id ? null : execution
                )}
              >
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[execution.status] || STATUS_STYLES.PENDING}`}>
                    {STATUS_ICONS[execution.status] || STATUS_ICONS.PENDING}
                    {execution.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-300">
                  {formatDate(execution.startedAt)}
                </td>
                <td className="py-3 pr-4 text-gray-300 font-mono">
                  {formatDuration(execution.startedAt, execution.endedAt)}
                </td>
                <td className="py-3 pr-4 text-gray-400">
                  {execution.triggeredBy || 'manual'}
                </td>
                <td className="py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExecution(execution);
                    }}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} executions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Execution Detail Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[selectedExecution.status]}`}>
                  {STATUS_ICONS[selectedExecution.status]}
                  {selectedExecution.status}
                </span>
                <span className="text-sm text-gray-400">
                  {formatDate(selectedExecution.startedAt)}
                </span>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Duration</span>
                  <p className="text-gray-200 font-mono">
                    {formatDuration(selectedExecution.startedAt, selectedExecution.endedAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Triggered By</span>
                  <p className="text-gray-200">{selectedExecution.triggeredBy || 'Manual'}</p>
                </div>
              </div>

              {/* Output */}
              {selectedExecution.output && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Output</h4>
                  <pre className="bg-gray-900 rounded p-3 text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-64">
                    {selectedExecution.output}
                  </pre>
                </div>
              )}

              {/* Error */}
              {selectedExecution.error && (
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">Error</h4>
                  <pre className="bg-red-900/20 border border-red-500/30 rounded p-3 text-sm text-red-300 overflow-x-auto whitespace-pre-wrap font-mono">
                    {selectedExecution.error}
                  </pre>
                </div>
              )}

              {/* Results */}
              {selectedExecution.results && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Action Results</h4>
                  <pre className="bg-gray-900 rounded p-3 text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-64">
                    {JSON.stringify(selectedExecution.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
