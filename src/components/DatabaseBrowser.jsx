/**
 * Database Browser Component
 * Built-in database GUI for browsing tables and running queries
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TableListItem,
  ColumnHeader,
  DataCell,
  QueryEditor,
  RecordModal,
} from './database-browser';
import { useApiQuery } from '../hooks/useApiQuery';
import api from '../services/api';

export default function DatabaseBrowser({ isOpen, onClose, embedded = false }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [runningQuery, setRunningQuery] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  const [actionError, setActionError] = useState(null);

  const pageSize = 25;

  // Fetch tables using useApiQuery
  const {
    data: tablesData,
    loading: tablesLoading,
    error: tablesError,
    refetch: fetchTables
  } = useApiQuery('/db/tables', {
    enabled: isOpen || embedded,
  });

  const tables = tablesData?.tables || [];
  const loading = tablesLoading || tableDataLoading;
  const error = actionError || (tablesError ? tablesError.getUserMessage() : null);

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    setTableDataLoading(true);
    setActionError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(sortColumn && { sortColumn, sortDirection }),
        ...(filter && { filter })
      });
      const data = await api.get(`/db/tables/${selectedTable}/data?${params}`);
      setColumns(data.columns || []);
      setRows(data.rows || []);
      setTotalRows(data.totalRows || 0);
    } catch (err) {
      console.error('Failed to fetch table data:', err);
      setActionError(err.getUserMessage ? err.getUserMessage() : `Failed to load data for table "${selectedTable}".`);
    } finally {
      setTableDataLoading(false);
    }
  }, [selectedTable, page, sortColumn, sortDirection, filter]);

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      fetchTableData();
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [page, sortColumn, sortDirection, fetchTableData]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRunQuery = async () => {
    setRunningQuery(true);
    setQueryError(null);
    setQueryResults(null);
    try {
      const data = await api.post('/db/query', { query });
      setQueryResults(data);
    } catch (err) {
      setQueryError(err.getUserMessage ? err.getUserMessage() : err.message);
    } finally {
      setRunningQuery(false);
    }
  };

  const handleSaveRecord = async (record) => {
    setActionError(null);
    try {
      await api.put(`/db/tables/${selectedTable}/update`, record);
      fetchTableData();
      setEditingRecord(null);
    } catch (err) {
      console.error('Failed to save record:', err);
      setActionError(err.getUserMessage ? err.getUserMessage() : 'Failed to save record. Please try again.');
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!confirm('Delete this record?')) return;
    setActionError(null);
    try {
      await api.delete(`/db/tables/${selectedTable}/delete`, record);
      fetchTableData();
      setEditingRecord(null);
    } catch (err) {
      console.error('Failed to delete record:', err);
      setActionError(err.getUserMessage ? err.getUserMessage() : 'Failed to delete record. Please try again.');
    }
  };

  const totalPages = Math.ceil(totalRows / pageSize);

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => { setActionError(null); fetchTables(); }}
            className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* SQL Editor toggle */}
      <button
        onClick={() => setShowQueryEditor(!showQueryEditor)}
        className="w-full py-2 text-sm rounded bg-accent text-white hover:bg-accent/80"
      >
        {showQueryEditor ? 'Hide SQL Editor' : 'Open SQL Editor'}
      </button>

      {/* Tables summary */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded" style={{ background: 'rgba(52, 152, 219, 0.2)' }}>
          <div className="text-lg font-bold text-blue-400">{tables.length}</div>
          <div className="text-xs text-muted">Tables</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(155, 89, 182, 0.2)' }}>
          <div className="text-lg font-bold text-purple-400">{totalRows || 0}</div>
          <div className="text-xs text-muted">Selected Rows</div>
        </div>
      </div>

      {/* Quick table list */}
      <div className="space-y-1 max-h-48 overflow-auto">
        {tables.slice(0, 6).map(table => (
          <button
            key={table.name}
            onClick={() => setSelectedTable(table.name)}
            className={'w-full text-left px-2 py-1.5 rounded text-sm flex justify-between items-center ' +
              (selectedTable === table.name ? 'bg-accent/20 text-accent' : 'hover:bg-white/5 text-secondary')}
          >
            <span className="truncate">{table.name}</span>
            <span className="text-xs text-muted">{table.rowCount}</span>
          </button>
        ))}
        {tables.length === 0 && !loading && (
          <div className="text-center text-xs text-muted py-4">No tables found</div>
        )}
        {loading && (
          <div className="text-center text-xs text-muted py-4">Loading...</div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Database Browser</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQueryEditor(!showQueryEditor)}
              className={`px-3 py-1.5 text-sm rounded ${
                showQueryEditor ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted hover:text-primary'
              }`}
            >
              SQL Editor
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mx-4 mt-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => { setActionError(null); selectedTable ? fetchTableData() : fetchTables(); }}
              className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm text-red-400"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Table List */}
          <div
            className="w-56 flex-shrink-0 p-4 overflow-auto"
            style={{ borderRight: '1px solid var(--border-subtle)' }}
          >
            <h4 className="text-sm font-medium text-primary mb-3">Tables</h4>
            {loading && !tables.length ? (
              <div className="text-center text-muted py-4">Loading...</div>
            ) : (
              <div className="space-y-1">
                {tables.map(table => (
                  <TableListItem
                    key={table.name}
                    table={table}
                    isSelected={selectedTable === table.name}
                    onClick={() => {
                      setSelectedTable(table.name);
                      setShowQueryEditor(false);
                      setQueryResults(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {showQueryEditor ? (
              <div className="p-4 space-y-4 overflow-auto">
                <QueryEditor
                  query={query}
                  onChange={setQuery}
                  onRun={handleRunQuery}
                  running={runningQuery}
                />
                {queryError && (
                  <div className="p-3 rounded bg-red-500/10 text-red-400 text-sm font-mono">
                    {queryError}
                  </div>
                )}
                {queryResults && (
                  <div>
                    <div className="text-xs text-muted mb-2">
                      {queryResults.rows?.length || 0} rows • {queryResults.executionTime}ms
                    </div>
                    <div className="overflow-auto rounded" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            {queryResults.columns?.map(col => (
                              <th key={col.name} className="px-3 py-2 text-left text-xs font-medium text-muted">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResults.rows?.map((row, i) => (
                            <tr key={i} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                              {queryResults.columns?.map(col => (
                                <DataCell key={col.name} value={row[col.name]} type={col.type} />
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedTable ? (
              <>
                {/* Filter */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchTableData()}
                    placeholder="Filter records..."
                    className="flex-1 px-3 py-1.5 text-sm rounded"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                  />
                  <button
                    onClick={fetchTableData}
                    className="px-3 py-1.5 text-sm rounded bg-accent/20 text-accent hover:bg-accent/30"
                  >
                    Apply
                  </button>
                  <span className="text-xs text-muted">{totalRows} rows</span>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0" style={{ background: 'var(--bg-tertiary)' }}>
                      <tr>
                        <th className="w-10 px-2"></th>
                        {columns.map(col => (
                          <ColumnHeader
                            key={col.name}
                            column={col}
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-white/5 cursor-pointer"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onClick={() => setEditingRecord(row)}
                        >
                          <td className="px-2 py-2">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </td>
                          {columns.map(col => (
                            <DataCell key={col.name} value={row[col.name]} type={col.type} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm rounded bg-white/5 text-muted hover:text-primary disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm rounded bg-white/5 text-muted hover:text-primary disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted">
                Select a table to view data
              </div>
            )}
          </div>
        </div>

        {/* Edit Record Modal */}
        {editingRecord && (
          <RecordModal
            record={editingRecord}
            columns={columns}
            onClose={() => setEditingRecord(null)}
            onSave={handleSaveRecord}
            onDelete={handleDeleteRecord}
          />
        )}
      </div>
    </div>
  );
}
