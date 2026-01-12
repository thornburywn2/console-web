/**
 * Alert Rule Editor Component
 * Create and manage custom threshold alerts
 */

import { useState, useEffect } from 'react';

const ALERT_TYPES = [
  { id: 'CPU', label: 'CPU Usage', icon: '🖥️', unit: '%' },
  { id: 'MEMORY', label: 'Memory Usage', icon: '🧠', unit: '%' },
  { id: 'DISK', label: 'Disk Usage', icon: '💾', unit: '%' },
  { id: 'SERVICE', label: 'Service Status', icon: '⚙️', unit: '' },
  { id: 'CONTAINER', label: 'Container Status', icon: '📦', unit: '' },
  { id: 'NETWORK', label: 'Network Traffic', icon: '🌐', unit: 'MB/s' },
];

const CONDITIONS = [
  { id: 'GT', label: 'Greater than', symbol: '>' },
  { id: 'LT', label: 'Less than', symbol: '<' },
  { id: 'GTE', label: 'Greater or equal', symbol: '>=' },
  { id: 'LTE', label: 'Less or equal', symbol: '<=' },
  { id: 'EQ', label: 'Equal to', symbol: '=' },
  { id: 'NEQ', label: 'Not equal to', symbol: '!=' },
];

const PRESETS = [
  { name: 'High CPU Alert', type: 'CPU', condition: 'GT', threshold: 80 },
  { name: 'Low Memory Alert', type: 'MEMORY', condition: 'GT', threshold: 85 },
  { name: 'Disk Space Warning', type: 'DISK', condition: 'GT', threshold: 90 },
  { name: 'Service Down', type: 'SERVICE', condition: 'EQ', threshold: 0 },
];

function RuleCard({ rule, onEdit, onDelete, onToggle }) {
  const type = ALERT_TYPES.find(t => t.id === rule.type);
  const condition = CONDITIONS.find(c => c.id === rule.condition);

  return (
    <div
      className={'p-3 rounded-lg ' + (rule.enabled ? '' : 'opacity-50')}
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{type?.icon}</span>
          <div>
            <div className="font-medium text-primary">{rule.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {type?.label} {condition?.symbol} {rule.threshold}{type?.unit}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => onToggle(rule.id)}
            className={'w-10 h-5 rounded-full transition-colors ' +
              (rule.enabled ? 'bg-accent' : 'bg-white/20')}
          >
            <div
              className={'w-4 h-4 rounded-full bg-white shadow transition-transform ' +
                (rule.enabled ? 'translate-x-5' : 'translate-x-0.5')}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted">
        {rule.lastTriggered && (
          <span>Last triggered: {new Date(rule.lastTriggered).toLocaleString()}</span>
        )}
        <span>Triggers: {rule.triggerCount || 0}</span>
        <span>Cooldown: {rule.cooldownMins || 5}m</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onEdit(rule)}
          className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="px-3 py-1.5 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function RuleEditor({ rule, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'CPU',
    condition: 'GT',
    threshold: 80,
    duration: 0,
    cooldownMins: 5,
    notifySound: true,
    notifyDesktop: true,
    description: '',
    ...rule,
  });

  const type = ALERT_TYPES.find(t => t.id === formData.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm text-secondary mb-1">Alert Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., High CPU Warning"
          className="w-full px-3 py-2 rounded text-sm"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          required
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm text-secondary mb-1">Metric Type</label>
        <div className="grid grid-cols-3 gap-2">
          {ALERT_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormData({ ...formData, type: t.id })}
              className={'flex items-center gap-2 p-2 rounded text-sm ' +
                (formData.type === t.id
                  ? 'bg-accent/20 ring-1 ring-accent'
                  : 'bg-white/5 hover:bg-white/10')}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Condition and Threshold */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">Condition</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            {CONDITIONS.map(c => (
              <option key={c.id} value={c.id}>{c.label} ({c.symbol})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">
            Threshold {type?.unit && `(${type.unit})`}
          </label>
          <input
            type="number"
            value={formData.threshold}
            onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
            min={0}
            step={type?.unit === '%' ? 1 : 0.1}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
      </div>

      {/* Duration and Cooldown */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">Duration (seconds)</label>
          <input
            type="number"
            value={formData.duration || 0}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            min={0}
            placeholder="0 = immediate"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          />
          <p className="text-xs text-muted mt-1">How long condition must persist</p>
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">Cooldown (minutes)</label>
          <input
            type="number"
            value={formData.cooldownMins || 5}
            onChange={(e) => setFormData({ ...formData, cooldownMins: parseInt(e.target.value) })}
            min={1}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          />
          <p className="text-xs text-muted mt-1">Minutes between repeat alerts</p>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <label className="block text-sm text-secondary mb-2">Notifications</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notifySound}
              onChange={(e) => setFormData({ ...formData, notifySound: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Sound</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notifyDesktop}
              onChange={(e) => setFormData({ ...formData, notifyDesktop: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Desktop Notification</span>
          </label>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-secondary mb-1">Description (optional)</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional notes about this alert..."
          rows={2}
          className="w-full px-3 py-2 rounded text-sm resize-none"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm rounded bg-white/10 hover:bg-white/20"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2 text-sm rounded bg-accent text-white hover:bg-accent/80"
        >
          {rule?.id ? 'Save Changes' : 'Create Alert'}
        </button>
      </div>
    </form>
  );
}

export default function AlertRuleEditor({ isOpen, onClose, embedded = false }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (isOpen || embedded) {
      fetchRules();
    }
  }, [isOpen, embedded]);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/alerts');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (rule) => {
    try {
      const method = rule.id ? 'PUT' : 'POST';
      const url = rule.id ? `/api/alerts/${rule.id}` : '/api/alerts';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (response.ok) {
        fetchRules();
        setEditingRule(null);
      }
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this alert rule?')) return;

    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      fetchRules();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleToggle = async (id) => {
    const rule = rules.find(r => r.id === id);
    if (rule) {
      handleSave({ ...rule, enabled: !rule.enabled });
    }
  };

  const handlePreset = (preset) => {
    setEditingRule({ ...preset, id: null });
    setShowPresets(false);
  };

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setEditingRule({})}
          className="flex-1 py-2 text-sm rounded bg-accent text-white hover:bg-accent/80"
        >
          + New Alert
        </button>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="px-4 py-2 text-sm rounded bg-white/10 hover:bg-white/20"
        >
          Presets
        </button>
      </div>

      {/* Active alerts summary */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded" style={{ background: 'rgba(46, 204, 113, 0.2)' }}>
          <div className="text-lg font-bold text-green-400">{rules.filter(r => r.enabled).length}</div>
          <div className="text-xs text-muted">Active</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(149, 165, 166, 0.2)' }}>
          <div className="text-lg font-bold text-gray-400">{rules.filter(r => !r.enabled).length}</div>
          <div className="text-xs text-muted">Disabled</div>
        </div>
      </div>

      {/* Recent rules list */}
      <div className="space-y-2">
        {rules.slice(0, 3).map(rule => {
          const type = ALERT_TYPES.find(t => t.id === rule.type);
          return (
            <div
              key={rule.id}
              className={'p-2 rounded flex items-center gap-2 ' + (rule.enabled ? '' : 'opacity-50')}
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
            >
              <span>{type?.icon}</span>
              <span className="flex-1 text-sm text-primary truncate">{rule.name}</span>
              <button
                onClick={() => handleToggle(rule.id)}
                className={'w-8 h-4 rounded-full transition-colors ' +
                  (rule.enabled ? 'bg-accent' : 'bg-white/20')}
              >
                <div
                  className={'w-3 h-3 rounded-full bg-white shadow transition-transform ' +
                    (rule.enabled ? 'translate-x-4' : 'translate-x-0.5')}
                />
              </button>
            </div>
          );
        })}
        {rules.length === 0 && (
          <div className="text-center text-xs text-muted py-4">No alerts configured</div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">
              {editingRule ? (editingRule.id ? 'Edit Alert' : 'New Alert') : 'Alert Rules'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {editingRule ? (
            <RuleEditor
              rule={editingRule}
              onSave={handleSave}
              onCancel={() => setEditingRule(null)}
            />
          ) : (
            <>
              {/* Actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setEditingRule({})}
                  className="flex-1 py-2 text-sm rounded bg-accent text-white hover:bg-accent/80"
                >
                  + New Alert Rule
                </button>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-4 py-2 text-sm rounded bg-white/10 hover:bg-white/20"
                >
                  Use Preset
                </button>
              </div>

              {/* Presets */}
              {showPresets && (
                <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                  <div className="text-xs text-muted mb-2">Quick Presets</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => handlePreset(preset)}
                        className="p-2 text-left text-sm rounded bg-white/5 hover:bg-white/10"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rules List */}
              {loading ? (
                <div className="text-center text-muted py-8">Loading rules...</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted mb-2">No alert rules configured</p>
                  <p className="text-xs text-muted">
                    Create alerts to get notified when metrics exceed thresholds
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map(rule => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={setEditingRule}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
