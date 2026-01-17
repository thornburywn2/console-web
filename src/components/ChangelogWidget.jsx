/**
 * Changelog Widget Component
 * What's new display for updates and features
 */

import { useState, useEffect, useCallback } from 'react';

const CHANGELOG_ENTRIES = [
  {
    version: '1.0.9',
    date: '2026-01-17',
    type: 'major',
    title: 'Full Observability Stack',
    highlights: [
      'OpenTelemetry distributed tracing with Jaeger integration',
      'Loki log aggregation with Promtail collectors',
      'Grafana dashboard and AlertManager rules for Prometheus',
      'Complete production observability infrastructure',
    ],
    features: [
      { title: 'Distributed Tracing', description: 'OpenTelemetry auto-instrumentation for HTTP, Express, PostgreSQL with Jaeger export' },
      { title: 'Log Aggregation', description: 'Structured JSON logs collected by Promtail and shipped to Loki for centralized querying' },
      { title: 'Grafana Dashboard', description: '9 pre-built panels: request rate, p95 latency, error rate, WebSocket connections, memory usage' },
      { title: 'AlertManager Rules', description: '9 production alerts: high error rate, slow queries, service down, memory warnings' },
      { title: 'Docker Stack', description: 'One-command deployment of Jaeger, Loki, and Promtail via docker compose' },
      { title: 'Trace Context', description: 'X-Trace-Id header in responses for request correlation across services' },
    ],
  },
  {
    version: '1.0.8',
    date: '2026-01-17',
    type: 'major',
    title: 'Production Hardening & Validation',
    highlights: [
      'Zod validation schemas applied across all 41+ route files',
      'Error sanitization with sendSafeError() prevents information leakage',
      'Sentry error tracking integration for production monitoring',
      'Connection draining for graceful shutdown during deployments',
    ],
    features: [
      { title: 'Input Validation', description: 'All API routes now use Zod schemas via validateBody() middleware for strict input validation' },
      { title: 'Error Sanitization', description: 'sendSafeError() returns sanitized messages with reference IDs, logging full errors internally' },
      { title: 'Sentry Integration', description: 'Full Sentry setup with request handlers, error tracking, and frontend error boundaries' },
      { title: 'Graceful Shutdown', description: 'Connection draining on SIGTERM with 30s timeout for zero-downtime deployments' },
      { title: 'Prisma Metrics', description: 'Database query tracking via Prometheus middleware for performance monitoring' },
      { title: 'Doc Consolidation', description: 'Moved old research docs to archive/, removed duplicates, cleaner project structure' },
    ],
  },
  {
    version: '1.0.7',
    date: '2026-01-17',
    type: 'security',
    title: 'Security Hardening',
    highlights: [
      'Fixed CVE-2023-45853 (zlib Integer Overflow) in Dockerfile with multi-stage build',
      'Path traversal prevention with new centralized security utilities',
      'Protected 10+ endpoints against path traversal attacks (CWE-23)',
      'Security event logging for blocked traversal attempts',
    ],
    features: [
      { title: 'Multi-stage Docker Build', description: 'Smaller attack surface with explicit security updates and build/runtime separation' },
      { title: 'Path Security Utils', description: 'New /server/utils/pathSecurity.js with isValidProjectName(), safePath(), validateAndResolvePath()' },
      { title: 'Protected Endpoints', description: 'Sessions, CLAUDE.md, settings, restart, delete, rename endpoints now validate paths' },
      { title: 'Route Protection', description: 'Files, logs, diff, and env routes now use path validation middleware' },
      { title: 'Security Logging', description: 'All blocked path traversal attempts logged with IP, path, and event type' },
    ],
  },
  {
    version: '1.0.6',
    date: '2026-01-17',
    type: 'major',
    title: 'Admin Dashboard Modularization',
    highlights: [
      'Refactored 5,544-line AdminDashboard.jsx into 35+ modular components',
      'New navigation: PROJECTS | SETTINGS | AUTOMATION | SERVER | SECURITY | HISTORY',
      'SETTINGS promoted to main tab (was nested 2 levels deep)',
      'New AUTOMATION tab combines AGENTS + MCP + SCHEDULED',
    ],
    features: [
      { title: 'Component Extraction', description: 'AdminDashboard reduced from 5,544 to 915 lines (83% reduction)' },
      { title: 'Tab Restructure', description: 'INFRASTRUCTURE renamed to SERVER, SETTINGS promoted, AUTOMATION created' },
      { title: 'Shared Components', description: 'New TabButton, SubTabBar, TabContainer, ErrorBoundary components' },
      { title: 'Error Boundaries', description: 'Each tab wrapped in error boundary for fault tolerance' },
      { title: 'API Endpoint Fixes', description: 'Fixed HistoryTab, ScheduledPane, Fail2banPane, ScanConfigPane endpoints' },
      { title: 'Organized Structure', description: 'New src/components/admin/ folder with tabs/, shared/, and constants' },
    ],
  },
  {
    version: '1.0.5',
    date: '2026-01-16',
    type: 'minor',
    title: 'Production Hardening & Observability',
    highlights: [
      'Added comprehensive security hardening with rate limiting and helmet headers',
      'Prometheus metrics export at /metrics endpoint for Grafana integration',
      'Backend testing infrastructure with 111 passing tests',
      'Zod validation schemas for all API endpoints',
    ],
    features: [
      { title: 'Security Headers', description: 'helmet middleware adds CSP, HSTS, X-Frame-Options, and other security headers' },
      { title: 'Rate Limiting', description: 'General (1000/15min), strict (10/min), and auth (10/15min) rate limiters protect all endpoints' },
      { title: 'Prometheus Metrics', description: 'HTTP duration histograms, request counters, WebSocket gauges, DB query metrics at /metrics' },
      { title: 'Slow Query Logging', description: 'Prisma queries exceeding 100ms are automatically logged with query details' },
      { title: 'Input Validation', description: '25+ Zod schemas validate all API input with detailed error messages' },
      { title: 'Backend Tests', description: '111 tests covering validation schemas, middleware, and metrics service' },
      { title: 'Watcher Alerts', description: 'PM2 watcher now integrates with AlertRule database for memory and service alerts' },
    ],
  },
  {
    version: '1.0.4',
    date: '2026-01-16',
    type: 'patch',
    title: 'Paste Fix & Structured Logging',
    highlights: [
      'Fixed double paste bug - content no longer duplicates when pasting',
      'Implemented structured pino logging throughout server codebase',
      'Replaced console.log/error/warn with JSON-formatted structured logs',
    ],
    features: [
      { title: 'Paste Deduplication', description: 'Added input deduplication to prevent paste events from firing twice within 100ms window' },
      { title: 'Structured Logging', description: 'Server now uses pino for JSON-formatted logs with context fields for better debugging' },
      { title: 'Log Categories', description: 'Separate loggers for server, session, socket, docker, and git operations' },
    ],
  },
  {
    version: '1.0.3',
    date: '2026-01-16',
    type: 'patch',
    title: 'Terminal Session Fixes & Project Management',
    highlights: [
      'Terminal buffer caching - scrollback preserved when switching sessions',
      'Fixed terminal reconnection showing blank screen on session switch',
      'Cloudflare widget now properly updates when selecting different projects',
      'Project tagging, priority, notes, and clone functionality',
      'Skip permissions toggle per-project for Claude sessions',
      'Enhanced context menu with multiple views and settings',
    ],
    features: [
      { title: 'Buffer Caching', description: 'Terminal scrollback is saved when switching projects and restored when returning' },
      { title: 'Session Reconnect', description: 'Fixed blank terminal on session switch with proper SIGWINCH refresh' },
      { title: 'Project Tags', description: 'Color-coded tags (Active, Archived, Infrastructure, Prototype, Production, WIP) with up to 3 visible in sidebar' },
      { title: 'Project Priority', description: 'Set High/Medium/Low priority with color indicators in context menu header' },
      { title: 'Project Notes', description: 'Add persistent notes to projects with title, content, pin to top, and delete' },
      { title: 'Clone Project', description: 'Duplicate any project with option to copy tags, notes, and settings (git history removed)' },
      { title: 'Skip Permissions', description: 'Per-project toggle to start Claude with --dangerously-skip-permissions flag' },
      { title: 'Cloudflare Widget', description: 'Fixed widget not updating when switching between projects' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-01-15',
    type: 'patch',
    title: 'Shpool Migration & Terminal Simplification',
    highlights: [
      'Migrated from tmux to shpool for lighter session persistence',
      'Removed custom right-click menu - browser default now works',
      'Native OSC 52 clipboard support (no special config needed)',
      'Simplified terminal codebase by removing 147 lines',
    ],
    features: [
      { title: 'Shpool Sessions', description: 'Replaced tmux with shpool for cleaner session persistence with raw byte passthrough' },
      { title: 'Session Naming', description: 'Changed session prefix from cp-* to sp-* for shpool sessions' },
      { title: 'Native Right-Click', description: 'Removed custom context menu - browser default now works natively' },
      { title: 'Auto-Reconnect', description: 'Sessions auto-create if none exists during reconnect' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-14',
    type: 'major',
    title: 'Console.web v1.0 - Complete Management Interface',
    highlights: [
      'Complete web-based management interface for Claude Code projects',
      'Browser-based terminals with session persistence - sessions survive disconnects',
      'Real-time system monitoring with 2-second CPU refresh across all cores',
      'Full infrastructure management: Docker, systemd, firewall, users, SSH',
      'AI automation with 13+ agents, MCP servers, and voice commands',
      'Comprehensive developer tools: API tester, database browser, Git workflow',
      'One-click system updates and first-time setup wizard',
      'GitHub integration with clone, push, and sync status',
      'Cloudflare Tunnels for one-click public deployment',
      'Widget-based customizable sidebars with drag-and-drop',
    ],
    features: [
      // Terminal & Sessions
      { title: 'Terminal Sessions', description: 'xterm.js terminals with session persistence, auto-reconnect, folders, tags, notes, templates, and team handoffs' },
      { title: 'Clipboard Support', description: 'Highlight-to-copy, Ctrl+Shift+C/V shortcuts, and OSC 52 integration' },
      { title: 'Session Sharing', description: 'Share sessions via links, add comments, activity feed, and team handoffs' },

      // Project Management
      { title: 'Project Browser', description: 'Browse projects with favorites, completion metrics, search, and CLAUDE.md editor' },
      { title: 'Project Templates', description: '6 template types: Full-Stack, Frontend, Desktop (Tauri), CLI, Infrastructure, Mobile (Flutter)' },
      { title: 'Compliance Checker', description: 'Weighted scoring for CI/CD, security, hooks, TypeScript strict, ESLint, Prettier, CLAUDE.md' },

      // System & Infrastructure
      { title: 'System Monitoring', description: 'Real-time CPU/memory/disk stats with delta-based CPU calculation' },
      { title: 'Docker Management', description: 'Full container lifecycle: start, stop, restart, logs, images, volumes' },
      { title: 'UFW Firewall', description: 'Enable/disable firewall, manage rules, quick actions for SSH/HTTP/HTTPS' },
      { title: 'Security Dashboard', description: 'Monitor SSH sessions, failed logins, fail2ban status, and security scanning' },

      // AI & Automation
      { title: 'Agent Marketplace', description: '13+ pre-built agents: ESLint, Prettier, Security Scanner, Test Runner, and more' },
      { title: 'MCP Server Catalog', description: '22+ MCP servers across 6 categories with one-click installation' },
      { title: 'Voice Commands', description: 'Browser-native speech recognition for voice commands in terminals' },

      // Integrations
      { title: 'Self-Update', description: 'One-click updates from Settings with real-time progress streaming' },
      { title: 'GitHub Integration', description: 'Clone repos, push changes, view sync status and workflow results' },
      { title: 'Cloudflare Tunnels', description: 'One-click publish with automatic DNS and route management' },

      // UI/UX
      { title: 'Setup Wizard', description: '5-step onboarding with feature selection, widget presets, and theme preview' },
      { title: 'Theme System', description: '11 glassmorphism themes with full CSS variable customization' },
      { title: 'Widget Dashboard', description: 'Drag-and-drop customizable widgets with vertical height snapping' },
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
