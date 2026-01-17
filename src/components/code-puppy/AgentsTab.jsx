/**
 * Agents Tab Component
 * Displays and manages Code Puppy agents
 */

import { useState } from 'react';

export default function AgentsTab({
  agents,
  availableTools,
  onCreateAgent,
  onDeleteAgent,
  actionLoading,
  error,
  setError,
}) {
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    display_name: '',
    description: '',
    system_prompt: '',
    tools: ['read_file', 'edit_file', 'list_files']
  });

  const toggleTool = (toolName) => {
    setNewAgent(prev => ({
      ...prev,
      tools: prev.tools.includes(toolName)
        ? prev.tools.filter(t => t !== toolName)
        : [...prev.tools, toolName]
    }));
  };

  const handleCreate = async () => {
    if (!newAgent.name || !newAgent.description || !newAgent.system_prompt) {
      setError('Please fill in all required fields');
      return;
    }

    const success = await onCreateAgent(newAgent);
    if (success) {
      setShowCreateAgent(false);
      setNewAgent({
        name: '',
        display_name: '',
        description: '',
        system_prompt: '',
        tools: ['read_file', 'edit_file', 'list_files']
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Agents</h3>
        <button onClick={() => setShowCreateAgent(!showCreateAgent)}
          className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">
          {showCreateAgent ? 'Cancel' : '+ Create'}
        </button>
      </div>

      {showCreateAgent && (
        <div className="glass-panel p-4 rounded-lg space-y-3">
          <h4 className="font-medium text-foreground text-sm">Create Agent</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Name (kebab-case)*</label>
              <input type="text" value={newAgent.name}
                onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="my-agent"
                className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Display Name</label>
              <input type="text" value={newAgent.display_name}
                onChange={(e) => setNewAgent(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="My Agent 🤖"
                className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Description*</label>
            <input type="text" value={newAgent.description}
              onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What does this agent do?"
              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">System Prompt*</label>
            <textarea value={newAgent.system_prompt}
              onChange={(e) => setNewAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
              placeholder="Instructions for the agent..."
              rows={3}
              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-foreground text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Tools</label>
            <div className="flex flex-wrap gap-1">
              {availableTools.map((tool) => (
                <button key={tool.name} onClick={() => toggleTool(tool.name)}
                  title={tool.description}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    newAgent.tools.includes(tool.name) ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted hover:bg-surface-hover'
                  }`}>
                  {tool.name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={actionLoading === 'create-agent'}
            className="w-full px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 text-sm">
            {actionLoading === 'create-agent' ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <div key={agent.name} className="glass-panel p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground text-sm">{agent.displayName || agent.name}</span>
              {agent.builtin ? (
                <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">Built-in</span>
              ) : (
                <button onClick={() => onDeleteAgent(agent.name)}
                  className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">✕</button>
              )}
            </div>
            <p className="text-xs text-muted">{agent.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
