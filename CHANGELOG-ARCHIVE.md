# Changelog Archive

This file contains historical changelog entries from the development period before the v1.0.0 stable release.

For the current changelog, see [CHANGELOG.md](./CHANGELOG.md).

---

## [2.17.1] - 2026-01-13

### Fixed
- **setSuccess undefined error**: Added missing `success` state variable to AdminDashboard component
- **Embedded components missing project context**: DependencyDashboard, GitWorkflow, and FileBrowser now receive `projectPath` from selected sidebar project
- **Add Firewall Rule dialog blocked**: Increased modal z-index from `z-50` to `z-[9999]` to prevent being hidden behind other elements
- **Firewall logs confusing when inactive**: Added warning message when UFW is inactive explaining no logs will appear until firewall is enabled
- **DependencyDashboard error on no project**: Added graceful fallback message "Select a project from the sidebar" instead of API error

### Added
- **Success banner in AdminDashboard**: Green success banner now displays for successful operations like firewall sync
- **Project name in tool headers**: Development tab tools (Dependencies, Git, Files) now show selected project name in header

### Changed
- App.jsx now passes `currentProject` prop to AdminDashboard for embedded component context

---

## [2.17.0] - 2026-01-13

### Added
- **Dependencies API**: New backend service for project dependency management
  - `GET /api/dependencies/:projectPath` - List all npm dependencies with current/latest versions
  - `POST /api/dependencies/update` - Update a single package to specific version
  - `POST /api/dependencies/update-all` - Update all outdated packages
  - `POST /api/dependencies/audit-fix` - Run npm audit fix to resolve vulnerabilities
  - Parses package.json for dependencies and devDependencies
  - Integrates with `npm outdated --json` for version comparison
  - Integrates with `npm audit --json` for vulnerability detection

- **DependencyDashboard Backend**: Dashboard component now fully functional
  - View all project packages with current, wanted, and latest versions
  - Visual indicators for major/minor/patch update types
  - Vulnerability count per package with severity colors
  - One-click update for individual packages
  - Bulk update all outdated packages
  - Audit fix button for security vulnerabilities

- **API Documentation**: Enhanced CLAUDE.md documentation
  - New "Users & Firewall" section documenting all `/api/admin-users/*` endpoints
  - New "Dependencies" section documenting all `/api/dependencies/*` endpoints
  - Complete firewall sync endpoint documentation

### Technical
- New `server/routes/dependencies.js` with createDependenciesRouter function
- Updated `server/routes/index.js` with dependencies router export
- Updated `server/index.js` with `/api/dependencies` route registration
- Fixed DependencyDashboard JSON parse error (was returning HTML 404)

---

## [2.16.0] - 2026-01-13

### Added
- **Project Template System**: Complete project creation infrastructure with standardized templates
  - New ProjectCreator component: Multi-step wizard for creating projects from templates
  - Six template types: Full-Stack (React+Fastify+Prisma), Frontend-only (React+Vite), Desktop (Tauri), CLI Tool (Bun+Commander), Infrastructure (Docker Compose), Mobile (Flutter)
  - Template registry (`templates/registry.json`) with variable definitions, post-create commands, and compliance weights
  - Variable substitution system for PROJECT_NAME, PORT, API_PORT, etc.
  - Post-create command execution (bun install, prisma generate, etc.)

- **Compliance Checker**: Project standards enforcement and migration tools
  - ComplianceChecker component with weighted scoring visualization
  - Compliance scoring: CI workflow (20%), Security workflow (20%), Pre-commit hooks (15%), TypeScript strict (15%), ESLint (10%), Prettier (10%), CLAUDE.md (10%)
  - One-click migration to add missing enforcement files
  - ComplianceBadge component for project list display

- **Template Service Backend**: New `/api/project-templates` API endpoints
  - `GET /api/project-templates` - List all available templates
  - `GET /api/project-templates/:id` - Get template details and variables
  - `POST /api/project-templates/create` - Create new project from template
  - `POST /api/project-templates/migrate` - Migrate existing project
  - `GET /api/project-templates/check/:project` - Check project compliance
  - `GET /api/project-templates/compliance/overview` - All projects compliance overview

- **CLI Migration Tool**: `scripts/migrate-project.js` for command-line project migration
  - `--dry-run` option to preview changes
  - `--force` option to overwrite existing files
  - `--skip-hooks` option to skip Husky setup
  - Color-coded terminal output with progress indicators

- **Admin Dashboard Integration**:
  - New `[+ NEW PROJECT]` button in PROJECTS tab
  - `COMPLIANCE` button on each project card
  - ProjectCreator and ComplianceChecker modals

### Technical
- New `server/services/templateService.js` with TemplateService class
- New `server/routes/projectTemplates.js` with project template API routes
- New React components: ProjectCreator.jsx, TemplateCard.jsx, ComplianceChecker.jsx
- Updated routes/index.js and server/index.js with new route registration

---

## [2.15.0] - 2026-01-13

### Added
- **Theme Consistency Update**: Complete hacker theme overhaul for Agent Marketplace and MCP Catalog components
  - Agent Marketplace (AgentMarketplace.jsx) updated with hacker-surface, hacker-border, hacker-green, hacker-cyan styling
  - Agent Card (AgentCard.jsx) updated with consistent theme colors and font-mono
  - Agent Config Modal (AgentConfigModal.jsx) updated with hacker theme form inputs
  - MCP Server Catalog (MCPServerCatalog.jsx) completely restyled with hacker theme
  - All components now use monospace fonts and uppercase tracking-wider headers
- **Cloudflare WebSocket Support**: Per-route WebSocket toggle for wss:// connections
  - New "WS" column in Cloudflare routes table with ON/OFF toggle button
  - Enables `originRequest.websocket: true` in tunnel configuration
  - Auto-detects existing WebSocket settings during route sync
  - Use for domains requiring WebSocket support (e.g., yt.example.com for wss://)

### Technical
- New `websocketEnabled` Boolean field in PublishedRoute Prisma model
- New `PUT /api/cloudflare/routes/:hostname/websocket` endpoint for WebSocket toggle
- Updated `/api/cloudflare/publish` to accept `websocket` parameter
- Sync endpoint detects WebSocket from `rule.originRequest?.websocket`

### Changed
- Agent Marketplace components now share unified hacker theme styling
- MCP Catalog visual consistency with other admin panels

---

## [2.14.0] - 2026-01-12

### Added
- **Authentik User Management**: Full Authentik identity provider integration directly in Console.web
  - View all Authentik users with status (active/inactive), email, and groups
  - Create new Authentik users with username, name, email, and password
  - Activate/deactivate users with one click
  - Delete users (with safety confirmation)
  - View Authentik groups
  - Real-time connection status indicator
  - **Database-stored API token**: Configure Authentik API token directly in admin UI (not env var)
- **Server User Management**: Linux server user administration
  - List all system users with UID, primary GID, shell, and home directory
  - Create new users with optional home directory creation
  - Delete users (with optional home directory removal)
  - View available shells (/bin/bash, /bin/zsh, etc.)
  - View all system groups
  - Safety guards prevent modification of system users (root, nobody, daemon, etc.)
- **Firewall (UFW) Management**: Beautiful firewall administration interface
  - Real-time UFW status (active/inactive) with default policies
  - View all firewall rules with port, protocol, direction, and action
  - Add new rules (allow/deny, port, protocol, direction, optional IP source)
  - Delete rules by number (except SSH which is protected)
  - Enable/disable firewall with confirmation dialogs
  - Reset firewall to defaults
  - Quick-add common service ports (SSH, HTTP, HTTPS, MySQL, PostgreSQL, MongoDB, Redis)
  - **Firewall Logs viewer**: View real-time UFW logs with color-coded BLOCK/ALLOW entries
  - **SSH Protection**: SSH rules (port 22) cannot be deleted - locked icon shown in UI
  - **Sudo Setup Guide**: Clear instructions shown when passwordless sudo not configured
  - **Auto-add to Firewall**: When creating a project with a port, option to automatically add firewall rule
- **Project Creation Enhancements**:
  - Optional development port field when creating new projects
  - Port automatically written to CLAUDE.md
  - Toggle to automatically add port to UFW firewall rules
- **Cloudflare WebSocket Support**:
  - Per-route WebSocket toggle in Cloudflare Tunnels section
  - Enable `originRequest.websocket: true` for wss:// connections
  - Visual ON/OFF toggle button for each route in routes table
  - Auto-sync detects existing WebSocket settings from tunnel config
  - Use for domains that need WebSocket support (e.g., yt.example.com for wss://)

### Technical
- New `/server/routes/usersFirewall.js` with 20+ API endpoints for user and firewall management
- Authentik Admin API integration using Bearer token authentication (`AUTHENTIK_API_TOKEN`)
- Server user management via Linux commands (useradd, userdel, getent passwd)
- Firewall management via UFW commands with sudo
- Three new INFRA_TABS in AdminDashboard: AUTHENTIK, USERS, FIREWALL
- Safety guards for critical system users (root, nobody, www-data, etc.)
- Safety guards for firewall operations (confirmation dialogs, reset protection)

### API Endpoints
- `GET /api/admin-users/authentik/status` - Authentik connection status
- `GET /api/admin-users/authentik/users` - List Authentik users
- `GET /api/admin-users/authentik/groups` - List Authentik groups
- `POST /api/admin-users/authentik/users` - Create Authentik user
- `PUT /api/admin-users/authentik/users/:id/activate` - Activate user
- `PUT /api/admin-users/authentik/users/:id/deactivate` - Deactivate user
- `DELETE /api/admin-users/authentik/users/:id` - Delete Authentik user
- `GET /api/admin-users/server/users` - List server users
- `GET /api/admin-users/server/groups` - List server groups
- `GET /api/admin-users/server/shells` - List available shells
- `POST /api/admin-users/server/users` - Create server user
- `DELETE /api/admin-users/server/users/:username` - Delete server user
- `GET /api/admin-users/firewall/status` - UFW status and policies
- `GET /api/admin-users/firewall/rules` - List firewall rules
- `POST /api/admin-users/firewall/rules` - Add firewall rule
- `DELETE /api/admin-users/firewall/rules/:number` - Delete rule by number
- `POST /api/admin-users/firewall/enable` - Enable firewall
- `POST /api/admin-users/firewall/disable` - Disable firewall
- `POST /api/admin-users/firewall/reset` - Reset firewall to defaults
- `GET /api/admin-users/firewall/logs` - Get UFW firewall logs
- `GET /api/admin-users/authentik/settings` - Get Authentik API settings from DB
- `PUT /api/admin-users/authentik/settings` - Save Authentik API token to DB
- `PUT /api/cloudflare/routes/:hostname/websocket` - Toggle WebSocket support for route

### Planned (TODO)
- **SSH via Cloudflare Tunnel**: Integrate SSH access directly into Cloudflare tunnel instead of exposing port 22 to internet

---

## [2.13.0] - 2026-01-12

### Added
- **Infrastructure Management Suite**: 6 new sub-tabs under INFRASTRUCTURE for comprehensive server management
  - **PACKAGES**: Full apt package management with search, install, update, and remove capabilities
  - **LOGS**: journalctl log viewer with filtering by unit, priority level, and text search
  - **PROCESSES**: htop-style process manager with CPU/memory/PID/name sorting and kill functionality
  - **NETWORK**: Network interface display, ping tool, DNS lookup, and active connections viewer
  - **SECURITY**: SSH session monitoring, failed login tracking, fail2ban status, and open ports list
  - **SCHEDULED**: Cron job management and systemd timer controls with add/remove/toggle

### Technical
- New `/server/routes/infrastructure.js` with 25+ API endpoints for server administration
- Safety guards prevent removal of critical packages (systemd, openssh-server, docker, linux-image, grub)
- Safety guards prevent killing critical processes (sshd, systemd, dockerd, containerd)
- Real-time process list updates with 5-second interval
- Security data refresh with 30-second interval

---

## [2.12.1] - 2026-01-12

### Changed
- **Admin Dashboard Consolidation**: Reduced from 18 tabs to 9 main tabs for better organization
  - **INFRASTRUCTURE tab**: Merged SERVER + DOCKER + STACK with sub-tabs (SERVICES, DOCKER, STACK)
  - **DEVELOPMENT tab**: Merged TOOLS + DEVTOOLS into single tab
  - **AGENTS tab**: Added sub-tabs (MY AGENTS, MARKETPLACE)
  - **PROJECTS tab**: Absorbed CLAUDE_MD functionality as per-project modal editor
  - **SETTINGS tab**: Absorbed GITHUB and CLOUDFLARE settings into Integrations section
  - Removed standalone COSTS_ALERTS and MONITORING tabs
- **Code Cleanup**: Removed unused component imports from AdminDashboard

### Fixed
- **Tabby Dashboard**: Fixed server crash due to node-fetch import (using native fetch instead)
- **Swarm Dashboard**: Fixed API routes not loading in Admin Dashboard
- **Auth Settings**: Fixed AUTH section in SettingsPanel to show accurate proxy auth configuration

### Added
- **Admin Dashboard Tabs**: Added TABBY and SWARM as hidden experimental tabs (enable in Settings > System)

### Improved
- **Swarm Dashboard UX**: Clear "Experimental - Coming Soon" messaging explaining that Claude Flow requires `@anthropics/claude-flow` package (not yet released by Anthropic), with details about planned features

---

## [2.12.0] - 2026-01-12

### Added
- **Voice-to-Code (P0)**: Browser-native speech recognition for voice commands in Claude Code terminals
  - Uses Web Speech API (Chrome requires Google servers; Firefox supports offline)
  - ~50 voice command patterns for navigation, git operations, and terminal control
- **Aider Integration (P1)**: Full Aider AI coding assistant with session management and voice control
  - Requires: `pip install aider-chat`
  - Multi-LLM support (Anthropic, OpenAI, Ollama)
  - 15+ voice command patterns for Aider control
  - Mode toggle to switch between Claude Code and Aider
- **Tabby Code Completion (P2)**: Docker-based Tabby deployment dashboard
  - Requires: Docker with `tabbyml/tabby` image
  - GPU/CPU mode selection, model selection, health monitoring
  - IDE integration config generator (VS Code, Vim, etc.)
- **Claude Flow Swarms (P3)**: Multi-agent orchestration dashboard (EXPERIMENTAL)
  - Note: Requires `@anthropics/claude-flow` package (not yet released by Anthropic)
  - Dashboard ready for when/if Anthropic releases multi-agent tooling
  - 5 agent roles defined: orchestrator, coder, reviewer, tester, researcher
  - 6 swarm templates: Code Review, Feature Development, Bug Fixing, Documentation, Research, Quick Task

### Technical
- New `/server/services/aiderManager.js` for Aider process lifecycle management
- New `/server/services/tabbyManager.js` for Tabby Docker container management
- New `/server/services/claudeFlowManager.js` for swarm session orchestration
- New `/server/routes/aider.js` with 10 API endpoints for Aider sessions
- New `/server/routes/tabby.js` with 8 API endpoints for Tabby management
- New `/server/routes/claudeFlow.js` with 9 API endpoints for swarm control
- New `/src/components/AiderSessionPanel.jsx` for Aider UI
- New `/src/components/AiderModeToggle.jsx` for mode switching
- New `/src/components/TabbyDashboard.jsx` for Tabby management
- New `/src/components/SwarmDashboard.jsx` for Claude Flow swarms
- New `/src/hooks/useAiderVoice.js` for voice command routing
- Updated `/server/utils/commandPatterns.js` with Aider voice patterns
- New Prisma models: `AiderSession`, `AiderConfig`, `TabbyConfig`, `ClaudeFlowSwarm`

### API Endpoints
- `GET/POST/DELETE /api/aider/sessions` - Aider session CRUD
- `POST /api/aider/sessions/:id/send` - Send input to Aider
- `POST /api/aider/sessions/:id/voice/start|stop` - Voice mode control
- `GET/PUT /api/aider/config` - Aider configuration
- `GET/POST /api/tabby/status` - Tabby container status
- `POST /api/tabby/start|stop` - Container lifecycle
- `POST /api/tabby/test-completion` - Test code completion
- `GET/POST/DELETE /api/claude-flow/swarms` - Swarm CRUD
- `GET /api/claude-flow/templates` - Swarm templates
- `POST /api/claude-flow/swarms/:id/task` - Assign tasks to swarm

---

## [2.11.0] - 2026-01-12

### Added
- **AI Agents Marketplace**: New marketplace for discovering and installing pre-configured automation agents
- **13 Pre-built Agents**: Ready-to-use agents including ESLint Auto-Fixer, Prettier Formatter, Security Scanner, Test Runner, Commit Message AI, and more
- **7 Agent Categories**: Code Quality, Git Workflow, Security, Testing, Documentation, DevOps, Productivity
- **Marketplace UI**: Browse, search, and filter agents with one-click installation
- **Install Configuration**: Configure trigger type, project scope, and agent-specific settings before installation
- **Marketplace Statistics**: Dashboard showing total agents, installed count, and popular categories

### Technical
- New `catalogId` and `catalogMeta` fields in Agent Prisma model for marketplace tracking
- New `/server/data/agentCatalog.js` with static catalog of 13 agents
- New `/server/routes/marketplace.js` with 8 API endpoints for marketplace operations
- New `/src/components/AgentMarketplace.jsx` main marketplace browser component
- New `/src/components/AgentCard.jsx` for agent display cards
- New `/src/components/AgentConfigModal.jsx` for installation configuration
- Updated `AgentManager.jsx` with Marketplace button and modal integration

### API Endpoints
- `GET /api/marketplace/categories` - List categories with agent counts
- `GET /api/marketplace/agents` - List/filter/search catalog agents
- `GET /api/marketplace/agents/:id` - Get agent details
- `POST /api/marketplace/agents/:id/install` - Install agent with configuration
- `DELETE /api/marketplace/agents/:id/uninstall` - Uninstall marketplace agent
- `GET /api/marketplace/installed` - List installed marketplace agents
- `PUT /api/marketplace/agents/:id/update` - Update agent configuration
- `GET /api/marketplace/stats` - Marketplace statistics

---

## [2.10.0] - 2026-01-12

### Added
- **Skip Permissions Toggle**: Per-project setting to start Claude sessions with `--dangerously-skip-permissions` flag
- **Project Settings API**: New endpoints to get/update project-specific settings
- **Agent Dashboard Relocated**: Moved Agent Status Dashboard from right sidebar to left sidebar for better visibility

### Changed
- Removed Activity Log widget from right sidebar to reduce clutter
- `getProjects()` function now async to include database-stored settings

### Technical
- New `skipPermissions` Boolean field in Project Prisma model
- `PATCH /api/projects/:projectName/settings` endpoint for updating project settings
- `GET /api/projects/:projectName/settings` endpoint for retrieving project settings
- Modified `createPtySession()` to accept options parameter with skipPermissions
- Socket handler `select-project` now fetches project settings from database before creating session

---

## [2.9.0] - 2026-01-12

### Added
- **Security Dashboard**: New Security tab in Admin Dashboard with full lifecycle agent integration
- **Push Sanitization**: Pre-push git hooks that scan for secrets, PII, and sensitive data before pushing to GitHub
- **Tool Status Monitoring**: Real-time status display for security tools (Semgrep, Gitleaks, Trivy, License Checker, Lighthouse, JSCPD)
- **One-Click Scans**: Run Security, Quality Gate, Performance, Dependencies, and System Health scans from the dashboard
- **Lifecycle API**: REST API endpoints at `/api/lifecycle/*` for tool status, scans, and reports
- **Quick Commands Panel**: Reference panel with lifecycle agent CLI commands

### Technical
- New `/server/routes/lifecycle.js` with 8 API endpoints for lifecycle agent integration
- New `/src/components/SecurityDashboard.jsx` component with scan management
- New `scripts/sanitize-push.sh` for pre-push security scanning
- New `scripts/setup-hooks.sh` for git hook installation
- New `.gitleaks.toml` configuration with custom secret and PII detection rules
- New `/docs/SECURITY-TOOLS-SETUP.md` with installation and configuration guide
- Updated `.gitignore` with sensitive file patterns

### Security
- Gitleaks integration for secret scanning
- Custom PII detection patterns (SSN, phone, credit card, addresses)
- Fallback grep-based scanning when gitleaks not installed
- Automatic blocking of dangerous file types in git

---

## [2.8.0] - 2026-01-11

### Added
- **Memory Banks System**: Layered context persistence with Session, Project, and Global scopes
- **Plan Mode Visualization**: Mermaid flowchart diagrams showing plan steps and dependencies
- **Embedded Browser**: Preview agent-built UIs with viewport presets and DevTools
- **7 Memory Types**: Fact, Instruction, Context, Decision, Learning, Todo, Warning
- **Browser Console Logs**: View console output from embedded browser sessions
- **Screenshot History**: Capture and review browser screenshots over time

### Technical
- New `/src/components/MemoryBanks.jsx` for memory management
- New `/src/components/PlanVisualization.jsx` for plan flowcharts
- New `/src/components/EmbeddedBrowser.jsx` for UI preview
- New `/server/routes/memory.js` for memory API
- New `/server/routes/plans.js` for plan API
- New `/server/routes/browser.js` for browser API

---

## [2.7.0] - 2026-01-11

### Added
- **Route Status Indicators**: Real-time Running/Down/Pending status for Cloudflare routes
- **Route-to-Project Linking**: Automatic linking with orphan route detection
- **Vite Integration**: Auto-update vite.config.js allowedHosts on publish
- **Port Validation**: Validates target port is listening before showing route as active

### Fixed
- Express route ordering for mapped/orphaned endpoints
- Improved route sync accuracy with port status checks

---

## [2.6.0] - 2026-01-11

### Added
- **Cloudflare Tunnels Integration**: One-click publish to Cloudflare Tunnels
- **Automatic DNS Records**: CNAME record creation for public hostnames
- **Cloudflare Settings Tab**: Full configuration in Admin Dashboard
- **Per-Project Publish Panel**: Publish controls in right sidebar
- **Route Status Monitoring**: ACTIVE/PENDING/ERROR status tracking
- **Setup Script**: Automated cloudflared installation with systemd

---

## [2.5.0] - 2026-01-11

### Added
- **GitHub Integration**: Full GitHub integration with Personal Access Token authentication
- **GitHub Repository Browser**: Browse all your GitHub repos with search functionality
- **Clone from GitHub**: Clone any GitHub repo directly to local projects with one click
- **Push to GitHub**: Create new GitHub repositories from local projects
- **Sync Status Indicators**: Visual indicators in sidebar showing ahead/behind/synced status
- **GitHub Project Panel**: Per-project GitHub management in the right sidebar
- **Git Operations**: Push, pull, fetch buttons directly in the dashboard
- **GitHub Actions Status**: View workflow runs and CI/CD status per project

### Technical
- New `GitHubSettings`, `GitHubRepo`, `GitHubWorkflowRun` Prisma models
- `/server/routes/github.js` with 15+ API endpoints for GitHub operations
- `/src/components/GitHubSettingsModal.jsx` for PAT configuration
- `/src/components/GitHubRepoList.jsx` for repository browsing
- `/src/components/GitHubProjectPanel.jsx` for per-project GitHub management
- `/src/components/GitHubStatusBadge.jsx` for sync status indicators
- Uses `@octokit/rest` for GitHub API communication

---

## [2.4.0] - 2026-01-11

### Added
- **Checkpoint/Snapshot System**: Full CRUD for saving project state with git branch, commit, and dirty status capture
- **Agent Status Dashboard**: Visual progress panel in sidebar showing running agents, elapsed time, quick run/stop controls
- **MCP Server Catalog**: Pre-configured catalog of 22 MCP servers across 6 categories with one-click installation
- **Project Creation**: Create new projects directly from the Console.web sidebar
- **CLAUDE.md In-App Editor**: Edit per-project AI instructions without leaving the dashboard
- **Terminal Mouse Scrolling**: Mouse wheel scrolling via tmux mouse mode integration

### Changed
- Consolidated features from 2.3.2 (never released) into this version
- Improved version control documentation with line number references

### Technical
- New `Checkpoint` database model with Prisma schema
- `/server/routes/checkpoints.js` for checkpoint API
- `/src/components/CheckpointPanel.jsx` for checkpoint UI
- `/src/components/AgentStatusDashboard.jsx` for agent monitoring

---

## [2.3.2] - 2026-01-09

### Added
- **Project Creation**: New "Create Project" button in sidebar to create projects directly from the interface
- **MCP Server Catalog**: Pre-configured catalog of 22 MCP servers across 6 categories with one-click installation
- **Context API**: Full implementation of project context management endpoints
- **AgentBuilder MCP Integration**: MCP server and tool dropdowns now populated from installed servers

### Fixed
- Fixed AgentBuilder MCP dropdowns not being populated (TODO items resolved)
- Fixed Context API endpoint returning 404 (now fully implemented)
- Fixed `require()` error in ES module for project creation

### Changed
- Removed debug logging from authentik.js middleware for cleaner production logs

---

## [2.3.1] - 2026-01-08

### Fixed
- Fixed scroll behavior in right dashboard sidebar
- Wheel events now properly captured when hovering over sidebar
- Terminal no longer intercepts scroll events meant for sidebar

---

## [2.3.0] - 2026-01-08

### Added
- **Project Favorites**: Star projects to pin them at the top of the sidebar
- **Terminal Scrollbar**: Visible green scrollbar for easier navigation
- **CPU Monitoring**: Accurate real-time CPU usage with delta-based calculation

### Changed
- Updated documentation

---

## [2.2.0] - 2026-01-07

### Fixed
- All 11 themes now fully functional
- Fixed theme switching and persistence
- Complete CSS variable definitions for all themes

### Added
- **Ocean Theme**: Deep blue color scheme
- **Sepia Theme**: Warm brown color scheme

---

## [2.0.0] - 2026-01-06

### Added
- **Complete UI Overhaul**: New theme system with 11 themes
- **Session Management**: Folders, tags, search, and templates
- **Prompt Library**: Reusable prompts with variable support
- **AI Integration**: Personas, token usage tracking, cost dashboard, error analysis
- **Collaboration Tools**: Session sharing, comments, activity feed, team handoffs
- **Resource Monitoring**: CPU/memory/disk graphs, alerts, uptime tracking
- **Developer Tools**: Port wizard, database browser, API tester, env sync

### Changed
- Modernized glassmorphism design
- Improved terminal performance

---

## [1.5.0] - 2026-01-01

### Added
- Improved terminal performance
- Better scrollback buffer handling
- Session reconnection improvements

---

## [1.4.0] - 2025-12-15

### Added
- **Docker Dashboard**: Container lifecycle management
- Real-time Docker logs streaming
- Image management interface

---

## [1.0.0-alpha] - 2025-12-01

### Added
- Initial release of Console.web
- Browser-based terminal with tmux persistence
- Project navigation sidebar
- Basic system monitoring
- Socket.IO real-time communication
