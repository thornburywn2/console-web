/**
 * Status Tab Component
 * Displays installation info, stats, and quick start session
 */

export default function StatusTab({
  status,
  providers,
  availability,
  projects,
  agents,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  selectedAgent,
  setSelectedAgent,
  newSessionProject,
  setNewSessionProject,
  enableDbos,
  setEnableDbos,
  actionLoading,
  onCreateSession,
}) {
  return (
    <div className="space-y-4">
      {/* Installation Info */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">Installation</h3>
        {status?.installed ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted">UV:</span> <span className="text-foreground">{status.uvVersion}</span></div>
            <div><span className="text-muted">Code Puppy:</span> <span className="text-foreground">{status.codePuppyVersion}</span></div>
            <div className="col-span-2"><span className="text-muted">Config:</span> <span className="text-foreground font-mono text-xs">{status.configDir}</span></div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted">Install UV package manager:</p>
            <code className="block p-2 bg-black/30 rounded text-green-400 text-sm">curl -LsSf https://astral.sh/uv/install.sh | sh</code>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: status?.activeSessions || 0, color: 'text-green-400' },
          { label: 'Total Sessions', value: status?.totalSessions || 0, color: 'text-foreground' },
          { label: 'Agents', value: status?.agentCount || 0, color: 'text-blue-400' },
          { label: 'MCP Servers', value: status?.mcpServerCount || 0, color: 'text-purple-400' }
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-3 rounded-lg text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Provider Status */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">Provider Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(availability).map(([key, info]) => (
            <div key={key} className={`p-2 rounded border text-center ${
              info.available ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
            }`}>
              <span className={`text-sm ${info.available ? 'text-green-400' : 'text-red-400'}`}>
                {info.available ? '✓' : '✗'} {providers[key]?.name || key}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Start Session</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Project</label>
            <select value={newSessionProject} onChange={(e) => setNewSessionProject(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.path || p.name} value={p.path || p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Agent</label>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
              {agents.map((a) => (
                <option key={a.name} value={a.name}>{a.displayName || a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Provider</label>
            <select value={selectedProvider} onChange={(e) => {
              setSelectedProvider(e.target.value);
              const models = providers[e.target.value]?.models || [];
              if (models.length) setSelectedModel(models[0].id);
            }} className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
              {Object.entries(providers).map(([key, p]) => (
                <option key={key} value={key} disabled={!availability[key]?.available}>
                  {p.name} {!availability[key]?.available ? '(unavailable)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Model</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm">
              {(providers[selectedProvider]?.models || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.recommended ? '★' : ''} {m.fast ? '⚡' : ''} {m.slow ? '🐢' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={enableDbos} onChange={(e) => setEnableDbos(e.target.checked)}
              className="rounded" />
            Enable DBOS (durable execution)
          </label>
        </div>
        <button onClick={onCreateSession} disabled={actionLoading === 'create' || !newSessionProject || !status?.installed}
          className="mt-3 w-full px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm">
          {actionLoading === 'create' ? 'Starting...' : 'Start Session'}
        </button>
      </div>
    </div>
  );
}
