/**
 * Project Context Menu Component
 * Right-click context menu for project management, tagging, and info
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
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [projectInfo, setProjectInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Encode project path for URL
  const encodedPath = project?.path ? btoa(project.path) : null;

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

  // Fetch project info
  const fetchProjectInfo = useCallback(async () => {
    if (!project?.path) return;

    setLoadingInfo(true);
    try {
      // Fetch project stats from API
      const res = await fetch(`/api/admin/project-stats?path=${encodeURIComponent(project.path)}`);
      if (res.ok) {
        const info = await res.json();
        setProjectInfo(info);
      } else {
        // Fallback basic info
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

  // Fetch tags when menu opens
  useEffect(() => {
    if (isOpen && project?.path) {
      fetchTags();
      setShowProjectInfo(false);
      setProjectInfo(null);
    }
  }, [isOpen, project?.path, fetchTags]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showProjectInfo) {
          setShowProjectInfo(false);
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
  }, [isOpen, onClose, showProjectInfo]);

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
        // Auto-assign to current project
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

  // Handle show project info
  const handleShowInfo = () => {
    setShowProjectInfo(true);
    fetchProjectInfo();
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
    left: `${Math.min(position.x, window.innerWidth - 280)}px`,
    top: `${Math.min(position.y, window.innerHeight - 500)}px`,
    zIndex: 9999,
  };

  // Project Info Popup
  if (showProjectInfo) {
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
        {/* Header */}
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProjectInfo(false)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs font-semibold text-primary">Project Info</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {loadingInfo ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto" />
              <div className="text-xs text-muted mt-2">Loading...</div>
            </div>
          ) : projectInfo ? (
            <>
              {/* Name */}
              <div>
                <div className="text-2xs text-muted uppercase mb-1">Project Name</div>
                <div className="text-sm font-semibold text-primary">{projectInfo.name || project.name}</div>
              </div>

              {/* Path */}
              <div>
                <div className="text-2xs text-muted uppercase mb-1">Path</div>
                <div className="text-xs font-mono text-secondary break-all">{project.path}</div>
              </div>

              {/* Tags */}
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                {/* Session Status */}
                <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="text-2xs text-muted">Session</div>
                  <div className={`text-xs font-semibold ${project.hasActiveSession ? 'text-green-400' : 'text-muted'}`}>
                    {project.hasActiveSession ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Last Modified */}
                {project.lastModified && (
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-2xs text-muted">Modified</div>
                    <div className="text-xs text-secondary">
                      {new Date(project.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* File Count */}
                {projectInfo.fileCount && (
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-2xs text-muted">Files</div>
                    <div className="text-xs text-secondary">{projectInfo.fileCount}</div>
                  </div>
                )}

                {/* Size */}
                {projectInfo.size && (
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-2xs text-muted">Size</div>
                    <div className="text-xs text-secondary">{projectInfo.size}</div>
                  </div>
                )}
              </div>

              {/* Git Info */}
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

              {/* CLAUDE.md Status */}
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

  // Main Context Menu
  return (
    <div
      ref={menuRef}
      className="w-56 rounded-lg shadow-2xl overflow-hidden"
      style={{
        ...menuStyle,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-semibold text-primary truncate">{project.name}</div>
        <div className="text-2xs text-muted truncate">{project.path}</div>
      </div>

      {/* Tags Section */}
      <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="text-2xs font-semibold uppercase text-muted mb-2">Tags</div>

        {/* Existing tags */}
        <div className="space-y-1 max-h-32 overflow-y-auto">
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

            {/* Color picker */}
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
            className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-accent hover:bg-accent/10 rounded transition-colors"
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
          onClick={handleShowInfo}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Project Info
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
