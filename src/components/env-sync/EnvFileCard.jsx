/**
 * EnvFileCard Component
 * Displays an environment file in the list
 */

import { ENV_FILE_TYPES } from './constants';

export default function EnvFileCard({ file, isSelected, onClick }) {
  const fileType = ENV_FILE_TYPES.find(t => t.name === file.name) || {
    name: file.name,
    description: 'Custom environment',
    color: '#95a5a6'
  };

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-accent' : ''
      }`}
      style={{
        background: 'var(--bg-glass)',
        border: `1px solid ${isSelected ? 'var(--border-accent)' : 'var(--border-subtle)'}`
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: fileType.color }}
        />
        <span className="font-mono text-sm text-primary">{file.name}</span>
        {file.modified && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
            Modified
          </span>
        )}
      </div>
      <div className="text-xs text-muted mt-1">{fileType.description}</div>
      <div className="text-xs text-muted mt-1">
        {file.variableCount} variables • {file.size}
      </div>
    </div>
  );
}
