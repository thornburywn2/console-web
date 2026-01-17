/**
 * GitHub Repository List Modal
 * Browse all GitHub repos with search and clone functionality
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { githubApi } from '../services/api.js';

// GitHub Octocat icon
function GitHubIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

// Language color map
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  C: '#555555',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00'
};

export default function GitHubRepoList({ isOpen, onClose, onClone, onRefresh }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cloning, setCloning] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch repos
  const fetchRepos = useCallback(async (searchTerm = '', pageNum = 1) => {
    setLoading(true);
    setError('');

    try {
      const data = searchTerm
        ? await githubApi.searchRepos(searchTerm, pageNum)
        : await githubApi.getRepos(pageNum, 30);

      if (pageNum === 1) {
        setRepos(data.repos);
      } else {
        setRepos(prev => [...prev, ...data.repos]);
      }

      setHasMore(data.repos.length >= 30);
      setPage(pageNum);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (isOpen) {
      fetchRepos();
    }
  }, [isOpen, fetchRepos]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchRepos(searchQuery, 1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, fetchRepos]);

  // Clone repo handler
  const handleClone = async (repo) => {
    setCloning(repo.fullName);
    setError('');

    try {
      const data = await githubApi.cloneRepo(repo.owner, repo.name);

      // Update repo as linked
      setRepos(prev => prev.map(r =>
        r.fullName === repo.fullName
          ? { ...r, isLinked: true, linkedProjectId: data.project.id }
          : r
      ));

      // Notify parent
      if (onClone) onClone(data.project);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setCloning(null);
    }
  };

  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRepos(searchQuery, page + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <GitHubIcon className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-primary">GitHub Repositories</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your repositories..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mx-4 mt-4 p-3 rounded-lg text-sm"
            style={{ background: 'var(--status-error)', color: 'white' }}
          >
            {error}
          </div>
        )}

        {/* Repo List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading && repos.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-12 text-muted">
              No repositories found
            </div>
          ) : (
            <>
              {repos.map(repo => (
                <div
                  key={repo.id}
                  className="p-4 rounded-lg transition-colors hover:bg-white/5"
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Repo name */}
                      <div className="flex items-center gap-2">
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-accent hover:underline truncate"
                        >
                          {repo.fullName}
                        </a>
                        {repo.isPrivate ? (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
                            Private
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                            Public
                          </span>
                        )}
                        {repo.isLinked && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                            Cloned
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {repo.description && (
                        <p className="mt-1 text-sm text-secondary truncate">
                          {repo.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: LANGUAGE_COLORS[repo.language] || '#666' }}
                            />
                            {repo.language}
                          </span>
                        )}
                        {repo.stargazersCount > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {repo.stargazersCount}
                          </span>
                        )}
                        {repo.forksCount > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            {repo.forksCount}
                          </span>
                        )}
                        {repo.pushedAt && (
                          <span>
                            Updated {new Date(repo.pushedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clone Button */}
                    <div className="flex-shrink-0">
                      {repo.isLinked ? (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded text-sm opacity-50"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                        >
                          Cloned
                        </button>
                      ) : (
                        <button
                          onClick={() => handleClone(repo)}
                          disabled={cloning === repo.fullName}
                          className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'black',
                            opacity: cloning === repo.fullName ? 0.7 : 1
                          }}
                        >
                          {cloning === repo.fullName ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                              Cloning...
                            </span>
                          ) : (
                            'Clone'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-3 text-sm text-accent hover:underline"
                >
                  {loading ? 'Loading...' : 'Load more repositories'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 text-sm"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span className="text-muted">
            {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
          </span>
          <button
            onClick={() => fetchRepos(searchQuery, 1)}
            className="text-accent hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
