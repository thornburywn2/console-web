# Console.web Windows Setup Script
# Run this script from PowerShell (as Administrator) to install Console.web via WSL2
#
# Usage:
#   1. Open PowerShell as Administrator
#   2. Run: Set-ExecutionPolicy Bypass -Scope Process -Force
#   3. Run: irm https://raw.githubusercontent.com/YOUR_GITHUB_USER/console-web/main/scripts/windows-setup.ps1 | iex
#
# Or download and run locally:
#   .\windows-setup.ps1

param(
    [switch]$SkipWSLInstall,
    [string]$Distro = "Ubuntu-22.04"
)

$ErrorActionPreference = "Stop"

Write-Host @"

 ██████╗ ██████╗ ███╗   ██╗███████╗ ██████╗ ██╗     ███████╗   ██╗    ██╗███████╗██████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██╔═══██╗██║     ██╔════╝   ██║    ██║██╔════╝██╔══██╗
██║     ██║   ██║██╔██╗ ██║███████╗██║   ██║██║     █████╗     ██║ █╗ ██║█████╗  ██████╔╝
██║     ██║   ██║██║╚██╗██║╚════██║██║   ██║██║     ██╔══╝     ██║███╗██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝██║ ╚████║███████║╚██████╔╝███████╗███████╗██╗╚███╔███╔╝███████╗██████╔╝
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚══════╝╚══════╝╚═╝ ╚══╝╚══╝ ╚══════╝╚═════╝

    Console.web v1.0 - Windows WSL2 Installer
    Your Gateway to AI-Assisted Development

"@ -ForegroundColor Cyan

Write-Host "This script will set up Console.web on your Windows machine using WSL2." -ForegroundColor White
Write-Host "WSL2 (Windows Subsystem for Linux) provides a full Linux environment on Windows.`n" -ForegroundColor Gray

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "WARNING: This script should be run as Administrator for WSL2 installation." -ForegroundColor Yellow
    Write-Host "Some features may not work without Administrator privileges.`n" -ForegroundColor Yellow
}

# Step 1: Check/Install WSL2
Write-Host "Step 1: Checking WSL2 installation..." -ForegroundColor Yellow

if (-not $SkipWSLInstall) {
    $wslInstalled = $false
    try {
        $wslVersion = wsl --version 2>$null
        if ($wslVersion) {
            $wslInstalled = $true
            Write-Host "  WSL2 is already installed." -ForegroundColor Green
        }
    } catch {}

    if (-not $wslInstalled) {
        Write-Host "  WSL2 is not installed. Installing now..." -ForegroundColor Yellow
        Write-Host "  This may require a system restart." -ForegroundColor Gray

        if ($isAdmin) {
            wsl --install -d $Distro
            Write-Host "`n  WSL2 installation initiated." -ForegroundColor Green
            Write-Host "  Please RESTART your computer and run this script again." -ForegroundColor Yellow
            Write-Host "  After restart, WSL will complete setup and you can continue." -ForegroundColor Gray
            exit 0
        } else {
            Write-Host "  Please run this script as Administrator to install WSL2." -ForegroundColor Red
            exit 1
        }
    }

    # Check if the distro is installed
    $distros = wsl --list --quiet 2>$null
    if ($distros -notcontains $Distro -and $distros -notcontains $Distro.Replace("-", "")) {
        Write-Host "  Installing $Distro..." -ForegroundColor Yellow
        wsl --install -d $Distro
        Write-Host "  Please complete the Ubuntu setup (create username/password) and run this script again." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "  WSL2 is ready!`n" -ForegroundColor Green

# Step 2: Download and run the Linux installer
Write-Host "Step 2: Running Console.web installer in WSL2..." -ForegroundColor Yellow

$installScript = @'
#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           Console.web WSL2 Installation                          ║"
echo "║           AI-Powered Development Environment                     ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if already installed
if [ -d "$HOME/console-web" ]; then
    echo -e "${YELLOW}Console.web is already installed at $HOME/console-web${NC}"
    read -p "Do you want to update it? (y/n): " update
    if [ "$update" != "y" ]; then
        echo "Installation cancelled."
        exit 0
    fi
fi

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git build-essential

echo -e "${GREEN}Step 2: Installing Node.js (via nvm)...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi
nvm install 20 || true
nvm use 20

echo -e "${GREEN}Step 3: Installing PostgreSQL...${NC}"
sudo apt-get install -y -qq postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER $USER WITH SUPERUSER PASSWORD 'console-web-dev';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE console_web OWNER $USER;" 2>/dev/null || true

echo -e "${GREEN}Step 4: Installing PM2...${NC}"
npm install -g pm2

echo -e "${GREEN}Step 5: Cloning Console.web...${NC}"
cd $HOME
if [ -d "console-web" ]; then
    cd console-web
    git pull
else
    git clone https://github.com/YOUR_GITHUB_USER/console-web.git
    cd console-web
fi

echo -e "${GREEN}Step 6: Installing dependencies...${NC}"
npm install

echo -e "${GREEN}Step 7: Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.standalone .env
fi

echo -e "${GREEN}Step 8: Setting up database...${NC}"
npx prisma db push

echo -e "${GREEN}Step 9: Building frontend...${NC}"
npm run build

echo -e "${GREEN}Step 10: Starting Console.web...${NC}"
pm2 start ecosystem.config.js || pm2 restart console-web

# Get the IP address
IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Installation Complete!                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Console.web is now running!${NC}"
echo ""
echo -e "Access your dashboard at: ${YELLOW}http://localhost:7777${NC}"
echo -e "                     or: ${YELLOW}http://${IP}:7777${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Open http://localhost:7777 in your browser"
echo "  2. Set up your admin password on first visit"
echo "  3. Start creating projects with Code Puppy!"
echo ""
echo -e "${CYAN}Useful Commands:${NC}"
echo "  pm2 status          - Check if Console.web is running"
echo "  pm2 logs console-web - View application logs"
echo "  pm2 restart console-web - Restart the application"
echo ""
'@

# Save the install script and run it in WSL
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$installScript | Out-File -FilePath $tempScript -Encoding utf8 -NoNewline

# Convert Windows path to WSL path
$wslPath = wsl wslpath -u $tempScript.Replace('\', '/')

Write-Host "  Running installation in WSL2..." -ForegroundColor Gray
wsl bash $wslPath

# Cleanup
Remove-Item $tempScript -Force -ErrorAction SilentlyContinue

Write-Host "`nInstallation complete!" -ForegroundColor Green
Write-Host "Open http://localhost:7777 in your browser to access Console.web`n" -ForegroundColor Cyan
