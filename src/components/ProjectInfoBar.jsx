/**
 * Project Info Bar Component
 * Displays project metadata, tags, and quick stats between header and terminal
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { projectTagsApi } from '../services/api.js';
import { ProjectTagChip } from './ProjectContextMenu';

// Predefined colors for tags (matching TagManager)
const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
];

export default function ProjectInfoBar({ project, onRefresh }) {
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const tagMenuRef = useRef(null);

  // Encode project path for URL (URL-encode the base64 to handle = padding)
  const encodedPath = project?.path ? encodeURIComponent(btoa(project.path)) : null;

  // Fetch project tags
  const fetchTags = useCallback(async () => {
    if (!encodedPath) return;

    try {
      const [allTagsData, projectTagsData] = await Promise.all([
        projectTagsApi.list(),
        projectTagsApi.getProjectTags(encodedPath)
      ]);

      setAllTags(allTagsData);
      setTags(projectTagsData);
    } catch (err) {
      console.error('Failed to fetch tags:', err.getUserMessage?.() || err.message);
    }
  }, [encodedPath]);

  // Fetch tags on project change
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Close tag menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target)) {
        setShowTagMenu(false);
        setIsCreatingTag(false);
      }
    };

    if (showTagMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagMenu]);

  // Toggle tag on project
  const handleToggleTag = async (tagId) => {
    if (!encodedPath) return;

    const hasTag = tags.some(t => t.id === tagId);
    setIsLoading(true);

    try {
      if (hasTag) {
        await projectTagsApi.removeFromProject(encodedPath, tagId);
        setTags(prev => prev.filter(t => t.id !== tagId));
      } else {
        const { tag } = await projectTagsApi.addToProject(encodedPath, tagId);
        setTags(prev => [...prev, tag]);
      }
      onRefresh?.();
    } catch (err) {
      console.error('Failed to toggle tag:', err.getUserMessage?.() || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove tag from project
  const handleRemoveTag = async (tagId) => {
    if (!encodedPath) return;

    try {
      await projectTagsApi.removeFromProject(encodedPath, tagId);
      setTags(prev => prev.filter(t => t.id !== tagId));
      onRefresh?.();
    } catch (err) {
      console.error('Failed to remove tag:', err.getUserMessage?.() || err.message);
    }
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsLoading(true);
    try {
      const tag = await projectTagsApi.create({
        name: newTagName.trim(),
        color: newTagColor
      });

      setAllTags(prev => [...prev, tag]);
      // Auto-assign to current project
      if (encodedPath) {
        await projectTagsApi.addToProject(encodedPath, tag.id);
        setTags(prev => [...prev, tag]);
      }
      setNewTagName('');
      setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
      setIsCreatingTag(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to create tag:', err.getUserMessage?.() || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!project || project.isHome) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-1.5 text-xs"
      style={{
        background: 'var(--bg-glass)',
        borderBottom: '1px solid var(--border-subtle)',
        minHeight: '32px',
      }}
    >
      {/* Tags section */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Tag icon */}
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>

        {/* Tag chips */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
          {tags.map(tag => (
            <ProjectTagChip
              key={tag.id}
              tag={tag}
              size="xs"
              onRemove={handleRemoveTag}
            />
          ))}

          {tags.length === 0 && (
            <span className="text-muted text-2xs">No tags</span>
          )}
        </div>

        {/* Add tag button with dropdown */}
        <div className="relative" ref={tagMenuRef}>
          <button
            onClick={() => setShowTagMenu(!showTagMenu)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--accent-primary)' }}
            title="Manage tags"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Tag dropdown menu */}
          {showTagMenu && (
            <div
              className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-xl overflow-hidden z-50"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                {allTags.map(tag => {
                  const isAssigned = tags.some(t => t.id === tag.id);
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
                        <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
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
                <div className="p-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
                  className="w-full flex items-center justify-center gap-1 px-2 py-2 text-2xs text-accent hover:bg-accent/10 transition-colors"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Tag
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Quick stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Active session indicator */}
        {project.hasActiveSession && (
          <div className="flex items-center gap-1.5" title="Active session">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-2xs text-green-400">Active</span>
          </div>
        )}

        {/* GitHub status */}
        {project.githubRepo && (
          <div className="flex items-center gap-1.5" title={`GitHub: ${project.githubRepo.lastSyncStatus || 'synced'}`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span
              className="text-2xs"
              style={{
                color: project.githubRepo.lastSyncStatus === 'synced'
                  ? 'var(--status-success)'
                  : project.githubRepo.lastSyncStatus === 'ahead'
                  ? 'var(--status-warning)'
                  : 'var(--text-muted)'
              }}
            >
              {project.githubRepo.lastSyncStatus || 'synced'}
            </span>
          </div>
        )}

        {/* Project path */}
        <div
          className="text-2xs text-muted font-mono truncate max-w-[200px]"
          title={project.path}
        >
          {project.path.replace(/^\/home\/[^/]+\/Projects\//, '~/')}
        </div>
      </div>
    </div>
  );
}
