/**
 * Changelog Widget Component
 * What's new display for updates and features
 */

import { useState, useEffect, useCallback } from 'react';

const CHANGELOG_ENTRIES = [
  {
    version: '1.0.0',
    date: '2026-01-14',
    type: 'major',
    title: 'Console.web v1.0 - Complete Management Interface',
    highlights: [
      'Complete web-based management interface for Claude Code projects',
      'Browser-based terminals with tmux persistence - sessions survive disconnects',
      'Real-time system monitoring with 2-second CPU refresh across all cores',
      'Full infrastructure management: Docker, systemd, firewall, users, SSH',
      'AI automation with 13+ agents, MCP servers, and voice commands',
      'Comprehensive developer tools: API tester, database browser, Git workflow',
      'Project templates, compliance checker, and one-click deployment',
      'GitHub integration with clone, push, and sync status',
      'Cloudflare Tunnels for one-click public deployment',
      'Widget-based customizable sidebars with drag-and-drop',
    ],
    features: [
      // Terminal & Sessions
      { title: 'Terminal Sessions', description: 'xterm.js terminals with tmux persistence, auto-reconnect, folders, tags, notes, templates, and team handoffs' },
      { title: 'Session Management', description: 'Organize sessions with folders, tags, and search. Create session templates for common workflows' },
      { title: 'Session Sharing', description: 'Share sessions via links, add comments, activity feed, and team handoffs' },

      // Project Management
      { title: 'Project Browser', description: 'Browse projects with favorites, completion metrics, search, and CLAUDE.md editor' },
      { title: 'Project Templates', description: '6 template types: Full-Stack, Frontend, Desktop (Tauri), CLI, Infrastructure, Mobile (Flutter)' },
      { title: 'Project Creation Wizard', description: '5-step wizard with template selection, GitHub repo creation, and Cloudflare publishing' },
      { title: 'Compliance Checker', description: 'Weighted scoring for CI/CD, security, hooks, TypeScript strict, ESLint, Prettier, CLAUDE.md' },
      { title: 'Checkpoints & Rollback', description: 'Save project state with git info, restore with one click, pin important checkpoints' },

      // System Monitoring
      { title: 'System Monitoring', description: 'Real-time CPU/memory/disk stats with 2-second refresh and delta-based CPU calculation' },
      { title: 'Process Manager', description: 'htop-style process list sorted by CPU/memory with ability to kill processes' },
      { title: 'System Logs', description: 'journalctl viewer with filtering by service unit, priority level, and text search' },
      { title: 'Network Diagnostics', description: 'View interfaces, ping hosts, DNS lookup, and monitor active connections' },

      // Infrastructure Control
      { title: 'Docker Management', description: 'Full container lifecycle: start, stop, restart, logs, images, volumes' },
      { title: 'Systemd Services', description: 'View and control systemd services directly from the dashboard' },
      { title: 'UFW Firewall', description: 'Enable/disable firewall, manage rules, quick actions for SSH/HTTP/HTTPS' },
      { title: 'Package Management', description: 'apt package lifecycle with search, install, update, and remove capabilities' },
      { title: 'Task Scheduler', description: 'Manage cron jobs and systemd timers with add/remove/toggle controls' },

      // Security
      { title: 'Authentik SSO', description: 'Full Authentik integration for user authentication and group management' },
      { title: 'User Management', description: 'Manage Authentik SSO users and Linux server users/groups' },
      { title: 'Security Dashboard', description: 'Monitor SSH sessions, failed logins, fail2ban status, and open ports' },
      { title: 'Security Scanning', description: 'Integration with Semgrep, Gitleaks, Trivy for vulnerability scanning' },
      { title: 'Push Sanitization', description: 'Git hooks that scan for secrets, PII, and sensitive data before push' },

      // Developer Tools
      { title: 'API Tester', description: 'Test API endpoints with custom headers, body, and authentication' },
      { title: 'Database Browser', description: 'Browse and query database tables directly from the dashboard' },
      { title: 'File Explorer', description: 'Navigate and view project files without leaving the interface' },
      { title: 'Dependencies Dashboard', description: 'View npm packages with versions, update types, and vulnerability scanning' },
      { title: 'Git Workflow', description: 'Commit, push, pull, branches, and diff viewer with visual status indicators' },

      // AI & Automation
      { title: 'Agent Marketplace', description: '13+ pre-built agents: ESLint, Prettier, Security Scanner, Test Runner, and more' },
      { title: 'Custom Agent Builder', description: 'Create custom automation agents with configurable triggers and actions' },
      { title: 'MCP Server Catalog', description: '22+ MCP servers across 6 categories with one-click installation' },
      { title: 'Voice-to-Code', description: 'Browser-native speech recognition for voice commands in terminals' },
      { title: 'Aider Integration', description: 'Full Aider AI coding assistant with multi-LLM support and voice commands' },
      { title: 'AI Personas', description: 'Create and switch between different AI personas for varied interaction styles' },
      { title: 'Memory Banks', description: 'Layered context persistence with session, project, and global scopes' },

      // Content Libraries
      { title: 'Prompt Library', description: 'Reusable prompts with variable substitution and categorization' },
      { title: 'Command Snippets', description: 'Save and quickly access frequently used command sequences' },
      { title: 'Theme System', description: '11 glassmorphism themes with full CSS variable customization' },
      { title: 'Keyboard Shortcuts', description: 'Customizable keyboard shortcuts for all major actions' },

      // GitHub Integration
      { title: 'GitHub Authentication', description: 'Personal Access Token configuration with secure storage' },
      { title: 'Clone & Push', description: 'Clone repos from GitHub or push local projects to new repositories' },
      { title: 'Sync Status', description: 'Visual indicators showing ahead/behind/synced status per project' },
      { title: 'GitHub Actions', description: 'View workflow run status and CI/CD pipeline results' },

      // Cloudflare Integration
      { title: 'One-Click Publish', description: 'Publish any project to a public subdomain via Cloudflare Tunnels' },
      { title: 'Route Management', description: 'Automatic DNS record creation, route status monitoring, port-based project mapping' },
      { title: 'WebSocket Support', description: 'Toggle WebSocket support for routes requiring wss://' },
      { title: 'Vite Integration', description: 'Automatically adds hostname to vite.config.js allowedHosts on publish' },

      // UI/UX
      { title: 'Widget Dashboard', description: 'Drag-and-drop customizable widgets with vertical height snapping' },
      { title: 'Admin Dashboard', description: 'Consolidated 9-tab interface: Overview, Infrastructure, History, MCP, Projects, Development, Agents, Security, Settings' },
      { title: 'Project Favorites', description: 'Star projects to pin them at the top of the sidebar' },
      { title: 'Sidebar Scroll Fix', description: 'Proper scroll behavior in sidebars without terminal interference' },
    ],
  },
];

const TYPE_COLORS = {
  major: '#e74c3c',
  minor: '#f39c12',
  patch: '#2ecc71'
};

function VersionBadge({ version, type }) {
  return (
    <span
      className="px-2 py-0.5 text-xs font-bold rounded"
      style={{ background: TYPE_COLORS[type] + '20', color: TYPE_COLORS[type] }}
    >
      v{version}
    </span>
  );
}

function ChangelogEntry({ entry, isExpanded, onToggle }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5"
      >
        <VersionBadge version={entry.version} type={entry.type} />
        <div className="flex-1">
          <div className="font-medium text-primary">{entry.title}</div>
          <div className="text-xs text-muted">{new Date(entry.date).toLocaleDateString()}</div>
        </div>
        <svg
          className={`w-5 h-5 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Highlights */}
          <div>
            <div className="text-xs text-muted mb-2">Highlights</div>
            <ul className="space-y-1">
              {entry.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          {/* Features (if major) */}
          {entry.features && (
            <div>
              <div className="text-xs text-muted mb-2">New Features</div>
              <div className="grid grid-cols-2 gap-2">
                {entry.features.map((feature, i) => (
                  <div key={i} className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-sm font-medium text-primary">{feature.title}</div>
                    <div className="text-xs text-muted">{feature.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChangelogWidget({ isOpen, onClose }) {
  const [expandedVersion, setExpandedVersion] = useState(CHANGELOG_ENTRIES[0]?.version);
  const [hasNew, setHasNew] = useState(false);

  // Check for new updates
  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    const latestVersion = CHANGELOG_ENTRIES[0]?.version;
    if (lastSeen !== latestVersion) {
      setHasNew(true);
    }
  }, []);

  // Mark as seen when opened
  useEffect(() => {
    if (isOpen && hasNew) {
      localStorage.setItem('changelog-last-seen', CHANGELOG_ENTRIES[0]?.version);
      setHasNew(false);
    }
  }, [isOpen, hasNew]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">What's New</h2>
            {hasNew && (
              <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400 animate-pulse">
                New
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {CHANGELOG_ENTRIES.map(entry => (
            <ChangelogEntry
              key={entry.version}
              entry={entry}
              isExpanded={expandedVersion === entry.version}
              onToggle={() => setExpandedVersion(
                expandedVersion === entry.version ? null : entry.version
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 text-sm"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <a
            href="https://github.com/your-repo/changelog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Full Changelog
          </a>
          <span className="text-muted">Console.web v{CHANGELOG_ENTRIES[0]?.version}</span>
        </div>
      </div>
    </div>
  );
}

// Notification badge for new updates
export function ChangelogBadge({ onClick }) {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    const latestVersion = CHANGELOG_ENTRIES[0]?.version;
    setHasNew(lastSeen !== latestVersion);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-white/10 rounded"
      title="What's New"
    >
      <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {hasNew && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </button>
  );
}

// Compact widget for sidebar
export function ChangelogCompact() {
  const latest = CHANGELOG_ENTRIES[0];
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    setDismissed(lastSeen === latest?.version);
  }, [latest]);

  if (dismissed || !latest) return null;

  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'var(--bg-accent)/10', border: '1px solid var(--border-accent)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-accent">{latest.title}</div>
          <div className="text-xs text-muted mt-0.5">v{latest.version}</div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('changelog-last-seen', latest.version);
            setDismissed(true);
          }}
          className="text-muted hover:text-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {latest.highlights.slice(0, 3).map((h, i) => (
          <li key={i} className="text-xs text-secondary flex items-center gap-1">
            <span className="text-green-400">+</span> {h}
          </li>
        ))}
      </ul>
    </div>
  );
}
