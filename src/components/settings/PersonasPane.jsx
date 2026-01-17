/**
 * PersonasPane Component
 * AI Personas management
 */

import { useState } from 'react';

export default function PersonasPane({ personas, onSave, onDelete }) {
  const [editingPersona, setEditingPersona] = useState(null);
  const [newPersona, setNewPersona] = useState(false);

  const handleCreateNew = () => {
    setNewPersona(true);
    setEditingPersona({
      name: '',
      description: '',
      systemPrompt: '',
      icon: '🤖',
      color: '#3b82f6',
      temperature: 0.7,
      model: 'claude-3-sonnet',
    });
  };

  const handleSave = async () => {
    await onSave(editingPersona);
    setEditingPersona(null);
    setNewPersona(false);
  };

  const handleCancel = () => {
    setEditingPersona(null);
    setNewPersona(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">AI Personas</h4>
        <button
          onClick={handleCreateNew}
          className="px-3 py-1 text-xs font-mono border border-hacker-green rounded hover:bg-hacker-green/10 text-hacker-green"
        >
          [+ NEW PERSONA]
        </button>
      </div>

      {/* Persona Editor Modal */}
      {editingPersona && (
        <div className="p-4 border border-hacker-cyan/30 rounded bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-mono text-hacker-cyan">{newPersona ? 'New Persona' : 'Edit Persona'}</h5>
            <button onClick={handleCancel} className="text-hacker-text-dim hover:text-hacker-text">&times;</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-hacker-text-dim">Name</label>
              <input
                type="text"
                value={editingPersona.name}
                onChange={(e) => setEditingPersona(prev => ({ ...prev, name: e.target.value }))}
                className="input-glass font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-hacker-text-dim">Icon (emoji)</label>
              <input
                type="text"
                value={editingPersona.icon}
                onChange={(e) => setEditingPersona(prev => ({ ...prev, icon: e.target.value }))}
                className="input-glass font-mono mt-1"
                maxLength={2}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-hacker-text-dim">Description</label>
            <input
              type="text"
              value={editingPersona.description || ''}
              onChange={(e) => setEditingPersona(prev => ({ ...prev, description: e.target.value }))}
              className="input-glass font-mono mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-hacker-text-dim">System Prompt</label>
            <textarea
              value={editingPersona.systemPrompt}
              onChange={(e) => setEditingPersona(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={5}
              className="input-glass font-mono mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-hacker-text-dim">Temperature</label>
              <input
                type="number"
                value={editingPersona.temperature || 0.7}
                onChange={(e) => setEditingPersona(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                min={0}
                max={2}
                step={0.1}
                className="input-glass font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-hacker-text-dim">Model</label>
              <select
                value={editingPersona.model || 'claude-3-sonnet'}
                onChange={(e) => setEditingPersona(prev => ({ ...prev, model: e.target.value }))}
                className="input-glass font-mono mt-1"
              >
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-hacker-text-dim">Color</label>
              <input
                type="color"
                value={editingPersona.color || '#3b82f6'}
                onChange={(e) => setEditingPersona(prev => ({ ...prev, color: e.target.value }))}
                className="w-full mt-1 h-10 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-mono border border-hacker-text-dim/30 rounded text-hacker-text-dim hover:bg-hacker-text-dim/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10"
            >
              Save Persona
            </button>
          </div>
        </div>
      )}

      {/* Persona List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map(persona => (
          <div key={persona.id} className="p-4 border border-hacker-green/20 rounded bg-[var(--bg-surface)] hover:border-hacker-green/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{persona.icon || '🤖'}</span>
                <div>
                  <h5 className="text-sm font-semibold text-hacker-text">{persona.name}</h5>
                  <p className="text-xs text-hacker-text-dim">{persona.description}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {persona.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-hacker-green/20 text-hacker-green rounded">default</span>
                )}
                {!persona.isBuiltIn && (
                  <>
                    <button
                      onClick={() => setEditingPersona(persona)}
                      className="text-xs text-hacker-text-dim hover:text-hacker-cyan"
                    >
                      [edit]
                    </button>
                    <button
                      onClick={() => onDelete(persona.id)}
                      className="text-xs text-hacker-text-dim hover:text-hacker-danger"
                    >
                      [delete]
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-hacker-text-dim">
              <span>Model: {persona.model || 'default'}</span>
              <span>Temp: {persona.temperature || 0.7}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
