# CLAUDE.md

**Project:** Console.web (console-web)
**Version:** 1.0.26
**Last Updated:** 2026-01-18
**Type:** Web Application
**Port:** 7777 (Frontend), 5275 (API)
**Subdomain:** manage

---

## Project Overview

Console.web is a comprehensive web-based management interface for Claude Code projects. It provides real-time terminal access, system monitoring, Docker management, and project organization - a one-stop shop for managing development infrastructure.

### Key Features

- **Terminal Sessions**: Browser-based terminals with shpool persistence (sessions survive disconnects, browser crashes, server restarts)
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
| Frontend | React 18, Vite, Tailwind CSS, xterm.js (109 components) |
| Backend | Node.js, Express, Socket.IO (45 route files) |
| Terminal | xterm.js, node-pty, shpool |
| Database | PostgreSQL, Prisma 7 (61 models) |
| Process | PM2 |
| Containers | Dockerode |
| Observability | Prometheus, Grafana, Loki, Jaeger, Sentry |
| Security | Helmet, Zod, bcrypt, express-rate-limit, RBAC |
| Testing | Vitest, Playwright, Storybook (~2,000 tests) |
| Charts | Chart.js |
| Search | Fuse.js |
| Auth | Authentik OAuth2, JWT, API Keys |

---

## Project Structure

```
console-web/
├── server/
│   ├── index.js              # Main Express + Socket.IO server
│   ├── middleware/
│   │   └── authentik.js      # Authentik SSO authentication
│   ├── routes/               # 45 modular API route handlers
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
│   ├── components/           # 109 React components
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
│   │   └── ...                   # 90+ more components
│   └── hooks/                # Custom React hooks
│       ├── useAuth.jsx           # Authentication
│       ├── useSessionManagement.js
│       ├── useKeyboardShortcuts.js
│       └── useTheme.js
├── prisma/
│   ├── schema.prisma         # Database schema (61 models)
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
npm test                # Frontend unit tests
npm run test:server     # Backend route tests
npm run test:all        # All tests
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E tests
npm run storybook       # Component library

# Observability (optional)
cd monitoring && docker compose up -d
```

---

## Environment Variables

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5275 | Backend API server port |
| `VITE_PORT` | 7777 | Frontend dev server port |
| `PROJECTS_DIR` | ~/Projects | Projects directory |
| `CLIENT_URL` | https://manage.example.com | CORS origin |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | - | Claude CLI API key |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | true | Enable Authentik proxy auth |
| `AUTHENTIK_URL` | https://auth.example.com | Authentik server URL |
| `AUTHENTIK_CLIENT_ID` | claude-manager | OAuth2 client ID |
| `AUTHENTIK_CLIENT_SECRET` | - | OAuth2 client secret |
| `AUTHENTIK_PROXY_SECRET` | - | Proxy validation secret |
| `TRUSTED_PROXY_IPS` | 172.17.0.0/16 | Trusted CIDR ranges |

### Observability (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | Jaeger/OTLP collector (enables tracing) |
| `SENTRY_DSN` | - | Sentry error tracking DSN |
| `LOG_FILE` | - | JSON log file path (enables file logging) |
| `LOKI_URL` | - | Loki URL for log aggregation |

---

## Home Dashboard (v1.0.0)

The Home Dashboard is a customizable widget-based view that provides a 10,000-foot overview of all projects and infrastructure. It displays in the terminal area when "Home" is selected from the sidebar.

### Widget Types (12)

| Widget | Key | Description |
|--------|-----|-------------|
| Quick Stats | `quickStats` | Projects, sessions, containers, CPU, uptime summary |
| Git Status | `gitStatus` | Repos with uncommitted changes (staged/unstaged/untracked) |
| Active Sessions | `activeSessions` | Running shpool terminal sessions |
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

1. **Session Persistence**: All terminal sessions are backed by shpool and PostgreSQL
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

## Database Models (61)

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

### Enterprise (v1.0.20+)
- User, Team, ProjectAssignment, AuditLog, ResourceQuota, ApiKey

---

## Enterprise Features (v1.0.20-v1.0.22)

Console.web includes enterprise-grade features for multi-user deployments.

### Role-Based Access Control (RBAC)

Four-tier role hierarchy with cascading permissions:

```
SUPER_ADMIN → Full system access, user management, infrastructure control
    ↓
ADMIN → Team project management, Docker control, view all team sessions
    ↓
USER → Own resources only, limited agent execution
    ↓
VIEWER → Read-only access to shared resources
```

**Middleware**: `server/middleware/rbac.js`
- `requireRole()` - Enforce minimum role level
- `buildOwnershipFilter()` - Filter queries by ownership
- `getOwnerIdForCreate()` - Set ownership on resource creation

**Frontend Integration** (`src/hooks/useAuth.jsx`):
- `hasRole(role)` - Check if user has minimum role
- `canAccess(resource, action)` - Permission check
- `isOwner(resourceOwnerId)` - Ownership verification

**Components**:
- `PermissionGate` - Declarative role-based rendering
- `RoleBadge` - Color-coded role indicators

### Resource Quotas

Per-user and per-role limits enforced via `enforceQuota()` middleware:

| Resource | SUPER_ADMIN | ADMIN | USER | VIEWER |
|----------|-------------|-------|------|--------|
| Sessions | 100 | 20 | 5 | 0 |
| Agents | 50 | 10 | 3 | 0 |
| Prompts | Unlimited | 100 | 25 | 0 |
| Snippets | Unlimited | 100 | 25 | 0 |

### API Key Authentication

Scoped API keys for programmatic access:

- **Key Format**: `cw_live_` prefix with SHA-256 hashing (plaintext never stored)
- **Scopes**: `read`, `write`, `agents`, `admin`
- **Features**: IP whitelisting, expiration dates, usage tracking
- **Endpoint**: `POST /api/api-keys` (admin only)

### Per-User Rate Limiting

Sliding window algorithm with X-RateLimit headers:

| Role | Requests/Minute |
|------|-----------------|
| SUPER_ADMIN | 1000 |
| ADMIN | 200 |
| USER | 60 |
| VIEWER | 30 |

### Audit Logging

Complete audit trail via `AuditLog` model:
- User actions (CREATE, READ, UPDATE, DELETE, EXECUTE)
- Resource type and ID
- IP address and user agent
- Queryable via `/api/audit` (admin only)

---

## Observability Stack (v1.0.9+)

Full production observability in `monitoring/` directory.

### Quick Start

```bash
cd monitoring && docker compose up -d
# Access Grafana at http://localhost:3000
```

### Components

| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Dashboards and visualization |
| Loki | 3100 | Log aggregation |
| Promtail | - | Log collection agent |
| Jaeger | 16686 | Distributed tracing |

### Prometheus Metrics

Available at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `consoleweb_http_requests_total` | Counter | Total HTTP requests |
| `consoleweb_http_duration_seconds` | Histogram | Request latency |
| `consoleweb_websocket_connections` | Gauge | Active WebSocket connections |
| `consoleweb_db_pool_size` | Gauge | Database pool size |
| `consoleweb_db_pool_idle` | Gauge | Idle pool connections |
| `consoleweb_db_pool_waiting` | Gauge | Waiting for connections |
| `consoleweb_db_pool_exhausted_total` | Counter | Pool exhaustion events |

### Distributed Tracing

OpenTelemetry auto-instrumentation:
- HTTP requests traced end-to-end
- PostgreSQL queries with timing
- X-Trace-Id header in responses
- Jaeger UI for trace visualization

**Enable**: Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`

### Sentry Integration

Error tracking with request correlation:
- Automatic exception capture
- Request ID propagation
- Socket.IO error tracking
- Performance monitoring

**Enable**: Set `SENTRY_DSN=https://...@sentry.io/...`

### AlertManager Rules (9 Production Alerts)

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | Error rate > 5% for 5 min | Critical |
| CriticalResponseTime | P95 latency > 2s | Critical |
| DatabasePoolExhausted | Clients waiting > 0 | Critical |
| DatabasePoolNearExhaustion | Pool utilization > 80% | Warning |
| HighSocketDisconnectRate | Rapid disconnections | Warning |
| ServiceDown | Health check fails | Critical |

---

## Test Infrastructure (v1.0.24)

Comprehensive test coverage with ~2,000 total tests.

### Test Summary

| Type | Count | Framework | Location |
|------|-------|-----------|----------|
| Frontend Unit | 975 | Vitest | `src/**/*.test.{js,jsx}` |
| Backend Route | ~950 | Vitest + Supertest | `server/routes/*.test.js` |
| E2E | 36 | Playwright | `e2e/*.spec.js` |
| Visual | 4 stories | Storybook | `src/**/*.stories.jsx` |

### Commands

```bash
npm test              # Frontend tests
npm run test:server   # Backend tests
npm run test:all      # All tests
npm run test:coverage # With coverage report
npm run test:e2e      # Playwright E2E tests
npm run storybook     # Component library
```

### Coverage Thresholds (Enforced in CI)

| Module | Lines | Branches |
|--------|-------|----------|
| src/services | 80% | 70% |
| src/hooks | 70% | 50% |
| server/routes | 100% file coverage | - |

### Key Test Files

**Frontend**:
- `useApiQuery.test.js` - API hook (16 tests)
- `useAuth.test.js` - Authentication (20 tests)
- `useSessionManagement.test.js` - Sessions (34 tests)
- `responseSchemas.test.js` - Zod validation (94 tests)

**Backend** (44/44 route files tested):
- `sessions.test.js` (40 tests)
- `agents.test.js` (54 tests)
- `prompts.test.js` (38 tests)
- Full list in STABILITY-ROADMAP.md

**E2E**:
- `terminal.spec.js` - Terminal functionality
- `projects.spec.js` - Project management
- `server.spec.js` - Docker/services
- `security.spec.js` - Security dashboard

---

## Security Features (v1.0.7+)

Defense-in-depth security implementation.

### Input Validation

All 45 route files use Zod schemas via `validateBody()` middleware:

```javascript
// server/middleware/validation.js
const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email()
});
router.post('/', validateBody(schema), handler);
```

### Error Sanitization

`sendSafeError()` pattern prevents information leakage:
- Returns sanitized message + reference ID to client
- Logs full error details internally
- No stack traces in production responses

### Path Traversal Protection (v1.0.7)

Centralized validation in `server/utils/pathSecurity.js`:
- `isValidProjectName()` - Strict alphanumeric validation
- `safePath()` - Ensures paths stay within allowed directories
- `validateProjectNameMiddleware` - Express middleware

### Content Security Policy (v1.0.18)

Nonce-based CSP with per-request cryptographic nonces:
- Script and style sources restricted to `'self'` + nonce
- `'unsafe-eval'` retained for xterm.js WebGL renderer
- CSP nonce injected via `<meta name="csp-nonce">`

### Rate Limiting

Three tiers of protection:

| Limiter | Limit | Scope |
|---------|-------|-------|
| General | 1000 req/15 min | All endpoints |
| Strict | 10 req/min | Destructive operations |
| Auth | 10 req/15 min | Login attempts |

### Security Headers (Helmet)

- HSTS with 1-year max-age
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

---

## API Architecture (v1.0.16+)

Centralized API service layer for consistent error handling and tracing.

### Frontend API Service

`src/services/api.js` provides:
- Unified request handling with timeouts (30s default)
- `ApiError` class with `getUserMessage()` for user-friendly errors
- X-Request-ID headers for end-to-end tracing
- Automatic retry with exponential backoff
- Sentry breadcrumbs for all requests

### Domain API Modules (35+)

```
src/services/
├── api.js              # Core service + ApiError class
├── responseSchemas.js  # Zod schemas for response validation
├── projectsApi.js      # Project operations
├── dockerApi.js        # Container management
├── gitApi.js           # Git operations
├── agentsApi.js        # Agent management
├── firewallApi.js      # UFW firewall
└── ...                 # 30+ more modules
```

### Response Validation

Optional Zod validation via `validated()` wrapper:

```javascript
// Non-blocking: warns on failure, returns original data
const stats = await systemApi.getStats();
```

### Hooks

- `useApiQuery` - GET requests with loading/error/data states
- `useApiMutation` - POST/PUT/DELETE operations
- `useApiQueries` - Parallel data fetching

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
- shpool sessions named `sp-{project_name}` (migrated from tmux `cp-*` in v1.0.1)
- Socket.IO for all real-time updates (37 events across 14 files)
- Prisma 7 with PrismaPg adapter
- 11 glassmorphism themes available
- Widget-based sidebars with height snapping
- Centralized API service (`src/services/api.js`) with 35+ domain modules

### Known Gotchas
- CPU stats require delta calculation between readings
- Version must be updated in 6 locations on release
- Terminal resize requires explicit Socket.IO event
- Session reconnect needs existing shpool session
- localStorage keys use `cw-` prefix for consistency
- API responses validated with Zod schemas (non-blocking warnings in dev)

### Sidebar Configuration
- Left sidebar: `cw-sidebar-left-widgets`
- Right sidebar: `cw-sidebar-right-widgets`
- Projects widget defaults to fill remaining space

---

Created: 2024-10-01
Version: 1.0.25
