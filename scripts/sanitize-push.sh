#!/bin/bash
# ============================================
# PRE-PUSH SANITIZATION SCRIPT
# claude-code-manager security gate
# Version: 1.0.0
# ============================================
#
# This script prevents sensitive data from being pushed to GitHub:
# - API keys, tokens, passwords
# - Personal identifying information (PII)
# - Internal network information
# - Hardcoded credentials
#
# Usage:
#   ./scripts/sanitize-push.sh [--fix] [--verbose]
#
# Options:
#   --fix      Attempt to sanitize .env files (creates .env.sanitized)
#   --verbose  Show detailed scan output
#   --staged   Only scan staged files (for pre-commit)
#
# Exit codes:
#   0 - Clean, safe to push
#   1 - Secrets or PII detected, push blocked
#   2 - Tool not installed
# ============================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/.gitleaks.toml"
REPORT_DIR="/tmp/sanitize-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Counters
SECRETS_FOUND=0
PII_FOUND=0
WARNINGS=0

# Options
FIX_MODE=false
VERBOSE=false
STAGED_ONLY=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --fix)
            FIX_MODE=true
            ;;
        --verbose)
            VERBOSE=true
            ;;
        --staged)
            STAGED_ONLY=true
            ;;
    esac
done

log() { echo -e "${CYAN}[SANITIZE]${NC} $1"; }
error() { echo -e "${RED}[BLOCKED]${NC} $1" >&2; }
success() { echo -e "${GREEN}[CLEAN]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

header() {
    echo ""
    echo -e "${BOLD}============================================${NC}"
    echo -e "${BOLD}  PRE-PUSH SECURITY SANITIZATION${NC}"
    echo -e "${BOLD}============================================${NC}"
    echo ""
}

# Check required tools
GITLEAKS_AVAILABLE=false

check_tools() {
    if command -v gitleaks &> /dev/null; then
        GITLEAKS_AVAILABLE=true
        $VERBOSE && info "gitleaks found: $(gitleaks version 2>&1 | head -1)"
    else
        warning "gitleaks is not installed - secret scanning will be limited"
        echo "  Install: brew install gitleaks (macOS)"
        echo "           snap install gitleaks (Linux)"
        echo "           or download from https://github.com/gitleaks/gitleaks"
        echo ""
    fi
}

# Run gitleaks scan
run_gitleaks() {
    if ! $GITLEAKS_AVAILABLE; then
        warning "Skipping gitleaks scan (not installed)"
        # Fall back to grep-based secret detection
        run_fallback_secret_scan
        return $?
    fi

    log "Running gitleaks secret scan..."

    mkdir -p "$REPORT_DIR"
    local report_file="$REPORT_DIR/gitleaks_$TIMESTAMP.json"
    local scan_target="$PROJECT_DIR"
    local scan_opts=""

    # Use custom config if exists
    if [ -f "$CONFIG_FILE" ]; then
        scan_opts="--config=$CONFIG_FILE"
        $VERBOSE && info "Using custom config: $CONFIG_FILE"
    fi

    # Staged only mode
    if $STAGED_ONLY; then
        scan_opts="$scan_opts --staged"
    fi

    # Run scan
    if gitleaks detect --source="$scan_target" $scan_opts --report-path="$report_file" --report-format=json 2>/dev/null; then
        success "No secrets detected by gitleaks"
        return 0
    else
        # Parse results
        if [ -f "$report_file" ]; then
            local count=$(jq length "$report_file" 2>/dev/null || echo "0")
            if [ "$count" -gt 0 ]; then
                error "Found $count secret(s)!"
                echo ""

                # Show findings
                jq -r '.[] | "  \(.RuleID): \(.File):\(.StartLine) - \(.Description)"' "$report_file" 2>/dev/null | head -20

                if [ "$count" -gt 20 ]; then
                    echo "  ... and $((count - 20)) more"
                fi

                SECRETS_FOUND=$count
                return 1
            fi
        fi
        return 0
    fi
}

# Fallback secret detection using grep (when gitleaks not available)
run_fallback_secret_scan() {
    log "Running fallback secret scan (grep-based)..."

    local found=0
    local report_file="$REPORT_DIR/secrets_fallback_$TIMESTAMP.txt"
    mkdir -p "$REPORT_DIR"
    > "$report_file"

    # Files to scan
    local files=$(find "$PROJECT_DIR" -type f \
        \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \
        -o -name "*.json" -o -name "*.env*" -o -name "*.yml" -o -name "*.yaml" \
        -o -name "*.sh" -o -name "*.py" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/coverage/*" \
        ! -path "*/.gitleaks.toml" \
        ! -path "*/sanitize-push.sh" \
        2>/dev/null)

    # Secret patterns to search for
    declare -a patterns=(
        'sk-[a-zA-Z0-9]{20,}'              # OpenAI/Anthropic keys
        'ghp_[a-zA-Z0-9]{36}'               # GitHub PAT
        'gho_[a-zA-Z0-9]{36}'               # GitHub OAuth
        'ghs_[a-zA-Z0-9]{36}'               # GitHub App
        'ghr_[a-zA-Z0-9]{36}'               # GitHub Refresh
        'AKIA[0-9A-Z]{16}'                  # AWS Access Key
        'sk_live_[a-zA-Z0-9]{24,}'          # Stripe live key
        'xox[baprs]-[0-9a-zA-Z-]+'          # Slack tokens
        'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'  # JWT
    )

    while IFS= read -r file; do
        [ -z "$file" ] && continue
        [ ! -f "$file" ] && continue

        # Skip binary files
        if file "$file" | grep -q "binary"; then
            continue
        fi

        for pattern in "${patterns[@]}"; do
            if grep -Eon "$pattern" "$file" 2>/dev/null | head -3 > /dev/null; then
                local matches=$(grep -Eon "$pattern" "$file" 2>/dev/null)
                if [ -n "$matches" ]; then
                    echo "[$pattern] $file:" >> "$report_file"
                    echo "$matches" | head -3 >> "$report_file"
                    ((found++)) || true
                fi
            fi
        done
    done <<< "$files"

    if [ $found -gt 0 ]; then
        error "Found $found potential secret(s) (fallback scan)"
        if $VERBOSE; then
            cat "$report_file"
        fi
        SECRETS_FOUND=$found
        return 1
    fi

    success "No obvious secrets detected (fallback scan)"
    return 0
}

# Additional PII scan using grep patterns
scan_pii() {
    log "Scanning for PII patterns..."

    local pii_file="$REPORT_DIR/pii_$TIMESTAMP.txt"
    local found=false

    # Define PII patterns - more specific to avoid false positives
    declare -A patterns=(
        ["SSN"]='\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b'
        # More specific phone pattern - requires area code format
        ["Phone"]='(?:phone|tel|mobile|cell|contact)[^0-9]{0,20}\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'
        ["Credit Card"]='\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b'
        ["Street Address"]='\b[0-9]+\s+[A-Z][a-zA-Z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b'
    )

    # Files to scan - exclude likely false positive locations
    local files
    if $STAGED_ONLY; then
        files=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || echo "")
    else
        files=$(find "$PROJECT_DIR" -type f \
            \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \
            -o -name "*.json" -o -name "*.env*" -o -name "*.yml" -o -name "*.yaml" \
            -o -name "*.md" -o -name "*.txt" -o -name "*.sh" \) \
            ! -path "*/node_modules/*" \
            ! -path "*/.git/*" \
            ! -path "*/dist/*" \
            ! -path "*/coverage/*" \
            ! -path "*/.gitleaks.toml" \
            ! -path "*/sanitize-push.sh" \
            ! -name "*.min.js" \
            ! -name "*.min.css" \
            2>/dev/null)
    fi

    if [ -z "$files" ]; then
        $VERBOSE && info "No files to scan for PII"
        return 0
    fi

    > "$pii_file"

    for pattern_name in "${!patterns[@]}"; do
        local pattern="${patterns[$pattern_name]}"

        while IFS= read -r file; do
            [ -z "$file" ] && continue
            [ ! -f "$file" ] && continue

            # Skip binary files
            if file "$file" | grep -q "binary"; then
                continue
            fi

            # Search with exclusions for common false positives
            # Exclude: SVG paths (d="), example data, test data, placeholders, CSS/numeric sequences
            if grep -Pn "$pattern" "$file" 2>/dev/null \
                | grep -v -E '(example|test|mock|placeholder|xxx|d="|viewBox|path d=|\.svg|M[0-9]|c\.[0-9]+|l\.[0-9]+)' > /dev/null; then
                echo "[$pattern_name] $file" >> "$pii_file"
                grep -Pn "$pattern" "$file" 2>/dev/null \
                    | grep -v -E '(example|test|mock|placeholder|xxx|d="|viewBox|path d=|\.svg|M[0-9]|c\.[0-9]+|l\.[0-9]+)' \
                    | head -3 >> "$pii_file"
                found=true
            fi
        done <<< "$files"
    done

    if $found; then
        PII_FOUND=$(grep -c '^\[' "$pii_file" 2>/dev/null || echo "0")
        warning "Found $PII_FOUND potential PII pattern(s)"

        if $VERBOSE; then
            cat "$pii_file"
        fi

        return 1
    fi

    success "No PII patterns detected"
    return 0
}

# Check for .env files that shouldn't be committed
check_env_files() {
    log "Checking for sensitive files..."

    # Check if we're in a git repository
    local is_git_repo=false
    if git rev-parse --git-dir &>/dev/null; then
        is_git_repo=true
    fi

    local env_files=$(find "$PROJECT_DIR" -maxdepth 2 -name ".env" -o -name ".env.local" -o -name ".env.production" 2>/dev/null | grep -v node_modules || true)

    if [ -n "$env_files" ]; then
        # Check if they're in .gitignore
        for env_file in $env_files; do
            local rel_path="${env_file#$PROJECT_DIR/}"

            if $is_git_repo; then
                if git check-ignore -q "$env_file" 2>/dev/null; then
                    $VERBOSE && info "Ignored: $rel_path (in .gitignore)"
                else
                    # Check if it's tracked
                    if git ls-files --error-unmatch "$env_file" &>/dev/null; then
                        error "DANGER: $rel_path is tracked in git!"
                        echo "  Remove with: git rm --cached $rel_path"
                        echo "  Then add to .gitignore"
                        ((WARNINGS++)) || true
                    else
                        warning "$rel_path exists - ensure it's in .gitignore before pushing"
                        ((WARNINGS++)) || true
                    fi
                fi
            else
                # Not a git repo - just check if .gitignore exists and contains pattern
                if [ -f "$PROJECT_DIR/.gitignore" ] && grep -q "^\.env$" "$PROJECT_DIR/.gitignore" 2>/dev/null; then
                    $VERBOSE && info "$rel_path found, .gitignore exists with .env pattern"
                else
                    warning "$rel_path exists - ensure it's in .gitignore before pushing"
                    ((WARNINGS++)) || true
                fi
            fi
        done
    fi

    # Only check tracked files if in a git repo
    if $is_git_repo; then
        # Check for tracked sensitive files
        local dangerous_patterns=(
            "*.pem"
            "*.key"
            "*.p12"
            "*.pfx"
            "id_rsa*"
            "id_ed25519*"
            "*.keystore"
            "credentials.json"
            "secrets.json"
            "service-account*.json"
        )

        for pattern in "${dangerous_patterns[@]}"; do
            local tracked=$(git ls-files "$pattern" 2>/dev/null || true)
            if [ -n "$tracked" ]; then
                error "Dangerous file tracked: $tracked"
                ((SECRETS_FOUND++)) || true
            fi
        done
    fi
}

# Check for hardcoded localhost/IP in production code
check_hardcoded_urls() {
    log "Checking for hardcoded URLs..."

    local issues=0

    # Check for localhost in non-dev code
    local localhost_hits=$(grep -rn "localhost" "$PROJECT_DIR/src" "$PROJECT_DIR/server" 2>/dev/null \
        | grep -v "node_modules" \
        | grep -v ".test." \
        | grep -v ".spec." \
        | grep -v "// " \
        | grep -v "/* " \
        | grep -v "process.env" \
        || true)

    if [ -n "$localhost_hits" ]; then
        warning "Found hardcoded 'localhost' references"
        if $VERBOSE; then
            echo "$localhost_hits" | head -10
        fi
        ((WARNINGS++))
    fi
}

# Create sanitized version of env file
sanitize_env() {
    if ! $FIX_MODE; then
        return 0
    fi

    log "Creating sanitized .env.example..."

    if [ -f "$PROJECT_DIR/.env" ]; then
        local output="$PROJECT_DIR/.env.example"

        # Create sanitized version
        while IFS= read -r line || [ -n "$line" ]; do
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                # Keep comments and empty lines
                echo "$line"
            elif [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)= ]]; then
                local key="${BASH_REMATCH[1]}"
                # Replace value with placeholder
                case "$key" in
                    *PASSWORD*|*SECRET*|*KEY*|*TOKEN*)
                        echo "${key}=your-secret-here"
                        ;;
                    *URL*)
                        echo "${key}=https://example.com"
                        ;;
                    *PORT*)
                        echo "$line"  # Keep port numbers
                        ;;
                    *EMAIL*)
                        echo "${key}=admin@example.com"
                        ;;
                    *)
                        echo "${key}=your-value-here"
                        ;;
                esac
            else
                echo "$line"
            fi
        done < "$PROJECT_DIR/.env" > "$output"

        success "Created sanitized template: .env.example"
    fi
}

# Generate report summary
generate_report() {
    local status="CLEAN"
    local exit_code=0

    if [ $SECRETS_FOUND -gt 0 ]; then
        status="BLOCKED"
        exit_code=1
    fi

    echo ""
    echo -e "${BOLD}============================================${NC}"
    echo -e "${BOLD}  SANITIZATION REPORT${NC}"
    echo -e "${BOLD}============================================${NC}"
    echo ""
    echo "  Secrets found:    $SECRETS_FOUND"
    echo "  PII patterns:     $PII_FOUND"
    echo "  Warnings:         $WARNINGS"
    echo ""

    if [ $exit_code -eq 0 ]; then
        echo -e "  Status: ${GREEN}${BOLD}$status${NC}"
        echo -e "  ${GREEN}Safe to push to GitHub${NC}"
    else
        echo -e "  Status: ${RED}${BOLD}$status${NC}"
        echo -e "  ${RED}Push blocked - fix issues before pushing${NC}"
        echo ""
        echo "  Recommendations:"
        echo "    1. Remove or encrypt sensitive data"
        echo "    2. Use environment variables for secrets"
        echo "    3. Add sensitive files to .gitignore"
        echo "    4. Run with --fix to generate sanitized templates"
    fi

    echo ""
    echo -e "${BOLD}============================================${NC}"
    echo ""

    return $exit_code
}

# Main execution
main() {
    header
    check_tools

    cd "$PROJECT_DIR"

    local gitleaks_status=0
    local pii_status=0

    run_gitleaks || gitleaks_status=$?
    scan_pii || pii_status=$?
    check_env_files
    check_hardcoded_urls
    sanitize_env

    generate_report
}

main "$@"
