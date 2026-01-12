/**
 * Command Palette Component
 * A searchable command palette inspired by VS Code / Sublime Text
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { getShortcutsByCategory, ACTION_DESCRIPTIONS } from '../hooks/useKeyboardShortcuts';

// All available commands
const COMMANDS = [
  // Navigation
  { id: 'toggleSidebar', name: 'Toggle Left Sidebar', category: 'Navigation', icon: '<<' },
  { id: 'toggleRightSidebar', name: 'Toggle Right Sidebar', category: 'Navigation', icon: '>>' },
  { id: 'toggleFullscreen', name: 'Toggle Fullscreen', category: 'Navigation', icon: '[]' },

  // Sessions
  { id: 'newSession', name: 'New Session', category: 'Sessions', icon: '+' },
  { id: 'closeSession', name: 'Close Current Session', category: 'Sessions', icon: 'x' },
  { id: 'openTemplates', name: 'Session Templates', category: 'Sessions', icon: '#' },
  { id: 'openNotes', name: 'Session Notes', category: 'Sessions', icon: '@' },
  { id: 'openCheckpoints', name: 'Checkpoints & Rollback', category: 'Sessions', icon: 'C' },

  // UI / Themes
  { id: 'openThemes', name: 'Change Theme', category: 'Appearance', icon: '~' },
  { id: 'cycleTheme', name: 'Cycle to Next Theme', category: 'Appearance', icon: '>' },

  // Admin
  { id: 'openAdmin', name: 'Open Admin Dashboard', category: 'Admin', icon: '*' },
  { id: 'openSettings', name: 'Open Settings', category: 'Settings', icon: '%' },
  { id: 'showShortcuts', name: 'Show Keyboard Shortcuts', category: 'Help', icon: '?' },

  // Actions
  { id: 'focusSearch', name: 'Focus Project Search', category: 'Search', icon: '/' },
  { id: 'refreshProjects', name: 'Refresh Project List', category: 'Projects', icon: 'R' },
];

export default function CommandPalette({
  isOpen,
  onClose,
  onCommand,
  projects = [],
  recentCommands = []
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Add project commands dynamically
  const allCommands = useMemo(() => {
    const projectCommands = projects.slice(0, 9).map((project, index) => ({
      id: `selectProject:${project.path}`,
      name: `Switch to ${project.name}`,
      category: 'Projects',
      icon: `${index + 1}`,
      data: project,
    }));

    return [...COMMANDS, ...projectCommands];
  }, [projects]);

  // Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(allCommands, {
      keys: ['name', 'category'],
      threshold: 0.4,
      includeScore: true,
    });
  }, [allCommands]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all commands
      const recentIds = new Set(recentCommands.map(c => c.id));
      const recent = allCommands.filter(c => recentIds.has(c.id));
      const others = allCommands.filter(c => !recentIds.has(c.id));
      return [...recent, ...others];
    }

    return fuse.search(query).map(result => result.item);
  }, [query, allCommands, fuse, recentCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selectedElement = list.children[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (command) => {
    onCommand(command.id, command.data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl mx-4 glass-elevated rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        style={{
          border: '1px solid var(--border-color)',
          maxHeight: '60vh',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-accent font-mono text-lg">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-primary text-sm font-mono placeholder:text-secondary"
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded"
               style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(60vh - 60px)' }}
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-secondary text-sm font-mono">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={() => handleSelect(command)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent/10'
                    : 'hover:bg-white/5'
                }`}
                style={{
                  borderLeft: index === selectedIndex ? '2px solid var(--accent-primary)' : '2px solid transparent',
                }}
              >
                {/* Icon */}
                <span
                  className="w-6 h-6 flex items-center justify-center rounded font-mono text-xs font-bold"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {command.icon}
                </span>

                {/* Name & Category */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary truncate">
                    {command.name}
                  </div>
                  <div className="text-xs text-secondary font-mono">
                    {command.category}
                  </div>
                </div>

                {/* Shortcut hint */}
                {command.shortcut && (
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded"
                       style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {command.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs font-mono border-t"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>↵</kbd>
              select
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}
