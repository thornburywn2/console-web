/**
 * Changelog Entries Data
 */

export const CHANGELOG_ENTRIES = [
  {
    version: '1.0.11',
    date: '2026-01-17',
    type: 'major',
    title: 'Bundle Optimization & Component Refactoring',
    highlights: [
      'Reduced initial bundle size by 87% (1,792KB → 226KB)',
      'Implemented React.lazy() code-splitting for 20+ components',
      'Created modular settings pane components architecture',
      'Fixed Tailwind safelist warning on production builds',
    ],
    features: [
      { title: 'Vendor Chunk Splitting', description: 'Separate chunks for React, Socket.IO, xterm, Sentry, and markdown with optimal caching' },
      { title: 'Lazy-Loaded Modals', description: '20+ modal and admin components now load on-demand, reducing initial page load' },
      { title: 'Settings Module', description: 'New src/components/settings/ directory with GeneralPane, AppearancePane, ShortcutsPane, PersonasPane components' },
      { title: 'Build Optimization', description: 'Vite manualChunks config for intelligent bundle splitting and caching' },
      { title: 'Tailwind Cleanup', description: 'Removed broken safelist pattern that caused build warnings' },
      { title: 'App.jsx Refactor', description: 'Converted 20+ static imports to React.lazy() for dynamic loading' },
    ],
  },
  {
    version: '1.0.10',
    date: '2026-01-17',
    type: 'minor',
    title: 'Infrastructure Reliability & Version Sync',
    highlights: [
      'Robust auto-start scripts for sovereign-stack services',
      'Fixed version display consistency across all UI components',
      'Improved Docker container state handling after reboot',
      'Enhanced system boot reliability for auth and proxy services',
    ],
    features: [
      { title: 'Startup Scripts', description: 'New startup.sh with Docker cleanup, health checks, and graceful recovery for sovereign-stack' },
      { title: 'Shutdown Scripts', description: 'Graceful shutdown.sh with proper timeout handling for container orchestration' },
      { title: 'Status Monitoring', description: 'New status.sh script for quick health checks of all services and ports' },
      { title: 'Systemd Service', description: 'Updated sovereign-stack.service with robust error handling and restart policies' },
      { title: 'Version Consistency', description: 'Synchronized version display in header, footer, About modal, and changelog' },
      { title: 'Boot Recovery', description: 'Automatic cleanup of orphaned Docker containers and corrupted state on startup' },
    ],
  },
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
