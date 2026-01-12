/**
 * Database Browser Component
 * Built-in database GUI for browsing tables and running queries
 */

import { useState, useEffect, useCallback } from 'react';

const TYPE_COLORS = {
  string: '#2ecc71',
  number: '#3498db',
  boolean: '#9b59b6',
  date: '#f39c12',
  json: '#e67e22',
  null: '#95a5a6',
};

function TableListItem({ table, isSelected, onClick }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-accent/20 text-accent' : 'hover:bg-white/5 text-secondary'
      }`}
      onClick={onClick}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span className="text-sm truncate">{table.name}</span>
      <span className="text-xs text-muted ml-auto">{table.rowCount}</span>
    </div>
  );
}

function ColumnHeader({ column, sortColumn, sortDirection, onSort }) {
  const isActive = sortColumn === column.name;

  return (
    <th
      className="px-3 py-2 text-left cursor-pointer hover:bg-white/5 select-none"
      onClick={() => onSort(column.name)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted">{column.name}</span>
        <span
          className="text-xs px-1 py-0.5 rounded"
          style={{ background: TYPE_COLORS[column.type] + '20', color: TYPE_COLORS[column.type] }}
        >
          {column.type}
        </span>
        {isActive && (
          <svg className={`w-3 h-3 text-accent ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );
}

function DataCell({ value, type }) {
  const displayValue = value === null ? 'NULL' :
                       type === 'json' ? JSON.stringify(value).slice(0, 50) :
                       type === 'date' ? new Date(value).toLocaleString() :
                       type === 'boolean' ? (value ? 'true' : 'false') :
                       String(value).slice(0, 100);

  return (
    <td className="px-3 py-2 text-sm font-mono truncate max-w-xs" style={{ color: TYPE_COLORS[type] || 'inherit' }}>
      {displayValue}
      {String(value).length > 100 && <span className="text-muted">...</span>}
    </td>
  );
}

function QueryEditor({ query, onChange, onRun, running }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-primary">SQL Query</h4>
        <button
          onClick={onRun}
          disabled={running || !query.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
        >
          {running ? (
            <>
              <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Run Query
            </>
          )}
        </button>
      </div>
      <textarea
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10;"
        className="w-full h-32 px-3 py-2 rounded font-mono text-sm resize-none"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
        spellCheck={false}
      />
    </div>
  );
}

function RecordModal({ record, columns, onClose, onSave, onDelete }) {
  const [editedRecord, setEditedRecord] = useState(record);

  const handleFieldChange = (column, value) => {
    setEditedRecord({ ...editedRecord, [column]: value });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-lg font-semibold text-primary">Edit Record</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {columns.map(col => (
            <div key={col.name}>
              <label className="block text-xs text-muted mb-1">{col.name}</label>
              {col.type === 'boolean' ? (
                <select
                  value={editedRecord[col.name] === null ? '' : String(editedRecord[col.name])}
                  onChange={(e) => handleFieldChange(col.name, e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-1.5 text-sm rounded"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">NULL</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : col.type === 'json' ? (
                <textarea
                  value={editedRecord[col.name] === null ? '' : JSON.stringify(editedRecord[col.name], null, 2)}
                  onChange={(e) => {
                    try {
                      handleFieldChange(col.name, JSON.parse(e.target.value));
                    } catch {}
                  }}
                  className="w-full h-24 px-3 py-1.5 text-sm font-mono rounded resize-none"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
              ) : (
                <input
                  type={col.type === 'number' ? 'number' : col.type === 'date' ? 'datetime-local' : 'text'}
                  value={editedRecord[col.name] === null ? '' : editedRecord[col.name]}
                  onChange={(e) => handleFieldChange(col.name, e.target.value || null)}
                  className="w-full px-3 py-1.5 text-sm rounded font-mono"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => onDelete(record)}
            className="px-4 py-1.5 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded bg-white/5 text-muted hover:text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editedRecord)}
              className="px-4 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseBrowser({ isOpen, onClose, embedded = false }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const pageSize = 25;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/db/tables');
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(sortColumn && { sortColumn, sortDirection }),
        ...(filter && { filter })
      });
      const response = await fetch(`/api/db/tables/${selectedTable}/data?${params}`);
      if (response.ok) {
        const data = await response.json();
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setTotalRows(data.totalRows || 0);
      }
    } catch (error) {
      console.error('Failed to fetch table data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, sortColumn, sortDirection, filter]);

  useEffect(() => {
    if (isOpen || embedded) {
      fetchTables();
    }
  }, [isOpen, embedded, fetchTables]);

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
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      if (response.ok) {
        setQueryResults(data);
      } else {
        setQueryError(data.error || 'Query failed');
      }
    } catch (error) {
      setQueryError(error.message);
    } finally {
      setRunningQuery(false);
    }
  };

  const handleSaveRecord = async (record) => {
    try {
      await fetch(`/api/db/tables/${selectedTable}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      fetchTableData();
      setEditingRecord(null);
    } catch (error) {
      console.error('Failed to save record:', error);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!confirm('Delete this record?')) return;
    try {
      await fetch(`/api/db/tables/${selectedTable}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      fetchTableData();
      setEditingRecord(null);
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const totalPages = Math.ceil(totalRows / pageSize);

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
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
