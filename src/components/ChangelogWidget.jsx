/**
 * Changelog Widget Component
 * What's new display for updates and features
 */

import { useState, useEffect, useCallback } from 'react';

const CHANGELOG_ENTRIES = [
  {
    version: '2.10.0',
    date: '2026-01-12',
    type: 'minor',
    title: 'Skip Permissions & Project Settings',
    highlights: [
      'Per-project toggle to start Claude with --dangerously-skip-permissions',
      'New Project Settings API for managing per-project configuration',
      'Agent Status Dashboard moved to left sidebar for better visibility',
      'Removed Activity Log widget from right sidebar',
      'Improved sidebar organization and layout',
    ],
    features: [
      { title: 'Skip Permissions', description: 'Toggle per-project to bypass Claude permission prompts' },
      { title: 'Project Settings API', description: 'GET/PATCH endpoints for managing project-specific settings' },
      { title: 'Agent Dashboard', description: 'Relocated to left sidebar with the project list' },
      { title: 'Cleaner UI', description: 'Streamlined right sidebar by removing activity log' },
    ],
  },
  {
    version: '2.9.0',
    date: '2026-01-12',
    type: 'minor',
    title: 'Security Dashboard & GitHub Push Sanitization',
    highlights: [
      'New Security tab in Admin Dashboard with lifecycle agent integration',
      'Pre-push sanitization hooks to prevent secrets from reaching GitHub',
      'Tool status monitoring for Semgrep, Gitleaks, Trivy, and more',
      'One-click security, quality, and performance scans',
      'Lifecycle agent API routes for programmatic access',
      'Comprehensive security tools setup documentation',
    ],
    features: [
      { title: 'Security Dashboard', description: 'Monitor and run security scans directly from the admin panel' },
      { title: 'Push Sanitization', description: 'Git hooks that scan for secrets, PII, and sensitive data before push' },
      { title: 'Tool Status', description: 'Real-time status of installed security tools (Semgrep, Gitleaks, Trivy, etc.)' },
      { title: 'Scan Types', description: 'Security, Quality Gate, Performance, Dependencies, and System Health scans' },
      { title: 'Lifecycle API', description: 'REST API endpoints for tool status, scans, and reports at /api/lifecycle/*' },
      { title: 'Quick Commands', description: 'Reference panel with lifecycle agent CLI commands' },
    ],
  },
  {
    version: '2.8.0',
    date: '2026-01-11',
    type: 'minor',
    title: 'Memory Banks, Plan Mode & Embedded Browser',
    highlights: [
      'Memory Banks system with layered context persistence (Session/Project/Global)',
      'Plan Mode Visualization with Mermaid flowchart diagrams',
      'Embedded Browser for agent UI inspection and debugging',
      '7 memory types: Fact, Instruction, Context, Decision, Learning, Todo, Warning',
      'Step-by-step plan execution with status tracking',
      'Browser console logs, network logs, and screenshot history',
    ],
    features: [
      { title: 'Memory Banks', description: 'Layered context persistence with session, project, and global scopes' },
      { title: 'Memory Types', description: 'Categorize memories as Facts, Instructions, Context, Decisions, Learnings, Todos, or Warnings' },
      { title: 'Context Aggregation', description: 'Aggregate all relevant memories for AI context with importance weighting' },
      { title: 'Plan Visualization', description: 'Mermaid flowchart diagrams showing plan steps and dependencies' },
      { title: 'Step Execution', description: 'Track plan progress with step status: Pending, In Progress, Completed, Failed, Skipped, Blocked' },
      { title: 'Embedded Browser', description: 'Preview agent-built UIs with viewport presets (Mobile, Tablet, Desktop, Full)' },
      { title: 'Browser DevTools', description: 'Console logs and network request monitoring in embedded browser' },
      { title: 'Screenshot History', description: 'Capture and review browser screenshots over time' },
    ],
  },
  {
    version: '2.7.0',
    date: '2026-01-11',
    type: 'minor',
    title: 'Cloudflare Enhancements & Vite Integration',
    highlights: [
      'Real-time route status indicators (Running/Down/Pending)',
      'Route-to-project linking with orphan detection',
      'Auto-update vite.config.js allowedHosts on publish',
      'Improved route sync accuracy with port status checks',
      'Admin dashboard shows live running state of tunnels',
      'Fixed Express route ordering for mapped/orphaned endpoints',
    ],
    features: [
      { title: 'Live Status', description: 'Routes show green (Running), red (Down), or yellow (Pending) based on actual port status' },
      { title: 'Project Linking', description: 'Routes automatically linked to projects with orphan route detection' },
      { title: 'Vite Integration', description: 'Automatically adds hostname to vite.config.js allowedHosts on publish' },
      { title: 'Port Validation', description: 'Validates if target port is listening before showing route as active' },
    ],
  },
  {
    version: '2.6.0',
    date: '2026-01-11',
    type: 'minor',
    title: 'Cloudflare Tunnels Integration',
    highlights: [
      'Publish projects to Cloudflare Tunnels with one click',
      'Automatic DNS record creation for public hostnames',
      'Cloudflare settings tab in Admin Dashboard',
      'Per-project publish panel in right sidebar',
      'Route status monitoring (ACTIVE/PENDING/ERROR)',
      'Setup script for cloudflared systemd service',
    ],
    features: [
      { title: 'Cloudflare Config', description: 'Configure API token, tunnel ID, zone settings in Admin Dashboard' },
      { title: 'One-Click Publish', description: 'Publish any project to a public subdomain instantly' },
      { title: 'DNS Management', description: 'Automatic CNAME record creation and cleanup' },
      { title: 'Route Management', description: 'View, manage, and delete published routes' },
      { title: 'Service Restart', description: 'Restart cloudflared service directly from the UI' },
      { title: 'Setup Script', description: 'Automated cloudflared installation with systemd autostart' },
    ],
  },
  {
    version: '2.5.0',
    date: '2026-01-11',
    type: 'minor',
    title: 'GitHub Integration',
    highlights: [
      'Full GitHub integration with PAT authentication',
      'Clone repos directly from GitHub to local projects',
      'Push local projects to new GitHub repositories',
      'Real-time sync status indicators in sidebar',
      'GitHub Actions workflow status in dashboard',
      'Per-project GitHub repository linking',
    ],
    features: [
      { title: 'GitHub Auth', description: 'Personal Access Token configuration with secure storage' },
      { title: 'Clone Repos', description: 'Browse all GitHub repos and clone with one click' },
      { title: 'Push to GitHub', description: 'Create new GitHub repos from local projects' },
      { title: 'Sync Status', description: 'Visual indicators showing ahead/behind/synced status' },
      { title: 'Git Operations', description: 'Push, pull, fetch directly from the dashboard' },
      { title: 'CI/CD Status', description: 'GitHub Actions workflow run status display' },
    ],
  },
  {
    version: '2.4.0',
    date: '2026-01-11',
    type: 'minor',
    title: 'Checkpoints, Agent Dashboard & MCP Catalog',
    highlights: [
      'Checkpoint/Snapshot system for saving and restoring project state',
      'Agent Status Dashboard with real-time progress indicators',
      'MCP Server Catalog with 22 pre-configured servers',
      'Project creation directly from the sidebar',
      'Terminal mouse scrolling via tmux integration',
      'CLAUDE.md in-app editor for per-project instructions',
    ],
    features: [
      { title: 'Checkpoints', description: 'Save project state with git info, restore with one click, pin important checkpoints' },
      { title: 'Agent Dashboard', description: 'Visual status panel showing running agents, elapsed time, quick controls' },
      { title: 'MCP Catalog', description: '22 MCP servers across 6 categories with one-click installation' },
      { title: 'Project Creation', description: 'Create new projects directly from the Command Portal interface' },
      { title: 'CLAUDE.md Editor', description: 'Edit per-project AI instructions without leaving the dashboard' },
      { title: 'Terminal Scrolling', description: 'Mouse wheel scrolling in terminal via tmux mouse mode' },
    ],
  },
  {
    version: '2.3.1',
    date: '2026-01-08',
    type: 'patch',
    title: 'Right Sidebar Scroll Fix',
    highlights: [
      'Fixed scroll behavior in right dashboard sidebar',
      'Wheel events now properly captured when hovering over sidebar',
      'Terminal no longer intercepts scroll events meant for sidebar',
    ],
    features: [
      { title: 'Sidebar Scrolling', description: 'Right sidebar now scrolls correctly without affecting terminal' },
      { title: 'Event Handling', description: 'Document-level wheel event capture for reliable scroll isolation' },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-01-08',
    type: 'minor',
    title: 'UI Improvements',
    highlights: [
      'Added project favorites feature',
      'Improved terminal scrollbar visibility',
      'Real-time CPU monitoring with delta calculation',
      'Updated documentation',
    ],
    features: [
      { title: 'Project Favorites', description: 'Star projects to pin them at the top of the sidebar' },
      { title: 'Terminal Scrollbar', description: 'Visible green scrollbar for easier navigation' },
      { title: 'CPU Monitoring', description: 'Accurate real-time CPU usage with delta-based calculation' },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-01-07',
    type: 'minor',
    title: 'Theme System Fix',
    highlights: [
      'All 11 themes now fully functional',
      'Fixed theme switching and persistence',
      'Added Ocean and Sepia themes',
      'Complete CSS variable definitions for all themes',
    ],
    features: [
      { title: 'Theme Persistence', description: 'Themes now properly save and apply on reload' },
      { title: 'New Themes', description: 'Added Ocean (deep blue) and Sepia (warm brown) themes' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-01-06',
    type: 'major',
    title: 'Command Portal v2.0',
    highlights: [
      'Complete UI overhaul with new theme system',
      'Session folders and tagging',
      'Prompt library with variables',
      'AI-powered features integration',
      'Collaboration tools (sharing, comments)',
      'Resource monitoring dashboard',
      'Developer tools (API tester, DB browser)',
    ],
    features: [
      { title: 'Session Management', description: 'Folders, tags, search, and templates' },
      { title: 'AI Integration', description: 'Prompts, personas, code explanation' },
      { title: 'Collaboration', description: 'Session sharing, comments, handoffs' },
      { title: 'Monitoring', description: 'Resource graphs, alerts, uptime tracking' },
      { title: 'Dev Tools', description: 'Port resolver, env sync, API tester' },
    ]
  },
  {
    version: '1.5.0',
    date: '2026-01-01',
    type: 'minor',
    title: 'Enhanced Terminal',
    highlights: [
      'Improved terminal performance',
      'Better scrollback buffer handling',
      'Session reconnection improvements'
    ]
  },
  {
    version: '1.4.0',
    date: '2025-12-15',
    type: 'minor',
    title: 'Docker Dashboard',
    highlights: [
      'Container lifecycle management',
      'Real-time logs streaming',
      'Image management'
    ]
  }
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
          <span className="text-muted">Command Portal v{CHANGELOG_ENTRIES[0]?.version}</span>
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
