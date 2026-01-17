# Console.web - Changelog & Documentation

All notable changes to Console.web (console-web) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## About Console.web

**Console.web** is a comprehensive web-based management interface for development infrastructure. It brings together terminal access, system monitoring, container management, AI automation, and DevOps tooling into a single, unified dashboard.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Console.web v1.0.11                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Terminal   │  │   Admin     │  │  Projects   │  │  Sidebars   │        │
│  │  (xterm.js) │  │  Dashboard  │  │   Browser   │  │  (Widgets)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         └─────────────────┴─────────────────┴─────────────────┘              │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                       Socket.IO + Express API                      │      │
│  ├───────────┬───────────┬───────────┬───────────┬───────────────────┤      │
│  │  Sessions │  Docker   │    Git    │   Admin   │  41+ Route Files  │      │
│  └───────────┴───────────┴───────────┴───────────┴───────────────────┘      │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                        Observability Stack                         │      │
│  ├───────────┬───────────┬───────────┬───────────┬───────────────────┤      │
│  │  Jaeger   │   Loki    │ Promtail  │ Prometheus│     Grafana       │      │
│  │ (Tracing) │  (Logs)   │(Collector)│ (Metrics) │   (Dashboards)    │      │
│  └───────────┴───────────┴───────────┴───────────┴───────────────────┘      │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                         Infrastructure                             │      │
│  ├───────────┬───────────┬───────────┬───────────┬───────────────────┤      │
│  │ PostgreSQL│  Shpool   │   Docker  │  Systemd  │     Cloudflare    │      │
│  │  (Prisma) │(Sessions) │ (Dockerode│ (Services)│     (Tunnels)     │      │
│  └───────────┴───────────┴───────────┴───────────┴───────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Who Is This For?

| Audience | Use Case |
|----------|----------|
| **Solo Developers** | Manage multiple projects with persistent terminals, Git workflow, and system monitoring from anywhere |
| **Small Teams** | Share terminal sessions, leave comments, hand off work, and track activity across projects |
| **DevOps Engineers** | Monitor containers, services, firewall, and security from a single pane of glass |
| **AI-First Developers** | Run Claude Code sessions, configure MCP servers, and automate with custom agents |
| **Self-Hosters** | Full Sovereign Stack integration with Authentik SSO and Cloudflare Tunnels |

### Core Capabilities

#### Terminal & Sessions
- **Browser-based terminals** via xterm.js with full ANSI color and mouse support
- **Shpool persistence** - sessions survive disconnects, browser crashes, and server restarts
- **Multi-session management** with folders, tags, notes, templates, and search
- **Clipboard integration** - highlight-to-copy, Ctrl+Shift+C/V, OSC 52 support
- **Session sharing** with comments, activity feed, and team handoffs

#### Project Management
- **Project browser** with favorites, completion metrics, and search
- **CLAUDE.md editor** with syntax highlighting and validation
- **Compliance scoring** for CI/CD, security, TypeScript, ESLint, Prettier
- **6 project templates**: Full-Stack, Frontend, Desktop, CLI, Infrastructure, Mobile

#### System Administration
- **Real-time monitoring** - CPU, memory, disk with 2-second refresh
- **Docker management** - containers, images, volumes, networks, logs
- **Systemd services** - status, start, stop, restart, logs
- **UFW firewall** - rules, quick actions, port sync from projects
- **Security dashboard** - SSH sessions, failed logins, Fail2ban, scanning

#### Observability (v1.0.9)
- **Distributed tracing** - OpenTelemetry with Jaeger for request correlation
- **Log aggregation** - Loki + Promtail for centralized log querying
- **Prometheus metrics** - HTTP duration, request counts, WebSocket gauges
- **Grafana dashboards** - 9 pre-built panels for key metrics
- **AlertManager rules** - 9 production alerts for errors, latency, availability

#### AI & Automation
- **13+ pre-built agents** - ESLint, Prettier, Security Scanner, Test Runner, and more
- **22+ MCP servers** across 6 categories with one-click installation
- **Custom agent builder** with triggers, conditions, and actions
- **Voice commands** - browser-native speech recognition
- **AI token tracking** with cost estimates

#### Integrations
- **Authentik SSO** - Enterprise authentication via proxy headers
- **GitHub** - Clone, push, sync status, workflow results
- **Cloudflare Tunnels** - One-click public deployment with DNS
- **Sentry** - Error tracking with request correlation

### Production Features

| Feature | Description |
|---------|-------------|
| **Input Validation** | Zod schemas on all 41+ routes via `validateBody()` middleware |
| **Error Sanitization** | `sendSafeError()` returns reference IDs, logs full errors internally |
| **Rate Limiting** | General (1000/15min), strict (10/min), auth (10/15min) limiters |
| **Security Headers** | Helmet with CSP, HSTS, X-Frame-Options, XSS protection |
| **Graceful Shutdown** | Connection draining on SIGTERM with 30s timeout |
| **Path Traversal Protection** | Centralized validation preventing CWE-23 attacks |

### Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/console-web
cd console-web && npm install

# Configure
cp .env.example .env
# Edit .env with your DATABASE_URL and settings

# Start development
npm run dev

# Start observability stack (optional)
cd monitoring && docker compose up -d

# Production
npm run build && npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5275 | API server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | Jaeger/OTLP collector (enables tracing) |
| `LOG_FILE` | - | JSON log file path (enables file logging) |
| `SENTRY_DSN` | - | Sentry error tracking (enables Sentry) |
| `AUTH_ENABLED` | true | Enable Authentik SSO |

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, xterm.js |
| **Backend** | Node.js, Express, Socket.IO, Prisma 7 |
| **Database** | PostgreSQL |
| **Sessions** | Shpool (session persistence) |
| **Containers** | Dockerode |
| **Observability** | OpenTelemetry, Jaeger, Loki, Prometheus, Grafana |
| **Security** | Helmet, express-rate-limit, Zod, Sentry |

---

## [1.0.11] - 2026-01-17

### Bundle Optimization & Component Refactoring

Major performance improvements through bundle optimization and component modularization.

#### Bundle Size Reduction (-87%)
- **Before**: 1,792 KB main bundle (462 KB gzipped)
- **After**: 226 KB main bundle (60 KB gzipped)
- **Initial load**: ~121 KB gzipped (index + react + socket + icons)

#### Code Splitting with React.lazy()
- **20+ lazy-loaded components**: Modals, admin panels, and tools load on-demand
- **Vendor chunks**: Separate bundles for React, Socket.IO, xterm, Sentry, markdown
- **28 total chunks**: Optimal caching and parallel loading

#### New Settings Module Architecture
- **src/components/settings/**: New modular directory structure
- **GeneralPane.jsx**: General settings extracted (100 lines)
- **AppearancePane.jsx**: Theme picker extracted (100 lines)
- **ShortcutsPane.jsx**: Keyboard shortcuts extracted (100 lines)
- **PersonasPane.jsx**: AI personas extracted (165 lines)
- **IntegrationsPane.jsx**: GitHub/Cloudflare settings
- **AuthPane.jsx**: Authentication settings extracted
- **constants.js**: Shared category constants
- **CategoryIcon.jsx**: Reusable icon component

#### Vite Build Optimization
- **manualChunks config**: Intelligent vendor splitting
- **Sourcemap disabled in production**: Reduced build size
- **Fixed Tailwind safelist warning**: Removed broken pattern

#### App.jsx Refactoring
- **Converted 20+ static imports to React.lazy()**
- **Added LoadingFallback component for Suspense**
- **Separated core vs lazy-loaded components**

---

## [1.0.10] - 2026-01-17

### Infrastructure Reliability & Version Sync

Robust auto-start infrastructure for sovereign-stack services and version consistency fixes.

#### Startup Scripts (sovereign-stack)
- **startup.sh**: Robust initialization with Docker cleanup, orphan removal, and health checks
- **shutdown.sh**: Graceful shutdown with proper timeout handling for container orchestration
- **status.sh**: Quick health check script for all services, ports, and system status
- **install-service.sh**: One-command systemd service installation with proper permissions

#### Systemd Service Improvements
- **Robust restart handling**: New service file with proper error handling and restart policies
- **Log file creation**: Automatic log file with correct ownership for startup diagnostics
- **Health check waiting**: Startup script waits for Authentik to be healthy before completing
- **Orphan cleanup**: Automatic removal of dead/orphaned containers on boot

#### Version Consistency
- **AboutModal.jsx**: Fixed version display (was showing v1.2.0, now v1.0.10)
- **App.jsx header**: Updated version badge to v1.0.10
- **AdminDashboard.jsx footer**: Updated footer version to v1.0.10
- **ChangelogWidget.jsx**: Added v1.0.10 entry with full feature list

#### Boot Recovery
- **Docker state cleanup**: Handles corrupted container references after unclean shutdown
- **Network verification**: Ensures sovereign-stack network exists before starting services
- **Dependency ordering**: Proper wait for database and redis before starting Authentik

---

## [1.0.9] - 2026-01-17

### Full Observability Stack

Complete production observability infrastructure with distributed tracing, centralized logging, and alerting.

#### Distributed Tracing (OpenTelemetry)
- **Auto-instrumentation**: HTTP requests, Express routes, PostgreSQL queries automatically traced
- **Jaeger integration**: Traces exported to Jaeger (OTLP HTTP on port 4318)
- **Trace context propagation**: X-Trace-Id header in responses for request correlation
- **Service identification**: Traces tagged with service name, version, and environment

#### Log Aggregation (Loki + Promtail)
- **Structured JSON logging**: Pino logs with component, level, requestId, and timing
- **Promtail collection**: Automatic log collection from app and PM2 logs
- **Loki storage**: Centralized log querying with label-based filtering
- **30-day retention**: Automatic log compaction and retention management

#### Monitoring Infrastructure
- **Grafana Dashboard**: 9 pre-built panels for request rate, latency, errors, WebSocket connections, memory
- **AlertManager Rules**: 9 production alerts for high error rate, slow queries, service down, memory warnings
- **Docker Stack**: One-command deployment of Jaeger, Loki, Promtail via `docker compose up -d`

#### Configuration
- **Environment variables**: `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_FILE`, `LOKI_URL`
- **Graceful degradation**: Tracing and logging disabled gracefully when not configured
- **Documentation**: Updated monitoring README with setup instructions

---

## [1.0.8] - 2026-01-17

### Production Hardening & Validation

Comprehensive production hardening with input validation, error sanitization, and monitoring improvements.

#### Input Validation
- **Zod validation across all routes**: Applied `validateBody()` middleware with Zod schemas to all 41+ route files
- **New validation schemas**: Added schemas for agents, templates, alerts, prompts, snippets, dependencies, and more
- **Strict type checking**: All API inputs now validated with proper error messages

#### Error Sanitization
- **sendSafeError utility**: New error response helper that logs full errors internally but returns sanitized messages to clients
- **Reference IDs**: Each error response includes a unique reference ID for support without exposing sensitive details
- **Information leakage prevention**: Stack traces, file paths, and internal details no longer exposed in API responses

#### Monitoring & Observability
- **Sentry integration**: Full error tracking with request handlers, tracing, and error handlers
- **Prisma metrics middleware**: Database query tracking via Prometheus for performance monitoring
- **Connection draining**: Graceful shutdown on SIGTERM with 30-second timeout for zero-downtime deployments

#### Documentation
- **Markdown consolidation**: Moved old research docs to `docs/archive/`, removed duplicates
- **Cleaner structure**: Root-level docs reduced from 8 to 6 essential files
- **Archive preserved**: Historical research and completed plans available in `docs/archive/`

---

## [1.0.7] - 2026-01-17

### Security Hardening

Critical security fixes addressing vulnerabilities identified by Snyk security scanning.

#### Dockerfile Security (CVE-2023-45853)
- **Multi-stage build**: Implemented two-stage Docker build to reduce attack surface
- **Security updates**: Added explicit `apt-get upgrade` to patch zlib Integer Overflow vulnerability
- **Smaller image**: Production image only contains runtime dependencies
- **Better caching**: Build dependencies cached in builder stage

#### Path Traversal Prevention (CWE-23)
- **New security utilities**: Created `/server/utils/pathSecurity.js` with centralized path validation
- **`isValidProjectName()`**: Validates project names against strict allowlist (alphanumeric, hyphens, underscores)
- **`safePath()`**: Resolves paths and ensures they stay within allowed base directories
- **`validateAndResolvePath()`**: Validates both absolute and relative paths
- **`validateProjectNameMiddleware`**: Express middleware for route protection
- **`validatePathMiddleware`**: Express middleware to check path parameters

#### Protected Endpoints (server/index.js)
- `/api/admin/sessions/:projectName` - Session listing
- `/api/admin/claude-md/:projectName` - CLAUDE.md read/write
- `/api/admin/claude-md/:projectName/port` - Port configuration
- `/api/projects/:projectName/settings` - Project settings
- `/api/projects/:projectName/restart` - Project restart
- `/api/admin/projects/:projectName` - Project deletion
- `/api/projects/:projectName/rename` - Project renaming

#### Protected Routes (server/routes/)
- `files.js` - File browser, content, logs, and diff endpoints
- `devtools.js` - Environment file listing, reading, and saving

#### Security Logging
- All blocked path traversal attempts are logged via `logSecurityEvent()`
- Security events include IP address, attempted path, and event type

---

## [1.0.6] - 2026-01-17

### Admin Dashboard Modularization

This major release refactors the 5,544-line AdminDashboard.jsx monolith into 35+ modular components with improved navigation.

### Navigation Changes

- **SETTINGS promoted**: Now a main tab (was nested 2 levels deep under SYSTEM)
- **AUTOMATION created**: New tab containing AGENTS + MCP (both with marketplace interfaces)
- **INFRASTRUCTURE renamed**: Now called SERVER for clarity
- **SCHEDULED moved**: Cron jobs/timers moved from AUTOMATION to SERVER tab (11 sub-tabs total)
- **Cleaner hierarchy**: Maximum 2 levels of nesting (main tab → sub-tab)

### New Navigation Structure

```
Before: PROJECTS | SYSTEM (13 sub-tabs) | AGENTS | MCP | SECURITY | HISTORY
After:  PROJECTS | SETTINGS | AUTOMATION | SERVER | SECURITY | HISTORY

AUTOMATION: AGENTS | MCP (marketplace-style interfaces)
SERVER: OVERVIEW | SERVICES | DOCKER | STACK | PACKAGES | LOGS | PROCESSES | NETWORK | SCHEDULED | AUTHENTIK | USERS
```

### Technical Changes

#### Component Extraction
- **AdminDashboard.jsx**: Reduced from 5,544 to 915 lines (83% reduction)
- **35+ new components**: Each tab and pane extracted to separate files
- **New folder structure**: `src/components/admin/` with organized subdirectories

#### New Components
- `admin/constants.js` - Tab enums and legacy migration helpers
- `admin/shared/` - TabButton, SubTabBar, TabContainer, ErrorBoundary
- `admin/tabs/SettingsTab/` - 6 pane components (General, Appearance, Shortcuts, etc.)
- `admin/tabs/AutomationTab/` - 2 pane components (Agents, MCP)
- `admin/tabs/ServerTab/` - 10 pane components (Overview, Services, Docker, etc.)
- `admin/tabs/SecurityTab/` - 4 pane components (Scans, Firewall, Fail2ban, ScanConfig)
- `admin/tabs/ProjectsTab.jsx` - Project list with completion metrics
- `admin/tabs/HistoryTab.jsx` - Session history browser

### Bug Fixes

#### API Endpoint Fixes
- **HistoryTab**: Fixed API endpoint (was `/api/sessions/history`, now `/api/admin/history`)
- **ScheduledPane**: Fixed cron/timer endpoints to use `/api/infra/scheduled/*`
- **Fail2banPane**: Fixed endpoint to `/api/infra/security/fail2ban/status`
- **ScanConfigPane**: Replaced non-existent endpoints with placeholder UI
- **ProjectsTab**: Fixed API response handling (was expecting `data.projects`, now `data` directly)
- **LogsPane**: Fixed to use `/api/server/logs` endpoint (was using non-existent `/api/infra/logs`)

#### API Response Structure Fixes
- **OverviewPane**: Fixed system info display - changed `cpu.cores` to `cpu.count`, `loadAverage` to `loadAvg`, and system properties to use `system.*` path
- **ServicesPane**: Fixed API response handling - services API returns array directly, not `{services: []}`
- **DockerPane**: Fixed all API response handling - containers, images, volumes, networks APIs return arrays directly
- **NetworkPane**: Fixed interface display to match `ip -j addr show` response format (state vs operstate, addresses array)
- **ProcessesPane**: Fixed field names - `state` to `stat`, `mem` to `memory`, RSS formatting for KB to bytes conversion

#### Rate Limiting Fixes
- **DockerPane**: Increased polling interval from 10s to 30s to avoid 429 errors
- **ServicesPane**: Increased polling interval from 5s to 15s to avoid rate limiting

#### Process Monitoring
- **ProcessesPane**: Reduced polling interval from 30s to 10s for more responsive memory/CPU monitoring

---

## [1.0.5] - 2026-01-16

### Production Hardening & Observability

This release adds comprehensive security hardening, observability, and testing infrastructure.

### Security

- **Helmet middleware**: CSP, HSTS, X-Frame-Options, and other security headers
- **Rate limiting**: General (1000/15min), strict (10/min), and auth (10/15min) rate limiters
- **Input validation**: 25+ Zod schemas validate all API input

### Observability

- **Prometheus metrics**: HTTP duration histograms, request counters, WebSocket gauges at `/metrics`
- **Slow query logging**: Prisma queries exceeding 100ms are automatically logged
- **Watcher alerts**: PM2 watcher integrates with AlertRule database for memory/service alerts

### Testing

- **Backend tests**: 111 passing tests covering validation schemas, middleware, and metrics
- **Test infrastructure**: Vitest configuration with coverage reporting

---

## [1.0.4] - 2026-01-16

### Paste Fix & Structured Logging

This release fixes the double paste bug and implements structured logging throughout the server.

### Bug Fixes

#### Paste Deduplication
- **Fixed double paste**: Content no longer duplicates when pasting in terminal
- **Deduplication window**: 100ms window prevents duplicate paste events from firing
- **Multi-character detection**: Only deduplicates paste-like input (2+ characters)

### Improvements

#### Structured Logging
- **Pino integration**: Replaced console.log/error/warn with pino structured logging
- **JSON-formatted logs**: All server logs now output structured JSON for better parsing
- **Context fields**: Logs include relevant context (projectPath, sessionId, error details)
- **Child loggers**: Separate loggers for server, session, socket, docker, and git operations
- **Log levels**: Proper use of info, warn, error, and debug levels

### Technical Details

- Updated `server/index.js` with structured logging (~70+ replacements)
- Updated `server/services/` with structured logging
- Updated `server/middleware/` with structured logging
- Added paste deduplication to `Terminal.jsx` onData handler

---

## [1.0.3] - 2026-01-16

### Terminal Session Fixes & Project Management

This release fixes terminal session switching issues and adds project organization features.

### Bug Fixes

#### Terminal Buffer Caching
- **Scrollback preserved**: Terminal buffer is saved when switching projects and restored when returning
- **SerializeAddon integration**: Uses xterm's serialize addon for reliable buffer caching
- **Memory-efficient**: Buffers stored per-project in module-level cache

#### Terminal Reconnection
- **Fixed blank screen**: Sessions no longer show black screen when switching between active sessions
- **SIGWINCH refresh**: Proper resize signal sent to trigger terminal redraw on reconnect
- **Immediate dimensions**: Client sends terminal size immediately on connection

#### Cloudflare Widget
- **Fixed stale data**: Widget now properly updates when selecting different projects
- **Path-based dependency**: Uses project path instead of name for reliable reactivity

### New Features

#### Project Tags
- **Color-coded tags**: 6 default tags (Active, Archived, Infrastructure, Prototype, Production, WIP)
- **Sidebar visibility**: Up to 3 tag colors shown next to each project
- **Tag management**: Create custom tags with 10 color options

#### Project Priority
- **Priority levels**: None, High (red), Medium (orange), Low (green)
- **Visual indicators**: Priority badge shown in context menu header

#### Project Notes
- **Persistent notes**: Add notes with optional title and content to any project
- **Pin to top**: Pin important notes for quick access

#### Clone Project
- **One-click cloning**: Duplicate any project to a new directory
- **Copy settings**: Option to copy tags, notes, priority, and skip-permissions setting

#### Session Settings
- **Skip Permissions**: Per-project toggle to start Claude with `--dangerously-skip-permissions`

#### Enhanced Context Menu
- **Wider layout**: Increased from 256px to 320px for better readability
- **Multiple views**: Main menu, Project Info, Notes, and Clone views

### Database Changes
- Added `ProjectNote` model for persistent notes
- Added `ProjectPriority` enum (HIGH, MEDIUM, LOW)
- Added `priority` field to Project model

---

## [1.0.1] - 2026-01-15

### Shpool Migration & Terminal Simplification

This release migrates from tmux to shpool for session persistence and simplifies the terminal interface.

### Changes

#### Terminal Session Backend
- **Migrated from tmux to shpool**: Lighter weight session persistence with raw byte passthrough
- **Session naming**: Changed from `cp-*` to `sp-*` prefix for shpool sessions
- **Native clipboard support**: OSC 52 works natively with shpool (no special configuration needed)
- **Improved reconnection**: Sessions now auto-create if none exists during reconnect

#### Terminal Interface
- **Removed custom right-click menu**: Browser's default context menu now works natively
- **Simplified codebase**: Removed 147 lines of custom context menu handling
- **Kept auto-copy**: Text selection still auto-copies with "Copied!" toast feedback
- **Kept keyboard shortcuts**: Ctrl+Shift+C/V still work for explicit copy/paste

### Benefits
- Cleaner session persistence without terminal multiplexing overhead
- Native scrollback and clipboard support
- Simpler, more maintainable codebase
- Sessions persist across server restarts

---

## [1.0.0] - 2026-01-14

### Initial Stable Release

Console.web v1.0.0 marks the first stable release of our comprehensive web-based management interface for Claude Code projects. This release represents months of development resulting in a complete development infrastructure management solution.

### Highlights

- **114 React components** powering a feature-rich UI
- **51 database models** for comprehensive data persistence
- **40+ API endpoints** covering all management needs
- **11 glassmorphism themes** for personalized appearance
- **22+ MCP servers** in the pre-configured catalog
- **13+ automation agents** in the marketplace

### Core Features

#### Terminal & Session Management
- **Browser-based terminals**: Full xterm.js terminal with 256-color support, vim keybindings, and 10,000-line scrollback
- **Session persistence**: Sessions survive disconnects, browser refreshes, and server restarts
- **Multi-session support**: Run multiple terminals simultaneously with instant switching
- **Session organization**: Hierarchical folders, color-coded tags, markdown notes, and quick-start templates
- **Session handoffs**: Transfer sessions between team members with full context
- **Auto-reconnect**: Automatically reconnect to your last active session on page load

#### Clipboard & Input
- **Highlight-to-Copy**: Select text in terminal and it automatically copies to clipboard
- **Ctrl+Shift+C**: Explicit copy shortcut for selected text
- **Ctrl+Shift+V**: Paste from clipboard into terminal
- **OSC 52 support**: Native clipboard integration with terminal applications

#### Project Management
- **Project browser**: Browse, organize, and favorite projects with fuzzy search
- **Completion metrics**: Visual progress indicators showing project health
- **CLAUDE.md editor**: Edit project configuration directly in the browser
- **Project templates**: Create new projects from 6 standardized templates (fullstack, frontend, desktop, infrastructure, CLI, mobile)
- **Compliance checker**: Verify projects meet quality standards before deployment
- **Git workflow**: Full commit, push, pull, branch management with visual diff viewer

#### System Administration
- **Real-time monitoring**: CPU (delta-calculated across all cores), memory, disk usage with live updates
- **Systemd services**: View and manage all systemd services with status indicators
- **Docker management**: Full CRUD for containers, images, volumes, and networks
- **Process management**: View top 50 processes sorted by resource usage
- **Network diagnostics**: Interface status, connections, ping, DNS lookup tools
- **Log viewer**: Journalctl integration with filtering, search, and real-time streaming

#### Security & Infrastructure
- **UFW firewall**: Enable/disable, view rules, add/remove ports with SSH protection
- **SSH security**: Monitor active sessions, failed login attempts, manage authorized keys
- **Fail2ban monitoring**: View banned IPs, jail status, and ban history
- **Authentik SSO**: Full OAuth2 integration with user/group management
- **Server users**: Create, delete, and manage Linux users and groups
- **Security scanning**: Integration with lifecycle agents for vulnerability detection

#### Developer Tools
- **API tester**: Build and test HTTP requests with full response inspection
- **Database browser**: Explore PostgreSQL tables with query builder
- **File browser**: Navigate project files with syntax-highlighted preview
- **Dependency dashboard**: View npm packages, check for updates, run audit fixes
- **Port resolver**: Manage and configure project ports with conflict detection

#### AI & Automation
- **Agent marketplace**: 13+ pre-built agents for security, quality, deployment, and productivity
- **Custom agents**: Create automation with file, git, session, schedule, or system triggers
- **MCP server catalog**: 22+ pre-configured servers ready for one-click installation
- **Code Puppy integration**: AI coding assistant with Claude integration
- **AI personas**: Configure assistant behavior with custom system prompts
- **Voice commands**: Experimental voice-controlled interface

#### Libraries & Content
- **Prompt library**: Save and reuse prompts with variable substitution
- **Snippet palette**: Command snippets organized by category with favorites
- **Theme system**: 11 glassmorphism themes using CSS variables
- **Keyboard shortcuts**: Fully customizable shortcuts for all actions
- **Global search**: Fuzzy search across projects, sessions, prompts, and commands

#### Collaboration & Sharing
- **Session sharing**: Generate expiring share links with optional password protection
- **Session comments**: Attach threaded comments to sessions
- **Activity feed**: Real-time team activity tracking
- **Cloudflare tunnels**: One-click public URL publishing with automatic DNS
- **GitHub integration**: Clone repos, push changes, view sync status

#### Self-Update & Onboarding
- **One-Click Updates**: Update Console.web directly from the UI with real-time progress
- **Version Checking**: Automatically detects when updates are available from GitHub
- **First-Time Setup Wizard**: 5-step onboarding with feature selection, widget presets, and theme preview

### Home Dashboard

A customizable widget-based dashboard providing a 10,000-foot overview:

| Widget | What It Shows |
|--------|---------------|
| Quick Stats | Projects, sessions, containers, CPU, uptime at a glance |
| Git Status | Repositories with uncommitted changes |
| Active Sessions | Running terminal sessions with quick reconnect |
| Recent Projects | Recently accessed projects with timestamps |
| Recent Commits | Latest git commits across all projects |
| Docker | Container status with running/stopped indicators |
| Active Ports | Listening ports and associated processes |
| AI Usage | Token usage and cost estimates |
| Disk Usage | Project storage consumption sorted by size |
| Project Health | Health scores based on CLAUDE.md, tests, CI/CD |
| Tech Stack | Technologies detected across all projects |
| Security Alerts | Vulnerability warnings from scans |

**Customization:**
- Drag-and-drop widget reordering
- Four size options: Small, Medium, Large, Full-width
- Add/remove widgets via edit mode
- Layout persists in localStorage

### Admin Dashboard Tabs

| Tab | Sub-tabs | Purpose |
|-----|----------|---------|
| PROJECTS | - | Browse projects, view metrics, edit CLAUDE.md |
| INFRASTRUCTURE | Settings, Services, Docker, Stack, Packages, Logs, Processes, Network, Firewall, Fail2ban, Authentik, Users | System administration |
| AGENTS | My Agents, Marketplace | Automation management |
| MCP | - | MCP server catalog and configuration |
| SECURITY | - | Security scanning dashboard |
| HISTORY | - | Session history browser |

### Watcher Service

Autonomous monitoring and auto-recovery system:
- Health checks every 30 seconds via `/api/watcher/health`
- Automatic detection of process crashes, Prisma errors, memory issues
- Escalating recovery: restart → regenerate Prisma → reinstall dependencies
- Exponential backoff to prevent recovery loops
- Detailed logging to `logs/watcher.log`

### Cloudflare Integration

Automatic DNS mapping from CLAUDE.md:
- Add `**Subdomain:** your-subdomain` to project CLAUDE.md
- Widget auto-populates subdomain and port from configuration
- Auto-sync detects missing routes and syncs from Cloudflare
- Route matching prioritizes CLAUDE.md subdomain over port

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/version` | GET | Get current version and check for updates |
| `/api/system/update` | POST | Trigger self-update process |
| `/api/system/update/status` | GET | Get update status and logs |
| `/api/system/changelog` | GET | Get recent git commits |
| `/api/github/settings` | GET | Get GitHub configuration status |

### Technical Details

- **Frontend**: React 18, Vite, Tailwind CSS, xterm.js, Chart.js, Socket.IO client
- **Backend**: Express, Socket.IO, node-pty, Prisma 7, Dockerode
- **Database**: PostgreSQL with PrismaPg adapter
- **Auth**: Authentik OAuth2 with proxy header validation
- **Process**: PM2 for production, watcher service for auto-recovery
- **Container**: Docker support with full Dockerfile and compose

---

## Roadmap

Future releases will focus on:
- Enhanced multi-user collaboration
- Kubernetes support
- Extended MCP server capabilities
- Mobile companion app
- Improved AI workflow integration

---

## Contributing

Console.web is a personal project but suggestions and bug reports are welcome via GitHub issues.

---

## License

MIT License - see LICENSE file for details.
