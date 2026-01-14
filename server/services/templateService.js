/**
 * Template Service
 * Core service for project template operations
 * Handles template listing, project creation, migration, and compliance checking
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Path to templates directory
const TEMPLATES_DIR = path.join(process.cwd(), 'templates');
const REGISTRY_PATH = path.join(TEMPLATES_DIR, 'registry.json');
const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME, 'Projects');

export class TemplateService {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || TEMPLATES_DIR;
    this.projectsDir = options.projectsDir || PROJECTS_DIR;
    this.registry = null;
  }

  /**
   * Load template registry from JSON file
   */
  async loadRegistry() {
    if (this.registry) return this.registry;

    try {
      const content = await fs.readFile(REGISTRY_PATH, 'utf-8');
      this.registry = JSON.parse(content);
      return this.registry;
    } catch (error) {
      console.error('Error loading template registry:', error);
      throw new Error('Failed to load template registry');
    }
  }

  /**
   * List all available templates
   */
  async listTemplates() {
    const registry = await this.loadRegistry();
    return registry.templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      stack: template.stack,
      category: template.category,
      difficulty: template.difficulty,
      estimatedSetupTime: template.estimatedSetupTime,
      requirements: template.requirements || []
    }));
  }

  /**
   * Get template details by ID
   */
  async getTemplate(templateId) {
    const registry = await this.loadRegistry();
    const template = registry.templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return template;
  }

  /**
   * Replace template variables in content
   */
  replaceVariables(content, variables) {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Copy a single file with variable replacement
   */
  async copyFileWithVariables(srcPath, destPath, variables) {
    const content = await fs.readFile(srcPath, 'utf-8');
    const replaced = this.replaceVariables(content, variables);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, replaced);
  }

  /**
   * Copy directory recursively with variable replacement
   */
  async copyDirectoryWithVariables(srcDir, destDir, variables) {
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    await fs.mkdir(destDir, { recursive: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectoryWithVariables(srcPath, destPath, variables);
      } else {
        // Check if it's a text file that should have variables replaced
        const ext = path.extname(entry.name).toLowerCase();
        const textExtensions = ['.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.yml', '.yaml', '.prisma', '.env', '.sh', '.toml'];
        const noExtFiles = ['.gitignore', '.prettierrc', '.env.example', 'Dockerfile'];

        if (textExtensions.includes(ext) || noExtFiles.includes(entry.name)) {
          await this.copyFileWithVariables(srcPath, destPath, variables);
        } else {
          // Binary file, just copy
          await fs.copyFile(srcPath, destPath);
        }
      }
    }
  }

  /**
   * Create a new project from template
   */
  async createProject(templateId, variables, options = {}) {
    const template = await this.getTemplate(templateId);
    const projectPath = path.join(this.projectsDir, variables.PROJECT_NAME);

    // Check if project already exists
    try {
      await fs.access(projectPath);
      throw new Error(`Project already exists: ${projectPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Prepare all variables including defaults
    const allVariables = { ...variables };
    for (const varDef of template.variables) {
      if (allVariables[varDef.name] === undefined && varDef.default !== undefined) {
        // Handle template references in defaults like {{PROJECT_NAME}}
        allVariables[varDef.name] = this.replaceVariables(String(varDef.default), allVariables);
      }
    }

    // Add computed variables
    allVariables.PROJECT_TYPE = templateId;
    allVariables.GITHUB_USER = process.env.GITHUB_USER || 'username';
    allVariables.PROJECT_DOMAIN = `${allVariables.PROJECT_NAME}.example.com`;

    let filesCreated = 0;

    // Copy base template first (if template inherits from base)
    if (template.inheritsFrom === 'base') {
      const basePath = path.join(this.templatesDir, 'base');
      await this.copyDirectoryWithVariables(basePath, projectPath, allVariables);
      filesCreated += await this.countFiles(basePath);
    }

    // Copy template-specific files (overwriting base if needed)
    const templatePath = path.join(this.templatesDir, templateId);
    try {
      await fs.access(templatePath);
      await this.copyDirectoryWithVariables(templatePath, projectPath, allVariables);
      filesCreated += await this.countFiles(templatePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Initialize git repository
    if (options.initGit !== false) {
      try {
        execSync('git init', { cwd: projectPath, stdio: 'pipe' });
        execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
        execSync('git commit -m "Initial commit from template"', { cwd: projectPath, stdio: 'pipe' });
      } catch (error) {
        console.error('Error initializing git:', error.message);
      }
    }

    // Run post-create commands
    const commandResults = [];
    if (options.installDeps !== false && template.postCreateCommands?.length > 0) {
      for (const cmd of template.postCreateCommands) {
        try {
          const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath });
          commandResults.push({ command: cmd, success: true, output: stdout });
        } catch (error) {
          commandResults.push({ command: cmd, success: false, error: error.message });
        }
      }
    }

    // Setup husky hooks
    if (options.setupHooks !== false) {
      try {
        execSync('npx husky install', { cwd: projectPath, stdio: 'pipe' });
      } catch (error) {
        console.error('Error setting up husky:', error.message);
      }
    }

    return {
      success: true,
      project: {
        name: allVariables.PROJECT_NAME,
        path: projectPath,
        type: templateId
      },
      filesCreated,
      commandResults,
      message: 'Project created successfully'
    };
  }

  /**
   * Count files in a directory recursively
   */
  async countFiles(dirPath) {
    let count = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          count += await this.countFiles(path.join(dirPath, entry.name));
        } else {
          count++;
        }
      }
    } catch {
      // Directory doesn't exist
    }
    return count;
  }

  /**
   * Check which enforcement files are missing from a project
   */
  async checkCompliance(projectPath) {
    const registry = await this.loadRegistry();
    const weights = registry.complianceWeights;
    const thresholds = registry.complianceThresholds;

    const checks = {
      ci_workflow: { path: '.github/workflows/ci.yml', present: false, weight: weights.ci_workflow },
      security_workflow: { path: '.github/workflows/security.yml', present: false, weight: weights.security_workflow },
      pre_commit_hooks: { path: '.husky/pre-commit', present: false, weight: weights.pre_commit_hooks },
      typescript_strict: { path: 'tsconfig.json', present: false, strict: false, weight: weights.typescript_strict },
      eslint_config: { path: 'eslint.config.js', present: false, weight: weights.eslint_config },
      prettier_config: { path: '.prettierrc', present: false, weight: weights.prettier_config },
      claude_md: { path: 'CLAUDE.md', present: false, weight: weights.claude_md }
    };

    const missing = [];
    const present = [];
    const outdated = [];

    for (const [key, check] of Object.entries(checks)) {
      const filePath = path.join(projectPath, check.path);
      try {
        await fs.access(filePath);
        check.present = true;
        present.push(check.path);

        // Special check for TypeScript strict mode
        if (key === 'typescript_strict') {
          const content = await fs.readFile(filePath, 'utf-8');
          const tsConfig = JSON.parse(content);
          check.strict = tsConfig.compilerOptions?.strict === true;
          if (!check.strict) {
            outdated.push(check.path);
          }
        }
      } catch {
        missing.push(check.path);
      }
    }

    // Calculate compliance score
    let score = 0;
    for (const [key, check] of Object.entries(checks)) {
      if (check.present) {
        if (key === 'typescript_strict') {
          if (check.strict) score += check.weight;
        } else {
          score += check.weight;
        }
      }
    }

    // Determine status
    let status = 'critical';
    if (score >= thresholds.good) {
      status = 'good';
    } else if (score >= thresholds.warning) {
      status = 'warning';
    }

    return {
      project: path.basename(projectPath),
      projectPath,
      complianceScore: score,
      status,
      missing,
      present,
      outdated,
      checks
    };
  }

  /**
   * Migrate an existing project to use enforcement files
   */
  async migrateProject(projectPath, options = {}) {
    const { dryRun = false, force = false, skipHooks = false } = options;

    // Check compliance first
    const compliance = await this.checkCompliance(projectPath);

    if (dryRun) {
      return {
        dryRun: true,
        wouldAdd: compliance.missing,
        wouldUpdate: force ? compliance.present : [],
        currentScore: compliance.complianceScore
      };
    }

    const basePath = path.join(this.templatesDir, 'base');
    const added = [];
    const skipped = [];

    for (const missingFile of compliance.missing) {
      const srcPath = path.join(basePath, missingFile);
      const destPath = path.join(projectPath, missingFile);

      try {
        await fs.access(srcPath);

        // Read and process the file
        const projectName = path.basename(projectPath);
        const variables = {
          PROJECT_NAME: projectName,
          PROJECT_DESCRIPTION: `${projectName} project`,
          PORT: '5175',
          API_PORT: '5176',
          PROJECT_TYPE: 'migrated',
          GITHUB_USER: process.env.GITHUB_USER || 'username',
          PROJECT_DOMAIN: `${projectName}.example.com`
        };

        await this.copyFileWithVariables(srcPath, destPath, variables);
        added.push(missingFile);
      } catch (error) {
        skipped.push({ file: missingFile, reason: error.message });
      }
    }

    // Force overwrite if requested
    if (force) {
      for (const presentFile of compliance.present) {
        const srcPath = path.join(basePath, presentFile);
        const destPath = path.join(projectPath, presentFile);

        try {
          await fs.access(srcPath);
          const projectName = path.basename(projectPath);
          const variables = {
            PROJECT_NAME: projectName,
            PROJECT_DESCRIPTION: `${projectName} project`,
            PORT: '5175',
            API_PORT: '5176',
            PROJECT_TYPE: 'migrated',
            GITHUB_USER: process.env.GITHUB_USER || 'username',
            PROJECT_DOMAIN: `${projectName}.example.com`
          };

          await this.copyFileWithVariables(srcPath, destPath, variables);
          added.push(presentFile);
        } catch {
          // File not in base template
        }
      }
    }

    // Setup husky hooks if not skipped
    if (!skipHooks && added.some(f => f.includes('.husky'))) {
      try {
        execSync('npx husky install', { cwd: projectPath, stdio: 'pipe' });
      } catch (error) {
        console.error('Error setting up husky:', error.message);
      }
    }

    // Recalculate compliance
    const newCompliance = await this.checkCompliance(projectPath);

    return {
      success: true,
      added,
      skipped,
      previousScore: compliance.complianceScore,
      newScore: newCompliance.complianceScore,
      status: newCompliance.status
    };
  }

  /**
   * Get compliance weights and thresholds from registry
   */
  async getComplianceConfig() {
    const registry = await this.loadRegistry();
    return {
      weights: registry.complianceWeights,
      thresholds: registry.complianceThresholds
    };
  }

  /**
   * Check all projects in the projects directory
   */
  async checkAllProjects() {
    const projects = [];

    try {
      const entries = await fs.readdir(this.projectsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;

        const projectPath = path.join(this.projectsDir, entry.name);

        // Check if it's a project (has package.json or CLAUDE.md)
        try {
          await fs.access(path.join(projectPath, 'package.json'));
        } catch {
          try {
            await fs.access(path.join(projectPath, 'CLAUDE.md'));
          } catch {
            continue; // Not a project
          }
        }

        try {
          const compliance = await this.checkCompliance(projectPath);
          projects.push(compliance);
        } catch (error) {
          console.error(`Error checking ${entry.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error listing projects:', error);
    }

    return {
      total: projects.length,
      good: projects.filter(p => p.status === 'good').length,
      warning: projects.filter(p => p.status === 'warning').length,
      critical: projects.filter(p => p.status === 'critical').length,
      averageScore: projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + p.complianceScore, 0) / projects.length)
        : 0,
      projects
    };
  }
}

// Create singleton instance
let instance = null;

export function getTemplateService(options = {}) {
  if (!instance) {
    instance = new TemplateService(options);
  }
  return instance;
}

export default TemplateService;
