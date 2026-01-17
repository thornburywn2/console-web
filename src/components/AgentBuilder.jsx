/**
 * Agent Builder Component
 * Form-based agent creation and editing
 */

import { useState, useEffect } from 'react';
import AgentExecutionLog from './AgentExecutionLog';
import AgentOutputStream from './AgentOutputStream';
import {
  API_BASE,
  DEFAULT_FORM,
  DEFAULT_ACTION,
  ACTION_CONFIG_DEFAULTS,
  ActionEditor,
} from './agent-builder';

export default function AgentBuilder({
  agent,
  triggerTypes,
  actionTypes,
  onSave,
  onCancel,
  socket
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [projects, setProjects] = useState([]);
  const [mcpServers, setMcpServers] = useState([]);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('config'); // config, executions, output
  const [liveOutput, setLiveOutput] = useState(null);

  // Load agent data if editing
  useEffect(() => {
    if (agent) {
      setForm({
        id: agent.id,
        name: agent.name || '',
        description: agent.description || '',
        triggerType: agent.triggerType || 'MANUAL',
        triggerConfig: agent.triggerConfig || {},
        actions: agent.actions?.length ? agent.actions : [DEFAULT_ACTION],
        enabled: agent.enabled !== false,
        projectId: agent.projectId || null
      });
    }
  }, [agent]);

  // Fetch projects for dropdown
  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, []);

  // Fetch MCP servers for action dropdowns
  useEffect(() => {
    fetch(`${API_BASE}/api/mcp`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setMcpServers(Array.isArray(data) ? data : []))
      .catch(() => setMcpServers([]));
  }, []);

  // Listen for live output
  useEffect(() => {
    if (!socket || !agent?.id) return;

    const handleOutput = (data) => {
      if (data.agentId === agent.id) {
        setLiveOutput(data);
        setActiveTab('output');
      }
    };

    socket.on('agent:output', handleOutput);
    return () => socket.off('agent:output', handleOutput);
  }, [socket, agent?.id]);

  // Update form field
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  // Update action
  const updateAction = (index, field, value) => {
    setForm(prev => {
      const newActions = [...prev.actions];
      if (field === 'type') {
        // Reset config when changing type
        newActions[index] = { type: value, config: ACTION_CONFIG_DEFAULTS[value] || {} };
      } else {
        newActions[index] = {
          ...newActions[index],
          config: { ...newActions[index].config, [field]: value }
        };
      }
      return { ...prev, actions: newActions };
    });
  };

  // Add action
  const addAction = () => {
    setForm(prev => ({
      ...prev,
      actions: [...prev.actions, DEFAULT_ACTION]
    }));
  };

  // Remove action
  const removeAction = (index) => {
    if (form.actions.length <= 1) return;
    setForm(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  // Move action up/down
  const moveAction = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.actions.length) return;
    setForm(prev => {
      const newActions = [...prev.actions];
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      return { ...prev, actions: newActions };
    });
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!form.triggerType) {
      newErrors.triggerType = 'Trigger type is required';
    }

    form.actions.forEach((action, i) => {
      if (action.type === 'shell' && !action.config.command?.trim()) {
        newErrors[`action_${i}`] = 'Command is required';
      }
      if (action.type === 'api' && !action.config.url?.trim()) {
        newErrors[`action_${i}`] = 'URL is required';
      }
      if (action.type === 'mcp' && (!action.config.serverId || !action.config.toolName)) {
        newErrors[`action_${i}`] = 'Server and tool are required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(form);
    }
  };

  // Group triggers by category
  const triggersByCategory = triggerTypes.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {agent ? 'Edit Agent' : 'New Agent'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 text-sm rounded-lg text-white"
            style={{ background: 'var(--accent-color)' }}
          >
            {agent ? 'Save Changes' : 'Create Agent'}
          </button>
        </div>
      </div>

      {/* Tabs (only show for existing agents) */}
      {agent && (
        <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {['config', 'executions', 'output'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-[var(--accent-color)]' : 'border-transparent'
              }`}
              style={{ color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'output' && liveOutput && (
                <span className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'config' && (
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.name ? 'var(--error-color)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)'
                }}
                placeholder="My Agent"
              />
              {errors.name && (
                <p className="text-xs mt-1" style={{ color: 'var(--error-color)' }}>{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                rows={2}
                placeholder="What does this agent do?"
              />
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Project (Optional)
              </label>
              <select
                value={form.projectId || ''}
                onChange={e => updateField('projectId', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Global (no specific project)</option>
                {projects.map(p => (
                  <option key={p.id || p.path} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Trigger Type */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Trigger *
              </label>
              <select
                value={form.triggerType}
                onChange={e => updateField('triggerType', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.triggerType ? 'var(--error-color)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)'
                }}
              >
                {Object.entries(triggersByCategory).map(([category, triggers]) => (
                  <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {triggers.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Trigger Config for FILE_CHANGE */}
              {form.triggerType === 'FILE_CHANGE' && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    File Pattern (glob)
                  </label>
                  <input
                    type="text"
                    value={form.triggerConfig.pattern || ''}
                    onChange={e => updateField('triggerConfig', { ...form.triggerConfig, pattern: e.target.value })}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="**/*.ts or src/**/*.js"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Actions *
                </label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--accent-color)', color: 'white' }}
                >
                  + Add Action
                </button>
              </div>

              <div className="space-y-3">
                {form.actions.map((action, index) => (
                  <ActionEditor
                    key={index}
                    index={index}
                    action={action}
                    actionTypes={actionTypes}
                    mcpServers={mcpServers}
                    error={errors[`action_${index}`]}
                    onChange={(field, value) => updateAction(index, field, value)}
                    onRemove={() => removeAction(index)}
                    onMoveUp={() => moveAction(index, -1)}
                    onMoveDown={() => moveAction(index, 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < form.actions.length - 1}
                    canRemove={form.actions.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e => updateField('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enable agent (responds to triggers)
              </span>
            </div>
          </form>
        )}

        {activeTab === 'executions' && agent && (
          <AgentExecutionLog agentId={agent.id} />
        )}

        {activeTab === 'output' && agent && (
          <AgentOutputStream agentId={agent.id} socket={socket} />
        )}
      </div>
    </div>
  );
}
