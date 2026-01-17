/**
 * ActionEditor Component
 * Editor for individual agent actions (shell, api, mcp)
 */

export default function ActionEditor({
  index,
  action,
  actionTypes,
  mcpServers = [],
  error,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canRemove
}) {
  const actionType = actionTypes.find(a => a.value === action.type);

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'var(--bg-glass)',
        border: `1px solid ${error ? 'var(--error-color)' : 'var(--border-subtle)'}`
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            #{index + 1}
          </span>
          <select
            value={action.type}
            onChange={e => onChange('type', e.target.value)}
            className="text-sm px-2 py-1 rounded"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            {actionTypes.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 rounded disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 rounded disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded text-red-400 hover:bg-red-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Shell command */}
      {action.type === 'shell' && (
        <input
          type="text"
          value={action.config.command || ''}
          onChange={e => onChange('command', e.target.value)}
          className="w-full px-3 py-2 rounded text-sm font-mono"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)'
          }}
          placeholder="npm run build"
        />
      )}

      {/* API call */}
      {action.type === 'api' && (
        <div className="flex gap-2">
          <select
            value={action.config.method || 'GET'}
            onChange={e => onChange('method', e.target.value)}
            className="px-3 py-2 rounded text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input
            type="url"
            value={action.config.url || ''}
            onChange={e => onChange('url', e.target.value)}
            className="flex-1 px-3 py-2 rounded text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            placeholder="https://api.example.com/webhook"
          />
        </div>
      )}

      {/* MCP tool */}
      {action.type === 'mcp' && (
        <div className="space-y-2">
          <select
            value={action.config.serverId || ''}
            onChange={e => {
              onChange('serverId', e.target.value);
              onChange('toolName', ''); // Reset tool when server changes
            }}
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Select MCP Server...</option>
            {mcpServers.map(server => (
              <option key={server.id} value={server.id}>
                {server.name} {server.status === 'RUNNING' ? '(Running)' : server.status === 'STOPPED' ? '(Stopped)' : ''}
              </option>
            ))}
          </select>
          <select
            value={action.config.toolName || ''}
            onChange={e => onChange('toolName', e.target.value)}
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            disabled={!action.config.serverId}
          >
            <option value="">Select Tool...</option>
            {action.config.serverId && mcpServers
              .find(s => s.id === action.config.serverId)
              ?.config?.tools?.map(tool => (
                <option key={tool} value={tool}>{tool}</option>
              ))
            }
          </select>
          {action.config.serverId && !mcpServers.find(s => s.id === action.config.serverId)?.config?.tools?.length && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No tools configured for this server. Tools will be discovered when the server runs.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--error-color)' }}>{error}</p>
      )}

      {actionType?.description && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
          {actionType.description}
        </p>
      )}
    </div>
  );
}
