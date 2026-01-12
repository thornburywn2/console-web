/**
 * Comment Thread Component
 * Inline comments on session history
 */

import { useState, useEffect, useRef } from 'react';

export default function CommentThread({
  sessionId,
  lineNumber,
  comments: initialComments = [],
  isOpen,
  onClose,
  onAddComment,
  position = { x: 0, y: 0 },
}) {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [authorName, setAuthorName] = useState(() =>
    localStorage.getItem('commentAuthorName') || 'Anonymous'
  );
  const [editingAuthor, setEditingAuthor] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch comments for this line
  useEffect(() => {
    if (sessionId && lineNumber !== undefined && isOpen) {
      fetchComments();
    }
  }, [sessionId, lineNumber, isOpen]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/comments?line=${lineNumber}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineNumber,
          content: newComment.trim(),
          authorName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
        if (onAddComment) {
          onAddComment(data.comment);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/comments/${commentId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const saveAuthorName = () => {
    localStorage.setItem('commentAuthorName', authorName);
    setEditingAuthor(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-80 rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: Math.min(position.x, window.innerWidth - 340),
        top: Math.min(position.y, window.innerHeight - 400),
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm font-medium text-primary">
            {lineNumber !== undefined ? `Line ${lineNumber}` : 'Comments'}
          </span>
          <span className="text-xs text-muted">({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comments List */}
      <div className="max-h-60 overflow-auto">
        {comments.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 hover:bg-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}
                    >
                      {comment.authorName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-primary">
                        {comment.authorName || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted ml-2">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                    title="Delete comment"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-secondary mt-2 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Author name editor */}
      <div
        className="px-3 py-2"
        style={{ background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}
      >
        {editingAuthor ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name..."
              className="flex-1 px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
              onKeyDown={(e) => e.key === 'Enter' && saveAuthorName()}
            />
            <button
              onClick={saveAuthorName}
              className="px-2 py-1 text-xs bg-accent text-white rounded"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingAuthor(true)}
            className="text-xs text-muted hover:text-primary"
          >
            Commenting as <span className="font-medium text-accent">{authorName}</span> (change)
          </button>
        )}
      </div>

      {/* New Comment Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <textarea
          ref={inputRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded resize-none"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted">Ctrl+Enter to submit</span>
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Comment indicator for terminal lines
export function CommentIndicator({ count, onClick }) {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {count}
    </button>
  );
}

// Hook for managing comments in a session
export function useSessionComments(sessionId) {
  const [commentCounts, setCommentCounts] = useState({});
  const [activeThread, setActiveThread] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetchCommentCounts();
    }
  }, [sessionId]);

  const fetchCommentCounts = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/comments/counts`);
      if (response.ok) {
        const data = await response.json();
        setCommentCounts(data.counts || {});
      }
    } catch (error) {
      console.error('Failed to fetch comment counts:', error);
    }
  };

  const openThread = (lineNumber, position) => {
    setActiveThread({ lineNumber, position });
  };

  const closeThread = () => {
    setActiveThread(null);
  };

  const updateCount = (lineNumber, delta) => {
    setCommentCounts(prev => ({
      ...prev,
      [lineNumber]: (prev[lineNumber] || 0) + delta,
    }));
  };

  return {
    commentCounts,
    activeThread,
    openThread,
    closeThread,
    updateCount,
    refreshCounts: fetchCommentCounts,
  };
}
