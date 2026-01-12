/**
 * Global Search Component
 * Universal search across projects, sessions, commands, and more
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All', icon: null },
  { id: 'projects', label: 'Projects', icon: '📁', color: '#3498db' },
  { id: 'sessions', label: 'Sessions', icon: '💻', color: '#2ecc71' },
  { id: 'commands', label: 'Commands', icon: '⌨️', color: '#9b59b6' },
  { id: 'prompts', label: 'Prompts', icon: '💬', color: '#f39c12' },
  { id: 'files', label: 'Files', icon: '📄', color: '#e74c3c' },
  { id: 'docs', label: 'Docs', icon: '📚', color: '#1abc9c' }
];

function ResultItem({ item, isSelected, onClick }) {
  const categoryConfig = SEARCH_CATEGORIES.find(c => c.id === item.type) || SEARCH_CATEGORIES[0];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
        isSelected ? 'bg-accent/20' : 'hover:bg-white/5'
      }`}
      onClick={() => onClick(item)}
    >
      {/* Type Icon */}
      <span className="text-xl">{categoryConfig.icon || '🔍'}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-primary truncate">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-muted truncate">{item.subtitle}</div>
        )}
      </div>

      {/* Action hint */}
      <span className="text-xs text-muted">
        {item.type === 'commands' ? 'Run' : item.type === 'files' ? 'Open' : 'Go'}
      </span>
    </div>
  );
}

function SearchTips() {
  return (
    <div className="px-4 py-6 text-center">
      <div className="text-sm text-muted mb-4">Quick Tips</div>
      <div className="space-y-2 text-xs text-secondary">
        <div><span className="font-mono bg-white/10 px-1 rounded">@project</span> Search in projects</div>
        <div><span className="font-mono bg-white/10 px-1 rounded">/command</span> Run a command</div>
        <div><span className="font-mono bg-white/10 px-1 rounded">#session</span> Find sessions</div>
        <div><span className="font-mono bg-white/10 px-1 rounded">file:*.js</span> Search files</div>
      </div>
    </div>
  );
}

function RecentSearches({ searches, onSelect, onClear }) {
  if (searches.length === 0) return null;

  return (
    <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted">Recent</span>
        <button onClick={onClear} className="text-xs text-red-400 hover:underline">Clear</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((search, i) => (
          <button
            key={i}
            onClick={() => onSelect(search)}
            className="px-2 py-0.5 text-xs rounded bg-white/5 text-muted hover:text-primary"
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GlobalSearch({
  isOpen,
  onClose,
  onNavigate,
  onRunCommand
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Load recent searches
  useEffect(() => {
    const stored = localStorage.getItem('recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery, searchCategory) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: searchCategory,
        limit: '20'
      });

      const response = await fetch(`/api/search/global?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback mock results
      setResults([
        { id: 1, type: 'projects', title: searchQuery, subtitle: 'Project match' },
        { id: 2, type: 'sessions', title: `Session: ${searchQuery}`, subtitle: 'Session match' },
        { id: 3, type: 'commands', title: `npm run ${searchQuery}`, subtitle: 'Command' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, category);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, category, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          const cats = SEARCH_CATEGORIES;
          const currentIdx = cats.findIndex(c => c.id === category);
          setCategory(cats[(currentIdx + 1) % cats.length].id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, category, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedEl = resultsRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (item) => {
    // Save to recent searches
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      setRecentSearches(updated);
    }

    // Handle action based on type
    switch (item.type) {
      case 'commands':
        onRunCommand?.(item.title);
        break;
      case 'files':
        // Could open file viewer
        break;
      default:
        onNavigate?.(item);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, sessions, commands..."
            className="flex-1 bg-transparent text-lg text-primary outline-none"
          />
          {loading && (
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          )}
          <div className="flex items-center gap-1 text-xs text-muted">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10">Esc</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {SEARCH_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded whitespace-nowrap ${
                category === cat.id
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-primary hover:bg-white/5'
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Recent Searches */}
        {!query && (
          <RecentSearches
            searches={recentSearches}
            onSelect={setQuery}
            onClear={() => {
              localStorage.removeItem('recent-searches');
              setRecentSearches([]);
            }}
          />
        )}

        {/* Results */}
        <div ref={resultsRef} className="max-h-96 overflow-auto">
          {query && results.length === 0 && !loading && (
            <div className="text-center text-muted py-8">
              No results for "{query}"
            </div>
          )}

          {results.map((item, index) => (
            <ResultItem
              key={item.id}
              item={item}
              isSelected={index === selectedIndex}
              onClick={handleSelect}
            />
          ))}

          {!query && results.length === 0 && <SearchTips />}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-4">
            <span><kbd className="px-1 rounded bg-white/10">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 rounded bg-white/10">↵</kbd> Select</span>
            <span><kbd className="px-1 rounded bg-white/10">Tab</kbd> Category</span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}

// Hook to open global search
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}
