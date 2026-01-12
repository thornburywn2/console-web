# CLAUDE.md

**Project:** Command Portal (claude-code-manager)
**Version:** 2.10.0
**Last Updated:** 2026-01-12
**Type:** Web Application
**Port:** 7777 (Frontend), 5275 (API)

---

## Project Overview

Command Portal is a comprehensive web-based management interface for Claude Code projects. It provides real-time terminal access, system monitoring, Docker management, and project organization - a one-stop shop for managing development infrastructure.

### Key Features

- **Terminal Sessions**: Browser-based terminals with tmux persistence (sessions survive disconnects)
- **Project Management**: Browse, organize, favorite projects, and track completion metrics
- **Session Organization**: Folders, tags, notes, templates, and session handoffs
- **Prompt & Snippet Libraries**: Reusable prompts and command snippets
- **AI Integration**: Personas, token usage tracking, cost dashboard, error analysis
- **Collaboration**: Session sharing, comments, activity feed, team handoffs
- **System Admin**: CPU/memory/disk monitoring, systemd services, network stats
- **Docker Control**: Container lifecycle management, logs, stats, images
- **Git Workflow**: Commit, push, pull, branches, diff viewer
- **Developer Tools**: Port wizard, database browser, API tester, env sync
- **Automation**: Workflow builder, scheduled tasks, alert rules, macros
- **Sovereign Stack**: Health monitoring for self-hosted services (Authentik, Open WebUI, etc.)

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
claude-code-manager/
├── server/
│   ├── index.js              # Main Express + Socket.IO server
│   ├── middleware/
│   │   └── authentik.js      # Authentik SSO authentication
│   ├── routes/               # 18 modular API route handlers
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
│   │   └── devtools.js       # Ports, env, database
│   └── services/
│       └── metrics.js        # Metrics collection service
├── src/
│   ├── App.jsx               # Main React app
│   ├── main.jsx              # Entry point
│   ├── index.css             # Global styles
│   ├── components/           # 76 React components
│   │   ├── Terminal.jsx          # xterm.js terminal
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
| `CLIENT_URL` | https://manage.wbtlabs.com | CORS origin |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | - | Claude CLI API key |
| `AUTH_ENABLED` | true | Enable Authentik proxy auth |
| `AUTHENTIK_URL` | https://auth.wbtlabs.com | Authentik server URL |
| `AUTHENTIK_CLIENT_ID` | claude-manager | OAuth2 client ID |
| `AUTHENTIK_CLIENT_SECRET` | - | OAuth2 client secret |
| `AUTHENTIK_PROXY_SECRET` | - | Proxy validation secret |
| `TRUSTED_PROXY_IPS` | 172.17.0.0/16 | Trusted CIDR ranges |

---

## Project-Specific Rules

1. **Session Persistence**: All terminal sessions are backed by tmux and PostgreSQL
2. **No Mock Data**: All data comes from live system queries or database
3. **Real-time Updates**: Use Socket.IO for terminal and status updates
4. **PM2 Process**: Production runs via PM2 as `claude-code-manager`
5. **Delta CPU Calculation**: CPU stats use delta between readings for accuracy
6. **Version Control**: When releasing a new version, update ALL of these locations:
   - `package.json` - version field (line 3)
   - `CLAUDE.md` - Version header (line 4)
   - `src/App.jsx` - header version badge (~line 441)
   - `src/components/AdminDashboard.jsx` - footer version (~line 1670)
   - `src/components/ChangelogWidget.jsx` - add new entry to CHANGELOG_ENTRIES array
   - `CHANGELOG.md` - add new version section at top

---

## API Endpoints

### Core
- `GET /api/projects` - List all projects
- `GET /api/projects-extended` - Projects with completion metrics
- `GET /api/settings` - User preferences
- `PUT /api/settings` - Update preferences

### Admin
- `GET /api/admin/system` - System stats (CPU, memory, disk)
- `GET /api/admin/docker/*` - Docker operations
- `GET /api/admin/services` - Systemd services
- `GET /api/admin/claude-md/:project` - Read project CLAUDE.md
- `PUT /api/admin/claude-md/:project` - Update project CLAUDE.md

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

### Automation
- `GET/POST/PUT/DELETE /api/workflows` - Workflows
- `POST /api/workflows/:id/execute` - Run workflow
- `GET/POST/PUT/DELETE /api/alerts` - Alert rules

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
- Workflow, WorkflowExecution, ScheduledTask, MacroRecording

### Collaboration
- SharedSession, SessionComment, Activity, TeamMember, SessionHandoff

### AI
- AIPersona, APIUsage

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
bash ~/Projects/agents/lifecycle/AGENT-016-LIFECYCLE-MANAGER.sh scan /home/thornburywn/Projects/claude-code-manager

# Security audit
bash ~/Projects/agents/lifecycle/AGENT-018-SECURITY.sh scan /home/thornburywn/Projects/claude-code-manager

# Quality check
bash ~/Projects/agents/lifecycle/AGENT-019-QUALITY-GATE.sh all /home/thornburywn/Projects/claude-code-manager
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

## Integration Points

- **Authentik SSO**: auth.wbtlabs.com
- **Cloudflare Tunnel**: manage.wbtlabs.com
- **PostgreSQL**: Shared database server
- **Docker**: Container management via socket
- **BMAD Agents**: `~/Projects/agents/lifecycle/`

---

## Notes for AI Agents

### Project-Specific Patterns
- tmux sessions named `ccm-{project_name}`
- Socket.IO for all real-time updates
- Prisma 7 with PrismaPg adapter
- 11 glassmorphism themes available

### Known Gotchas
- CPU stats require delta calculation between readings
- Version must be updated in 6 locations on release
- Terminal resize requires explicit Socket.IO event
- Session reconnect needs existing tmux session

---

Created: 2024-10-01
Version: 2.8.0
