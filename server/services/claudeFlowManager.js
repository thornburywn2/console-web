/**
 * Claude Flow Manager Service
 * P3 Phase 1: Claude Flow Multi-Agent Management
 *
 * Manages Claude Flow installation, swarm orchestration, and agent coordination.
 * Features:
 * - Installation verification and guidance
 * - Swarm session management
 * - Agent coordination and monitoring
 * - Task distribution
 */

import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';

// Claude Flow configuration
const CLAUDE_FLOW_CONFIG = {
  packageName: '@anthropics/claude-flow',
  configDir: '.claude-flow',
  defaultAgents: {
    orchestrator: {
      role: 'orchestrator',
      description: 'Coordinates tasks between agents',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7
    },
    coder: {
      role: 'coder',
      description: 'Writes and modifies code',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3
    },
    reviewer: {
      role: 'reviewer',
      description: 'Reviews code and suggests improvements',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.5
    },
    tester: {
      role: 'tester',
      description: 'Creates and runs tests',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3
    },
    researcher: {
      role: 'researcher',
      description: 'Researches documentation and best practices',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7
    }
  }
};

/**
 * Represents an active Claude Flow swarm
 */
class SwarmSession extends EventEmitter {
  constructor(id, projectPath, options = {}) {
    super();
    this.id = id;
    this.projectPath = projectPath;
    this.options = options;
    this.status = 'stopped';
    this.agents = [];
    this.tasks = [];
    this.process = null;
    this.startTime = null;
    this.output = [];
  }

  /**
   * Start the swarm
   */
  async start() {
    if (this.status === 'running') {
      throw new Error('Swarm already running');
    }

    this.status = 'starting';
    this.emit('status', 'starting');
    this.startTime = Date.now();

    try {
      // Build command
      const args = ['claude-flow', 'swarm'];

      // Add agent configuration
      if (this.options.agents?.length > 0) {
        args.push('--agents', this.options.agents.join(','));
      }

      // Add task if provided
      if (this.options.task) {
        args.push('--task', this.options.task);
      }

      // Add model override
      if (this.options.model) {
        args.push('--model', this.options.model);
      }

      this.process = spawn('npx', args, {
        cwd: this.projectPath,
        shell: true,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        }
      });

      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        this.output.push({ type: 'stdout', data: output, timestamp: Date.now() });
        this.emit('output', output);
        this.parseOutput(output);
      });

      this.process.stderr.on('data', (data) => {
        const output = data.toString();
        this.output.push({ type: 'stderr', data: output, timestamp: Date.now() });
        this.emit('error', output);
      });

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

      this.status = 'running';
      this.emit('status', 'running');

      return { success: true, id: this.id };
    } catch (err) {
      this.status = 'error';
      throw err;
    }
  }

  /**
   * Parse output for agent/task status updates
   */
  parseOutput(output) {
    // Parse agent activity
    const agentMatch = output.match(/\[Agent: (\w+)\]/);
    if (agentMatch) {
      const agent = agentMatch[1];
      this.emit('agent-activity', { agent, output });
    }

    // Parse task completion
    if (output.includes('Task completed')) {
      this.emit('task-complete', output);
    }

    // Parse errors
    if (output.includes('Error') || output.includes('error')) {
      this.emit('swarm-error', output);
    }
  }

  /**
   * Send a message to the swarm
   */
  send(message) {
    if (!this.process || this.status !== 'running') {
      throw new Error('Swarm not running');
    }

    this.process.stdin.write(message + '\n');
    this.emit('input', message);
  }

  /**
   * Add a task to the swarm
   */
  addTask(task) {
    this.tasks.push({
      id: Date.now(),
      description: task,
      status: 'pending',
      createdAt: new Date()
    });

    if (this.status === 'running') {
      this.send(`@orchestrator new task: ${task}`);
    }

    this.emit('task-added', task);
  }

  /**
   * Get session info
   */
  getInfo() {
    return {
      id: this.id,
      projectPath: this.projectPath,
      status: this.status,
      agents: this.agents,
      tasks: this.tasks,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      outputLength: this.output.length
    };
  }

  /**
   * Stop the swarm
   */
  async stop() {
    if (!this.process) return;

    // Try graceful shutdown
    this.process.stdin.write('exit\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

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
 * Claude Flow Manager
 */
class ClaudeFlowManager extends EventEmitter {
  constructor() {
    super();
    this.swarms = new Map();
    this.defaultConfig = {
      model: 'claude-3-5-sonnet-20241022',
      agents: ['orchestrator', 'coder', 'reviewer']
    };
  }

  /**
   * Check if Claude Flow is installed
   */
  async checkInstallation() {
    return new Promise((resolve) => {
      exec('npx claude-flow --version', (error, stdout, stderr) => {
        if (error) {
          resolve({
            installed: false,
            reason: 'Claude Flow not found',
            installCommand: 'npm install -g @anthropics/claude-flow'
          });
        } else {
          resolve({
            installed: true,
            version: stdout.trim()
          });
        }
      });
    });
  }

  /**
   * Install Claude Flow
   */
  async install(global = true) {
    return new Promise((resolve, reject) => {
      const cmd = global
        ? 'npm install -g @anthropics/claude-flow'
        : 'npm install @anthropics/claude-flow';

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve({
            success: true,
            output: stdout
          });
        }
      });
    });
  }

  /**
   * Initialize Claude Flow in a project
   */
  async initProject(projectPath) {
    const configDir = path.join(projectPath, CLAUDE_FLOW_CONFIG.configDir);

    // Create config directory
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Create default configuration
    const config = {
      version: '1.0.0',
      agents: CLAUDE_FLOW_CONFIG.defaultAgents,
      model: this.defaultConfig.model,
      maxConcurrentAgents: 3,
      timeout: 300000
    };

    const configPath = path.join(configDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      configPath,
      config
    };
  }

  /**
   * Load project configuration
   */
  loadProjectConfig(projectPath) {
    const configPath = path.join(projectPath, CLAUDE_FLOW_CONFIG.configDir, 'config.json');

    if (!existsSync(configPath)) {
      return null;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Create a new swarm session
   */
  async createSwarm(projectPath, options = {}) {
    const id = `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Merge with defaults
    const swarmOptions = {
      ...this.defaultConfig,
      ...options
    };

    const swarm = new SwarmSession(id, projectPath, swarmOptions);
    this.swarms.set(id, swarm);

    // Forward events
    swarm.on('status', (status) => this.emit(`swarm:${id}:status`, status));
    swarm.on('output', (output) => this.emit(`swarm:${id}:output`, output));
    swarm.on('error', (error) => this.emit(`swarm:${id}:error`, error));
    swarm.on('agent-activity', (activity) => this.emit(`swarm:${id}:agent`, activity));
    swarm.on('task-complete', (result) => this.emit(`swarm:${id}:task-complete`, result));

    return swarm;
  }

  /**
   * Get a swarm by ID
   */
  getSwarm(id) {
    return this.swarms.get(id);
  }

  /**
   * List all swarms
   */
  listSwarms() {
    return Array.from(this.swarms.values()).map(s => s.getInfo());
  }

  /**
   * Remove a swarm
   */
  async removeSwarm(id) {
    const swarm = this.swarms.get(id);
    if (swarm) {
      await swarm.stop();
      this.swarms.delete(id);
    }
  }

  /**
   * Stop all swarms
   */
  async stopAll() {
    for (const swarm of this.swarms.values()) {
      await swarm.stop();
    }
  }

  /**
   * Get available agent roles
   */
  getAgentRoles() {
    return CLAUDE_FLOW_CONFIG.defaultAgents;
  }

  /**
   * Update default configuration
   */
  setDefaultConfig(config) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get templates for common swarm configurations
   */
  getSwarmTemplates() {
    return {
      'code-review': {
        name: 'Code Review',
        description: 'Review code and suggest improvements',
        agents: ['reviewer', 'coder'],
        task: 'Review the codebase and suggest improvements'
      },
      'feature-development': {
        name: 'Feature Development',
        description: 'Develop a new feature with full TDD',
        agents: ['orchestrator', 'coder', 'tester', 'reviewer'],
        task: 'Implement a new feature following TDD practices'
      },
      'bug-fixing': {
        name: 'Bug Fixing',
        description: 'Find and fix bugs in the codebase',
        agents: ['orchestrator', 'coder', 'tester'],
        task: 'Identify and fix bugs in the project'
      },
      'refactoring': {
        name: 'Refactoring',
        description: 'Refactor code for better maintainability',
        agents: ['orchestrator', 'coder', 'reviewer'],
        task: 'Refactor the codebase for improved architecture'
      },
      'documentation': {
        name: 'Documentation',
        description: 'Generate or update documentation',
        agents: ['researcher', 'coder'],
        task: 'Update project documentation'
      },
      'research': {
        name: 'Research',
        description: 'Research best practices and solutions',
        agents: ['researcher', 'orchestrator'],
        task: 'Research best practices for the current project'
      }
    };
  }

  /**
   * Run a quick single-agent task
   */
  async runQuickTask(projectPath, task, role = 'coder') {
    return new Promise((resolve, reject) => {
      const args = ['claude-flow', 'run', '--role', role, '--task', task];

      const proc = spawn('npx', args, {
        cwd: projectPath,
        shell: true,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        }
      });

      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(error || 'Task failed'));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }
}

// Singleton instance
export const claudeFlowManager = new ClaudeFlowManager();

export default claudeFlowManager;
