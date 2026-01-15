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

3. **Session Loss**: Never lose your terminal session again. tmux persistence means your work survives disconnects, browser crashes, and server restarts.

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
| **Terminals** | Browser-based xterm.js, tmux persistence, multi-session, auto-reconnect |
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

## [1.2.0] - 2026-01-15

### Clipboard & Voice Command Improvements

This release fixes critical clipboard functionality for tmux terminals and implements voice command features.

### Fixes

#### TMux Clipboard Integration (OSC 52)
- **Root Cause**: tmux with `mouse on` captures all mouse events, preventing xterm.js from seeing selections
- **Solution**: Implemented OSC 52 escape sequence support for clipboard integration
- tmux now sends clipboard data via OSC 52, which xterm.js decodes and copies to browser clipboard
- Added `set-clipboard on` and terminal overrides in tmux.conf
- Configured copy-mode bindings for automatic clipboard on mouse release

#### Voice Command Improvements
- **Sidebar Toggle**: "toggle sidebar" voice command now properly hides/shows both sidebars
- **Suggestion Execution**: Clicking voice command suggestions now executes them (was a no-op)
- Added sound feedback and history tracking for suggestion clicks

#### Terminal Selection Tracking
- Use `onSelectionChange` event to track selection as it happens
- Store last valid selection for fallback when tmux clears selection
- Increased mouseup delay from 10ms to 50ms for reliable capture

### How to Copy from Terminal

1. **Mouse Selection** (automatic): Click and drag to select, release to copy
2. **tmux Copy Mode**: `Ctrl+B` then `[`, navigate, `Space` to start, `Enter` to copy
3. **Hold Shift**: Bypass tmux and use xterm.js selection directly

---

## [1.1.0] - 2026-01-15

### One-Click Updates & UX Improvements

This release adds self-update capabilities, improved clipboard handling, and a beautiful first-time setup experience.

### New Features

#### One-Click System Updates
- **Self-Update Feature**: Update Console.web directly from the UI without manual commands
- **Real-Time Progress**: Watch git pull, npm install, build, and restart progress via Socket.IO streaming
- **Version Checking**: Automatically detects when updates are available from GitHub
- **Update History**: View logs from previous update attempts
- Located in **Settings → SYSTEM → Software Updates**

#### First-Time Setup Wizard
- **5-Step Onboarding**: Beautiful wizard for new users with Welcome, Features, Layout, Theme, and Complete steps
- **Feature Selection**: Toggle GitHub, Cloudflare, Docker, Systemd, Security, Agents, MCP, and Voice features
- **Widget Presets**: Choose from Minimal, Developer, DevOps, or Custom widget layouts
- **Theme Preview**: Hover to preview themes before selecting

#### Terminal Clipboard Improvements
- **Highlight-to-Copy**: Select text in terminal and it automatically copies to clipboard
- **Ctrl+Shift+C**: Explicit copy shortcut for selected text
- **Ctrl+Shift+V**: Paste from clipboard into terminal

### Fixes

- **About Modal Theming**: Fixed unreadable text on light/dark themes by using CSS variables
- **Admin Dashboard Light Theme**: Added proper overrides for progress bars, badges, and stat values
- **History Tab Error**: Fixed `history.entries` undefined error with defensive check
- **GitHub Settings Endpoint**: Added missing `/api/github/settings` endpoint
- **Cloudflare Port Detection**: Extended regex to handle more CLAUDE.md formats:
  - `- Frontend: 9400` (list item format)
  - `| Frontend | 9400 |` (table format)
  - `**Frontend:** 9400` (bold label)
  - Hostname extraction from `(subdomain.domain.com)`

### API Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/version` | GET | Get current version and check for updates |
| `/api/system/update` | POST | Trigger self-update process |
| `/api/system/update/status` | GET | Get update status and logs |
| `/api/system/changelog` | GET | Get recent git commits |
| `/api/github/settings` | GET | Get GitHub configuration status |

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
- **tmux persistence**: Sessions survive disconnects, browser refreshes, and server restarts
- **Multi-session support**: Run multiple terminals simultaneously with instant switching
- **Session organization**: Hierarchical folders, color-coded tags, markdown notes, and quick-start templates
- **Session handoffs**: Transfer sessions between team members with full context
- **Auto-reconnect**: Automatically reconnect to your last active session on page load

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

### Technical Details

- **Frontend**: React 18, Vite, Tailwind CSS, xterm.js, Chart.js, Socket.IO client
- **Backend**: Express, Socket.IO, node-pty, Prisma 7, Dockerode
- **Database**: PostgreSQL with PrismaPg adapter
- **Auth**: Authentik OAuth2 with proxy header validation
- **Process**: PM2 for production, watcher service for auto-recovery
- **Container**: Docker support with full Dockerfile and compose

### Example Day-to-Day Usage

**Starting Your Day:**
1. Open Console.web at `https://manage.yourserver.com`
2. Dashboard shows overnight status - any failed containers? Security alerts?
3. Click your main project to reconnect to yesterday's terminal (still running!)
4. Review git status widget - see what needs committing

**During Development:**
1. Terminal is already connected to your project
2. Run `npm run dev` - watch output in real-time
3. Need to check a container? Click Infrastructure → Docker
4. Push your changes through Git workflow panel
5. Check if port is available using Port Resolver

**Managing Infrastructure:**
1. Service down? Infrastructure → Services → find it → restart
2. Need to open a port? Firewall → Add Rule
3. Check who's been trying to SSH? Security → SSH Sessions
4. Review logs? Logs tab with filtering

**Publishing a Project:**
1. Select project in sidebar
2. Open Cloudflare widget in right sidebar
3. Subdomain auto-fills from CLAUDE.md
4. Click Publish - DNS created automatically

**Debugging an Issue:**
1. Check watcher logs: `pm2 logs console-web-watcher`
2. View API health: `curl localhost:5275/api/watcher/health`
3. Check database: Admin → Infrastructure → use Database Browser
4. Review process: Infrastructure → Processes

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
