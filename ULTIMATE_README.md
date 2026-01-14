# Console.web

## The Ultimate Command Center for Claude Code & AI Development

> **WARNING: THIS IS A WORK IN PROGRESS!**
>
> We are building the plane while flying it. Features are shipping fast, bugs are being squashed, and things are changing daily. Buckle up and enjoy the ride!

---

## Why Console.web?

You're tired of juggling 50 terminal tabs. You're losing track of which Claude session is doing what. You need a **cockpit**.

**Console.web** is the missing link between your chaotic terminal and a polished development workflow. It's a web-based, persistence-first dashboard designed specifically for managing Claude Code projects, AI agents, and your entire dev infrastructure.

It's not just a terminal; it's your **AI Mission Control**.

---

## Killer Features

### Persistent "Forever" Sessions

Stop losing context when you close a tab.

- **tmux-backed Magic**: Browser refresh? Wifi drop? Laptop reboot? Your sessions survive it all.
- **Multi-Tasking**: Switch between active Claude sessions instantly without losing state.
- **Keyboard Navigation**: `Ctrl+]` / `Ctrl+[` to cycle sessions, `Ctrl+1-9` for direct access.

### AI Agent Marketplace

Automate the boring stuff.

- **One-Click Deploys**: Install pre-built agents for Code Quality, Testing, Docs, and DevOps.
- **Custom Agents**: Build your own automation bots using shell commands or MCP tools.
- **Agent Dashboard**: Monitor active agents and view their outputs in real-time.

### Infrastructure at a Glance

- **Real-time Monitoring**: CPU, RAM, and Disk stats streamed directly to your dashboard.
- **Docker Control Center**: Manage containers without leaving the app.
- **Cloudflare Tunnels**: Publish your work to the web with a single click.

### Fort Knox Security (v2.9.0+)

- **Push Sanitization**: Automatically scan for secrets and PII before you push.
- **Integrated Scanners**: Built-in support for Semgrep, Gitleaks, and Trivy.
- **Security Dashboard**: A dedicated view for your project's health and vulnerabilities.

### GitHub Superpowers

- **Visual Git**: Browse, clone, and push repositories without typing `git status` for the 100th time.
- **Action Viewer**: See your CI/CD pipeline status right next to your code.
- **Sync Detection**: Real-time ahead/behind/modified status for all linked repos.

---

## Quick Start

### The Docker Way (Recommended)

```bash
docker run -d \
  -p 5275:5275 \
  -v /path/to/your/projects:/projects \
  -e ANTHROPIC_API_KEY=your-key \
  -e DATABASE_URL=postgresql://... \
  ghcr.io/thornburywn2/console-web:latest
```

### The Hacker Way (Local Dev)

```bash
# Clone the beast
git clone https://github.com/thornburywn2/console-web.git
cd console-web

# Setup env
cp .env.example .env
npm install

# Ignite
npx prisma db push
npm run dev

# Open http://localhost:7777 and ascend.
```

---

## Customization Prompt

Use this prompt with Claude Code to customize Console.web for your needs:

```
I just cloned Console.web from GitHub. Help me customize it for my environment.

Here's what I need:

**Authentication:**
- [ ] Keep Authentik SSO (I have Authentik)
- [ ] Remove Authentik (I'll handle auth differently)
- [ ] Make it work without any auth (local development only)

**Infrastructure Integrations:**
- [ ] Keep Cloudflare Tunnel publishing
- [ ] Remove Cloudflare integration
- [ ] Keep Docker management
- [ ] Remove Docker features
- [ ] Keep Systemd service management
- [ ] Remove Systemd integration

**Security Features:**
- [ ] Keep pre-push sanitization hooks
- [ ] Remove security scanning pipeline
- [ ] Keep Semgrep/Gitleaks/Trivy integration
- [ ] Use only basic secret detection

**Database:**
- [ ] Use PostgreSQL (production ready)
- [ ] Use SQLite (simpler setup)
- [ ] Keep existing Prisma schema
- [ ] Simplify schema (remove unused models)

**Features to Remove:**
- [ ] Agent Marketplace
- [ ] MCP Server Catalog
- [ ] Voice Commands
- [ ] Collaboration features (sharing, comments, handoffs)
- [ ] Workflow automation
- [ ] Uptime monitoring

**Features to Keep (Core):**
- [x] Terminal sessions with tmux persistence
- [x] Project browser/sidebar
- [x] Theme system
- [x] Keyboard shortcuts

Please:
1. Identify all files that need modification for my selections
2. Create a migration plan with the order of changes
3. Warn me about any breaking dependencies
4. Generate the necessary code changes

My environment:
- OS: [your OS]
- Projects directory: [your path]
- Using Docker: [yes/no]
```

---

## Architecture

```
+-------------------------------------------------------------+
|                     Browser (React 18)                       |
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
|  |   (API)   |  | (PTY Manager) |  |   (PostgreSQL)   |      |
|  +-----------+  +-------+-------+  +--------+---------+      |
+-------------------------|------------------|----------------+
                          |                  |
+-------------------------v--+    +----------v-----------+
|       tmux Sessions        |    |     PostgreSQL       |
|  +--------+ +--------+     |    |  +----------------+  |
|  |cp-proj1|  |cp-proj2|    |    |  | 51 Models      |  |
|  |[claude]|  |[claude]|    |    |  | Sessions, etc. |  |
|  +--------+ +--------+     |    |  +----------------+  |
+----------------------------+    +----------------------+
```

---

## What's Next? (The Roadmap)

Since this is a WIP, here is what we are cooking up in the lab:

- [ ] Voice Command Interface: Talk to your infrastructure.
- [ ] Mobile Layout: Monitor deploys from your phone.
- [ ] Plugin System: Community-built widgets for the dashboard.
- [ ] Team Organizations: Role-based access control for larger teams.
- [ ] Home Dashboard: 10,000-foot overview of all projects and infrastructure.

---

## Component Overview

| Component | Purpose | Removable? |
|-----------|---------|------------|
| **Terminal (xterm.js)** | Browser-based terminal | Core - Required |
| **Sidebar** | Project navigation | Core - Required |
| **tmux Integration** | Session persistence | Core - Required |
| **Authentik Auth** | SSO authentication | Yes - See prompt |
| **Cloudflare Tunnels** | One-click publish | Yes - See prompt |
| **Docker Management** | Container control | Yes - See prompt |
| **GitHub Integration** | Repo management | Partially removable |
| **Agent Marketplace** | Pre-built automation | Yes - See prompt |
| **MCP Catalog** | Claude Code extensions | Yes - See prompt |
| **Security Scanners** | Pre-push hooks | Yes - See prompt |
| **Uptime Monitoring** | Service health checks | Yes - See prompt |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend server port (default: 5275) |
| `PROJECTS_DIR` | Yes | Your projects directory |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | For Claude CLI integration |
| `AUTH_ENABLED` | No | Enable/disable Authentik SSO |
| `AUTHENTIK_URL` | If auth | Authentik server URL |
| `CLOUDFLARE_ACCOUNT_ID` | If tunnels | Cloudflare account |
| `GITHUB_TOKEN` | If GitHub | GitHub PAT for API access |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+]` | Next session |
| `Ctrl+[` | Previous session |
| `Ctrl+1-9` | Switch to session 1-9 |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+A` | Admin dashboard |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+N` | New session |
| `Ctrl+W` | Close session |
| `F11` | Toggle fullscreen |
| `Escape` | Close modal/exit focus mode |

---

## Contributing

Found a bug? Want to add a feature? We need you!

Since this project is moving fast, check the ISSUES tab or join the discussion. PRs are welcome, but maybe ping us first to make sure we aren't already building it!

---

## License

MIT

---

Built with late nights, too much coffee, and an unhealthy obsession with making Claude Code actually useful.
