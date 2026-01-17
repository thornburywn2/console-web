/**
 * Snippet Palette Component
 * Quick command snippet selection with categories and search
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { snippetsApi } from '../services/api.js';

export default function SnippetPalette({
  isOpen,
  onClose,
  onSelectSnippet,
  onExecuteSnippet,
}) {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Fetch snippets
  useEffect(() => {
    if (isOpen) {
      fetchSnippets();
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const fetchSnippets = async () => {
    setLoading(true);
    try {
      const data = await snippetsApi.list();
      setSnippets(data);
    } catch (error) {
      console.error('Failed to fetch snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(snippets.map(s => s.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [snippets]);

  // Filter snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = searchQuery === '' ||
        snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || snippet.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [snippets, searchQuery, selectedCategory]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredSnippets.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredSnippets[selectedIndex]) {
        e.preventDefault();
        handleExecute(filteredSnippets[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredSnippets, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory]);

  const handleExecute = async (snippet) => {
    // Track usage
    try {
      await snippetsApi.run(snippet.id);
    } catch (error) {
      console.error('Failed to track snippet usage:', error);
    }

    if (onExecuteSnippet) {
      onExecuteSnippet(snippet);
    } else if (onSelectSnippet) {
      onSelectSnippet(snippet);
    }
    onClose();
  };

  const handleCopy = (e, snippet) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.command);
  };

  const toggleFavorite = async (e, snippet) => {
    e.stopPropagation();
    try {
      await snippetsApi.toggleFavorite(snippet.id, !snippet.isFavorite);
      setSnippets(prev =>
        prev.map(s => s.id === snippet.id ? { ...s, isFavorite: !s.isFavorite } : s)
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Search Input */}
        <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commands..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent/20 text-accent'
                    : 'text-secondary hover:bg-white/5'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet List */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto"
        >
          {loading ? (
            <div className="p-8 text-center text-muted text-sm">
              Loading snippets...
            </div>
          ) : filteredSnippets.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              {searchQuery ? `No snippets matching "${searchQuery}"` : 'No snippets found'}
            </div>
          ) : (
            filteredSnippets.map((snippet, index) => (
              <button
                key={snippet.id}
                onClick={() => handleExecute(snippet)}
                className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
                  index === selectedIndex ? 'bg-accent/10' : 'hover:bg-white/5'
                }`}
                style={{
                  borderBottom: index < filteredSnippets.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary">{snippet.name}</span>
                    {snippet.isFavorite && (
                      <span className="text-amber-400 text-xs">*</span>
                    )}
                    {snippet.category && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-white/5 text-muted">
                        {snippet.category}
                      </span>
                    )}
                  </div>
                  {snippet.description && (
                    <p className="text-xs text-secondary mt-0.5 truncate">
                      {snippet.description}
                    </p>
                  )}
                  <code className="text-2xs text-muted mt-1 block truncate font-mono" style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                    {snippet.command}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  <button
                    onClick={(e) => handleCopy(e, snippet)}
                    className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-primary transition-colors"
                    title="Copy command"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => toggleFavorite(e, snippet)}
                    className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
                      snippet.isFavorite ? 'text-amber-400' : 'text-muted hover:text-amber-400'
                    }`}
                    title={snippet.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg className="w-3.5 h-3.5" fill={snippet.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 flex items-center justify-between text-2xs text-muted" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/10">Enter</kbd>
              Execute
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/10">Esc</kbd>
              Close
            </span>
          </div>
          <span>{filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
