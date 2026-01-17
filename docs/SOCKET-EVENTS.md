# Socket.IO Event Catalog

**Version:** 1.0.0
**Last Updated:** 2026-01-17

This document catalogs all Socket.IO events used in console-web for real-time communication between client and server.

---

## Event Naming Convention

### Current Convention
Events use kebab-case: `terminal-output`, `select-project`, `command-complete`

### Proposed Convention (Phase 2.4)
Namespaced pattern: `{namespace}:{id}:{action}`
- Terminal events: `terminal:{sessionId}:output`, `terminal:{sessionId}:input`
- Agent events: `agent:{agentId}:status`, `agent:{agentId}:output`
- Already using: `aider:{sessionId}:output`, `claude-flow:{swarmId}:status`

---

## Core Terminal Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `select-project` | `{ projectPath: string }` | Connect to a project terminal |
| `terminal-input` | `string` | Send input to terminal PTY |
| `terminal-resize` | `{ cols: number, rows: number }` | Resize terminal dimensions |
| `reconnect-session` | `{ projectPath: string }` | Manually reconnect to existing session |
| `kill-session` | `{ projectPath: string }` | Kill terminal session |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `terminal-output` | `string` | Terminal PTY output data |
| `terminal-ready` | `{ projectPath, sessionName, isNew, isReconnect, reconnected }` | Terminal session ready |
| `terminal-exit` | `{ exitCode: number, projectPath: string }` | PTY process exited |
| `command-complete` | `{ projectPath, projectName, activityDuration, timestamp }` | Command finished (idle detected) |
| `session-killed` | `{ projectPath, sessionName }` | Session was killed |
| `session-error` | `{ message, projectPath }` | Session error occurred |
| `server-shutdown` | `{}` | Server is shutting down |

---

## Agent Events

### Agent Runner Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `agent:status` | S→C | `{ agentId, status, ... }` | Agent status update |
| `agent:output` | S→C | `{ agentId, output }` | Agent console output |
| `agent-output` | S→C | `string` | Agent output stream |
| `agent-started` | S→C | `{ agentId }` | Agent execution started |
| `agent-completed` | S→C | `{ agentId, result }` | Agent execution completed |
| `agent-error` | S→C | `{ agentId, error }` | Agent execution error |

---

## Aider AI Events (Dynamic)

Pattern: `aider:{sessionId}:{action}`

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `aider:{id}:output` | S→C | `string` | Aider AI output |
| `aider:{id}:error` | S→C | `{ message }` | Aider error |
| `aider:{id}:status` | S→C | `{ status }` | Aider status update |
| `aider:{id}:voice` | S→C | `{ listening, transcript }` | Voice input status |

---

## Claude Flow Swarm Events (Dynamic)

Pattern: `claude-flow:{swarmId}:{action}`

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `claude-flow:{id}:output` | S→C | `string` | Swarm output |
| `claude-flow:{id}:error` | S→C | `{ message }` | Swarm error |
| `claude-flow:{id}:status` | S→C | `{ status }` | Swarm status |
| `claude-flow:{id}:agent` | S→C | `{ agentId, action }` | Individual agent event |

---

## Code Puppy Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `puppy-join` | C→S | `{ sessionId }` | Join Code Puppy session |
| `puppy-leave` | C→S | `{ sessionId }` | Leave Code Puppy session |
| `puppy-output` | S→C | `string` | Code Puppy output |
| `puppy-error` | S→C | `{ message }` | Code Puppy error |
| `puppy-status` | S→C | `{ status }` | Code Puppy status |

---

## MCP Server Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `mcp-status-change` | S→C | `{ serverId, status }` | MCP server status changed |
| `mcp-tools-updated` | S→C | `{ serverId, tools }` | MCP tools updated |

---

## System Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Socket.IO | - | Client connected |
| `disconnect` | Socket.IO | `string` (reason) | Client disconnected |
| `connect_error` | Socket.IO | `Error` | Connection error |
| `system-update-progress` | S→C | `{ log }` | System update progress |

---

## Event Flow: Terminal Session

```
CLIENT                                SERVER
  │                                     │
  ├─ emit('select-project', path) ────→ │ Create/reattach PTY
  │                                     │
  │ ←── emit('terminal-ready', data) ───┤
  │                                     │
  ├─ emit('terminal-input', data) ────→ │ Write to PTY
  │                                     │
  │ ←── emit('terminal-output', data) ──┤ PTY output
  │                                     │
  │ ←── emit('command-complete', data) ─┤ Idle timeout (150ms)
  │                                     │
  ├─ emit('terminal-resize', dims) ───→ │ Resize PTY
  │                                     │
  ├─ emit('kill-session', path) ──────→ │ Kill PTY + session
  │                                     │
  │ ←── emit('session-killed', data) ───┤
  │                                     │
  (disconnect)                          │ Cleanup if no sockets
  │ ←── emit('terminal-exit', data) ────┤
```

---

## Files Using Socket.IO

### Server
- `server/index.js` - Main Socket.IO handler (lines 4229-4700)

### Client - Core
- `src/App.jsx` - Primary socket connection and terminal events
- `src/components/Terminal.jsx` - Terminal output display

### Client - Features
- `src/components/CodePuppyDashboard.jsx`
- `src/components/AiderSessionPanel.jsx`
- `src/components/SwarmDashboard.jsx`
- `src/components/AgentStatusDashboard.jsx`
- `src/components/AgentManager.jsx`
- `src/components/AgentOutputStream.jsx`
- `src/components/AgentBuilder.jsx`
- `src/components/MCPServerManager.jsx`
- `src/components/SettingsPanel.jsx`
- `src/components/VoiceCommandPanel.jsx`
- `src/hooks/useAiderVoice.js`

---

## Migration Notes

### Standardization Plan (Phase 2.4)

1. **Terminal events** - Already consistent, no changes needed
2. **Agent events** - Consolidate `agent-*` and `agent:*` patterns
3. **Feature events** - Already using `{feature}:{id}:{action}` pattern

### Breaking Changes
None planned - existing event names will be maintained for backward compatibility.

---

## Statistics

| Category | Count |
|----------|-------|
| Core Terminal Events | 12 |
| Agent Events | 6 |
| Aider Events | 4 |
| Claude Flow Events | 4 |
| Code Puppy Events | 5 |
| MCP Events | 2 |
| System Events | 4 |
| **Total** | **37** |
