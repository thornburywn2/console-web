#!/usr/bin/env node

/**
 * Project Migration Script
 * CLI tool to add enforcement files to existing projects
 *
 * Usage:
 *   node scripts/migrate-project.js /path/to/project [--dry-run] [--force] [--skip-hooks]
 *
 * Options:
 *   --dry-run     Show what would be added without making changes
 *   --force       Overwrite existing files
 *   --skip-hooks  Don't install husky hooks
 */

import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  console.log(`${colors.cyan}→${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    projectPath: null,
    dryRun: false,
    force: false,
    skipHooks: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--skip-hooks') {
      options.skipHooks = true;
    } else if (!arg.startsWith('-')) {
      options.projectPath = arg;
    }
  }

  return options;
}

// Get template service functions inline (simplified version for CLI)
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

async function replaceVariables(content, variables) {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

async function copyFileWithVariables(srcPath, destPath, variables) {
  const content = await fs.readFile(srcPath, 'utf-8');
  const replaced = await replaceVariables(content, variables);
  await fs.mkdir(dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, replaced);
}

// Files to check/add from base template
const ENFORCEMENT_FILES = [
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.github/workflows/deploy.yml',
  '.husky/pre-commit',
  '.husky/pre-push',
  '.gitignore',
  '.env.example',
  'eslint.config.js',
  '.prettierrc',
  'CLAUDE.md'
];

async function checkCompliance(projectPath) {
  const results = {
    missing: [],
    present: [],
    outdated: []
  };

  for (const file of ENFORCEMENT_FILES) {
    const filePath = join(projectPath, file);
    try {
      await fs.access(filePath);
      results.present.push(file);

      // Check TypeScript strict mode in tsconfig.json
      if (file === 'tsconfig.json') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const tsConfig = JSON.parse(content);
          if (!tsConfig.compilerOptions?.strict) {
            results.outdated.push(file);
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    } catch {
      results.missing.push(file);
    }
  }

  return results;
}

async function migrateProject(projectPath, options) {
  const basePath = join(TEMPLATES_DIR, 'base');
  const projectName = basename(projectPath);

  const variables = {
    PROJECT_NAME: projectName,
    PROJECT_DESCRIPTION: `${projectName} project`,
    PORT: '5175',
    API_PORT: '5176',
    PROJECT_TYPE: 'migrated',
    GITHUB_USER: process.env.GITHUB_USER || 'thornburywn',
    PROJECT_DOMAIN: `${projectName}.example.com`
  };

  log(`\n${colors.bold}Project Migration Tool${colors.reset}`, 'reset');
  log(`Project: ${projectPath}\n`, 'cyan');

  // Check current compliance
  const compliance = await checkCompliance(projectPath);

  log(`${colors.bold}Current Status:${colors.reset}`, 'reset');
  log(`  Present: ${compliance.present.length} files`, 'green');
  log(`  Missing: ${compliance.missing.length} files`, 'yellow');
  if (compliance.outdated.length > 0) {
    log(`  Outdated: ${compliance.outdated.length} files`, 'red');
  }

  if (options.dryRun) {
    log(`\n${colors.bold}[DRY RUN] Would add the following files:${colors.reset}`, 'yellow');
    for (const file of compliance.missing) {
      logStep(file);
    }
    if (options.force) {
      log(`\n${colors.bold}[DRY RUN] Would overwrite (--force):${colors.reset}`, 'yellow');
      for (const file of compliance.present) {
        logStep(file);
      }
    }
    return;
  }

  const added = [];
  const skipped = [];
  const errors = [];

  // Add missing files
  log(`\n${colors.bold}Adding missing files:${colors.reset}`, 'reset');
  for (const file of compliance.missing) {
    const srcPath = join(basePath, file);
    const destPath = join(projectPath, file);

    try {
      await fs.access(srcPath);
      await copyFileWithVariables(srcPath, destPath, variables);
      added.push(file);
      logSuccess(file);
    } catch (error) {
      if (error.code === 'ENOENT') {
        skipped.push({ file, reason: 'Not in base template' });
        logWarning(`${file} (not in base template)`);
      } else {
        errors.push({ file, error: error.message });
        logError(`${file}: ${error.message}`);
      }
    }
  }

  // Overwrite present files if --force
  if (options.force) {
    log(`\n${colors.bold}Overwriting existing files (--force):${colors.reset}`, 'reset');
    for (const file of compliance.present) {
      const srcPath = join(basePath, file);
      const destPath = join(projectPath, file);

      try {
        await fs.access(srcPath);
        await copyFileWithVariables(srcPath, destPath, variables);
        added.push(file);
        logSuccess(file);
      } catch (error) {
        if (error.code === 'ENOENT') {
          skipped.push({ file, reason: 'Not in base template' });
        } else {
          errors.push({ file, error: error.message });
          logError(`${file}: ${error.message}`);
        }
      }
    }
  }

  // Setup husky hooks
  if (!options.skipHooks && added.some(f => f.includes('.husky'))) {
    log(`\n${colors.bold}Setting up git hooks:${colors.reset}`, 'reset');
    try {
      execSync('npx husky install', { cwd: projectPath, stdio: 'pipe' });
      logSuccess('Husky hooks installed');
    } catch (error) {
      logError(`Failed to install husky: ${error.message}`);
    }
  }

  // Final report
  log(`\n${colors.bold}Migration Complete${colors.reset}`, 'reset');
  log(`  Added: ${added.length} files`, 'green');
  log(`  Skipped: ${skipped.length} files`, 'yellow');
  if (errors.length > 0) {
    log(`  Errors: ${errors.length} files`, 'red');
  }

  // Calculate new compliance score
  const newCompliance = await checkCompliance(projectPath);
  const totalFiles = ENFORCEMENT_FILES.length;
  const score = Math.round((newCompliance.present.length / totalFiles) * 100);
  log(`\nCompliance Score: ${score}%`, score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red');
}

async function main() {
  const options = parseArgs();

  if (!options.projectPath) {
    log('Usage: node scripts/migrate-project.js /path/to/project [--dry-run] [--force] [--skip-hooks]', 'yellow');
    log('\nOptions:', 'reset');
    log('  --dry-run     Show what would be added without making changes', 'reset');
    log('  --force       Overwrite existing files', 'reset');
    log('  --skip-hooks  Don\'t install husky hooks', 'reset');
    process.exit(1);
  }

  // Resolve project path
  const projectPath = options.projectPath.startsWith('/')
    ? options.projectPath
    : join(process.cwd(), options.projectPath);

  // Check if project exists
  try {
    await fs.access(projectPath);
  } catch {
    logError(`Project not found: ${projectPath}`);
    process.exit(1);
  }

  try {
    await migrateProject(projectPath, options);
  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

main();
