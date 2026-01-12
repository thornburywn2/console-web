# Admin Dashboard Consolidation Plan

> **STATUS: COMPLETED** (2026-01-12)
>
> This plan has been fully implemented in v2.12.1. The Admin Dashboard now has 9 main tabs (down from 18) with sub-tabs for INFRASTRUCTURE and AGENTS. See CHANGELOG.md for details.

---

## Original State: 18 Tabs

| Tab | Content | Usage |
|-----|---------|-------|
| OVERVIEW | System stats (CPU, memory, disk, uptime), sessions, process info | Primary landing |
| SERVER | PM2 processes, systemd services | Infrastructure |
| DOCKER | Container management, logs, stats | Infrastructure |
| STACK | Sovereign Stack health (Authentik, Open WebUI, etc.) | Infrastructure |
| HISTORY | Session history list | Sessions |
| CLAUDE_MD | Per-project CLAUDE.md editor | Configuration |
| MCP | MCP Server catalog and management | Configuration |
| PROJECTS | Project list with details, completion metrics | Core feature |
| TOOLS | API Tester, Git Workflow, File Browser, Diff Viewer | Development |
| AGENTS | Agent Manager with Marketplace | Automation |
| MONITORING | Uptime, Network Stats, API Costs, Alert Rules | Infrastructure |
| DEVTOOLS | Database Browser, Dependencies, Log Viewer | Development |
| SECURITY | Security scanning dashboard | Security |
| TABBY | Tabby code completion (Docker) | **EXPERIMENTAL** |
| SWARM | Claude Flow swarms | **PLACEHOLDER** (package doesn't exist) |
| GITHUB | GitHub PAT settings, linked repos | Integration Settings |
| CLOUDFLARE | Cloudflare tunnel settings | Integration Settings |
| SETTINGS | General, Appearance, Shortcuts, Personas, Auth, Scans, System | Settings |

---

## Proposed Consolidation: 10 Tabs

### 1. OVERVIEW (Keep - Enhanced)
**Purpose:** Quick system health at a glance

**Contains:**
- Hero stats (CPU, Memory, Sessions, Uptime) - keep as-is
- System info cards (hostname, platform, memory, disk) - keep as-is
- Sessions card - keep as-is
- Process card - keep as-is

**Remove:** Nothing - this is the right amount for a dashboard overview

---

### 2. INFRASTRUCTURE (Merge SERVER + DOCKER + STACK + parts of MONITORING)
**Purpose:** All server/infrastructure management in one place

**Sub-sections (collapsible panels or internal tabs):**
- **Services** - PM2 processes, systemd services (from SERVER)
- **Docker** - Container management, logs, stats (from DOCKER)
- **Stack Health** - Sovereign Stack services (from STACK)
- **Network** - Network stats widget (from MONITORING)
- **Uptime** - Uptime monitoring (from MONITORING)

**Rationale:** All infrastructure concerns in one tab reduces context switching

---

### 3. PROJECTS (Keep - Minor enhancement)
**Purpose:** Project management hub

**Contains:**
- Project list with metrics (current)
- Quick access to CLAUDE.md (add inline edit or modal - absorb CLAUDE_MD tab)
- Git status indicators (already shown)

**Absorbs:** CLAUDE_MD tab (make editor accessible per-project)

---

### 4. DEVELOPMENT (Merge TOOLS + DEVTOOLS)
**Purpose:** All developer utilities in one place

**Sub-sections:**
- **Files** - File Browser, Diff Viewer (from TOOLS)
- **Git** - Git Workflow (from TOOLS)
- **API** - API Tester (from TOOLS)
- **Database** - Database Browser (from DEVTOOLS)
- **Dependencies** - Dependency Dashboard (from DEVTOOLS)
- **Logs** - Log Viewer (from DEVTOOLS)

**Rationale:** TOOLS and DEVTOOLS distinction is confusing - combine them

---

### 5. AGENTS (Keep)
**Purpose:** Automation agents and marketplace

**Contains:** Agent Manager with Marketplace (no changes needed)

---

### 6. MCP (Keep)
**Purpose:** MCP Server configuration

**Contains:** MCP Server Manager (no changes needed)

---

### 7. SECURITY (Keep)
**Purpose:** Security scanning and compliance

**Contains:** Security Dashboard (no changes needed)

---

### 8. HISTORY (Keep)
**Purpose:** Session history and analytics

**Contains:** Session history list (no changes needed)

---

### 9. MONITORING (Slim down - rename to COSTS & ALERTS)
**Purpose:** API costs and alert management

**Contains:**
- API Costs widget (CostWidget)
- Alert Rules editor

**Moves out:** Uptime and Network (to INFRASTRUCTURE)

**Rationale:** These are the "business" metrics vs infrastructure metrics

---

### 10. SETTINGS (Consolidate integrations)
**Purpose:** All configuration in one place

**Sub-sections:**
- General (current)
- Appearance/Themes (current)
- Shortcuts (current)
- Personas (current)
- **Integrations** (NEW - consolidate):
  - GitHub PAT settings (absorb GITHUB tab)
  - Cloudflare settings (absorb CLOUDFLARE tab)
  - Authentik settings (current)
- Scans (current)
- System (current)
- **Experimental Features** (NEW):
  - Toggle to show/hide experimental tabs
  - When enabled: TABBY and SWARM tabs appear
  - When disabled: TABBY and SWARM tabs hidden

**Absorbs:** GITHUB tab, CLOUDFLARE tab

---

## Experimental Features Handling

### New Setting: "Show Experimental Features"
Location: Settings > General or Settings > System

When **disabled** (default):
- TABBY tab hidden
- SWARM tab hidden
- Clean interface with only production-ready features

When **enabled**:
- TABBY tab visible (with "EXPERIMENTAL" badge)
- SWARM tab visible (with "COMING SOON" badge)

---

## Summary of Changes

| Action | Tabs Affected | Result |
|--------|--------------|--------|
| MERGE | SERVER + DOCKER + STACK + Network/Uptime from MONITORING | → INFRASTRUCTURE |
| MERGE | TOOLS + DEVTOOLS | → DEVELOPMENT |
| ABSORB | CLAUDE_MD into PROJECTS | CLAUDE_MD removed |
| ABSORB | GITHUB + CLOUDFLARE into SETTINGS | Both removed |
| RENAME | MONITORING (slimmed) | → COSTS & ALERTS |
| HIDE | TABBY, SWARM | Behind "Experimental Features" toggle |
| KEEP | OVERVIEW, PROJECTS, AGENTS, MCP, SECURITY, HISTORY, SETTINGS | No changes |

---

## Final Tab Structure (10 tabs vs 18)

```
OVERVIEW | INFRASTRUCTURE | PROJECTS | DEVELOPMENT | AGENTS | MCP | SECURITY | HISTORY | COSTS & ALERTS | SETTINGS
                                                                                              │
                                                                                              ├── General
                                                                                              ├── Appearance
                                                                                              ├── Shortcuts
                                                                                              ├── Personas
                                                                                              ├── Integrations (GitHub, Cloudflare, Authentik)
                                                                                              ├── Scans
                                                                                              ├── System
                                                                                              └── Experimental Features Toggle
                                                                                                    │
                                                                                                    └── [When enabled: TABBY | SWARM tabs appear]
```

---

## Implementation Priority

### Phase 1: Quick Wins (Low effort, high impact)
1. Add "Experimental Features" toggle to Settings
2. Conditionally hide TABBY and SWARM tabs based on setting
3. Move GitHub/Cloudflare settings into Settings panel

### Phase 2: Major Consolidation
4. Create INFRASTRUCTURE tab merging SERVER + DOCKER + STACK
5. Create DEVELOPMENT tab merging TOOLS + DEVTOOLS
6. Absorb CLAUDE_MD functionality into PROJECTS

### Phase 3: Polish
7. Rename MONITORING to COSTS & ALERTS
8. Update navigation icons and labels
9. Add sub-navigation within consolidated tabs

---

## Benefits

1. **Reduced cognitive load**: 10 tabs vs 18 tabs
2. **Logical grouping**: Related features together
3. **Clean default experience**: Experimental features hidden by default
4. **Preserved functionality**: No features removed, just reorganized
5. **Settings consolidation**: All integrations in one place
