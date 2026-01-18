# ENTERPRISE ROADMAP: Console.web Mission Control & Multi-User Upgrade

**Version:** 1.0.0
**Created:** 2026-01-18
**Status:** Awaiting Approval
**Author:** Architecture Audit

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Summary](#2-current-state-summary)
3. [The RBAC Plan](#3-the-rbac-plan)
4. [Enterprise Gap Analysis](#4-enterprise-gap-analysis)
5. [Master Prioritization Matrix](#5-master-prioritization-matrix)
6. [Implementation Phases](#6-implementation-phases)
7. [Technical Specifications](#7-technical-specifications)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Executive Summary

### Mission

Transform console-web from a single-user development tool into an enterprise-grade "Mission Control" interface with:
- **Multi-User RBAC**: Role-based access control with Admin/User isolation
- **Mission Control UI**: Three-pane layout with Agent Observability
- **Enterprise Security**: Audit logging, resource quotas, and tenant isolation

### Current State

Console-web has **excellent authentication infrastructure** (Authentik SSO) but **zero authorization enforcement**. All 350+ API endpoints operate in "permissive" mode where `req.user` exists but is ignored for data filtering.

### Critical Findings

| Area | Current State | Risk Level |
|------|---------------|------------|
| Authentication | Authentik SSO ✓ | LOW |
| Authorization (RBAC) | NOT IMPLEMENTED | **CRITICAL** |
| Data Isolation | None - all data shared | **CRITICAL** |
| Admin Route Protection | Path-based only, no checks | **CRITICAL** |
| Audit Logging | None | HIGH |
| Resource Quotas | None | MEDIUM |
| Agent Observability | Not implemented | MEDIUM |

---

## 2. Current State Summary

### 2.1 Authentication Architecture

**Model:** Authentik SSO with Proxy Provider pattern

```
Request Flow:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Browser   │───▶│   Authentik  │───▶│ Console-web │
│             │    │    Proxy     │    │   Server    │
└─────────────┘    └──────────────┘    └─────────────┘
                         │
                   Injects Headers:
                   - X-authentik-username
                   - X-authentik-email
                   - X-authentik-groups
                   - X-authentik-uid
```

**User Context Object (req.user):**
```javascript
{
  id: string,              // Authentik UID
  email: string,           // User email
  name: string,            // Display name
  username: string,        // Authentik username
  groups: string[],        // Group memberships
  isAdmin: boolean         // Binary admin flag
}
```

**Admin Determination:** Checks against hardcoded groups: `['authentik Admins', 'Administrators', 'admins']`

**Key Files:**
- `server/middleware/authentik.js` (389 lines) - Auth extraction
- `server/middleware/authorize.js` (351 lines) - Resource authorization (partial)
- `src/hooks/useAuth.jsx` (227 lines) - Frontend auth state

### 2.2 Session Management Architecture

**Two-Layer Persistence:**

```
┌─────────────────────────────────────────────────────┐
│                    Layer 1: Shpool                  │
│  - Persistent background terminal multiplexer       │
│  - Session name: "cp-{project-name}"               │
│  - Survives client disconnects                      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               Layer 2: PostgreSQL                   │
│  - Session metadata (status, timestamps)            │
│  - Command history                                  │
│  - Notes, tags, folders                            │
│  - NO USER OWNERSHIP FIELDS                        │
└─────────────────────────────────────────────────────┘
```

**Database Schema (Session Model):**
```prisma
model Session {
  id              String        @id @default(cuid())
  projectId       String
  sessionName     String        // tmux session identifier
  status          SessionStatus // ACTIVE, IDLE, DISCONNECTED, TERMINATED
  startedAt       DateTime
  lastActiveAt    DateTime
  // ... terminal state fields

  // MISSING: userId, ownerId, createdBy
  // Result: All sessions visible to all users
}
```

**Socket.IO Events:**
| Event | Direction | Purpose |
|-------|-----------|---------|
| `select-project` | Client → Server | Connect to terminal |
| `terminal-input` | Client → Server | Send keystrokes |
| `terminal-output` | Server → Client | Display output |
| `reconnect-session` | Client → Server | Reattach to session |
| `kill-session` | Client → Server | Terminate session |

### 2.3 API Route Analysis

**Statistics:**
- **41 route files**
- **350+ endpoints**
- **0 user-level filtering**

**Route Access Patterns:**

| Pattern | % of Routes | Description |
|---------|-------------|-------------|
| Global Data Access | ~60% | Returns ALL data, no user filter |
| Admin-Only (unprotected) | ~12% | Under `/api/admin-*` but no checks |
| Project-Scoped | ~15% | Checks project exists, not ownership |
| Rate-Limited Only | ~13% | Destructive ops with rate limits only |

**Critical Unprotected Admin Routes:**
```
/api/admin-users/authentik/*     - Manage all Authentik users
/api/admin-users/firewall/*      - Control UFW firewall
/api/infra/packages/*            - Install/remove packages
/api/infra/processes/:pid/kill   - Kill any process
/api/infra/network/reboot        - System reboot
/api/infra/network/shutdown      - System shutdown
/api/docker/*                    - Container management
```

### 2.4 Frontend Layout

**Current Three-Pane Structure:**
```
┌──────────────┬─────────────────────────┬──────────────┐
│              │                         │              │
│  Left (w-72) │     Center (flex-1)     │ Right (w-72) │
│              │                         │              │
│  - Projects  │  - Terminal (xterm.js)  │  - System    │
│  - Search    │  - Home Dashboard       │    Stats     │
│  - Favorites │  - Admin Dashboard      │  - Sessions  │
│  - Sort      │                         │  - Git       │
│              │                         │  - Health    │
└──────────────┴─────────────────────────┴──────────────┘
```

**Auth Integration:**
- `RequireAuth` component wraps protected routes
- `useAuth()` hook provides user context
- Only binary `isAdmin` check available
- No granular permission guards

---

## 3. The RBAC Plan

### 3.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    SUPER_ADMIN                      │
│  - Full system access                               │
│  - User/team management                             │
│  - Infrastructure control                           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                      ADMIN                          │
│  - Manage team projects                             │
│  - View all team sessions                           │
│  - Run agents, manage Docker                        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                      USER                           │
│  - Own projects/sessions only                       │
│  - Personal prompts/snippets                        │
│  - Limited agent execution                          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                     VIEWER                          │
│  - Read-only access to shared resources             │
│  - Cannot create/modify                             │
│  - Cannot execute agents or terminals               │
└─────────────────────────────────────────────────────┘
```

### 3.2 Permission Matrix

| Resource | SUPER_ADMIN | ADMIN | USER | VIEWER |
|----------|-------------|-------|------|--------|
| **Sessions** |
| View All Sessions | ✓ | ✓ (team) | Own only | Shared only |
| Create Session | ✓ | ✓ | ✓ | ✗ |
| Kill Any Session | ✓ | ✓ (team) | Own only | ✗ |
| **Projects** |
| View All Projects | ✓ | ✓ (team) | Assigned | Shared only |
| Modify CLAUDE.md | ✓ | ✓ | ✓ (own) | ✗ |
| Delete Project | ✓ | ✓ (team) | ✗ | ✗ |
| **Infrastructure** |
| Docker Control | ✓ | ✓ | ✗ | ✗ |
| Firewall Rules | ✓ | ✗ | ✗ | ✗ |
| Package Management | ✓ | ✗ | ✗ | ✗ |
| System Reboot | ✓ | ✗ | ✗ | ✗ |
| **Agents** |
| View All Agents | ✓ | ✓ | Own + shared | ✗ |
| Run Agents | ✓ | ✓ | Own only | ✗ |
| Create Agents | ✓ | ✓ | ✓ | ✗ |
| **Collaboration** |
| Share Sessions | ✓ | ✓ | ✓ (own) | ✗ |
| Comment on Sessions | ✓ | ✓ | ✓ | ✓ |
| View Audit Logs | ✓ | ✓ (team) | ✗ | ✗ |

### 3.3 Database Schema Changes

**New Models:**

```prisma
model User {
  id            String   @id  // From Authentik UID
  email         String   @unique
  name          String
  role          Role     @default(USER)
  teamId        String?
  team          Team?    @relation(fields: [teamId], references: [id])

  // Ownership relations
  sessions      Session[]
  folders       SessionFolder[]
  prompts       Prompt[]
  snippets      CommandSnippet[]
  agents        Agent[]

  // Audit
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?
}

enum Role {
  SUPER_ADMIN
  ADMIN
  USER
  VIEWER
}

model Team {
  id            String   @id @default(cuid())
  name          String
  members       User[]
  projects      ProjectAssignment[]
  createdAt     DateTime @default(now())
}

model ProjectAssignment {
  id            String   @id @default(cuid())
  teamId        String
  team          Team     @relation(fields: [teamId], references: [id])
  projectPath   String
  accessLevel   AccessLevel @default(READ_WRITE)
}

enum AccessLevel {
  READ_ONLY
  READ_WRITE
  ADMIN
}

model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  action        String   // CREATE, READ, UPDATE, DELETE, EXECUTE
  resource      String   // session, project, agent, etc.
  resourceId    String?
  metadata      Json?
  ipAddress     String?
  userAgent     String?
  timestamp     DateTime @default(now())

  @@index([userId])
  @@index([resource, resourceId])
  @@index([timestamp])
}
```

**Modified Models (add ownership):**

```prisma
model Session {
  // ... existing fields
  ownerId       String?   // NEW: User who created session
  owner         User?     @relation(fields: [ownerId], references: [id])
}

model SessionFolder {
  // ... existing fields
  ownerId       String?   // NEW
  owner         User?     @relation(fields: [ownerId], references: [id])
}

model Prompt {
  // ... existing fields
  ownerId       String?   // NEW
  owner         User?     @relation(fields: [ownerId], references: [id])
  isShared      Boolean   @default(false)  // NEW: visible to team
}

model Agent {
  // ... existing fields
  ownerId       String?   // NEW
  owner         User?     @relation(fields: [ownerId], references: [id])
  isPublic      Boolean   @default(false)  // NEW: marketplace agents
}
```

### 3.4 Middleware Implementation

**Authorization Middleware Factory:**

```javascript
// server/middleware/rbac.js

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

export function requireOwnership(resourceType) {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user.id;

    const resource = await prisma[resourceType].findUnique({
      where: { id: resourceId },
      select: { ownerId: true }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Super admins bypass ownership checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Admins can access team resources
    if (req.user.role === 'ADMIN') {
      const isTeamResource = await checkTeamAccess(userId, resourceId, resourceType);
      if (isTeamResource) return next();
    }

    // Users can only access their own resources
    if (resource.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}

export function auditLog(action, resource) {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function(body) {
      // Log after successful response
      if (res.statusCode < 400) {
        prisma.auditLog.create({
          data: {
            userId: req.user?.id || 'anonymous',
            action,
            resource,
            resourceId: req.params.id,
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          }
        }).catch(console.error);
      }

      return originalSend.call(this, body);
    };

    next();
  };
}
```

**Route Protection Example:**

```javascript
// Before (current - no protection)
router.delete('/sessions/:id', async (req, res) => {
  await prisma.session.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// After (with RBAC)
router.delete('/sessions/:id',
  requireRole('SUPER_ADMIN', 'ADMIN', 'USER'),
  requireOwnership('session'),
  auditLog('DELETE', 'session'),
  async (req, res) => {
    await prisma.session.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }
);
```

### 3.5 Query Filtering

**Prisma Middleware for Auto-Filtering:**

```javascript
// server/lib/prisma-rbac.js

export function createRBACPrisma(prisma, user) {
  return prisma.$extends({
    query: {
      session: {
        async findMany({ args, query }) {
          if (user.role === 'SUPER_ADMIN') {
            return query(args);
          }

          args.where = {
            ...args.where,
            OR: [
              { ownerId: user.id },
              { ownerId: null }, // Legacy sessions
              // Team sessions if ADMIN
              ...(user.role === 'ADMIN' ? [{ owner: { teamId: user.teamId } }] : [])
            ]
          };

          return query(args);
        }
      },
      // Similar for other models...
    }
  });
}
```

---

## 4. Enterprise Gap Analysis

### 4.1 Security Gaps

| Gap | Severity | Current State | Recommended Fix |
|-----|----------|---------------|-----------------|
| No RBAC | CRITICAL | Binary admin flag only | Implement role hierarchy with permissions |
| Admin Routes Unprotected | CRITICAL | Path-based only, no actual checks | Add `requireRole('SUPER_ADMIN')` middleware |
| No Data Isolation | CRITICAL | All users see all data | Add ownership fields + query filtering |
| No Audit Logging | HIGH | No record of who did what | Implement AuditLog model + middleware |
| JWT Not Verified | HIGH | `jwt.decode()` not `jwt.verify()` | Implement signature verification |
| Global Rate Limiting | MEDIUM | All users share same bucket | Per-user rate limiting |
| No CSRF Protection | MEDIUM | Relies on CORS only | Add CSRF tokens for state-changing ops |
| No Field Encryption | LOW | Sensitive data in plaintext | Encrypt tokens, secrets at rest |

### 4.2 Operational Gaps

| Gap | Severity | Current State | Recommended Fix |
|-----|----------|---------------|-----------------|
| No Resource Quotas | HIGH | Unlimited sessions/agents per user | Implement quota system |
| No User Model | HIGH | Users not persisted in DB | Create User model synced from Authentik |
| No Team/Org Model | MEDIUM | No multi-tenancy support | Add Team model with project assignments |
| No API Keys | MEDIUM | Only session auth | Implement API key generation |
| No Backup/Restore | MEDIUM | No data export | Add backup endpoints |
| No Health Checks | LOW | Basic `/health` only | Implement comprehensive health endpoints |

### 4.3 Observability Gaps

| Gap | Severity | Current State | Recommended Fix |
|-----|----------|---------------|-----------------|
| No Agent Observability | HIGH | No visibility into spawned agents | Add agent tree/DAG visualization |
| No Session Replay | MEDIUM | Only live terminal | Implement session recording |
| No Cost Tracking | MEDIUM | Basic AI usage only | Enhanced token/cost analytics |
| No Performance Metrics | LOW | Basic system stats | Add APM integration |

### 4.4 UX Gaps (Mission Control)

| Gap | Severity | Current State | Recommended Fix |
|-----|----------|---------------|-----------------|
| No Agent Visualization | HIGH | Text-only agent status | Add tree/DAG in right pane |
| No Role-Based UI | MEDIUM | All users see all tabs | Conditional rendering by role |
| No Permission Indicators | LOW | No visual cues for access | Add lock icons, tooltips |
| No Team Switcher | LOW | Single context only | Add team/org selector |

---

## 5. Master Prioritization Matrix

### 5.1 Core Infrastructure (Foundation)

| Feature | Business Value | Completion | Effort | Priority |
|---------|---------------|------------|--------|----------|
| User Model (sync from Authentik) | 10 | 0% | Medium | P0 |
| Role Enum (SUPER_ADMIN, ADMIN, USER, VIEWER) | 10 | 0% | Low | P0 |
| Ownership Fields (Session, Folder, Prompt, Agent) | 10 | 0% | Medium | P0 |
| RBAC Middleware (requireRole, requireOwnership) | 10 | 0% | Medium | P0 |
| Query Filtering (Prisma extension) | 9 | 0% | High | P0 |
| Database Migrations | 8 | 0% | Low | P0 |

### 5.2 Security / RBAC (Critical Path)

| Feature | Business Value | Completion | Effort | Priority |
|---------|---------------|------------|--------|----------|
| Protect Admin Routes (`/api/admin-*`) | 10 | 0% | Low | P0 |
| Protect Infrastructure Routes (`/api/infra/*`) | 10 | 0% | Low | P0 |
| Protect Docker Routes (`/api/docker/*`) | 10 | 0% | Low | P0 |
| Session Ownership Enforcement | 9 | 0% | Medium | P1 |
| Agent Execution Permissions | 9 | 0% | Medium | P1 |
| Audit Logging Middleware | 8 | 0% | Medium | P1 |
| JWT Signature Verification | 8 | 10% | Low | P1 |
| Per-User Rate Limiting | 7 | 0% | Medium | P2 |
| CSRF Token Implementation | 6 | 0% | Medium | P2 |
| Field-Level Encryption | 5 | 0% | High | P3 |

### 5.3 UI/UX - Mission Control

| Feature | Business Value | Completion | Effort | Priority |
|---------|---------------|------------|--------|----------|
| Three-Pane Layout (existing) | 8 | 90% | - | Done |
| Role-Based Tab Visibility | 8 | 0% | Low | P1 |
| Agent Observability Drawer | 8 | 0% | High | P1 |
| Agent Tree/DAG Visualization | 7 | 0% | High | P2 |
| Permission Indicators (UI) | 5 | 0% | Low | P2 |
| Session Filtering by User | 7 | 0% | Medium | P1 |
| Project Filtering by Assignment | 7 | 0% | Medium | P1 |
| Team Switcher Component | 4 | 0% | Medium | P3 |

### 5.4 Future Enterprise Features

| Feature | Business Value | Completion | Effort | Priority |
|---------|---------------|------------|--------|----------|
| Team/Organization Model | 7 | 0% | High | P2 |
| Project Team Assignments | 7 | 0% | Medium | P2 |
| Resource Quotas (sessions, agents) | 6 | 0% | High | P2 |
| API Key Generation | 6 | 0% | Medium | P2 |
| Session Recording/Replay | 5 | 0% | High | P3 |
| Cost Analytics Dashboard | 5 | 30% | Medium | P3 |
| Backup/Restore API | 4 | 0% | Medium | P3 |
| SSO Group Sync (auto-roles) | 4 | 0% | Medium | P3 |
| Webhook Notifications | 3 | 0% | Medium | P4 |
| Multi-Region Support | 2 | 0% | High | P4 |

---

## 6. Implementation Phases

### Phase 1: Security Foundation (Week 1-2)
**Goal:** Protect critical routes, establish user model

**Tasks:**
1. Create User model, sync from Authentik on first login
2. Add Role enum and role field to User
3. Create `requireRole()` middleware
4. Apply to all `/api/admin-*` routes
5. Apply to all `/api/infra/*` routes
6. Apply to all `/api/docker/*` routes
7. Fix JWT verification (decode → verify)

**Deliverables:**
- [ ] User model with Authentik sync
- [ ] Role-based route protection
- [ ] Admin-only routes enforced

### Phase 2: Data Isolation (Week 3-4)
**Goal:** Implement ownership and filtering

**Tasks:**
1. Add ownership fields to Session, Folder, Prompt, Agent
2. Run database migrations
3. Create `requireOwnership()` middleware
4. Create Prisma RBAC extension for auto-filtering
5. Update session routes to filter by owner
6. Update folder routes to filter by owner
7. Update prompt/snippet routes (personal + shared)

**Deliverables:**
- [ ] Ownership fields on all user-scoped models
- [ ] Automatic query filtering by user
- [ ] Users see only their own data

### Phase 3: Mission Control UI (Week 5-6)
**Goal:** Agent observability and role-based UI

**Tasks:**
1. Create AgentObservabilityDrawer component
2. Implement agent tree/DAG visualization
3. Add WebSocket events for agent spawn/complete
4. Implement role-based tab visibility
5. Filter project sidebar by assignments
6. Filter session list by ownership

**Deliverables:**
- [ ] Agent observability in right pane
- [ ] Role-based UI rendering
- [ ] Filtered sidebars

### Phase 4: Audit & Teams (Week 7-8)
**Goal:** Enterprise audit logging and team support

**Tasks:**
1. Create AuditLog model
2. Implement audit middleware
3. Create audit log viewer (admin only)
4. Create Team model
5. Implement ProjectAssignment
6. Add team switcher to UI

**Deliverables:**
- [ ] Complete audit trail
- [ ] Team-based project access
- [ ] Multi-tenant foundation

### Phase 5: Polish & Quotas (Week 9-10)
**Goal:** Resource limits and refinements

**Tasks:**
1. Implement resource quota system
2. Add quota enforcement middleware
3. Per-user rate limiting
4. API key generation
5. Security hardening review
6. Performance optimization

**Deliverables:**
- [ ] Resource quotas enforced
- [ ] API key support
- [ ] Production-ready security

---

## 7. Technical Specifications

### 7.1 Agent Observability Architecture

**Backend Changes:**

```javascript
// New Socket.IO events for agent tracking
socket.emit('agent-spawned', {
  agentId: string,
  parentId: string | null,  // For tree hierarchy
  type: 'claude-code' | 'code-puppy' | 'custom',
  projectPath: string,
  startedAt: Date,
  status: 'running'
});

socket.emit('agent-output', {
  agentId: string,
  output: string,
  isError: boolean,
  timestamp: Date
});

socket.emit('agent-completed', {
  agentId: string,
  exitCode: number,
  duration: number,
  tokenUsage?: { input: number, output: number }
});
```

**Frontend Component:**

```jsx
// src/components/AgentObservabilityDrawer.jsx
const AgentObservabilityDrawer = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Tree visualization of agent hierarchy
  // Real-time status updates
  // Output streaming panel
  // Token usage metrics
};
```

### 7.2 RBAC Frontend Integration

**Enhanced useAuth Hook:**

```javascript
// src/hooks/useAuth.jsx
export function useAuth() {
  const { user, ... } = useContext(AuthContext);

  return {
    ...existing,

    // New methods
    hasRole: (role) => ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[role],
    canAccess: (resource, action) => checkPermission(user.role, resource, action),
    isOwner: (resourceOwnerId) => user.id === resourceOwnerId,
  };
}

// Permission check utility
const ROLE_HIERARCHY = {
  VIEWER: 0,
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3
};
```

**Permission Gate Component:**

```jsx
// src/components/PermissionGate.jsx
export function PermissionGate({
  requiredRole,
  resource,
  action,
  fallback = null,
  children
}) {
  const { hasRole, canAccess } = useAuth();

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback;
  }

  if (resource && action && !canAccess(resource, action)) {
    return fallback;
  }

  return children;
}

// Usage
<PermissionGate requiredRole="ADMIN">
  <ServerTab />
</PermissionGate>
```

### 7.3 Migration Strategy

**Data Migration Plan:**

1. **User Sync Migration**
   - Create User records for all existing Authentik users
   - Default role: USER
   - Admin users: ADMIN (based on current group membership)

2. **Ownership Backfill**
   - Existing sessions: `ownerId = null` (treated as shared/legacy)
   - New sessions: `ownerId = req.user.id`
   - Gradual assignment via admin interface

3. **Backward Compatibility**
   - Null ownership = accessible to all (legacy mode)
   - Explicit ownership = RBAC enforced
   - Migration flag in UserSettings

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing sessions | Medium | High | Null ownership = legacy access |
| Performance impact from filtering | Low | Medium | Index ownership fields |
| Auth sync failures | Low | High | Graceful degradation to cache |
| Migration data loss | Low | Critical | Full backup before migrations |

### 8.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User confusion with new permissions | Medium | Medium | Clear UI indicators, documentation |
| Admin lockout | Low | Critical | Recovery super-admin mechanism |
| Feature creep | High | Medium | Strict phase gates, MVP focus |

### 8.3 Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Privilege escalation bugs | Medium | Critical | Security review at each phase |
| RBAC bypass via API | Low | Critical | Comprehensive endpoint testing |
| Audit log tampering | Low | High | Immutable log storage |

---

## Approval Checklist

Before proceeding to implementation, please confirm:

- [ ] Role hierarchy (SUPER_ADMIN > ADMIN > USER > VIEWER) is acceptable
- [ ] Permission matrix meets business requirements
- [ ] Phase prioritization aligns with business needs
- [ ] Agent observability requirements are complete
- [ ] Team/multi-tenancy scope is appropriate
- [ ] Timeline expectations are realistic

---

**Status:** Awaiting Approval
**Next Step:** Upon approval, begin Phase 1 implementation

---

*Generated by Architecture Audit - 2026-01-18*
