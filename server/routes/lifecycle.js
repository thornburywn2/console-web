import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import scanManager from '../services/scanManager.js';

const execAsync = promisify(exec);

export function createLifecycleRouter(prisma) {
  const router = Router();

  // Load scan settings on router creation
  if (prisma) {
    scanManager.loadScanSettings(prisma);
  }

// Lifecycle agents configuration
const AGENTS_DIR = process.env.AGENTS_DIR || path.join(process.env.HOME, 'Projects/agents/lifecycle');
const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME, 'Projects');

// Security tools to check
const TOOLS = {
  semgrep: { cmd: 'semgrep --version', install: 'pip install semgrep' },
  gitleaks: { cmd: 'which gitleaks || /snap/bin/gitleaks version 2>/dev/null || gitleaks version', install: 'sudo snap install gitleaks' },
  trivy: { cmd: 'which trivy || /snap/bin/trivy --version 2>/dev/null || trivy --version', install: 'sudo snap install trivy' },
  'license-checker': { cmd: 'npx license-checker --version', install: 'npm install -g license-checker' },
  lighthouse: { cmd: 'npx lighthouse --version', install: 'npm install -g lighthouse' },
  jscpd: { cmd: 'npx jscpd --version', install: 'npm install -g jscpd' }
};

// Lifecycle agents
const AGENTS = {
  'AGENT-016-LIFECYCLE-MANAGER': { file: 'AGENT-016-LIFECYCLE-MANAGER.sh', name: 'Lifecycle Manager' },
  'AGENT-017-CI-CD': { file: 'AGENT-017-CI-CD.sh', name: 'CI/CD Pipeline' },
  'AGENT-018-SECURITY': { file: 'AGENT-018-SECURITY.sh', name: 'Security Scanner' },
  'AGENT-019-QUALITY-GATE': { file: 'AGENT-019-QUALITY-GATE.sh', name: 'Quality Gate' },
  'AGENT-020-OBSERVABILITY': { file: 'AGENT-020-OBSERVABILITY.sh', name: 'Observability' },
  'AGENT-021-DEPENDENCY': { file: 'AGENT-021-DEPENDENCY.sh', name: 'Dependency Manager' },
  'AGENT-022-PERFORMANCE': { file: 'AGENT-022-PERFORMANCE.sh', name: 'Performance Optimizer' },
  'AGENT-023-PRECOMMIT': { file: 'AGENT-023-PRECOMMIT.sh', name: 'Pre-commit Hooks' }
};

// GET /api/lifecycle/tools/status - Check tool installation status
router.get('/tools/status', async (req, res) => {
  const statuses = {};

  for (const [toolId, config] of Object.entries(TOOLS)) {
    try {
      await execAsync(config.cmd, { timeout: 5000 });
      statuses[toolId] = 'installed';
    } catch (error) {
      // Check if command exists but had an error vs not found
      if (error.code === 'ENOENT' || error.message.includes('not found') || error.message.includes('command not found')) {
        statuses[toolId] = 'missing';
      } else if (error.killed || error.signal === 'SIGTERM') {
        statuses[toolId] = 'error';
      } else {
        // Command ran but returned non-zero - tool is installed
        statuses[toolId] = 'installed';
      }
    }
  }

  res.json({ tools: statuses });
});

// POST /api/lifecycle/tools/install - Install a tool
router.post('/tools/install', async (req, res) => {
  const { tool, command } = req.body;

  if (!tool || !TOOLS[tool]) {
    return res.status(400).json({ success: false, error: 'Invalid tool' });
  }

  try {
    const installCmd = command || TOOLS[tool].install;
    const { stdout, stderr } = await execAsync(installCmd, { timeout: 300000 }); // 5 min timeout

    res.json({
      success: true,
      output: stdout || stderr
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stderr || error.stdout
    });
  }
});

// GET /api/lifecycle/agents - List available agents
router.get('/agents', async (req, res) => {
  const agents = [];

  for (const [id, config] of Object.entries(AGENTS)) {
    const agentPath = path.join(AGENTS_DIR, config.file);
    let available = false;

    try {
      await fs.access(agentPath, fs.constants.X_OK);
      available = true;
    } catch {
      try {
        await fs.access(agentPath, fs.constants.R_OK);
        available = true;
      } catch {
        available = false;
      }
    }

    agents.push({
      id,
      name: config.name,
      file: config.file,
      path: agentPath,
      available
    });
  }

  res.json({ agents, agentsDir: AGENTS_DIR });
});

// POST /api/lifecycle/scan - Run a lifecycle agent scan with resource controls
router.post('/scan', async (req, res) => {
  const { agent, command, project, skipQueue = false } = req.body;

  if (!agent || !AGENTS[agent]) {
    return res.status(400).json({ success: false, error: 'Invalid agent' });
  }

  // Check if this scan type is enabled
  if (!scanManager.isScanEnabled(agent)) {
    return res.json({
      success: true,
      skipped: true,
      reason: `${AGENTS[agent].name} is disabled in settings`,
      agent: AGENTS[agent].name,
      project: project,
      timestamp: new Date().toISOString()
    });
  }

  const agentConfig = AGENTS[agent];
  const agentPath = path.join(AGENTS_DIR, agentConfig.file);
  const projectPath = project ? path.join(PROJECTS_DIR, project) : process.cwd();

  // Verify agent exists
  try {
    await fs.access(agentPath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({
      success: false,
      error: `Agent script not found: ${agentPath}`
    });
  }

  // Verify project exists
  try {
    await fs.access(projectPath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({
      success: false,
      error: `Project not found: ${projectPath}`
    });
  }

  try {
    // Get queue status for response
    const queueStatus = scanManager.getQueueStatus();

    // Execute scan through the scan manager (with resource limiting and queueing)
    console.log(`[Lifecycle] Executing ${agentConfig.name} scan for ${project || 'current directory'}`);

    const result = await scanManager.executeScan(agentPath, command || '', projectPath, {
      agent: agentConfig.name
    });

    // Extract summary if present
    let summary = null;
    if (result.output) {
      const summaryMatch = result.output.match(/(?:SUMMARY|REPORT)[:\s]*\n([\s\S]*?)(?:\n\n|$)/i);
      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }
    }

    res.json({
      success: result.success,
      output: result.output,
      summary,
      agent: agentConfig.name,
      project: projectPath,
      timestamp: new Date().toISOString(),
      duration: result.duration,
      scanId: result.scanId,
      timedOut: result.timedOut || false,
      resourceControls: {
        queuePosition: queueStatus.queueLength,
        activeScansBefore: queueStatus.activeScans,
        settings: scanManager.getScanSettings()
      }
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || '',
      exitCode: error.code,
      agent: agentConfig.name,
      project: projectPath,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/lifecycle/queue - Get scan queue status
router.get('/queue', async (req, res) => {
  const status = scanManager.getQueueStatus();
  res.json(status);
});

// POST /api/lifecycle/queue/cancel - Cancel all pending scans
router.post('/queue/cancel', async (req, res) => {
  const cancelled = scanManager.cancelPendingScans();
  res.json({ success: true, cancelled });
});

// GET /api/lifecycle/settings - Get scan settings
router.get('/settings', async (req, res) => {
  const settings = scanManager.getScanSettings();
  res.json(settings);
});

// POST /api/lifecycle/settings/reload - Reload settings from database
router.post('/settings/reload', async (req, res) => {
  if (prisma) {
    const settings = await scanManager.loadScanSettings(prisma);
    res.json({ success: true, settings });
  } else {
    res.status(500).json({ error: 'Database not available' });
  }
});

// GET /api/lifecycle/recommendations - Get resource control recommendations
router.get('/recommendations', async (req, res) => {
  const recommendations = await scanManager.getResourceRecommendations();
  res.json(recommendations);
});

// GET /api/lifecycle/reports - Get recent scan reports
router.get('/reports', async (req, res) => {
  const reportDirs = [
    '/tmp/security-reports',
    '/tmp/observability-metrics',
    '/tmp/quality-reports',
    '/tmp/performance-reports'
  ];

  const reports = [];

  for (const dir of reportDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          reports.push({
            name: file,
            path: filePath,
            directory: dir,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  // Sort by modified date, newest first
  reports.sort((a, b) => new Date(b.modified) - new Date(a.modified));

  res.json({ reports: reports.slice(0, 50) });
});

// GET /api/lifecycle/report/:path - Get a specific report
router.get('/report/*', async (req, res) => {
  const reportPath = '/' + req.params[0];

  // Security: Only allow reading from known report directories
  const allowedDirs = [
    '/tmp/security-reports',
    '/tmp/observability-metrics',
    '/tmp/quality-reports',
    '/tmp/performance-reports',
    '/tmp/sanitize-reports'
  ];

  const isAllowed = allowedDirs.some(dir => reportPath.startsWith(dir));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = await fs.readFile(reportPath, 'utf-8');

    // Try to parse as JSON
    try {
      const json = JSON.parse(content);
      res.json(json);
    } catch {
      res.json({ content });
    }
  } catch (error) {
    res.status(404).json({ error: 'Report not found' });
  }
});

// POST /api/lifecycle/sanitize - Run push sanitization
router.post('/sanitize', async (req, res) => {
  const { project, fix = false, verbose = false } = req.body;
  const projectPath = project ? path.join(PROJECTS_DIR, project) : process.cwd();

  const sanitizeScript = path.join(projectPath, 'scripts/sanitize-push.sh');

  try {
    await fs.access(sanitizeScript, fs.constants.X_OK);
  } catch {
    return res.status(404).json({
      success: false,
      error: 'Sanitization script not found. Run: npm run setup:hooks'
    });
  }

  try {
    const args = [];
    if (fix) args.push('--fix');
    if (verbose) args.push('--verbose');

    const cmd = `bash "${sanitizeScript}" ${args.join(' ')}`;
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: projectPath,
      timeout: 120000
    });

    const output = stdout + (stderr ? '\n' + stderr : '');
    const success = output.includes('CLEAN') && !output.includes('BLOCKED');

    res.json({
      success,
      output,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || '',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/lifecycle/dashboard - Get lifecycle dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const agentPath = path.join(AGENTS_DIR, 'AGENT-016-LIFECYCLE-MANAGER.sh');
    const { stdout } = await execAsync(`bash "${agentPath}" dashboard`, {
      timeout: 30000
    });

    res.json({
      success: true,
      output: stdout,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || ''
    });
  }
});

  return router;
}
