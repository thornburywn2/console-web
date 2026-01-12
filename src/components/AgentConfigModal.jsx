/**
 * AgentConfigModal Component
 * Configuration modal for installing agents from the marketplace
 *
 * Uses hacker theme to match Console.web styling
 */

import { useState } from 'react';

export default function AgentConfigModal({
  agent,
  triggerLabels,
  projects = [],
  isInstalling,
  onInstall,
  onClose
}) {
  const [config, setConfig] = useState(() => {
    // Initialize with defaults from config fields
    const defaults = {};
    agent.configFields?.forEach(field => {
      defaults[field.name] = field.default ?? '';
    });
    return defaults;
  });
  const [selectedTrigger, setSelectedTrigger] = useState(agent.defaultTrigger);
  const [selectedProject, setSelectedProject] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onInstall({
      ...config,
      triggerType: selectedTrigger,
      projectId: selectedProject || null
    });
  };

  const renderField = (field) => {
    const value = config[field.name] ?? '';

    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                [field.name]: e.target.checked
              }))}
              className="w-4 h-4 rounded border-hacker-border bg-hacker-surface text-hacker-green focus:ring-hacker-green focus:ring-offset-hacker-bg"
            />
            <span className="text-hacker-text">{field.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              [field.name]: e.target.value
            }))}
            className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text focus:outline-none focus:border-hacker-green/50 font-mono"
          >
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              [field.name]: parseInt(e.target.value, 10) || 0
            }))}
            className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text focus:outline-none focus:border-hacker-green/50 font-mono"
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              [field.name]: e.target.value
            }))}
            placeholder={field.placeholder || ''}
            className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-hacker-bg border border-hacker-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-hacker-border">
          <div>
            <h3 className="text-lg font-semibold text-hacker-green font-mono">{agent.name}</h3>
            <p className="text-sm text-hacker-text-dim font-mono">Configure and install</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-surface rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Description */}
            <div className="p-3 bg-hacker-surface rounded-lg border border-hacker-border">
              <p className="text-sm text-hacker-text font-mono">{agent.description}</p>
              {agent.longDescription && (
                <details className="mt-2">
                  <summary className="text-xs text-hacker-cyan cursor-pointer hover:text-hacker-cyan/80 font-mono">
                    Show more details
                  </summary>
                  <div className="mt-2 text-xs text-hacker-text-dim whitespace-pre-wrap font-mono">
                    {agent.longDescription}
                  </div>
                </details>
              )}
            </div>

            {/* Trigger Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-hacker-text font-mono">
                Trigger
              </label>
              <select
                value={selectedTrigger}
                onChange={(e) => setSelectedTrigger(e.target.value)}
                className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text focus:outline-none focus:border-hacker-green/50 font-mono"
              >
                {agent.supportedTriggers?.map(trigger => (
                  <option key={trigger} value={trigger}>
                    {triggerLabels[trigger] || trigger}
                  </option>
                ))}
              </select>
              <p className="text-xs text-hacker-text-dim font-mono">
                When should this agent run?
              </p>
            </div>

            {/* Project Selection (optional) */}
            {projects.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-hacker-text font-mono">
                  Project Scope
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text focus:outline-none focus:border-hacker-green/50 font-mono"
                >
                  <option value="">All Projects (Global)</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name || project.path}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-hacker-text-dim font-mono">
                  Leave as "All Projects" for global agent, or select specific project
                </p>
              </div>
            )}

            {/* Config Fields */}
            {agent.configFields?.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-hacker-text border-b border-hacker-border pb-2 font-mono">
                  Configuration
                </div>
                {agent.configFields.map(field => (
                  <div key={field.name} className="space-y-2">
                    {field.type !== 'boolean' && (
                      <label className="block text-sm text-hacker-text-dim font-mono">
                        {field.label}
                      </label>
                    )}
                    {renderField(field)}
                    {field.description && field.type !== 'boolean' && (
                      <p className="text-xs text-hacker-text-dim font-mono">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Requirements */}
            {agent.requirements?.length > 0 && (
              <div className="p-3 bg-hacker-warning/10 border border-hacker-warning/30 rounded-lg">
                <div className="flex items-center gap-2 text-hacker-warning text-sm font-medium mb-2 font-mono">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Requirements
                </div>
                <ul className="text-xs text-hacker-warning/80 space-y-1 font-mono">
                  {agent.requirements.map((req, i) => (
                    <li key={i}>• {req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Command Preview */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-hacker-text font-mono">Command Preview</div>
              <div className="p-3 bg-black rounded-lg font-mono text-xs text-hacker-cyan overflow-x-auto border border-hacker-border">
                {agent.command}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-4 border-t border-hacker-border bg-hacker-surface/50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded-lg transition-colors border border-hacker-border font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInstalling}
              className="flex-1 px-4 py-2 text-sm bg-hacker-green/20 hover:bg-hacker-green/30 text-hacker-green rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-hacker-green/30 font-mono"
            >
              {isInstalling ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Installing...
                </span>
              ) : (
                'Install Agent'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
