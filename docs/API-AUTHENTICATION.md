# API Authentication Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-18
**Console.web Version:** 1.0.22+

---

## Table of Contents

1. [Overview](#overview)
2. [Generating API Keys](#generating-api-keys)
3. [API Key Scopes](#api-key-scopes)
4. [Authentication Header Format](#authentication-header-format)
5. [IP Whitelisting](#ip-whitelisting)
6. [Key Expiration and Rotation](#key-expiration-and-rotation)
7. [Rate Limits](#rate-limits)
8. [Code Examples](#code-examples)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Console.web supports API key authentication for programmatic access to the API. This enables:

- Automated scripts and CI/CD pipelines
- Third-party integrations
- Custom tooling and extensions
- Headless agent orchestration

### Key Features

| Feature | Description |
|---------|-------------|
| **Secure Storage** | Keys are SHA-256 hashed before storage (plaintext never stored) |
| **Scoped Access** | Fine-grained permissions via scopes (`read`, `write`, `agents`, `admin`) |
| **IP Whitelisting** | Optional restriction to specific IP addresses |
| **Expiration** | Optional expiration dates for time-limited access |
| **Rate Limiting** | Per-key rate limits (1-1000 requests/minute) |
| **Usage Tracking** | Automatic tracking of last used time and usage count |

### Key Format

All Console.web API keys follow this format:

```
cw_live_<64-character-hex-string>
```

Example: `cw_live_a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd`

---

## Generating API Keys

### Via Web UI

1. Navigate to **Admin Dashboard** > **Settings** > **API Keys**
2. Click **Create New Key**
3. Enter:
   - **Name**: A descriptive name (e.g., "CI/CD Pipeline", "Backup Script")
   - **Scopes**: Select required permissions
   - **Expiration**: Optional expiration in days
   - **IP Whitelist**: Optional list of allowed IP addresses
   - **Rate Limit**: Requests per minute (default: 60)
4. Click **Create**
5. **IMPORTANT**: Copy the displayed key immediately. It will only be shown once.

### Via API

```bash
# Create a new API key (requires session authentication)
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "name": "My Integration",
    "scopes": ["read", "write"],
    "expiresInDays": 90,
    "ipWhitelist": ["192.168.1.100"],
    "rateLimit": 100
  }'
```

**Response:**

```json
{
  "id": "clx123abc...",
  "name": "My Integration",
  "keyPrefix": "cw_live_",
  "key": "cw_live_a1b2c3d4...",
  "scopes": ["read", "write"],
  "rateLimit": 100,
  "ipWhitelist": ["192.168.1.100"],
  "expiresAt": "2026-04-18T00:00:00.000Z",
  "createdAt": "2026-01-18T12:00:00.000Z",
  "warning": "Save this key securely. It cannot be retrieved again."
}
```

---

## API Key Scopes

Scopes control what actions an API key can perform. Each scope grants specific permissions.

### Available Scopes

| Scope | Permissions | Use Case |
|-------|-------------|----------|
| `read` | Read-only access to all resources | Monitoring dashboards, status checks |
| `write` | Create, update, delete user resources | Session management, prompt library |
| `agents` | Execute and manage agents | CI/CD pipelines, automated workflows |
| `admin` | Full administrative access (SUPER_ADMIN only) | Administrative scripts, backup tools |

### Scope Hierarchy

The `admin` scope grants all permissions. Other scopes are independent and must be explicitly granted.

```
admin
  ├── read
  ├── write
  └── agents
```

### Scope Requirements by Endpoint

| Endpoint Pattern | Required Scope |
|------------------|----------------|
| `GET /api/*` | `read` |
| `POST /api/sessions/*` | `write` |
| `PUT /api/prompts/*` | `write` |
| `DELETE /api/snippets/*` | `write` |
| `POST /api/agents/:id/run` | `agents` |
| `POST /api/agents/:id/stop` | `agents` |
| `GET /api/admin/*` | `admin` |
| `POST /api/docker/*` | `admin` |
| `POST /api/infra/*` | `admin` |

### Creating Keys with Specific Scopes

```bash
# Read-only key for monitoring
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"name": "Monitoring", "scopes": ["read"]}'

# Agent execution key for CI/CD
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"name": "CI Pipeline", "scopes": ["read", "agents"]}'

# Full access key (SUPER_ADMIN only)
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"name": "Admin Scripts", "scopes": ["admin"]}'
```

---

## Authentication Header Format

Console.web accepts API keys via two header formats:

### 1. Authorization Header (Recommended)

```http
Authorization: Bearer cw_live_<your-key>
```

### 2. X-API-Key Header

```http
X-API-Key: cw_live_<your-key>
```

### Example Requests

**Using Authorization header:**

```bash
curl https://manage.example.com/api/projects \
  -H "Authorization: Bearer cw_live_a1b2c3d4..."
```

**Using X-API-Key header:**

```bash
curl https://manage.example.com/api/projects \
  -H "X-API-Key: cw_live_a1b2c3d4..."
```

**Both methods are equivalent.** The `Authorization: Bearer` format is recommended for consistency with OAuth 2.0 conventions.

---

## IP Whitelisting

IP whitelisting restricts API key usage to specific IP addresses, providing an additional security layer.

### Configuring IP Whitelist

When creating or updating an API key, provide an array of allowed IP addresses:

```bash
# Create key with IP whitelist
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "name": "Office Only",
    "scopes": ["read", "write"],
    "ipWhitelist": [
      "203.0.113.10",
      "198.51.100.0",
      "192.0.2.50"
    ]
  }'
```

### Update IP Whitelist

```bash
curl -X PUT https://manage.example.com/api/quotas/api-keys/<key-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "ipWhitelist": [
      "203.0.113.10",
      "203.0.113.11"
    ]
  }'
```

### IP Whitelist Behavior

- **Empty whitelist** (`[]`): Key can be used from any IP address
- **Non-empty whitelist**: Key can only be used from listed IP addresses
- **Blocked requests**: Return `403 Forbidden` with message "Your IP address is not authorized for this API key"

### Finding Your IP Address

```bash
# From the machine that will use the API key
curl https://api.ipify.org
# or
curl https://ifconfig.me
```

---

## Key Expiration and Rotation

### Setting Expiration on Creation

```bash
# Key expires in 30 days
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "name": "Temporary Access",
    "scopes": ["read"],
    "expiresInDays": 30
  }'
```

### Key Lifecycle

| State | Description |
|-------|-------------|
| **Active** | Key is valid and can be used |
| **Expired** | Key has passed its expiration date (returns 401) |
| **Revoked** | Key has been manually revoked (returns 401) |

### Key Rotation Process

1. **Create new key** with desired permissions
2. **Update applications** to use the new key
3. **Verify** new key works correctly
4. **Revoke old key** once migration is complete

```bash
# Step 1: Create new key
NEW_KEY=$(curl -s -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"name": "Production v2", "scopes": ["read", "write"]}' | jq -r '.key')

# Step 2-3: Update and verify your applications...

# Step 4: Revoke old key
curl -X DELETE https://manage.example.com/api/quotas/api-keys/<old-key-id> \
  -H "Cookie: <session>"
```

### Recommended Rotation Schedule

| Key Type | Rotation Frequency |
|----------|-------------------|
| Production | Every 90 days |
| CI/CD | Every 30-60 days |
| Development | As needed |
| Temporary access | Set expiration at creation |

---

## Rate Limits

Console.web implements per-user rate limiting using a sliding window algorithm.

### Default Rate Limits by Role

| Role | Requests/Minute |
|------|-----------------|
| SUPER_ADMIN | 1000 |
| ADMIN | 300 |
| USER | 60 |
| VIEWER | 30 |

### Per-Key Rate Limits

Each API key can have a custom rate limit (1-1000 requests/minute):

```bash
# Create key with custom rate limit
curl -X POST https://manage.example.com/api/quotas/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "name": "High Volume",
    "scopes": ["read"],
    "rateLimit": 500
  }'
```

### Rate Limit Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2026-01-18T12:01:00.000Z
```

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 15
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 15 seconds.",
  "retryAfter": 15,
  "resetAt": "2026-01-18T12:01:00.000Z"
}
```

### Handling Rate Limits in Code

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
      console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

## Code Examples

### Node.js / JavaScript

```javascript
const API_KEY = process.env.CONSOLE_WEB_API_KEY;
const BASE_URL = 'https://manage.example.com';

// Fetch wrapper with API key authentication
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Example: List projects
async function listProjects() {
  return apiRequest('/api/projects');
}

// Example: Run an agent
async function runAgent(agentId) {
  return apiRequest(`/api/agents/${agentId}/run`, {
    method: 'POST',
  });
}

// Example: Get system stats
async function getSystemStats() {
  return apiRequest('/api/admin/system');
}
```

### Python

```python
import os
import requests
from typing import Optional, Dict, Any

API_KEY = os.environ.get('CONSOLE_WEB_API_KEY')
BASE_URL = 'https://manage.example.com'

class ConsoleWebClient:
    def __init__(self, api_key: str = API_KEY, base_url: str = BASE_URL):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        response = self.session.request(method, f'{self.base_url}{endpoint}', **kwargs)
        response.raise_for_status()
        return response.json()

    def list_projects(self) -> list:
        """List all projects"""
        return self._request('GET', '/api/projects')

    def get_project_sessions(self, project_name: str) -> list:
        """Get sessions for a project"""
        return self._request('GET', f'/api/sessions?project={project_name}')

    def run_agent(self, agent_id: str) -> dict:
        """Execute an agent"""
        return self._request('POST', f'/api/agents/{agent_id}/run')

    def get_system_stats(self) -> dict:
        """Get system statistics"""
        return self._request('GET', '/api/admin/system')


# Usage
if __name__ == '__main__':
    client = ConsoleWebClient()

    projects = client.list_projects()
    print(f'Found {len(projects)} projects')

    stats = client.get_system_stats()
    print(f'CPU: {stats["cpu"]["usage"]}%')
```

### Bash / curl

```bash
#!/bin/bash

# Configuration
API_KEY="${CONSOLE_WEB_API_KEY}"
BASE_URL="https://manage.example.com"

# Helper function for API requests
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${BASE_URL}${endpoint}"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $API_KEY" \
            "${BASE_URL}${endpoint}"
    fi
}

# List all projects
list_projects() {
    api_request GET "/api/projects"
}

# Get system stats
get_system_stats() {
    api_request GET "/api/admin/system"
}

# Run an agent
run_agent() {
    local agent_id="$1"
    api_request POST "/api/agents/${agent_id}/run"
}

# Create a prompt
create_prompt() {
    local name="$1"
    local content="$2"
    api_request POST "/api/prompts" "{\"name\": \"$name\", \"content\": \"$content\"}"
}

# Example usage
echo "Projects:"
list_projects | jq '.[] | .name'

echo "System Stats:"
get_system_stats | jq '{cpu: .cpu.usage, memory: .memory.usedPercent}'
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

type ConsoleWebClient struct {
    APIKey  string
    BaseURL string
    client  *http.Client
}

func NewClient() *ConsoleWebClient {
    return &ConsoleWebClient{
        APIKey:  os.Getenv("CONSOLE_WEB_API_KEY"),
        BaseURL: "https://manage.example.com",
        client:  &http.Client{},
    }
}

func (c *ConsoleWebClient) request(method, endpoint string, body interface{}) ([]byte, error) {
    var reqBody io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        reqBody = bytes.NewBuffer(jsonBody)
    }

    req, err := http.NewRequest(method, c.BaseURL+endpoint, reqBody)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+c.APIKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}

func (c *ConsoleWebClient) ListProjects() ([]map[string]interface{}, error) {
    data, err := c.request("GET", "/api/projects", nil)
    if err != nil {
        return nil, err
    }

    var projects []map[string]interface{}
    err = json.Unmarshal(data, &projects)
    return projects, err
}

func (c *ConsoleWebClient) RunAgent(agentID string) error {
    _, err := c.request("POST", "/api/agents/"+agentID+"/run", nil)
    return err
}

func main() {
    client := NewClient()

    projects, err := client.ListProjects()
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    fmt.Printf("Found %d projects\n", len(projects))
}
```

---

## Security Best Practices

### Key Storage

| DO | DON'T |
|----|-------|
| Store keys in environment variables | Hardcode keys in source code |
| Use secrets managers (Vault, AWS Secrets Manager) | Commit keys to version control |
| Encrypt keys at rest | Store keys in plain text files |
| Use CI/CD secret variables | Log or print API keys |

### Environment Variable Setup

```bash
# Linux/macOS - Add to ~/.bashrc or ~/.zshrc
export CONSOLE_WEB_API_KEY="cw_live_..."

# Windows PowerShell - Add to $PROFILE
$env:CONSOLE_WEB_API_KEY = "cw_live_..."

# Docker
docker run -e CONSOLE_WEB_API_KEY="cw_live_..." myapp

# Kubernetes Secret
kubectl create secret generic console-web-api \
  --from-literal=api-key="cw_live_..."
```

### Principle of Least Privilege

1. **Use minimum required scopes**: Only request the scopes your application needs
2. **Use separate keys for different purposes**: Don't share keys between CI/CD, monitoring, and production
3. **Set expiration dates**: Especially for temporary access or CI/CD pipelines
4. **Enable IP whitelisting**: When the source IP is known and static

### Monitoring and Auditing

- Review API key usage in Admin Dashboard > Settings > API Keys
- Monitor for unusual usage patterns (high request counts, unexpected IPs)
- Set up alerts for failed authentication attempts
- Regularly audit which keys are in use

### Incident Response

If an API key is compromised:

1. **Immediately revoke** the compromised key
2. **Audit** recent activity using that key (check audit logs)
3. **Create** a new key with the same permissions
4. **Update** all applications using the compromised key
5. **Investigate** how the key was compromised

```bash
# Revoke compromised key immediately
curl -X DELETE https://manage.example.com/api/quotas/api-keys/<key-id> \
  -H "Cookie: <admin-session>"
```

---

## Troubleshooting

### Common Errors

#### 401 Unauthorized - Invalid API key

```json
{"error": "Invalid API key", "message": "The provided API key is not valid"}
```

**Causes:**
- Typo in the API key
- Key was never created
- Using wrong key format

**Solutions:**
- Verify the key starts with `cw_live_`
- Create a new key if the original was lost

#### 401 Unauthorized - API key revoked

```json
{"error": "API key revoked", "message": "This API key has been revoked"}
```

**Solutions:**
- Create a new API key
- Check with admin if revocation was intentional

#### 401 Unauthorized - API key expired

```json
{"error": "API key expired", "message": "This API key has expired"}
```

**Solutions:**
- Create a new key with or without expiration
- Consider using longer expiration periods

#### 403 Forbidden - IP not allowed

```json
{"error": "IP not allowed", "message": "Your IP address is not authorized for this API key"}
```

**Solutions:**
- Check your current IP: `curl https://api.ipify.org`
- Update the key's IP whitelist
- Remove IP whitelist if not needed

#### 403 Forbidden - Insufficient scope

```json
{"error": "Insufficient scope", "message": "This API key does not have the 'agents' scope", "required": "agents", "current": ["read"]}
```

**Solutions:**
- Update the key to include required scope
- Create a new key with proper scopes

#### 429 Too Many Requests

```json
{"error": "Rate limit exceeded", "message": "Too many requests. Please try again in 15 seconds.", "retryAfter": 15}
```

**Solutions:**
- Implement exponential backoff
- Increase key's rate limit
- Optimize request patterns (batch operations)

### Debug Checklist

1. **Verify key format**: Should start with `cw_live_`
2. **Check header format**: `Authorization: Bearer cw_live_...` (note the space)
3. **Verify endpoint URL**: Correct base URL and path
4. **Check scopes**: Key has required permissions for endpoint
5. **Check IP whitelist**: Your IP is allowed (or whitelist is empty)
6. **Check expiration**: Key has not expired
7. **Check rate limits**: Not exceeding requests per minute

### Testing Your Key

```bash
# Test key validity
curl -I https://manage.example.com/api/projects \
  -H "Authorization: Bearer $CONSOLE_WEB_API_KEY"

# Should return:
# HTTP/2 200
# x-ratelimit-limit: 60
# x-ratelimit-remaining: 59
# x-ratelimit-reset: 2026-01-18T12:01:00.000Z
```

---

## API Reference Quick Links

| Endpoint | Method | Scope | Description |
|----------|--------|-------|-------------|
| `/api/quotas/api-keys` | GET | (session) | List your API keys |
| `/api/quotas/api-keys` | POST | (session) | Create new API key |
| `/api/quotas/api-keys/:id` | PUT | (session) | Update API key |
| `/api/quotas/api-keys/:id` | DELETE | (session) | Revoke API key |
| `/api/quotas/admin/api-keys` | GET | admin | List all API keys (admin) |
| `/api/quotas/me` | GET | read | Get your quota and usage |

---

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Project overview and API endpoints
- [ENTERPRISE_ROADMAP.md](/ENTERPRISE_ROADMAP.md) - Enterprise features including RBAC
- [TECHNICAL_SPECIFICATIONS.md](/docs/TECHNICAL_SPECIFICATIONS.md) - Full technical specs

---

*This document is maintained as part of Console.web. For issues or questions, create a GitHub issue or contact the development team.*
