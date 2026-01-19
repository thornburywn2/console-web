# Agent Marketplace Catalog

**Version:** 1.0.0
**Last Updated:** 2026-01-18
**Document Type:** Technical Reference

---

## Overview

Console.web includes a comprehensive Agent Marketplace with **13 pre-built automation agents** organized into 7 categories. Agents are event-driven automation units that respond to triggers (git events, file changes, session events, system events) and execute configurable actions.

The agent system replaces traditional workflow automation with a more flexible, event-driven architecture that supports:

- **Real-time execution** with WebSocket output streaming
- **Concurrent execution** (up to 5 agents simultaneously)
- **One-click installation** from the marketplace catalog
- **Custom agent creation** for project-specific needs
- **Full audit trail** with execution history and logs

---

## Agent Categories

| Category | Description | Agent Count | Icon |
|----------|-------------|-------------|------|
| **Code Quality** | Linting, formatting, and code review automation | 3 | CheckCircle |
| **Git Workflow** | Commit helpers, PR reviewers, branch management | 2 | GitBranch |
| **Security** | Vulnerability scanning, secret detection, SAST | 2 | Shield |
| **Testing** | Test generation, coverage analysis, validation | 2 | FlaskConical |
| **Documentation** | README generators, API docs, changelog automation | 2 | FileText |
| **DevOps** | CI/CD, deployment, monitoring automation | 2 | Server |
| **Productivity** | Task automation, refactoring helpers, utilities | 1 | Zap |

---

## Pre-Built Agents

### Code Quality

#### ESLint Auto-Fixer
**ID:** `eslint-auto-fixer`
**Default Trigger:** FILE_CHANGE
**Supported Triggers:** FILE_CHANGE, MANUAL, GIT_PRE_COMMIT

Automatically fixes ESLint issues on file save. Keeps your code clean without manual intervention.

**Features:**
- Auto-fixes fixable ESLint violations
- Configurable file extensions
- Works with project-local ESLint config
- Preserves unfixable issues for manual review

**Command:** `npx eslint --fix "{{filePath}}"`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `extensions` | text | `.js,.jsx,.ts,.tsx` | Comma-separated list of extensions to lint |
| `autoFix` | boolean | `true` | Automatically fix fixable issues |

**Requirements:** Node.js, ESLint

---

#### Prettier Formatter
**ID:** `prettier-formatter`
**Default Trigger:** FILE_CHANGE
**Supported Triggers:** FILE_CHANGE, MANUAL, GIT_PRE_COMMIT

Formats code with Prettier on save. Consistent code style across your project.

**Features:**
- Formats on file save
- Respects .prettierrc configuration
- Works with .prettierignore
- Supports all Prettier-compatible languages

**Command:** `npx prettier --write "{{filePath}}"`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `extensions` | text | `.js,.jsx,.ts,.tsx,.json,.css,.md` | Comma-separated list of extensions to format |

**Requirements:** Node.js, Prettier

---

#### Dead Code Finder
**ID:** `dead-code-finder`
**Default Trigger:** MANUAL
**Supported Triggers:** MANUAL, GIT_PRE_PUSH

Finds unused exports, variables, and dependencies in your codebase.

**Features:**
- Finds unused exports
- Detects unused dependencies
- Identifies unreachable code
- Reports unused variables

**Command:** `npx knip`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strict` | boolean | `false` | Enable strict mode for more thorough analysis |

**Requirements:** Node.js, knip

---

### Git Workflow

#### Commit Message AI
**ID:** `commit-message-ai`
**Default Trigger:** GIT_PRE_COMMIT
**Supported Triggers:** GIT_PRE_COMMIT, MANUAL

AI-powered commit message suggestions based on staged changes.

**Features:**
- Analyzes git diff for context
- Follows Conventional Commits format
- Suggests scope based on file paths
- Provides multiple message options

**Command:** `git diff --cached | head -500`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `style` | select | `conventional` | Style of commit message (conventional, descriptive, emoji) |
| `maxLength` | number | `72` | Maximum characters for commit subject line |

**Requirements:** Git

---

#### Branch Cleaner
**ID:** `branch-cleaner`
**Default Trigger:** MANUAL
**Supported Triggers:** MANUAL, SESSION_START

Removes stale local branches that have been merged or deleted remotely.

**Features:**
- Detects merged branches
- Finds branches deleted on remote
- Safe deletion (won't delete unmerged work)
- Dry-run mode for preview

**Safety:** Never deletes main/master or current branch.

**Command:** `git fetch -p && git branch -vv | grep "\[.*: gone\]" | awk "{print \$1}" | xargs -r git branch -d`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dryRun` | boolean | `true` | Preview branches to delete without actually deleting |
| `includeUnmerged` | boolean | `false` | Also delete branches that are gone but not merged (dangerous) |

**Requirements:** Git

---

### Security

#### Security Scanner
**ID:** `security-scanner`
**Default Trigger:** GIT_PRE_PUSH
**Supported Triggers:** GIT_PRE_PUSH, GIT_PRE_COMMIT, MANUAL

Comprehensive security scan using npm audit and optional SAST tools.

**Features:**
- npm audit for dependency vulnerabilities
- Optional Semgrep SAST scanning
- Secret detection in code
- SBOM generation

**Severity Levels:** Reports critical, high, medium, and low severity issues.

**Command:** `npm audit --json || true`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `severity` | select | `high` | Minimum severity level to fail on (critical, high, moderate, low) |
| `enableSast` | boolean | `false` | Enable Semgrep static analysis (requires semgrep) |

**Requirements:** Node.js, npm

---

#### Secret Scanner
**ID:** `secret-scanner`
**Default Trigger:** GIT_PRE_COMMIT
**Supported Triggers:** GIT_PRE_COMMIT, MANUAL

Scans for accidentally committed secrets, API keys, and credentials.

**Detects:**
- API keys and tokens
- Database connection strings
- AWS credentials
- Private keys
- Passwords in code

**Command:** `git diff --cached --name-only | xargs grep -l -E "(api[_-]?key|secret|password|token|credential|private[_-]?key)" 2>/dev/null || echo "No secrets detected"`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `patterns` | text | (empty) | Additional regex patterns to scan for (comma-separated) |

**Requirements:** Git, grep

---

### Testing

#### Test Runner
**ID:** `test-runner`
**Default Trigger:** FILE_CHANGE
**Supported Triggers:** FILE_CHANGE, GIT_PRE_PUSH, MANUAL

Runs tests automatically when files change. Supports Jest, Vitest, and more.

**Features:**
- Smart test selection based on changed files
- Watch mode support
- Coverage reporting
- Failed test notifications

**Supports:** Jest, Vitest, Mocha, and other npm test runners.

**Command:** `npm test -- --passWithNoTests`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `coverage` | boolean | `false` | Generate coverage report |
| `watchMode` | boolean | `false` | Keep tests running in watch mode |

**Requirements:** Node.js, test framework

---

#### Test Generator
**ID:** `test-generator`
**Default Trigger:** MANUAL
**Supported Triggers:** MANUAL

AI-powered test generation for new functions and components.

**Generates:**
- Unit tests for functions
- Component tests for React
- Edge case coverage
- Mock suggestions

**Frameworks:** Supports Jest, Vitest, and React Testing Library.

**Command:** `cat "{{filePath}}"`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `framework` | select | `vitest` | Test framework to use (vitest, jest, mocha) |
| `style` | select | `describe-it` | Test organization style (describe-it, test-blocks) |

**Requirements:** Node.js, Test framework

---

### Documentation

#### README Generator
**ID:** `readme-generator`
**Default Trigger:** MANUAL
**Supported Triggers:** MANUAL

Auto-generates or updates README.md based on project structure.

**Generates:**
- Project overview
- Installation instructions
- Usage examples
- API documentation
- License information

**Updates:** Can update existing README while preserving custom sections.

**Command:** `cat package.json && ls -la`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sections` | text | `overview,install,usage,api,license` | Comma-separated sections to generate |
| `preserveCustom` | boolean | `true` | Keep custom sections when updating |

**Requirements:** None

---

#### Changelog Updater
**ID:** `changelog-updater`
**Default Trigger:** MANUAL
**Supported Triggers:** MANUAL, GIT_POST_COMMIT

Automatically updates CHANGELOG.md based on conventional commits.

**Features:**
- Parses Conventional Commits
- Groups by version
- Categories: Features, Fixes, Breaking Changes
- Links to commits and issues

**Format:** Follows Keep a Changelog format.

**Command:** `git log --oneline -20`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | select | `keepachangelog` | Changelog format style (keepachangelog, conventional, simple) |

**Requirements:** Git

---

### DevOps

#### Dependency Checker
**ID:** `dependency-checker`
**Default Trigger:** SESSION_START
**Supported Triggers:** SESSION_START, MANUAL

Checks for outdated dependencies and suggests updates.

**Features:**
- Checks for outdated packages
- Shows update types (major/minor/patch)
- Security vulnerability alerts
- Update command generation

**Modes:** Interactive or automatic update.

**Command:** `npm outdated --json || true`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `updateType` | select | `minor` | Maximum update level to suggest (major, minor, patch) |
| `autoUpdate` | boolean | `false` | Automatically apply safe updates |

**Requirements:** Node.js, npm

---

#### Environment Sync
**ID:** `env-sync`
**Default Trigger:** GIT_PRE_COMMIT
**Supported Triggers:** GIT_PRE_COMMIT, MANUAL

Keeps .env.example in sync with .env, without exposing secrets.

**Features:**
- Detects new environment variables
- Updates .env.example automatically
- Preserves placeholder values
- Never exposes actual secrets

**Triggers:** Runs before commits to catch missing template updates.

**Command:** `diff <(cat .env | cut -d= -f1 | sort) <(cat .env.example | cut -d= -f1 | sort) || true`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sourcefile` | text | `.env` | Environment file with actual values |
| `templateFile` | text | `.env.example` | Template file to update |

**Requirements:** bash

---

### Productivity

#### Import Sorter
**ID:** `import-sorter`
**Default Trigger:** FILE_CHANGE
**Supported Triggers:** FILE_CHANGE, GIT_PRE_COMMIT, MANUAL

Organizes and sorts imports in JavaScript/TypeScript files.

**Features:**
- Sorts imports alphabetically
- Groups by type (external, internal, relative)
- Removes unused imports
- Configurable sort order

**Supports:** JavaScript, TypeScript, JSX, TSX files.

**Command:** `npx organize-imports-cli "{{filePath}}"`

**Configuration:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `groupOrder` | text | `builtin,external,internal,parent,sibling,index` | Order of import groups |

**Requirements:** Node.js

---

## Trigger Types

Agents respond to events via trigger types. Each agent can support multiple triggers but has one default trigger configured on installation.

### Git Events

| Trigger | Description | Use Cases |
|---------|-------------|-----------|
| `GIT_PRE_COMMIT` | Before a commit is created | Linting, formatting, secret scanning |
| `GIT_POST_COMMIT` | After a commit is created | Changelog updates, notifications |
| `GIT_PRE_PUSH` | Before pushing to remote | Security scans, test validation |
| `GIT_POST_MERGE` | After a merge completes | Dependency updates, post-merge hooks |
| `GIT_POST_CHECKOUT` | After branch checkout | Environment setup, dependency check |

### File Events

| Trigger | Description | Use Cases |
|---------|-------------|-----------|
| `FILE_CHANGE` | When files are modified | Auto-formatting, test running, linting |

**Configuration Options:**
- `pattern`: Glob pattern to match files (default: `**/*`)
- Ignores `node_modules`, `.git`, and hidden directories by default

### Session Events

| Trigger | Description | Use Cases |
|---------|-------------|-----------|
| `SESSION_START` | When a terminal session starts | Dependency checks, environment validation |
| `SESSION_END` | When a terminal session ends | Cleanup, metrics collection |
| `SESSION_ERROR` | When an error occurs in session | Error reporting, auto-recovery |
| `SESSION_IDLE` | When session becomes idle | Resource optimization, auto-save |
| `SESSION_RECONNECT` | When session reconnects | State restoration, sync |
| `SESSION_COMMAND_COMPLETE` | When a command finishes | Chained commands, notifications |

### System Events

| Trigger | Description | Use Cases |
|---------|-------------|-----------|
| `SYSTEM_RESOURCE` | Resource threshold alerts (CPU, memory, disk) | Auto-scaling, cleanup |
| `SYSTEM_SERVICE` | Service state changes | Restart handlers, notifications |
| `SYSTEM_ALERT` | Alert rules triggered | Incident response, escalation |
| `SYSTEM_UPTIME` | Uptime check failures | Health monitoring, failover |

### Manual

| Trigger | Description | Use Cases |
|---------|-------------|-----------|
| `MANUAL` | Triggered by user action | On-demand tasks, one-off operations |

---

## Action Types

Agents execute actions when triggered. Multiple actions can be chained sequentially.

### Shell Command (`shell`)

Executes a shell command in the project directory.

```json
{
  "type": "shell",
  "config": {
    "command": "npm test -- --passWithNoTests"
  }
}
```

**Features:**
- 5-minute timeout
- 10MB output buffer
- Runs in project directory context
- Access to environment variables

**Template Variables:**
- `{{filePath}}` - Path to the changed file (for FILE_CHANGE triggers)

### API Call (`api`)

Makes an HTTP request to an API endpoint.

```json
{
  "type": "api",
  "config": {
    "url": "https://api.example.com/webhook",
    "method": "POST"
  }
}
```

**Supported Methods:** GET, POST, PUT, DELETE

### MCP Tool (`mcp`)

Invokes a Model Context Protocol server tool.

```json
{
  "type": "mcp",
  "config": {
    "serverId": "filesystem",
    "toolName": "read_file",
    "args": { "path": "/path/to/file" }
  }
}
```

**Note:** MCP integration is available when MCP servers are configured.

---

## Installing Agents from Marketplace

### Via UI

1. Navigate to **Admin Dashboard** > **Automation** > **Agents**
2. Click **Marketplace** to browse available agents
3. Select an agent to view details
4. Click **Install** and configure options:
   - Select target project (optional)
   - Configure agent-specific settings
5. Agent is installed and enabled automatically

### Via API

```bash
# List marketplace agents
GET /api/marketplace/agents

# Get agent details
GET /api/marketplace/agents/eslint-auto-fixer

# Install agent
POST /api/marketplace/agents/eslint-auto-fixer/install
Content-Type: application/json

{
  "projectId": "clxxxxxx",
  "config": {
    "extensions": ".js,.ts,.tsx",
    "autoFix": true
  }
}

# Uninstall agent
DELETE /api/marketplace/agents/eslint-auto-fixer/uninstall
```

### Installation Response

```json
{
  "success": true,
  "agent": {
    "id": "clxxxxxx",
    "name": "ESLint Auto-Fixer",
    "description": "Automatically fixes ESLint issues...",
    "triggerType": "FILE_CHANGE",
    "enabled": true,
    "catalogId": "eslint-auto-fixer"
  },
  "message": "ESLint Auto-Fixer installed successfully"
}
```

---

## Creating Custom Agents

### Via UI

1. Navigate to **Admin Dashboard** > **Automation** > **Agents**
2. Click **New Agent**
3. Fill in agent details:
   - **Name**: Display name for the agent
   - **Description**: What the agent does
   - **Trigger Type**: Event that triggers the agent
   - **Project**: (Optional) Scope to specific project
4. Configure trigger settings (if applicable)
5. Add actions (shell commands, API calls, etc.)
6. Save and enable the agent

### Via API

```bash
POST /api/agents
Content-Type: application/json

{
  "name": "Custom Linter",
  "description": "Runs custom linting rules",
  "triggerType": "GIT_PRE_COMMIT",
  "triggerConfig": {
    "extensions": ".js,.ts"
  },
  "actions": [
    {
      "type": "shell",
      "config": {
        "command": "npm run lint:custom"
      }
    }
  ],
  "enabled": true,
  "projectId": "clxxxxxx"
}
```

### Agent Schema

```typescript
interface Agent {
  id: string;                    // Auto-generated CUID
  name: string;                  // Display name
  description?: string;          // Optional description
  triggerType: AgentTrigger;     // Event trigger
  triggerConfig?: object;        // Trigger-specific config
  actions: Action[];             // Array of actions to execute
  enabled: boolean;              // Active status
  projectId?: string;            // Scope to project (optional)
  catalogId?: string;            // Marketplace reference
  catalogMeta?: object;          // Cached catalog metadata
  createdAt: Date;
  updatedAt: Date;
}

interface Action {
  type: 'shell' | 'api' | 'mcp';
  config: ShellConfig | ApiConfig | McpConfig;
}
```

---

## Agent Execution and Monitoring

### Execution States

| Status | Description |
|--------|-------------|
| `RUNNING` | Agent is currently executing |
| `COMPLETED` | Agent finished successfully |
| `FAILED` | Agent encountered an error |
| `CANCELLED` | Agent was manually stopped |

### Real-time Monitoring

Agents emit Socket.IO events for real-time status updates:

```javascript
// Agent status change
socket.on('agent:status', (data) => {
  console.log(data);
  // {
  //   agentId: "clxxxxxx",
  //   executionId: "clxxxxxx",
  //   status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED",
  //   startedAt: "2026-01-18T...",
  //   endedAt: "2026-01-18T...",
  //   error: "Error message" (if failed)
  // }
});

// Agent output stream
socket.on('agent:output', (data) => {
  console.log(data);
  // {
  //   agentId: "clxxxxxx",
  //   executionId: "clxxxxxx",
  //   actionIndex: 0,
  //   output: "Command output..."
  // }
});
```

### Execution History

```bash
# Get agent with execution history
GET /api/agents/:id?page=1&limit=50

# Get specific execution details
GET /api/agents/executions/:executionId

# Clean up old executions
DELETE /api/agents/executions/cleanup?days=7
```

### Runner Status

```bash
GET /api/agents/status/runner

# Response
{
  "running": [
    {
      "agentId": "clxxxxxx",
      "executionId": "clxxxxxx",
      "startedAt": "2026-01-18T..."
    }
  ],
  "maxConcurrent": 5,
  "available": 4
}
```

---

## API Reference

### Agent CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents` | List all agents |
| `GET` | `/api/agents/:id` | Get agent details |
| `POST` | `/api/agents` | Create agent |
| `PUT` | `/api/agents/:id` | Update agent |
| `DELETE` | `/api/agents/:id` | Delete agent |

### Agent Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agents/:id/run` | Manually trigger agent |
| `POST` | `/api/agents/:id/stop` | Stop running agent |
| `POST` | `/api/agents/:id/toggle` | Enable/disable agent |
| `GET` | `/api/agents/status/runner` | Get runner status |

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/marketplace/categories` | List categories |
| `GET` | `/api/marketplace/agents` | List catalog agents |
| `GET` | `/api/marketplace/agents/:id` | Get catalog agent details |
| `POST` | `/api/marketplace/agents/:id/install` | Install agent |
| `DELETE` | `/api/marketplace/agents/:id/uninstall` | Uninstall agent |
| `PUT` | `/api/marketplace/agents/:id/update` | Update installed agent config |
| `GET` | `/api/marketplace/installed` | List installed marketplace agents |
| `GET` | `/api/marketplace/stats` | Get marketplace statistics |

### Metadata

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents/meta/triggers` | List available trigger types |
| `GET` | `/api/agents/meta/actions` | List available action types |

---

## Configuration Limits

| Setting | Value | Description |
|---------|-------|-------------|
| Max Concurrent Agents | 5 | Maximum agents running simultaneously |
| Shell Command Timeout | 5 minutes | Maximum execution time per command |
| Output Buffer | 10 MB | Maximum output size per command |
| Execution History | 7 days | Default retention (configurable via cleanup) |

---

## Best Practices

### Agent Design

1. **Keep actions focused** - Each agent should do one thing well
2. **Use appropriate triggers** - Match trigger to the use case
3. **Handle errors gracefully** - Commands should fail safely
4. **Consider performance** - Avoid heavy operations on FILE_CHANGE triggers

### Security

1. **Never expose secrets** - Use environment variables
2. **Validate inputs** - Sanitize any dynamic command parameters
3. **Scope to projects** - Limit agent access when possible
4. **Review marketplace agents** - Understand what commands will run

### Monitoring

1. **Check execution history** - Review failed executions regularly
2. **Set up alerts** - Use SYSTEM_ALERT triggers for critical failures
3. **Clean up old executions** - Run periodic cleanup to manage storage

---

## Troubleshooting

### Agent Not Triggering

1. Verify agent is enabled (`enabled: true`)
2. Check trigger type matches the event
3. For FILE_CHANGE, verify file extensions match config
4. Check runner status for concurrent limit

### Agent Failing

1. Check execution error in history
2. Verify command works manually in project directory
3. Check required tools are installed (ESLint, Prettier, etc.)
4. Review output buffer for truncation

### Performance Issues

1. Reduce FILE_CHANGE trigger scope with specific patterns
2. Avoid running heavy commands on every change
3. Use MANUAL trigger for expensive operations
4. Check concurrent agent limit isn't bottlenecking

---

## Related Documentation

- [CLAUDE.md](/home/thornburywn/Projects/console-web/CLAUDE.md) - Project overview
- [SOCKET-EVENTS.md](/home/thornburywn/Projects/console-web/docs/SOCKET-EVENTS.md) - Socket.IO event reference
- [TECHNICAL_SPECIFICATIONS.md](/home/thornburywn/Projects/console-web/docs/TECHNICAL_SPECIFICATIONS.md) - Full technical specs

---

**Maintained By:** Console.web Team
**Agent Count:** 13 pre-built agents
**Categories:** 7
