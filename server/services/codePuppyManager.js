/**
 * Code Puppy Manager Service - Full Feature Parity
 * AI-powered coding assistant integration
 *
 * Code Puppy is an open-source CLI tool for AI-assisted code generation
 * supporting multiple LLM providers, custom agents, and MCP servers.
 *
 * Full Features:
 * - Process lifecycle management (start, stop, restart)
 * - Multi-LLM support (65+ providers via models.dev)
 * - Custom agent management (JSON and Python agents)
 * - MCP server integration
 * - DBOS durable execution
 * - Configuration system (puppy.cfg)
 * - Custom slash commands
 * - Session autosave and history
 * - Message compaction strategies
 */

import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import os from 'os';

// XDG Base Directory paths
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.code_puppy');
const XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.code_puppy');
const XDG_CACHE_HOME = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.code_puppy');

// Directory paths
const CONFIG_DIR = XDG_CONFIG_HOME;
const DATA_DIR = XDG_DATA_HOME;
const CACHE_DIR = XDG_CACHE_HOME;
const AGENTS_DIR = path.join(DATA_DIR, 'agents');
const CONTEXTS_DIR = path.join(DATA_DIR, 'contexts');
const AUTOSAVE_DIR = path.join(CACHE_DIR, 'autosave');
const MCP_SERVERS_FILE = path.join(CONFIG_DIR, 'mcp_servers.json');
const PUPPY_CONFIG_FILE = path.join(CONFIG_DIR, 'puppy.cfg');
const EXTRA_MODELS_FILE = path.join(DATA_DIR, 'extra_models.json');

// Supported AI providers and models (core set - more available via models.dev)
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', recommended: true },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', slow: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', fast: true }
    ],
    envKey: 'ANTHROPIC_API_KEY'
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', recommended: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4o', name: 'GPT-4o', fast: true },
      { id: 'o1', name: 'o1 (Reasoning)', slow: true },
      { id: 'o3-mini', name: 'o3-mini', fast: true }
    ],
    envKey: 'OPENAI_API_KEY'
  },
  google: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', recommended: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', fast: true }
    ],
    envKey: 'GOOGLE_API_KEY'
  },
  cerebras: {
    name: 'Cerebras',
    models: [
      { id: 'cerebras/llama-4-scout-17b', name: 'Llama 4 Scout 17B', fast: true },
      { id: 'cerebras/llama3.3-70b', name: 'Llama 3.3 70B' }
    ],
    envKey: 'CEREBRAS_API_KEY'
  },
  groq: {
    name: 'Groq',
    models: [
      { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B', fast: true },
      { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
    ],
    envKey: 'GROQ_API_KEY'
  },
  openrouter: {
    name: 'OpenRouter',
    models: [
      { id: 'openrouter/auto', name: 'Auto (Best Available)', recommended: true },
      { id: 'openrouter/anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openrouter/openai/gpt-4-turbo', name: 'GPT-4 Turbo' }
    ],
    envKey: 'OPENROUTER_API_KEY'
  },
  ollama: {
    name: 'Ollama (Local)',
    models: [
      { id: 'ollama/codellama', name: 'CodeLlama' },
      { id: 'ollama/deepseek-coder', name: 'DeepSeek Coder' },
      { id: 'ollama/qwen2.5-coder', name: 'Qwen 2.5 Coder' },
      { id: 'ollama/llama3.2', name: 'Llama 3.2' }
    ],
    envKey: null,
    local: true
  }
};

// Available tools for agents
const AVAILABLE_TOOLS = [
  { name: 'list_files', description: 'List files in a directory' },
  { name: 'read_file', description: 'Read contents of a file' },
  { name: 'grep', description: 'Search for patterns in files' },
  { name: 'edit_file', description: 'Edit or create a file' },
  { name: 'delete_file', description: 'Delete a file' },
  { name: 'agent_run_shell_command', description: 'Execute shell commands' },
  { name: 'agent_share_your_reasoning', description: 'Share reasoning with user' }
];

// Slash commands available in Code Puppy
const SLASH_COMMANDS = [
  { command: '/agent', description: 'View or switch agents', usage: '/agent [agent-name]' },
  { command: '/model', description: 'View or switch models', usage: '/model [model-id]' },
  { command: '/add_model', description: 'Browse and add models from 65+ providers', usage: '/add_model' },
  { command: '/mcp', description: 'Manage MCP servers', usage: '/mcp [list|start|stop|status]' },
  { command: '/set', description: 'Change configuration settings', usage: '/set <key> <value>' },
  { command: '/truncate', description: 'Keep only N recent messages', usage: '/truncate <N>' },
  { command: '/clear', description: 'Clear conversation history', usage: '/clear' },
  { command: '/save', description: 'Save current session', usage: '/save [filename]' },
  { command: '/load', description: 'Load a saved session', usage: '/load <filename>' },
  { command: '/exit', description: 'Exit Code Puppy', usage: '/exit' },
  { command: '/help', description: 'Show available commands', usage: '/help' }
];

// Default configuration matching Code Puppy defaults
const DEFAULT_CONFIG = {
  // Core settings
  puppy_name: 'Code Puppy',
  owner_name: os.userInfo().username,
  default_agent: 'code-puppy',
  model: 'claude-sonnet-4-20250514',

  // Session settings
  auto_save_session: true,
  max_saved_sessions: 20,

  // Reasoning settings
  openai_reasoning_effort: 'medium',
  openai_verbosity: 'medium',
  suppress_thinking_messages: false,
  suppress_informational_messages: false,

  // Message compaction
  protected_token_count: 50000,
  compaction_threshold: 0.85,
  compaction_strategy: 'truncation',
  message_limit: 1000,

  // Safety settings
  yolo_mode: true,
  allow_recursion: true,
  safety_permission_level: 'medium',

  // Display settings
  diff_context_lines: 6,
  highlight_addition_color: '#0b1f0b',
  highlight_deletion_color: '#390e1a',

  // Advanced features
  enable_dbos: false,
  disable_mcp: false,
  http2: false,
  grep_output_verbose: false,
  subagent_verbose: false,

  // Frontend settings
  frontend_emitter_enabled: true,
  frontend_emitter_max_recent_events: 100,
  frontend_emitter_queue_size: 100
};

/**
 * Represents an active Code Puppy session with full feature support
 */
class CodePuppySession extends EventEmitter {
  constructor(id, projectPath, options = {}) {
    super();
    this.id = id;
    this.projectPath = projectPath;
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.process = null;
    this.status = 'stopped';
    this.history = [];
    this.startTime = null;
    this.currentAgent = this.options.default_agent || 'code-puppy';
    this.currentModel = this.options.model;
    this.mcpServers = [];
    this.dbosEnabled = this.options.enable_dbos;
  }

  /**
   * Find uvx executable path
   */
  findUvx() {
    const uvxPaths = [
      'uvx',
      path.join(os.homedir(), '.local/bin/uvx'),
      '/usr/local/bin/uvx',
      path.join(os.homedir(), '.cargo/bin/uvx')
    ];

    for (const uvxPath of uvxPaths) {
      try {
        execSync(`${uvxPath} --version`, { stdio: 'ignore' });
        return uvxPath;
      } catch {
        continue;
      }
    }
    throw new Error('UV/uvx not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh');
  }

  /**
   * Start the Code Puppy process
   */
  async start() {
    if (this.process) {
      throw new Error('Session already running');
    }

    this.status = 'starting';
    this.emit('status', 'starting');

    try {
      const args = this.buildArgs();
      const command = this.findUvx();
      const fullArgs = ['code-puppy', ...args];

      // Set up environment with all API keys
      const env = {
        ...process.env,
        PATH: `${path.join(os.homedir(), '.local/bin')}:${process.env.PATH}`,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        XAI_API_KEY: process.env.XAI_API_KEY,
        AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
        AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT
      };

      this.process = spawn(command, fullArgs, {
        cwd: this.projectPath,
        env,
        shell: false
      });

      this.startTime = Date.now();

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        this.history.push({ type: 'stdout', data: output, timestamp: Date.now() });
        this.emit('output', output);

        // Parse output for state changes
        this.parseOutput(output);
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
   * Parse output for state changes
   */
  parseOutput(output) {
    // Detect agent changes
    if (output.includes('Switched to agent:')) {
      const match = output.match(/Switched to agent:\s*(\S+)/);
      if (match) {
        this.currentAgent = match[1];
        this.emit('agent-changed', this.currentAgent);
      }
    }

    // Detect model changes
    if (output.includes('Using model:') || output.includes('Model:')) {
      const match = output.match(/(?:Using model:|Model:)\s*(\S+)/);
      if (match) {
        this.currentModel = match[1];
        this.emit('model-changed', this.currentModel);
      }
    }
  }

  /**
   * Build command line arguments
   */
  buildArgs() {
    const args = [];

    // Interactive mode
    args.push('-i');

    // Model selection
    if (this.options.model) {
      args.push('--model', this.options.model);
    }

    // Agent selection
    if (this.options.default_agent && this.options.default_agent !== 'code-puppy') {
      args.push('--agent', this.options.default_agent);
    }

    return args;
  }

  /**
   * Wait for Code Puppy to be ready
   */
  waitForReady(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Code Puppy startup timeout'));
      }, timeout);

      const checkReady = (data) => {
        const output = data.toString();
        // Code Puppy shows prompt or banner when ready
        if (output.includes('>>>') || output.includes('Code-Puppy') ||
            output.includes('🐕') || output.includes('Ready')) {
          clearTimeout(timer);
          this.process.stdout.off('data', checkReady);
          resolve();
        }
      };

      this.process.stdout.on('data', checkReady);
    });
  }

  /**
   * Send input to Code Puppy
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
   * Execute a slash command
   */
  executeCommand(command, ...args) {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
    this.send(fullCommand);
  }

  /**
   * Switch agent
   */
  switchAgent(agentName) {
    this.executeCommand('/agent', agentName);
  }

  /**
   * Switch model
   */
  switchModel(modelId) {
    this.executeCommand('/model', modelId);
  }

  /**
   * Truncate message history
   */
  truncateHistory(keepCount = 10) {
    this.executeCommand('/truncate', keepCount.toString());
  }

  /**
   * Clear conversation
   */
  clearConversation() {
    this.executeCommand('/clear');
  }

  /**
   * Set configuration option
   */
  setConfig(key, value) {
    this.executeCommand('/set', key, value);
  }

  /**
   * Enable/disable DBOS
   */
  setDbos(enabled) {
    this.dbosEnabled = enabled;
    this.setConfig('enable_dbos', enabled ? 'true' : 'false');
  }

  /**
   * Get session info
   */
  getInfo() {
    return {
      id: this.id,
      projectPath: this.projectPath,
      status: this.status,
      model: this.currentModel,
      agent: this.currentAgent,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      historyLength: this.history.length,
      dbosEnabled: this.dbosEnabled,
      mcpServers: this.mcpServers
    };
  }

  /**
   * Stop the Code Puppy process
   */
  async stop() {
    if (!this.process) return;

    try {
      this.executeCommand('/exit');
    } catch {
      // Ignore if can't send
    }

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
  }
}

/**
 * Code Puppy Manager - Full Feature Parity
 */
class CodePuppyManager {
  constructor() {
    this.sessions = new Map();
    this.config = { ...DEFAULT_CONFIG };
    this.ensureDirectories();
    this.loadConfig();
  }

  /**
   * Ensure all directories exist
   */
  ensureDirectories() {
    const dirs = [CONFIG_DIR, DATA_DIR, CACHE_DIR, AGENTS_DIR, CONTEXTS_DIR, AUTOSAVE_DIR];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Load configuration from puppy.cfg
   */
  loadConfig() {
    if (existsSync(PUPPY_CONFIG_FILE)) {
      try {
        const content = readFileSync(PUPPY_CONFIG_FILE, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            this.config[key.trim()] = this.parseConfigValue(value);
          }
        }
      } catch {
        // Use defaults if config can't be loaded
      }
    }
  }

  /**
   * Parse config value to appropriate type
   */
  parseConfigValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  /**
   * Save configuration to puppy.cfg
   */
  saveConfig() {
    const lines = Object.entries(this.config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    writeFileSync(PUPPY_CONFIG_FILE, lines);
  }

  /**
   * Get configuration value
   */
  getConfigValue(key) {
    return this.config[key];
  }

  /**
   * Set configuration value
   */
  setConfigValue(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * Get full configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update multiple config values
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Check if Code Puppy is installed
   */
  async checkInstallation() {
    try {
      const uvPaths = [
        'uv',
        path.join(os.homedir(), '.local/bin/uv'),
        '/usr/local/bin/uv'
      ];

      let uvPath = null;
      let uvVersion = 'unknown';
      for (const testPath of uvPaths) {
        try {
          uvVersion = execSync(`${testPath} --version`, { encoding: 'utf-8' }).trim();
          uvPath = testPath;
          break;
        } catch {
          continue;
        }
      }

      if (!uvPath) {
        throw new Error('UV not found');
      }

      const uvxPath = uvPath.replace(/\/uv$/, '/uvx');

      let codePuppyVersion = 'unknown';
      try {
        const output = execSync(`${uvxPath} code-puppy --version 2>&1`, {
          encoding: 'utf-8',
          timeout: 15000
        }).trim();
        codePuppyVersion = output;
      } catch {
        codePuppyVersion = 'available via uvx';
      }

      return {
        installed: true,
        uvVersion,
        uvPath,
        uvxPath,
        codePuppyVersion,
        configDir: CONFIG_DIR,
        dataDir: DATA_DIR,
        agentsDir: AGENTS_DIR,
        configFile: PUPPY_CONFIG_FILE,
        mcpServersFile: MCP_SERVERS_FILE
      };
    } catch (err) {
      return {
        installed: false,
        error: err.message,
        installInstructions: {
          uv: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
          codePuppy: 'uvx code-puppy (runs without explicit install)'
        }
      };
    }
  }

  /**
   * Install UV package manager
   */
  async installUv() {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', 'curl -LsSf https://astral.sh/uv/install.sh | sh'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', (data) => { output += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(`Installation failed: ${output}`));
        }
      });
    });
  }

  /**
   * Create a new Code Puppy session
   */
  async createSession(projectPath, options = {}) {
    const sessionId = `puppy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!existsSync(projectPath)) {
      throw new Error(`Project path not found: ${projectPath}`);
    }

    const session = new CodePuppySession(sessionId, projectPath, {
      ...this.config,
      ...options
    });

    this.sessions.set(sessionId, session);

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
   * Get available tools
   */
  getAvailableTools() {
    return AVAILABLE_TOOLS;
  }

  /**
   * Get slash commands
   */
  getSlashCommands() {
    return SLASH_COMMANDS;
  }

  // ============================================
  // Agent Management
  // ============================================

  /**
   * List all agents (built-in and custom)
   */
  listAgents() {
    const agents = [
      {
        name: 'code-puppy',
        displayName: 'Code-Puppy 🐕',
        description: 'General-purpose coding assistant with personality',
        builtin: true
      },
      {
        name: 'agent-creator',
        displayName: 'Agent Creator 🏗️',
        description: 'Tool for building custom agents',
        builtin: true
      }
    ];

    // Scan for custom JSON agents
    try {
      const files = readdirSync(AGENTS_DIR);
      for (const file of files) {
        if (file.endsWith('-agent.json')) {
          try {
            const content = readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
            const agent = JSON.parse(content);
            agents.push({
              name: agent.name,
              displayName: agent.display_name || agent.name,
              description: agent.description || 'Custom agent',
              systemPrompt: agent.system_prompt,
              tools: agent.tools || [],
              builtin: false,
              file
            });
          } catch {
            // Skip invalid agent files
          }
        }
      }
    } catch {
      // Agents dir may not exist yet
    }

    return agents;
  }

  /**
   * Get agent details
   */
  getAgent(name) {
    const agents = this.listAgents();
    return agents.find(a => a.name === name);
  }

  /**
   * Get agent file content (for custom agents)
   */
  getAgentFile(name) {
    const filename = `${name}-agent.json`;
    const filepath = path.join(AGENTS_DIR, filename);

    if (!existsSync(filepath)) {
      return null;
    }

    return JSON.parse(readFileSync(filepath, 'utf-8'));
  }

  /**
   * Create a custom agent
   */
  createAgent(agentConfig) {
    const required = ['name', 'description', 'system_prompt', 'tools'];
    for (const field of required) {
      if (!agentConfig[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate name format (kebab-case)
    if (!/^[a-z][a-z0-9-]*$/.test(agentConfig.name)) {
      throw new Error('Agent name must be kebab-case (e.g., my-agent)');
    }

    // Validate tools
    const validToolNames = AVAILABLE_TOOLS.map(t => t.name);
    for (const tool of agentConfig.tools) {
      if (!validToolNames.includes(tool)) {
        throw new Error(`Invalid tool: ${tool}. Available: ${validToolNames.join(', ')}`);
      }
    }

    const filename = `${agentConfig.name}-agent.json`;
    const filepath = path.join(AGENTS_DIR, filename);

    writeFileSync(filepath, JSON.stringify(agentConfig, null, 2));

    return {
      success: true,
      path: filepath,
      agent: agentConfig
    };
  }

  /**
   * Update a custom agent
   */
  updateAgent(name, updates) {
    const existing = this.getAgentFile(name);
    if (!existing) {
      throw new Error(`Agent not found: ${name}`);
    }

    const updated = { ...existing, ...updates };
    const filepath = path.join(AGENTS_DIR, `${name}-agent.json`);
    writeFileSync(filepath, JSON.stringify(updated, null, 2));

    return { success: true, agent: updated };
  }

  /**
   * Delete a custom agent
   */
  deleteAgent(name) {
    const filename = `${name}-agent.json`;
    const filepath = path.join(AGENTS_DIR, filename);

    if (!existsSync(filepath)) {
      throw new Error(`Agent not found: ${name}`);
    }

    unlinkSync(filepath);
    return { success: true };
  }

  // ============================================
  // MCP Server Management
  // ============================================

  /**
   * Get MCP servers configuration
   */
  getMcpServers() {
    if (existsSync(MCP_SERVERS_FILE)) {
      try {
        return JSON.parse(readFileSync(MCP_SERVERS_FILE, 'utf-8'));
      } catch {
        return {};
      }
    }
    return {};
  }

  /**
   * Save MCP servers configuration
   */
  saveMcpServers(servers) {
    writeFileSync(MCP_SERVERS_FILE, JSON.stringify(servers, null, 2));
  }

  /**
   * Add an MCP server
   */
  addMcpServer(serverConfig) {
    const servers = this.getMcpServers();
    servers[serverConfig.name] = {
      command: serverConfig.command,
      args: serverConfig.args || [],
      env: serverConfig.env || {}
    };
    this.saveMcpServers(servers);
    return { success: true, servers };
  }

  /**
   * Remove an MCP server
   */
  removeMcpServer(name) {
    const servers = this.getMcpServers();
    delete servers[name];
    this.saveMcpServers(servers);
    return { success: true };
  }

  // ============================================
  // Extra Models Management
  // ============================================

  /**
   * Get extra models configuration
   */
  getExtraModels() {
    if (existsSync(EXTRA_MODELS_FILE)) {
      try {
        return JSON.parse(readFileSync(EXTRA_MODELS_FILE, 'utf-8'));
      } catch {
        return {};
      }
    }
    return {};
  }

  /**
   * Add extra model configuration
   */
  addExtraModel(modelConfig) {
    const models = this.getExtraModels();
    models[modelConfig.name] = {
      type: modelConfig.type || 'openai',
      custom_endpoint: modelConfig.endpoint ? { url: modelConfig.endpoint } : undefined
    };
    writeFileSync(EXTRA_MODELS_FILE, JSON.stringify(models, null, 2));
    return { success: true, models };
  }

  /**
   * Remove extra model
   */
  removeExtraModel(name) {
    const models = this.getExtraModels();
    delete models[name];
    writeFileSync(EXTRA_MODELS_FILE, JSON.stringify(models, null, 2));
    return { success: true };
  }

  // ============================================
  // Custom Commands
  // ============================================

  /**
   * Get custom commands from various directories
   */
  getCustomCommands(projectPath = null) {
    const commands = [];

    const commandDirs = [
      path.join(os.homedir(), '.claude/commands'),
      path.join(os.homedir(), '.github/prompts'),
      path.join(os.homedir(), '.agents/commands')
    ];

    if (projectPath) {
      commandDirs.push(
        path.join(projectPath, '.claude/commands'),
        path.join(projectPath, '.github/prompts'),
        path.join(projectPath, '.agents/commands')
      );
    }

    for (const dir of commandDirs) {
      if (existsSync(dir)) {
        try {
          const files = readdirSync(dir);
          for (const file of files) {
            if (file.endsWith('.md')) {
              const commandName = file.replace('.md', '');
              commands.push({
                name: `/${commandName}`,
                source: dir,
                file: path.join(dir, file)
              });
            }
          }
        } catch {
          // Skip inaccessible directories
        }
      }
    }

    return commands;
  }

  // ============================================
  // Autosave Management
  // ============================================

  /**
   * List autosaved sessions
   */
  listAutosaves() {
    const autosaves = [];

    if (existsSync(AUTOSAVE_DIR)) {
      try {
        const files = readdirSync(AUTOSAVE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = readFileSync(path.join(AUTOSAVE_DIR, file), 'utf-8');
              const session = JSON.parse(content);
              autosaves.push({
                filename: file,
                ...session
              });
            } catch {
              // Skip invalid files
            }
          }
        }
      } catch {
        // Skip if dir not accessible
      }
    }

    return autosaves.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  /**
   * Delete an autosave
   */
  deleteAutosave(filename) {
    const filepath = path.join(AUTOSAVE_DIR, filename);
    if (existsSync(filepath)) {
      unlinkSync(filepath);
      return { success: true };
    }
    throw new Error('Autosave not found');
  }
}

// Singleton instance
export const codePuppyManager = new CodePuppyManager();

export default codePuppyManager;
