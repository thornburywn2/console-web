/**
 * Session Template Modal Component
 * Select and apply session templates for quick setup
 */

import { useState, useEffect } from 'react';

// Built-in templates
const BUILT_IN_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Session',
    description: 'Start with an empty terminal',
    icon: '📝',
    commands: [],
    isBuiltIn: true
  },
  {
    id: 'docker-debug',
    name: 'Docker Debug',
    description: 'Debug Docker containers with logs and stats',
    icon: '🐳',
    commands: [
      'docker ps',
      'docker stats --no-stream'
    ],
    isBuiltIn: true
  },
  {
    id: 'git-status',
    name: 'Git Status',
    description: 'Check git status and recent commits',
    icon: '🔀',
    commands: [
      'git status',
      'git log --oneline -10'
    ],
    isBuiltIn: true
  },
  {
    id: 'npm-dev',
    name: 'NPM Development',
    description: 'Install dependencies and start dev server',
    icon: '📦',
    commands: [
      'npm install',
      'npm run dev'
    ],
    isBuiltIn: true
  },
  {
    id: 'python-venv',
    name: 'Python Virtual Env',
    description: 'Activate Python virtual environment',
    icon: '🐍',
    commands: [
      'source venv/bin/activate || python3 -m venv venv && source venv/bin/activate',
      'pip list'
    ],
    isBuiltIn: true
  },
  {
    id: 'system-monitor',
    name: 'System Monitor',
    description: 'Monitor system resources',
    icon: '📊',
    commands: [
      'htop || top'
    ],
    isBuiltIn: true
  },
  {
    id: 'claude-session',
    name: 'Claude Session',
    description: 'Start a Claude Code session',
    icon: '🤖',
    commands: [
      'claude'
    ],
    isBuiltIn: true
  }
];

export default function SessionTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  customTemplates = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Combine built-in and custom templates
  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates];

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'all') return matchesSearch;
    if (selectedCategory === 'builtin') return matchesSearch && template.isBuiltIn;
    if (selectedCategory === 'custom') return matchesSearch && !template.isBuiltIn;
    return matchesSearch;
  });

  // Handle template selection
  const handleSelect = (template) => {
    onSelectTemplate?.(template);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold text-primary">Session Templates</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'builtin', label: 'Built-in' },
              { key: 'custom', label: 'Custom' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-accent/20 text-accent'
                    : 'text-secondary hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              No templates found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="text-left p-4 rounded-lg transition-all hover:scale-[1.02] group"
                  style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary truncate">
                          {template.name}
                        </span>
                        {template.isBuiltIn && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      {template.commands.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-2xs text-muted">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {template.commands.length} command{template.commands.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-xs text-muted">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
