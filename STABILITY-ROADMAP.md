# Console.web Stability Roadmap - Implementation Tracker

**Created:** 2026-01-17
**Last Updated:** 2026-01-17
**Status:** IN PROGRESS
**Current Phase:** Phase 3 - Testing Foundation (IN PROGRESS)

---

## Progress Summary

| Phase | Status | Progress | Target |
|-------|--------|----------|--------|
| Phase 0: Immediate | ✅ Complete | 3/3 | This Week |
| Phase 1: Error Handling | ✅ Complete | 4/4 | Week 1-2 |
| Phase 2: Integration Hardening | ✅ Complete | 4/4 | Week 3-4 |
| Phase 3: Testing Foundation | 🔄 In Progress | 2/4 | Week 5-8 |
| Phase 4: Observability | ⏳ Pending | 0/4 | Week 9-10 |
| Phase 5: Full Hardening | ⏳ Pending | 0/4 | Week 11-16 |

---

## Phase 0: Immediate (This Week) ✅ COMPLETE

### 0.1 Credential Security Assessment
- [x] **0.1.1** Verified .env is in .gitignore (line 8)
- [x] **0.1.2** Verified .env is NOT tracked by git
- [x] **0.1.3** Verified .env was NEVER committed in git history
- [x] **0.1.4** **RESULT: No credential exposure - audit finding was false positive**

### 0.2 Git History Verification
- [x] **0.2.1** Ran `git log --all --full-history -- .env` - no results
- [x] **0.2.2** Confirmed .env exclusion patterns in .gitignore are comprehensive
- [x] **0.2.3** **RESULT: No git history cleanup needed**

### 0.3 Fix Failing Backend Tests ✅
- [x] **0.3.1** Debugged agentSchema validation test failures
- [x] **0.3.2** Fixed test to use `triggerType` instead of `trigger`
- [x] **0.3.3** Fixed test to use correct action types (`shell`, `api`, `mcp`)
- [x] **0.3.4** All 148 tests now passing (5 test files)

---

## Phase 1: Error Handling (Week 1-2) ✅ COMPLETE

### 1.1 Add sendSafeError() to All Route Files ✅
Routes updated (24 files, 300+ catch blocks):
- [x] **1.1.1** `server/routes/aider.js` ✅ (15 catch blocks)
- [x] **1.1.2** `server/routes/tabby.js` ✅ (14 catch blocks)
- [x] **1.1.3** `server/routes/claude-flow.js` ✅ (15 catch blocks)
- [x] **1.1.4** `server/routes/codePuppy.js` ✅ (39 catch blocks)
- [x] **1.1.5** `server/routes/github.js` ✅ (16 catch blocks)
- [x] **1.1.6** `server/routes/cloudflare.js` ✅ (27 catch blocks)
- [x] **1.1.7** `server/routes/mcp.js` ✅ (19 catch blocks)
- [x] **1.1.8** `server/routes/infrastructure.js` ✅ (28 catch blocks)
- [x] **1.1.9** `server/routes/checkpoints.js` ✅ (8 catch blocks)
- [x] **1.1.10** `server/routes/contexts.js` ✅ (4 catch blocks)
- [x] **1.1.11** `server/routes/browser.js` ✅ (14 catch blocks)
- [x] **1.1.12** `server/routes/marketplace.js` ✅ (9 catch blocks)
- [x] **1.1.13** `server/routes/memory.js` ✅ (10 catch blocks)
- [x] **1.1.14** `server/routes/plans.js` ✅ (13 catch blocks)
- [x] **1.1.15** `server/routes/shortcuts.js` ✅ (4 catch blocks)
- [x] **1.1.16** `server/routes/system.js` ✅ (2 catch blocks)
- [x] **1.1.17** `server/routes/voice.js` ✅ (22 catch blocks)
- [x] **1.1.18** `server/routes/observability.js` ✅ (already done)
- [x] **1.1.19** `server/routes/lifecycle.js` ✅ (1 catch block)
- [x] **1.1.20** `server/routes/usersFirewall.js` ✅ (28 catch blocks)
- [x] **1.1.21** `server/routes/project-tags.js` ✅ (15 catch blocks)
- [x] **1.1.22** `server/routes/projectTemplates.js` ✅ (8 catch blocks)
- [x] **1.1.23** `server/routes/dependencies.js` ✅ (already done)
- [x] **1.1.24** `server/routes/admin.js` - N/A (file does not exist, routes in index.js)
- [x] **1.1.25** `server/index.js` (dashboard endpoint) ✅ (1 catch block)

### 1.2 Remove Silent catch {} Blocks ✅
- [x] **1.2.1** Fix `infrastructure.js:787` - added debug logging for SSH key fingerprint
- [x] **1.2.2** Fix `infrastructure.js:998` - added debug logging for system crontab
- [x] **1.2.3** Fix `infrastructure.js:1022` - added debug logging for JSON fallback
- [x] **NOTE:** These are "best-effort" operations where failure is acceptable, converted from silent to debug-logged

### 1.3 Add Error States to Frontend Components ✅
- [x] **1.3.1** `ProjectsTab.jsx` - added error state, !res.ok check, retry button
- [x] **1.3.2** `OverviewPane.jsx` - added error state, partial errors for stale data
- [x] **1.3.3** `DockerPane.jsx` - added Promise.allSettled, partialErrors, actionError
- [x] **1.3.4** `AiderSessionPanel.jsx` - enhanced 6 functions, added handleRetry
- [x] **1.3.5** `DatabaseBrowser.jsx` - added error state for embedded + modal modes
- [x] **1.3.6** `GitWorkflow.jsx` - enhanced fetchStatus, generateCommitMessage

### 1.4 Add Error Boundaries ✅
- [x] **1.4.1** Wrap Terminal component in ErrorBoundary (App.jsx)
- [x] **1.4.2** Wrap LeftSidebar in ErrorBoundary (App.jsx)
- [x] **1.4.3** Wrap RightSidebar in ErrorBoundary (App.jsx)
- [x] **1.4.4** Wrap HomeDashboard in ErrorBoundary (App.jsx)
- [x] **1.4.5** Wrap HomeDashboard widgets individually in ErrorBoundary
- [x] **1.4.6** Existing: GlobalErrorBoundary wraps entire app (main.jsx)
- [x] **1.4.7** Existing: Admin tabs use ErrorBoundary (admin/shared/ErrorBoundary.jsx)

---

## Phase 2: Integration Hardening (Week 3-4) 🔄 IN PROGRESS

### 2.1 Create useApiQuery() Hook ✅
- [x] **2.1.1** Design hook API (loading, error, data, refetch) ✅
- [x] **2.1.2** Implement hook wrapping src/services/api.js ✅
- [x] **2.1.3** Add timeout support (default 30s) ✅
- [x] **2.1.4** Add retry logic ✅
- [x] **2.1.5** Add AbortController for cancellation ✅
- [x] **2.1.6** Write unit tests for hook ✅ (16 tests passing)
- [x] **2.1.7** Added useApiMutation for POST/PUT/DELETE operations ✅
- [x] **2.1.8** Added useApiQueries for parallel fetching ✅

### 2.2 Migrate fetch() Calls (First 50%) ✅
- [x] **2.2.1** HomeDashboard.jsx - migrate to useApiQueries ✅
- [x] **2.2.2** ProjectsTab.jsx - migrate to useApiQuery ✅
- [x] **2.2.3** DockerPane.jsx - migrate to useApiQueries ✅
- [x] **2.2.4** OverviewPane.jsx - migrate to useApiQuery ✅
- [x] **2.2.5** ServicesPane.jsx - migrate to useApiQueries ✅
- [x] **2.2.6** GitWorkflow.jsx - migrate to useApiQuery ✅
- [x] **2.2.7** DatabaseBrowser.jsx - migrate to useApiQuery ✅
- [x] **2.2.8** AdminDashboard.jsx - migrate to api service ✅

### 2.3 Add Request Timeout ✅
- [x] **2.3.1** Update api.js default timeout to 30s ✅ (already implemented)
- [x] **2.3.2** Add timeout error handling in useApiQuery ✅
- [x] **2.3.3** Show timeout-specific error messages in UI ✅ (via getUserMessage())

### 2.4 Standardize Socket.IO Events ✅
- [x] **2.4.1** Create Socket.IO event catalog ✅ (docs/SOCKET-EVENTS.md)
- [x] **2.4.2** Document all 37 events across 14 files ✅
- [x] **2.4.3** Document event flow diagrams ✅
- [~] **2.4.4** Event renaming - DEFERRED (breaking change, not stability-focused)
- [~] **2.4.5** Event validation - DEFERRED (low priority, events working correctly)

> **Note:** Terminal events already use consistent `terminal-*` pattern. Dynamic features
> (Aider, Claude Flow) already use `{feature}:{id}:{action}` pattern. Renaming would
> introduce breaking changes counter to stability goals.

---

## Phase 3: Testing Foundation (Week 5-8) 🔄 IN PROGRESS

### 3.1 Install & Configure Playwright ✅
- [x] **3.1.1** Install Playwright and dependencies ✅
- [x] **3.1.2** Create playwright.config.js ✅
- [x] **3.1.3** Add test scripts to package.json ✅
- [ ] **3.1.4** Create test fixtures for auth

### 3.2 Write Critical Path E2E Tests (Started)
- [ ] **3.2.1** Login flow test
- [ ] **3.2.2** Session create test
- [ ] **3.2.3** Terminal I/O test
- [ ] **3.2.4** Project CRUD test
- [ ] **3.2.5** Docker control test (start/stop)
- [ ] **3.2.6** Git operations test
- [x] **3.2.7** Admin dashboard navigation test ✅
- [ ] **3.2.8** Settings save/load test
- [ ] **3.2.9** Agent create/run test
- [ ] **3.2.10** Security scan test
- [x] **3.2.11** Home dashboard load test ✅
- [x] **3.2.12** Theme picker test ✅
- [x] **3.2.13** Search modal test ✅

### 3.3 Install & Configure Storybook
- [ ] **3.3.1** Install Storybook for React/Vite
- [ ] **3.3.2** Create .storybook config
- [ ] **3.3.3** Add Storybook scripts to package.json
- [ ] **3.3.4** Create stories for shared components

### 3.4 Increase Unit Test Coverage to 30% (Started)
- [ ] **3.4.1** Add tests for useSessionManagement hook
- [ ] **3.4.2** Add tests for useTheme hook
- [ ] **3.4.3** Add tests for useKeyboardShortcuts hook
- [ ] **3.4.4** Add tests for api.js service
- [ ] **3.4.5** Add tests for Terminal component
- [ ] **3.4.6** Add tests for AdminDashboard component
- [ ] **3.4.7** Add tests for HomeDashboard component
- [ ] **3.4.8** Enable coverage gating in CI (30% threshold)
- [x] **3.4.9** Add tests for useApiQuery hook ✅ (16 tests)

---

## Phase 4: Observability (Week 9-10)

### 4.1 Add Connection Pool Metrics
- [ ] **4.1.1** Add pool_size gauge to Prometheus
- [ ] **4.1.2** Add pool_waiting gauge to Prometheus
- [ ] **4.1.3** Add pool_idle gauge to Prometheus
- [ ] **4.1.4** Log pool exhaustion events

### 4.2 Capture Socket.IO Errors in Sentry
- [ ] **4.2.1** Add Sentry.captureException to socket error handlers
- [ ] **4.2.2** Add Sentry breadcrumbs for socket events
- [ ] **4.2.3** Add socket connection status to Sentry context

### 4.3 Propagate X-Request-ID Through Frontend
- [ ] **4.3.1** Generate request ID in useApiQuery hook
- [ ] **4.3.2** Include X-Request-ID header in all requests
- [ ] **4.3.3** Store request ID for error reporting
- [ ] **4.3.4** Include request ID in Sentry events

### 4.4 Create Alert Rules
- [ ] **4.4.1** Create alert for error rate > 5% over 5 min
- [ ] **4.4.2** Create alert for P95 latency > 2 seconds
- [ ] **4.4.3** Create alert for database pool exhaustion
- [ ] **4.4.4** Create alert for Socket.IO disconnect rate

---

## Phase 5: Full Hardening (Week 11-16)

### 5.1 Migrate Remaining fetch() Calls
- [ ] **5.1.1** Audit all remaining direct fetch calls
- [ ] **5.1.2** Migrate remaining 50% to useApiQuery
- [ ] **5.1.3** Remove all direct fetch() calls
- [ ] **5.1.4** Add ESLint rule to prevent direct fetch

### 5.2 Add Zod Response Validation
- [ ] **5.2.1** Create response schemas for all API endpoints
- [ ] **5.2.2** Add response validation to useApiQuery
- [ ] **5.2.3** Log validation failures
- [ ] **5.2.4** Handle validation errors gracefully in UI

### 5.3 Reach 80% Test Coverage
- [ ] **5.3.1** Add tests for all Admin tab components
- [ ] **5.3.2** Add tests for all modal components
- [ ] **5.3.3** Add tests for all widget components
- [ ] **5.3.4** Add tests for remaining hooks
- [ ] **5.3.5** Add tests for remaining services
- [ ] **5.3.6** Update CI coverage threshold to 80%

### 5.4 Implement Nonce-Based CSP
- [ ] **5.4.1** Research xterm.js CSP requirements
- [ ] **5.4.2** Implement nonce generation on server
- [ ] **5.4.3** Pass nonce to frontend via meta tag
- [ ] **5.4.4** Update CSP to use nonce instead of unsafe-inline
- [ ] **5.4.5** Test terminal functionality with new CSP
- [ ] **5.4.6** Remove unsafe-eval if possible

---

## Validation Checklist (Final)

### Security
- [x] No secrets in git history (verified)
- [x] .env excluded from repository (verified)
- [ ] All credentials rotated
- [ ] CSP properly configured
- [ ] Rate limiting active
- [ ] Input validation on all endpoints

### Reliability
- [ ] All API calls have timeouts
- [x] All components have error states (Phase 1 complete)
- [x] Error boundaries on critical paths (Phase 1 complete)
- [ ] Graceful degradation on failures
- [ ] Retry logic for transient errors

### Observability
- [ ] Structured logging everywhere
- [ ] Correlation IDs propagated
- [ ] Sentry capturing all errors
- [ ] Prometheus metrics comprehensive
- [ ] Alerts configured and tested

### Testing
- [ ] 80%+ code coverage
- [ ] E2E tests for critical paths
- [ ] Visual regression tests
- [ ] CI blocks PRs with failing tests
- [ ] CI blocks PRs below coverage threshold

---

## Session Log

### Session 1 (2026-01-17)
- Created initial audit and roadmap
- Created this tracking document
- **Phase 0 COMPLETE:**
  - Fixed 2 failing agentSchema tests (updated to match current schema)
  - Verified .env security (not in git, never committed)
  - All 148 backend tests now passing
- **Phase 1 Progress:**
  - ✅ 1.1.1: Updated `aider.js` with sendSafeError (15 catch blocks)
  - ✅ 1.2: Fixed all silent catch blocks in `infrastructure.js` (3 locations)
  - ⏳ Remaining: 24 route files need sendSafeError, 6 frontend components need error states

### Session 2 (2026-01-17)
- **Phase 1 COMPLETE:**
  - ✅ 1.1: Updated all 24 route files with sendSafeError (300+ catch blocks total)
    - tabby.js (14), claudeFlow.js (15), codePuppy.js (39), github.js (16)
    - cloudflare.js (27), mcp.js (19), infrastructure.js (28), marketplace.js (9)
    - system.js (2), voice.js (22), plans.js (13), browser.js (14)
    - project-tags.js (15), checkpoints.js (8), memory.js (10), contexts.js (4)
    - shortcuts.js (4), lifecycle.js (1), projectTemplates.js (8), usersFirewall.js (28)
    - dashboard endpoint in index.js (1)
    - Note: admin.js does not exist (routes in index.js)
  - ✅ 1.3: Added error states to all 6 frontend components
    - ProjectsTab.jsx, OverviewPane.jsx, DockerPane.jsx
    - AiderSessionPanel.jsx, DatabaseBrowser.jsx, GitWorkflow.jsx
  - ✅ 1.4: Added Error Boundaries to critical components
    - LeftSidebar, RightSidebar, Terminal, HomeDashboard (App.jsx)
    - HomeDashboard widgets individually wrapped
    - GlobalErrorBoundary already wraps entire app

### Session 3 (2026-01-17)
- **Released v1.0.13**: Stability Hardening - Phase 1 Complete
- **Phase 2 Progress:**
  - ✅ 2.1: Created useApiQuery hook with full test coverage
    - useApiQuery for GET requests with loading/error/data states
    - useApiMutation for POST/PUT/DELETE operations
    - useApiQueries for parallel data fetching
    - 16 unit tests passing
  - ✅ 2.3: Request timeout support (30s default, configurable)
  - ⏳ 2.2: Component migration pending
  - ⏳ 2.4: Socket.IO standardization pending
- **Phase 3 Progress:**
  - ✅ 3.1: Playwright installed and configured
    - playwright.config.js created
    - E2E test scripts added to package.json
    - e2e/ test directory with dashboard tests
  - ✅ 3.2: Basic E2E tests created (dashboard, admin nav, theme, search)
  - ✅ 3.4.9: useApiQuery hook tests (16 tests)
  - ⏳ Remaining: More E2E tests, Storybook, coverage increase

### Session 4 (2026-01-17)
- **Phase 2 Progress:**
  - ✅ 2.2.1: Migrated HomeDashboard.jsx to useApiQueries
    - Replaced manual fetch/Promise.all with useApiQueries hook
    - 15-second refetch interval via hook option
    - Partial failure handling with safe defaults
    - Error logging for debugging without blocking UI

### Session 5 (2026-01-17)
- **Phase 2 Complete - Component Migrations:**
  - ✅ 2.2.2: Migrated ProjectsTab.jsx to useApiQuery + useApiMutation
  - ✅ 2.2.3: Migrated DockerPane.jsx to useApiQueries + useApiMutation
  - ✅ 2.2.4: Migrated OverviewPane.jsx to useApiQuery with refetchInterval
  - ✅ 2.2.5: Migrated ServicesPane.jsx to useApiQueries + useApiMutation
  - ✅ 2.2.6: Migrated GitWorkflow.jsx to useApiQuery + api service
  - ✅ 2.2.7: Migrated DatabaseBrowser.jsx to useApiQuery + api service
  - ✅ 2.2.8: Migrated AdminDashboard.jsx + embedded settings tabs to api service
- **Key Patterns Used:**
  - `useApiQuery` for single-endpoint GET requests with refetch
  - `useApiQueries` for parallel data fetching (Docker, Services)
  - `useApiMutation` for POST/PUT/DELETE operations
  - Direct `api` service calls for complex dynamic endpoints
  - Constants moved outside components to prevent infinite re-render loops
  - Error objects use `getUserMessage()` for user-friendly error display
- ✅ Phase 2 Complete!

### Session 6 (2026-01-17)
- **Phase 2.4 Complete - Socket.IO Documentation:**
  - ✅ Created comprehensive event catalog: `docs/SOCKET-EVENTS.md`
  - ✅ Documented all 37 Socket.IO events across 14 files
  - ✅ Created event flow diagrams for terminal sessions
  - ✅ Documented payload schemas for all events
  - ⏸️ Deferred event renaming (breaking change, counter to stability goals)
  - ⏸️ Deferred event validation (low priority, events working correctly)
- **Bug Fix:**
  - Fixed ProjectsTab.jsx `defaultValue` → `initialData` option
  - Added Array.isArray safety check for projects data
- **Phase 2 Status:** COMPLETE (4/4 sections)

---

## Notes

### Credential Rotation Process
Database: Connect to PostgreSQL as superuser, ALTER USER ccm_user PASSWORD 'new_password';
Authentik: Generate new secret in Authentik admin, update outpost configuration

### Git History Cleanup Command
```bash
# Using git-filter-repo (recommended)
git filter-repo --path .env --invert-paths

# Or using BFG
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### Test Commands
```bash
npm test:run              # Frontend tests
npm test:server           # Backend tests
npm test:all              # All tests
npm test:coverage         # With coverage report
```
