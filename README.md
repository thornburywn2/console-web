# Claude Code Manager

A web-based GUI wrapper for the `claude-code` CLI with persistent tmux sessions. Manage multiple Claude coding sessions across your projects from a single interface.

## Features

### Core
- **Project Sidebar**: Browse, search, and favorite projects from your configured directory
- **Persistent Sessions**: Claude sessions run in tmux, surviving browser refreshes and disconnects
- **Full Terminal Experience**: xterm.js provides complete terminal emulation (colors, spinners, vim keybindings)
- **Multi-Session Support**: Switch between active Claude sessions without losing context
- **Dark Mode**: Native dark theme optimized for terminal work

### Organization
- **Folders & Tags**: Organize sessions with hierarchical folders and color-coded tags
- **Session Notes**: Attach markdown notes to sessions
- **Templates**: Create session templates for quick setup
- **Favorites**: Pin frequently used projects for quick access

### Libraries
- **Prompt Library**: Reusable prompt templates with variable substitution
- **Command Snippets**: Quick access to common commands
- **Custom Shortcuts**: Configurable keyboard bindings

### AI Features
- **AI Personas**: Configure different AI personalities with custom system prompts
- **Token Tracking**: Monitor API usage and costs
- **Error Analysis**: AI-powered error explanations

### Collaboration
- **Session Sharing**: Share sessions with expiring links and optional passwords
- **Comments**: Inline comments and discussion threads
- **Team Handoffs**: Transfer sessions with context to team members
- **Activity Feed**: Track team activity

### Developer Tools
- **Git Integration**: Commit, push, pull, and manage branches
- **File Browser**: Explore project files with preview
- **Database Browser**: Query and edit database tables
- **Port Wizard**: Manage port allocations and conflicts
- **Environment Sync**: Manage .env files across environments

### System Admin
- **System Stats**: Real-time CPU, memory, and disk monitoring
- **Docker Control**: Container lifecycle management
- **Service Monitoring**: Uptime checks and alerts
- **Workflow Automation**: Build automated task sequences

## Requirements

- Node.js 18+
- PostgreSQL 14+
- tmux installed on the server
- `claude-code` CLI installed globally (`npm install -g @anthropic-ai/claude-code`)
- Anthropic API key configured

## Quick Start

### Local Development

```bash
# Clone the repository
cd ~/Projects/claude-code-manager

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# - Set PROJECTS_DIR to your projects folder
# - Set ANTHROPIC_API_KEY for claude CLI
# - Set DATABASE_URL for PostgreSQL

# Install dependencies
npm install

# Setup database
npx prisma db push
npx prisma generate

# Start development servers (frontend:7777 + backend:5275)
npm run dev

# Open http://localhost:7777
```

### Production (Docker)

```bash
# Build and run with docker-compose
docker-compose up -d

# Or build manually
docker build -t claude-code-manager .
docker run -d \
  -p 5275:5275 \
  -v /path/to/your/projects:/projects \
  -e ANTHROPIC_API_KEY=your-key \
  -e DATABASE_URL=postgresql://... \
  claude-code-manager
```

### Production URL

Access at: https://manage.wbtlabs.com

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `5275` |
| `PROJECTS_DIR` | Directory containing your projects | `/home/thornburywn/Projects` |
| `CLIENT_URL` | Frontend URL for CORS | `https://manage.wbtlabs.com` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment mode | `development` |
| `ANTHROPIC_API_KEY` | API key for Claude CLI | Required |
| `AUTH_ENABLED` | Enable Authentik authentication | `true` |
| `AUTHENTIK_URL` | Authentik server URL | `https://auth.wbtlabs.com` |

## Architecture

```
+-------------------------------------------------------------+
|                     Browser (React)                          |
|  +-----------+  +---------------------------------------+    |
|  |  Sidebar  |  |           xterm.js                    |    |
|  | (Projects)|  |      (Terminal Emulator)              |    |
|  +-----------+  +---------------------------------------+    |
+----------------------------+--------------------------------+
                             | Socket.IO (WebSocket)
+----------------------------v--------------------------------+
|                   Node.js Backend                            |
|  +-----------+  +---------------+  +------------------+      |
|  |  Express  |  |   node-pty    |  |     Prisma       |      |
|  |   (API)   |  | (PTY Manager) |  |   (Database)     |      |
|  +-----------+  +-------+-------+  +--------+---------+      |
+-------------------------|------------------|----------------+
                          |                  |
+-------------------------v--+    +----------v-----------+
|       tmux Sessions        |    |     PostgreSQL       |
|  +--------+ +--------+     |    |  +----------------+  |
|  |ccm-proj|  |ccm-proj|    |    |  | Sessions, Tags |  |
|  |[claude]|  |[claude]|    |    |  | Prompts, etc.  |  |
|  +--------+ +--------+     |    |  +----------------+  |
+----------------------------+    +----------------------+
```

## Session Persistence

Sessions are managed by tmux with naming convention `ccm-{project_name}`. This means:

- **Browser Refresh**: Sessions continue running, reconnect automatically
- **Server Restart**: tmux sessions persist, reattach on startup
- **Multiple Clients**: Multiple browsers can view the same session
- **Database Backup**: Session state persisted to PostgreSQL

### Manual Session Management

```bash
# List all claude-code-manager sessions
tmux list-sessions | grep ccm-

# Attach to a session directly
tmux attach -t ccm-myproject

# Kill a specific session
tmux kill-session -t ccm-myproject
```

## Security Considerations

This application is designed to run behind a reverse proxy (e.g., Nginx with Authentik). It binds to `0.0.0.0` but includes Authentik OAuth2 authentication.

**Recommended Setup:**
1. Run behind Authentik or another auth proxy
2. Use HTTPS termination at the proxy level
3. Limit network access to trusted networks
4. Configure `TRUSTED_PROXY_IPS` for proxy validation

## Development

```bash
# Run backend only
npm run dev:server

# Run frontend only
npm run dev:client

# Run both with concurrently
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
npm run test:coverage
```

## Database

```bash
# Apply schema changes
npx prisma db push

# Generate Prisma client
npx prisma generate

# Open database GUI
npx prisma studio

# Create migration
npx prisma migrate dev --name your_migration_name
```

## License

MIT
