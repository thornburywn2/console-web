/**
 * Project Context Menu Component
 * Right-click context menu for project management, tagging, settings, notes, and info
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Predefined colors for tags (matching TagManager)
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

// Priority options
const PRIORITY_OPTIONS = [
  { value: null, label: 'None', color: 'var(--text-muted)' },
  { value: 'HIGH', label: 'High', color: '#ef4444' },
  { value: 'MEDIUM', label: 'Medium', color: '#f97316' },
  { value: 'LOW', label: 'Low', color: '#22c55e' },
];

export default function ProjectContextMenu({
  isOpen,
  position,
  project,
  onClose,
  onSelectProject,
  onToggleFavorite,
  onKillSession,
  isFavorite,
  onRefresh,
}) {
  const menuRef = useRef(null);
  const [allTags, setAllTags] = useState([]);
  const [projectTags, setProjectTags] = useState([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  // View states
  const [currentView, setCurrentView] = useState('main'); // main, info, notes, clone, settings
  const [projectInfo, setProjectInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Settings state
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [priority, setPriority] = useState(null);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState(null);

  // Clone state
  const [cloneName, setCloneName] = useState('');
  const [copySettings, setCopySettings] = useState(true);
  const [cloning, setCloning] = useState(false);

  // Encode project path for URL (URL-encode the base64 to handle = padding)
  const encodedPath = project?.path ? encodeURIComponent(btoa(project.path)) : null;

  // Fetch all tags and project's current tags
  const fetchTags = useCallback(async () => {
    if (!encodedPath) return;

    try {
      const [allTagsRes, projectTagsRes] = await Promise.all([
        fetch('/api/project-tags'),
        fetch(`/api/projects/by-path/${encodedPath}/tags`)
      ]);

      if (allTagsRes.ok) {
        const tags = await allTagsRes.json();
        setAllTags(tags);
      }

      if (projectTagsRes.ok) {
        const tags = await projectTagsRes.json();
        setProjectTags(tags);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, [encodedPath]);

  // Fetch project settings
  const fetchSettings = useCallback(async () => {
    if (!encodedPath) return;

    try {
      const res = await fetch(`/api/projects/by-path/${encodedPath}/settings`);
      if (res.ok) {
        const settings = await res.json();
        setSkipPermissions(settings.skipPermissions || false);
        setPriority(settings.priority || null);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, [encodedPath]);

  // Fetch project notes
  const fetchNotes = useCallback(async () => {
    if (!encodedPath) return;

    try {
      const res = await fetch(`/api/projects/by-path/${encodedPath}/notes`);
      if (res.ok) {
        const notesData = await res.json();
        setNotes(notesData);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  }, [encodedPath]);

  // Fetch project info
  const fetchProjectInfo = useCallback(async () => {
    if (!project?.path) return;

    setLoadingInfo(true);
    try {
      const res = await fetch(`/api/admin/project-stats?path=${encodeURIComponent(project.path)}`);
      if (res.ok) {
        const info = await res.json();
        setProjectInfo(info);
      } else {
        setProjectInfo({
          name: project.name,
          path: project.path,
          hasActiveSession: project.hasActiveSession,
          lastModified: project.lastModified,
        });
      }
    } catch (err) {
      console.error('Failed to fetch project info:', err);
      setProjectInfo({
        name: project.name,
        path: project.path,
        hasActiveSession: project.hasActiveSession,
        lastModified: project.lastModified,
      });
    } finally {
      setLoadingInfo(false);
    }
  }, [project]);

  // Fetch data when menu opens
  useEffect(() => {
    if (isOpen && project?.path) {
      fetchTags();
      fetchSettings();
      setCurrentView('main');
      setProjectInfo(null);
      setCloneName(project.name + '-copy');
    }
  }, [isOpen, project?.path, fetchTags, fetchSettings]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (currentView !== 'main') {
          setCurrentView('main');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, currentView]);

  // Toggle tag on project
  const handleToggleTag = async (tagId) => {
    if (!encodedPath) return;

    const hasTag = projectTags.some(t => t.id === tagId);
    setIsLoading(true);

    try {
      if (hasTag) {
        await fetch(`/api/projects/by-path/${encodedPath}/tags/${tagId}`, { method: 'DELETE' });
        setProjectTags(prev => prev.filter(t => t.id !== tagId));
      } else {
        const res = await fetch(`/api/projects/by-path/${encodedPath}/tags/${tagId}`, { method: 'POST' });
        if (res.ok) {
          const { tag } = await res.json();
          setProjectTags(prev => [...prev, tag]);
        }
      }
      onRefresh?.();
    } catch (err) {
      console.error('Failed to toggle tag:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/project-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor
        })
      });

      if (res.ok) {
        const tag = await res.json();
        setAllTags(prev => [...prev, tag]);
        if (encodedPath) {
          await fetch(`/api/projects/by-path/${encodedPath}/tags/${tag.id}`, { method: 'POST' });
          setProjectTags(prev => [...prev, tag]);
        }
        setNewTagName('');
        setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
        setIsCreatingTag(false);
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async (updates) => {
    if (!encodedPath) return;

    try {
      const res = await fetch(`/api/projects/by-path/${encodedPath}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const settings = await res.json();
        setSkipPermissions(settings.skipPermissions);
        setPriority(settings.priority);
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Create note
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/by-path/${encodedPath}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle.trim() || null,
          content: newNoteContent.trim(),
        })
      });

      if (res.ok) {
        const note = await res.json();
        setNotes(prev => [note, ...prev]);
        setNewNoteTitle('');
        setNewNoteContent('');
        setIsCreatingNote(false);
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    try {
      await fetch(`/api/projects/notes/${noteId}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Toggle note pin
  const handleToggleNotePin = async (noteId, currentPinned) => {
    try {
      const res = await fetch(`/api/projects/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPinned })
      });

      if (res.ok) {
        setNotes(prev => prev.map(n =>
          n.id === noteId ? { ...n, isPinned: !currentPinned } : n
        ).sort((a, b) => {
          if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        }));
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Clone project
  const handleCloneProject = async () => {
    if (!cloneName.trim()) return;

    setCloning(true);
    try {
      const res = await fetch('/api/projects/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: project.path,
          newName: cloneName.trim(),
          copySettings,
        })
      });

      if (res.ok) {
        onRefresh?.();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to clone project');
      }
    } catch (err) {
      console.error('Failed to clone project:', err);
      alert('Failed to clone project');
    } finally {
      setCloning(false);
    }
  };

  // Copy path to clipboard
  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(project.path);
      onClose();
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  if (!isOpen || !project) return null;

  // Calculate menu position to stay in viewport
  const menuStyle = {
    position: 'fixed',
    left: `${Math.min(position.x, window.innerWidth - 300)}px`,
    top: `${Math.min(position.y, window.innerHeight - 500)}px`,
    zIndex: 9999,
  };

  // Back button for subviews
  const BackButton = ({ label }) => (
    <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentView('main')}
          className="p-1 hover:bg-white/10 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-primary">{label}</span>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  // Project Info View
  if (currentView === 'info') {
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
        <BackButton label="Project Info" />

        <div className="p-3 space-y-3">
          {loadingInfo ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto" />
              <div className="text-xs text-muted mt-2">Loading...</div>
            </div>
          ) : projectInfo ? (
            <>
              <div>
                <div className="text-2xs text-muted uppercase mb-1">Project Name</div>
                <div className="text-sm font-semibold text-primary">{projectInfo.name || project.name}</div>
              </div>

              <div>
                <div className="text-2xs text-muted uppercase mb-1">Path</div>
                <div className="text-xs font-mono text-secondary break-all">{project.path}</div>
              </div>

              {projectTags.length > 0 && (
                <div>
                  <div className="text-2xs text-muted uppercase mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {projectTags.map(tag => (
                      <span
                        key={tag.id}
                        className="text-2xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {priority && (
                <div>
                  <div className="text-2xs text-muted uppercase mb-1">Priority</div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: PRIORITY_OPTIONS.find(p => p.value === priority)?.color }}
                  >
                    {priority}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="text-2xs text-muted">Session</div>
                  <div className={`text-xs font-semibold ${project.hasActiveSession ? 'text-green-400' : 'text-muted'}`}>
                    {project.hasActiveSession ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {project.lastModified && (
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-2xs text-muted">Modified</div>
                    <div className="text-xs text-secondary">
                      {new Date(project.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {projectInfo.fileCount && (
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-2xs text-muted">Files</div>
                    <div className="text-xs text-secondary">{projectInfo.fileCount}</div>
                  </div>
                )}

                {projectInfo.size && (
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-2xs text-muted">Size</div>
                    <div className="text-xs text-secondary">{projectInfo.size}</div>
                  </div>
                )}
              </div>

              {projectInfo.git && (
                <div>
                  <div className="text-2xs text-muted uppercase mb-1">Git</div>
                  <div className="p-2 rounded space-y-1" style={{ background: 'var(--bg-tertiary)' }}>
                    {projectInfo.git.branch && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted">Branch:</span>
                        <span className="text-secondary font-mono">{projectInfo.git.branch}</span>
                      </div>
                    )}
                    {projectInfo.git.lastCommit && (
                      <div className="text-2xs text-muted truncate" title={projectInfo.git.lastCommit}>
                        {projectInfo.git.lastCommit}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {projectInfo.hasClaudeMd !== undefined && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={projectInfo.hasClaudeMd ? 'text-green-400' : 'text-amber-400'}>
                    {projectInfo.hasClaudeMd ? '✓' : '○'}
                  </span>
                  <span className="text-secondary">CLAUDE.md</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted text-xs">No info available</div>
          )}
        </div>
      </div>
    );
  }

  // Notes View
  if (currentView === 'notes') {
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
        <BackButton label="Project Notes" />

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
                  onClick={handleCreateNote}
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
                      onClick={() => handleToggleNotePin(note.id, note.isPinned)}
                      className={`p-1 hover:bg-white/10 rounded ${note.isPinned ? 'text-accent' : 'text-muted'}`}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      <svg className="w-3 h-3" fill={note.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
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

  // Clone View
  if (currentView === 'clone') {
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
        <BackButton label="Clone Project" />

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
            onClick={handleCloneProject}
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

  // Main Context Menu
  return (
    <div
      ref={menuRef}
      className="w-64 rounded-lg shadow-2xl overflow-hidden"
      style={{
        ...menuStyle,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-primary truncate flex-1">{project.name}</div>
          {priority && (
            <span
              className="text-2xs px-1.5 py-0.5 rounded font-medium"
              style={{
                backgroundColor: `${PRIORITY_OPTIONS.find(p => p.value === priority)?.color}20`,
                color: PRIORITY_OPTIONS.find(p => p.value === priority)?.color,
              }}
            >
              {priority}
            </span>
          )}
        </div>
        <div className="text-2xs text-muted truncate">{project.path}</div>
      </div>

      {/* Settings Section - Skip Permissions Toggle */}
      <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="px-1 py-1 text-2xs font-semibold uppercase text-muted">Session Settings</div>

        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
          <input
            type="checkbox"
            checked={skipPermissions}
            onChange={(e) => handleUpdateSettings({ skipPermissions: e.target.checked })}
            className="w-4 h-4 rounded accent-amber-500"
          />
          <div className="flex-1">
            <div className="text-xs text-secondary">Skip Permissions</div>
            <div className="text-2xs text-muted">Start Claude with --dangerously-skip-permissions</div>
          </div>
        </label>
      </div>

      {/* Priority Section */}
      <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="px-1 py-1 text-2xs font-semibold uppercase text-muted">Priority</div>
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value || 'none'}
              onClick={() => handleUpdateSettings({ priority: opt.value })}
              className={`flex-1 py-1 text-2xs rounded transition-colors ${
                priority === opt.value
                  ? 'bg-white/10 font-semibold'
                  : 'hover:bg-white/5'
              }`}
              style={{ color: opt.color }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Section */}
      <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="px-1 py-1 text-2xs font-semibold uppercase text-muted">Tags</div>

        <div className="space-y-1 max-h-28 overflow-y-auto">
          {allTags.map(tag => {
            const isAssigned = projectTags.some(t => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag.id)}
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
                  if (e.key === 'Enter') handleCreateTag();
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
                onClick={handleCreateTag}
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

      {/* Session Management Section */}
      <div className="p-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="px-2 py-1 text-2xs font-semibold uppercase text-muted">Session</div>

        <button
          onClick={() => {
            onSelectProject?.(project);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {project.hasActiveSession ? 'Open Terminal' : 'Start Session'}
        </button>

        {project.hasActiveSession && (
          <button
            onClick={() => {
              onKillSession?.(project.path);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Kill Session
          </button>
        )}
      </div>

      {/* Actions Section */}
      <div className="p-1">
        <div className="px-2 py-1 text-2xs font-semibold uppercase text-muted">Actions</div>

        <button
          onClick={() => {
            setCurrentView('info');
            fetchProjectInfo();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Project Info
        </button>

        <button
          onClick={() => {
            setCurrentView('notes');
            fetchNotes();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notes
          {notes.length > 0 && (
            <span className="ml-auto text-2xs text-muted">{notes.length}</span>
          )}
        </button>

        <button
          onClick={() => setCurrentView('clone')}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Clone Project
        </button>

        <button
          onClick={() => {
            onToggleFavorite?.(project.path);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: isFavorite ? 'var(--status-warning)' : undefined }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>

        <button
          onClick={handleCopyPath}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy Path
        </button>
      </div>
    </div>
  );
}

// Tag chip for displaying inline tags
export function ProjectTagChip({ tag, size = 'sm', onRemove }) {
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
