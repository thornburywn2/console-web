/**
 * Scan Manager Service
 * Manages lifecycle scan execution with resource controls to prevent system overload.
 *
 * Features:
 * - Concurrency limiting (queue scans to prevent parallel execution)
 * - Process priority control (nice/ionice)
 * - Memory limits
 * - CPU throttling
 * - Timeout enforcement
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Scan queue and state
let scanQueue = [];
let activeScans = 0;
let settings = null;

// Default settings (used if DB settings unavailable)
const DEFAULT_SETTINGS = {
  scanConcurrency: 1,
  scanNiceLevel: 15,
  scanIoniceClass: 3,
  scanMemoryLimitMb: 2048,
  scanTimeoutSeconds: 600,
  scanCpuLimit: 50,
  enableSecurityScans: true,
  enableQualityScans: true,
  enablePrePushPipeline: true,
  skipContainerScan: true,
  skipSastScan: false,
  skipE2eTests: true,
  skipCoverageReport: false
};

/**
 * Load scan settings from database
 */
export async function loadScanSettings(prisma) {
  try {
    const userSettings = await prisma.userSettings.findUnique({
      where: { id: 'default' }
    });

    if (userSettings) {
      settings = {
        scanConcurrency: userSettings.scanConcurrency ?? DEFAULT_SETTINGS.scanConcurrency,
        scanNiceLevel: userSettings.scanNiceLevel ?? DEFAULT_SETTINGS.scanNiceLevel,
        scanIoniceClass: userSettings.scanIoniceClass ?? DEFAULT_SETTINGS.scanIoniceClass,
        scanMemoryLimitMb: userSettings.scanMemoryLimitMb ?? DEFAULT_SETTINGS.scanMemoryLimitMb,
        scanTimeoutSeconds: userSettings.scanTimeoutSeconds ?? DEFAULT_SETTINGS.scanTimeoutSeconds,
        scanCpuLimit: userSettings.scanCpuLimit ?? DEFAULT_SETTINGS.scanCpuLimit,
        enableSecurityScans: userSettings.enableSecurityScans ?? DEFAULT_SETTINGS.enableSecurityScans,
        enableQualityScans: userSettings.enableQualityScans ?? DEFAULT_SETTINGS.enableQualityScans,
        enablePrePushPipeline: userSettings.enablePrePushPipeline ?? DEFAULT_SETTINGS.enablePrePushPipeline,
        skipContainerScan: userSettings.skipContainerScan ?? DEFAULT_SETTINGS.skipContainerScan,
        skipSastScan: userSettings.skipSastScan ?? DEFAULT_SETTINGS.skipSastScan,
        skipE2eTests: userSettings.skipE2eTests ?? DEFAULT_SETTINGS.skipE2eTests,
        skipCoverageReport: userSettings.skipCoverageReport ?? DEFAULT_SETTINGS.skipCoverageReport
      };
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }

    console.log('[ScanManager] Loaded settings:', settings);
    return settings;
  } catch (error) {
    console.error('[ScanManager] Error loading settings:', error);
    settings = { ...DEFAULT_SETTINGS };
    return settings;
  }
}

/**
 * Get current scan settings
 */
export function getScanSettings() {
  return settings || { ...DEFAULT_SETTINGS };
}

/**
 * Check if a scan type is enabled
 */
export function isScanEnabled(scanType) {
  const s = getScanSettings();

  switch (scanType) {
    case 'security':
    case 'AGENT-018-SECURITY':
      return s.enableSecurityScans;
    case 'quality':
    case 'AGENT-019-QUALITY-GATE':
      return s.enableQualityScans;
    default:
      return true;
  }
}

/**
 * Build the command wrapper with resource limits
 */
function buildResourceLimitedCommand(baseCommand, projectPath) {
  const s = getScanSettings();
  let cmd = '';

  // Add nice for CPU priority (lower priority = nicer to other processes)
  if (s.scanNiceLevel > 0) {
    cmd += `nice -n ${s.scanNiceLevel} `;
  }

  // Add ionice for I/O priority (class 3 = idle, only use I/O when system is idle)
  if (s.scanIoniceClass > 0) {
    cmd += `ionice -c ${s.scanIoniceClass} `;
  }

  // Base command
  cmd += baseCommand;

  return cmd;
}

/**
 * Build environment variables for scan execution
 */
function buildScanEnvironment(projectPath) {
  const s = getScanSettings();

  return {
    ...process.env,
    // Pass skip flags to agent scripts
    SKIP_CONTAINER_SCAN: s.skipContainerScan ? '1' : '0',
    SKIP_SAST_SCAN: s.skipSastScan ? '1' : '0',
    SKIP_E2E_TESTS: s.skipE2eTests ? '1' : '0',
    SKIP_COVERAGE: s.skipCoverageReport ? '1' : '0',
    // Memory limit (Node.js)
    NODE_OPTIONS: `--max-old-space-size=${s.scanMemoryLimitMb}`,
    // Project path
    PROJECT_PATH: projectPath,
    PROJECTS_DIR: process.env.PROJECTS_DIR || path.join(process.env.HOME, 'Projects')
  };
}

/**
 * Execute a scan with resource limiting and queueing
 */
export async function executeScan(agentScript, command, projectPath, options = {}) {
  const s = getScanSettings();
  const scanId = `scan-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  console.log(`[ScanManager] Queueing scan ${scanId}: ${path.basename(agentScript)} ${command}`);

  // Create a promise that will be resolved when the scan completes
  return new Promise((resolve, reject) => {
    const scanJob = {
      id: scanId,
      agentScript,
      command,
      projectPath,
      options,
      resolve,
      reject,
      queuedAt: Date.now()
    };

    // Add to queue
    scanQueue.push(scanJob);
    console.log(`[ScanManager] Queue length: ${scanQueue.length}, Active scans: ${activeScans}`);

    // Process queue
    processQueue();
  });
}

/**
 * Process the scan queue
 */
async function processQueue() {
  const s = getScanSettings();

  // Check if we can run more scans
  while (activeScans < s.scanConcurrency && scanQueue.length > 0) {
    const job = scanQueue.shift();
    activeScans++;

    console.log(`[ScanManager] Starting scan ${job.id} (active: ${activeScans}/${s.scanConcurrency})`);

    // Execute the scan
    runScan(job)
      .then(result => {
        activeScans--;
        job.resolve(result);
        // Process more from queue
        processQueue();
      })
      .catch(error => {
        activeScans--;
        job.reject(error);
        // Process more from queue
        processQueue();
      });
  }
}

/**
 * Run a single scan with resource limits
 */
async function runScan(job) {
  const s = getScanSettings();
  const { agentScript, command, projectPath, options } = job;
  const startTime = Date.now();

  // Build the command with resource limits
  const baseCmd = `bash "${agentScript}" ${command || ''} "${projectPath}"`;
  const fullCmd = buildResourceLimitedCommand(baseCmd, projectPath);

  console.log(`[ScanManager] Executing: ${fullCmd.substring(0, 100)}...`);

  try {
    const { stdout, stderr } = await execAsync(fullCmd, {
      timeout: s.scanTimeoutSeconds * 1000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      env: buildScanEnvironment(projectPath),
      cwd: projectPath
    });

    const duration = Date.now() - startTime;
    const output = stdout + (stderr ? '\n' + stderr : '');

    // Analyze output for success/failure
    const hasErrors = output.toLowerCase().includes('critical') ||
                     output.toLowerCase().includes('high vulnerability') ||
                     output.includes('FAILED') ||
                     output.includes('✗ BLOCKED');

    const hasWarnings = output.toLowerCase().includes('warning') ||
                       output.toLowerCase().includes('medium') ||
                       output.includes('⚠');

    console.log(`[ScanManager] Scan ${job.id} completed in ${duration}ms`);

    return {
      success: !hasErrors,
      output,
      duration,
      hasErrors,
      hasWarnings,
      scanId: job.id
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ScanManager] Scan ${job.id} failed after ${duration}ms:`, error.message);

    // Check for timeout
    if (error.killed || error.signal === 'SIGTERM') {
      return {
        success: false,
        error: `Scan timed out after ${s.scanTimeoutSeconds} seconds`,
        output: error.stdout || error.stderr || '',
        duration,
        timedOut: true,
        scanId: job.id
      };
    }

    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || '',
      duration,
      scanId: job.id
    };
  }
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  const s = getScanSettings();
  return {
    queueLength: scanQueue.length,
    activeScans,
    maxConcurrency: s.scanConcurrency,
    settings: s
  };
}

/**
 * Cancel all pending scans
 */
export function cancelPendingScans() {
  const cancelled = scanQueue.length;
  scanQueue.forEach(job => {
    job.reject(new Error('Scan cancelled'));
  });
  scanQueue = [];
  console.log(`[ScanManager] Cancelled ${cancelled} pending scans`);
  return cancelled;
}

/**
 * Check if cpulimit is available
 */
export async function checkCpuLimitAvailable() {
  try {
    await execAsync('which cpulimit');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get resource control recommendations based on system specs
 */
export async function getResourceRecommendations() {
  try {
    // Get total system memory
    const { stdout: memInfo } = await execAsync("grep MemTotal /proc/meminfo | awk '{print $2}'");
    const totalMemKb = parseInt(memInfo.trim());
    const totalMemMb = Math.floor(totalMemKb / 1024);

    // Get CPU count
    const { stdout: cpuInfo } = await execAsync('nproc');
    const cpuCount = parseInt(cpuInfo.trim());

    // Calculate recommendations
    const recommendations = {
      systemSpecs: {
        totalMemoryMb: totalMemMb,
        cpuCores: cpuCount
      },
      recommended: {
        // Use at most 25% of memory for scans
        scanMemoryLimitMb: Math.min(2048, Math.floor(totalMemMb * 0.25)),
        // Nice level: 15 is good for background tasks
        scanNiceLevel: 15,
        // I/O class 3 (idle) for minimal disk impact
        scanIoniceClass: 3,
        // CPU limit: 50% is a good balance
        scanCpuLimit: 50,
        // Only run 1 scan at a time by default
        scanConcurrency: 1,
        // 10 minute timeout
        scanTimeoutSeconds: 600,
        // Skip heavy operations by default
        skipContainerScan: true,
        skipE2eTests: true
      },
      notes: [
        `Your system has ${totalMemMb}MB RAM and ${cpuCount} CPU cores.`,
        `Recommended memory limit for scans: ${Math.floor(totalMemMb * 0.25)}MB (25% of total)`,
        'Container scanning (Trivy) builds Docker images - very resource intensive, disabled by default.',
        'E2E tests (Playwright/Cypress) spawn browser instances - also resource intensive.',
        'SAST scanning (Semgrep) analyzes all code - can use significant CPU/memory on large codebases.',
        'Run scans sequentially (concurrency=1) to prevent system overload.'
      ]
    };

    return recommendations;
  } catch (error) {
    console.error('[ScanManager] Error getting recommendations:', error);
    return {
      error: error.message,
      recommended: { ...DEFAULT_SETTINGS }
    };
  }
}

export default {
  loadScanSettings,
  getScanSettings,
  isScanEnabled,
  executeScan,
  getQueueStatus,
  cancelPendingScans,
  checkCpuLimitAvailable,
  getResourceRecommendations
};
