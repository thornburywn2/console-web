/**
 * Tag Manager Component
 * Create, edit, and manage session tags
 */

import { useState } from 'react';

// Predefined colors for tags
const TAG_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280', // Gray
];

export default function TagManager({
  tags = [],
  selectedTags = [],
  onToggleTag,
  onCreateTag,
  onDeleteTag,
  onUpdateTag,
  mode = 'filter', // 'filter' or 'assign'
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingTag, setEditingTag] = useState(null);

  // Create new tag
  const handleCreate = () => {
    if (newTagName.trim()) {
      onCreateTag?.({
        name: newTagName.trim(),
        color: newTagColor
      });
      setNewTagName('');
      setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
      setIsCreating(false);
    }
  };

  // Update tag
  const handleUpdate = () => {
    if (editingTag && editingTag.name.trim()) {
      onUpdateTag?.(editingTag.id, {
        name: editingTag.name,
        color: editingTag.color
      });
      setEditingTag(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Tags
        </span>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-white/10 rounded text-xs"
            title="New tag"
          >
            +
          </button>
        )}
      </div>

      {/* Tag List */}
      <div className="space-y-1">
        {tags.map(tag => {
          const isSelected = selectedTags.includes(tag.id);
          const isEditing = editingTag?.id === tag.id;

          return (
            <div
              key={tag.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded group transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-accent/10'
                  : 'hover:bg-white/5'
              }`}
              onClick={() => !isEditing && onToggleTag?.(tag.id)}
            >
              {/* Color Dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: isEditing ? editingTag.color : tag.color }}
              />

              {/* Name */}
              {isEditing ? (
                <input
                  type="text"
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                  onBlur={handleUpdate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate();
                    if (e.key === 'Escape') setEditingTag(null);
                  }}
                  className="flex-1 bg-transparent border-b border-accent outline-none text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`flex-1 text-sm truncate ${isSelected ? 'text-primary' : 'text-secondary'}`}
                >
                  {tag.name}
                </span>
              )}

              {/* Count Badge */}
              {tag._count?.sessions > 0 && !isEditing && (
                <span className="text-xs text-muted px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  {tag._count.sessions}
                </span>
              )}

              {/* Actions */}
              {!isEditing && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTag({ ...tag });
                    }}
                    className="p-1 hover:bg-white/10 rounded text-xs"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete tag "${tag.name}"?`)) {
                        onDeleteTag?.(tag.id);
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-xs text-red-400"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Color Picker when editing */}
              {isEditing && (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditingTag({ ...editingTag, color })}
                      className={`w-4 h-4 rounded-full border-2 transition-transform ${
                        editingTag.color === color
                          ? 'border-white scale-110'
                          : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {tags.length === 0 && !isCreating && (
          <div className="px-2 py-4 text-center text-xs text-muted">
            No tags yet
          </div>
        )}

        {/* Create New Tag */}
        {isCreating && (
          <div className="px-2 py-2 space-y-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2">
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
                    setIsCreating(false);
                    setNewTagName('');
                  }
                }}
                placeholder="Tag name..."
                className="flex-1 bg-transparent border-b border-accent outline-none text-sm"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div className="flex gap-1 justify-center">
              {TAG_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    newTagColor === color
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName('');
                }}
                className="px-2 py-1 text-xs text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTagName.trim()}
                className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Indicator */}
      {mode === 'filter' && selectedTags.length > 0 && (
        <button
          onClick={() => selectedTags.forEach(id => onToggleTag?.(id))}
          className="w-full text-xs text-secondary hover:text-primary py-1"
        >
          Clear {selectedTags.length} filter{selectedTags.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

/**
 * Tag Chip - for displaying inline tags
 */
export function TagChip({ tag, onRemove, size = 'sm' }) {
  const sizeClasses = {
    xs: 'text-2xs px-1 py-0.5',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag.id);
          }}
          className="hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}
