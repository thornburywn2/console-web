/**
 * Tags Section Component
 * Tag management section of the context menu
 */

import { useState } from 'react';
import { TAG_COLORS } from './constants';

export default function TagsSection({
  allTags,
  projectTags,
  onToggleTag,
  onCreateTag,
  isLoading,
}) {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
    setIsCreatingTag(false);
  };

  return (
    <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="px-1 py-1 text-2xs font-semibold uppercase text-muted">Tags</div>

      <div className="space-y-1 max-h-28 overflow-y-auto">
        {allTags.map(tag => {
          const isAssigned = projectTags.some(t => t.id === tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggleTag(tag.id)}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-white/5 transition-colors"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-left truncate text-secondary">{tag.name}</span>
              {isAssigned && (
                <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}

        {allTags.length === 0 && !isCreatingTag && (
          <div className="text-2xs text-muted text-center py-2">No tags yet</div>
        )}
      </div>

      {/* Create new tag */}
      {isCreatingTag ? (
        <div className="mt-2 p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: newTagColor }}
            />
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setIsCreatingTag(false);
                  setNewTagName('');
                }
              }}
              placeholder="Tag name..."
              className="flex-1 bg-transparent border-b border-accent outline-none text-xs"
              autoFocus
            />
          </div>

          <div className="flex gap-1 justify-center mb-2">
            {TAG_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${
                  newTagColor === color
                    ? 'border-white scale-110'
                    : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsCreatingTag(false);
                setNewTagName('');
              }}
              className="px-2 py-1 text-2xs text-secondary hover:text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTagName.trim() || isLoading}
              className="px-2 py-1 text-2xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreatingTag(true)}
          className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1 text-2xs text-accent hover:bg-accent/10 rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Tag
        </button>
      )}
    </div>
  );
}
