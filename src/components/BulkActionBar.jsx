/**
 * Bulk Action Bar Component
 * Floating action bar for multi-select operations on sessions
 */

import { useState } from 'react';

export default function BulkActionBar({
  selectedCount = 0,
  onPin,
  onUnpin,
  onArchive,
  onDelete,
  onMove,
  onAddTag,
  onClearSelection,
  folders = [],
  tags = [],
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-xl shadow-2xl animate-slide-up"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Selection Count */}
      <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: 'var(--border-subtle)' }}>
        <span
          className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
          style={{ background: 'var(--accent-primary)', color: '#000' }}
        >
          {selectedCount}
        </span>
        <span className="text-sm text-secondary">selected</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Pin */}
        <button
          onClick={onPin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
          title="Pin selected"
        >
          <span>📌</span>
          <span className="hidden sm:inline">Pin</span>
        </button>

        {/* Unpin */}
        <button
          onClick={onUnpin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
          title="Unpin selected"
        >
          <span>📍</span>
          <span className="hidden sm:inline">Unpin</span>
        </button>

        {/* Move to Folder */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMoveMenu(!showMoveMenu);
              setShowTagMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
            title="Move to folder"
          >
            <span>📁</span>
            <span className="hidden sm:inline">Move</span>
          </button>

          {showMoveMenu && (
            <div
              className="absolute bottom-full left-0 mb-2 py-1 rounded-lg shadow-xl min-w-[160px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <button
                onClick={() => {
                  onMove?.(null);
                  setShowMoveMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
              >
                🏠 Root (No folder)
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onMove?.(folder.id);
                    setShowMoveMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <span style={{ color: folder.color }}>{folder.icon || '📁'}</span>
                  {folder.name}
                </button>
              ))}
              {folders.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted">No folders</div>
              )}
            </div>
          )}
        </div>

        {/* Add Tag */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTagMenu(!showTagMenu);
              setShowMoveMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
            title="Add tag"
          >
            <span>🏷️</span>
            <span className="hidden sm:inline">Tag</span>
          </button>

          {showTagMenu && (
            <div
              className="absolute bottom-full left-0 mb-2 py-1 rounded-lg shadow-xl min-w-[160px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onAddTag?.(tag.id);
                    setShowTagMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted">No tags</div>
              )}
            </div>
          )}
        </div>

        {/* Archive */}
        <button
          onClick={onArchive}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
          title="Archive selected"
        >
          <span>📦</span>
          <span className="hidden sm:inline">Archive</span>
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm(`Delete ${selectedCount} session${selectedCount > 1 ? 's' : ''}? This cannot be undone.`)) {
              onDelete?.();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-red-500/10 text-red-400 transition-colors"
          title="Delete selected"
        >
          <span>🗑️</span>
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      {/* Clear Selection */}
      <button
        onClick={onClearSelection}
        className="ml-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        title="Clear selection"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
