import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { spawn } from 'node-pty';
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync, exec } from 'child_process';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import os from 'os';
import Docker from 'dockerode';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Import authentication middleware
import { authentikAuth, createAuthRouter } from './middleware/authentik.js';

// Import modular routes
import {
  createFoldersRouter,
  createPromptsRouter,
  createSnippetsRouter,
  createThemesRouter,
  createAlertsRouter,
  createAgentsRouter,
  createSearchRouter,
  createNotesRouter,
  createTemplatesRouter,
  createSessionsRouter,
  createAIRouter,
  createFilesRouter,
  createLogsRouter,
  createDiffRouter,
  createExportRouter,
  createImportRouter,
  createGitRouter,
  createBackupsRouter,
  createShareRouter,
  createActivityRouter,
  createCommentsRouter,
  createTeamRouter,
  createHandoffRouter,
  createMetricsRouter,
  createUptimeRouter,
  createNetworkRouter,
  createCostRouter,
  createPortsRouter,
  createEnvRouter,
  createDbBrowserRouter,
  createProxyRouter,
  createMCPRouter,
  createContextsRouter,
  createCheckpointsRouter,
  createGithubRouter,
  createCloudflareRouter,
  createMemoryRouter,
  createPlansRouter,
  createBrowserRouter,
  createShortcutsRouter,
  createLifecycleRouter,
  createMarketplaceRouter,
  createVoiceRouter,
  createAiderRouter,
  createTabbyRouter,
  createClaudeFlowRouter,
  createCodePuppyRouter,
  createInfrastructureRouter,
  createUsersFirewallRouter,
  createProjectTemplatesRouter,
  createDependenciesRouter,
  createSystemRouter,
  createProjectTagsRouter
} from './routes/index.js';

// Import services
import { MetricsCollector } from './services/metrics.js';
import { AgentRunner } from './services/agentRunner.js';
import MCPManager from './services/mcpManager.js';
import { createInitializer } from './services/codePuppyInitializer.js';

// ES modules don't have __dirname, compute it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Prisma client for session persistence (Prisma 7 adapter pattern)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const server = createServer(app);

// SECURITY: Trust proxy headers from Cloudflare/Authentik proxy
// This allows req.ip to show the real client IP via X-Forwarded-For
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

const PROJECTS_DIR = process.env.PROJECTS_DIR || `${os.homedir()}/Projects`;
const PORT = process.env.PORT || 5275;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5275';
const CLAUDE_DIR = process.env.CLAUDE_DIR || join(os.homedir(), '.claude');
const CLAUDE_HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl');
const CLAUDE_SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
const CLAUDE_SETTINGS_LOCAL_FILE = join(CLAUDE_DIR, 'settings.local.json');

// Docker client initialization
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Shpool handles session persistence with raw byte passthrough
// No special directory setup needed - shpool auto-daemonizes
// Sessions named with 'sp-' prefix for this app

// Sovereign Stack service configuration
const SOVEREIGN_SERVICES = {
  authentik: {
    name: 'Authentik SSO',
    port: 6201,
    url: 'http://localhost:9000',
    healthEndpoint: '/api/v3/core/health/',
    icon: 'shield',
    description: 'Identity & Access Management',
    containerPattern: 'authentik',
  },
  openwebui: {
    name: 'Open WebUI',
    port: 6202,
    url: 'http://localhost:6202',
    healthEndpoint: '/health',
    icon: 'chat',
    description: 'Voice & Chat Interface',
    containerPattern: 'open-webui',
  },
  silverbullet: {
    name: 'SilverBullet',
    port: 6203,
    url: 'http://localhost:6203',
    healthEndpoint: '/',
    icon: 'note',
    description: 'Knowledge Management',
    containerPattern: 'silverbullet',
  },
  plane: {
    name: 'Plane',
    port: 6204,
    url: 'http://localhost:6204',
    healthEndpoint: '/api/v1/health/',
    icon: 'kanban',
    description: 'Project Management',
    containerPattern: 'plane',
  },
  n8n: {
    name: 'n8n',
    port: 6205,
    url: 'http://localhost:6205',
    healthEndpoint: '/healthz',
    icon: 'workflow',
    description: 'Automation Platform',
    containerPattern: 'n8n',
  },
  voiceRouter: {
    name: 'Voice Router',
    port: 6206,
    url: null,
    healthEndpoint: '/health',
    icon: 'mic',
    description: 'Voice Intent Classification',
    containerPattern: 'voice-router',
  },
  monitoring: {
    name: 'Monitoring Dashboard',
    port: 9001,
    url: null,
    healthEndpoint: '/health',
    icon: 'chart',
    description: 'System Monitoring',
    containerPattern: 'monitoring',
  },
};

// CORS configuration
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// =============================================================================
// HEALTH CHECK (Unauthenticated - for watcher service)
// =============================================================================

app.get('/api/watcher/health', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connectivity
    let dbHealthy = false;
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbHealthy = true;
    } catch (dbError) {
      console.error('[HealthCheck] Database check failed:', dbError.message);
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    // Get uptime
    const uptime = process.uptime();

    // Overall health status
    const healthy = dbHealthy;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      memory: {
        heapUsedMB: memoryMB,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
      database: {
        connected: dbHealthy,
        latencyMs: dbLatency,
      },
      responseTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[HealthCheck] Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

// Auth routes (login, logout, callback, me)
app.use('/auth', createAuthRouter());

// System routes (version, update) - registered BEFORE auth middleware
// These are management endpoints that should work regardless of auth status
// Note: Socket.IO is injected later via systemRouter.setSocketIO() after io is initialized
const systemRouter = createSystemRouter();
app.use('/api/system', systemRouter);

// Apply authentication to all other API routes
// Set AUTH_ENABLED=false in .env to disable auth for development
// Note: /api/system is excluded to allow unauthenticated access to update/version endpoints
app.use('/api', authentikAuth({
  required: process.env.AUTH_ENABLED !== 'false',
  excludePaths: ['/api/system']
}));

// =============================================================================
// MODULAR API ROUTES
// =============================================================================

// Session organization (folders, tags, notes)
app.use('/api', createFoldersRouter(prisma));
app.use('/api/notes', createNotesRouter(prisma));

// Project tags (categorization)
app.use('/api', createProjectTagsRouter(prisma));

// Prompt library
app.use('/api/prompts', createPromptsRouter(prisma));

// Command snippets
app.use('/api/snippets', createSnippetsRouter(prisma));

// Themes
app.use('/api/themes', createThemesRouter(prisma));

// Alerts
app.use('/api/alerts', createAlertsRouter(prisma));

// Background Agents (replaces workflows)
// Note: AgentRunner is initialized after Socket.IO setup below

// Global search
app.use('/api/search', createSearchRouter(prisma, PROJECTS_DIR));

// Session templates
app.use('/api/templates', createTemplatesRouter(prisma));

// Persisted sessions endpoint (must be before sessions router to avoid 404)
app.get('/api/sessions/persisted', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        status: { in: ['ACTIVE', 'DISCONNECTED'] }
      },
      include: {
        project: true
      },
      orderBy: { lastActiveAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error getting persisted sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Session management
app.use('/api/sessions', createSessionsRouter(prisma));

// AI features (usage tracking, analysis, personas)
app.use('/api/ai', createAIRouter(prisma));

// File browser and content
app.use('/api/files', createFilesRouter(prisma));

// Log viewer
app.use('/api/logs', createLogsRouter(prisma));

// Git diff
app.use('/api/diff', createDiffRouter(prisma));

// Export functionality
app.use('/api/export', createExportRouter(prisma));

// Import functionality
app.use('/api/import', createImportRouter(prisma));

// Git operations
app.use('/api/git', createGitRouter(prisma));

// Backup management
app.use('/api/backups', createBackupsRouter(prisma));

// Collaboration: Sharing
app.use('/api/share', createShareRouter(prisma));

// Collaboration: Activity feed
app.use('/api/activity', createActivityRouter(prisma));

// Collaboration: Session comments
app.use('/api/sessions', createCommentsRouter(prisma));

// Collaboration: Team management
app.use('/api/team', createTeamRouter(prisma));

// Collaboration: Session handoff
app.use('/api/sessions', createHandoffRouter(prisma));

// Monitoring: Resource metrics
app.use('/api/metrics', createMetricsRouter(prisma));

// Monitoring: Service uptime
app.use('/api/uptime', createUptimeRouter(prisma));

// Monitoring: Network stats (also available at /api/admin/network)
app.use('/api/network', createNetworkRouter(prisma));

// Monitoring: API cost tracking
app.use('/api/ai/costs', createCostRouter(prisma));

// DevTools: Port management
app.use('/api/ports', createPortsRouter());

// DevTools: Environment files
app.use('/api/env', createEnvRouter());

// DevTools: Database browser
app.use('/api/db', createDbBrowserRouter(prisma));

// DevTools: API proxy for testing
app.use('/api/proxy', createProxyRouter());

// Initialize metrics collector
const metricsCollector = new MetricsCollector(prisma, {
  intervalMs: 60000,  // Collect every minute
  retentionDays: 7    // Keep 7 days of history
});
metricsCollector.start();

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Inject Socket.IO into system router for real-time update progress
systemRouter.setSocketIO(io);

// Store active PTY sessions mapped by project ID
const sessions = new Map();

// Store socket-to-project mappings
const socketProjects = new Map();

// Store previous CPU stats for delta-based calculation
let prevCpuStats = null;

// Command completion detection settings
const IDLE_TIMEOUT_MS = 1500; // Time after last output to consider command "complete"
const MIN_ACTIVITY_MS = 500; // Minimum activity time before considering completion

// =============================================================================
// CODE PUPPY INITIALIZATION
// =============================================================================

// Initialize Code Puppy Initializer
const codePuppyInitializer = createInitializer(prisma);
console.log('✅ Code Puppy Initializer ready');

// =============================================================================
// BACKGROUND AGENTS SYSTEM
// =============================================================================

// Initialize Agent Runner with access to sessions
const agentRunner = new AgentRunner(prisma, io, sessions);

// Register agents route (needs agentRunner instance)
app.use('/api/agents', createAgentsRouter(prisma, agentRunner));

// Register Agent Marketplace routes
app.use('/api/marketplace', createMarketplaceRouter(prisma));

// Initialize agent runner on startup
agentRunner.initialize().catch(err => {
  console.error('[AgentRunner] Failed to initialize:', err);
});

// =============================================================================
// MCP SERVER MANAGEMENT SYSTEM
// =============================================================================

// Initialize MCP Manager
const mcpManager = new MCPManager(prisma, io);

// Register MCP routes (needs mcpManager instance)
app.use('/api/mcp', createMCPRouter(prisma, mcpManager));

// Register Context routes for project context management
app.use('/api', createContextsRouter(prisma));

// Register Checkpoint routes for snapshot/rollback functionality
app.use('/api/checkpoints', createCheckpointsRouter(prisma, PROJECTS_DIR));

// Register GitHub routes for repo management, sync, and CI/CD
app.use('/api/github', createGithubRouter(prisma));

// Register Cloudflare Tunnel routes for publishing applications
app.use('/api/cloudflare', createCloudflareRouter(prisma));

// Register Memory Banks routes for layered context persistence
app.use('/api/memory', createMemoryRouter(prisma));

// Register Plan Mode routes for AI planning visualization
app.use('/api/plans', createPlansRouter(prisma));

// Register Embedded Browser routes for agent UI inspection
app.use('/api/browser', createBrowserRouter(prisma));

// Register Keyboard Shortcuts routes
app.use('/api/shortcuts', createShortcutsRouter(prisma));

// Register Lifecycle Agent routes (security, quality, performance) with resource management
app.use('/api/lifecycle', createLifecycleRouter(prisma));

// Register Voice Command routes (P0 Critical - Voice-to-Code)
app.use('/api/voice', createVoiceRouter(prisma));

// Register Aider Integration routes (P1 - Aider AI Coding Assistant)
app.use('/api/aider', createAiderRouter(prisma, io));

// Register Tabby Integration routes (P2 - Tabby AI Code Completion)
app.use('/api/tabby', createTabbyRouter(prisma, io));

// Register Claude Flow routes (P3 - Multi-Agent Swarm)
app.use('/api/claude-flow', createClaudeFlowRouter(prisma, io));

// Register Code Puppy routes (AI Coding Assistant)
app.use('/api/code-puppy', createCodePuppyRouter(io, prisma));

app.use('/api/infra', createInfrastructureRouter());
app.use('/api/admin-users', createUsersFirewallRouter(prisma));
app.use('/api/project-templates', createProjectTemplatesRouter());
app.use('/api/dependencies', createDependenciesRouter());

// Server Configuration endpoint (read-only)
app.get('/api/config', (req, res) => {
  res.json({
    version: '2.9.0',
    environment: process.env.NODE_ENV || 'development',
    paths: {
      projectsDir: PROJECTS_DIR,
      claudeDir: CLAUDE_DIR,
      historyFile: CLAUDE_HISTORY_FILE,
      settingsFile: CLAUDE_SETTINGS_FILE,
      settingsLocalFile: CLAUDE_SETTINGS_LOCAL_FILE,
      backupsDir: process.env.BACKUPS_DIR || join(os.homedir(), '.backups'),
    },
    ports: {
      api: PORT,
      frontend: process.env.VITE_PORT || 7777,
    },
    auth: {
      enabled: process.env.AUTH_ENABLED !== 'false',
      authentikUrl: process.env.AUTHENTIK_URL || 'http://localhost:9000',
      clientId: process.env.AUTHENTIK_CLIENT_ID || 'claude-manager',
    },
    features: {
      docker: true,
      mcp: true,
      github: true,
      cloudflare: true,
      memoryBanks: true,
      planMode: true,
      embeddedBrowser: true,
    },
    sovereignServices: Object.keys(SOVEREIGN_SERVICES),
  });
});

// Initialize MCP manager on startup
mcpManager.initialize().catch(err => {
  console.error('[MCPManager] Failed to initialize:', err);
});

// =============================================================================
// DATABASE SESSION PERSISTENCE FUNCTIONS
// =============================================================================

/**
 * Get or create a project in the database
 */
async function getOrCreateProject(projectPath) {
  const name = basename(projectPath);
  try {
    let project = await prisma.project.findUnique({ where: { path: projectPath } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name,
          path: projectPath,
          displayName: name,
        }
      });
    }
    return project;
  } catch (error) {
    console.error('Error getting/creating project:', error);
    return null;
  }
}

/**
 * Update project last accessed time
 */
async function updateProjectAccess(projectPath) {
  try {
    await prisma.project.update({
      where: { path: projectPath },
      data: { lastAccessed: new Date() }
    });
  } catch (error) {
    // Project might not exist yet, ignore
  }
}

/**
 * Save session state to database
 */
async function saveSessionState(projectPath, sessionName, terminalSize = null, workingDir = null) {
  try {
    const project = await getOrCreateProject(projectPath);
    if (!project) return null;

    const session = await prisma.session.upsert({
      where: {
        projectId_sessionName: {
          projectId: project.id,
          sessionName
        }
      },
      update: {
        status: 'ACTIVE',
        lastActiveAt: new Date(),
        terminalSize: terminalSize || undefined,
        workingDirectory: workingDir || undefined
      },
      create: {
        projectId: project.id,
        sessionName,
        status: 'ACTIVE',
        terminalSize,
        workingDirectory: workingDir
      }
    });

    await updateProjectAccess(projectPath);
    return session;
  } catch (error) {
    console.error('Error saving session state:', error);
    return null;
  }
}

/**
 * Get session state from database
 */
async function getSessionState(projectPath, sessionName) {
  try {
    const project = await prisma.project.findUnique({ where: { path: projectPath } });
    if (!project) return null;

    return await prisma.session.findUnique({
      where: {
        projectId_sessionName: {
          projectId: project.id,
          sessionName
        }
      }
    });
  } catch (error) {
    console.error('Error getting session state:', error);
    return null;
  }
}

/**
 * Mark session as disconnected
 */
async function markSessionDisconnected(projectPath, sessionName) {
  try {
    const project = await prisma.project.findUnique({ where: { path: projectPath } });
    if (!project) return;

    await prisma.session.updateMany({
      where: {
        projectId: project.id,
        sessionName
      },
      data: {
        status: 'DISCONNECTED',
        lastActiveAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error marking session disconnected:', error);
  }
}

/**
 * Get user settings from database
 */
async function getUserSettings() {
  try {
    let settings = await prisma.userSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { id: 'default' }
      });
    }
    return settings;
  } catch (error) {
    console.error('Error getting user settings:', error);
    return null;
  }
}

/**
 * Update user settings
 */
async function updateUserSettings(data) {
  try {
    return await prisma.userSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data }
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
}

// =============================================================================
// SECURITY: INPUT VALIDATION HELPERS
// =============================================================================

/**
 * Validate and sanitize a shpool session name
 * Only allows alphanumeric, dash, and underscore
 */
function validateSessionName(sessionName) {
  if (typeof sessionName !== 'string') return null;
  // Session names must start with sp- and only contain safe characters
  if (!/^sp-[a-zA-Z0-9_-]+$/.test(sessionName)) return null;
  if (sessionName.length > 100) return null;
  return sessionName;
}

/**
 * Validate and sanitize a systemd service name
 * Only allows alphanumeric, dash, underscore, and @
 */
function validateServiceName(serviceName) {
  if (typeof serviceName !== 'string') return null;
  // Service names only contain safe characters (no shell metacharacters)
  if (!/^[a-zA-Z0-9_@.-]+$/.test(serviceName)) return null;
  if (serviceName.length > 256) return null;
  return serviceName;
}

/**
 * Validate a port number
 * Must be a positive integer between 1 and 65535
 */
function validatePort(port) {
  const num = parseInt(port, 10);
  if (isNaN(num) || num < 1 || num > 65535) return null;
  return num;
}

/**
 * Validate a journalctl unit name
 */
function validateUnitName(unit) {
  if (typeof unit !== 'string') return null;
  if (!/^[a-zA-Z0-9_@.-]+$/.test(unit)) return null;
  if (unit.length > 256) return null;
  return unit;
}

// =============================================================================
// SHPOOL SESSION MANAGEMENT
// =============================================================================

/**
 * Generate a safe shpool session name from project path
 */
function getSessionName(projectPath) {
  const name = basename(projectPath);
  // Replace any non-alphanumeric characters with underscore
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sp-${safeName}`;
}

/**
 * Check if a shpool session exists
 */
function shpoolSessionExists(sessionName) {
  // Validate session name to prevent command injection
  const validName = validateSessionName(sessionName);
  if (!validName) {
    console.warn(`[SECURITY] Invalid session name rejected: ${sessionName}`);
    return false;
  }
  try {
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
    // validName is validated by validateSessionName() - only allows ^sp-[a-zA-Z0-9_-]+$
    const output = execSync('shpool list 2>/dev/null', { encoding: 'utf-8' });
    return output.includes(validName);
  } catch {
    return false;
  }
}

/**
 * List all shpool sessions managed by this app
 */
function listShpoolSessions() {
  try {
    const output = execSync('shpool list 2>/dev/null', { encoding: 'utf-8' });
    // Parse shpool list output: NAME\tSTARTED_AT\tSTATUS
    const lines = output.trim().split('\n').slice(1); // Skip header
    return lines
      .map(line => line.split('\t')[0])
      .filter(name => name && name.startsWith('sp-'));
  } catch {
    return [];
  }
}

/**
 * Create or attach to a shpool session with node-pty
 * Shpool provides session persistence with raw byte passthrough - no terminal
 * multiplexing overhead, native scrollback/clipboard work automatically
 * @param {string} projectPath - Path to the project directory
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Object} options - Additional options
 * @param {boolean} options.skipPermissions - Start Claude with --dangerously-skip-permissions
 * @param {string} options.aiSolution - AI solution to use: 'claude-code', 'code-puppy', 'hybrid'
 * @param {string} options.codePuppyModel - Default model for Code Puppy
 * @param {string} options.codePuppyProvider - Default provider for Code Puppy
 * @param {string} options.hybridMode - Hybrid mode configuration
 */
function createPtySession(projectPath, socket, options = {}) {
  const {
    skipPermissions = false,
    aiSolution = 'claude-code',
    codePuppyModel,
    codePuppyProvider,
    hybridMode = 'code-puppy-with-claude-tools'
  } = options;
  const sessionName = getSessionName(projectPath);
  const sessionExists = shpoolSessionExists(sessionName);

  // Shpool attach creates session if it doesn't exist, attaches if it does
  // No config file needed - shpool passes raw bytes through to xterm.js
  const shpoolArgs = ['attach', sessionName];

  const ptyProcess = spawn('shpool', shpoolArgs, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: projectPath,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8'
    }
  });

  // If this is a new session (not attaching to existing), initialize it
  if (!sessionExists) {
    // Small delay to let shpool fully start
    setTimeout(() => {
      // Clear screen and cd to project directory
      ptyProcess.write(`cd "${projectPath}" && clear\r`);
      // Start the appropriate AI CLI based on user preference
      setTimeout(() => {
        const aiCmd = buildAICommand({
          aiSolution,
          skipPermissions,
          codePuppyModel,
          codePuppyProvider,
          hybridMode,
          projectPath
        });
        ptyProcess.write(`${aiCmd}\r`);
      }, 100);
    }, 300);
  }

  return {
    pty: ptyProcess,
    sessionName,
    projectPath,
    aiSolution,
    isNew: !sessionExists
  };
}

/**
 * Build the AI command based on solution preference
 * @param {Object} config - Configuration options
 * @returns {string} - The command to run
 */
function buildAICommand(config) {
  const {
    aiSolution,
    skipPermissions,
    codePuppyModel,
    codePuppyProvider,
    hybridMode,
    projectPath
  } = config;

  // Path to uvx (may be in ~/.local/bin)
  const uvxPath = join(os.homedir(), '.local/bin/uvx');
  const uvxCmd = existsSync(uvxPath) ? uvxPath : 'uvx';

  switch (aiSolution) {
    case 'code-puppy': {
      // Run Code Puppy in interactive mode
      let cmd = `${uvxCmd} code-puppy -i`;
      if (codePuppyModel) {
        cmd += ` -m ${codePuppyModel}`;
      }
      return cmd;
    }

    case 'hybrid': {
      // Hybrid mode: Code Puppy with Claude Code's tools/MCP servers
      // This creates a wrapper that launches Code Puppy with access to Claude's MCP config
      if (hybridMode === 'code-puppy-with-claude-tools') {
        // Code Puppy as primary, but with Claude's MCP servers available
        // We'll copy Claude's MCP config to Code Puppy's config location
        const claudeMcpConfig = join(os.homedir(), '.claude', 'claude_desktop_config.json');
        const puppyMcpConfig = join(os.homedir(), '.code_puppy', 'mcp_servers.json');

        // Build command that syncs MCP config before launching
        let cmd = `${uvxCmd} code-puppy -i`;
        if (codePuppyModel) {
          cmd += ` -m ${codePuppyModel}`;
        }

        // If Claude MCP config exists, we can sync it (done on first run)
        if (existsSync(claudeMcpConfig)) {
          // The sync is handled by the Code Puppy dashboard or can be done manually
          console.log('[Hybrid Mode] Claude MCP config available for sync');
        }
        return cmd;
      } else {
        // claude-with-puppy-agents: Claude Code as primary, but can invoke Code Puppy agents
        // This runs Claude Code, but we could set up an MCP server for Code Puppy agents
        const claudeCmd = skipPermissions ? 'claude --dangerously-skip-permissions' : 'claude';
        return claudeCmd;
      }
    }

    case 'claude-code':
    default: {
      // Standard Claude Code CLI
      return skipPermissions ? 'claude --dangerously-skip-permissions' : 'claude';
    }
  }
}

/**
 * Get most recent modification time in a directory (recursive, limited depth)
 */
function getLastModifiedTime(dirPath, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return null;

  try {
    const entries = readdirSync(dirPath);
    let mostRecent = null;

    for (const entry of entries) {
      // Skip hidden files and common non-source directories
      if (entry.startsWith('.') || ['node_modules', 'dist', 'build', '.git', 'coverage', '__pycache__'].includes(entry)) {
        continue;
      }

      const fullPath = join(dirPath, entry);
      try {
        const stat = statSync(fullPath);
        const mtime = stat.mtime;

        if (!mostRecent || mtime > mostRecent) {
          mostRecent = mtime;
        }

        // Recurse into directories
        if (stat.isDirectory()) {
          const subMostRecent = getLastModifiedTime(fullPath, maxDepth, currentDepth + 1);
          if (subMostRecent && (!mostRecent || subMostRecent > mostRecent)) {
            mostRecent = subMostRecent;
          }
        }
      } catch {
        // Skip inaccessible files
      }
    }

    return mostRecent;
  } catch {
    return null;
  }
}

/**
 * Calculate project completion percentage (10 factors like projects-portfolio)
 */
function calculateProjectCompletion(projectPath) {
  const scores = {
    readme: 0,
    packageJson: 0,
    buildConfig: 0,
    tests: 0,
    documentation: 0,
    cicd: 0,
    license: 0,
    envExample: 0,
    sourceStructure: 0,
    claudeMd: 0
  };

  const weights = {
    readme: 12,
    packageJson: 10,
    buildConfig: 8,
    tests: 15,
    documentation: 10,
    cicd: 10,
    license: 5,
    envExample: 5,
    sourceStructure: 10,
    claudeMd: 15
  };

  const missing = [];

  try {
    // README quality
    const readmePath = join(projectPath, 'README.md');
    if (existsSync(readmePath)) {
      const content = readFileSync(readmePath, 'utf-8');
      const lines = content.split('\n').length;
      if (lines > 100) scores.readme = 1.0;
      else if (lines > 50) scores.readme = 0.8;
      else if (lines > 20) scores.readme = 0.6;
      else if (lines > 5) scores.readme = 0.4;
      else scores.readme = 0.2;
    } else {
      missing.push('README.md');
    }

    // Package.json completeness
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        let pkgScore = 0;
        if (pkg.name) pkgScore += 0.15;
        if (pkg.version) pkgScore += 0.1;
        if (pkg.description) pkgScore += 0.15;
        if (pkg.scripts && Object.keys(pkg.scripts).length > 0) pkgScore += 0.2;
        if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) pkgScore += 0.15;
        if (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0) pkgScore += 0.1;
        if (pkg.author || pkg.contributors) pkgScore += 0.1;
        if (pkg.license) pkgScore += 0.05;
        scores.packageJson = Math.min(pkgScore, 1.0);
      } catch {
        scores.packageJson = 0.3;
      }
    } else {
      // Check for other project types
      if (existsSync(join(projectPath, 'requirements.txt')) ||
          existsSync(join(projectPath, 'pyproject.toml')) ||
          existsSync(join(projectPath, 'Cargo.toml')) ||
          existsSync(join(projectPath, 'go.mod'))) {
        scores.packageJson = 0.8;
      } else {
        missing.push('package.json');
      }
    }

    // Build config
    const buildConfigs = ['vite.config.js', 'vite.config.ts', 'webpack.config.js', 'tsconfig.json',
                          'rollup.config.js', 'esbuild.config.js', 'next.config.js', 'next.config.mjs'];
    const hasBuildConfig = buildConfigs.some(f => existsSync(join(projectPath, f)));
    if (hasBuildConfig) {
      scores.buildConfig = 1.0;
    } else {
      missing.push('Build config');
    }

    // Tests
    const hasTestDir = existsSync(join(projectPath, 'tests')) ||
                       existsSync(join(projectPath, 'test')) ||
                       existsSync(join(projectPath, '__tests__')) ||
                       existsSync(join(projectPath, 'spec'));
    const testConfigs = ['jest.config.js', 'jest.config.ts', 'vitest.config.js', 'vitest.config.ts',
                         'pytest.ini', '.pytest.ini', 'karma.conf.js'];
    const hasTestConfig = testConfigs.some(f => existsSync(join(projectPath, f)));

    if (hasTestDir && hasTestConfig) scores.tests = 1.0;
    else if (hasTestDir) scores.tests = 0.7;
    else if (hasTestConfig) scores.tests = 0.4;
    else missing.push('Tests');

    // Documentation
    const hasDocsDir = existsSync(join(projectPath, 'docs')) || existsSync(join(projectPath, 'documentation'));
    let mdFileCount = 0;
    try {
      const entries = readdirSync(projectPath);
      mdFileCount = entries.filter(e => e.endsWith('.md') && e !== 'README.md' && e !== 'CLAUDE.md').length;
    } catch {}

    if (hasDocsDir && mdFileCount > 2) scores.documentation = 1.0;
    else if (hasDocsDir || mdFileCount > 2) scores.documentation = 0.7;
    else if (mdFileCount > 0) scores.documentation = 0.4;
    else missing.push('Documentation');

    // CI/CD
    const hasGithubWorkflows = existsSync(join(projectPath, '.github', 'workflows'));
    const hasGitlabCI = existsSync(join(projectPath, '.gitlab-ci.yml'));
    if (hasGithubWorkflows || hasGitlabCI) {
      scores.cicd = 1.0;
    } else {
      missing.push('CI/CD');
    }

    // License
    if (existsSync(join(projectPath, 'LICENSE')) || existsSync(join(projectPath, 'LICENSE.md'))) {
      scores.license = 1.0;
    } else {
      missing.push('LICENSE');
    }

    // Environment example
    if (existsSync(join(projectPath, '.env.example')) ||
        existsSync(join(projectPath, '.env.sample')) ||
        existsSync(join(projectPath, '.env.template'))) {
      scores.envExample = 1.0;
    } else {
      missing.push('.env.example');
    }

    // Source structure
    const srcDirs = ['src', 'lib', 'app', 'components', 'server', 'client', 'frontend', 'backend', 'pages'];
    const presentSrcDirs = srcDirs.filter(d => existsSync(join(projectPath, d)));
    if (presentSrcDirs.length >= 2) scores.sourceStructure = 1.0;
    else if (presentSrcDirs.length === 1) scores.sourceStructure = 0.7;
    else missing.push('Source structure (src/, lib/, etc.)');

    // CLAUDE.md (project-specific instructions)
    if (existsSync(join(projectPath, 'CLAUDE.md'))) {
      scores.claudeMd = 1.0;
    } else {
      missing.push('CLAUDE.md');
    }

  } catch (error) {
    console.error('Error calculating completion:', error);
  }

  // Calculate total percentage
  let totalScore = 0;
  let totalWeight = 0;
  for (const [key, score] of Object.entries(scores)) {
    totalScore += score * weights[key];
    totalWeight += weights[key];
  }

  const percentage = Math.round((totalScore / totalWeight) * 100);

  return {
    percentage,
    scores,
    weights,
    missing
  };
}

/**
 * Detect technologies used in a project
 */
function detectTechnologies(projectPath) {
  const technologies = [];

  try {
    // Check package.json for JS/TS projects
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Frameworks
      if (allDeps.react) technologies.push('React');
      if (allDeps.vue) technologies.push('Vue');
      if (allDeps.angular) technologies.push('Angular');
      if (allDeps.svelte) technologies.push('Svelte');
      if (allDeps.next) technologies.push('Next.js');
      if (allDeps.nuxt) technologies.push('Nuxt');

      // Backend
      if (allDeps.express) technologies.push('Express');
      if (allDeps.fastify) technologies.push('Fastify');
      if (allDeps.koa) technologies.push('Koa');
      if (allDeps.hono) technologies.push('Hono');

      // Languages
      if (allDeps.typescript || existsSync(join(projectPath, 'tsconfig.json'))) {
        technologies.push('TypeScript');
      } else {
        technologies.push('JavaScript');
      }

      // Database/ORM
      if (allDeps.prisma || allDeps['@prisma/client']) technologies.push('Prisma');
      if (allDeps.mongoose) technologies.push('MongoDB');
      if (allDeps.pg) technologies.push('PostgreSQL');
      if (allDeps.sqlite3 || allDeps['better-sqlite3']) technologies.push('SQLite');

      // Tools
      if (allDeps.vite) technologies.push('Vite');
      if (allDeps.webpack) technologies.push('Webpack');
      if (allDeps.tailwindcss) technologies.push('Tailwind');
      if (allDeps.electron) technologies.push('Electron');
      if (allDeps['socket.io']) technologies.push('Socket.IO');
    }

    // Python projects
    if (existsSync(join(projectPath, 'requirements.txt')) || existsSync(join(projectPath, 'pyproject.toml'))) {
      technologies.push('Python');
    }

    // Rust projects
    if (existsSync(join(projectPath, 'Cargo.toml'))) {
      technologies.push('Rust');
    }

    // Go projects
    if (existsSync(join(projectPath, 'go.mod'))) {
      technologies.push('Go');
    }

    // Docker
    if (existsSync(join(projectPath, 'Dockerfile')) || existsSync(join(projectPath, 'docker-compose.yml'))) {
      technologies.push('Docker');
    }

  } catch {
    // Ignore errors
  }

  return technologies;
}

/**
 * Get project list from PROJECTS_DIR
 */
async function getProjects() {
  if (!existsSync(PROJECTS_DIR)) {
    console.error(`Projects directory not found: ${PROJECTS_DIR}`);
    return [];
  }

  try {
    const entries = readdirSync(PROJECTS_DIR);
    const projects = entries
      .map(name => {
        const fullPath = join(PROJECTS_DIR, name);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory() && !name.startsWith('.')) {
            const sessionName = getSessionName(fullPath);
            const lastModified = getLastModifiedTime(fullPath);
            return {
              id: name,
              name: name,
              path: fullPath,
              hasActiveSession: shpoolSessionExists(sessionName),
              sessionName,
              lastModified: lastModified ? lastModified.toISOString() : null
            };
          }
        } catch {
          // Skip inaccessible directories
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Fetch skipPermissions and tags from database for each project
    const projectPaths = projects.map(p => p.path);
    const dbProjects = await prisma.project.findMany({
      where: { path: { in: projectPaths } },
      select: {
        path: true,
        skipPermissions: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Create a map for quick lookup
    const dbProjectMap = new Map(dbProjects.map(p => [p.path, {
      skipPermissions: p.skipPermissions,
      tags: p.tags.map(t => t.tag)
    }]));

    // Merge settings and tags into projects
    const projectsWithSettings = projects.map(p => {
      const dbData = dbProjectMap.get(p.path);
      return {
        ...p,
        skipPermissions: dbData?.skipPermissions || false,
        tags: dbData?.tags || []
      };
    });

    return projectsWithSettings;
  } catch (error) {
    console.error('Error reading projects directory:', error);
    return [];
  }
}

// API Routes
app.get('/api/projects', async (req, res) => {
  const projects = await getProjects();
  res.json(projects);
});

// Get project stats for info popup
app.get('/api/admin/project-stats', async (req, res) => {
  const { path: projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'Project path required' });
  }

  try {
    const name = basename(projectPath);
    const stats = { name, path: projectPath };

    // Check for CLAUDE.md
    stats.hasClaudeMd = existsSync(join(projectPath, 'CLAUDE.md'));

    // Get git info
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const lastCommit = execSync('git log -1 --oneline', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      stats.git = { branch, lastCommit };
    } catch {
      // Not a git repo or error
    }

    // Get file count (non-hidden, excluding node_modules)
    try {
      const countOutput = execSync(
        'find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".*" | wc -l',
        { cwd: projectPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      stats.fileCount = parseInt(countOutput, 10) || 0;
    } catch {
      stats.fileCount = 0;
    }

    // Get directory size
    try {
      const sizeOutput = execSync('du -sh . 2>/dev/null | cut -f1', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      stats.size = sizeOutput;
    } catch {
      stats.size = 'Unknown';
    }

    res.json(stats);
  } catch (error) {
    console.error('Error getting project stats:', error);
    res.status(500).json({ error: 'Failed to get project stats' });
  }
});

// Create a new project directory
app.post('/api/projects', async (req, res) => {
  try {
    const { name, template, skipPermissions = false, port } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Validate project name (alphanumeric, hyphens, underscores only)
    const validNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validNameRegex.test(name)) {
      return res.status(400).json({
        error: 'Invalid project name. Use only letters, numbers, hyphens, and underscores.'
      });
    }

    const projectPath = join(PROJECTS_DIR, name);

    // Check if project already exists
    if (existsSync(projectPath)) {
      return res.status(409).json({ error: 'A project with this name already exists' });
    }

    // Create the project directory
    mkdirSync(projectPath, { recursive: true });

    // Initialize with template if specified
    if (template === 'git') {
      // Initialize git repo (execSync already imported at top of file)
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });
    }

    // Generate comprehensive CLAUDE.md from template
    const today = new Date().toISOString().split('T')[0];
    const portLine = port ? `**Port:** ${port}` : '**Port:** [Frontend Port] (Frontend), [Backend Port] (API)';
    const claudeMdContent = `# CLAUDE.md - ${name}

**Project:** ${name}
**Version:** 1.0.0
**Last Updated:** ${today}
${portLine}

---

## Project Overview

[2-3 sentence description of what this project does and its primary goal.]

### Key Features

- **[Feature 1]**: [Brief description]
- **[Feature 2]**: [Brief description]
- **[Feature 3]**: [Brief description]

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | [e.g., React 18, Vite, Tailwind CSS] |
| Backend | [e.g., Node.js, Express/Fastify] |
| Database | [e.g., PostgreSQL, Prisma ORM] |
| Auth | [e.g., Authentik SSO, JWT] |
| Deployment | [e.g., Docker, PM2] |

---

## Project Structure

\`\`\`
${name}/
├── server/
│   ├── index.js              # Main server entry
│   ├── routes/               # API route handlers
│   └── services/             # Business logic
├── src/
│   ├── App.jsx               # Main React app
│   ├── components/           # React components
│   └── hooks/                # Custom React hooks
├── prisma/
│   └── schema.prisma         # Database schema
├── .env                      # Environment config
└── package.json              # Dependencies
\`\`\`

---

## Development Commands

\`\`\`bash
# Install dependencies
npm install

# Development (frontend + backend)
npm run dev

# Production build
npm run build
npm start

# Database
npx prisma db push      # Apply schema
npx prisma generate     # Generate client
npx prisma studio       # Database GUI

# Testing
npm test                # Run tests
npm run test:coverage   # Coverage report
\`\`\`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| \`PORT\` | 3000 | Backend API server port |
| \`DATABASE_URL\` | - | PostgreSQL connection string |
| \`NODE_ENV\` | development | Environment mode |

---

## Project-Specific Rules

1. **[Rule 1]**: [Description of project-specific constraint]
2. **[Rule 2]**: [Description]
3. **[Rule 3]**: [Description]

---

## API Endpoints

### Core
- \`GET /api/health\` - Health check endpoint
- \`GET /api/[resource]\` - [Description]
- \`POST /api/[resource]\` - [Description]

---

## Lifecycle Commands

### Quality & Security (Run before commits)
\`\`\`bash
# Security scan
bash ~/Projects/agents/lifecycle/AGENT-018-SECURITY.sh scan .

# Quality gate (tests + coverage)
bash ~/Projects/agents/lifecycle/AGENT-019-QUALITY-GATE.sh all .

# Performance analysis
bash ~/Projects/agents/lifecycle/AGENT-022-PERFORMANCE.sh analyze .

# Setup pre-commit hooks (run once)
bash ~/Projects/agents/lifecycle/AGENT-023-PRECOMMIT.sh all .
\`\`\`

### Monitoring & Observability
\`\`\`bash
# System health check
bash ~/Projects/agents/lifecycle/AGENT-020-OBSERVABILITY.sh monitor

# Dependency check
bash ~/Projects/agents/lifecycle/AGENT-021-DEPENDENCY.sh check .
\`\`\`

### CI/CD Pipeline
\`\`\`bash
# Full build pipeline
bash ~/Projects/agents/lifecycle/AGENT-017-CI-CD.sh build .

# Deploy to staging
bash ~/Projects/agents/lifecycle/AGENT-017-CI-CD.sh deploy . staging
\`\`\`

---

## Notes for AI Agents

### Project-Specific Patterns
- Follow TypeScript strict mode
- Use Zod for input validation
- Reference \`~/Projects/agents/docs/\` for detailed standards
- Run security scan before every commit
- Maintain 80%+ test coverage

### Known Gotchas
- [Issue 1 to watch out for]
- [Issue 2]

---

Created: ${today}
Version: 1.0.0
Template: PROJECT-CLAUDE-TEMPLATE.md v1.0.0
`;

    writeFileSync(join(projectPath, 'CLAUDE.md'), claudeMdContent);

    // Save project to database with settings
    const dbProject = await prisma.project.create({
      data: {
        name,
        path: projectPath,
        displayName: name,
        skipPermissions: Boolean(skipPermissions),
      }
    });

    // Get the created project info
    const sessionName = getSessionName(projectPath);
    const project = {
      id: dbProject.id,
      name: name,
      path: projectPath,
      hasActiveSession: false,
      sessionName,
      skipPermissions: dbProject.skipPermissions,
      lastModified: new Date().toISOString()
    };

    console.log(`[API] Created new project: ${name} at ${projectPath} (skipPermissions: ${skipPermissions})`);

    res.status(201).json(project);
  } catch (error) {
    console.error('[API] Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project settings
app.patch('/api/projects/:projectName/settings', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { skipPermissions } = req.body;
    const projectPath = join(PROJECTS_DIR, projectName);

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Find or create the project in database
    let project = await prisma.project.findUnique({ where: { path: projectPath } });

    if (!project) {
      // Create project entry if it doesn't exist
      project = await prisma.project.create({
        data: {
          name: projectName,
          path: projectPath,
          displayName: projectName,
          skipPermissions: Boolean(skipPermissions),
        }
      });
    } else {
      // Update existing project
      project = await prisma.project.update({
        where: { path: projectPath },
        data: {
          skipPermissions: Boolean(skipPermissions),
        }
      });
    }

    console.log(`[API] Updated project settings for ${projectName}: skipPermissions=${skipPermissions}`);

    res.json({
      success: true,
      project: {
        name: project.name,
        path: project.path,
        skipPermissions: project.skipPermissions,
      }
    });
  } catch (error) {
    console.error('[API] Error updating project settings:', error);
    res.status(500).json({ error: 'Failed to update project settings' });
  }
});

// Get project settings
app.get('/api/projects/:projectName/settings', async (req, res) => {
  try {
    const { projectName } = req.params;
    const projectPath = join(PROJECTS_DIR, projectName);

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = await prisma.project.findUnique({ where: { path: projectPath } });

    res.json({
      name: projectName,
      path: projectPath,
      skipPermissions: project?.skipPermissions || false,
    });
  } catch (error) {
    console.error('[API] Error getting project settings:', error);
    res.status(500).json({ error: 'Failed to get project settings' });
  }
});

app.get('/api/sessions', (req, res) => {
  const activeSessions = listShpoolSessions();
  res.json(activeSessions);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    projectsDir: PROJECTS_DIR,
    activeSessions: sessions.size
  });
});

// Test endpoint to send OSC 52 directly
app.get('/api/test-osc52', (req, res) => {
  const text = req.query.text || 'ClipboardTest';
  const b64 = Buffer.from(text).toString('base64');
  const osc52 = `\x1b]52;c;${b64}\x07`;
  io.emit('terminal-output', osc52);
  res.json({ sent: true, text });
});

// =============================================================================
// ADMIN API ROUTES
// =============================================================================

/**
 * Get session history from history.jsonl
 */
app.get('/api/admin/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const projectFilter = req.query.project || null;

    if (!existsSync(CLAUDE_HISTORY_FILE)) {
      return res.json({ history: [], total: 0, todayCount: 0, weekCount: 0, totalCount: 0 });
    }

    const entries = [];
    const fileStream = createReadStream(CLAUDE_HISTORY_FILE);
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line);
          if (!projectFilter || entry.project?.includes(projectFilter)) {
            entries.push(entry);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Calculate counts
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const todayCount = entries.filter(e => e.timestamp && e.timestamp > oneDayAgo).length;
    const weekCount = entries.filter(e => e.timestamp && e.timestamp > oneWeekAgo).length;
    const totalCount = entries.length;

    // Apply pagination
    const paginated = entries.slice(offset, offset + limit);

    res.json({
      history: paginated,
      entries: paginated, // Keep for backwards compatibility
      total: entries.length,
      todayCount,
      weekCount,
      totalCount,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error reading history:', error);
    res.status(500).json({ error: 'Failed to read history' });
  }
});

/**
 * Get session details for a specific project
 */
app.get('/api/admin/sessions/:projectName', (req, res) => {
  try {
    const projectName = req.params.projectName;
    const projectDir = join(CLAUDE_DIR, 'projects', `-home-thornburywn-Projects-${projectName}`);

    if (!existsSync(projectDir)) {
      return res.json({ sessions: [] });
    }

    const files = readdirSync(projectDir);
    const sessions = files.map(file => {
      const filePath = join(projectDir, file);
      try {
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        return {
          id: file,
          modified: stat.mtime,
          size: stat.size,
          preview: content.substring(0, 500)
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ sessions });
  } catch (error) {
    console.error('Error reading sessions:', error);
    res.status(500).json({ error: 'Failed to read sessions' });
  }
});

/**
 * Get MCP server configuration
 */
app.get('/api/admin/mcp', (req, res) => {
  try {
    let settings = {};
    let localSettings = {};

    if (existsSync(CLAUDE_SETTINGS_FILE)) {
      settings = JSON.parse(readFileSync(CLAUDE_SETTINGS_FILE, 'utf-8'));
    }

    if (existsSync(CLAUDE_SETTINGS_LOCAL_FILE)) {
      localSettings = JSON.parse(readFileSync(CLAUDE_SETTINGS_LOCAL_FILE, 'utf-8'));
    }

    res.json({
      settings,
      localSettings,
      mcpServers: settings.mcpServers || {},
      permissions: localSettings.permissions || {}
    });
  } catch (error) {
    console.error('Error reading MCP config:', error);
    res.status(500).json({ error: 'Failed to read MCP configuration' });
  }
});

/**
 * Update MCP server configuration
 */
app.put('/api/admin/mcp', (req, res) => {
  try {
    const { mcpServers, settings } = req.body;

    if (mcpServers !== undefined) {
      let currentSettings = {};
      if (existsSync(CLAUDE_SETTINGS_FILE)) {
        currentSettings = JSON.parse(readFileSync(CLAUDE_SETTINGS_FILE, 'utf-8'));
      }
      currentSettings.mcpServers = mcpServers;
      writeFileSync(CLAUDE_SETTINGS_FILE, JSON.stringify(currentSettings, null, 2));
    }

    if (settings !== undefined) {
      writeFileSync(CLAUDE_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating MCP config:', error);
    res.status(500).json({ error: 'Failed to update MCP configuration' });
  }
});

/**
 * Get CLAUDE.md for a project (project-specific instructions)
 */
app.get('/api/admin/claude-md/:projectName', (req, res) => {
  try {
    const projectName = req.params.projectName;
    const projectPath = join(PROJECTS_DIR, projectName);
    const claudeMdPath = join(projectPath, 'CLAUDE.md');

    if (!existsSync(claudeMdPath)) {
      return res.json({
        exists: false,
        content: '',
        projectPath
      });
    }

    const content = readFileSync(claudeMdPath, 'utf-8');
    const stat = statSync(claudeMdPath);

    res.json({
      exists: true,
      content,
      modified: stat.mtime,
      size: stat.size,
      projectPath
    });
  } catch (error) {
    console.error('Error reading CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to read CLAUDE.md' });
  }
});

/**
 * Update CLAUDE.md for a project
 */
app.put('/api/admin/claude-md/:projectName', (req, res) => {
  try {
    const projectName = req.params.projectName;
    const { content } = req.body;
    const projectPath = join(PROJECTS_DIR, projectName);
    const claudeMdPath = join(projectPath, 'CLAUDE.md');

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    writeFileSync(claudeMdPath, content);
    const stat = statSync(claudeMdPath);

    res.json({
      success: true,
      modified: stat.mtime,
      size: stat.size
    });
  } catch (error) {
    console.error('Error writing CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to write CLAUDE.md' });
  }
});

/**
 * Update port in CLAUDE.md for a project
 * Updates or adds the Port field in the CLAUDE.md header
 */
app.put('/api/admin/claude-md/:projectName/port', (req, res) => {
  try {
    const projectName = req.params.projectName;
    const { port } = req.body;
    const projectPath = join(PROJECTS_DIR, projectName);
    const claudeMdPath = join(projectPath, 'CLAUDE.md');

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({ error: 'Invalid port number' });
    }

    let content = '';
    if (existsSync(claudeMdPath)) {
      content = readFileSync(claudeMdPath, 'utf-8');
    } else {
      // Create basic CLAUDE.md if it doesn't exist
      content = `# CLAUDE.md - ${projectName}

**Project:** ${projectName}
**Port:** ${portNum}

---

## Project Overview

Add project description here.
`;
      writeFileSync(claudeMdPath, content);
      return res.json({
        success: true,
        port: portNum,
        created: true
      });
    }

    // Check if Port line exists and update it
    const portRegex = /^\*\*Port:\*\*\s*\d+/m;
    if (portRegex.test(content)) {
      content = content.replace(portRegex, `**Port:** ${portNum}`);
    } else {
      // Try to add Port after Version or Project line
      const versionRegex = /^(\*\*Version:\*\*.*)$/m;
      const projectRegex = /^(\*\*Project:\*\*.*)$/m;

      if (versionRegex.test(content)) {
        content = content.replace(versionRegex, `$1\n**Port:** ${portNum}`);
      } else if (projectRegex.test(content)) {
        content = content.replace(projectRegex, `$1\n**Port:** ${portNum}`);
      } else {
        // Add at the top after the first line
        const lines = content.split('\n');
        lines.splice(1, 0, `**Port:** ${portNum}`);
        content = lines.join('\n');
      }
    }

    writeFileSync(claudeMdPath, content);

    res.json({
      success: true,
      port: portNum,
      updated: true
    });
  } catch (error) {
    console.error('Error updating port in CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to update port in CLAUDE.md' });
  }
});

/**
 * Restart a project by killing and restarting its session
 */
app.post('/api/projects/:projectName/restart', async (req, res) => {
  try {
    const projectName = req.params.projectName;

    // Validate project name to prevent command injection
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (safeProjectName !== projectName) {
      console.warn(`[SECURITY] Project name sanitized: ${projectName} -> ${safeProjectName}`);
    }

    const projectPath = join(PROJECTS_DIR, safeProjectName);

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[Restart] Restarting project: ${safeProjectName}`);

    // Find the session for this project - use safe name
    const sessionName = `project-${safeProjectName}`;

    // Check if shpool session exists and kill it
    try {
      const { stdout: listOutput } = await execAsync('shpool list 2>/dev/null || echo ""');
      if (listOutput.includes(sessionName)) {
        await execAsync(`shpool kill "${sessionName}" 2>/dev/null`);
        console.log(`[Restart] Killed existing session: ${sessionName}`);
        // Small delay to ensure session is fully killed
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch {
      // Session might not exist
    }

    // Look for common start scripts
    const startCommands = [
      'npm run dev',
      'npm start',
      'yarn dev',
      'yarn start',
      'pnpm dev',
      'pnpm start'
    ];

    // Check package.json for scripts
    let startCmd = null;
    const packageJsonPath = join(projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.scripts?.dev) {
          startCmd = 'npm run dev';
        } else if (packageJson.scripts?.start) {
          startCmd = 'npm start';
        }
      } catch {}
    }

    // If we found a start command, run it in the background
    // Note: This uses nohup for background processes since shpool is for interactive sessions
    if (startCmd) {
      const logFile = join(projectPath, '.console-web-restart.log');
      await execAsync(`cd "${projectPath}" && nohup ${startCmd} > "${logFile}" 2>&1 &`);
      console.log(`[Restart] Started background process with: ${startCmd}`);

      res.json({
        success: true,
        projectName,
        sessionName,
        command: startCmd,
        restarted: true
      });
    } else {
      // Just inform that the session was killed but no auto-start
      res.json({
        success: true,
        projectName,
        sessionName,
        killed: hasSession,
        restarted: false,
        message: 'Session killed but no start script found to restart'
      });
    }
  } catch (error) {
    console.error('Error restarting project:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get global CLAUDE.md
 */
app.get('/api/admin/claude-md-global', (req, res) => {
  try {
    const claudeMdPath = join(CLAUDE_DIR, 'CLAUDE.md');

    if (!existsSync(claudeMdPath)) {
      return res.json({ exists: false, content: '' });
    }

    const content = readFileSync(claudeMdPath, 'utf-8');
    const stat = statSync(claudeMdPath);

    res.json({
      exists: true,
      content,
      modified: stat.mtime,
      size: stat.size
    });
  } catch (error) {
    console.error('Error reading global CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to read global CLAUDE.md' });
  }
});

/**
 * Update global CLAUDE.md
 */
app.put('/api/admin/claude-md-global', (req, res) => {
  try {
    const { content } = req.body;
    const claudeMdPath = join(CLAUDE_DIR, 'CLAUDE.md');

    writeFileSync(claudeMdPath, content);
    const stat = statSync(claudeMdPath);

    res.json({
      success: true,
      modified: stat.mtime,
      size: stat.size
    });
  } catch (error) {
    console.error('Error writing global CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to write global CLAUDE.md' });
  }
});

/**
 * Get user settings from database
 */
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getUserSettings();
    res.json(settings || {});
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
});

/**
 * Update user settings
 */
app.put('/api/settings', async (req, res) => {
  try {
    const { appName, theme, sidebarWidth, rightSidebarCollapsed, expandedPanels, autoReconnect, keepSessionsAlive, sessionTimeout } = req.body;
    const settings = await updateUserSettings({
      ...(appName !== undefined && { appName }),
      ...(theme !== undefined && { theme }),
      ...(sidebarWidth !== undefined && { sidebarWidth }),
      ...(rightSidebarCollapsed !== undefined && { rightSidebarCollapsed }),
      ...(expandedPanels !== undefined && { expandedPanels }),
      ...(autoReconnect !== undefined && { autoReconnect }),
      ...(keepSessionsAlive !== undefined && { keepSessionsAlive }),
      ...(sessionTimeout !== undefined && { sessionTimeout }),
    });
    res.json(settings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

/**
 * Get system health and statistics
 */
app.get('/api/admin/system', (req, res) => {
  try {
    // System info
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    const loadAvg = os.loadavg();

    // Calculate CPU usage from /proc/stat using delta between readings
    let cpuUsage = 0;
    try {
      // Read CPU stats from /proc/stat
      const stat = readFileSync('/proc/stat', 'utf-8');
      const cpuLine = stat.split('\n')[0]; // "cpu  user nice system idle iowait irq softirq"
      const parts = cpuLine.split(/\s+/).slice(1).map(Number);
      const idle = parts[3] + (parts[4] || 0); // idle + iowait
      const total = parts.reduce((a, b) => a + b, 0);

      // Calculate CPU usage from delta between readings
      if (prevCpuStats) {
        const deltaIdle = idle - prevCpuStats.idle;
        const deltaTotal = total - prevCpuStats.total;
        if (deltaTotal > 0) {
          const deltaBusy = deltaTotal - deltaIdle;
          cpuUsage = (deltaBusy / deltaTotal) * 100;
        }
      } else {
        // First reading - use load average as approximation
        cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
      }

      // Store current stats for next delta calculation
      prevCpuStats = { idle, total };

      // Clamp to valid range
      cpuUsage = Math.max(0, Math.min(100, cpuUsage));

      // If that gives unrealistic values, fall back to load average
      if (isNaN(cpuUsage)) {
        cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
      }
    } catch {
      cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
    }

    // Disk usage for projects directory
    let diskUsage = null;
    try {
      const dfOutput = execSync(`df -B1 "${PROJECTS_DIR}" | tail -1`, { encoding: 'utf-8' });
      const parts = dfOutput.trim().split(/\s+/);
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const available = parseInt(parts[3], 10);
      const usedPercent = (used / total) * 100;

      diskUsage = {
        filesystem: parts[0],
        total,
        used,
        available,
        usedPercent
      };
    } catch {
      // Ignore disk usage errors
    }

    // Active shpool sessions
    const shpoolSessions = listShpoolSessions();

    // Process info
    const processInfo = {
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version
    };

    // Claude directory stats
    let claudeStats = null;
    try {
      const historySize = existsSync(CLAUDE_HISTORY_FILE)
        ? statSync(CLAUDE_HISTORY_FILE).size
        : 0;

      const projectsCount = existsSync(join(CLAUDE_DIR, 'projects'))
        ? readdirSync(join(CLAUDE_DIR, 'projects')).length
        : 0;

      claudeStats = {
        historySize,
        projectsCount,
        claudeDir: CLAUDE_DIR
      };
    } catch {
      // Ignore stats errors
    }

    // Response format expected by SystemStats component
    res.json({
      // New flat format for SystemStats component
      cpu: {
        usage: cpuUsage,
        model: cpus[0]?.model,
        count: cpus.length
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usedPercent: (usedMem / totalMem) * 100
      },
      disk: diskUsage ? {
        total: diskUsage.total,
        used: diskUsage.used,
        available: diskUsage.available,
        usedPercent: diskUsage.usedPercent
      } : null,
      uptime,
      loadAvg,
      // Legacy format for backwards compatibility
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model,
        totalMemory: totalMem,
        freeMemory: freeMem,
        memoryUsedPercent: ((totalMem - freeMem) / totalMem * 100).toFixed(1),
        uptime
      },
      process: processInfo,
      claude: claudeStats,
      sessions: {
        active: sessions.size,
        shpool: shpoolSessions,
        connected: socketProjects.size
      }
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ error: 'Failed to get system information' });
  }
});

// =============================================================================
// PORT MANAGEMENT API ROUTES
// =============================================================================

/**
 * Parse PORTS.md file to get registered ports
 */
function parsePortsMdFile() {
  const registered = new Map();
  const portsFile = join(os.homedir(), 'PORTS.md');

  try {
    if (!existsSync(portsFile)) return registered;

    const content = readFileSync(portsFile, 'utf-8');
    const lines = content.split('\n');

    // Parse table rows looking for port entries
    // Format: │  PORT  │  SERVICE  │  TYPE  │  STATUS  │
    // Or: | Service | Port | ... |
    for (const line of lines) {
      // Match various table formats
      const portMatch = line.match(/[│|]\s*(\d{4,5})\s*[│|]\s*([^│|]+)/);
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        const service = portMatch[2].trim();
        if (port >= 1024 && port <= 65535) {
          registered.set(port, { registeredName: service });
        }
      }
      // Also match format: | service | PORT | project |
      const altMatch = line.match(/[│|]\s*([^│|]+)\s*[│|]\s*(\d{4,5})\s*[│|]/);
      if (altMatch) {
        const service = altMatch[1].trim();
        const port = parseInt(altMatch[2], 10);
        if (port >= 1024 && port <= 65535 && !registered.has(port)) {
          registered.set(port, { registeredName: service });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing PORTS.md:', error);
  }

  return registered;
}

/**
 * Parse port information from various system commands
 */
function getActivePorts() {
  const ports = [];
  const portRanges = {
    webApps: { start: 3000, end: 3999 },
    devServers: { start: 5000, end: 5999 },
    apis: { start: 8000, end: 8999 },
    databases: { start: 9000, end: 9999 },
  };

  // Load registered ports from PORTS.md
  const registeredPorts = parsePortsMdFile();

  try {
    // Use ss or netstat to get listening ports
    let output;
    try {
      output = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
      });
    } catch {
      return { ports: [], suggestedPort: 5000 };
    }

    const lines = output.split('\n');

    for (const line of lines) {
      // Parse ss output format: LISTEN 0 128 *:5275 *:* users:(("node",pid=12345,fd=19))
      // Parse netstat format: tcp 0 0 0.0.0.0:5275 0.0.0.0:* LISTEN 12345/node

      const portMatch = line.match(/:(\d+)\s/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);

      // Only include ports in our monitored ranges
      const inRange = Object.values(portRanges).some(
        (range) => port >= range.start && port <= range.end
      );
      if (!inRange) continue;

      // Try to extract process name
      let process = 'unknown';
      let project = null;
      let killable = true;

      // ss format: users:(("node",pid=12345,fd=19))
      const ssMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
      if (ssMatch) {
        process = ssMatch[1];
      }

      // netstat format: 12345/node
      const netstatMatch = line.match(/(\d+)\/(\S+)/);
      if (netstatMatch) {
        process = netstatMatch[2];
      }

      // Try to determine project from process
      if (process === 'node' || process === 'vite') {
        // Check if we can associate with a project
        try {
          const cwdOutput = execSync(
            `ls -l /proc/$(pgrep -f "port.*${port}" | head -1)/cwd 2>/dev/null || echo ""`,
            { encoding: 'utf-8' }
          );
          const cwdMatch = cwdOutput.match(/-> (.+)/);
          if (cwdMatch && cwdMatch[1].includes(PROJECTS_DIR)) {
            project = basename(cwdMatch[1]);
          }
        } catch {
          // Ignore - we just won't have project info
        }
      }

      // System services shouldn't be killable
      if (['nginx', 'apache2', 'httpd', 'postgres', 'mysql'].includes(process)) {
        killable = false;
      }

      // Check if port is registered in PORTS.md
      const registered = registeredPorts.get(port);

      ports.push({
        port,
        process,
        project,
        killable,
        registeredName: registered?.registeredName || null,
        isRegistered: !!registered,
      });
    }
  } catch (error) {
    console.error('Error getting ports:', error);
  }

  // Sort by port number
  ports.sort((a, b) => a.port - b.port);

  // Calculate suggested port (first available in dev server range)
  const usedPorts = new Set(ports.map((p) => p.port));
  let suggestedPort = 5000;
  while (usedPorts.has(suggestedPort) && suggestedPort < 6000) {
    suggestedPort++;
  }

  return { ports, suggestedPort };
}

// =============================================================================
// DOCKER MANAGEMENT API ROUTES
// =============================================================================

/**
 * Get Docker system info and stats
 */
app.get('/api/docker/system', async (req, res) => {
  try {
    const [info, df] = await Promise.all([
      docker.info(),
      docker.df(),
    ]);

    res.json({
      containers: {
        total: info.Containers,
        running: info.ContainersRunning,
        paused: info.ContainersPaused,
        stopped: info.ContainersStopped,
      },
      images: info.Images,
      serverVersion: info.ServerVersion,
      operatingSystem: info.OperatingSystem,
      architecture: info.Architecture,
      cpus: info.NCPU,
      memory: info.MemTotal,
      diskUsage: {
        images: df.Images?.reduce((acc, img) => acc + (img.Size || 0), 0) || 0,
        containers: df.Containers?.reduce((acc, c) => acc + (c.SizeRw || 0), 0) || 0,
        volumes: df.Volumes?.reduce((acc, v) => acc + (v.UsageData?.Size || 0), 0) || 0,
      },
    });
  } catch (error) {
    console.error('Docker system info error:', error);
    res.status(500).json({ error: 'Failed to get Docker system info', details: error.message });
  }
});

/**
 * List all containers
 */
app.get('/api/docker/containers', async (req, res) => {
  try {
    const all = req.query.all === 'true';
    const containers = await docker.listContainers({ all });

    const result = containers.map(c => ({
      id: c.Id.substring(0, 12),
      fullId: c.Id,
      name: c.Names[0]?.replace(/^\//, '') || 'unnamed',
      image: c.Image,
      imageId: c.ImageID?.substring(7, 19),
      state: c.State,
      status: c.Status,
      created: c.Created,
      ports: c.Ports?.map(p => ({
        private: p.PrivatePort,
        public: p.PublicPort,
        type: p.Type,
      })) || [],
      labels: c.Labels || {},
    }));

    res.json(result);
  } catch (error) {
    console.error('Docker containers list error:', error);
    res.status(500).json({ error: 'Failed to list containers', details: error.message });
  }
});

/**
 * Get container details
 */
app.get('/api/docker/containers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const info = await container.inspect();

    res.json({
      id: info.Id.substring(0, 12),
      fullId: info.Id,
      name: info.Name.replace(/^\//, ''),
      image: info.Config.Image,
      state: info.State,
      created: info.Created,
      restartCount: info.RestartCount,
      platform: info.Platform,
      mounts: info.Mounts,
      config: {
        env: info.Config.Env,
        cmd: info.Config.Cmd,
        workingDir: info.Config.WorkingDir,
        exposedPorts: Object.keys(info.Config.ExposedPorts || {}),
      },
      networkSettings: {
        networks: Object.keys(info.NetworkSettings.Networks || {}),
        ipAddress: info.NetworkSettings.IPAddress,
        ports: info.NetworkSettings.Ports,
      },
    });
  } catch (error) {
    console.error('Docker container info error:', error);
    res.status(500).json({ error: 'Failed to get container info', details: error.message });
  }
});

/**
 * Container actions (start, stop, restart, remove, pause, unpause)
 */
app.post('/api/docker/containers/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const { force, removeVolumes } = req.body;

  try {
    const container = docker.getContainer(id);

    switch (action) {
      case 'start':
        await container.start();
        break;
      case 'stop':
        await container.stop();
        break;
      case 'restart':
        await container.restart();
        break;
      case 'pause':
        await container.pause();
        break;
      case 'unpause':
        await container.unpause();
        break;
      case 'remove':
        await container.remove({ force: force || false, v: removeVolumes || false });
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    res.json({ success: true, action, containerId: id });
  } catch (error) {
    console.error(`Docker container ${action} error:`, error);
    res.status(500).json({ error: `Failed to ${action} container`, details: error.message });
  }
});

/**
 * Get container logs
 */
app.get('/api/docker/containers/:id/logs', async (req, res) => {
  try {
    const { tail = 100, timestamps = 'true' } = req.query;
    const container = docker.getContainer(req.params.id);

    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: parseInt(tail),
      timestamps: timestamps === 'true',
    });

    // Process logs (dockerode returns Buffer)
    const logLines = logs.toString('utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Docker logs have a header byte we need to skip
        return line.length > 8 ? line.substring(8) : line;
      });

    res.json({ logs: logLines });
  } catch (error) {
    console.error('Docker logs error:', error);
    res.status(500).json({ error: 'Failed to get container logs', details: error.message });
  }
});

/**
 * Get container stats (one-shot)
 */
app.get('/api/docker/containers/:id/stats', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const stats = await container.stats({ stream: false });

    // Calculate CPU percentage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

    // Calculate memory percentage
    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;
    const memPercent = (memUsage / memLimit) * 100;

    res.json({
      cpu: {
        percent: cpuPercent.toFixed(2),
        totalUsage: stats.cpu_stats.cpu_usage.total_usage,
      },
      memory: {
        usage: memUsage,
        limit: memLimit,
        percent: memPercent.toFixed(2),
      },
      network: stats.networks || {},
      blockIO: {
        read: stats.blkio_stats?.io_service_bytes_recursive?.find(s => s.op === 'read')?.value || 0,
        write: stats.blkio_stats?.io_service_bytes_recursive?.find(s => s.op === 'write')?.value || 0,
      },
    });
  } catch (error) {
    console.error('Docker stats error:', error);
    res.status(500).json({ error: 'Failed to get container stats', details: error.message });
  }
});

/**
 * List images
 */
app.get('/api/docker/images', async (req, res) => {
  try {
    const images = await docker.listImages();

    const result = images.map(img => ({
      id: img.Id.substring(7, 19),
      fullId: img.Id,
      tags: img.RepoTags || ['<none>:<none>'],
      size: img.Size,
      created: img.Created,
      containers: img.Containers,
    }));

    res.json(result);
  } catch (error) {
    console.error('Docker images list error:', error);
    res.status(500).json({ error: 'Failed to list images', details: error.message });
  }
});

/**
 * Remove image
 */
app.delete('/api/docker/images/:id', async (req, res) => {
  try {
    const { force = 'false', noprune = 'false' } = req.query;
    const image = docker.getImage(req.params.id);
    await image.remove({ force: force === 'true', noprune: noprune === 'true' });
    res.json({ success: true, imageId: req.params.id });
  } catch (error) {
    console.error('Docker image remove error:', error);
    res.status(500).json({ error: 'Failed to remove image', details: error.message });
  }
});

/**
 * List volumes
 */
app.get('/api/docker/volumes', async (req, res) => {
  try {
    const { Volumes: volumes } = await docker.listVolumes();

    const result = (volumes || []).map(v => ({
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
      createdAt: v.CreatedAt,
      labels: v.Labels || {},
    }));

    res.json(result);
  } catch (error) {
    console.error('Docker volumes list error:', error);
    res.status(500).json({ error: 'Failed to list volumes', details: error.message });
  }
});

/**
 * List networks
 */
app.get('/api/docker/networks', async (req, res) => {
  try {
    const networks = await docker.listNetworks();

    const result = networks.map(n => ({
      id: n.Id.substring(0, 12),
      name: n.Name,
      driver: n.Driver,
      scope: n.Scope,
      internal: n.Internal,
      containers: Object.keys(n.Containers || {}).length,
    }));

    res.json(result);
  } catch (error) {
    console.error('Docker networks list error:', error);
    res.status(500).json({ error: 'Failed to list networks', details: error.message });
  }
});

// =============================================================================
// SERVER MANAGEMENT API ROUTES
// =============================================================================

/**
 * Get comprehensive server status
 */
app.get('/api/server/status', (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Get load averages
    const loadAvg = os.loadavg();

    // Get disk usage (Linux-specific)
    let diskInfo = null;
    try {
      const dfOutput = execSync('df -h / | tail -1', { encoding: 'utf-8' });
      const parts = dfOutput.trim().split(/\s+/);
      diskInfo = {
        filesystem: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        usePercent: parts[4],
        mountpoint: parts[5],
      };
    } catch (e) {
      console.error('Failed to get disk info:', e);
    }

    res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      cpu: {
        model: cpus[0]?.model,
        cores: cpus.length,
        loadAvg: loadAvg,
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usedPercent: ((usedMem / totalMem) * 100).toFixed(1),
      },
      disk: diskInfo,
      network: os.networkInterfaces(),
    });
  } catch (error) {
    console.error('Server status error:', error);
    res.status(500).json({ error: 'Failed to get server status', details: error.message });
  }
});

/**
 * List systemd services
 */
app.get('/api/server/services', (req, res) => {
  try {
    const output = execSync('systemctl list-units --type=service --state=running,failed --no-pager --no-legend', {
      encoding: 'utf-8',
    });

    const services = output.trim().split('\n').filter(line => line).map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        name: parts[0]?.replace('.service', ''),
        load: parts[1],
        active: parts[2],
        sub: parts[3],
        description: parts.slice(4).join(' '),
      };
    });

    res.json(services);
  } catch (error) {
    console.error('Services list error:', error);
    res.status(500).json({ error: 'Failed to list services', details: error.message });
  }
});

/**
 * Control systemd service (start, stop, restart, status)
 */
app.post('/api/server/services/:name/:action', (req, res) => {
  const { name, action } = req.params;
  const allowedActions = ['start', 'stop', 'restart', 'status'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action: ${action}` });
  }

  // Validate service name to prevent command injection
  const validServiceName = validateServiceName(name);
  if (!validServiceName) {
    console.warn(`[SECURITY] Invalid service name rejected: ${name}`);
    return res.status(400).json({ error: 'Invalid service name' });
  }

  try {
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
    // action is from allowedActions whitelist, validServiceName validated by validateServiceName()
    const output = execSync(`sudo systemctl ${action} ${validServiceName}.service 2>&1 || true`, {
      encoding: 'utf-8',
    });
    res.json({ success: true, action, service: validServiceName, output: output.trim() });
  } catch (error) {
    console.error(`Service ${action} error:`, error);
    res.status(500).json({ error: `Failed to ${action} service`, details: error.message });
  }
});

/**
 * Get system logs (journalctl)
 */
app.get('/api/server/logs', (req, res) => {
  const { unit, lines = 50, priority, since } = req.query;

  try {
    let cmd = 'journalctl --no-pager';

    // Validate unit name to prevent command injection
    if (unit) {
      const validUnit = validateUnitName(unit);
      if (!validUnit) {
        console.warn(`[SECURITY] Invalid unit name rejected: ${unit}`);
        return res.status(400).json({ error: 'Invalid unit name' });
      }
      cmd += ` -u ${validUnit}`;
    }

    // Validate lines as integer
    const numLines = parseInt(lines, 10);
    if (!isNaN(numLines) && numLines > 0 && numLines <= 10000) {
      cmd += ` -n ${numLines}`;
    }

    // Validate priority (0-7)
    if (priority) {
      const numPriority = parseInt(priority, 10);
      if (!isNaN(numPriority) && numPriority >= 0 && numPriority <= 7) {
        cmd += ` -p ${numPriority}`;
      }
    }

    // Validate since - only allow safe date format (YYYY-MM-DD HH:MM:SS)
    if (since) {
      const safeDate = /^[\d\s:-]+$/.test(since) ? since : null;
      if (safeDate && safeDate.length <= 30) {
        cmd += ` --since "${safeDate}"`;
      }
    }

    const output = execSync(cmd, { encoding: 'utf-8' });
    const logLines = output.trim().split('\n');

    res.json({ logs: logLines, total: logLines.length });
  } catch (error) {
    console.error('System logs error:', error);
    res.status(500).json({ error: 'Failed to get system logs', details: error.message });
  }
});

/**
 * System reboot (requires confirmation)
 */
app.post('/api/server/reboot', (req, res) => {
  const { confirm, delay = 0 } = req.body;

  if (confirm !== 'REBOOT') {
    return res.status(400).json({ error: 'Confirmation required. Send confirm: "REBOOT"' });
  }

  try {
    // Try systemctl reboot first (more reliable), fallback to shutdown
    const rebootDelay = delay || 1;
    let cmd;
    let message;

    if (rebootDelay <= 1) {
      // Immediate reboot using systemctl
      cmd = 'sudo systemctl reboot';
      message = 'System reboot initiated';
    } else {
      // Scheduled reboot using shutdown
      cmd = `sudo shutdown -r +${rebootDelay} "Console.web initiated reboot"`;
      message = `System reboot scheduled in ${rebootDelay} minute(s)`;
    }

    // Execute synchronously to catch errors
    try {
      execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
      res.json({ success: true, message });
    } catch (execError) {
      // Try alternative command if first fails
      console.error('Primary reboot command failed:', execError.message);
      try {
        execSync('sudo reboot', { encoding: 'utf-8', timeout: 5000 });
        res.json({ success: true, message: 'System reboot initiated (fallback)' });
      } catch (fallbackError) {
        console.error('Fallback reboot also failed:', fallbackError.message);
        res.status(500).json({
          error: 'Failed to initiate reboot',
          details: 'sudo permission may be required. Check sudoers configuration.',
        });
      }
    }
  } catch (error) {
    console.error('Reboot error:', error);
    res.status(500).json({ error: 'Failed to initiate reboot', details: error.message });
  }
});

/**
 * Cancel scheduled shutdown/reboot
 */
app.post('/api/server/shutdown/cancel', (req, res) => {
  try {
    execSync('sudo shutdown -c "Console.web cancelled shutdown"', { encoding: 'utf-8' });
    res.json({ success: true, message: 'Scheduled shutdown cancelled' });
  } catch (error) {
    console.error('Cancel shutdown error:', error);
    res.status(500).json({ error: 'Failed to cancel shutdown', details: error.message });
  }
});

// =============================================================================
// SOVEREIGN STACK API ROUTES
// =============================================================================

/**
 * Get all Sovereign Stack services status
 */
app.get('/api/stack/services', async (req, res) => {
  try {
    const services = [];

    for (const [key, service] of Object.entries(SOVEREIGN_SERVICES)) {
      // Check if port is open
      let portOpen = false;
      try {
        execSync(`nc -z localhost ${service.port} 2>/dev/null`);
        portOpen = true;
      } catch {
        portOpen = false;
      }

      // Find related containers
      let containers = [];
      try {
        const allContainers = await docker.listContainers({ all: true });
        containers = allContainers
          .filter(c => c.Names.some(n => n.toLowerCase().includes(service.containerPattern.toLowerCase())))
          .map(c => ({
            id: c.Id.substring(0, 12),
            name: c.Names[0]?.replace(/^\//, ''),
            state: c.State,
            status: c.Status,
          }));
      } catch (e) {
        console.error(`Failed to get containers for ${key}:`, e);
      }

      // Determine health status
      let health = 'unknown';
      if (portOpen) {
        health = containers.every(c => c.state === 'running') ? 'healthy' : 'degraded';
      } else if (containers.length > 0) {
        health = containers.some(c => c.state === 'running') ? 'degraded' : 'stopped';
      } else {
        health = 'stopped';
      }

      services.push({
        id: key,
        ...service,
        portOpen,
        health,
        containers,
      });
    }

    res.json(services);
  } catch (error) {
    console.error('Stack services error:', error);
    res.status(500).json({ error: 'Failed to get stack services', details: error.message });
  }
});

/**
 * Get Sovereign Stack aggregate health
 */
app.get('/api/stack/health', async (req, res) => {
  try {
    let healthy = 0;
    let degraded = 0;
    let stopped = 0;
    let unknown = 0;

    for (const [key, service] of Object.entries(SOVEREIGN_SERVICES)) {
      try {
        execSync(`nc -z localhost ${service.port} 2>/dev/null`);
        healthy++;
      } catch {
        stopped++;
      }
    }

    const total = Object.keys(SOVEREIGN_SERVICES).length;
    const overallHealth = healthy === total ? 'healthy' :
                          healthy > 0 ? 'degraded' : 'critical';

    res.json({
      overall: overallHealth,
      healthy,
      degraded,
      stopped,
      unknown,
      total,
    });
  } catch (error) {
    console.error('Stack health error:', error);
    res.status(500).json({ error: 'Failed to get stack health', details: error.message });
  }
});

/**
 * Restart a Sovereign Stack service (all related containers)
 */
app.post('/api/stack/services/:serviceId/restart', async (req, res) => {
  const { serviceId } = req.params;
  const service = SOVEREIGN_SERVICES[serviceId];

  if (!service) {
    return res.status(404).json({ error: `Service not found: ${serviceId}` });
  }

  try {
    const allContainers = await docker.listContainers({ all: true });
    const relatedContainers = allContainers
      .filter(c => c.Names.some(n => n.toLowerCase().includes(service.containerPattern.toLowerCase())));

    const results = [];
    for (const c of relatedContainers) {
      const container = docker.getContainer(c.Id);
      await container.restart();
      results.push({ id: c.Id.substring(0, 12), name: c.Names[0], status: 'restarted' });
    }

    res.json({ success: true, service: serviceId, containers: results });
  } catch (error) {
    console.error(`Stack service restart error:`, error);
    res.status(500).json({ error: 'Failed to restart service', details: error.message });
  }
});

// =============================================================================
// PORT MANAGEMENT API ROUTES
// =============================================================================

/**
 * Get list of active ports
 */
app.get('/api/ports', (req, res) => {
  try {
    const result = getActivePorts();
    res.json(result);
  } catch (error) {
    console.error('Error getting ports:', error);
    res.status(500).json({ error: 'Failed to get port information' });
  }
});

/**
 * Trigger fresh port scan
 */
app.post('/api/ports/scan', (req, res) => {
  try {
    const result = getActivePorts();
    res.json(result);
  } catch (error) {
    console.error('Error scanning ports:', error);
    res.status(500).json({ error: 'Port scan failed' });
  }
});

/**
 * Kill process on specific port
 */
app.delete('/api/ports/kill/:port', (req, res) => {
  try {
    // Validate port to prevent command injection
    const port = validatePort(req.params.port);
    if (!port) {
      console.warn(`[SECURITY] Invalid port rejected: ${req.params.port}`);
      return res.status(400).json({ error: 'Invalid port number' });
    }

    if (port < 1024 || port > 65535) {
      return res.status(400).json({ error: 'Port out of allowed range (1024-65535)' });
    }

    // Safety check - don't allow killing system ports
    if (port < 3000) {
      return res.status(403).json({ error: 'Cannot kill system port' });
    }

    // Find and kill the process - port is now guaranteed to be a safe integer
    try {
      // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
      // port is validated by validatePort() - guaranteed to be integer 1-65535
      execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti :${port} | xargs kill -9 2>/dev/null`, {
        encoding: 'utf-8',
      });
    } catch {
      // Process might already be dead
    }

    res.json({ success: true, port });
  } catch (error) {
    console.error('Error killing port:', error);
    res.status(500).json({ error: 'Failed to kill process' });
  }
});

/**
 * Get suggested next available port
 */
app.get('/api/ports/suggest', (req, res) => {
  try {
    const { suggestedPort } = getActivePorts();
    res.json({ suggestedPort });
  } catch (error) {
    console.error('Error suggesting port:', error);
    res.status(500).json({ error: 'Failed to suggest port' });
  }
});

/**
 * Get PORTS.md registry content
 */
app.get('/api/ports/registry', (req, res) => {
  try {
    const portsFile = join(os.homedir(), 'PORTS.md');
    if (!existsSync(portsFile)) {
      return res.json({ exists: false, content: null, registered: [] });
    }

    const content = readFileSync(portsFile, 'utf-8');
    const registered = parsePortsMdFile();
    const registeredList = Array.from(registered.entries()).map(([port, info]) => ({
      port,
      ...info
    }));

    res.json({
      exists: true,
      path: portsFile,
      content,
      registered: registeredList
    });
  } catch (error) {
    console.error('Error reading PORTS.md:', error);
    res.status(500).json({ error: 'Failed to read port registry' });
  }
});

/**
 * Get all projects with full analysis (completion, technologies, missing items)
 */
app.get('/api/admin/projects-extended', async (req, res) => {
  try {
    const projects = await getProjects();
    const includeCompletion = req.query.completion !== 'false';

    const extended = projects.map(project => {
      // Check for CLAUDE.md (project-specific instructions)
      const claudeMdPath = join(project.path, 'CLAUDE.md');
      const hasClaudeMd = existsSync(claudeMdPath);
      let claudeMdSize = 0;
      let claudeMdModified = null;

      if (hasClaudeMd) {
        try {
          const stat = statSync(claudeMdPath);
          claudeMdSize = stat.size;
          claudeMdModified = stat.mtime;
        } catch {
          // Ignore
        }
      }

      // Check for session data
      const sessionDir = join(CLAUDE_DIR, 'projects', `-home-thornburywn-Projects-${project.name}`);
      const hasSessionData = existsSync(sessionDir);

      // Calculate completion metrics if requested
      let completion = null;
      let technologies = [];

      if (includeCompletion) {
        completion = calculateProjectCompletion(project.path);
        technologies = detectTechnologies(project.path);
      }

      // Get description from package.json if available
      let description = null;
      let hasTests = false;
      try {
        const pkgPath = join(project.path, 'package.json');
        if (existsSync(pkgPath)) {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          description = pkg.description || null;
          // Check for test script in package.json
          hasTests = !!(pkg.scripts && (pkg.scripts.test || pkg.scripts['test:unit'] || pkg.scripts['test:e2e']));
        }
      } catch {
        // Ignore
      }

      // Check for git repository
      const hasGit = existsSync(join(project.path, '.git'));

      // Check for GitHub remote
      let hasGithub = false;
      let githubRepo = null;
      if (hasGit) {
        try {
          const gitConfigPath = join(project.path, '.git', 'config');
          if (existsSync(gitConfigPath)) {
            const gitConfig = readFileSync(gitConfigPath, 'utf-8');
            const githubMatch = gitConfig.match(/url\s*=\s*.*github\.com[:/]([^/\s]+\/[^\s.]+)/i);
            if (githubMatch) {
              hasGithub = true;
              githubRepo = githubMatch[1].replace(/\.git$/, '');
            }
          }
        } catch {
          // Ignore
        }
      }

      // Check for tests directory (if not found via package.json)
      if (!hasTests) {
        hasTests = existsSync(join(project.path, 'test')) ||
                   existsSync(join(project.path, 'tests')) ||
                   existsSync(join(project.path, '__tests__')) ||
                   existsSync(join(project.path, 'spec'));
      }

      // Check for Docker configuration
      const hasDocker = existsSync(join(project.path, 'Dockerfile')) ||
                        existsSync(join(project.path, 'docker-compose.yml')) ||
                        existsSync(join(project.path, 'docker-compose.yaml'));

      return {
        ...project,
        hasClaudeMd,
        claudeMdSize,
        claudeMdModified,
        hasSessionData,
        completion,
        technologies,
        description,
        hasGit,
        hasGithub,
        githubRepo,
        hasTests,
        hasDocker
      };
    });

    res.json(extended);
  } catch (error) {
    console.error('Error getting extended projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

/**
 * GET /api/dashboard - Comprehensive dashboard data
 * Fetches all data needed for the home dashboard in one call
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    const projects = await getProjects();
    const shpoolSessions = listShpoolSessions();

    // Helper to execute git commands (using execFileSync to avoid shell interpretation of % chars)
    const execGitSafe = (args, cwd) => {
      try {
        return execFileSync('git', args, { cwd, encoding: 'utf-8', timeout: 5000 }).trim();
      } catch {
        return null;
      }
    };

    // Get disk usage for a directory
    const getDiskUsage = (dirPath) => {
      try {
        const output = execSync(`du -sb "${dirPath}" 2>/dev/null | cut -f1`, { encoding: 'utf-8' }).trim();
        return parseInt(output) || 0;
      } catch {
        return 0;
      }
    };

    // Get git status for all projects (parallel with limits)
    const gitStatuses = [];
    const recentCommits = [];

    for (const project of projects.slice(0, 30)) { // Limit to 30 projects for performance
      const gitDir = join(project.path, '.git');
      if (!existsSync(gitDir)) continue;

      try {
        // Get status
        const branch = execGitSafe(['rev-parse', '--abbrev-ref', 'HEAD'], project.path);
        if (!branch) continue;

        const stagedRaw = execGitSafe(['diff', '--cached', '--name-only'], project.path) || '';
        const unstagedRaw = execGitSafe(['diff', '--name-only'], project.path) || '';
        const untrackedRaw = execGitSafe(['ls-files', '--others', '--exclude-standard'], project.path) || '';

        const staged = stagedRaw ? stagedRaw.split('\n').filter(Boolean).length : 0;
        const unstaged = unstagedRaw ? unstagedRaw.split('\n').filter(Boolean).length : 0;
        const untracked = untrackedRaw ? untrackedRaw.split('\n').filter(Boolean).length : 0;

        // Get ahead/behind
        let ahead = 0, behind = 0;
        try {
          const trackingRaw = execGitSafe(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], project.path);
          if (trackingRaw) {
            const parts = trackingRaw.split('\t');
            ahead = parseInt(parts[0]) || 0;
            behind = parseInt(parts[1]) || 0;
          }
        } catch {}

        if (staged > 0 || unstaged > 0 || untracked > 0 || ahead > 0 || behind > 0) {
          gitStatuses.push({
            name: project.name,
            path: project.path,
            branch,
            staged,
            unstaged,
            untracked,
            ahead,
            behind,
            dirty: staged + unstaged + untracked > 0
          });
        }

        // Get recent commits (last 2 per project, max 20 total)
        if (recentCommits.length < 20) {
          const logRaw = execGitSafe(['log', '-2', '--format=%H|%s|%an|%ar|%at'], project.path);
          if (logRaw) {
            logRaw.split('\n').filter(Boolean).forEach(line => {
              const [hash, message, author, timeAgo, timestamp] = line.split('|');
              if (recentCommits.length < 20) {
                recentCommits.push({
                  project: project.name,
                  hash: hash?.substring(0, 7),
                  message: message?.substring(0, 60),
                  author,
                  timeAgo,
                  timestamp: parseInt(timestamp) * 1000
                });
              }
            });
          }
        }
      } catch {}
    }

    // Sort recent commits by timestamp
    recentCommits.sort((a, b) => b.timestamp - a.timestamp);

    // Get active ports
    let activePorts = [];
    try {
      const portsResult = getActivePorts();
      activePorts = portsResult.ports || [];
    } catch {}

    // Get disk usage for projects (sample top projects)
    const diskUsage = projects.slice(0, 15).map(p => ({
      name: p.name,
      path: p.path,
      size: getDiskUsage(p.path)
    })).sort((a, b) => b.size - a.size).slice(0, 10);

    // Get AI usage from database
    let aiUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0, costEstimate: 0 };
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const usage = await prisma.aPIUsage.findMany({
        where: { timestamp: { gte: startOfWeek } }
      });

      aiUsage = usage.reduce((acc, r) => ({
        inputTokens: acc.inputTokens + r.inputTokens,
        outputTokens: acc.outputTokens + r.outputTokens,
        totalTokens: acc.totalTokens + r.inputTokens + r.outputTokens,
        requests: acc.requests + 1,
        costEstimate: acc.costEstimate + ((r.inputTokens * 0.003 + r.outputTokens * 0.015) / 1000)
      }), aiUsage);
    } catch {}

    // Get recent command history
    let recentCommands = [];
    try {
      if (existsSync(CLAUDE_HISTORY_FILE)) {
        const content = readFileSync(CLAUDE_HISTORY_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        recentCommands = lines.slice(-20).reverse().map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    } catch {}

    // Get errors/warnings from security scans (if available)
    let securityAlerts = [];
    try {
      const scansDir = join(PROJECTS_DIR, '.scans');
      if (existsSync(scansDir)) {
        const scanFiles = readdirSync(scansDir)
          .filter(f => f.endsWith('.json'))
          .slice(-5);

        for (const file of scanFiles) {
          try {
            const scan = JSON.parse(readFileSync(join(scansDir, file), 'utf-8'));
            if (scan.vulnerabilities?.length > 0) {
              securityAlerts.push({
                project: scan.project || file.replace('.json', ''),
                count: scan.vulnerabilities.length,
                severity: scan.vulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL'
                  : scan.vulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' : 'MEDIUM'
              });
            }
          } catch {}
        }
      }
    } catch {}

    // NOTE: healthScores removed - HomeDashboard now derives health from
    // projectsExtended.completion for single source of truth (see calculateProjectCompletion)

    res.json({
      gitStatuses,
      recentCommits: recentCommits.slice(0, 15),
      activePorts: activePorts.slice(0, 15),
      diskUsage,
      aiUsage,
      recentCommands: recentCommands.slice(0, 10),
      securityAlerts,
      shpoolSessions
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

/**
 * DELETE /api/admin/projects/:projectName - Delete a project
 * Moves project to ~/.Trash or deletes permanently based on query param
 */
app.delete('/api/admin/projects/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { permanent = 'false' } = req.query;

    // Validate project name (prevent path traversal)
    if (!projectName || projectName.includes('..') || projectName.includes('/')) {
      return res.status(400).json({ error: 'Invalid project name' });
    }

    const projectPath = join(PROJECTS_DIR, projectName);

    // Check project exists
    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check it's a directory
    const stat = statSync(projectPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a valid project directory' });
    }

    if (permanent === 'true') {
      // Permanently delete
      const { rm } = await import('fs/promises');
      await rm(projectPath, { recursive: true, force: true });
      console.log(`[DELETE] Permanently deleted project: ${projectName}`);
    } else {
      // Move to trash
      const trashDir = join(homedir(), '.Trash');
      if (!existsSync(trashDir)) {
        mkdirSync(trashDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const trashPath = join(trashDir, `${projectName}_${timestamp}`);

      const { rename } = await import('fs/promises');
      await rename(projectPath, trashPath);
      console.log(`[DELETE] Moved project to trash: ${projectName} -> ${trashPath}`);
    }

    // Clean up any database entries for this project
    try {
      // Delete related sessions from database
      await prisma.session.deleteMany({
        where: { projectPath: projectPath }
      });

      // Delete GitHub repo link if exists
      await prisma.gitHubRepo.deleteMany({
        where: { projectPath: projectPath }
      });

      // Delete checkpoints if exists
      await prisma.checkpoint.deleteMany({
        where: { projectPath: projectPath }
      });
    } catch (dbError) {
      console.warn('[DELETE] Database cleanup warning:', dbError.message);
      // Continue even if DB cleanup fails
    }

    res.json({
      success: true,
      message: permanent === 'true'
        ? `Project "${projectName}" permanently deleted`
        : `Project "${projectName}" moved to trash`
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

/**
 * POST /api/projects/:projectName/rename - Rename a project
 * Renames the project folder on disk and updates database references
 */
app.post('/api/projects/:projectName/rename', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { newName } = req.body;

    // Validate inputs
    if (!projectName || !newName) {
      return res.status(400).json({ error: 'Project name and new name are required' });
    }

    // Prevent path traversal
    if (projectName.includes('..') || projectName.includes('/') ||
        newName.includes('..') || newName.includes('/')) {
      return res.status(400).json({ error: 'Invalid project name' });
    }

    // Validate new name format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(newName)) {
      return res.status(400).json({ error: 'Project name can only contain letters, numbers, hyphens, and underscores' });
    }

    const oldPath = join(PROJECTS_DIR, projectName);
    const newPath = join(PROJECTS_DIR, newName);

    // Check old project exists
    if (!existsSync(oldPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check new name doesn't already exist
    if (existsSync(newPath)) {
      return res.status(409).json({ error: 'A project with that name already exists' });
    }

    // Rename the folder
    const { rename: fsRename } = await import('fs/promises');
    await fsRename(oldPath, newPath);
    console.log(`[RENAME] Renamed project: ${projectName} -> ${newName}`);

    // Update database references
    try {
      // Update sessions
      await prisma.session.updateMany({
        where: { projectPath: oldPath },
        data: { projectPath: newPath }
      });

      // Update GitHub repo links
      await prisma.gitHubRepo.updateMany({
        where: { projectPath: oldPath },
        data: { projectPath: newPath }
      });

      // Update checkpoints
      await prisma.checkpoint.updateMany({
        where: { projectPath: oldPath },
        data: { projectPath: newPath }
      });

      // Update Project entry if exists
      await prisma.project.updateMany({
        where: { path: oldPath },
        data: { path: newPath, name: newName }
      });
    } catch (dbError) {
      console.warn('[RENAME] Database update warning:', dbError.message);
      // Continue even if DB update fails - folder was renamed successfully
    }

    res.json({
      success: true,
      message: `Project renamed from "${projectName}" to "${newName}"`,
      oldPath,
      newPath
    });
  } catch (error) {
    console.error('Error renaming project:', error);
    res.status(500).json({ error: error.message || 'Failed to rename project' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Static assets with cache headers (they have hashes in filenames)
  app.use(express.static('dist', {
    maxAge: '1h', // Shorter cache for faster updates
    etag: true,
    setHeaders: (res, path) => {
      // Aggressive no-cache for HTML files
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // Redirect favicon.ico to favicon.svg (browsers auto-request /favicon.ico)
  app.get('/favicon.ico', (req, res) => {
    res.redirect(301, '/favicon.svg');
  });

  // SPA fallback - serve index.html for all routes
  app.get('*', (req, res) => {
    console.log(`[DEBUG] Serving index.html for: ${req.path}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(join(process.cwd(), 'dist', 'index.html'));
  });

  console.log('[PRODUCTION] Serving static files from dist/');
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle project selection
  socket.on('select-project', async (projectPath) => {
    console.log(`Socket ${socket.id} selecting project: ${projectPath}`);

    // Clean up any existing session for this socket
    const existingProject = socketProjects.get(socket.id);
    if (existingProject) {
      const existingSession = sessions.get(existingProject);
      if (existingSession) {
        existingSession.sockets.delete(socket.id);
        // Don't kill the PTY - it's backed by shpool and should persist
        // When no sockets are connected, the PTY wrapper can be cleaned up
        // but the shpool session continues running in the background
      }
    }

    // Look up project settings from database
    let projectSettings = { skipPermissions: false };
    try {
      const project = await prisma.project.findUnique({ where: { path: projectPath } });
      if (project) {
        projectSettings.skipPermissions = project.skipPermissions || false;
      }
    } catch (err) {
      console.error('Error fetching project settings:', err);
    }

    // Look up user settings for AI solution preference
    let userSettings = {
      preferredAISolution: 'claude-code',
      codePuppyModel: null,
      codePuppyProvider: null,
      hybridMode: 'code-puppy-with-claude-tools'
    };
    try {
      const settings = await prisma.userSettings.findUnique({ where: { id: 'default' } });
      if (settings) {
        userSettings.preferredAISolution = settings.preferredAISolution || 'claude-code';
        userSettings.codePuppyModel = settings.codePuppyModel;
        userSettings.codePuppyProvider = settings.codePuppyProvider;
        userSettings.hybridMode = settings.hybridMode || 'code-puppy-with-claude-tools';
      }
    } catch (err) {
      console.error('Error fetching user settings:', err);
    }

    // Check if we already have a PTY session for this project
    let session = sessions.get(projectPath);

    if (!session) {
      // Create new PTY session with project and user settings
      const ptySession = createPtySession(projectPath, socket, {
        skipPermissions: projectSettings.skipPermissions,
        aiSolution: userSettings.preferredAISolution,
        codePuppyModel: userSettings.codePuppyModel,
        codePuppyProvider: userSettings.codePuppyProvider,
        hybridMode: userSettings.hybridMode
      });

      session = {
        ...ptySession,
        sockets: new Set([socket.id]),
        // Activity tracking for command completion detection
        lastOutputTime: null,
        activityStartTime: null,
        idleTimer: null,
        isActive: false
      };

      sessions.set(projectPath, session);

      // Save session state to database
      saveSessionState(projectPath, ptySession.sessionName, { cols: 120, rows: 30 }, projectPath)
        .catch(err => console.error('Failed to save session state:', err));

      // Handle PTY output with activity tracking
      session.pty.onData((data) => {
        const now = Date.now();

        // Track activity start
        if (!session.isActive) {
          session.isActive = true;
          session.activityStartTime = now;
        }
        session.lastOutputTime = now;

        // Clear existing idle timer
        if (session.idleTimer) {
          clearTimeout(session.idleTimer);
        }

        // Broadcast to all sockets watching this project
        session.sockets.forEach(socketId => {
          io.to(socketId).emit('terminal-output', data);
        });

        // Set new idle timer for command completion detection
        session.idleTimer = setTimeout(() => {
          const activityDuration = session.lastOutputTime - session.activityStartTime;

          // Only emit completion if there was meaningful activity
          if (session.isActive && activityDuration >= MIN_ACTIVITY_MS) {
            session.sockets.forEach(socketId => {
              io.to(socketId).emit('command-complete', {
                projectPath,
                projectName: basename(projectPath),
                activityDuration,
                timestamp: Date.now()
              });
            });
          }

          // Reset activity tracking
          session.isActive = false;
          session.activityStartTime = null;
        }, IDLE_TIMEOUT_MS);
      });

      // Handle PTY exit
      session.pty.onExit(({ exitCode }) => {
        console.log(`PTY exited for ${projectPath} with code ${exitCode}`);
        sessions.delete(projectPath);
        session.sockets.forEach(socketId => {
          io.to(socketId).emit('terminal-exit', { exitCode, projectPath });
        });
      });

    } else {
      // Add this socket to existing session
      session.sockets.add(socket.id);
    }

    // Update socket-to-project mapping
    socketProjects.set(socket.id, projectPath);

    // Notify client that connection is ready
    socket.emit('terminal-ready', {
      projectPath,
      sessionName: session.sessionName,
      isNew: session.isNew
    });
  });

  // Handle terminal input from client
  socket.on('terminal-input', (data) => {
    const projectPath = socketProjects.get(socket.id);
    if (projectPath) {
      const session = sessions.get(projectPath);
      if (session && session.pty) {
        session.pty.write(data);
      }
    }
  });

  // Note: Right-click context menu is now handled in the frontend (Terminal.jsx)
  // since shpool doesn't have tmux's display-menu feature. The browser's native
  // context menu or a custom React menu can be used instead.

  // Handle terminal resize
  socket.on('terminal-resize', ({ cols, rows }) => {
    const projectPath = socketProjects.get(socket.id);
    if (projectPath) {
      const session = sessions.get(projectPath);
      if (session && session.pty) {
        try {
          session.pty.resize(cols, rows);
        } catch (error) {
          console.error('Error resizing PTY:', error);
        }
      }
    }
  });

  // Handle manual reconnection to existing shpool session
  socket.on('reconnect-session', async (projectPath) => {
    console.log(`Socket ${socket.id} requesting reconnection to: ${projectPath}`);
    const sessionName = getSessionName(projectPath);
    const sessionExists = shpoolSessionExists(sessionName);

    // Clean up any existing session for this socket
    const existingProject = socketProjects.get(socket.id);
    if (existingProject && existingProject !== projectPath) {
      const existingSession = sessions.get(existingProject);
      if (existingSession) {
        existingSession.sockets.delete(socket.id);
      }
    }

    // Check if we already have a PTY session for this project
    let session = sessions.get(projectPath);

    if (!session) {
      // Create new PTY session (attaches to existing shpool or creates new one)
      console.log(sessionExists
        ? `Reattaching to existing shpool session: ${sessionName}`
        : `Creating new shpool session: ${sessionName}`);
      const ptySession = createPtySession(projectPath, socket, { skipPermissions: false });

      session = {
        ...ptySession,
        sockets: new Set([socket.id]),
        lastOutputTime: null,
        activityStartTime: null,
        idleTimer: null,
        isActive: false
      };

      sessions.set(projectPath, session);

      // Set up PTY output handler
      session.pty.onData((data) => {
        const now = Date.now();
        if (!session.isActive) {
          session.isActive = true;
          session.activityStartTime = now;
        }
        session.lastOutputTime = now;

        if (session.idleTimer) {
          clearTimeout(session.idleTimer);
        }

        session.sockets.forEach(socketId => {
          io.to(socketId).emit('terminal-output', data);
        });

        session.idleTimer = setTimeout(() => {
          const activityDuration = session.lastOutputTime - session.activityStartTime;
          if (session.isActive && activityDuration >= MIN_ACTIVITY_MS) {
            session.sockets.forEach(socketId => {
              io.to(socketId).emit('command-complete', {
                projectPath,
                projectName: basename(projectPath),
                activityDuration,
                timestamp: Date.now()
              });
            });
          }
          session.isActive = false;
          session.activityStartTime = null;
        }, IDLE_TIMEOUT_MS);
      });

      // Handle PTY exit
      session.pty.onExit(({ exitCode }) => {
        console.log(`PTY exited for ${projectPath} with code ${exitCode}`);
        sessions.delete(projectPath);
        session.sockets.forEach(socketId => {
          io.to(socketId).emit('terminal-exit', { exitCode, projectPath });
        });
      });
    } else {
      // Add this socket to existing session
      session.sockets.add(socket.id);
    }

    // Update socket-to-project mapping
    socketProjects.set(socket.id, projectPath);

    // Notify client that reconnection succeeded
    socket.emit('terminal-ready', {
      projectPath,
      sessionName: session.sessionName,
      isNew: false,
      reconnected: true
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const projectPath = socketProjects.get(socket.id);
    if (projectPath) {
      const session = sessions.get(projectPath);
      if (session) {
        session.sockets.delete(socket.id);

        // If no more sockets are connected, clean up the PTY but keep shpool running
        if (session.sockets.size === 0) {
          console.log(`No more clients for ${projectPath}, cleaning up PTY session`);

          // Clear any pending idle timer
          if (session.idleTimer) {
            clearTimeout(session.idleTimer);
          }

          // Kill the PTY process (shpool session keeps running in background)
          try {
            session.pty.kill();
          } catch (err) {
            console.error(`Error killing PTY for ${projectPath}:`, err);
          }

          // Remove from sessions map so reconnect creates fresh PTY
          sessions.delete(projectPath);

          // Mark session as disconnected in database
          markSessionDisconnected(projectPath, session.sessionName)
            .catch(err => console.error('Failed to mark session disconnected:', err));
        }
      }
    }

    socketProjects.delete(socket.id);
  });

  // Handle kill session request
  socket.on('kill-session', (projectPath) => {
    const session = sessions.get(projectPath);
    const sessionName = getSessionName(projectPath);

    if (session) {
      // Kill the PTY
      session.pty.kill();
      sessions.delete(projectPath);
    }

    // Validate session name before using in shell command
    const validSessionName = validateSessionName(sessionName);
    if (validSessionName) {
      // Also kill the shpool session
      try {
        // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
        // validSessionName validated by validateSessionName() - only allows ^sp-[a-zA-Z0-9_-]+$
        execSync(`shpool kill "${validSessionName}" 2>/dev/null`);
      } catch {
        // Session might already be dead
      }
    } else {
      console.warn(`[SECURITY] Invalid session name in kill-session: ${sessionName}`);
    }

    socket.emit('session-killed', { projectPath, sessionName });
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              Console.web - Backend Server                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on:    http://0.0.0.0:${PORT}                 ║
║  Projects directory:   ${PROJECTS_DIR.padEnd(32)}║
║  Environment:          ${(process.env.NODE_ENV || 'development').padEnd(32)}║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Check Code Puppy initialization status
  (async () => {
    try {
      const isInitialized = await codePuppyInitializer.isInitialized();
      if (!isInitialized) {
        console.log('⚠️  Code Puppy not initialized - will auto-initialize on first access');
      } else {
        console.log('✅ Code Puppy is initialized and ready');
      }
    } catch (error) {
      console.error('Error checking Code Puppy status:', error);
    }
  })();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  // Stop metrics collection
  metricsCollector.stop();

  // Stop MCP manager
  await mcpManager.shutdown();

  // Don't kill shpool sessions - they should persist
  sessions.forEach((session, projectPath) => {
    console.log(`Detaching from ${projectPath}`);
    // Just kill the PTY wrapper, shpool continues in background
    session.pty.kill();
  });

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});
