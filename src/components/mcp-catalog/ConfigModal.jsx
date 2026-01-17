/**
 * MCP Server Configuration Modal
 */

export function ConfigModal({ server, configValues, setConfigValues, installing, onInstall, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-hacker-bg border border-hacker-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-hacker-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-hacker-green font-mono">Configure {server.name}</h3>
            <p className="text-sm text-hacker-text-dim mt-1 font-mono">{server.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-surface rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh] space-y-4">
          {server.configurable?.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-hacker-text mb-1 font-mono">
                {field.label}
                {field.required && <span className="text-hacker-error ml-1">*</span>}
              </label>
              {field.type === 'array' ? (
                <textarea
                  value={configValues[field.key] || ''}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || 'One per line...'}
                  rows={3}
                  className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
                />
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={configValues[field.key] || ''}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
                />
              )}
              {field.description && (
                <p className="text-xs text-hacker-text-dim mt-1 font-mono">{field.description}</p>
              )}
            </div>
          ))}

          {server.tools && (
            <div className="pt-4 border-t border-hacker-border">
              <h4 className="text-sm font-medium text-hacker-text-dim mb-2 font-mono">Available Tools</h4>
              <div className="flex flex-wrap gap-1">
                {server.tools.map(tool => (
                  <span key={tool} className="text-xs px-2 py-1 bg-hacker-surface text-hacker-cyan rounded-full font-mono border border-hacker-border">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-hacker-border flex items-center justify-between bg-hacker-surface/50">
          {server.repository && (
            <a
              href={server.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-hacker-cyan hover:text-hacker-cyan/80 font-mono"
            >
              View Repository
            </a>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-hacker-text-dim hover:text-hacker-text transition-colors border border-hacker-border rounded-lg font-mono"
            >
              Cancel
            </button>
            <button
              onClick={() => onInstall(server)}
              disabled={installing === server.id}
              className="px-4 py-2 bg-hacker-green/20 hover:bg-hacker-green/30 disabled:opacity-50 text-hacker-green rounded-lg transition-colors flex items-center gap-2 border border-hacker-green/30 font-mono"
            >
              {installing === server.id ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Installing...
                </>
              ) : (
                'Install Server'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
