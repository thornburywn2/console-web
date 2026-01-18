# CLAUDE.md

**Project:** Console.web (console-web)
**Version:** 1.0.23
**Last Updated:** 2026-01-18
**Type:** Web Application
**Port:** 7777 (Frontend), 5275 (API)
**Subdomain:** manage

---

## Project Overview

Console.web is a comprehensive web-based management interface for Claude Code projects. It provides real-time terminal access, system monitoring, Docker management, and project organization - a one-stop shop for managing development infrastructure.

### Key Features

- **Terminal Sessions**: Browser-based terminals with tmux persistence (sessions survive disconnects)
- **Project Management**: Browse, organize, favorite projects, and track completion metrics
- **Session Organization**: Folders, tags, notes, templates, and session handoffs
- **Prompt & Snippet Libraries**: Reusable prompts and command snippets
- **AI Agents**: Custom automation agents with marketplace of 13+ pre-built agents
- **System Admin**: CPU/memory/disk monitoring, systemd services, Docker containers
- **Infrastructure Management**: Server services, Docker control, Sovereign Stack health
- **Git Workflow**: Commit, push, pull, branches, diff viewer
- **Developer Tools**: API tester, database browser, file browser, log viewer
- **Security**: Security scanning dashboard with lifecycle agent integration
- **MCP Server Catalog**: 22+ pre-configured MCP servers with one-click installation
- **GitHub Integration**: Repository browser, clone, push, sync status
- **Cloudflare Tunnels**: One-click publish with automatic DNS
- **Home Dashboard**: Customizable widget-based overview of all projects and infrastructure

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Socket.IO |
| Terminal | xterm.js, node-pty, tmux |
| Database | PostgreSQL, Prisma 7 |
| Process | PM2 |
| Containers | Dockerode |
| Charts | Chart.js |
| Search | Fuse.js |
| Auth | Authentik OAuth2 |

---

## Project Structure

```
console-web/
├── server/
│   ├── index.js              # Main Express + Socket.IO server
│   ├── middleware/
│   │   └── authentik.js      # Authentik SSO authentication
│   ├── routes/               # 22+ modular API route handlers
│   │   ├── sessions.js       # Session CRUD
│   │   ├── folders.js        # Folders & tags
│   │   ├── notes.js          # Session notes
│   │   ├── prompts.js        # Prompt library
│   │   ├── snippets.js       # Command snippets
│   │   ├── templates.js      # Session templates
│   │   ├── themes.js         # Theme management
│   │   ├── alerts.js         # Alert rules
│   │   ├── workflows.js      # Automation workflows
│   │   ├── search.js         # Global search
│   │   ├── ai.js             # AI features
│   │   ├── files.js          # File browser
│   │   ├── git.js            # Git operations
│   │   ├── backups.js        # Backup management
│   │   ├── collaboration.js  # Sharing, comments, team
│   │   ├── monitoring.js     # Metrics, uptime, network
│   │   ├── devtools.js       # Ports, env, database
│   │   ├── aider.js          # Aider AI integration (P1)
│   │   ├── tabby.js          # Tabby code completion (P2)
│   │   └── claudeFlow.js     # Claude Flow swarms (P3)
│   └── services/
│       └── metrics.js        # Metrics collection service
├── src/
│   ├── App.jsx               # Main React app
│   ├── main.jsx              # Entry point
│   ├── index.css             # Global styles
│   ├── components/           # 77 React components
│   │   ├── Terminal.jsx          # xterm.js terminal
│   │   ├── HomeDashboard.jsx     # Customizable widget dashboard
│   │   ├── Sidebar.jsx           # Project navigation with favorites
│   │   ├── RightSidebar.jsx      # System stats sidebar
│   │   ├── AdminDashboard.jsx    # Full admin panel
│   │   ├── CommandPalette.jsx    # Fuzzy command search
│   │   ├── SessionManager.jsx    # Session lifecycle
│   │   ├── PromptLibrary.jsx     # Prompt management
│   │   ├── SnippetPalette.jsx    # Command snippets
│   │   ├── FileBrowser.jsx       # File explorer
│   │   ├── GitWorkflow.jsx       # Git operations
│   │   ├── WorkflowBuilder.jsx   # Automation builder
│   │   ├── DatabaseBrowser.jsx   # Database explorer
│   │   ├── SystemStats.jsx       # CPU/memory/disk
│   │   └── ...                   # 60+ more components
│   └── hooks/                # Custom React hooks
│       ├── useAuth.jsx           # Authentication
│       ├── useSessionManagement.js
│       ├── useKeyboardShortcuts.js
│       └── useTheme.js
├── prisma/
│   ├── schema.prisma         # Database schema (40+ models)
│   └── migrations/           # Database migrations
├── dist/                     # Built frontend
├── public/                   # Static assets
├── .env                      # Environment config
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite build config
├── tailwind.config.js        # Tailwind config
├── Dockerfile                # Docker image
└── docker-compose.yml        # Compose config
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Development (frontend + backend)
npm run dev

# Production
npm run build
npm start

# Database
npx prisma db push      # Apply schema
npx prisma generate     # Generate client
npx prisma studio       # Database GUI

# Testing
npm test                # Run tests
npm run test:coverage   # Coverage report
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5275 | Backend API server port |
| `VITE_PORT` | 7777 | Frontend dev server port |
| `PROJECTS_DIR` | ~/Projects | Projects directory |
| `CLIENT_URL` | https://manage.example.com | CORS origin |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | - | Claude CLI API key |
| `AUTH_ENABLED` | true | Enable Authentik proxy auth |
| `AUTHENTIK_URL` | https://auth.example.com | Authentik server URL |
| `AUTHENTIK_CLIENT_ID` | claude-manager | OAuth2 client ID |
| `AUTHENTIK_CLIENT_SECRET` | - | OAuth2 client secret |
| `AUTHENTIK_PROXY_SECRET` | - | Proxy validation secret |
| `TRUSTED_PROXY_IPS` | 172.17.0.0/16 | Trusted CIDR ranges |

---

## Home Dashboard (v1.0.0)

The Home Dashboard is a customizable widget-based view that provides a 10,000-foot overview of all projects and infrastructure. It displays in the terminal area when "Home" is selected from the sidebar.

### Widget Types (12)

| Widget | Key | Description |
|--------|-----|-------------|
| Quick Stats | `quickStats` | Projects, sessions, containers, CPU, uptime summary |
| Git Status | `gitStatus` | Repos with uncommitted changes (staged/unstaged/untracked) |
| Active Sessions | `activeSessions` | Running tmux terminal sessions |
| Recent Projects | `recentProjects` | Recently accessed projects with timestamps |
| Recent Commits | `recentCommits` | Latest git commits across projects |
| Docker | `docker` | Container status (running/stopped) |
| Active Ports | `activePorts` | Listening ports and processes |
| AI Usage | `aiUsage` | Token usage and cost estimates |
| Disk Usage | `diskUsage` | Project storage consumption |
| Project Health | `projectHealth` | Health scores (CLAUDE.md, tests, CI/CD, README) |
| Tech Stack | `techStack` | Technologies across all projects |
| Security Alerts | `securityAlerts` | Vulnerability warnings from scans |

### Customization

- **Edit Mode**: Click pencil icon to enter edit mode
- **Drag-Drop**: Reorder widgets by dragging
- **Sizes**: S (150px), M (250px), L (400px), F (full width)
- **Add/Remove**: Show/hide widgets via "+" button or "×"
- **Reset**: Restore default layout with one click
- **Persistence**: Layout saved to `localStorage` key `cw-dashboard-layout`

### Data Sources

- Projects: `/api/admin/projects-extended`
- System: `/api/admin/system`
- Docker: `/api/docker/containers?all=true`
- Dashboard: `/api/dashboard` (git, commits, ports, disk, AI usage, security alerts)

Data refreshes every 15 seconds while dashboard is open.

---

## Admin Dashboard Structure (v1.0.6)

The Admin Dashboard provides comprehensive system management with 6 main tabs.
Refactored from a 5,544-line monolith into 35+ modular components.

### Main Tabs

| Tab | Description | Sub-tabs |
|-----|-------------|----------|
| **PROJECTS** | Project list with completion metrics, CLAUDE.md editor | - |
| **SETTINGS** | User preferences and configuration (promoted from Infrastructure) | GENERAL, APPEARANCE, SHORTCUTS, PERSONAS, INTEGRATIONS, AUTH |
| **AUTOMATION** | AI agents and MCP servers (marketplace-style interface) | AGENTS, MCP |
| **SERVER** | Server infrastructure management (renamed from Infrastructure) | OVERVIEW, SERVICES, DOCKER, STACK, PACKAGES, LOGS, PROCESSES, NETWORK, SCHEDULED, AUTHENTIK, USERS |
| **SECURITY** | Security scanning and firewall management | SCANS, FIREWALL, FAIL2BAN, SCAN_CONFIG |
| **HISTORY** | Session history entries | - |

### Hidden Experimental Tabs (Enable in Settings > System)
- **DEVELOPMENT** - Developer tools (API Tester, Git, Files, Database, Logs)
- **CODE_PUPPY** - Code Puppy AI assistant
- **TABBY** - Tabby code completion (requires Docker)
- **SWARM** - Claude Flow multi-agent swarms (placeholder - package not released)

### Server Sub-tab Categories
- **Overview**: OVERVIEW (system stats dashboard)
- **Services**: SERVICES, DOCKER, STACK
- **System**: PACKAGES, LOGS, PROCESSES
- **Network**: NETWORK, SCHEDULED
- **Users & Auth**: AUTHENTIK, USERS

### Component Structure
```
src/components/admin/
├── constants.js           # Tab enums and migration helpers
├── utils.js               # Shared utilities
├── shared/                # Shared components
│   ├── TabButton.jsx
│   ├── SubTabBar.jsx
│   ├── TabContainer.jsx
│   └── ErrorBoundary.jsx
└── tabs/                  # Tab components
    ├── ProjectsTab.jsx
    ├── HistoryTab.jsx
    ├── SettingsTab/
    ├── AutomationTab/
    ├── ServerTab/
    └── SecurityTab/
```

---

## Project-Specific Rules

1. **Session Persistence**: All terminal sessions are backed by tmux and PostgreSQL
2. **No Mock Data**: All data comes from live system queries or database
3. **Real-time Updates**: Use Socket.IO for terminal and status updates
4. **PM2 Process**: Production runs via PM2 as `console-web`
5. **Delta CPU Calculation**: CPU stats use delta between readings for accuracy
6. **Version Control**: When releasing a new version, update ALL of these locations:
   - `package.json` - version field (line 3)
   - `CLAUDE.md` - Version header (line 4) and footer (bottom)
   - `src/App.jsx` - header version badge (~line 745)
   - `src/components/AdminDashboard.jsx` - footer version (~line 777)
   - `src/components/ChangelogWidget.jsx` - add new entry to CHANGELOG_ENTRIES array
   - `CHANGELOG.md` - add new version section
   - `CHANGELOG.md` - add new version section at top

---

## API Endpoints

### Core
- `GET /api/projects` - List all projects
- `GET /api/admin/projects-extended` - Projects with completion metrics
- `GET /api/settings` - User preferences
- `PUT /api/settings` - Update preferences

### Admin
- `GET /api/admin/system` - System stats (CPU, memory, disk)
- `GET /api/admin/claude-md/:project` - Read project CLAUDE.md
- `PUT /api/admin/claude-md/:project` - Update project CLAUDE.md
- `GET /api/dashboard` - Aggregated dashboard data (git, commits, ports, disk, AI usage, security)

### Infrastructure
- `GET /api/server/services` - Systemd services
- `GET /api/docker/containers` - List Docker containers
- `GET /api/docker/images` - List Docker images
- `GET /api/docker/volumes` - List Docker volumes
- `POST /api/docker/containers/:id/start` - Start container
- `POST /api/docker/containers/:id/stop` - Stop container
- `POST /api/docker/containers/:id/restart` - Restart container
- `GET /api/infra/processes` - List system processes (top 50)
- `GET /api/infra/network/interfaces` - Network interfaces

### Users & Firewall
- `GET /api/admin-users/authentik/*` - Authentik SSO user management
- `GET /api/admin-users/server/users` - List server users
- `GET /api/admin-users/firewall/status` - UFW firewall status
- `GET /api/admin-users/firewall/rules` - List firewall rules
- `POST /api/admin-users/firewall/enable` - Enable firewall
- `POST /api/admin-users/firewall/disable` - Disable firewall
- `POST /api/admin-users/firewall/rules` - Add firewall rule
- `DELETE /api/admin-users/firewall/rules/:number` - Delete rule (SSH protected)
- `POST /api/admin-users/firewall/sync-projects` - Sync all project ports to firewall
- `GET /api/admin-users/firewall/project-ports` - Get all project ports

### Sessions & Organization
- `GET/POST/PUT/DELETE /api/sessions` - Session CRUD
- `GET/POST/PUT/DELETE /api/folders` - Folder management
- `GET/POST/PUT/DELETE /api/tags` - Tag management
- `GET/POST/PUT/DELETE /api/notes` - Session notes

### Content Libraries
- `GET/POST/PUT/DELETE /api/prompts` - Prompt templates
- `GET/POST/PUT/DELETE /api/snippets` - Command snippets
- `GET/POST/PUT/DELETE /api/templates` - Session templates
- `GET/POST/PUT/DELETE /api/themes` - Theme management

### AI Features
- `GET/POST /api/ai/usage` - Token usage tracking
- `POST /api/ai/analyze-error` - Error analysis
- `GET/POST/PUT/DELETE /api/ai/personas` - AI personas
- `GET/POST /api/ai/costs` - Cost tracking

### Git Operations
- `GET /api/git/:project/status` - Git status
- `POST /api/git/:project/commit` - Commit changes
- `POST /api/git/:project/push` - Push commits
- `POST /api/git/:project/pull` - Pull changes
- `GET /api/git/:project/branches` - List branches

### Collaboration
- `POST /api/share/session` - Create share link
- `GET/POST/DELETE /api/sessions/:id/comments` - Comments
- `POST /api/sessions/:id/handoff` - Session handoff
- `GET /api/activity` - Activity feed

### Monitoring
- `GET /api/metrics/:type` - Resource metrics
- `GET/POST /api/uptime` - Uptime checks
- `GET /api/network` - Network statistics

### DevTools
- `GET /api/ports/status` - Port status
- `GET /api/db/tables` - Database tables
- `GET/POST /api/env/*` - Environment files

### Dependencies
- `GET /api/dependencies/:projectPath` - Get project dependencies with versions
- `POST /api/dependencies/update` - Update a single package
- `POST /api/dependencies/update-all` - Update all outdated packages
- `POST /api/dependencies/audit-fix` - Run npm audit fix

### Automation
- `GET/POST/PUT/DELETE /api/workflows` - Workflows
- `POST /api/workflows/:id/execute` - Run workflow
- `GET/POST/PUT/DELETE /api/alerts` - Alert rules

### Agents
- `GET/POST/PUT/DELETE /api/agents` - Agent CRUD
- `POST /api/agents/:id/run` - Run agent
- `POST /api/agents/:id/stop` - Stop agent
- `POST /api/agents/:id/toggle` - Enable/disable agent
- `GET /api/agents/status/runner` - Runner status
- `GET /api/agents/meta/triggers` - Available trigger types
- `GET /api/agents/meta/actions` - Available action types

### Marketplace
- `GET /api/marketplace/categories` - List categories
- `GET /api/marketplace/agents` - List catalog agents
- `POST /api/marketplace/agents/:id/install` - Install agent
- `GET /api/marketplace/stats` - Marketplace statistics

### GitHub Integration
- `GET /api/github/auth` - GitHub authentication status
- `GET /api/github/repos` - List repositories
- `POST /api/github/repos/clone` - Clone repository
- `POST /api/github/repos/:owner/:repo/push` - Push to repository

### Cloudflare Integration
- `GET /api/cloudflare/settings` - Cloudflare configuration status
- `GET /api/cloudflare/tunnel/status` - Tunnel health and connections
- `GET /api/cloudflare/dns` - List DNS records
- `POST /api/cloudflare/publish` - Publish project via tunnel

### Code Puppy
- `GET /api/code-puppy/status` - Code Puppy installation status
- `GET /api/code-puppy/init/status` - Initialization status
- `POST /api/code-puppy/init` - Initialize Code Puppy
- `GET /api/code-puppy/config` - Get configuration
- `PUT /api/code-puppy/config` - Update configuration
- `GET /api/code-puppy/agents` - List Code Puppy agents
- `GET /api/code-puppy/mcp` - List MCP servers
- `POST /api/code-puppy/mcp/sync-claude` - Sync MCP from Claude config
- `GET /api/code-puppy/mcp/claude-config` - Get Claude MCP configuration

### Experimental (Hidden by default)
- `GET /api/tabby/status` - Tabby container status (P2)
- `GET/POST/DELETE /api/claude-flow/swarms` - Swarm CRUD (P3)

### Real-time (Socket.IO)
- `select-project` - Connect to project terminal
- `terminal-input` - Send input to terminal
- `terminal-output` - Receive terminal output
- `terminal-resize` - Resize terminal
- `command-complete` - Command finished notification
- `reconnect-session` - Reconnect to session
- `kill-session` - Terminate session

---

## Database Models (40+)

### Core
- Project, Session, CommandHistory, UserSettings

### Organization
- SessionFolder, SessionTag, SessionTagAssignment, SessionNote

### Libraries
- Prompt, CommandSnippet, KeyboardShortcut, Theme, SessionTemplate

### Monitoring
- AlertRule, ResourceMetric, UptimeService, UptimeCheck

### Automation
- Workflow, WorkflowExecution, ScheduledTask, MacroRecording, Agent, AgentExecution

### Collaboration
- SharedSession, SessionComment, Activity, TeamMember, SessionHandoff

### AI & Integrations
- AIPersona, APIUsage, GitHubSettings, GitHubRepo

---

## Learning & Refinement

### Continuous Improvement Process

This project implements systematic learning to improve development practices:

1. **Post-Session Analysis**
   - Review command history for patterns
   - Identify frequently used prompts/snippets
   - Track error patterns for prevention

2. **Pattern Extraction**
   - Successful prompts become library entries
   - Common command sequences become snippets
   - Reusable session configs become templates

3. **Quality Metrics Tracking**
   - Monitor build success rates
   - Track test coverage trends
   - Measure deployment reliability

4. **Feedback Loops**
   - Session comments capture learnings
   - Activity feed shows team patterns
   - Alert rules catch recurring issues

### Review Triggers

Run these to capture learnings:
```bash
# Full lifecycle scan
bash ~/Projects/agents/lifecycle/AGENT-016-LIFECYCLE-MANAGER.sh scan /home/thornburywn/Projects/console-web

# Security audit
bash ~/Projects/agents/lifecycle/AGENT-018-SECURITY.sh scan /home/thornburywn/Projects/console-web

# Quality check
bash ~/Projects/agents/lifecycle/AGENT-019-QUALITY-GATE.sh all /home/thornburywn/Projects/console-web
```

### Knowledge Capture Points

| Trigger | Action | Storage |
|---------|--------|---------|
| Successful prompt | Add to Prompt Library | PostgreSQL |
| Repeated command | Create Snippet | PostgreSQL |
| Session pattern | Create Template | PostgreSQL |
| Error resolved | Document in Notes | PostgreSQL |
| Process improvement | Update CLAUDE.md | Filesystem |

---

## Project Templates System

Console.web includes a comprehensive project template system for creating new projects with standardized configurations.

### Template Location

Templates are stored in `./templates/` directory:

```
templates/
├── base/                    # Common files for ALL projects
├── web-app-fullstack/       # React + Fastify + Prisma
├── web-app-frontend/        # React + Vite (no backend)
├── desktop-tauri/           # Tauri + React + Rust
├── infrastructure/          # Docker Compose stacks
├── cli-tool/                # Node.js/Bun CLI utilities
└── mobile-flutter/          # Flutter mobile apps
```

### Template Variables

When creating new projects, these placeholders are replaced:

| Variable | Description |
|----------|-------------|
| `{{PROJECT_NAME}}` | Project name (kebab-case) |
| `{{PROJECT_DESCRIPTION}}` | Project description |
| `{{PORT}}` | Primary port number |
| `{{API_PORT}}` | Backend API port |
| `{{GITHUB_USER}}` | GitHub username |
| `{{PROJECT_DOMAIN}}` | Production domain |
| `{{PROJECT_TYPE}}` | Template type identifier |

### Standard Stack (Full-Stack Default)

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend | Fastify |
| Database | PostgreSQL + Prisma |
| Testing | Vitest, Supertest, Playwright |
| CI/CD | GitHub Actions |
| Deployment | Docker + Cloudflare Tunnel |

### Enforcement Included

All templates include:
- Pre-commit hooks (Husky + lint-staged)
- GitHub Actions workflows (CI, Security, Deploy)
- ESLint + Prettier configuration
- TypeScript strict mode
- 80%+ test coverage enforcement
- Security scanning (Trivy, Gitleaks, Semgrep)

### Creating Projects

1. Select project type in Console.web
2. Fill in project details
3. Template files copied to `~/Projects/{name}/`
4. Variables replaced with actual values
5. Git repository initialized
6. Dependencies installed

### Global Standards

All templates inherit from `~/CLAUDE.md` which defines:
- Security standards (NON-NEGOTIABLE)
- Code quality requirements
- Testing requirements (80%+ coverage)
- Naming conventions
- Project structure requirements

---

## Deployment Modes

Console.web supports two deployment modes:

### Standalone Mode (Default for GitHub distribution)

Designed for easy adoption on Windows WSL2:

| Feature | Configuration |
|---------|---------------|
| Reverse Proxy | None (direct port access) |
| Authentication | Local password (set on first visit) |
| SSO | Disabled |
| GitHub | Disabled (enable in Settings) |
| Cloudflare | Disabled (enable in Settings) |
| AI Assistant | Code Puppy enabled |

**Installation**: See `INSTALL.md` for WSL2 setup instructions.

**Target Audience**: Individual developers wanting to adopt AI-assisted development without infrastructure complexity.

**Files**:
- `.env.standalone` - Standalone configuration template
- `scripts/windows-setup.ps1` - PowerShell installer for Windows
- `INSTALL.md` - Complete installation guide

### Enterprise Mode

Full-featured deployment with enterprise integrations:

| Feature | Configuration |
|---------|---------------|
| Reverse Proxy | nginx |
| Authentication | Authentik SSO |
| GitHub | Full integration |
| Cloudflare | Tunnel for public access |
| AI Assistant | All options available |

**Files**:
- `.env.example` - Enterprise configuration template

---

## Integration Points

### Enterprise Mode
- **Authentik SSO**: auth.example.com
- **Cloudflare Tunnel**: manage.example.com
- **PostgreSQL**: Shared database server
- **Docker**: Container management via socket
- **BMAD Agents**: `~/Projects/agents/lifecycle/`
- **Global Standards**: `~/CLAUDE.md`

### Standalone Mode
- **PostgreSQL**: Local database
- **Code Puppy**: AI assistant
- **Direct Access**: http://localhost:7777

---

## Notes for AI Agents

### Project-Specific Patterns
- tmux sessions named `cp-{project_name}` (was `ccm-`)
- Socket.IO for all real-time updates
- Prisma 7 with PrismaPg adapter
- 11 glassmorphism themes available
- Widget-based sidebars with height snapping

### Known Gotchas
- CPU stats require delta calculation between readings
- Version must be updated in 6 locations on release
- Terminal resize requires explicit Socket.IO event
- Session reconnect needs existing tmux session
- localStorage keys use `cw-` prefix for consistency

### Sidebar Configuration
- Left sidebar: `cw-sidebar-left-widgets`
- Right sidebar: `cw-sidebar-right-widgets`
- Projects widget defaults to fill remaining space

---

Created: 2024-10-01
Version: 1.0.23
