/**
 * Project Context Menu Component
 * Right-click context menu for project management, tagging, settings, notes, and info
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PRIORITY_OPTIONS,
  ProjectInfoView,
  NotesView,
  CloneView,
  TagsSection,
} from './context-menu';

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
  const [isLoading, setIsLoading] = useState(false);

  // View states
  const [currentView, setCurrentView] = useState('main');
  const [projectInfo, setProjectInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Settings state
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [priority, setPriority] = useState(null);

  // Notes state
  const [notes, setNotes] = useState([]);

  // Encode project path for URL
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
  const handleCreateTag = async (name, color) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/project-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });

      if (res.ok) {
        const tag = await res.json();
        setAllTags(prev => [...prev, tag]);
        if (encodedPath) {
          await fetch(`/api/projects/by-path/${encodedPath}/tags/${tag.id}`, { method: 'POST' });
          setProjectTags(prev => [...prev, tag]);
        }
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
  const handleCreateNote = async (title, content) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/by-path/${encodedPath}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (res.ok) {
        const note = await res.json();
        setNotes(prev => [note, ...prev]);
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
  const handleCloneProject = async (cloneName, copySettings) => {
    try {
      const res = await fetch('/api/projects/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: project.path,
          newName: cloneName,
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
    left: `${Math.min(position.x, window.innerWidth - 340)}px`,
    top: `${Math.min(position.y, window.innerHeight - 500)}px`,
    zIndex: 9999,
  };

  // Render subviews
  if (currentView === 'info') {
    return (
      <ProjectInfoView
        menuRef={menuRef}
        menuStyle={menuStyle}
        project={project}
        projectInfo={projectInfo}
        projectTags={projectTags}
        priority={priority}
        loadingInfo={loadingInfo}
        onBack={() => setCurrentView('main')}
        onClose={onClose}
      />
    );
  }

  if (currentView === 'notes') {
    return (
      <NotesView
        menuRef={menuRef}
        menuStyle={menuStyle}
        notes={notes}
        onBack={() => setCurrentView('main')}
        onClose={onClose}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onToggleNotePin={handleToggleNotePin}
        isLoading={isLoading}
      />
    );
  }

  if (currentView === 'clone') {
    return (
      <CloneView
        menuRef={menuRef}
        menuStyle={menuStyle}
        project={project}
        onBack={() => setCurrentView('main')}
        onClose={onClose}
        onClone={handleCloneProject}
      />
    );
  }

  // Main Context Menu
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
      <TagsSection
        allTags={allTags}
        projectTags={projectTags}
        onToggleTag={handleToggleTag}
        onCreateTag={handleCreateTag}
        isLoading={isLoading}
      />

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

// Re-export ProjectTagChip for convenience
export { ProjectTagChip } from './context-menu';
