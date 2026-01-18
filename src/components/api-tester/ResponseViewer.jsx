/**
 * ResponseViewer Component
 * Display API response with pretty/raw/headers views
 */

import { useState } from 'react';

export default function ResponseViewer({ response }) {
  const [viewMode, setViewMode] = useState('pretty');

  if (!response) return null;

  const isJson = response.headers?.['content-type']?.includes('application/json');
  let prettyBody = response.body;
  try {
    if (isJson && typeof response.body === 'string') {
      prettyBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } else if (typeof response.body === 'object') {
      prettyBody = JSON.stringify(response.body, null, 2);
    }
  } catch {
    // JSON parsing failed, use raw body
  }

  const statusColor = response.status >= 200 && response.status < 300 ? '#2ecc71' :
                      response.status >= 400 ? '#e74c3c' : '#f39c12';

  return (
    <div className="space-y-3">
      {/* Status */}
      <div className="flex items-center gap-3">
        <span
          className="text-xl font-bold"
          style={{ color: statusColor }}
        >
          {response.status}
        </span>
        <span className="text-muted">{response.statusText}</span>
        <div className="flex-1" />
        <span className="text-xs text-muted">{response.time}ms</span>
        <span className="text-xs text-muted">{response.size}</span>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('pretty')}
          className={`px-2 py-1 text-xs rounded ${
            viewMode === 'pretty' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary'
          }`}
        >
          Pretty
        </button>
        <button
          onClick={() => setViewMode('raw')}
          className={`px-2 py-1 text-xs rounded ${
            viewMode === 'raw' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary'
          }`}
        >
          Raw
        </button>
        <button
          onClick={() => setViewMode('headers')}
          className={`px-2 py-1 text-xs rounded ${
            viewMode === 'headers' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary'
          }`}
        >
          Headers
        </button>
      </div>

      {/* Content */}
      <div
        className="rounded overflow-auto max-h-96"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
      >
        {viewMode === 'headers' ? (
          <div className="p-3 space-y-1">
            {Object.entries(response.headers || {}).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="font-mono text-accent">{key}:</span>
                <span className="font-mono text-muted">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="p-3 text-xs font-mono text-secondary overflow-auto whitespace-pre-wrap">
            {viewMode === 'pretty' ? prettyBody : response.body}
          </pre>
        )}
      </div>
    </div>
  );
}
