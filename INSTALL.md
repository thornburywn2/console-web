# Console.web Installation Guide

## Quick Start (Windows WSL2)

Console.web is designed to run on Windows via WSL2 (Windows Subsystem for Linux), providing a full-featured AI development environment without the complexity of server configuration.

### One-Line Install

Open **PowerShell as Administrator** and run:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/YOUR_GITHUB_USER/console-web/main/scripts/windows-setup.ps1 | iex
```

This will:
1. Install WSL2 and Ubuntu (if not present)
2. Install Node.js, PostgreSQL, and dependencies
3. Clone and set up Console.web
4. Start the application

After installation, open **http://localhost:7777** in your browser.

---

## What is Console.web?

Console.web is a web-based management interface for AI-assisted development. It provides:

- **Browser-based terminals** with persistent sessions
- **Code Puppy** - Your AI coding companion
- **Project management** with templates and tracking
- **Real-time system monitoring**
- **One-click deployment** tools

### Why WSL2?

WSL2 provides the best of both worlds:
- Full Linux environment for development tools
- Native Windows integration
- Excellent performance
- Easy setup and maintenance

---

## Manual Installation

If you prefer manual installation, follow these steps:

### Prerequisites

- Windows 10 version 2004+ or Windows 11
- WSL2 with Ubuntu 22.04
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space

### Step 1: Install WSL2

Open PowerShell as Administrator:

```powershell
wsl --install -d Ubuntu-22.04
```

Restart your computer when prompted, then complete Ubuntu setup.

### Step 2: Install Dependencies

In your WSL2 Ubuntu terminal:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start

# Create database
sudo -u postgres createuser -s $USER
createdb console_web

# Install PM2
npm install -g pm2
```

### Step 3: Clone and Setup

```bash
# Clone the repository
cd ~
git clone https://github.com/YOUR_GITHUB_USER/console-web.git
cd console-web

# Install dependencies
npm install

# Setup environment
cp .env.standalone .env

# Initialize database
npx prisma db push

# Build frontend
npm run build
```

### Step 4: Start Console.web

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Or start directly
npm start
```

Open **http://localhost:7777** in your browser.

---

## First-Time Setup

When you first access Console.web, you'll be prompted to:

1. **Set an admin password** - This protects your local installation
2. **Configure projects directory** - Default is `~/Projects`
3. **Meet Code Puppy** - Your AI assistant is ready to help!

### Default Configuration

Console.web runs in **standalone mode** by default:

| Feature | Default | Notes |
|---------|---------|-------|
| Authentication | Local password | No external SSO |
| Reverse proxy | None | Direct access on port 7777 |
| GitHub | Disabled | Enable in Settings |
| Cloudflare | Disabled | Enable in Settings |
| Code Puppy | Enabled | Your AI companion |

---

## Configuration Options

### Environment Variables

Edit `.env` to customize your installation:

```bash
# Server ports
PORT=5275          # Backend API
VITE_PORT=7777     # Frontend

# Projects location
PROJECTS_DIR=~/Projects

# Database
DATABASE_URL="postgresql://localhost:5432/console_web"

# Authentication
AUTH_ENABLED=false  # true for Authentik SSO
LOCAL_AUTH_PASSWORD= # Set automatically on first visit

# AI Features
CODE_PUPPY_ENABLED=true
ANTHROPIC_API_KEY=  # Optional, for advanced AI features
```

### Enabling GitHub Integration

1. Go to **Settings > Integrations** in Console.web
2. Generate a GitHub Personal Access Token
3. Enter the token and save

### Enabling Cloudflare Tunnels

For public access without port forwarding:

1. Install cloudflared: `sudo apt install cloudflared`
2. Create a tunnel at dash.cloudflare.com
3. Configure in **Settings > Integrations > Cloudflare**

---

## Deployment Modes

### Standalone (Default)

Best for personal use on a single machine:
- No nginx required
- No SSO required
- Simple password protection
- Direct port access

### Enterprise

For team deployments with full security:
- nginx reverse proxy
- Authentik SSO integration
- Cloudflare Tunnel for HTTPS
- Multi-user support

See [Enterprise Deployment Guide](docs/ENTERPRISE_DEPLOYMENT.md) for details.

---

## Troubleshooting

### WSL2 Issues

**"WSL2 requires virtualization"**
- Enable virtualization in BIOS (VT-x or AMD-V)
- Enable Hyper-V in Windows Features

**"Cannot connect to localhost:7777"**
- Check if Console.web is running: `pm2 status`
- Check WSL2 networking: `wsl hostname -I`
- Try accessing via WSL IP: `http://<WSL_IP>:7777`

### Database Issues

**"Connection refused to PostgreSQL"**
```bash
sudo service postgresql start
```

**"Database does not exist"**
```bash
createdb console_web
npx prisma db push
```

### Application Issues

**"Module not found"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**"Port already in use"**
```bash
pm2 stop all
lsof -i :7777 | awk 'NR>1 {print $2}' | xargs kill
```

---

## Updating Console.web

```bash
cd ~/console-web
git pull
npm install
npm run build
pm2 restart console-web
```

---

## Support

- **Documentation**: See the `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/YOUR_GITHUB_USER/console-web/issues)
- **Code Puppy**: Ask your AI assistant for help!

---

## About Code Puppy

Code Puppy is your AI coding companion, designed to make AI-assisted development accessible to everyone. It runs locally through Console.web and can help with:

- Writing and reviewing code
- Debugging issues
- Explaining concepts
- Project scaffolding
- And much more!

**Our Goal**: Encourage AI adoption by providing a friendly, approachable interface to AI-powered development tools.

---

*Console.web v1.0 - Making AI development accessible*
