/**
 * Session Note Editor Component
 * Markdown note editor for sessions
 */

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function SessionNoteEditor({
  sessionId,
  notes = [],
  onSave,
  onDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Start creating new note
  const startNewNote = () => {
    setIsEditing(true);
    setEditingNoteId(null);
    setContent('');
  };

  // Start editing existing note
  const startEdit = (note) => {
    setIsEditing(true);
    setEditingNoteId(note.id);
    setContent(note.content);
  };

  // Save note
  const handleSave = () => {
    if (content.trim()) {
      onSave?.(sessionId, content.trim(), editingNoteId);
    }
    setIsEditing(false);
    setContent('');
    setEditingNoteId(null);
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setContent('');
    setEditingNoteId(null);
  };

  // Format date
  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <span>📝</span>
          Session Notes
        </h3>
        {!isEditing && (
          <button
            onClick={startNewNote}
            className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
          >
            + Add Note
          </button>
        )}
      </div>

      {/* Editor */}
      {isEditing && (
        <div
          className="space-y-2 p-3 rounded-lg"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note... (Markdown supported)"
            className="w-full bg-transparent border-none outline-none resize-none text-sm font-mono min-h-[100px]"
            style={{ color: 'var(--text-primary)' }}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-2xs text-muted">Markdown supported</span>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!content.trim()}
                className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"
              >
                {editingNoteId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2">
        {notes.map(note => (
          <div
            key={note.id}
            className="group rounded-lg p-3 transition-colors hover:bg-white/5"
            style={{ background: 'var(--bg-glass)' }}
          >
            {/* Note Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs text-muted font-mono">
                {formatDate(note.createdAt)}
                {note.updatedAt !== note.createdAt && ' (edited)'}
              </span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button
                  onClick={() => startEdit(note)}
                  className="p-1 hover:bg-white/10 rounded text-xs"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this note?')) {
                      onDelete?.(note.id);
                    }
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-xs text-red-400"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Note Content */}
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  // Customize markdown rendering
                  p: ({ children }) => <p className="text-sm text-secondary mb-2 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-sm">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-sm">{children}</ol>,
                  li: ({ children }) => <li className="text-secondary">{children}</li>,
                  code: ({ children, inline }) =>
                    inline ? (
                      <code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-secondary)' }}>
                        {children}
                      </code>
                    ) : (
                      <code className="block p-2 rounded text-xs font-mono my-2 overflow-x-auto" style={{ background: 'var(--bg-tertiary)' }}>
                        {children}
                      </code>
                    ),
                  pre: ({ children }) => <pre className="my-2">{children}</pre>,
                  a: ({ href, children }) => (
                    <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 pl-3 my-2 text-secondary italic" style={{ borderColor: 'var(--accent-primary)' }}>
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {note.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {notes.length === 0 && !isEditing && (
          <div className="text-center py-6 text-sm text-muted">
            No notes yet
          </div>
        )}
      </div>
    </div>
  );
}
