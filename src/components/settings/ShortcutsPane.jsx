/**
 * ShortcutsPane Component
 * Keyboard shortcuts management
 */

import { useState } from 'react';

export default function ShortcutsPane({ shortcuts, onSave, onReset, onResetAll }) {
  const [editingShortcut, setEditingShortcut] = useState(null);

  const handleKeyCapture = async (e, action) => {
    e.preventDefault();
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');
    if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
      keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    if (keys.length > 1 || (keys.length === 1 && !['Ctrl', 'Shift', 'Alt', 'Meta'].includes(keys[0]))) {
      await onSave(action, keys.join('+'));
      setEditingShortcut(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Keyboard Shortcuts</h4>
        <button
          onClick={onResetAll}
          className="px-3 py-1 text-xs font-mono border border-hacker-warning/50 text-hacker-warning rounded hover:bg-hacker-warning/10"
        >
          [RESET ALL]
        </button>
      </div>

      {/* Group shortcuts by category */}
      {['navigation', 'view', 'session', 'terminal', 'tools', 'help'].map(category => {
        const categoryShortcuts = shortcuts.filter(s => s.category === category);
        if (categoryShortcuts.length === 0) return null;
        return (
          <div key={category} className="space-y-2">
            <h5 className="text-xs font-mono text-hacker-text-dim uppercase">{category}</h5>
            <div className="space-y-1">
              {categoryShortcuts.map(shortcut => (
                <div key={shortcut.action} className="flex items-center justify-between py-2 px-3 bg-[var(--bg-surface)] rounded">
                  <div className="flex-1">
                    <span className="text-sm text-hacker-text">{shortcut.description}</span>
                    {shortcut.isCustom && (
                      <span className="ml-2 text-xs text-hacker-purple">(custom)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingShortcut === shortcut.action ? (
                      <input
                        type="text"
                        defaultValue={shortcut.keys}
                        onKeyDown={(e) => handleKeyCapture(e, shortcut.action)}
                        onBlur={() => setEditingShortcut(null)}
                        autoFocus
                        className="input-glass w-32 text-xs"
                        placeholder="Press keys..."
                      />
                    ) : (
                      <>
                        <code className="px-2 py-1 text-xs font-mono bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded" style={{ color: 'var(--accent-primary)' }}>
                          {shortcut.keys}
                        </code>
                        <button
                          onClick={() => setEditingShortcut(shortcut.action)}
                          className="text-xs text-hacker-text-dim hover:text-hacker-green"
                        >
                          [edit]
                        </button>
                        {shortcut.isCustom && (
                          <button
                            onClick={() => onReset(shortcut.action)}
                            className="text-xs text-hacker-text-dim hover:text-hacker-warning"
                          >
                            [reset]
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
