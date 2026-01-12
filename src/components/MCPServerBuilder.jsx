/**
 * MCPServerBuilder Component
 * Form for creating and editing MCP server configurations
 */

import { useState, useEffect } from 'react';

const TRANSPORT_OPTIONS = [
  {
    value: 'STDIO',
    label: 'Standard I/O',
    description: 'Spawn a local process and communicate via stdin/stdout',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    value: 'SSE',
    label: 'Server-Sent Events',
    description: 'Connect to an HTTP server using SSE',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    value: 'WEBSOCKET',
    label: 'WebSocket',
    description: 'Connect via WebSocket protocol',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

export default function MCPServerBuilder({ server, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    transport: 'STDIO',
    command: '',
    args: [],
    env: {},
    url: '',
    headers: {},
    enabled: true,
    isGlobal: true,
    projectId: null
  });
  const [argsText, setArgsText] = useState('');
  const [envText, setEnvText] = useState('');
  const [headersText, setHeadersText] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);

  // Load existing data if editing
  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name || '',
        transport: server.transport || 'STDIO',
        command: server.command || '',
        args: server.args || [],
        env: server.env || {},
        url: server.url || '',
        headers: server.headers || {},
        enabled: server.enabled !== false,
        isGlobal: server.isGlobal !== false,
        projectId: server.projectId || null
      });
      setArgsText((server.args || []).join('\n'));
      setEnvText(Object.entries(server.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'));
      setHeadersText(Object.entries(server.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n'));
    }
  }, [server]);

  // Fetch projects for dropdown
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error('Failed to fetch projects:', err));
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const parseArgs = (text) => {
    return text.split('\n').map(s => s.trim()).filter(Boolean);
  };

  const parseEnv = (text) => {
    const env = {};
    text.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    return env;
  };

  const parseHeaders = (text) => {
    const headers = {};
    text.split('\n').forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        headers[match[1].trim()] = match[2].trim();
      }
    });
    return headers;
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Server name is required';
    }

    if (formData.transport === 'STDIO' && !formData.command.trim()) {
      newErrors.command = 'Command is required for STDIO transport';
    }

    if ((formData.transport === 'SSE' || formData.transport === 'WEBSOCKET') && !formData.url.trim()) {
      newErrors.url = 'URL is required for HTTP-based transport';
    }

    if (formData.url && !formData.url.match(/^(https?|wss?):\/\//)) {
      newErrors.url = 'URL must start with http://, https://, ws://, or wss://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const data = {
        ...formData,
        args: parseArgs(argsText),
        env: parseEnv(envText),
        headers: parseHeaders(headersText)
      };
      await onSave(data);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">
            {server ? 'Edit MCP Server' : 'Add MCP Server'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure a Model Context Protocol server connection
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transport selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Transport Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {TRANSPORT_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField('transport', option.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.transport === option.value
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                }`}
              >
                <div className={`${formData.transport === option.value ? 'text-blue-400' : 'text-gray-400'}`}>
                  {option.icon}
                </div>
                <div className="mt-2 font-medium text-gray-200">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Server Name
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., filesystem, github, slack"
            className={`w-full px-4 py-2 bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        {/* STDIO fields */}
        {formData.transport === 'STDIO' && (
          <>
            <div>
              <label htmlFor="command" className="block text-sm font-medium text-gray-300 mb-2">
                Command
              </label>
              <input
                id="command"
                type="text"
                value={formData.command}
                onChange={(e) => updateField('command', e.target.value)}
                placeholder="e.g., npx, python, node"
                className={`w-full px-4 py-2 bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.command ? 'border-red-500' : 'border-gray-700'
                }`}
              />
              {errors.command && (
                <p className="mt-1 text-sm text-red-400">{errors.command}</p>
              )}
            </div>

            <div>
              <label htmlFor="args" className="block text-sm font-medium text-gray-300 mb-2">
                Arguments <span className="text-gray-500">(one per line)</span>
              </label>
              <textarea
                id="args"
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                placeholder={`-y\n@modelcontextprotocol/server-filesystem\n/path/to/directory`}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="env" className="block text-sm font-medium text-gray-300 mb-2">
                Environment Variables <span className="text-gray-500">(KEY=value, one per line)</span>
              </label>
              <textarea
                id="env"
                value={envText}
                onChange={(e) => setEnvText(e.target.value)}
                placeholder={`GITHUB_TOKEN=ghp_xxx\nAPI_KEY=sk-xxx`}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </>
        )}

        {/* HTTP-based fields */}
        {(formData.transport === 'SSE' || formData.transport === 'WEBSOCKET') && (
          <>
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
                URL
              </label>
              <input
                id="url"
                type="text"
                value={formData.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder={formData.transport === 'WEBSOCKET' ? 'wss://example.com/mcp' : 'https://example.com/mcp'}
                className={`w-full px-4 py-2 bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.url ? 'border-red-500' : 'border-gray-700'
                }`}
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-400">{errors.url}</p>
              )}
            </div>

            <div>
              <label htmlFor="headers" className="block text-sm font-medium text-gray-300 mb-2">
                Headers <span className="text-gray-500">(Key: Value, one per line)</span>
              </label>
              <textarea
                id="headers"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder={`Authorization: Bearer xxx\nX-API-Key: xxx`}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </>
        )}

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Scope
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.isGlobal}
                onChange={() => {
                  updateField('isGlobal', true);
                  updateField('projectId', null);
                }}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-gray-300">Global</span>
              <span className="text-xs text-gray-500">(Available to all projects)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!formData.isGlobal}
                onChange={() => updateField('isGlobal', false)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-gray-300">Project-specific</span>
            </label>
          </div>

          {!formData.isGlobal && (
            <select
              value={formData.projectId || ''}
              onChange={(e) => updateField('projectId', e.target.value || null)}
              className="mt-3 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div>
            <div className="font-medium text-gray-200">Enable Server</div>
            <div className="text-sm text-gray-400">Server will start automatically when enabled</div>
          </div>
          <button
            type="button"
            onClick={() => updateField('enabled', !formData.enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              formData.enabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                formData.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Submit error */}
        {errors.submit && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {server ? 'Save Changes' : 'Add Server'}
          </button>
        </div>
      </form>
    </div>
  );
}
