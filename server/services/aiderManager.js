/**
 * Aider Manager Service
 * P1 Phase 1: Aider Session Management
 *
 * Manages Aider AI coding assistant processes and sessions.
 * Features:
 * - Process lifecycle management (start, stop, restart)
 * - Multi-LLM support (Anthropic, OpenAI, Ollama)
 * - Voice mode integration via /voice command
 * - File tracking for chat context
 * - Session persistence and recovery
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import path from 'path';

// Supported AI providers and models
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', recommended: true },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', slow: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', fast: true }
    ],
    envKey: 'ANTHROPIC_API_KEY'
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', recommended: true },
      { id: 'gpt-4', name: 'GPT-4', slow: true },
      { id: 'gpt-4o', name: 'GPT-4o', fast: true },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', fast: true }
    ],
    envKey: 'OPENAI_API_KEY'
  },
  ollama: {
    name: 'Ollama (Local)',
    models: [
      { id: 'ollama/codellama', name: 'CodeLlama' },
      { id: 'ollama/deepseek-coder', name: 'DeepSeek Coder' },
      { id: 'ollama/mistral', name: 'Mistral' },
      { id: 'ollama/llama2', name: 'Llama 2' }
    ],
    envKey: null,
    local: true
  }
};

// Default configuration
const DEFAULT_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  provider: 'anthropic',
  darkMode: true,
  autoAddFiles: true,
  streamOutput: true,
  showDiffs: true,
  voiceEnabled: false
};

/**
 * Represents an active Aider session
 */
class AiderSession extends EventEmitter {
  constructor(id, projectPath, options = {}) {
    super();
    this.id = id;
    this.projectPath = projectPath;
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.process = null;
    this.status = 'stopped';
    this.filesAdded = [];
    this.history = [];
    this.startTime = null;
    this.voiceActive = false;
  }

  /**
   * Start the Aider process
   */
  async start() {
    if (this.process) {
      throw new Error('Session already running');
    }

    // Build aider command arguments
    const args = this.buildArgs();

    // Check if aider is installed
    const aiderPath = await this.findAider();

    this.status = 'starting';
    this.emit('status', 'starting');

    try {
      this.process = spawn(aiderPath, args, {
        cwd: this.projectPath,
        env: {
          ...process.env,
          // Ensure API keys are available
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY
        },
        shell: true
      });

      this.startTime = Date.now();

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        this.history.push({ type: 'stdout', data: output, timestamp: Date.now() });
        this.emit('output', output);

        // Detect voice mode status
        if (output.includes('Listening...')) {
          this.voiceActive = true;
          this.emit('voice', 'listening');
        } else if (output.includes('Voice stopped')) {
          this.voiceActive = false;
          this.emit('voice', 'stopped');
        }
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        const output = data.toString();
        this.history.push({ type: 'stderr', data: output, timestamp: Date.now() });
        this.emit('error', output);
      });

      // Handle process exit
      this.process.on('close', (code) => {
        this.status = 'stopped';
        this.process = null;
        this.voiceActive = false;
        this.emit('status', 'stopped');
        this.emit('exit', code);
      });

      this.process.on('error', (err) => {
        this.status = 'error';
        this.emit('error', err.message);
      });

      // Wait for startup
      await this.waitForReady();
      this.status = 'running';
      this.emit('status', 'running');

      return true;
    } catch (err) {
      this.status = 'error';
      this.emit('error', err.message);
      throw err;
    }
  }

  /**
   * Build aider command line arguments
   */
  buildArgs() {
    const args = [];

    // Model selection
    if (this.options.provider === 'anthropic') {
      args.push('--model', this.options.model);
    } else if (this.options.provider === 'openai') {
      args.push('--model', this.options.model);
    } else if (this.options.provider === 'ollama') {
      args.push('--model', this.options.model);
    }

    // UI options
    if (this.options.darkMode) {
      args.push('--dark-mode');
    }

    // Auto-add files
    if (!this.options.autoAddFiles) {
      args.push('--no-auto-commits');
    }

    // Stream output
    if (this.options.streamOutput) {
      args.push('--stream');
    }

    // Show diffs
    if (this.options.showDiffs) {
      args.push('--show-diffs');
    }

    // Add any pre-specified files
    if (this.filesAdded.length > 0) {
      args.push(...this.filesAdded);
    }

    return args;
  }

  /**
   * Find aider executable
   */
  async findAider() {
    // Check common locations
    const locations = [
      'aider',
      '/usr/local/bin/aider',
      path.join(process.env.HOME || '', '.local/bin/aider'),
      'python -m aider'
    ];

    for (const loc of locations) {
      try {
        const { execSync } = await import('child_process');
        execSync(`which ${loc.split(' ')[0]}`, { stdio: 'ignore' });
        return loc;
      } catch {
        continue;
      }
    }

    throw new Error('Aider not found. Install with: pip install aider-chat');
  }

  /**
   * Wait for aider to be ready
   */
  waitForReady(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Aider startup timeout'));
      }, timeout);

      const checkReady = (data) => {
        const output = data.toString();
        // Aider shows the model info when ready
        if (output.includes('Model:') || output.includes('Aider')) {
          clearTimeout(timer);
          this.process.stdout.off('data', checkReady);
          resolve();
        }
      };

      this.process.stdout.on('data', checkReady);
    });
  }

  /**
   * Send input to Aider
   */
  send(input) {
    if (!this.process || this.status !== 'running') {
      throw new Error('Session not running');
    }

    this.history.push({ type: 'input', data: input, timestamp: Date.now() });
    this.process.stdin.write(input + '\n');
    this.emit('input', input);
  }

  /**
   * Add files to the chat
   */
  addFiles(files) {
    if (!Array.isArray(files)) {
      files = [files];
    }

    for (const file of files) {
      if (!this.filesAdded.includes(file)) {
        this.filesAdded.push(file);
        if (this.status === 'running') {
          this.send(`/add ${file}`);
        }
      }
    }
  }

  /**
   * Remove files from the chat
   */
  removeFiles(files) {
    if (!Array.isArray(files)) {
      files = [files];
    }

    for (const file of files) {
      const idx = this.filesAdded.indexOf(file);
      if (idx > -1) {
        this.filesAdded.splice(idx, 1);
        if (this.status === 'running') {
          this.send(`/drop ${file}`);
        }
      }
    }
  }

  /**
   * Start voice mode
   */
  startVoice() {
    if (this.status !== 'running') {
      throw new Error('Session not running');
    }
    this.send('/voice');
  }

  /**
   * Stop voice mode (send interrupt)
   */
  stopVoice() {
    if (this.voiceActive && this.process) {
      this.process.stdin.write('\x03'); // Ctrl+C
    }
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    if (this.status === 'running') {
      this.send('/clear');
    }
    this.history = [];
  }

  /**
   * Get session info
   */
  getInfo() {
    return {
      id: this.id,
      projectPath: this.projectPath,
      status: this.status,
      model: this.options.model,
      provider: this.options.provider,
      filesAdded: this.filesAdded,
      voiceActive: this.voiceActive,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Stop the Aider process
   */
  async stop() {
    if (!this.process) return;

    // Try graceful shutdown first
    this.send('/quit');

    // Wait a bit, then force kill if needed
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (this.process) {
      this.process.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (this.process) {
        this.process.kill('SIGKILL');
      }
    }

    this.status = 'stopped';
    this.process = null;
    this.voiceActive = false;
  }
}

/**
 * Aider Manager - Manages multiple Aider sessions
 */
class AiderManager {
  constructor() {
    this.sessions = new Map();
    this.defaultConfig = { ...DEFAULT_CONFIG };
  }

  /**
   * Create a new Aider session
   */
  async createSession(projectPath, options = {}) {
    const sessionId = `aider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Verify project path exists
    if (!existsSync(projectPath)) {
      throw new Error(`Project path not found: ${projectPath}`);
    }

    const session = new AiderSession(sessionId, projectPath, {
      ...this.defaultConfig,
      ...options
    });

    this.sessions.set(sessionId, session);

    // Auto-cleanup on exit
    session.on('exit', () => {
      // Keep session for history, but mark as stopped
    });

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * List all sessions
   */
  listSessions() {
    return Array.from(this.sessions.values()).map(s => s.getInfo());
  }

  /**
   * Remove a session
   */
  async removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.stop();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Stop all sessions
   */
  async stopAll() {
    for (const session of this.sessions.values()) {
      await session.stop();
    }
  }

  /**
   * Get available providers and models
   */
  getProviders() {
    return PROVIDERS;
  }

  /**
   * Check provider availability (API keys configured)
   */
  checkProviderAvailability() {
    const availability = {};

    for (const [key, provider] of Object.entries(PROVIDERS)) {
      if (provider.local) {
        availability[key] = { available: true, reason: 'Local provider' };
      } else if (provider.envKey && process.env[provider.envKey]) {
        availability[key] = { available: true };
      } else {
        availability[key] = {
          available: false,
          reason: `Missing ${provider.envKey} environment variable`
        };
      }
    }

    return availability;
  }

  /**
   * Update default configuration
   */
  setDefaultConfig(config) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Check if Aider is installed
   */
  async checkInstallation() {
    try {
      const { execSync } = await import('child_process');
      const version = execSync('aider --version', { encoding: 'utf-8' }).trim();
      return {
        installed: true,
        version
      };
    } catch {
      return {
        installed: false,
        installCommand: 'pip install aider-chat'
      };
    }
  }
}

// Singleton instance
export const aiderManager = new AiderManager();

export default aiderManager;
