/**
 * Project Analyzer Service
 * Functions for analyzing project structure, completion, and technologies
 */

import { join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { createLogger } from './logger.js';

const log = createLogger('project-analyzer');

// Directories to skip during scanning
const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', '__pycache__', 'vendor', 'venv', '.venv'];

/**
 * Get most recent modification time in a directory (recursive, limited depth)
 * @param {string} dirPath - Directory path to scan
 * @param {number} maxDepth - Maximum recursion depth (default: 2)
 * @param {number} currentDepth - Current depth (internal use)
 * @returns {Date|null} Most recent modification time or null
 */
export function getLastModifiedTime(dirPath, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return null;

  try {
    const entries = readdirSync(dirPath);
    let mostRecent = null;

    for (const entry of entries) {
      // Skip hidden files and common non-source directories
      if (entry.startsWith('.') || SKIP_DIRS.includes(entry)) {
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
 * Project completion scoring weights
 */
export const COMPLETION_WEIGHTS = {
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

/**
 * Calculate project completion percentage (10 factors)
 * @param {string} projectPath - Full path to the project
 * @returns {Object} Completion info with percentage, scores, weights, and missing items
 */
export function calculateProjectCompletion(projectPath) {
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
    } catch {
      // Directory read failed, use default count
    }

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
    log.error({ error: error.message, projectPath }, 'error calculating completion');
  }

  // Calculate total percentage
  let totalScore = 0;
  let totalWeight = 0;
  for (const [key, score] of Object.entries(scores)) {
    totalScore += score * COMPLETION_WEIGHTS[key];
    totalWeight += COMPLETION_WEIGHTS[key];
  }

  const percentage = Math.round((totalScore / totalWeight) * 100);

  return {
    percentage,
    scores,
    weights: COMPLETION_WEIGHTS,
    missing
  };
}

/**
 * Detect technologies used in a project
 * @param {string} projectPath - Full path to the project
 * @returns {string[]} Array of detected technology names
 */
export function detectTechnologies(projectPath) {
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
 * Get basic project info from filesystem
 * @param {string} projectPath - Full path to the project
 * @returns {Object|null} Project info or null if invalid
 */
export function getProjectInfo(projectPath) {
  try {
    const stat = statSync(projectPath);
    if (!stat.isDirectory()) return null;

    const name = projectPath.split('/').pop();
    const lastModified = getLastModifiedTime(projectPath);

    return {
      name,
      path: projectPath,
      lastModified: lastModified ? lastModified.toISOString() : null,
      fsCreatedAt: stat.birthtime?.toISOString() || stat.ctime?.toISOString() || null,
      fsUpdatedAt: stat.mtime?.toISOString() || null,
    };
  } catch {
    return null;
  }
}

export default {
  getLastModifiedTime,
  calculateProjectCompletion,
  detectTechnologies,
  getProjectInfo,
  COMPLETION_WEIGHTS,
};
