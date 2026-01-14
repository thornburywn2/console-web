# Changelog

All notable changes to Console.web (console-web) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For historical changelog entries from the development period, see [CHANGELOG-ARCHIVE.md](./CHANGELOG-ARCHIVE.md).

---

## [1.0.0] - 2026-01-14

### Initial Stable Release

Console.web v1.0.0 marks the first stable release of our comprehensive web-based management interface for Claude Code projects. This release represents a complete development infrastructure management solution with terminal access, system monitoring, and intelligent automation.

### Core Features

#### Terminal & Session Management
- **Browser-based terminals**: Full xterm.js terminal with tmux persistence
- **Session survival**: Sessions survive disconnects and browser refreshes
- **Multi-session support**: Run multiple terminals simultaneously
- **Session organization**: Folders, tags, notes, and templates for sessions
- **Session handoffs**: Transfer sessions between team members
- **Auto-reconnect**: Automatically reconnect to last active session

#### Project Management
- **Project browser**: Browse, organize, and favorite projects
- **Completion metrics**: Track project completion with progress indicators
- **CLAUDE.md editor**: Edit project configuration directly in the interface
- **Project templates**: Create new projects from 6 standardized templates
- **Compliance checker**: Verify projects meet quality standards
- **Git workflow**: Commit, push, pull, branch management, diff viewer

#### System Administration
- **Real-time monitoring**: CPU (aggregated across all cores), memory, disk usage
- **Systemd services**: View and manage systemd services
- **Docker management**: Containers, images, volumes, networks with full CRUD
- **Process management**: View top processes, CPU/memory usage
- **Network diagnostics**: Interfaces, connections, ping, DNS lookup
- **Log viewer**: Journalctl integration with filtering and search

#### Security & Infrastructure
- **UFW firewall**: Enable/disable, rule management, port sync
- **SSH security**: View sessions, failed attempts, manage SSH keys
- **Fail2ban status**: Monitor banned IPs and jail status
- **Authentik SSO**: Full integration with user management
- **Server users**: Create, delete, manage Linux users and groups
- **Security scanning**: Integration with AGENT-018 security scanner

#### Developer Tools
- **API tester**: Test endpoints with full request/response inspection
- **Database browser**: Explore PostgreSQL/Prisma databases
- **File browser**: Navigate and manage project files
- **Dependency dashboard**: View, update npm packages with vulnerability scanning
- **Port resolver**: Manage and configure project ports

#### AI & Automation
- **13+ pre-built agents**: Marketplace with security, quality, deployment agents
- **Custom agents**: Create agents with file, git, session, or system triggers
- **MCP server catalog**: 22+ pre-configured MCP servers
- **Code Puppy**: AI coding assistant with Claude integration
- **AI personas**: Configure AI assistant behavior
- **Voice commands**: Voice-controlled interface (experimental)

#### Libraries & Content
- **Prompt library**: Save and reuse prompts with variables
- **Snippet palette**: Command snippets with categories and favorites
- **Theme system**: 11 glassmorphism themes with CSS variables
- **Keyboard shortcuts**: Customizable shortcuts for all actions
- **Global search**: Fuzzy search across projects, sessions, prompts

#### Collaboration & Sharing
- **Session sharing**: Generate share links with permissions
- **Session comments**: Attach comments to specific lines
- **Activity feed**: Team activity tracking
- **Cloudflare tunnels**: One-click public URL publishing
- **GitHub integration**: Clone, push, sync with GitHub repos

#### Integration & Infrastructure
- **Authentik OAuth2**: Single sign-on authentication
- **PostgreSQL + Prisma 7**: Full database persistence
- **Socket.IO**: Real-time updates for terminal and status
- **PM2 process management**: Production-ready deployment
- **Docker support**: Containerized deployment option
- **WSL2 support**: Windows Subsystem for Linux deployment

### Home Dashboard

A customizable widget-based dashboard providing a 10,000-foot overview of all projects and infrastructure:

**12 Widget Types:**
| Widget | Description |
|--------|-------------|
| Quick Stats | Projects, sessions, containers, CPU, uptime at a glance |
| Git Status | Repositories with uncommitted changes (staged/unstaged/untracked) |
| Active Sessions | Running tmux terminal sessions with quick reconnect |
| Recent Projects | Recently accessed projects with timestamps |
| Recent Commits | Latest git commits across all projects |
| Docker | Container status with running/stopped indicators |
| Active Ports | Listening ports and associated processes |
| AI Usage | Token usage and cost estimates |
| Disk Usage | Project storage consumption (sorted by size) |
| Project Health | Health scores based on CLAUDE.md, tests, CI/CD, README |
| Tech Stack | Technologies used across all projects |
| Security Alerts | Vulnerability warnings from security scans |

**Customization Features:**
- **Drag-and-drop reordering**: Rearrange widgets by dragging
- **Size control**: Small (150px), Medium (250px), Large (400px), Full width
- **Add/Remove widgets**: Show/hide any widget via edit mode
- **Reset to default**: One-click restore to original layout
- **localStorage persistence**: Layout saved automatically

**Usage:**
- Click "Edit" button in header to enter edit mode
- Drag widgets to reorder, use S/M/L/F buttons to resize
- Click "+" to add removed widgets, "×" to hide widgets
- Layout persists across sessions via `cw-dashboard-layout` key

### Admin Dashboard

6 main tabs with comprehensive sub-navigation:

| Tab | Description |
|-----|-------------|
| **PROJECTS** | Project list, completion metrics, CLAUDE.md editor |
| **INFRASTRUCTURE** | Settings (default), Services, Docker, Stack, Packages, Logs, Processes, Network, Firewall, Fail2ban, Authentik, Users, Scheduled |
| **AGENTS** | My Agents, Marketplace |
| **MCP** | MCP Server catalog and management |
| **SECURITY** | Security scanning dashboard |
| **HISTORY** | Session history entries |

### Technical

- **40+ database models**: Comprehensive data persistence
- **76 React components**: Modular, maintainable UI architecture
- **22+ API route handlers**: RESTful API design
- **CSS variable theming**: Dynamic theme switching
- **Widget-based sidebars**: Configurable left and right sidebars
