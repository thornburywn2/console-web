# Changelog

All notable changes to Command Portal (claude-code-manager) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Project Creation**: Create new projects directly from the Command Portal sidebar
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

## [1.0.0] - 2025-12-01

### Added
- Initial release of Command Portal
- Browser-based terminal with tmux persistence
- Project navigation sidebar
- Basic system monitoring
- Socket.IO real-time communication

---

## Version Locations

When releasing a new version, update these files:
1. `package.json` - version field
2. `CLAUDE.md` - Version header
3. `src/App.jsx` - header version badge
4. `src/components/AdminDashboard.jsx` - footer version
5. `src/components/ChangelogWidget.jsx` - add new changelog entry
6. `CHANGELOG.md` - this file
