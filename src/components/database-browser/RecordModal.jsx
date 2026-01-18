/**
 * RecordModal Component
 * Modal for editing database records
 */

import { useState } from 'react';

export default function RecordModal({ record, columns, onClose, onSave, onDelete }) {
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
                    } catch {
                      // Invalid JSON, keep current value
                    }
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
