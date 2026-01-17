# Console.web Stability Roadmap

**Version:** 1.0.0
**Date:** 2026-01-17
**Author:** Senior Full-Stack Architect Audit
**Status:** Technical Proposal

---

## Executive Summary

Console.web is a comprehensive web-based infrastructure management platform with **155 React components**, **42 API route files (450+ endpoints)**, and **real-time WebSocket communication**. While feature-rich, the codebase has significant reliability gaps that must be addressed before it can be considered production-grade.

### Critical Findings

| Category | Current State | Target State | Gap Severity |
|----------|---------------|--------------|--------------|
| **Test Coverage** | <5% | 80% | 🔴 CRITICAL |
| **Input Validation** | 76% routes | 100% | 🔴 CRITICAL |
| **API Abstraction** | None | Centralized | 🔴 CRITICAL |
| **SQL Injection** | 1 vulnerable endpoint | 0 | 🔴 CRITICAL |
| **Command Injection** | 4 vulnerable endpoints | 0 | 🔴 CRITICAL |
| **Error Handling** | Inconsistent | Standardized | 🟠 HIGH |
| **Component Size** | 11 files >500 lines | 0 | 🟠 HIGH |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Console.web v1.0.10                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  FRONTEND (155 components)                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Terminal   │  │   Admin     │  │  Projects   │  │  Sidebars   │        │
│  │  (xterm.js) │  │  Dashboard  │  │   Browser   │  │  (Widgets)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         └─────────────────┴─────────────────┴─────────────────┘              │
│                              ⚠️ 66 direct fetch() calls                      │
│                              ⚠️ No API abstraction layer                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  BACKEND (42 route files, 450+ endpoints)                                    │
│  ├── ✅ Good: Helmet, CORS, Rate Limiting, Auth middleware                   │
│  ├── 🔴 Gap: 10 route files with ZERO validation                            │
│  ├── 🔴 Gap: SQL injection in devtools.js                                   │
│  └── 🔴 Gap: Command injection in infrastructure.js                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                                  │
│  ├── PostgreSQL + Prisma 7 ✅                                                │
│  └── 51 database models ✅                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Status |
|-------|------------|--------|
| **Frontend** | React 18, Vite, Tailwind CSS | ✅ Modern |
| **Backend** | Node.js, Express, Socket.IO | ✅ Solid |
| **Database** | PostgreSQL + Prisma 7 | ✅ Good |
| **Sessions** | Shpool (tmux persistence) | ✅ Reliable |
| **Containers** | Dockerode | ✅ Working |
| **Observability** | OpenTelemetry, Jaeger, Loki | ✅ Configured |
| **Security** | Helmet, Zod (partial), Authentik | ⚠️ Gaps |
| **Testing** | Vitest (minimal coverage) | 🔴 Critical |

---

## Phase 1: Project Audit Summary

### 1.1 Backend Architecture

**Route Files Analysis (42 files, 450+ endpoints):**

| Validation Status | File Count | Risk Level |
|-------------------|------------|------------|
| ✅ Full Validation | 5 (12%) | Low |
| ⚠️ Partial Validation | 27 (64%) | Medium |
| 🔴 No Validation | 10 (24%) | Critical |

**Critical Routes Without Validation:**
1. `usersFirewall.js` - 33 endpoints (firewall/auth operations)
2. `infrastructure.js` - 30 endpoints (system commands)
3. `cloudflare.js` - 28 endpoints (DNS/tunnel operations)
4. `mcp.js` - 24 endpoints (MCP server management)
5. `codePuppy.js` - 43 endpoints (AI assistant)

**Middleware Stack (Correct Order):**
```
1. Helmet (security headers) ✅
2. CORS ✅
3. Body parsing ✅
4. Request logging (Pino) ✅
5. OpenTelemetry tracing ✅
6. Prometheus metrics ✅
7. Sentry error tracking ✅
8. Authentik auth ✅
9. Rate limiting ✅
10. Route handlers ✅
```

### 1.2 Frontend Architecture

**Component Inventory:**
- **Total Components:** 155
- **Custom Hooks:** 9
- **Admin Module:** 28 components (well-organized)
- **Root-level Components:** 110+ (poorly organized)

**Oversized Components (>500 lines):**

| Component | Lines | Priority |
|-----------|-------|----------|
| SettingsPanel.jsx | 1,915 | 🔴 P0 |
| WidgetDashboard.jsx | 1,198 | 🔴 P0 |
| App.jsx | 1,171 | 🔴 P0 |
| ProjectContextMenu.jsx | 1,052 | 🟠 P1 |
| CodePuppyDashboard.jsx | 1,049 | 🟠 P1 |
| CreateProjectModal.jsx | 997 | 🟠 P1 |
| AdminDashboard.jsx | 915 | ✅ Well-refactored |

**State Management:**
- Hooks only (useState, useEffect, useCallback)
- No global state management (Redux, Zustand, etc.)
- Single context: `AuthContext` (underutilized)
- Prop drilling observed in large components

### 1.3 Testing Infrastructure

**Current State:**

| Metric | Value | Target | Gap |
|--------|-------|--------|-----|
| Component Tests | 4/135 | 80%+ | 🔴 -76% |
| API Route Tests | 0/42 | 100% | 🔴 -100% |
| E2E Tests | 0 | Critical paths | 🔴 Missing |
| Integration Tests | Minimal | Comprehensive | 🔴 Missing |

**Test Framework:** Vitest (properly configured, underutilized)

---

## Phase 2: Gap Analysis (Missing Standards)

### 2.1 Security Gaps

#### 🔴 CRITICAL: SQL Injection Vulnerability

**Location:** `server/routes/devtools.js:505`

```javascript
// VULNERABLE CODE
router.post('/query', async (req, res) => {
  const { query } = req.body;
  // Weak validation - easily bypassed
  if (!query.trim().toUpperCase().startsWith('SELECT')) {
    return res.status(400).json({ error: 'Only SELECT queries allowed' });
  }
  // ❌ CRITICAL: Unsafe raw SQL execution
  const result = await prisma.$queryRawUnsafe(query);
});
```

**Attack Vector:** `SELECT '; DROP TABLE sessions; --`

**Remediation:** Remove endpoint entirely or implement query builder with parameterized queries only.

#### 🔴 CRITICAL: OS Command Injection

**Location:** `server/routes/infrastructure.js` (4 endpoints)

```javascript
// Lines 540, 582, 611
router.post('/network/ping', async (req, res) => {
  const { host, count = 4 } = req.body;  // ⚠️ No validation
  const cmd = `ping -c ${count} ${host}`;  // ⚠️ Direct injection
  const { stdout } = await execAsync(cmd);
});
```

**Attack Vector:** `{ host: "google.com; rm -rf /", count: 4 }`

**Affected Endpoints:**
- `POST /network/ping` - Line 540
- `POST /network/dns` - Line 582
- `POST /network/port-check` - Line 611
- `POST /packages/install` - Lines 77, 112, 134

### 2.2 Input Validation Gaps

**Routes Missing Validation (10 files):**

| Route File | Endpoints | Risk |
|------------|-----------|------|
| usersFirewall.js | 33 | Credential injection |
| infrastructure.js | 30 | Command injection |
| cloudflare.js | 28 | Route hijacking |
| mcp.js | 24 | Config injection |
| codePuppy.js | 43 | AI prompt injection |
| aider.js | 15 | Config manipulation |
| claudeFlow.js | 14 | Swarm manipulation |
| browser.js | 13 | Path traversal |
| ai.js | 9 | Data exposure |
| marketplace.js | 8 | Package tampering |

### 2.3 Error Handling Gaps

**Silent Failure Locations (8 files):**

```javascript
// Pattern found in multiple files
} catch {}  // Silent failure - no logging, no response
```

**Files with Empty Catch Blocks:**
1. `server/index.js`
2. `server/routes/search.js`
3. `server/routes/cloudflare.js`
4. `server/routes/infrastructure.js`
5. `src/components/WidgetDashboard.jsx`
6. `src/components/DatabaseBrowser.jsx`
7. `src/components/ApiTester.jsx`
8. `scripts/windows-setup.ps1`

### 2.4 Rate Limiting Gaps

**Unprotected High-Risk Endpoints:**
- `POST /api/db/query` - SQL execution
- `POST /network/ping` - Network operations
- `POST /packages/*` - Package management
- `POST /infrastructure/services/*` - Service control

### 2.5 Environment Variable Gaps

**Hardcoded Values Found:**

| Location | Issue | Fix |
|----------|-------|-----|
| `watcherService.js:33` | `projectDir` hardcoded | Use `process.cwd()` |
| `watcherService.js:50` | `logFile` hardcoded | Use `LOG_DIR` env var |
| `CodePuppyDashboard.jsx:17` | `API_URL` hardcoded | Use env var |

---

## Phase 3: Frontend-Backend Integration Audit

### 3.1 API Communication Patterns

**Current State: FRAGMENTED**

```
┌─────────────────────────────────────────────────────────────────┐
│  CURRENT STATE (Problematic)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Component A ──────► fetch('/api/projects')                      │
│  Component B ──────► fetch('/api/projects')  (duplicate!)        │
│  Component C ──────► fetch(`${API_URL}/api/projects`)            │
│  Component D ──────► fetch(`/api/projects?filter=${x}`)          │
│                                                                  │
│  • 66 components with direct fetch() calls                       │
│  • No request deduplication                                      │
│  • No centralized error handling                                 │
│  • Mixed URL patterns (relative vs absolute)                     │
│  • No retry logic                                                │
│  • No response type validation                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  TARGET STATE (Recommended)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Component A ──┐                                                 │
│  Component B ──┼──► ApiClient ──► fetch() ──► Backend           │
│  Component C ──┤      │                                          │
│  Component D ──┘      ├── Error handling                         │
│                       ├── Request deduplication                  │
│                       ├── Retry logic                            │
│                       ├── Type validation (Zod)                  │
│                       └── Request/response logging               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Muddy/Indirect Data Flows

#### Issue 1: Duplicate Project Fetching

**Location:** `ProjectContextMenu.jsx` (lines 74-150)

```javascript
// 5 separate fetch calls for related data
fetch('/api/project-tags')
fetch(`/api/projects/by-path/${encodedPath}/tags`)
fetch(`/api/projects/by-path/${encodedPath}/settings`)
fetch(`/api/projects/by-path/${encodedPath}/notes`)
fetch(`/api/admin/project-stats?path=${...}`)
```

**Problem:** Same component makes 5 sequential requests that could be 1 aggregated endpoint.

**Solution:** Create `GET /api/projects/:path/context` that returns all related data.

#### Issue 2: Dashboard Widget Waterfall

**Location:** `HomeDashboard.jsx` (lines 45-180)

```javascript
// 11 independent fetch operations on mount
useEffect(() => {
  fetchProjects();     // /api/admin/projects-extended
  fetchSystem();       // /api/admin/system
  fetchDocker();       // /api/docker/containers?all=true
  fetchGitStatus();    // /api/dashboard (git section)
  fetchCommits();      // /api/dashboard (commits section)
  fetchPorts();        // /api/dashboard (ports section)
  fetchDiskUsage();    // /api/dashboard (disk section)
  fetchAiUsage();      // /api/dashboard (ai section)
  fetchSecurityAlerts(); // /api/dashboard (security section)
  // ...
}, []);
```

**Problem:** Sequential waterfall requests causing slow dashboard load.

**Solution:** Consolidate into single `GET /api/dashboard/full` endpoint or implement parallel fetching with Promise.all.

#### Issue 3: CodePuppy State Explosion

**Location:** `CodePuppyDashboard.jsx` (lines 15-70)

```javascript
// 10+ useState calls for related data
const [status, setStatus] = useState(null);
const [loading, setLoading] = useState(true);
const [sessions, setSessions] = useState([]);
const [agents, setAgents] = useState([]);
const [providers, setProviders] = useState({});
const [config, setConfig] = useState({});
const [mcpConfig, setMcpConfig] = useState(null);
const [mcpServers, setMcpServers] = useState([]);
// ... more states

// 8 separate fetch functions
const fetchStatus = async () => { ... }
const fetchSessions = async () => { ... }
const fetchAgents = async () => { ... }
// ...
```

**Problem:** Fragmented state management with duplicate fetch logic.

**Solution:** Consolidate into custom hook `useCodePuppy()` or context provider.

### 3.3 Contract Integrity Issues

**Missing Type Synchronization:**

| Frontend Expectation | Backend Response | Issue |
|---------------------|------------------|-------|
| `project.completionMetrics` | Sometimes undefined | No default value |
| `session.notes` | Array or null | Inconsistent typing |
| `agent.lastRun` | ISO string | Not validated |
| `container.status` | Enum | No enum validation |

**Solution:** Create shared Zod schemas between frontend and backend:

```typescript
// shared/schemas/project.ts
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  completionMetrics: z.object({
    tests: z.number().min(0).max(100),
    cicd: z.number().min(0).max(100),
    // ...
  }).optional().default({ tests: 0, cicd: 0 }),
});
```

---

## Phase 4: Production Hardening

### 4.1 Process Management Evaluation

**Current Implementation:** PM2 + Custom Watcher

**Watcher Service Analysis (`server/services/watcherService.js`):**

| Feature | Status | Assessment |
|---------|--------|------------|
| Health checks | ✅ 30s interval | Good |
| Process monitoring | ✅ 10s interval | Good |
| Memory threshold | ✅ 512MB limit | Good |
| Exponential backoff | ✅ 5s-5min | Good |
| Prisma regeneration | ✅ Auto-recovery | Good |
| Alert integration | ✅ Database-driven | Good |
| Detailed logging | ✅ Structured logs | Good |

**Recommendation:** Current PM2 + watcher setup is robust. No changes needed.

**Configuration (optimal):**
```javascript
CONFIG = {
  healthCheckInterval: 30000,   // 30 seconds
  processCheckInterval: 10000,  // 10 seconds
  maxMemoryMB: 512,
  maxRestartAttempts: 5,
  healthTimeout: 10000,
  initialBackoffMs: 5000,
  maxBackoffMs: 300000,
  backoffMultiplier: 2,
}
```

### 4.2 Observability Strategy

**Current State:** Partially implemented

| Component | Status | Gap |
|-----------|--------|-----|
| Distributed Tracing | ✅ Jaeger | None |
| Log Aggregation | ✅ Loki + Promtail | None |
| Metrics | ✅ Prometheus | None |
| Dashboards | ✅ Grafana | None |
| Alerts | ✅ AlertManager | None |
| Correlation IDs | ⚠️ Partial | Needs standardization |
| Frontend Logging | ❌ Missing | Critical gap |

**Correlation ID Strategy:**

```javascript
// Current (partial)
// X-Trace-Id header in responses

// Recommended (full)
// 1. Generate request ID at edge
// 2. Pass through all layers
// 3. Include in all log entries
// 4. Return to client for support

// server/middleware/requestId.js
export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Attach to logger context
  req.log = logger.child({ requestId });

  next();
}
```

**Frontend Error Tracking:**

```javascript
// src/services/errorReporter.js
export function reportError(error, context = {}) {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...context,
  };

  // Send to backend
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorReport),
  }).catch(() => {}); // Silent fail for error reporting

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Report]', errorReport);
  }
}
```

### 4.3 Monitoring Workflow

**Recommended Workflow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  PROACTIVE MONITORING WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. COLLECT                                                      │
│     ├── Prometheus scrapes /metrics every 15s                    │
│     ├── Promtail ships logs to Loki                              │
│     └── Jaeger receives traces via OTLP                          │
│                                                                  │
│  2. ALERT                                                        │
│     ├── AlertManager evaluates rules every 30s                   │
│     ├── Thresholds: error_rate > 1%, p95_latency > 500ms         │
│     └── Notifications: Webhook → n8n → Slack/Email               │
│                                                                  │
│  3. DIAGNOSE                                                     │
│     ├── Grafana dashboard shows anomalies                        │
│     ├── Click trace_id → Jaeger shows full request path          │
│     └── Search request_id in Loki for related logs               │
│                                                                  │
│  4. RESOLVE                                                      │
│     ├── Identify root cause from traces/logs                     │
│     ├── Fix in codebase                                          │
│     └── Verify fix in staging before production                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: UI Architecture & Testing Strategy

### 5.1 Admin Interface Audit

**Structure:** Well-organized into modular tabs

```
AdminDashboard (915 lines - acceptable)
├── ProjectsTab
├── SettingsTab (1,915 lines - NEEDS REFACTOR)
│   ├── GeneralPane
│   ├── AppearancePane
│   ├── ShortcutsPane
│   ├── PersonasPane
│   ├── IntegrationsPane
│   └── AuthPane
├── AutomationTab
│   ├── AgentsPane
│   └── McpPane
├── ServerTab (11 sub-panes)
│   ├── OverviewPane
│   ├── ServicesPane
│   ├── DockerPane
│   ├── StackPane
│   ├── PackagesPane
│   ├── LogsPane
│   ├── ProcessesPane
│   ├── NetworkPane
│   ├── ScheduledPane
│   ├── AuthentikPane
│   ├── UsersPane
│   └── ObservabilityPane (NEW)
├── SecurityTab
│   ├── ScansPane
│   ├── FirewallPane
│   ├── Fail2banPane
│   └── ScanConfigPane
└── HistoryTab
```

**Quality Assessment:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Error Boundaries | ✅ Per-tab | Good fault isolation |
| Loading States | ⚠️ Inconsistent | Some panes lack loading UI |
| Error States | ⚠️ Inconsistent | Need standardization |
| Accessibility | ❌ Not audited | Needs a11y review |
| Keyboard Navigation | ⚠️ Partial | Tab navigation exists |

### 5.2 Fragile Components Needing Refactoring

| Component | Lines | Issues | Priority |
|-----------|-------|--------|----------|
| **SettingsPanel.jsx** | 1,915 | Monolithic, 6 embedded panes | 🔴 P0 |
| **WidgetDashboard.jsx** | 1,198 | Complex widget logic, silent failures | 🔴 P0 |
| **App.jsx** | 1,171 | Routing, auth, global state mixed | 🔴 P0 |
| **ProjectContextMenu.jsx** | 1,052 | 5 fetch calls, complex state | 🟠 P1 |
| **CodePuppyDashboard.jsx** | 1,049 | 8 fetch functions, 10+ states | 🟠 P1 |
| **CreateProjectModal.jsx** | 997 | Multi-step form logic | 🟠 P1 |
| **ApiTester.jsx** | 661 | Silent catch blocks | 🟠 P1 |

### 5.3 Testing Strategy

#### Unit Testing (Vitest + React Testing Library)

**Target:** 80% coverage for components

**Priority Components:**

| Component | Criticality | Test Focus |
|-----------|-------------|------------|
| Terminal | Critical | Rendering, input handling, resize |
| AdminDashboard | Critical | Tab switching, data loading |
| Sidebar | High | Project list, filtering, selection |
| FileBrowser | High | Navigation, file operations |
| GitWorkflow | High | Git operations, status display |
| CommandPalette | High | Search, command execution |
| All Tab Panes | High | Data display, user actions |

**Example Test Structure:**

```javascript
// src/components/Terminal.test.jsx
describe('Terminal', () => {
  describe('rendering', () => {
    it('renders xterm container');
    it('displays loading state initially');
    it('shows error state on connection failure');
  });

  describe('input handling', () => {
    it('sends input to backend via socket');
    it('handles paste events');
    it('resizes terminal on container resize');
  });

  describe('session management', () => {
    it('reconnects on disconnect');
    it('preserves session on page refresh');
  });
});
```

#### Visual Testing (Storybook)

**Setup Required:**
```bash
npx storybook@latest init
```

**Priority Stories:**

1. **Design System Components**
   - Button variants
   - Input fields
   - Modal patterns
   - Tab navigation
   - Card layouts

2. **Complex Components**
   - Terminal (connected vs disconnected states)
   - Dashboard widgets (loading, error, data states)
   - Admin panes (various configurations)

**Example Story:**

```javascript
// src/components/Terminal.stories.jsx
export default {
  title: 'Components/Terminal',
  component: Terminal,
};

export const Connected = {
  args: {
    project: mockProject,
    connected: true,
  },
};

export const Disconnected = {
  args: {
    project: mockProject,
    connected: false,
  },
};

export const WithError = {
  args: {
    project: mockProject,
    error: 'Connection failed',
  },
};
```

#### Integration/E2E Testing (Playwright)

**Target:** Critical user paths

**Priority Flows:**

1. **Authentication Flow**
   - Login via Authentik
   - Session persistence
   - Logout

2. **Terminal Flow**
   - Project selection
   - Terminal connection
   - Command execution
   - Session reconnection

3. **Admin Flow**
   - Navigate to admin
   - Switch tabs
   - Modify settings
   - Save changes

4. **Git Flow**
   - View status
   - Stage changes
   - Commit
   - Push

**Example E2E Test:**

```javascript
// tests/e2e/terminal.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="project-list"]');
  });

  test('connects to project terminal', async ({ page }) => {
    // Select project
    await page.click('[data-testid="project-item"]:first-child');

    // Wait for terminal
    await page.waitForSelector('.xterm-screen');

    // Type command
    await page.keyboard.type('echo "test"');
    await page.keyboard.press('Enter');

    // Verify output
    await expect(page.locator('.xterm-screen')).toContainText('test');
  });
});
```

---

## Implementation Roadmap

### Phase 1: Critical Security Fixes (Week 1-2)

| Task | Priority | Effort |
|------|----------|--------|
| Remove/secure SQL query endpoint | 🔴 P0 | 2h |
| Add validation to infrastructure.js | 🔴 P0 | 4h |
| Add validation to usersFirewall.js | 🔴 P0 | 4h |
| Add validation to cloudflare.js | 🔴 P0 | 4h |
| Fix silent catch blocks (8 files) | 🔴 P0 | 2h |
| Add rate limiting to high-risk endpoints | 🟠 P1 | 2h |

### Phase 2: API Abstraction Layer (Week 3-4)

| Task | Priority | Effort |
|------|----------|--------|
| Create src/services/api.js | 🔴 P0 | 8h |
| Implement error handling wrapper | 🔴 P0 | 4h |
| Add request deduplication | 🟠 P1 | 4h |
| Add retry logic | 🟠 P1 | 2h |
| Migrate 66 components to use API client | 🟠 P1 | 16h |

### Phase 3: Component Refactoring (Week 5-6)

| Task | Priority | Effort |
|------|----------|--------|
| Split SettingsPanel.jsx | 🔴 P0 | 8h |
| Split WidgetDashboard.jsx | 🔴 P0 | 6h |
| Refactor App.jsx | 🔴 P0 | 6h |
| Create useCodePuppy hook | 🟠 P1 | 4h |
| Standardize error/loading states | 🟠 P1 | 4h |

### Phase 4: Testing Infrastructure (Week 7-8)

| Task | Priority | Effort |
|------|----------|--------|
| Add API route tests (42 files) | 🔴 P0 | 24h |
| Add critical component tests | 🔴 P0 | 16h |
| Set up Playwright E2E | 🟠 P1 | 8h |
| Add coverage enforcement to CI | 🟠 P1 | 2h |
| Set up Storybook | 🟡 P2 | 8h |

### Phase 5: Observability & Monitoring (Week 9-10)

| Task | Priority | Effort |
|------|----------|--------|
| Standardize correlation IDs | 🟠 P1 | 4h |
| Add frontend error reporting | 🟠 P1 | 4h |
| Create Grafana dashboards | 🟡 P2 | 8h |
| Set up alert rules | 🟡 P2 | 4h |
| Document monitoring workflow | 🟡 P2 | 2h |

---

## Success Criteria

| Metric | Current | Target | Verification |
|--------|---------|--------|--------------|
| Test Coverage | <5% | 80% | CI coverage report |
| Input Validation | 76% | 100% | Code audit |
| Security Vulnerabilities | 5+ | 0 critical | Security scan |
| Silent Failures | 8 files | 0 | Grep audit |
| Components >500 lines | 11 | 0 | LOC analysis |
| API Abstraction | None | Centralized | Architecture review |
| E2E Test Coverage | 0% | Critical paths | Playwright reports |

---

## Appendix A: Endpoint Simplification Recommendations

### Consolidation Opportunities

| Current Endpoints | Proposed Endpoint | Benefit |
|-------------------|-------------------|---------|
| `/api/project-tags` + `/api/projects/by-path/:path/tags` + `/api/projects/by-path/:path/settings` + `/api/projects/by-path/:path/notes` | `GET /api/projects/:path/context` | 4 → 1 request |
| `/api/dashboard` (6 sections fetched separately) | `GET /api/dashboard/full` | 6 → 1 request |
| `/api/code-puppy/status` + `/api/code-puppy/sessions` + `/api/code-puppy/agents` + `/api/code-puppy/config` | `GET /api/code-puppy/state` | 4 → 1 request |

### Deprecation Candidates

| Endpoint | Reason | Action |
|----------|--------|--------|
| `POST /api/db/query` | SQL injection risk | Remove or heavily restrict |
| `POST /network/ping` | Command injection risk | Add strict validation or remove |
| `POST /packages/install` | Command injection risk | Add allowlist validation |

---

## Appendix B: File Reference Index

**Critical Files Requiring Immediate Attention:**

```
SECURITY:
├── server/routes/devtools.js:505 (SQL injection)
├── server/routes/infrastructure.js:540,582,611 (Command injection)
├── server/routes/usersFirewall.js (No validation)
└── server/routes/cloudflare.js (No validation)

ERROR HANDLING:
├── server/index.js (Silent catch)
├── server/routes/cloudflare.js (Silent catch)
├── src/components/ApiTester.jsx:98,333,340 (Silent catch)
└── src/components/WidgetDashboard.jsx (Silent catch)

REFACTORING:
├── src/components/SettingsPanel.jsx (1,915 lines)
├── src/components/WidgetDashboard.jsx (1,198 lines)
├── src/App.jsx (1,171 lines)
└── src/components/CodePuppyDashboard.jsx (1,049 lines)

TESTING:
├── server/routes/*.js (0% API test coverage)
├── src/components/*.jsx (3% component coverage)
└── tests/e2e/ (Does not exist)
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-17
**Next Review:** After Phase 1 completion
