/**
 * Session Search Component
 * Advanced search with filters for sessions, folders, and tags
 */

import { useState, useEffect, useRef, useMemo } from 'react';

export default function SessionSearch({
  projects = [],
  sessions = [],
  folders = [],
  tags = [],
  selectedTags = [],
  onSearch,
  onSelectProject,
  onSelectSession,
  onToggleTag,
  placeholder = "Search projects...",
}) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'projects' | 'sessions' | 'active'
  const inputRef = useRef(null);

  // Filter results based on query and filter type
  const results = useMemo(() => {
    if (!query.trim()) return { projects: [], sessions: [] };

    const lowerQuery = query.toLowerCase();

    let filteredProjects = projects.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.path?.toLowerCase().includes(lowerQuery)
    );

    let filteredSessions = sessions.filter(s =>
      s.sessionName?.toLowerCase().includes(lowerQuery) ||
      s.displayName?.toLowerCase().includes(lowerQuery)
    );

    // Apply filter type
    if (filterType === 'projects') {
      filteredSessions = [];
    } else if (filterType === 'sessions') {
      filteredProjects = [];
    } else if (filterType === 'active') {
      filteredProjects = filteredProjects.filter(p => p.hasActiveSession);
      filteredSessions = filteredSessions.filter(s => s.status === 'ACTIVE');
    }

    // Apply tag filters
    if (selectedTags.length > 0 && filteredSessions.length > 0) {
      filteredSessions = filteredSessions.filter(s =>
        s.tags?.some(t => selectedTags.includes(t.tagId || t.id))
      );
    }

    return {
      projects: filteredProjects.slice(0, 10),
      sessions: filteredSessions.slice(0, 10)
    };
  }, [query, projects, sessions, filterType, selectedTags]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notify parent of search changes
  useEffect(() => {
    onSearch?.(query);
  }, [query, onSearch]);

  const hasResults = results.projects.length > 0 || results.sessions.length > 0;

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="input-glass w-full pl-9 pr-20 py-2 text-sm"
        />
        {/* Filter Toggle & Keyboard Hint */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded transition-colors ${
              showFilters || selectedTags.length > 0
                ? 'bg-accent/20 text-accent'
                : 'text-muted hover:text-secondary'
            }`}
            title="Toggle filters"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          <span className="text-2xs text-muted font-mono hidden sm:inline">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-2 py-2 rounded-lg space-y-2" style={{ background: 'var(--bg-tertiary)' }}>
          {/* Filter Type */}
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'projects', label: 'Projects' },
              { key: 'sessions', label: 'Sessions' },
              { key: 'active', label: 'Active' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterType === key
                    ? 'bg-accent/20 text-accent'
                    : 'text-secondary hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick Tag Filters */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 6).map(tag => (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag?.(tag.id)}
                  className={`px-2 py-0.5 rounded-full text-2xs flex items-center gap-1 transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-accent/20 text-accent'
                      : 'text-secondary hover:bg-white/5'
                  }`}
                  style={{
                    borderColor: tag.color,
                    border: selectedTags.includes(tag.id) ? `1px solid ${tag.color}` : '1px solid transparent'
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Results (when typing) */}
      {query.trim() && (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
          {!hasResults ? (
            <div className="px-3 py-4 text-center text-xs text-muted">
              No results for "{query}"
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {/* Projects */}
              {results.projects.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted" style={{ background: 'var(--bg-tertiary)' }}>
                    Projects
                  </div>
                  {results.projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        onSelectProject?.(project);
                        setQuery('');
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${project.hasActiveSession ? 'status-dot online' : ''}`}
                        style={{ background: project.hasActiveSession ? 'var(--accent-primary)' : 'var(--border-default)' }}
                      />
                      <span className="text-sm text-primary truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sessions */}
              {results.sessions.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted" style={{ background: 'var(--bg-tertiary)' }}>
                    Sessions
                  </div>
                  {results.sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => {
                        onSelectSession?.(session);
                        setQuery('');
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm">{session.isPinned ? '📌' : '💻'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-primary truncate">
                          {session.displayName || session.sessionName}
                        </div>
                        {session.project && (
                          <div className="text-2xs text-muted truncate">
                            {session.project.name}
                          </div>
                        )}
                      </div>
                      {session.tags?.length > 0 && (
                        <div className="flex gap-0.5">
                          {session.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag.id || tag.tagId}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color || tag.tag?.color }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
