# Console.web

### Your AI-Powered Development Command Center

**Stop context-switching. Start shipping.**

Console.web transforms how you work with AI coding assistants. Instead of juggling terminal windows, losing session context, and manually managing infrastructure, you get a unified dashboard where Claude Code sessions persist forever, terminals survive disconnects, and your entire development stack is one click away.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONSOLE.WEB v1.0.26                                          ⚡ LIVE       │
├─────────────┬───────────────────────────────────────────────────────────────┤
│             │                                                               │
│  📁 PROJECTS│   $ claude "refactor auth to use JWT"                        │
│  ├─ api     │   ✓ Analyzing codebase structure...                          │
│  ├─ web ◀   │   ✓ Found 12 files with auth logic                           │
│  └─ mobile  │   ✓ Creating migration plan...                               │
│             │   ✓ Updating src/auth/provider.ts                            │
│  ⭐ FAVORITES│   ✓ Updating src/middleware/auth.ts                          │
│  ├─ console │   ✓ Running tests... 47/47 passed                            │
│  └─ agents  │                                                               │
│             │   Ready for next command.                                     │
│  📊 SYSTEM  │   _                                                           │
│  CPU: 23%   ├───────────────────────────────────────────────────────────────┤
│  MEM: 4.2GB │  [PROJECTS] [SERVER] [AGENTS] [SECURITY] [SETTINGS]          │
│  DISK: 67%  │                                                               │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 🎯 The Problem

Working with AI coding assistants today is **fragmented**:

- **Sessions disappear** when you close your browser or lose connection
- **Context is lost** switching between projects and terminals
- **No visibility** into what your AI agents are doing across projects
- **Manual overhead** managing infrastructure, containers, git, deployments
- **Security blind spots** - no unified view of vulnerabilities across your stack

You're constantly rebuilding context, re-explaining your codebase, and context-switching between tools.

## ✨ The Solution

Console.web gives you **persistent AI sessions** backed by shpool, a **unified dashboard** for all your projects, and **one-click infrastructure management** - all in a beautiful, themeable interface.

### Sessions That Never Die

```bash
# Your Claude session survives everything:
✓ Browser refresh → Session continues
✓ Network disconnect → Reconnects automatically
✓ Server restart → Sessions persist in shpool
✓ Multiple devices → Same session, anywhere
```

### Everything in One Place

| What You Get | What It Replaces |
|--------------|------------------|
| Persistent terminal sessions | tmux + terminal tabs + SSH sessions |
| Project dashboard with metrics | Manual project tracking |
| Docker container management | Docker Desktop + CLI |
| Git workflow UI | GitKraken / CLI juggling |
| Security scanning dashboard | Multiple CLI tools |
| AI agent automation | Custom scripts everywhere |
| MCP server catalog | Manual MCP configuration |

---

## 🚀 Key Features

### 🖥️ Persistent AI Terminal Sessions
- **Shpool-backed sessions** survive browser closes, network drops, and server restarts
- **Full terminal emulation** with xterm.js - colors, vim, spinners, everything works
- **Multi-project support** - switch projects without losing any session context
- **Session history** with searchable command logs

### 🤖 AI Agent Marketplace
- **13+ pre-built agents** for code quality, security, testing, git workflows
- **One-click install** with customizable triggers and scopes
- **Build custom agents** with shell commands, API calls, or MCP tools
- **Automatic execution** on file changes, schedules, or git events

### 🔒 Security Dashboard
- **Unified vulnerability view** across all projects
- **Pre-push sanitization** catches secrets before they leak
- **Integrated scanning** with Semgrep, Gitleaks, Trivy
- **Firewall management** with UFW integration

### 📊 Full Observability
- **Prometheus metrics** for requests, latency, database, WebSocket connections
- **Sentry integration** with request ID tracing through the stack
- **Grafana dashboards** for visualization
- **Alert rules** for error rates, latency, and resource exhaustion

### 🐳 Infrastructure Control
- **Docker management** - start, stop, restart, view logs for all containers
- **Service monitoring** - systemd services at a glance
- **Cloudflare Tunnels** - one-click publish with automatic DNS
- **Real-time system stats** - CPU, memory, disk, network

### 🎨 Developer Experience
- **11 glassmorphism themes** including dark mode, ocean, sepia
- **Command palette** (⌘K) for quick actions
- **Prompt library** with variable substitution
- **MCP server catalog** - 22+ servers with one-click setup

### 🔐 Enterprise Features (v1.0.21+)
- **Role-Based Access Control (RBAC)** - 4-tier hierarchy: SUPER_ADMIN, ADMIN, USER, VIEWER
- **Resource Quotas** - Per-user limits on sessions, agents, prompts, snippets
- **API Key Authentication** - Scoped keys (read, write, agents, admin) with IP whitelisting
- **Per-User Rate Limiting** - Sliding window algorithm with X-RateLimit headers
- **Audit Logging** - Complete audit trail for compliance
- **Ownership-Based Data Isolation** - Users see only their own resources

---

## 📦 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- [shpool](https://github.com/shell-pool/shpool) for session persistence
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/console-web.git
cd console-web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings:
#   DATABASE_URL=postgresql://...
#   ANTHROPIC_API_KEY=sk-ant-...
#   PROJECTS_DIR=~/Projects

# Setup database
npx prisma db push
npx prisma generate

# Start development server
npm run dev

# Open http://localhost:7777
```

### Docker Deployment

```bash
docker-compose up -d
# Access at http://localhost:7777
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Console.web v1.0.26                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │               React Frontend (109 Components, Vite + Tailwind)      │   │
│   │  Terminal │ Dashboard │ Projects │ Security │ Settings │ Agents    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                             Socket.IO + REST                                │
│                                    │                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                Express Backend (45 Route Files, RBAC Middleware)    │   │
│   │  Sessions │ Docker │ Git │ Agents │ Search │ Monitoring │ Security │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│   ┌──────────────┬─────────────────┼─────────────────┬──────────────────┐   │
│   │   Shpool     │   PostgreSQL    │   Prometheus    │   Sentry         │   │
│   │  (Sessions)  │  (Prisma, 61    │   (Metrics)     │  (Errors)        │   │
│   │              │    models)      │                 │                  │   │
│   └──────────────┴─────────────────┴─────────────────┴──────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, xterm.js (109 components) |
| **Backend** | Node.js, Express, Socket.IO (45 routes, 89 files with tests) |
| **Database** | PostgreSQL with Prisma 7 (61 models) |
| **Sessions** | shpool (persistent terminal sessions) |
| **Containers** | Dockerode |
| **Observability** | Prometheus, Grafana, Loki, Sentry, OpenTelemetry |
| **Security** | RBAC, Helmet, Zod validation, rate limiting, API keys |
| **Auth** | Authentik SSO, JWT, API key authentication |

---

## 📊 Observability Stack

Console.web includes a complete observability setup in the `monitoring/` directory:

```bash
cd monitoring
docker-compose up -d
```

This gives you:
- **Prometheus** metrics collection with 20+ custom metrics
- **Grafana** dashboards for visualization
- **Loki + Promtail** for log aggregation
- **Alert rules** for error rates, latency, pool exhaustion

---

## 🔐 Security

Console.web is designed for self-hosted environments with defense in depth:

- **Authentik SSO** integration for enterprise authentication
- **Pre-push hooks** scan for secrets and PII before commits reach GitHub
- **Input validation** with Zod schemas on all endpoints
- **Rate limiting** to prevent abuse
- **Security headers** via Helmet
- **Request ID tracing** through the entire stack

### Recommended Deployment

1. Run behind a reverse proxy (nginx/Caddy) with HTTPS
2. Enable Authentik authentication for access control
3. Use Cloudflare Tunnel for secure external access
4. Configure `TRUSTED_PROXY_IPS` for your infrastructure

---

## 🧪 Testing

Console.web has comprehensive test coverage with ~2,000 tests across unit, integration, and E2E tests.

```bash
# Frontend tests (975 tests)
npm test

# Backend route tests (~950 tests)
npm run test:server

# All tests
npm run test:all

# E2E tests with Playwright (36 tests)
npm run test:e2e

# Coverage report
npm run test:coverage

# Storybook component library
npm run storybook
```

**Test Coverage:**
- 109/109 React components have test files
- 44/44 backend route files have comprehensive tests
- E2E tests cover terminal, projects, server, and security workflows

---

## 📚 Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Version history, release notes, and stability roadmap summary
- [CLAUDE.md](./CLAUDE.md) - AI agent context and project documentation
- [ENTERPRISE_ROADMAP.md](./ENTERPRISE_ROADMAP.md) - Enterprise features & RBAC implementation
- [INSTALL.md](./INSTALL.md) - Installation guide for standalone deployment
- [monitoring/README.md](./monitoring/README.md) - Observability stack setup

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to the `main` branch.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>Built for developers who ship fast and break nothing.</strong>
  <br>
  <sub>Stop managing infrastructure. Start building.</sub>
</p>
