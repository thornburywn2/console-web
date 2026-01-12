#!/bin/bash
# ============================================
# GIT HOOKS SETUP SCRIPT
# claude-code-manager security hooks
# Version: 1.0.0
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_DIR/.git/hooks"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[SETUP]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

setup_pre_push_hook() {
    log "Setting up pre-push hook..."

    cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook for security sanitization
# Installed by scripts/setup-hooks.sh

SCRIPT_DIR="$(git rev-parse --show-toplevel)/scripts"

if [ -f "$SCRIPT_DIR/sanitize-push.sh" ]; then
    echo "Running pre-push security check..."
    if ! "$SCRIPT_DIR/sanitize-push.sh"; then
        echo ""
        echo "Push blocked by security check."
        echo "Fix the issues above before pushing."
        echo ""
        echo "To bypass (NOT RECOMMENDED):"
        echo "  git push --no-verify"
        echo ""
        exit 1
    fi
else
    echo "Warning: sanitize-push.sh not found"
fi
EOF

    chmod +x "$HOOKS_DIR/pre-push"
    success "Pre-push hook installed"
}

setup_pre_commit_hook() {
    log "Setting up pre-commit hook..."

    cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook for staged files only
# Installed by scripts/setup-hooks.sh

SCRIPT_DIR="$(git rev-parse --show-toplevel)/scripts"

if [ -f "$SCRIPT_DIR/sanitize-push.sh" ]; then
    echo "Running pre-commit security check on staged files..."
    if ! "$SCRIPT_DIR/sanitize-push.sh" --staged; then
        echo ""
        echo "Commit blocked by security check."
        echo "Fix the issues above before committing."
        echo ""
        exit 1
    fi
fi
EOF

    chmod +x "$HOOKS_DIR/pre-commit"
    success "Pre-commit hook installed"
}

main() {
    echo ""
    echo "============================================"
    echo "  GIT HOOKS SETUP"
    echo "============================================"
    echo ""

    if [ ! -d "$PROJECT_DIR/.git" ]; then
        error "Not a git repository: $PROJECT_DIR"
        exit 1
    fi

    mkdir -p "$HOOKS_DIR"

    setup_pre_push_hook
    setup_pre_commit_hook

    echo ""
    echo "============================================"
    echo "  HOOKS INSTALLED"
    echo "============================================"
    echo ""
    echo "  Installed hooks:"
    echo "    - pre-commit: Scans staged files for secrets"
    echo "    - pre-push:   Full security scan before push"
    echo ""
    echo "  To test:"
    echo "    ./scripts/sanitize-push.sh --verbose"
    echo ""
    echo "  To bypass hooks (NOT RECOMMENDED):"
    echo "    git commit --no-verify"
    echo "    git push --no-verify"
    echo ""
}

main "$@"
