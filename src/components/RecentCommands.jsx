/**
 * Recent Commands Component
 * Command history dropdown with quick execution
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { commandsApi } from '../services/api.js';

function CommandItem({ command, onExecute, onCopy, onPin, isPinned, isFavorite }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer group"
      onClick={() => onExecute(command.command)}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {isFavorite ? (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Command text */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-primary truncate">{command.command}</div>
        <div className="text-xs text-muted">
          {command.project && <span>{command.project} • </span>}
          {command.timestamp && <span>{formatTimeAgo(command.timestamp)}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(command.command); }}
          className="p-1 hover:bg-white/10 rounded"
          title="Copy"
        >
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPin(command.id); }}
          className="p-1 hover:bg-white/10 rounded"
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <svg className={`w-3.5 h-3.5 ${isPinned ? 'text-accent' : 'text-muted'}`} fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function RecentCommands({
  isOpen,
  onClose,
  onExecute,
  position = { top: 60, right: 20 }
}) {
  const [commands, setCommands] = useState([]);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all'); // all, pinned, git, npm, docker
  const [pinnedIds, setPinnedIds] = useState(new Set());
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load command history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await commandsApi.getHistory();
        setCommands(data.commands || []);
      } catch (error) {
        console.error('Failed to load command history:', error);
        // Load from localStorage as fallback
        const stored = localStorage.getItem('command-history');
        if (stored) {
          setCommands(JSON.parse(stored));
        }
      }
    };

    if (isOpen) {
      loadHistory();
      // Load pinned from localStorage
      const pinned = localStorage.getItem('pinned-commands');
      if (pinned) {
        setPinnedIds(new Set(JSON.parse(pinned)));
      }
    }
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard?.writeText(text);
  }, []);

  const handlePin = useCallback((id) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('pinned-commands', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleExecute = useCallback((command) => {
    onExecute?.(command);
    onClose();
  }, [onExecute, onClose]);

  const filteredCommands = commands.filter(cmd => {
    // Text filter
    if (filter && !cmd.command.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }

    // Category filter
    if (category === 'pinned' && !pinnedIds.has(cmd.id)) return false;
    if (category === 'git' && !cmd.command.startsWith('git')) return false;
    if (category === 'npm' && !cmd.command.match(/^(npm|yarn|pnpm)/)) return false;
    if (category === 'docker' && !cmd.command.match(/^(docker|docker-compose)/)) return false;

    return true;
  });

  // Sort: pinned first, then by timestamp
  const sortedCommands = [...filteredCommands].sort((a, b) => {
    const aIsPinned = pinnedIds.has(a.id);
    const bIsPinned = pinnedIds.has(b.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 w-96 max-h-[70vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{
        ...position,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)'
      }}
    >
      {/* Header */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-primary">Recent Commands</span>
          <div className="flex-1" />
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="mt-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search commands..."
            className="w-full px-3 py-1.5 pl-8 text-sm rounded"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          />
          <svg className="w-4 h-4 text-muted absolute left-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 mt-2">
          {['all', 'pinned', 'git', 'npm', 'docker'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2 py-1 text-xs rounded capitalize ${
                category === cat
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-primary hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Command List */}
      <div className="flex-1 overflow-auto">
        {sortedCommands.length === 0 ? (
          <div className="text-center text-muted py-8">
            {filter ? 'No matching commands' : 'No recent commands'}
          </div>
        ) : (
          sortedCommands.map(cmd => (
            <CommandItem
              key={cmd.id}
              command={cmd}
              onExecute={handleExecute}
              onCopy={handleCopy}
              onPin={handlePin}
              isPinned={pinnedIds.has(cmd.id)}
              isFavorite={cmd.isFavorite}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 text-xs text-muted flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
      >
        <span>{sortedCommands.length} commands</span>
        <button
          onClick={() => {
            localStorage.removeItem('command-history');
            setCommands([]);
          }}
          className="text-red-400 hover:underline"
        >
          Clear History
        </button>
      </div>
    </div>
  );
}

// Hook to use recent commands
export function useRecentCommands() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('command-history');
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  const addCommand = useCallback((command, project) => {
    const newEntry = {
      id: Date.now(),
      command,
      project,
      timestamp: new Date().toISOString()
    };

    setHistory(prev => {
      const updated = [newEntry, ...prev.filter(c => c.command !== command)].slice(0, 100);
      localStorage.setItem('command-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { history, addCommand };
}
