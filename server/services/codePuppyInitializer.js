/**
 * Code Puppy Initializer
 *
 * Auto-configures Code Puppy on first launch to match Claude Code setup:
 * - Syncs MCP servers from Claude's configuration
 * - Sets recommended default model and provider
 * - Creates ~/.code_puppy/ directory structure
 * - Updates UserSettings with Code Puppy preferences
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { codePuppyManager } from './codePuppyManager.js';
import { createLogger } from './logger.js';

const log = createLogger('code-puppy-init');

export class CodePuppyInitializer {
  constructor(prisma) {
    this.prisma = prisma;
    this.homeDir = os.homedir();
    this.codePuppyDir = join(this.homeDir, '.code_puppy');

    // Possible locations for Claude Code MCP configuration
    this.claudeConfigPaths = [
      // Claude Desktop App
      join(this.homeDir, '.claude', 'claude_desktop_config.json'),
      join(this.homeDir, '.config', 'claude', 'claude_desktop_config.json'),
      // VSCode extension (Claude Code)
      join(this.homeDir, '.config', 'Code', 'User', 'globalStorage', 'anthropic.claude-code', 'mcp.json'),
      join(this.homeDir, '.config', 'Code - OSS', 'User', 'globalStorage', 'anthropic.claude-code', 'mcp.json'),
      join(this.homeDir, '.vscode', 'extensions', 'anthropic.claude-code', 'mcp.json'),
      // Fallback locations
      join(this.homeDir, '.mcp.json'),
      join(this.homeDir, '.config', 'mcp.json'),
    ];
  }

  /**
   * Check if Code Puppy has been initialized
   */
  async isInitialized() {
    try {
      const settings = await this.prisma.userSettings.findUnique({
        where: { id: 'default' }
      });

      // Check if Code Puppy settings exist
      return Boolean(
        settings?.preferredAISolution &&
        settings?.codePuppyProvider &&
        settings?.codePuppyModel
      );
    } catch (error) {
      log.error({ error: error.message }, 'error checking Code Puppy initialization');
      return false;
    }
  }

  /**
   * Find Claude Code MCP configuration
   */
  findClaudeMcpConfig() {
    for (const path of this.claudeConfigPaths) {
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, 'utf-8');
          const config = JSON.parse(content);

          // Check if it has mcpServers
          if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
            return { path, config };
          }
        } catch (error) {
          log.error({ error: error.message, path }, 'failed to parse Claude config');
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Initialize Code Puppy directory structure
   */
  initializeDirectories() {
    const dirs = [
      this.codePuppyDir,
      join(this.codePuppyDir, 'agents'),
      join(this.codePuppyDir, 'autosave'),
      join(this.codePuppyDir, 'contexts'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        log.info({ dir }, 'created directory');
      }
    }

    return { success: true, message: 'Code Puppy directories initialized' };
  }

  /**
   * Create default puppy.cfg with sensible defaults
   */
  createDefaultConfig() {
    const configPath = join(this.codePuppyDir, 'puppy.cfg');

    // Don't overwrite existing config
    if (existsSync(configPath)) {
      return { success: true, message: 'Config already exists', path: configPath };
    }

    const defaultConfig = {
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      default_agent: 'code',
      enable_dbos: false,
      yolo_mode: false,
      auto_commit: false,
      max_context_files: 20,
      autosave_interval: 300, // 5 minutes
    };

    try {
      writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      log.info({ configPath }, 'created default config');
      return { success: true, message: 'Default config created', path: configPath, config: defaultConfig };
    } catch (error) {
      log.error({ error: error.message, configPath }, 'failed to create default config');
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync MCP servers from Claude Code to Code Puppy
   */
  syncMcpServers() {
    const claudeConfig = this.findClaudeMcpConfig();

    if (!claudeConfig) {
      log.info('no Claude MCP configuration found - skipping MCP sync');
      return {
        success: false,
        message: 'Claude MCP configuration not found',
        searchedPaths: this.claudeConfigPaths
      };
    }

    log.info({ configPath: claudeConfig.path }, 'found Claude MCP config');

    const results = { added: [], skipped: [], errors: [] };

    // Get current Code Puppy MCP servers
    const currentServers = codePuppyManager.getMcpServers();

    // Sync each server from Claude
    for (const [name, config] of Object.entries(claudeConfig.config.mcpServers)) {
      try {
        // Skip disabled servers
        if (config.disabled) {
          results.skipped.push({ name, reason: 'disabled in Claude' });
          continue;
        }

        // Skip if already exists
        if (currentServers[name]) {
          results.skipped.push({ name, reason: 'already exists' });
          continue;
        }

        // Add server to Code Puppy
        const puppyConfig = {
          name,
          command: config.command,
          args: config.args || [],
          env: config.env || {}
        };

        codePuppyManager.addMcpServer(puppyConfig);
        results.added.push(name);
        log.info({ serverName: name }, 'synced MCP server');
      } catch (error) {
        results.errors.push({ name, error: error.message });
        log.error({ error: error.message, serverName: name }, 'failed to sync MCP server');
      }
    }

    return {
      success: true,
      message: `Synced ${results.added.length} MCP servers from Claude`,
      sourceConfig: claudeConfig.path,
      claudeServerCount: Object.keys(claudeConfig.config.mcpServers).length,
      results
    };
  }

  /**
   * Update UserSettings with Code Puppy preferences
   */
  async updateUserSettings(options = {}) {
    const {
      preferredAISolution = 'hybrid',
      codePuppyProvider = 'anthropic',
      codePuppyModel = 'claude-sonnet-4-20250514',
      hybridMode = 'code-puppy-with-claude-tools'
    } = options;

    try {
      const settings = await this.prisma.userSettings.upsert({
        where: { id: 'default' },
        update: {
          preferredAISolution,
          codePuppyProvider,
          codePuppyModel,
          hybridMode
        },
        create: {
          id: 'default',
          preferredAISolution,
          codePuppyProvider,
          codePuppyModel,
          hybridMode
        }
      });

      log.info('updated UserSettings with Code Puppy preferences');
      return { success: true, settings };
    } catch (error) {
      log.error({ error: error.message }, 'failed to update UserSettings');
      return { success: false, error: error.message };
    }
  }

  /**
   * Full initialization - run all setup steps
   */
  async initialize(options = {}) {
    log.info('starting Code Puppy initialization');

    const results = {
      directories: null,
      config: null,
      mcpSync: null,
      userSettings: null,
      timestamp: new Date().toISOString()
    };

    try {
      // Step 1: Create directories
      log.info({ step: 1 }, 'creating directories');
      results.directories = this.initializeDirectories();

      // Step 2: Create default config
      log.info({ step: 2 }, 'creating default configuration');
      results.config = this.createDefaultConfig();

      // Step 3: Sync MCP servers from Claude
      log.info({ step: 3 }, 'syncing MCP servers from Claude Code');
      results.mcpSync = this.syncMcpServers();

      // Step 4: Update UserSettings
      log.info({ step: 4 }, 'updating user settings');
      results.userSettings = await this.updateUserSettings(options);

      log.info('Code Puppy initialization complete');

      return {
        success: true,
        message: 'Code Puppy initialized successfully',
        results
      };
    } catch (error) {
      log.error({ error: error.message }, 'Code Puppy initialization failed');
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * Get initialization status and recommendations
   */
  async getStatus() {
    const isInitialized = await this.isInitialized();
    const dirExists = existsSync(this.codePuppyDir);
    const configExists = existsSync(join(this.codePuppyDir, 'puppy.cfg'));
    const claudeConfig = this.findClaudeMcpConfig();
    const mcpServers = codePuppyManager.getMcpServers();

    return {
      isInitialized,
      dirExists,
      configExists,
      claudeConfigFound: Boolean(claudeConfig),
      claudeConfigPath: claudeConfig?.path || null,
      mcpServerCount: Object.keys(mcpServers).length,
      recommendations: this.getRecommendations(isInitialized, dirExists, configExists, claudeConfig)
    };
  }

  /**
   * Get recommendations based on current state
   */
  getRecommendations(isInitialized, dirExists, configExists, claudeConfig) {
    const recommendations = [];

    if (!isInitialized) {
      recommendations.push({
        priority: 'high',
        message: 'Code Puppy is not initialized. Run initialization to get started.',
        action: 'initialize'
      });
    }

    if (!dirExists) {
      recommendations.push({
        priority: 'high',
        message: 'Code Puppy directory does not exist.',
        action: 'create_directories'
      });
    }

    if (!configExists) {
      recommendations.push({
        priority: 'medium',
        message: 'No puppy.cfg found. Create default configuration.',
        action: 'create_config'
      });
    }

    if (claudeConfig) {
      const serverCount = Object.keys(claudeConfig.config.mcpServers || {}).length;
      recommendations.push({
        priority: 'low',
        message: `Found ${serverCount} MCP servers in Claude Code. Consider syncing.`,
        action: 'sync_mcp'
      });
    }

    return recommendations;
  }
}

// Singleton instance
let initializer = null;

export function createInitializer(prisma) {
  if (!initializer) {
    initializer = new CodePuppyInitializer(prisma);
  }
  return initializer;
}

export function getInitializer() {
  if (!initializer) {
    throw new Error('CodePuppyInitializer not created. Call createInitializer(prisma) first.');
  }
  return initializer;
}
