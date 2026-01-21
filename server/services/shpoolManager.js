/**
 * Shpool Session Manager Service
 * Functions for managing shpool terminal sessions with node-pty
 */

import { execSync } from 'child_process';
import { spawn } from 'node-pty';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import os from 'os';
import { createLogger } from './logger.js';
import { validateSessionName } from '../utils/validators.js';

const log = createLogger('shpool');
const sessionLog = createLogger('session');

/**
 * Generate a safe shpool session name from project path
 * @param {string} projectPath - Full path to the project
 * @returns {string} Safe session name with sp- prefix
 */
export function getSessionName(projectPath) {
  const name = basename(projectPath);
  // Replace any non-alphanumeric characters with underscore
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sp-${safeName}`;
}

/**
 * Check if a shpool session exists
 * @param {string} sessionName - Session name to check
 * @returns {boolean} True if session exists
 */
export function shpoolSessionExists(sessionName) {
  // Validate session name to prevent command injection
  const validName = validateSessionName(sessionName);
  if (!validName) {
    log.warn({ sessionName }, 'invalid session name rejected');
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
 * @returns {string[]} Array of session names with sp- prefix
 */
export function listShpoolSessions() {
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
 * Build the AI command based on solution preference
 * @param {Object} config - Configuration options
 * @param {string} config.aiSolution - AI solution to use
 * @param {boolean} config.skipPermissions - Skip permission checks
 * @param {string} config.codePuppyModel - Code Puppy model
 * @param {string} config.codePuppyProvider - Code Puppy provider
 * @param {string} config.hybridMode - Hybrid mode configuration
 * @param {string} config.projectPath - Project path
 * @param {string} config.openCodeModel - OpenCode model
 * @param {string} config.openCodeProvider - OpenCode provider
 * @returns {string} The command to run
 */
export function buildAICommand(config) {
  const {
    aiSolution,
    skipPermissions,
    codePuppyModel,
    codePuppyProvider,
    hybridMode,
    projectPath,
    openCodeModel,
    openCodeProvider
  } = config;

  // Path to uvx (may be in ~/.local/bin)
  const uvxPath = join(os.homedir(), '.local/bin/uvx');
  const uvxCmd = existsSync(uvxPath) ? uvxPath : 'uvx';

  switch (aiSolution) {
    case 'opencode': {
      // OpenCode - open-source multi-provider AI coding agent
      // Supports: anthropic, openai, google, local models
      let cmd = 'opencode';

      // If model is specified in provider/model format (e.g., "anthropic/claude-sonnet-4-20250514")
      if (openCodeModel) {
        if (openCodeProvider && !openCodeModel.includes('/')) {
          // Combine provider and model
          cmd += ` -m ${openCodeProvider}/${openCodeModel}`;
        } else {
          cmd += ` -m ${openCodeModel}`;
        }
      } else if (openCodeProvider) {
        // Just provider, use default model for that provider
        cmd += ` -m ${openCodeProvider}/`;
      }

      return cmd;
    }

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

        // Build command that syncs MCP config before launching
        let cmd = `${uvxCmd} code-puppy -i`;
        if (codePuppyModel) {
          cmd += ` -m ${codePuppyModel}`;
        }

        // If Claude MCP config exists, we can sync it (done on first run)
        if (existsSync(claudeMcpConfig)) {
          // The sync is handled by the Code Puppy dashboard or can be done manually
          log.debug('hybrid mode: Claude MCP config available for sync');
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
 * Create or attach to a shpool session with node-pty
 * Shpool provides session persistence with raw byte passthrough - no terminal
 * multiplexing overhead, native scrollback/clipboard work automatically
 * @param {string} projectPath - Path to the project directory
 * @param {Object} options - Additional options
 * @param {boolean} options.skipPermissions - Start Claude with --dangerously-skip-permissions
 * @param {string} options.aiSolution - AI solution to use: 'claude-code', 'code-puppy', 'hybrid'
 * @param {string} options.codePuppyModel - Default model for Code Puppy
 * @param {string} options.codePuppyProvider - Default provider for Code Puppy
 * @param {string} options.hybridMode - Hybrid mode configuration
 * @param {string} options.openCodeProvider - OpenCode provider
 * @param {string} options.openCodeModel - OpenCode model
 * @returns {Object} Session info with pty, sessionName, projectPath, aiSolution, isNew
 */
export function createPtySession(projectPath, options = {}) {
  const {
    skipPermissions = false,
    aiSolution = 'claude-code',
    codePuppyModel,
    codePuppyProvider,
    hybridMode = 'code-puppy-with-claude-tools',
    openCodeProvider,
    openCodeModel
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
          projectPath,
          openCodeProvider,
          openCodeModel
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
 * Create or attach to a PTY session for a specific tab
 * This allows multiple PTY sessions per project (one per tab)
 * @param {string} tabSessionName - The sessionName from the database (e.g., sp-console-web-1)
 * @param {string} projectPath - The project working directory
 * @param {Object} options - Session options
 * @returns {Object|null} Session info or null if invalid
 */
export function createPtySessionForTab(tabSessionName, projectPath, options = {}) {
  const {
    skipPermissions = false,
    aiSolution = 'claude-code',
    codePuppyModel,
    codePuppyProvider,
    hybridMode = 'code-puppy-with-claude-tools',
    openCodeProvider,
    openCodeModel
  } = options;

  // Validate the session name
  const validSessionName = validateSessionName(tabSessionName);
  if (!validSessionName) {
    sessionLog.error({ tabSessionName }, 'invalid tab session name');
    return null;
  }

  const sessionExists = shpoolSessionExists(validSessionName);

  // Shpool attach creates session if it doesn't exist, attaches if it does
  const shpoolArgs = ['attach', validSessionName];

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
          projectPath,
          openCodeProvider,
          openCodeModel
        });
        ptyProcess.write(`${aiCmd}\r`);
      }, 100);
    }, 300);
  }

  return {
    pty: ptyProcess,
    sessionName: validSessionName,
    projectPath,
    aiSolution,
    isNew: !sessionExists
  };
}

export default {
  getSessionName,
  shpoolSessionExists,
  listShpoolSessions,
  buildAICommand,
  createPtySession,
  createPtySessionForTab,
};
