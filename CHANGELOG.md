# Console.web - Changelog & Documentation

All notable changes to Console.web (console-web) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## About Console.web

### Who Is This For?

Console.web is built for **developers, DevOps engineers, and teams** who want a unified web-based interface to manage their development infrastructure. It's particularly valuable for:

- **Solo developers** managing multiple projects on a local or remote dev server
- **Small teams** who need shared access to project terminals and infrastructure
- **DevOps engineers** monitoring containers, services, and system health
- **AI-assisted development workflows** using Claude Code, Aider, or similar tools
- **Self-hosted infrastructure enthusiasts** running their own Sovereign Stack

### What Problems Does It Solve?

1. **Terminal Fragmentation**: Stop juggling multiple SSH sessions. Access all your project terminals from one browser tab with automatic session persistence.

2. **Context Switching**: No more switching between terminal, Docker Desktop, system monitor, and code editor. Everything is in one place.

3. **Session Loss**: Never lose your terminal session again. Shpool persistence means your work survives disconnects, browser crashes, and server restarts.

4. **Infrastructure Visibility**: See all your containers, services, ports, and resources at a glance without memorizing CLI commands.

5. **AI Workflow Integration**: Built specifically for AI-assisted development with Claude Code integration, MCP server management, and custom automation agents.

### What Can You Do With It?

**Daily Developer Workflow:**
```
Morning:
- Open Console.web dashboard
- Check overnight security scans and system health
- Review git status across all projects
- Reconnect to yesterday's terminal session (still running!)

During Development:
- Switch between project terminals instantly
- Run builds and tests with full output visibility
- Commit and push changes through the Git workflow panel
- Monitor Docker containers and restart services as needed

End of Day:
- Leave terminals running (they'll persist overnight)
- Check resource usage and clean up if needed
- Review activity feed to see what the team worked on
```

**DevOps Tasks Made Easy:**
- View all systemd services and their status
- Start/stop/restart Docker containers
- Check firewall rules and add new ports
- Monitor CPU, memory, disk across the system
- View logs from any service with filtering
- Manage SSH keys and server users

**AI-Assisted Development:**
- Run Claude Code sessions in persistent terminals
- Configure MCP servers for enhanced AI capabilities
- Create custom automation agents for repetitive tasks
- Track AI token usage and costs

### Key Capabilities

| Category | Features |
|----------|----------|
| **Terminals** | Browser-based xterm.js, shpool persistence, multi-session, auto-reconnect |
| **Projects** | Browse, favorite, search, completion tracking, CLAUDE.md editor |
| **Containers** | Docker management - containers, images, volumes, networks |
| **Services** | Systemd service monitoring, start/stop/restart |
| **Security** | UFW firewall, Fail2ban, SSH monitoring, security scanning |
| **Git** | Status, commit, push, pull, branches, diff viewer |
| **AI** | 13+ pre-built agents, MCP servers, personas, voice commands |
| **Monitoring** | Real-time CPU/memory/disk, processes, network, logs |
| **Collaboration** | Session sharing, comments, activity feed, handoffs |
| **Publishing** | Cloudflare Tunnel integration, automatic DNS mapping |

---

## [1.0.6] - 2026-01-17

### Admin Dashboard Modularization

This major release refactors the 5,544-line AdminDashboard.jsx monolith into 35+ modular components with improved navigation.

### Navigation Changes

- **SETTINGS promoted**: Now a main tab (was nested 2 levels deep under SYSTEM)
- **AUTOMATION created**: New tab combining AGENTS + MCP + SCHEDULED
- **INFRASTRUCTURE renamed**: Now called SERVER for clarity
- **Cleaner hierarchy**: Maximum 2 levels of nesting (main tab → sub-tab)

### New Navigation Structure

```
Before: PROJECTS | SYSTEM (13 sub-tabs) | AGENTS | MCP | SECURITY | HISTORY
After:  PROJECTS | SETTINGS | AUTOMATION | SERVER | SECURITY | HISTORY
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
- `admin/tabs/AutomationTab/` - 3 pane components (Agents, MCP, Scheduled)
- `admin/tabs/ServerTab/` - 10 pane components (Overview, Services, Docker, etc.)
- `admin/tabs/SecurityTab/` - 4 pane components (Scans, Firewall, Fail2ban, ScanConfig)
- `admin/tabs/ProjectsTab.jsx` - Project list with completion metrics
- `admin/tabs/HistoryTab.jsx` - Session history browser

### Bug Fixes

- **HistoryTab**: Fixed API endpoint (was `/api/sessions/history`, now `/api/admin/history`)
- **ScheduledPane**: Fixed cron/timer endpoints to use `/api/infra/scheduled/*`
- **Fail2banPane**: Fixed endpoint to `/api/infra/security/fail2ban/status`
- **ScanConfigPane**: Replaced non-existent endpoints with placeholder UI

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
