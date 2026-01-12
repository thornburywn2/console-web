#!/bin/bash
# ============================================================================
# Cloudflared Setup Script for Command Portal
# ============================================================================
# This script installs cloudflared and configures it as a systemd service
# Run with sudo: sudo bash scripts/setup-cloudflared.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=============================================="
echo "  Cloudflared Setup for Command Portal"
echo "=============================================="
echo -e "${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
fi

echo -e "${YELLOW}Detected OS: $OS $VER${NC}"

# Step 1: Install cloudflared
echo -e "\n${GREEN}Step 1: Installing cloudflared...${NC}"

if command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}cloudflared is already installed${NC}"
    cloudflared --version
else
    # Download and install based on architecture
    ARCH=$(uname -m)
    if [ "$ARCH" == "x86_64" ]; then
        ARCH="amd64"
    elif [ "$ARCH" == "aarch64" ]; then
        ARCH="arm64"
    fi

    echo "Downloading cloudflared for $ARCH..."
    curl -L --output /tmp/cloudflared.deb \
        https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH.deb

    echo "Installing cloudflared..."
    dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb

    echo -e "${GREEN}cloudflared installed successfully!${NC}"
    cloudflared --version
fi

# Step 2: Create cloudflared user if not exists
echo -e "\n${GREEN}Step 2: Creating cloudflared user...${NC}"
if id "cloudflared" &>/dev/null; then
    echo -e "${YELLOW}User cloudflared already exists${NC}"
else
    useradd -r -s /usr/sbin/nologin -d /var/lib/cloudflared cloudflared
    echo -e "${GREEN}Created cloudflared user${NC}"
fi

# Step 3: Create config directory
echo -e "\n${GREEN}Step 3: Setting up configuration directory...${NC}"
CONFIG_DIR="/etc/cloudflared"
mkdir -p $CONFIG_DIR
chown cloudflared:cloudflared $CONFIG_DIR

# Step 4: Check if tunnel credentials exist
echo -e "\n${GREEN}Step 4: Checking tunnel credentials...${NC}"
CREDS_FILE="$CONFIG_DIR/credentials.json"

if [ -f "$CREDS_FILE" ]; then
    echo -e "${GREEN}Credentials file found${NC}"
else
    echo -e "${YELLOW}No credentials file found at $CREDS_FILE${NC}"
    echo ""
    echo "You need to authenticate cloudflared. Run:"
    echo -e "${CYAN}  sudo cloudflared tunnel login${NC}"
    echo ""
    echo "Then create a tunnel:"
    echo -e "${CYAN}  sudo cloudflared tunnel create command-portal${NC}"
    echo ""
    echo "This will create credentials at:"
    echo "  ~/.cloudflared/<TUNNEL_ID>.json"
    echo ""
    echo "Copy the credentials to $CREDS_FILE:"
    echo -e "${CYAN}  sudo cp ~/.cloudflared/<TUNNEL_ID>.json $CREDS_FILE${NC}"
    echo -e "${CYAN}  sudo chown cloudflared:cloudflared $CREDS_FILE${NC}"
fi

# Step 5: Create config.yml if not exists
echo -e "\n${GREEN}Step 5: Creating config.yml...${NC}"
CONFIG_FILE="$CONFIG_DIR/config.yml"

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Config file already exists${NC}"
else
    cat > $CONFIG_FILE << 'EOF'
# Cloudflare Tunnel Configuration
# Managed by Command Portal

# Replace with your actual tunnel ID
tunnel: YOUR_TUNNEL_ID

# Path to credentials file
credentials-file: /etc/cloudflared/credentials.json

# Ingress rules - managed via API, initial catch-all only
ingress:
  - service: http_status:404
EOF
    chown cloudflared:cloudflared $CONFIG_FILE
    chmod 600 $CONFIG_FILE
    echo -e "${GREEN}Created config file at $CONFIG_FILE${NC}"
    echo -e "${YELLOW}IMPORTANT: Edit $CONFIG_FILE and add your tunnel ID${NC}"
fi

# Step 6: Create systemd service
echo -e "\n${GREEN}Step 6: Creating systemd service...${NC}"
SERVICE_FILE="/etc/systemd/system/cloudflared.service"

cat > $SERVICE_FILE << 'EOF'
[Unit]
Description=cloudflared tunnel for Command Portal
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=cloudflared
Group=cloudflared
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=0

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/etc/cloudflared
PrivateTmp=yes
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}Created systemd service file${NC}"

# Step 7: Reload systemd and enable service
echo -e "\n${GREEN}Step 7: Enabling systemd service...${NC}"
systemctl daemon-reload
systemctl enable cloudflared

echo -e "\n${CYAN}=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo -e "${NC}"

echo "Next steps:"
echo "1. If you haven't already, authenticate cloudflared:"
echo -e "   ${CYAN}sudo cloudflared tunnel login${NC}"
echo ""
echo "2. Create a tunnel (if you don't have one):"
echo -e "   ${CYAN}sudo cloudflared tunnel create command-portal${NC}"
echo ""
echo "3. Get your tunnel ID and update config:"
echo -e "   ${CYAN}sudo nano /etc/cloudflared/config.yml${NC}"
echo ""
echo "4. Copy credentials file:"
echo -e "   ${CYAN}sudo cp ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/credentials.json${NC}"
echo -e "   ${CYAN}sudo chown cloudflared:cloudflared /etc/cloudflared/credentials.json${NC}"
echo ""
echo "5. Start the service:"
echo -e "   ${CYAN}sudo systemctl start cloudflared${NC}"
echo ""
echo "6. Check status:"
echo -e "   ${CYAN}sudo systemctl status cloudflared${NC}"
echo ""
echo "7. View logs:"
echo -e "   ${CYAN}sudo journalctl -u cloudflared -f${NC}"
echo ""
echo -e "${GREEN}Cloudflared is now configured to start automatically on boot!${NC}"
