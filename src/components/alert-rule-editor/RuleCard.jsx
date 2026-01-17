/**
 * RuleCard Component
 */

import { ALERT_TYPES, CONDITIONS } from './constants';

export function RuleCard({ rule, onEdit, onDelete, onToggle }) {
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
