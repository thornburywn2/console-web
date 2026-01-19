# Console.web Deployment Prompt for AI Assistants

> **Use this prompt with Claude Code, ChatGPT, or any AI assistant to deploy Console.web on Windows via WSL.**

---

## The Prompt

Copy and paste everything below the line into your AI assistant:

---

```
I want to deploy Console.web from GitHub on my Windows machine using WSL (Windows Subsystem for Linux). Please guide me through an interactive, end-to-end deployment.

## Project Repository
https://github.com/thornburywn2/console-web

## My Environment
- Windows with WSL2 installed
- I will run all commands inside WSL (Ubuntu recommended)
- Authentication will be DISABLED (local development mode)

## What I Need You To Do

### Phase 1: Environment Check
Check if I have these prerequisites installed in WSL. For each missing item, provide the installation command and wait for me to confirm before proceeding:

1. **WSL2 with Ubuntu** - Confirm I'm running inside WSL
2. **Node.js 18+** - Check with `node --version`
3. **npm or bun** - Check package manager availability
4. **PostgreSQL 14+** - Check if postgres is installed and running
5. **tmux** - Required for persistent terminal sessions
6. **Git** - For cloning the repository

### Phase 2: Project Setup
Once prerequisites are confirmed:

1. Ask me where I want to install the project (default: ~/Projects/console-web)
2. Clone the repository to that location
3. Install dependencies with npm install

### Phase 3: Database Configuration
Guide me through PostgreSQL setup:

1. Check if PostgreSQL service is running
2. Help me create a database user and database for the project
3. Ask me for my preferred:
   - Database name (default: console_web)
   - Database user (default: console_web)
   - Database password (I'll provide this)
4. Generate the DATABASE_URL connection string

### Phase 4: Environment Configuration
Create the .env file by asking me for each value:

**Required:**
- PROJECTS_DIR: Where are my development projects? (default: ~/Projects)
- DATABASE_URL: (from Phase 3)
- ANTHROPIC_API_KEY: Do I have one? (can be set later)

**Optional - Ask if I want to configure:**
- GitHub Integration (GITHUB_TOKEN)
- Cloudflare Tunnels (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN)
- Custom ports (default: 7777 frontend, 5275 backend)

**Disabled by Default:**
- AUTH_ENABLED=false (Authentik SSO disabled)

### Phase 5: Database Initialization
1. Run Prisma to create the database schema
2. Generate the Prisma client
3. Verify database connection

### Phase 6: Build and Start
1. Build the frontend for production
2. Start the application
3. Provide me the URL to access it

### Phase 7: Verification
1. Confirm the app is accessible at http://localhost:7777
2. Test that the backend API responds at http://localhost:5275/api/health
3. Show me how to access from Windows browser (usually same URLs work)

### Phase 8: Optional Enhancements
Ask if I want to set up any of these:

1. **PM2 Process Manager** - Keep the app running in background
2. **Systemd Service** - Auto-start on WSL boot
3. **Docker Deployment** - Run everything in containers instead
4. **Cloudflare Tunnel** - Expose to internet securely

## Important Notes

- Wait for my confirmation after each major step before proceeding
- If any command fails, help me troubleshoot before moving on
- Provide copy-paste ready commands for WSL/bash
- Remind me that all commands should be run INSIDE WSL, not PowerShell
- The default authentication is DISABLED - this is for local development only

## My Responses
I will respond with:
- "done" or "completed" when a step is finished
- "error" followed by the error message if something fails
- "skip" if I want to skip an optional step
- Answers to your questions when you ask for input

Let's begin! Start with Phase 1: Environment Check.
```

---

## Quick Reference

### Minimum .env Configuration

```bash
# Required
PORT=5275
VITE_PORT=7777
PROJECTS_DIR=~/Projects
DATABASE_URL=postgresql://console_web:yourpassword@localhost:5432/console_web
NODE_ENV=development

# Auth disabled for local development
AUTH_ENABLED=false

# Optional - set later if needed
ANTHROPIC_API_KEY=
GITHUB_TOKEN=
```

### Common WSL Commands

```bash
# Check if inside WSL
uname -a  # Should show "Linux" and "microsoft"

# Install prerequisites (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql postgresql-contrib tmux git curl

# Or use NodeSource for latest Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Start PostgreSQL
sudo service postgresql start

# Create database and user
sudo -u postgres psql -c "CREATE USER console_web WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE console_web OWNER console_web;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE console_web TO console_web;"
```

### Accessing from Windows

WSL and Windows share localhost, so after starting the app:
- Frontend: http://localhost:7777
- Backend API: http://localhost:5275

### Troubleshooting

| Issue | Solution |
|-------|----------|
| PostgreSQL won't start | `sudo service postgresql start` |
| Port already in use | `lsof -i :7777` then `kill -9 <PID>` |
| Permission denied | Check file ownership with `ls -la` |
| Node modules error | `rm -rf node_modules && npm install` |
| Prisma error | `npx prisma generate && npx prisma db push` |
| Can't access from Windows | Check Windows Firewall settings |

---

## Alternative: Docker Deployment Prompt

If you prefer Docker, use this prompt instead:

```
I want to deploy Console.web using Docker on my Windows machine with WSL2.

Repository: https://github.com/thornburywn2/console-web

Prerequisites:
- Docker Desktop for Windows with WSL2 backend
- Git installed in WSL

Please guide me through:

1. Clone the repository
2. Create a .env file with AUTH_ENABLED=false
3. Ask me for my PROJECTS_DIR path (where my dev projects are)
4. Run docker-compose up -d
5. Verify the deployment at http://localhost:7777

I want interactive guidance - ask me questions and wait for my responses.
```

---

## Post-Deployment Configuration

After Console.web is running, you can configure additional features through the web interface:

1. **Admin Dashboard** (Ctrl+Shift+A): System settings and integrations
2. **Settings Panel** (Ctrl+,): Theme, shortcuts, preferences
3. **GitHub Integration**: Settings > Integrations > GitHub
4. **Cloudflare Tunnels**: Settings > Integrations > Cloudflare

### Adding Anthropic API Key Later

```bash
# Edit the .env file
nano ~/Projects/console-web/.env

# Add or update:
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Restart the application
cd ~/Projects/console-web
npm run build
npm start
```

---

## Full Feature Deployment Prompt

For users who want ALL features including optional integrations:

```
Deploy Console.web with full features on Windows WSL:

Repository: https://github.com/thornburywn2/console-web

I want to configure:
- [x] PostgreSQL database
- [x] Disabled authentication (AUTH_ENABLED=false)
- [ ] GitHub Integration (I'll provide a token)
- [ ] Cloudflare Tunnels (I'll provide credentials)
- [ ] PM2 for process management
- [ ] Docker management features

Guide me interactively through each step. Ask for my input when needed.
Start by checking my WSL environment prerequisites.
```

---

## Security Notes

This deployment prompt disables authentication by default. This is suitable for:
- Local development on your machine
- Testing and evaluation
- Single-user environments

For production or multi-user deployments, you should:
1. Enable authentication (Authentik SSO or implement your own)
2. Use HTTPS (via Cloudflare Tunnel or reverse proxy)
3. Restrict network access
4. Set strong database passwords
5. Keep API keys secure

---

**Version:** 1.0.0
**Last Updated:** 2026-01-15
**Repository:** https://github.com/thornburywn2/console-web
