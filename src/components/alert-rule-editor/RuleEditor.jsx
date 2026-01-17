/**
 * RuleEditor Component
 */

import { useState } from 'react';
import { ALERT_TYPES, CONDITIONS } from './constants';

export function RuleEditor({ rule, onSave, onCancel }) {
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
