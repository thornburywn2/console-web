# RBAC User Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-18
**Applies to:** Console.web v1.0.21+

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Role Hierarchy](#2-role-hierarchy)
3. [Role Permissions](#3-role-permissions)
4. [Checking Your Role](#4-checking-your-role)
5. [Managing User Roles (Admins)](#5-managing-user-roles-admins)
6. [Resource Ownership & Data Isolation](#6-resource-ownership--data-isolation)
7. [Quota Limits](#7-quota-limits)
8. [API Key Authentication](#8-api-key-authentication)
9. [Frontend Permission Components](#9-frontend-permission-components)
10. [Troubleshooting Access Issues](#10-troubleshooting-access-issues)

---

## 1. Introduction

Console.web implements enterprise-grade Role-Based Access Control (RBAC) to ensure users can only access resources appropriate to their role. This system provides:

- **Role-based permissions**: Four distinct roles with hierarchical permissions
- **Resource ownership**: Users own the resources they create
- **Data isolation**: Users see only their own data (with role-based exceptions)
- **Quota enforcement**: Resource limits based on role
- **Audit logging**: All sensitive operations are logged

### How Roles Are Assigned

Your role is determined by your Authentik SSO group membership:

| Authentik Group | Assigned Role |
|-----------------|---------------|
| `authentik Admins` | SUPER_ADMIN |
| `Administrators` | SUPER_ADMIN |
| `admins` or `Admins` | ADMIN |
| `developers` | USER |
| `viewers` | VIEWER |
| (no matching group) | USER (default) |

---

## 2. Role Hierarchy

Console.web uses four roles in a hierarchical structure. Higher roles inherit all permissions from lower roles.

```
                     SUPER_ADMIN
                          |
                          | (Full system access, infrastructure control)
                          v
                        ADMIN
                          |
                          | (Team management, all project access)
                          v
                         USER
                          |
                          | (Own resources, personal libraries)
                          v
                        VIEWER
                          |
                          | (Read-only access to shared resources)
```

### Role Hierarchy Values

| Role | Level | Description |
|------|-------|-------------|
| SUPER_ADMIN | 3 | Full system access including infrastructure control |
| ADMIN | 2 | Team and project management, Docker access |
| USER | 1 | Standard user, own resources only |
| VIEWER | 0 | Read-only access to shared content |

---

## 3. Role Permissions

### Permission Matrix

| Resource | SUPER_ADMIN | ADMIN | USER | VIEWER |
|----------|-------------|-------|------|--------|
| **Sessions** |
| View All Sessions | Yes | Yes | Own only | No |
| Create Session | Yes | Yes | Yes | No |
| Kill Any Session | Yes | Yes (team) | Own only | No |
| **Projects** |
| View All Projects | Yes | Yes | Assigned | Shared only |
| Modify CLAUDE.md | Yes | Yes | Own projects | No |
| Delete Project | Yes | Yes | No | No |
| **Infrastructure** |
| Docker Control | Yes | Yes | No | No |
| Firewall Rules | Yes | No | No | No |
| Package Management | Yes | No | No | No |
| System Reboot/Shutdown | Yes | No | No | No |
| **Agents** |
| View All Agents | Yes | Yes | Own + shared | No |
| Run Agents | Yes | Yes | Own only | No |
| Create Agents | Yes | Yes | Yes | No |
| **Content Libraries** |
| Prompts/Snippets | Full | Full | Own + shared | View shared |
| Create Content | Yes | Yes | Yes | No |
| **Administration** |
| View Audit Logs | Yes | Yes | No | No |
| Manage Users | Yes | No | No | No |
| Manage Quotas | Yes | No | No | No |

### Detailed Permission Reference

The permission system uses a resource.action format:

```javascript
// Session permissions
'session.view'      -> VIEWER   // View session info
'session.create'    -> USER     // Create new sessions
'session.edit'      -> USER     // Modify session
'session.delete'    -> USER     // Delete own session
'session.viewAll'   -> ADMIN    // View all sessions

// Project permissions
'project.view'      -> VIEWER   // View project info
'project.edit'      -> USER     // Modify project
'project.delete'    -> ADMIN    // Delete project

// Agent permissions
'agent.view'        -> USER     // View agent info
'agent.create'      -> USER     // Create agents
'agent.run'         -> USER     // Execute agents
'agent.viewAll'     -> ADMIN    // View all agents

// Docker permissions
'docker.view'       -> ADMIN    // View containers
'docker.control'    -> ADMIN    // Start/stop/restart

// Infrastructure permissions
'infra.view'        -> ADMIN    // View server info
'infra.control'     -> SUPER_ADMIN  // Control infrastructure
'infra.firewall'    -> SUPER_ADMIN  // Manage firewall
'infra.packages'    -> SUPER_ADMIN  // Install packages
'infra.reboot'      -> SUPER_ADMIN  // System reboot

// User management
'users.view'        -> SUPER_ADMIN  // View all users
'users.manage'      -> SUPER_ADMIN  // Manage users

// Audit logs
'audit.view'        -> ADMIN    // View audit logs

// Admin tabs
'admin.server'      -> ADMIN    // Server tab access
'admin.security'    -> ADMIN    // Security tab access
'admin.users'       -> SUPER_ADMIN  // Users tab access
```

---

## 4. Checking Your Role

### In the UI

Your role is displayed in several places:

1. **User Avatar Dropdown**: Click your avatar in the header to see your role badge
2. **Role Badge Colors**:
   - SUPER_ADMIN: Red badge
   - ADMIN: Purple badge
   - USER: Green badge
   - VIEWER: Blue badge

### Via API

Check your role and quota information:

```bash
# Get your role and quota
curl -X GET "https://manage.example.com/api/quotas/me" \
  -H "Cookie: <your-session-cookie>"
```

Response:
```json
{
  "quota": {
    "maxActiveSessions": 5,
    "maxTotalSessions": 50,
    "maxActiveAgents": 3,
    ...
  },
  "usage": {
    "activeSessions": 2,
    "totalSessions": 15,
    ...
  },
  "role": "USER",
  "percentages": {
    "sessions": 40,
    "agents": 20,
    ...
  }
}
```

### Using the Auth Hook (Frontend Development)

```javascript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { userRole, hasRole, canAccess, isOwner } = useAuth();

  // Check current role
  console.log('My role:', userRole); // 'USER', 'ADMIN', etc.

  // Check if user has a specific role or higher
  if (hasRole('ADMIN')) {
    // User is ADMIN or SUPER_ADMIN
  }

  // Check specific permission
  if (canAccess('docker', 'control')) {
    // User can control Docker containers
  }

  // Check resource ownership
  if (isOwner(resource.ownerId)) {
    // User owns this resource
  }
}
```

---

## 5. Managing User Roles (Admins)

### Viewing Users

Admins can view user information through the Admin Dashboard:

1. Navigate to **Admin Dashboard** > **Server** > **Users**
2. View user list with roles and last login times

### Changing User Roles

User roles are determined by Authentik group membership. To change a user's role:

1. Log in to Authentik admin interface (auth.example.com)
2. Navigate to **Directory** > **Groups**
3. Add or remove the user from the appropriate group:
   - Add to `Administrators` for SUPER_ADMIN
   - Add to `admins` for ADMIN
   - Add to `developers` for USER
   - Add to `viewers` for VIEWER
4. The role change takes effect on the user's next login

### Role Sync

When a user logs in, Console.web:
1. Reads their Authentik groups
2. Determines the highest role from group membership
3. Creates or updates the user record in the database
4. Applies the role for the session

---

## 6. Resource Ownership & Data Isolation

### How Ownership Works

When you create a resource (session, prompt, snippet, agent, folder), your user ID is automatically set as the owner:

```javascript
// When creating a session
{
  id: "clx123...",
  projectPath: "/home/user/Projects/my-project",
  ownerId: "your-authentik-uid",  // Set automatically
  ...
}
```

### Data Visibility by Role

| Role | Can See |
|------|---------|
| SUPER_ADMIN | All resources |
| ADMIN | Own resources + all team resources |
| USER | Own resources + shared resources + legacy (unowned) resources |
| VIEWER | Shared/public resources only |

### Legacy Resources

Resources created before RBAC was implemented have `ownerId: null`. These are treated as "legacy" resources and are visible to all authenticated users for backward compatibility.

### Sharing Resources

To share a resource with others:

1. **Prompts/Snippets**: Set `isShared: true` to make visible to team
2. **Agents**: Set `isPublic: true` for marketplace visibility

### Ownership Filter API

The backend automatically filters queries based on your role:

```javascript
// SUPER_ADMIN: No filter (sees all)
WHERE { }

// ADMIN: Own + shared resources
WHERE {
  OR: [
    { ownerId: userId },
    { isShared: true },
    { isPublic: true },
    { ownerId: null }  // Legacy
  ]
}

// USER: Own + shared + legacy
WHERE {
  OR: [
    { ownerId: userId },
    { isShared: true },
    { isPublic: true },
    { ownerId: null }
  ]
}

// VIEWER: Shared/public/legacy only (no own resources condition)
WHERE {
  OR: [
    { isShared: true },
    { isPublic: true },
    { ownerId: null }
  ]
}
```

---

## 7. Quota Limits

### Default Quotas by Role

| Resource | SUPER_ADMIN | ADMIN | USER | VIEWER |
|----------|-------------|-------|------|--------|
| Active Sessions | 100 | 20 | 5 | 0 |
| Total Sessions | 1,000 | 200 | 50 | 0 |
| Active Agents | 50 | 10 | 3 | 0 |
| Total Agents | 200 | 50 | 20 | 0 |
| Prompts Library | 1,000 | 500 | 100 | 0 |
| Snippets | 1,000 | 500 | 100 | 0 |
| Folders | 100 | 50 | 20 | 0 |
| API Rate Limit (per min) | 1,000 | 300 | 60 | 30 |
| Agent Runs/Hour | 100 | 30 | 10 | 0 |
| Storage | Unlimited | 10 GB | 1 GB | 0 |

### Checking Your Quota

```bash
# Check current usage and limits
curl -X GET "https://manage.example.com/api/quotas/me" \
  -H "Cookie: <session>"
```

### Quota Enforcement

When you exceed a quota, you'll receive a 429 response:

```json
{
  "error": "Quota exceeded",
  "message": "Quota exceeded: 5/5 active sessions",
  "quota": {
    "resource": "session",
    "current": 5,
    "max": 5
  }
}
```

### Custom Quotas (Admin)

Super Admins can set custom quotas for specific users:

```bash
# Set custom quota for a user
curl -X PUT "https://manage.example.com/api/quotas/user/<user-id>" \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -d '{
    "maxActiveSessions": 10,
    "maxTotalAgents": 30
  }'

# Reset to role default
curl -X DELETE "https://manage.example.com/api/quotas/user/<user-id>" \
  -H "Cookie: <admin-session>"
```

---

## 8. API Key Authentication

### API Key Scopes

| Scope | Permissions |
|-------|-------------|
| `read` | Read-only access to resources |
| `write` | Create and modify resources |
| `agents` | Run and manage agents |
| `admin` | Full admin access (SUPER_ADMIN only) |

### Creating an API Key

```bash
curl -X POST "https://manage.example.com/api/quotas/api-keys" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "name": "My Integration Key",
    "scopes": ["read", "write"],
    "expiresInDays": 90,
    "ipWhitelist": ["192.168.1.100"],
    "rateLimit": 100
  }'
```

Response:
```json
{
  "id": "clx...",
  "name": "My Integration Key",
  "keyPrefix": "cw_live_",
  "scopes": ["read", "write"],
  "key": "cw_live_abc123...",
  "warning": "Save this key securely. It cannot be retrieved again."
}
```

### Using an API Key

```bash
# Via Authorization header
curl -X GET "https://manage.example.com/api/projects" \
  -H "Authorization: Bearer cw_live_your_key_here"

# Via X-API-Key header
curl -X GET "https://manage.example.com/api/projects" \
  -H "X-API-Key: cw_live_your_key_here"
```

### Managing API Keys

```bash
# List your keys
curl -X GET "https://manage.example.com/api/quotas/api-keys" \
  -H "Cookie: <session>"

# Update a key
curl -X PUT "https://manage.example.com/api/quotas/api-keys/<key-id>" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"name": "Updated Name", "scopes": ["read"]}'

# Revoke a key
curl -X DELETE "https://manage.example.com/api/quotas/api-keys/<key-id>" \
  -H "Cookie: <session>"
```

### API Key Limits

- Maximum 10 active API keys per user
- Keys with `admin` scope require SUPER_ADMIN role
- Rate limits can be set per key (1-1000 requests/minute)

---

## 9. Frontend Permission Components

### PermissionGate

Use `PermissionGate` to conditionally render content based on permissions:

```jsx
import { PermissionGate } from '../hooks/useAuth';

// Require specific role
<PermissionGate requiredRole="ADMIN">
  <AdminPanel />
</PermissionGate>

// Check resource/action permission
<PermissionGate resource="docker" action="control">
  <DockerControls />
</PermissionGate>

// Check ownership
<PermissionGate ownerId={resource.ownerId}>
  <EditButton />
</PermissionGate>

// Show lock icon when access denied
<PermissionGate requiredRole="ADMIN" showLock>
  <ServerTab />
</PermissionGate>

// Custom fallback
<PermissionGate
  requiredRole="ADMIN"
  fallback={<p>Admin access required</p>}
>
  <AdminContent />
</PermissionGate>
```

### RoleBadge

Display a user's role as a styled badge:

```jsx
import { RoleBadge } from '../hooks/useAuth';

<RoleBadge role="ADMIN" size="sm" />  // xs, sm, md
```

### Role Badge Styling

| Role | Background | Text | Border |
|------|------------|------|--------|
| SUPER_ADMIN | `bg-hacker-error/20` | `text-hacker-error` | `border-hacker-error/50` |
| ADMIN | `bg-hacker-purple/20` | `text-hacker-purple` | `border-hacker-purple/50` |
| USER | `bg-hacker-green/20` | `text-hacker-green` | `border-hacker-green/50` |
| VIEWER | `bg-hacker-blue/20` | `text-hacker-blue` | `border-hacker-blue/50` |

---

## 10. Troubleshooting Access Issues

### Common Error Messages

#### "Authentication required" (401)

**Cause**: Not logged in or session expired.

**Solutions**:
1. Refresh the page to trigger re-authentication
2. Log out and log back in via Authentik
3. Check if Authentik SSO is running

#### "Insufficient permissions" (403)

**Cause**: Your role doesn't have permission for this action.

**Solutions**:
1. Check your current role (click avatar dropdown)
2. Ask an admin to add you to the appropriate Authentik group
3. If you believe you should have access, contact your administrator

Example response:
```json
{
  "error": "Insufficient permissions",
  "message": "This action requires one of the following roles: ADMIN, SUPER_ADMIN",
  "required": ["ADMIN", "SUPER_ADMIN"],
  "current": "USER"
}
```

#### "Access denied" (403) for Resource

**Cause**: You don't own the resource and don't have admin privileges.

**Solutions**:
1. Verify you're accessing your own resource
2. Ask the owner to share the resource with you
3. If it's a team resource, ask an admin for access

#### "Quota exceeded" (429)

**Cause**: You've reached your resource limit.

**Solutions**:
1. Delete unused resources (sessions, agents, etc.)
2. Check your current usage: `GET /api/quotas/me`
3. Ask an admin to increase your quota

Example response:
```json
{
  "error": "Quota exceeded",
  "message": "Quota exceeded: 5/5 active sessions",
  "quota": {
    "resource": "session",
    "current": 5,
    "max": 5
  }
}
```

#### "Rate limit exceeded" (429)

**Cause**: Too many API requests in the time window.

**Solutions**:
1. Wait for the reset time (check `Retry-After` header)
2. Reduce request frequency
3. Use API keys with higher rate limits

Response headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-01-18T12:00:00.000Z
Retry-After: 45
```

### Debugging Tips

1. **Check Role Assignment**:
   ```bash
   curl -X GET "https://manage.example.com/api/quotas/me" \
     -H "Cookie: <session>"
   ```

2. **View Audit Logs** (Admin only):
   Check Admin Dashboard > Security > Audit Logs for recent access attempts

3. **Verify Authentik Groups**:
   Log in to Authentik and check your profile for group memberships

4. **Test API Access**:
   ```bash
   # Test with session
   curl -X GET "https://manage.example.com/auth/me" \
     -H "Cookie: <session>"

   # Test with API key
   curl -X GET "https://manage.example.com/api/projects" \
     -H "Authorization: Bearer cw_live_..."
   ```

### Getting Help

If you continue to experience access issues:

1. Note the exact error message and HTTP status code
2. Record the endpoint you were trying to access
3. Check the time of the request (for audit log correlation)
4. Contact your system administrator with this information

---

## Appendix: Role Group Mapping Configuration

The role-to-group mapping is configured in `server/middleware/rbac.js`:

```javascript
const ROLE_GROUP_MAPPING = {
  'authentik Admins': 'SUPER_ADMIN',
  'Administrators': 'SUPER_ADMIN',
  'admins': 'ADMIN',
  'Admins': 'ADMIN',
  'developers': 'USER',
  'viewers': 'VIEWER',
};
```

To add or modify group mappings, update this configuration and restart the server.

---

**Document Version:** 1.0.0
**Console.web Version:** 1.0.21+
**Last Updated:** 2026-01-18
