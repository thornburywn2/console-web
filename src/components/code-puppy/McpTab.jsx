/**
 * MCP Tab Component
 * Manages MCP server configuration
 */

import { useState } from 'react';

export default function McpTab({
  mcpServers,
  onAddServer,
  onRemoveServer,
  onSyncFromClaude,
  error,
  setError,
}) {
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [newMcp, setNewMcp] = useState({ name: '', command: '', args: '' });

  const handleAdd = async () => {
    if (!newMcp.name || !newMcp.command) {
      setError('Name and command are required');
      return;
    }

    const success = await onAddServer(
      newMcp.name,
      newMcp.command,
      newMcp.args ? newMcp.args.split(' ') : []
    );

    if (success) {
      setShowAddMcp(false);
      setNewMcp({ name: '', command: '', args: '' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">MCP Servers</h3>
        <div className="flex gap-2">
          <button onClick={onSyncFromClaude}
            className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-500"
            title="Import MCP servers from Claude Code">
            🔄 Sync from Claude
          </button>
          <button onClick={() => setShowAddMcp(!showAddMcp)}
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">
            {showAddMcp ? 'Cancel' : '+ Add Server'}
          </button>
        </div>
      </div>

      {showAddMcp && (
        <div className="glass-panel p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Name*</label>
              <input type="text" value={newMcp.name}
                onChange={(e) => setNewMcp(prev => ({ ...prev, name: e.target.value }))}
                placeholder="my-server"
                className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Command*</label>
              <input type="text" value={newMcp.command}
                onChange={(e) => setNewMcp(prev => ({ ...prev, command: e.target.value }))}
                placeholder="npx"
                className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Args (space-separated)</label>
              <input type="text" value={newMcp.args}
                onChange={(e) => setNewMcp(prev => ({ ...prev, args: e.target.value }))}
                placeholder="-y @modelcontextprotocol/server"
                className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
            </div>
          </div>
          <button onClick={handleAdd}
            className="w-full px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500 text-sm">
            Add MCP Server
          </button>
        </div>
      )}

      {Object.keys(mcpServers).length === 0 ? (
        <p className="text-muted text-sm">No MCP servers configured.</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(mcpServers).map(([name, server]) => (
            <div key={name} className="glass-panel p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">{name}</span>
                <div className="text-xs text-muted font-mono">{server.command} {(server.args || []).join(' ')}</div>
              </div>
              <button onClick={() => onRemoveServer(name)}
                className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
