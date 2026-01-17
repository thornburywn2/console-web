/**
 * API Tester Component
 * HTTP request builder and tester
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import {
  HTTP_METHODS,
  CONTENT_TYPES,
  HeaderRow,
  ParamRow,
  ResponseViewer,
  SavedRequestCard,
} from './api-tester';
import { proxyApi } from '../services/api.js';

export default function ApiTester({ isOpen, onClose, embedded = false }) {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }]);
  const [params, setParams] = useState([]);
  const [body, setBody] = useState('');
  const [contentType, setContentType] = useState('application/json');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('params');
  const [savedRequests, setSavedRequests] = useState([]);
  const [history, setHistory] = useState([]);

  // Load saved requests from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api-tester-saved');
    if (saved) {
      try {
        setSavedRequests(JSON.parse(saved));
      } catch {}
    }
    const hist = localStorage.getItem('api-tester-history');
    if (hist) {
      try {
        setHistory(JSON.parse(hist));
      } catch {}
    }
  }, []);

  const saveToStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (index, header) => {
    const newHeaders = [...headers];
    newHeaders[index] = header;
    setHeaders(newHeaders);
  };
  const removeHeader = (index) => setHeaders(headers.filter((_, i) => i !== index));

  const addParam = () => setParams([...params, { key: '', value: '' }]);
  const updateParam = (index, param) => {
    const newParams = [...params];
    newParams[index] = param;
    setParams(newParams);
  };
  const removeParam = (index) => setParams(params.filter((_, i) => i !== index));

  const buildUrl = () => {
    if (!url) return '';
    const activeParams = params.filter(p => p.key.trim());
    if (activeParams.length === 0) return url;
    const searchParams = new URLSearchParams();
    activeParams.forEach(p => searchParams.append(p.key, p.value));
    return `${url}?${searchParams.toString()}`;
  };

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    setResponse(null);

    const startTime = performance.now();
    const fullUrl = buildUrl();

    try {
      const requestHeaders = {};
      headers.filter(h => h.key.trim()).forEach(h => {
        requestHeaders[h.key] = h.value;
      });

      const requestBody = (method !== 'GET' && method !== 'HEAD' && body) ? body : undefined;

      // Use backend proxy for CORS
      const data = await proxyApi.request(fullUrl, method, requestHeaders, requestBody);
      const endTime = performance.now();

      const responseObj = {
        status: data.status || 200,
        statusText: data.statusText || 'OK',
        headers: data.headers || {},
        body: data.body || data,
        time: Math.round(endTime - startTime),
        size: `${new Blob([JSON.stringify(data.body || data)]).size} B`
      };

      setResponse(responseObj);

      // Add to history
      const historyItem = {
        id: Date.now(),
        method,
        url: fullUrl,
        status: responseObj.status,
        time: responseObj.time,
        timestamp: new Date().toISOString()
      };
      const newHistory = [historyItem, ...history.slice(0, 49)];
      setHistory(newHistory);
      saveToStorage('api-tester-history', newHistory);

    } catch (error) {
      const message = error.getUserMessage?.() || error.message;
      setResponse({
        status: 0,
        statusText: 'Error',
        body: message,
        time: Math.round(performance.now() - startTime),
        size: '0 B'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRequest = () => {
    const name = prompt('Request name:');
    if (!name) return;

    const request = {
      id: Date.now(),
      name,
      method,
      url,
      headers,
      params,
      body,
      contentType
    };

    const newSaved = [...savedRequests, request];
    setSavedRequests(newSaved);
    saveToStorage('api-tester-saved', newSaved);
  };

  const loadRequest = (request) => {
    setMethod(request.method);
    setUrl(request.url);
    setHeaders(request.headers || []);
    setParams(request.params || []);
    setBody(request.body || '');
    setContentType(request.contentType || 'application/json');
  };

  const deleteSavedRequest = (id) => {
    const newSaved = savedRequests.filter(r => r.id !== id);
    setSavedRequests(newSaved);
    saveToStorage('api-tester-saved', newSaved);
  };

  const methodConfig = HTTP_METHODS.find(m => m.method === method);

  if (!isOpen && !embedded) return null;

  // Embedded content (for inline use in admin dashboard)
  const content = (
    <div className={embedded ? "space-y-4" : "flex-1 overflow-auto p-4 space-y-4"}>
      {/* URL Bar */}
      <div className="flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-3 py-2 text-sm font-bold rounded"
          style={{
            background: methodConfig.color + '20',
            color: methodConfig.color,
            border: 'none'
          }}
        >
          {HTTP_METHODS.map(m => (
            <option key={m.method} value={m.method}>{m.method}</option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 px-3 py-2 text-sm rounded font-mono"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        />
        <button
          onClick={sendRequest}
          disabled={loading || !url}
          className="px-4 py-2 text-sm font-medium rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>

      {/* Response (simplified for embedded) */}
      {response && (
        <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="font-bold"
              style={{ color: response.status >= 200 && response.status < 300 ? '#2ecc71' : '#e74c3c' }}
            >
              {response.status}
            </span>
            <span className="text-xs text-muted">{response.time}ms</span>
          </div>
          <pre className="text-xs font-mono text-secondary overflow-auto max-h-32 whitespace-pre-wrap">
            {typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body}
          </pre>
        </div>
      )}
    </div>
  );

  // Return embedded content directly
  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">API Tester</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar */}
          <div
            className="w-56 flex-shrink-0 p-4 overflow-auto"
            style={{ borderRight: '1px solid var(--border-subtle)' }}
          >
            <h4 className="text-sm font-medium text-primary mb-2">Saved</h4>
            <div className="space-y-1 mb-4">
              {savedRequests.map(req => (
                <SavedRequestCard
                  key={req.id}
                  request={req}
                  onLoad={loadRequest}
                  onDelete={deleteSavedRequest}
                />
              ))}
              {savedRequests.length === 0 && (
                <div className="text-xs text-muted py-2">No saved requests</div>
              )}
            </div>

            <h4 className="text-sm font-medium text-primary mb-2">History</h4>
            <div className="space-y-1">
              {history.slice(0, 10).map(req => (
                <div
                  key={req.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer"
                  onClick={() => setUrl(req.url)}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: HTTP_METHODS.find(m => m.method === req.method)?.color }}
                  >
                    {req.method}
                  </span>
                  <span className="flex-1 text-xs text-muted truncate">{req.url.split('?')[0]}</span>
                  <span
                    className="text-xs"
                    style={{ color: req.status >= 200 && req.status < 300 ? '#2ecc71' : '#e74c3c' }}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* URL Bar */}
            <div className="flex items-center gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 text-sm font-bold rounded"
                style={{
                  background: methodConfig.color + '20',
                  color: methodConfig.color,
                  border: 'none'
                }}
              >
                {HTTP_METHODS.map(m => (
                  <option key={m.method} value={m.method}>{m.method}</option>
                ))}
              </select>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
                placeholder="https://api.example.com/endpoint"
                className="flex-1 px-3 py-2 text-sm rounded font-mono"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
              />
              <button
                onClick={sendRequest}
                disabled={loading || !url}
                className="px-4 py-2 text-sm font-medium rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={saveRequest}
                className="p-2 hover:bg-white/10 rounded"
                title="Save request"
              >
                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['params', 'headers', 'body'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 text-sm capitalize ${
                    activeTab === tab
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {tab}
                  {tab === 'params' && params.filter(p => p.key).length > 0 && (
                    <span className="ml-1 text-xs">({params.filter(p => p.key).length})</span>
                  )}
                  {tab === 'headers' && headers.filter(h => h.key).length > 0 && (
                    <span className="ml-1 text-xs">({headers.filter(h => h.key).length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-32">
              {activeTab === 'params' && (
                <div>
                  {params.map((param, i) => (
                    <ParamRow
                      key={i}
                      param={param}
                      onChange={(p) => updateParam(i, p)}
                      onDelete={() => removeParam(i)}
                    />
                  ))}
                  <button
                    onClick={addParam}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Parameter
                  </button>
                </div>
              )}

              {activeTab === 'headers' && (
                <div>
                  {headers.map((header, i) => (
                    <HeaderRow
                      key={i}
                      header={header}
                      onChange={(h) => updateHeader(i, h)}
                      onDelete={() => removeHeader(i)}
                    />
                  ))}
                  <button
                    onClick={addHeader}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Header
                  </button>
                </div>
              )}

              {activeTab === 'body' && (
                <div className="space-y-2">
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="px-2 py-1 text-xs rounded"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {CONTENT_TYPES.map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={contentType === 'application/json' ? '{\n  "key": "value"\n}' : 'Request body...'}
                    className="w-full h-32 px-3 py-2 text-sm font-mono rounded resize-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* Response */}
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">Response</h4>
              {loading ? (
                <div className="text-center text-muted py-8">
                  <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
                  Sending request...
                </div>
              ) : response ? (
                <ResponseViewer response={response} />
              ) : (
                <div className="text-center text-muted py-8">
                  Send a request to see the response
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
