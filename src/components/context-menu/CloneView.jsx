/**
 * Clone View Component
 * UI for cloning a project
 */

import { useState } from 'react';
import BackButton from './BackButton';

export default function CloneView({
  menuRef,
  menuStyle,
  project,
  onBack,
  onClose,
  onClone,
}) {
  const [cloneName, setCloneName] = useState(project.name + '-copy');
  const [copySettings, setCopySettings] = useState(true);
  const [cloning, setCloning] = useState(false);

  const handleClone = async () => {
    if (!cloneName.trim()) return;
    setCloning(true);
    try {
      await onClone(cloneName.trim(), copySettings);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="w-72 rounded-lg shadow-2xl overflow-hidden"
      style={{
        ...menuStyle,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <BackButton label="Clone Project" onBack={onBack} onClose={onClose} />

      <div className="p-3 space-y-3">
        <div>
          <div className="text-2xs text-muted uppercase mb-1">Source</div>
          <div className="text-xs font-mono text-secondary truncate">{project.name}</div>
        </div>

        <div>
          <div className="text-2xs text-muted uppercase mb-1">New Project Name</div>
          <input
            type="text"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="project-name"
            className="w-full px-2 py-1.5 text-xs rounded bg-black/20 border border-white/10 outline-none focus:border-accent"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={copySettings}
            onChange={(e) => setCopySettings(e.target.checked)}
            className="w-4 h-4 rounded accent-accent"
          />
          <span className="text-xs text-secondary">Copy tags, notes & settings</span>
        </label>

        <div className="text-2xs text-muted">
          Note: Git history will be removed from the cloned project.
        </div>

        <button
          onClick={handleClone}
          disabled={!cloneName.trim() || cloning}
          className="w-full py-2 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {cloning ? (
            <>
              <div className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full" />
              Cloning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Clone Project
            </>
          )}
        </button>
      </div>
    </div>
  );
}
