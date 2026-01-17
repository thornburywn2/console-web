/**
 * Alert Rule Editor Component
 * Create and manage custom threshold alerts
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { ALERT_TYPES, PRESETS, RuleCard, RuleEditor } from './alert-rule-editor';
import { alertsApi } from '../services/api.js';

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
      const data = await alertsApi.list();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Failed to fetch alert rules:', error.getUserMessage?.() || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (rule) => {
    try {
      if (rule.id) {
        await alertsApi.update(rule.id, rule);
      } else {
        await alertsApi.create(rule);
      }
      fetchRules();
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to save alert:', error.getUserMessage?.() || error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this alert rule?')) return;

    try {
      await alertsApi.delete(id);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete alert:', error.getUserMessage?.() || error.message);
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
