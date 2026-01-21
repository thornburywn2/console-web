# Agent Visualization Project - Full Implementation Plan

**Project Codename:** Claude Vision (or similar)
**Type:** New Standalone Project
**Inspiration:** [21st-dev/1code](https://github.com/21st-dev/1code)
**Estimated Effort:** 6-8 weeks
**Priority:** Future consideration

---

## Executive Summary

This document outlines a complete greenfield implementation of an agent visualization interface, inspired by 1code's approach to transparent AI agent execution. Unlike the incremental Option A approach for console-web, this would be a purpose-built application focused entirely on agent visualization, execution control, and code change management.

---

## Core Philosophy

### Design Principles

1. **Transparency First** - Every tool call, file edit, and decision visible to the user
2. **Approval Workflows** - Human-in-the-loop for destructive operations
3. **Isolation by Default** - Git worktrees prevent accidental main branch modifications
4. **Real-time Streaming** - See execution as it happens, not after
5. **Code-Centric** - Diff previews, syntax highlighting, inline annotations

### Target Users

- Developers running Claude Code agents on complex tasks
- Teams wanting visibility into AI-assisted code changes
- Organizations requiring audit trails for AI modifications

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Bun | Fast, TypeScript-native |
| **Language** | TypeScript (strict) | Type safety, IDE support |
| **Desktop** | Electron + electron-vite | Cross-platform, native APIs |
| **Frontend** | React 18, Vite, Tailwind CSS | Modern, performant |
| **Editor** | Monaco Editor | VS Code parity, diff support |
| **Terminal** | xterm.js | Embedded terminal when needed |
| **Database** | SQLite + Drizzle ORM | Local-first, portable |
| **IPC** | Electron IPC + Socket.IO | Real-time streaming |
| **Git** | isomorphic-git + simple-git | Worktree management |
| **Process** | node-pty | PTY for Claude Code execution |
| **Testing** | Vitest, Playwright | Unit + E2E |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Git Service │  │Agent Runner │  │ File Watcher│  │  Database  │ │
│  │  (worktrees)│  │  (claude)   │  │  (chokidar) │  │  (SQLite)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┼────────────────┼────────────────┘        │
│                          │                │                         │
│                    ┌─────┴────────────────┴─────┐                   │
│                    │      IPC Event Bridge      │                   │
│                    └─────────────┬──────────────┘                   │
├──────────────────────────────────┼──────────────────────────────────┤
│                        Electron Renderer                            │
│  ┌───────────────────────────────┴───────────────────────────────┐ │
│  │                      React Application                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│ │
│  │  │  Sidebar    │  │  Main View  │  │    Right Panel          ││ │
│  │  │  - Sessions │  │  - Plan     │  │    - Tool Calls         ││ │
│  │  │  - Projects │  │  - Diff     │  │    - File Changes       ││ │
│  │  │  - History  │  │  - Terminal │  │    - Approvals          ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘│ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Git Worktree Isolation

Each agent session runs in an isolated git worktree to prevent accidental modifications to the main branch.

```typescript
interface WorktreeSession {
  id: string;
  projectPath: string;
  worktreePath: string;      // /tmp/claude-vision/worktrees/{sessionId}
  baseBranch: string;        // e.g., "main"
  sessionBranch: string;     // e.g., "claude/session-abc123"
  createdAt: Date;
  status: 'active' | 'merged' | 'discarded';
}

// Lifecycle
createWorktree(projectPath, baseBranch) → WorktreeSession
mergeWorktree(sessionId, squash: boolean) → MergeResult
discardWorktree(sessionId) → void
```

**Benefits:**
- Safe experimentation without risk to main branch
- Easy rollback by discarding worktree
- Clean merge history with optional squash
- Multiple parallel sessions on same project

### 2. Plan Mode Visualization

Before execution, Claude generates a structured plan that users can review and approve.

```typescript
interface ExecutionPlan {
  id: string;
  sessionId: string;
  steps: PlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  approvedAt?: Date;
}

interface PlanStep {
  id: string;
  order: number;
  type: 'read' | 'write' | 'edit' | 'bash' | 'mcp_tool' | 'think';
  description: string;
  targetPath?: string;
  estimatedChanges?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  requires_approval: boolean;
  dependencies: string[];  // step IDs this depends on
}
```

**UI Components:**
- `PlanOverview` - Collapsible step list with status indicators
- `StepDetail` - Expanded view with predicted changes
- `ApprovalDialog` - Confirm/reject with optional modifications
- `DependencyGraph` - Visual DAG of step relationships

### 3. Real-time Tool Call Streaming

Every tool invocation streams to the UI with full context.

```typescript
interface ToolCall {
  id: string;
  sessionId: string;
  stepId: string;
  tool: string;           // 'Read', 'Write', 'Edit', 'Bash', 'WebFetch', etc.
  arguments: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  // Results
  output?: string;
  error?: string;

  // For file operations
  filePath?: string;
  diffPreview?: DiffHunk[];

  // For bash
  exitCode?: number;

  // Approval state
  requiresApproval: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}
```

**IPC Events:**
```typescript
// Main → Renderer
'tool:start'      → { toolCall: ToolCall }
'tool:output'     → { toolCallId: string, chunk: string }
'tool:complete'   → { toolCall: ToolCall }
'tool:approval'   → { toolCall: ToolCall }  // requires user input

// Renderer → Main
'tool:approve'    → { toolCallId: string }
'tool:reject'     → { toolCallId: string, reason?: string }
'tool:modify'     → { toolCallId: string, modifications: object }
```

### 4. Diff Preview System

File modifications show side-by-side or inline diffs before and during execution.

```typescript
interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  lineNumber: { old?: number; new?: number };
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;          // for renames
  hunks: DiffHunk[];
  language: string;          // for syntax highlighting
  preview: 'pending' | 'approved' | 'applied';
}
```

**UI Components:**
- `DiffViewer` - Monaco-based side-by-side diff
- `InlineDiff` - Unified diff with +/- highlighting
- `FileTree` - Changed files with status icons
- `ChangePreview` - Hover preview of modifications

### 5. Approval Workflow

Configurable gates requiring human approval before execution.

```typescript
interface ApprovalConfig {
  // Global settings
  requireApprovalFor: {
    fileWrites: boolean;      // Any Write/Edit tool
    bashCommands: boolean;    // Any Bash execution
    destructive: boolean;     // rm, git reset, etc.
    networkCalls: boolean;    // WebFetch, API calls
    mcpTools: boolean;        // MCP tool invocations
  };

  // Path-based rules
  pathRules: {
    pattern: string;          // glob pattern
    requireApproval: boolean;
    allowedOperations: ('read' | 'write' | 'delete')[];
  }[];

  // Command blocklist
  blockedCommands: string[];  // e.g., ['rm -rf', 'git push -f']

  // Auto-approve patterns
  autoApprove: {
    testFiles: boolean;       // **/test/**, **/*.test.*
    docs: boolean;            // **/*.md, **/docs/**
    config: boolean;          // package.json, tsconfig.json
  };
}
```

**Approval States:**
1. **Pending** - Tool call waiting for user decision
2. **Approved** - User confirmed, execution proceeds
3. **Rejected** - User denied, execution halted or skipped
4. **Modified** - User edited the tool call before approval
5. **Auto-approved** - Matched auto-approve rules

### 6. Session Management

Complete session lifecycle with persistence and recovery.

```typescript
interface Session {
  id: string;
  name: string;
  projectId: string;
  worktreeId?: string;

  // State
  status: 'idle' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed';

  // Execution data
  plan?: ExecutionPlan;
  toolCalls: ToolCall[];
  fileChanges: FileChange[];

  // Conversation
  messages: Message[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Statistics
  stats: {
    toolCallCount: number;
    filesModified: number;
    linesChanged: number;
    duration: number;
    tokensUsed: number;
  };
}
```

---

## Database Schema (Drizzle)

```typescript
// schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path').notNull().unique(),
  lastOpened: integer('last_opened', { mode: 'timestamp' }),
  settings: text('settings', { mode: 'json' }),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('idle'),
  worktreePath: text('worktree_path'),
  worktreeBranch: text('worktree_branch'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  status: text('status').notNull().default('draft'),
  steps: text('steps', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
});

export const toolCalls = sqliteTable('tool_calls', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  planStepId: text('plan_step_id'),
  tool: text('tool').notNull(),
  arguments: text('arguments', { mode: 'json' }),
  status: text('status').notNull().default('pending'),
  output: text('output'),
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  duration: integer('duration'),
  approvalStatus: text('approval_status'),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
});

export const fileChanges = sqliteTable('file_changes', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  toolCallId: text('tool_call_id').references(() => toolCalls.id),
  path: text('path').notNull(),
  status: text('status').notNull(), // added, modified, deleted, renamed
  oldPath: text('old_path'),
  diff: text('diff', { mode: 'json' }),
  applied: integer('applied', { mode: 'boolean' }).default(false),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  role: text('role').notNull(), // user, assistant, system
  content: text('content').notNull(),
  toolCalls: text('tool_calls', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
});
```

---

## UI Components

### Main Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌────┐  Claude Vision                              ─ □ ×           │
│  │ ≡  │  Session: "Add user auth" • project-name                    │
├──┴────┴──────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌─────────────────────────────────────┐ ┌─────────────┐│
│ │ Sessions │ │                                     │ │ Tool Calls  ││
│ │          │ │   ┌─────────────────────────────┐   │ │             ││
│ │ ► Auth   │ │   │      EXECUTION PLAN         │   │ │ ✓ Read      ││
│ │   Setup  │ │   │                             │   │ │ ✓ Read      ││
│ │   Tests  │ │   │ ✓ 1. Read existing code     │   │ │ ► Edit      ││
│ │          │ │   │ ✓ 2. Create auth service    │   │ │ ○ Write     ││
│ ├──────────┤ │   │ ► 3. Add middleware         │   │ │ ○ Bash      ││
│ │ Projects │ │   │ ○ 4. Update routes          │   │ │             ││
│ │          │ │   │ ○ 5. Write tests            │   │ ├─────────────┤│
│ │ • app    │ │   │                             │   │ │ File Changes││
│ │ • api    │ │   └─────────────────────────────┘   │ │             ││
│ │ • lib    │ │                                     │ │ M auth.ts   ││
│ │          │ │   ┌─────────────────────────────┐   │ │ A middleware││
│ │          │ │   │      DIFF PREVIEW           │   │ │ M routes.ts ││
│ │          │ │   │  src/middleware/auth.ts     │   │ │             ││
│ │          │ │   │ ─────────────────────────── │   │ │             ││
│ │          │ │   │ - // TODO: add auth         │   │ │             ││
│ │          │ │   │ + import { verify } from... │   │ │             ││
│ │          │ │   │ + export const authMiddle...│   │ │             ││
│ │          │ │   │                             │   │ │             ││
│ │          │ │   │  [Approve] [Reject] [Edit]  │   │ │             ││
│ │          │ │   └─────────────────────────────┘   │ │             ││
│ └──────────┘ └─────────────────────────────────────┘ └─────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│ ► Ready │ 3/5 steps │ 2 files changed │ +47 -12 lines │ 1.2k tokens │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── TitleBar
├── Layout
│   ├── LeftSidebar
│   │   ├── SessionList
│   │   │   └── SessionItem (with status indicator)
│   │   ├── ProjectBrowser
│   │   │   └── ProjectItem
│   │   └── RecentHistory
│   │
│   ├── MainPanel
│   │   ├── TabBar (Plan | Diff | Terminal | Chat)
│   │   ├── PlanView
│   │   │   ├── PlanHeader (status, controls)
│   │   │   ├── StepList
│   │   │   │   └── StepItem (with expand/collapse)
│   │   │   └── PlanActions (approve all, reject, modify)
│   │   ├── DiffView
│   │   │   ├── FileSelector
│   │   │   ├── DiffEditor (Monaco)
│   │   │   └── ApprovalButtons
│   │   ├── TerminalView
│   │   │   └── XTerminal (xterm.js)
│   │   └── ChatView
│   │       ├── MessageList
│   │       ├── ToolCallInline
│   │       └── InputArea
│   │
│   └── RightSidebar
│       ├── ToolCallList
│       │   └── ToolCallItem (expandable)
│       ├── FileChangeList
│       │   └── FileChangeItem (click to diff)
│       └── SessionStats
│
└── StatusBar
    ├── SessionStatus
    ├── StepProgress
    ├── ChangesSummary
    └── TokenUsage
```

### Key Components Detail

#### PlanView
```tsx
interface PlanViewProps {
  plan: ExecutionPlan;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onStepApprove: (stepId: string) => void;
  onStepReject: (stepId: string) => void;
  onStepModify: (stepId: string, changes: Partial<PlanStep>) => void;
}
```

#### DiffEditor
```tsx
interface DiffEditorProps {
  original: string;
  modified: string;
  language: string;
  filePath: string;
  readOnly?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (newContent: string) => void;
}
```

#### ToolCallItem
```tsx
interface ToolCallItemProps {
  toolCall: ToolCall;
  expanded: boolean;
  onToggle: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}
```

---

## Main Process Services

### AgentRunner Service

```typescript
// services/agentRunner.ts
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class AgentRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private session: Session;

  constructor(session: Session) {
    super();
    this.session = session;
  }

  async start(prompt: string): Promise<void> {
    const workingDir = this.session.worktreePath || this.session.project.path;

    this.process = spawn('claude', ['--print', '--output-format', 'stream-json'], {
      cwd: workingDir,
      env: { ...process.env, ANTHROPIC_API_KEY: getApiKey() },
    });

    this.process.stdout.on('data', (chunk) => {
      const events = this.parseStreamEvents(chunk);
      for (const event of events) {
        this.handleEvent(event);
      }
    });

    this.process.stdin.write(prompt);
    this.process.stdin.end();
  }

  private handleEvent(event: StreamEvent): void {
    switch (event.type) {
      case 'tool_use':
        this.emit('tool:start', this.createToolCall(event));
        break;
      case 'tool_result':
        this.emit('tool:complete', event);
        break;
      case 'content_block_delta':
        this.emit('content', event.delta);
        break;
      // ... more event types
    }
  }

  pause(): void {
    // Send SIGSTOP or implement pause logic
  }

  resume(): void {
    // Send SIGCONT or implement resume logic
  }

  stop(): void {
    this.process?.kill('SIGTERM');
  }
}
```

### WorktreeService

```typescript
// services/worktree.ts
import simpleGit, { SimpleGit } from 'simple-git';
import { nanoid } from 'nanoid';
import * as path from 'path';
import * as fs from 'fs/promises';

const WORKTREE_BASE = '/tmp/claude-vision/worktrees';

export class WorktreeService {
  async create(projectPath: string, baseBranch: string): Promise<WorktreeSession> {
    const git: SimpleGit = simpleGit(projectPath);
    const sessionId = nanoid(12);
    const sessionBranch = `claude/session-${sessionId}`;
    const worktreePath = path.join(WORKTREE_BASE, sessionId);

    // Create branch and worktree
    await git.checkout(['-b', sessionBranch, baseBranch]);
    await git.raw(['worktree', 'add', worktreePath, sessionBranch]);

    return {
      id: sessionId,
      projectPath,
      worktreePath,
      baseBranch,
      sessionBranch,
      createdAt: new Date(),
      status: 'active',
    };
  }

  async merge(session: WorktreeSession, squash: boolean): Promise<MergeResult> {
    const mainGit = simpleGit(session.projectPath);

    // Switch to base branch
    await mainGit.checkout(session.baseBranch);

    // Merge with optional squash
    if (squash) {
      await mainGit.raw(['merge', '--squash', session.sessionBranch]);
      await mainGit.commit(`[Claude] ${session.id}`);
    } else {
      await mainGit.merge([session.sessionBranch]);
    }

    // Cleanup
    await this.discard(session);

    return { success: true, branch: session.baseBranch };
  }

  async discard(session: WorktreeSession): Promise<void> {
    const git = simpleGit(session.projectPath);

    // Remove worktree
    await git.raw(['worktree', 'remove', session.worktreePath, '--force']);

    // Delete branch
    await git.branch(['-D', session.sessionBranch]);

    // Cleanup directory if exists
    await fs.rm(session.worktreePath, { recursive: true, force: true });
  }

  async getDiff(session: WorktreeSession): Promise<FileChange[]> {
    const git = simpleGit(session.worktreePath);
    const diff = await git.diff([session.baseBranch, '--name-status']);

    // Parse diff into FileChange objects
    return this.parseDiff(diff);
  }
}
```

### DiffService

```typescript
// services/diff.ts
import * as Diff from 'diff';

export class DiffService {
  createDiff(original: string, modified: string): DiffHunk[] {
    const changes = Diff.structuredPatch('', '', original, modified, '', '');
    return changes.hunks.map(hunk => ({
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
      lines: hunk.lines.map(line => ({
        type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context',
        content: line.slice(1),
        lineNumber: this.calculateLineNumber(line, hunk),
      })),
    }));
  }

  applyDiff(original: string, hunks: DiffHunk[]): string {
    // Apply hunks to original content
    return Diff.applyPatch(original, this.hunksToUnified(hunks));
  }

  previewChange(filePath: string, toolCall: ToolCall): FileChange {
    // Generate preview of what a tool call would change
    const original = fs.readFileSync(filePath, 'utf-8');
    const modified = this.simulateToolCall(original, toolCall);

    return {
      path: filePath,
      status: 'modified',
      hunks: this.createDiff(original, modified),
      language: this.detectLanguage(filePath),
      preview: 'pending',
    };
  }
}
```

---

## IPC Communication

### Event Types

```typescript
// shared/events.ts

// Session events
type SessionEvents = {
  'session:create': { projectId: string; name: string; useWorktree: boolean };
  'session:load': { sessionId: string };
  'session:start': { sessionId: string; prompt: string };
  'session:pause': { sessionId: string };
  'session:resume': { sessionId: string };
  'session:stop': { sessionId: string };
  'session:status': { session: Session };
};

// Plan events
type PlanEvents = {
  'plan:created': { plan: ExecutionPlan };
  'plan:approve': { planId: string };
  'plan:reject': { planId: string };
  'plan:step:approve': { planId: string; stepId: string };
  'plan:step:reject': { planId: string; stepId: string };
  'plan:step:status': { planId: string; stepId: string; status: StepStatus };
};

// Tool events
type ToolEvents = {
  'tool:start': { toolCall: ToolCall };
  'tool:output': { toolCallId: string; chunk: string };
  'tool:complete': { toolCall: ToolCall };
  'tool:approval:request': { toolCall: ToolCall };
  'tool:approve': { toolCallId: string };
  'tool:reject': { toolCallId: string; reason?: string };
  'tool:modify': { toolCallId: string; modifications: object };
};

// File events
type FileEvents = {
  'file:change:preview': { fileChange: FileChange };
  'file:change:apply': { fileChangeId: string };
  'file:change:revert': { fileChangeId: string };
};

// Worktree events
type WorktreeEvents = {
  'worktree:create': { projectPath: string; baseBranch: string };
  'worktree:created': { worktree: WorktreeSession };
  'worktree:merge': { sessionId: string; squash: boolean };
  'worktree:discard': { sessionId: string };
  'worktree:diff': { sessionId: string };
};
```

### IPC Handlers (Main Process)

```typescript
// main/ipc.ts
import { ipcMain } from 'electron';
import { AgentRunner } from './services/agentRunner';
import { WorktreeService } from './services/worktree';
import { db } from './database';

const runners = new Map<string, AgentRunner>();
const worktreeService = new WorktreeService();

// Session handlers
ipcMain.handle('session:create', async (_, data) => {
  const session = await db.insert(sessions).values({
    id: nanoid(),
    projectId: data.projectId,
    name: data.name,
    status: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  if (data.useWorktree) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, data.projectId),
    });
    const worktree = await worktreeService.create(project.path, 'main');
    await db.update(sessions)
      .set({ worktreePath: worktree.worktreePath, worktreeBranch: worktree.sessionBranch })
      .where(eq(sessions.id, session.id));
  }

  return session;
});

ipcMain.handle('session:start', async (event, { sessionId, prompt }) => {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { project: true },
  });

  const runner = new AgentRunner(session);
  runners.set(sessionId, runner);

  // Forward events to renderer
  runner.on('tool:start', (toolCall) => {
    event.sender.send('tool:start', { toolCall });
  });

  runner.on('tool:complete', (toolCall) => {
    event.sender.send('tool:complete', { toolCall });
  });

  await runner.start(prompt);
});

// Tool approval handlers
ipcMain.handle('tool:approve', async (_, { toolCallId }) => {
  await db.update(toolCalls)
    .set({ approvalStatus: 'approved', approvedAt: new Date() })
    .where(eq(toolCalls.id, toolCallId));

  // Resume execution
  // ... implementation
});
```

---

## Project Structure

```
claude-vision/
├── electron/
│   ├── main/
│   │   ├── index.ts              # Electron main entry
│   │   ├── ipc.ts                # IPC handlers
│   │   ├── menu.ts               # Application menu
│   │   └── services/
│   │       ├── agentRunner.ts    # Claude execution
│   │       ├── worktree.ts       # Git worktree management
│   │       ├── diff.ts           # Diff generation
│   │       └── database.ts       # SQLite/Drizzle
│   ├── preload/
│   │   └── index.ts              # Preload scripts
│   └── shared/
│       ├── types.ts              # Shared TypeScript types
│       └── events.ts             # IPC event definitions
├── src/
│   ├── App.tsx                   # React root
│   ├── main.tsx                  # React entry
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── TitleBar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── LeftSidebar.tsx
│   │   │   └── RightSidebar.tsx
│   │   ├── sessions/
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionItem.tsx
│   │   │   └── SessionControls.tsx
│   │   ├── plan/
│   │   │   ├── PlanView.tsx
│   │   │   ├── StepList.tsx
│   │   │   ├── StepItem.tsx
│   │   │   └── PlanActions.tsx
│   │   ├── diff/
│   │   │   ├── DiffView.tsx
│   │   │   ├── DiffEditor.tsx
│   │   │   ├── FileSelector.tsx
│   │   │   └── InlineDiff.tsx
│   │   ├── tools/
│   │   │   ├── ToolCallList.tsx
│   │   │   ├── ToolCallItem.tsx
│   │   │   └── ToolOutput.tsx
│   │   ├── files/
│   │   │   ├── FileChangeList.tsx
│   │   │   └── FileChangeItem.tsx
│   │   ├── chat/
│   │   │   ├── ChatView.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── InputArea.tsx
│   │   └── terminal/
│   │       └── TerminalView.tsx
│   ├── hooks/
│   │   ├── useSession.ts
│   │   ├── useToolCalls.ts
│   │   ├── usePlan.ts
│   │   ├── useWorktree.ts
│   │   └── useIPC.ts
│   ├── stores/
│   │   ├── sessionStore.ts       # Zustand
│   │   ├── planStore.ts
│   │   └── toolStore.ts
│   └── styles/
│       └── globals.css
├── drizzle/
│   ├── schema.ts                 # Database schema
│   └── migrations/
├── resources/                    # App icons, assets
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── CLAUDE.md
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Project scaffolding with electron-vite
- [ ] Database schema and migrations
- [ ] Basic Electron shell with IPC
- [ ] Session CRUD operations
- [ ] Basic UI layout

### Phase 2: Agent Integration (Week 2-3)

- [ ] AgentRunner service
- [ ] Tool call streaming and parsing
- [ ] Real-time IPC events
- [ ] Basic tool call list UI

### Phase 3: Plan Mode (Week 3-4)

- [ ] Plan parsing from Claude output
- [ ] Plan visualization UI
- [ ] Step approval workflow
- [ ] Plan modification support

### Phase 4: Diff System (Week 4-5)

- [ ] Diff generation service
- [ ] Monaco diff editor integration
- [ ] File change tracking
- [ ] Approval workflow for file changes

### Phase 5: Git Worktrees (Week 5-6)

- [ ] Worktree service implementation
- [ ] Worktree UI controls
- [ ] Merge/discard workflows
- [ ] Branch management UI

### Phase 6: Polish (Week 6-8)

- [ ] Error handling and recovery
- [ ] Settings and configuration
- [ ] Keyboard shortcuts
- [ ] Performance optimization
- [ ] Testing and bug fixes
- [ ] Documentation

---

## Configuration

### Default Settings

```typescript
const defaultConfig: AppConfig = {
  // Execution
  execution: {
    autoApproveReads: true,
    autoApproveTestFiles: true,
    autoApproveDocs: false,
    requireApprovalForBash: true,
    requireApprovalForWrites: true,
    blockedCommands: ['rm -rf /', 'git push -f origin main'],
  },

  // Worktrees
  worktrees: {
    enabled: true,
    autoCreate: true,
    defaultSquash: true,
    cleanupOnMerge: true,
    basePath: '/tmp/claude-vision/worktrees',
  },

  // UI
  ui: {
    theme: 'dark',
    fontSize: 14,
    diffStyle: 'side-by-side', // or 'inline'
    showLineNumbers: true,
    autoExpandToolCalls: false,
  },

  // API
  api: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
  },
};
```

---

## Security Considerations

1. **API Key Storage** - Use Electron's safeStorage for encrypted key storage
2. **Path Validation** - Prevent path traversal in file operations
3. **Command Sanitization** - Validate and sanitize bash commands
4. **Worktree Isolation** - Ensure worktrees can't escape project boundaries
5. **IPC Validation** - Validate all IPC messages from renderer

---

## Future Enhancements

- **Multi-agent Support** - Run multiple agents in parallel
- **Team Collaboration** - Share sessions with team members
- **Cloud Sync** - Sync sessions across devices
- **Plugin System** - Custom tool integrations
- **VS Code Extension** - Embed in VS Code as extension
- **CI/CD Integration** - Run agents in CI pipelines
- **Audit Logging** - Complete audit trail for compliance

---

## Related Resources

- [1code Repository](https://github.com/21st-dev/1code)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Claude API Documentation](https://docs.anthropic.com/)

---

**Created:** 2026-01-20
**Status:** Planning Document
**Next Steps:** Proceed with Option A implementation in console-web
