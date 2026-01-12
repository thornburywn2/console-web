# Security & Compliance Tools Setup Guide

This guide explains how to install and configure the third-party security and compliance tools integrated with Console.web's lifecycle agents.

---

## Quick Install (All Tools)

```bash
# Install all security tools at once
pip install semgrep pip-audit
sudo snap install gitleaks trivy
npm install -g license-checker lighthouse jscpd @lhci/cli
```

---

## Tool-by-Tool Installation

### 1. Semgrep (SAST - Static Application Security Testing)

**Purpose:** Scans code for security vulnerabilities, bugs, and anti-patterns.

**Installation:**
```bash
# Via pip (recommended)
pip install semgrep

# Or via Homebrew (macOS)
brew install semgrep
```

**Verify Installation:**
```bash
semgrep --version
```

**No API key required** - Semgrep works locally without credentials.

**Usage:**
```bash
# Scan a project
semgrep scan --config=auto /path/to/project

# Scan with specific rulesets
semgrep scan --config=p/security-audit /path/to/project
```

---

### 2. Gitleaks (Secret Scanning)

**Purpose:** Detects hardcoded secrets, API keys, passwords, and tokens in code.

**Installation:**
```bash
# Via snap (Linux)
sudo snap install gitleaks

# Via Homebrew (macOS)
brew install gitleaks

# Via Go
go install github.com/gitleaks/gitleaks/v8@latest
```

**Verify Installation:**
```bash
gitleaks version
```

**No API key required** - Gitleaks works locally.

**Usage:**
```bash
# Scan a directory
gitleaks detect --source=/path/to/project

# Scan with custom config
gitleaks detect --source=/path/to/project --config=.gitleaks.toml
```

---

### 3. Trivy (Container Vulnerability Scanner)

**Purpose:** Scans Docker images and containers for known vulnerabilities (CVEs).

**Installation:**
```bash
# Via snap (Linux)
sudo snap install trivy

# Via Homebrew (macOS)
brew install trivy

# Via apt (Debian/Ubuntu)
sudo apt-get install trivy
```

**Verify Installation:**
```bash
trivy --version
```

**No API key required** - Trivy downloads vulnerability databases automatically.

**Usage:**
```bash
# Scan a Docker image
trivy image myapp:latest

# Scan a Dockerfile
trivy config /path/to/Dockerfile

# Scan filesystem
trivy fs /path/to/project
```

---

### 4. License Checker (License Compliance)

**Purpose:** Checks npm dependencies for license compliance and identifies restrictive licenses (GPL, etc.).

**Installation:**
```bash
npm install -g license-checker
```

**Verify Installation:**
```bash
npx license-checker --version
```

**No API key required.**

**Usage:**
```bash
# Check licenses in a project
cd /path/to/project
npx license-checker --json

# Production only
npx license-checker --production
```

---

### 5. Lighthouse (Web Performance & Accessibility)

**Purpose:** Audits web pages for performance, accessibility, SEO, and best practices.

**Installation:**
```bash
# Lighthouse CLI
npm install -g lighthouse

# Lighthouse CI (for CI/CD integration)
npm install -g @lhci/cli
```

**Verify Installation:**
```bash
npx lighthouse --version
```

**No API key required for basic usage.**

**Usage:**
```bash
# Run audit on a URL
npx lighthouse http://localhost:3000 --view

# Run in headless mode
npx lighthouse http://localhost:3000 --chrome-flags="--headless"

# Output to JSON
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json
```

**Optional: PageSpeed Insights API Key**

For enhanced data from Google's PageSpeed Insights:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "PageSpeed Insights API"
4. Create credentials > API Key
5. Add to environment:
   ```bash
   export PAGESPEED_API_KEY="your-api-key-here"
   ```

---

### 6. JSCPD (Code Duplication Detection)

**Purpose:** Detects copy-pasted code (code duplication) across your codebase.

**Installation:**
```bash
npm install -g jscpd
```

**Verify Installation:**
```bash
npx jscpd --version
```

**No API key required.**

**Usage:**
```bash
# Scan for duplicates
npx jscpd /path/to/project

# With threshold
npx jscpd /path/to/project --threshold 5

# Output to JSON
npx jscpd /path/to/project --reporters json
```

---

### 7. pip-audit (Python Dependency Scanner)

**Purpose:** Scans Python dependencies for known vulnerabilities.

**Installation:**
```bash
pip install pip-audit
```

**Verify Installation:**
```bash
pip-audit --version
```

**No API key required.**

**Usage:**
```bash
# Scan current environment
pip-audit

# Scan requirements file
pip-audit -r requirements.txt
```

---

## Environment Variables

Add these to your `.env` file for enhanced functionality:

```bash
# Optional: PageSpeed Insights API (for enhanced Lighthouse data)
PAGESPEED_API_KEY=your-google-api-key

# Lifecycle agents directory (auto-detected if not set)
AGENTS_DIR=/home/username/Projects/agents/lifecycle

# Projects directory (auto-detected if not set)
PROJECTS_DIR=/home/username/Projects
```

---

## Verification Script

Run this script to verify all tools are installed:

```bash
#!/bin/bash
echo "Checking security tools..."

check_tool() {
    if command -v $1 &> /dev/null || $2 &> /dev/null; then
        echo "✓ $1 installed"
    else
        echo "✗ $1 NOT installed"
    fi
}

check_tool "semgrep" "semgrep --version"
check_tool "gitleaks" "gitleaks version"
check_tool "trivy" "trivy --version"
check_tool "license-checker" "npx license-checker --version"
check_tool "lighthouse" "npx lighthouse --version"
check_tool "jscpd" "npx jscpd --version"
check_tool "pip-audit" "pip-audit --version"

echo ""
echo "Done!"
```

---

## Using with Console.web

Once tools are installed, access them through:

1. **Admin Dashboard** > **Security** tab
2. Select a project from the dropdown
3. Run scans:
   - **Security Scan** - Full SAST, secrets, and dependency analysis
   - **Quality Gate** - Code coverage and complexity
   - **Performance Audit** - Bundle size and web vitals
   - **Dependency Check** - Outdated packages
   - **System Health** - Monitoring metrics

All scan results are saved to `/tmp/security-reports/` and can be viewed in the dashboard.

---

## CLI Usage (Direct Agent Access)

```bash
# Security scan
bash ~/Projects/agents/lifecycle/AGENT-018-SECURITY.sh scan /path/to/project

# Quality gate
bash ~/Projects/agents/lifecycle/AGENT-019-QUALITY-GATE.sh all /path/to/project

# Performance analysis
bash ~/Projects/agents/lifecycle/AGENT-022-PERFORMANCE.sh analyze /path/to/project

# Lighthouse audit
bash ~/Projects/agents/lifecycle/AGENT-022-PERFORMANCE.sh lighthouse /path/to/project http://localhost:3000

# Pre-commit hooks setup
bash ~/Projects/agents/lifecycle/AGENT-023-PRECOMMIT.sh all /path/to/project
```

---

## Troubleshooting

### Semgrep: "command not found"
```bash
# Add pip binaries to PATH
export PATH="$PATH:$HOME/.local/bin"
```

### Gitleaks: "permission denied"
```bash
# Install with sudo
sudo snap install gitleaks
```

### Trivy: "database download failed"
```bash
# Update database manually
trivy image --download-db-only
```

### License-checker: "EACCES permission denied"
```bash
# Fix npm global permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="$PATH:$HOME/.npm-global/bin"
```

---

## Summary

| Tool | Purpose | API Key Required |
|------|---------|------------------|
| Semgrep | SAST (code vulnerabilities) | No |
| Gitleaks | Secret scanning | No |
| Trivy | Container scanning | No |
| License Checker | License compliance | No |
| Lighthouse | Web performance | Optional (PageSpeed API) |
| JSCPD | Code duplication | No |
| pip-audit | Python dependencies | No |

All tools work locally without requiring external API keys, making them suitable for air-gapped environments and CI/CD pipelines.
