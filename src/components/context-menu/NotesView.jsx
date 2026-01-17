/**
 * Notes View Component
 * Displays and manages project notes
 */

import { useState } from 'react';
import BackButton from './BackButton';

export default function NotesView({
  menuRef,
  menuStyle,
  notes,
  onBack,
  onClose,
  onCreateNote,
  onDeleteNote,
  onToggleNotePin,
  isLoading,
}) {
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleCreate = async () => {
    if (!newNoteContent.trim()) return;
    await onCreateNote(newNoteTitle.trim() || null, newNoteContent.trim());
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsCreatingNote(false);
  };

  return (
    <div
      ref={menuRef}
      className="w-80 rounded-lg shadow-2xl overflow-hidden"
      style={{
        ...menuStyle,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <BackButton label="Project Notes" onBack={onBack} onClose={onClose} />

      <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
        {/* Create note form */}
        {isCreatingNote ? (
          <div className="p-2 rounded space-y-2" style={{ background: 'var(--bg-tertiary)' }}>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-transparent border-b border-accent/50 outline-none text-xs px-1 py-1"
            />
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Note content..."
              className="w-full bg-transparent outline-none text-xs resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreatingNote(false);
                  setNewNoteTitle('');
                  setNewNoteContent('');
                }}
                className="px-2 py-1 text-2xs text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newNoteContent.trim() || isLoading}
                className="px-2 py-1 text-2xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingNote(true)}
            className="w-full flex items-center justify-center gap-1 px-2 py-2 text-xs text-accent hover:bg-accent/10 rounded transition-colors"
            style={{ border: '1px dashed var(--border-subtle)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        )}

        {/* Notes list */}
        {notes.length === 0 && !isCreatingNote ? (
          <div className="text-center py-4 text-muted text-xs">No notes yet</div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="p-2 rounded group"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <div className="text-xs font-semibold text-primary truncate">{note.title}</div>
                  )}
                  <div className="text-2xs text-secondary whitespace-pre-wrap break-words">
                    {note.content}
                  </div>
                  <div className="text-2xs text-muted mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggleNotePin(note.id, note.isPinned)}
                    className={`p-1 hover:bg-white/10 rounded ${note.isPinned ? 'text-accent' : 'text-muted'}`}
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <svg className="w-3 h-3" fill={note.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
