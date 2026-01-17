/**
 * Dependencies Management Routes
 * Provides API endpoints for:
 * - Listing project dependencies (npm packages)
 * - Checking for outdated packages
 * - Viewing vulnerabilities (npm audit)
 * - Updating packages
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import {
  dependencySingleUpdateSchema,
  dependencyProjectSchema,
  auditFixSchema,
} from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('dependencies');
const execAsync = promisify(exec);

const PROJECTS_DIR = process.env.PROJECTS_DIR || `${os.homedir()}/Projects`;

export function createDependenciesRouter() {
  const router = Router();

  /**
   * GET /api/dependencies/:projectPath - Get project dependencies
   * Lists all dependencies with their current and latest versions
   */
  router.get('/:projectPath(*)', async (req, res) => {
    try {
      const projectPath = req.params.projectPath
        ? decodeURIComponent(req.params.projectPath)
        : null;

      if (!projectPath) {
        return res.json({ packages: [], vulnerabilities: [], message: 'No project selected' });
      }

      // Handle relative paths by prepending PROJECTS_DIR
      const fullPath = projectPath.startsWith('/')
        ? projectPath
        : join(PROJECTS_DIR, projectPath);

      // Check if package.json exists
      const packageJsonPath = join(fullPath, 'package.json');
      if (!existsSync(packageJsonPath)) {
        return res.json({
          packages: [],
          vulnerabilities: [],
          message: 'No package.json found in this project'
        });
      }

      // Read package.json to get dependencies
      let packageJson;
      try {
        packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      } catch (e) {
        return res.status(400).json({ error: 'Invalid package.json' });
      }

      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};

      // Get outdated packages
      let outdatedData = {};
      try {
        const { stdout } = await execAsync('npm outdated --json 2>/dev/null || true', {
          cwd: fullPath,
          timeout: 60000
        });
        if (stdout.trim()) {
          outdatedData = JSON.parse(stdout);
        }
      } catch (e) {
        // npm outdated returns non-zero when packages are outdated
        try {
          if (e.stdout) {
            outdatedData = JSON.parse(e.stdout);
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Get audit data for vulnerabilities
      let auditData = { vulnerabilities: {} };
      try {
        const { stdout } = await execAsync('npm audit --json 2>/dev/null || true', {
          cwd: fullPath,
          timeout: 60000
        });
        if (stdout.trim()) {
          auditData = JSON.parse(stdout);
        }
      } catch (e) {
        try {
          if (e.stdout) {
            auditData = JSON.parse(e.stdout);
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Build packages list
      const packages = [];

      // Process regular dependencies
      for (const [name, version] of Object.entries(deps)) {
        const outdated = outdatedData[name];
        const vulnCount = auditData.vulnerabilities?.[name]?.severity ? 1 : 0;

        packages.push({
          name,
          current: outdated?.current || version.replace(/^[\^~]/, ''),
          latest: outdated?.latest || version.replace(/^[\^~]/, ''),
          wanted: outdated?.wanted || version.replace(/^[\^~]/, ''),
          isDev: false,
          vulnerabilities: vulnCount,
          updateType: getUpdateType(outdated?.current, outdated?.latest),
          description: ''
        });
      }

      // Process dev dependencies
      for (const [name, version] of Object.entries(devDeps)) {
        const outdated = outdatedData[name];
        const vulnCount = auditData.vulnerabilities?.[name]?.severity ? 1 : 0;

        packages.push({
          name,
          current: outdated?.current || version.replace(/^[\^~]/, ''),
          latest: outdated?.latest || version.replace(/^[\^~]/, ''),
          wanted: outdated?.wanted || version.replace(/^[\^~]/, ''),
          isDev: true,
          vulnerabilities: vulnCount,
          updateType: getUpdateType(outdated?.current, outdated?.latest),
          description: ''
        });
      }

      // Build vulnerabilities list from audit data
      const vulnerabilities = [];
      if (auditData.vulnerabilities) {
        for (const [pkgName, vulnInfo] of Object.entries(auditData.vulnerabilities)) {
          if (vulnInfo.via && Array.isArray(vulnInfo.via)) {
            for (const via of vulnInfo.via) {
              if (typeof via === 'object') {
                vulnerabilities.push({
                  package: pkgName,
                  severity: via.severity || vulnInfo.severity || 'unknown',
                  title: via.title || 'Security vulnerability',
                  via: via.source || via.name || 'direct',
                  url: via.url || '',
                  fixAvailable: vulnInfo.fixAvailable || false
                });
              }
            }
          } else if (vulnInfo.severity) {
            vulnerabilities.push({
              package: pkgName,
              severity: vulnInfo.severity,
              title: 'Security vulnerability',
              via: 'direct',
              fixAvailable: vulnInfo.fixAvailable || false
            });
          }
        }
      }

      res.json({
        packages,
        vulnerabilities,
        projectPath: fullPath
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch dependencies',
        operation: 'fetch dependencies',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/dependencies/update - Update a single package
   */
  router.post('/update', validateBody(dependencySingleUpdateSchema), async (req, res) => {
    try {
      const { projectPath, packageName, version } = req.validatedBody;

      const fullPath = projectPath.startsWith('/')
        ? projectPath
        : join(PROJECTS_DIR, projectPath);

      // Validate project has package.json
      if (!existsSync(join(fullPath, 'package.json'))) {
        return res.status(400).json({ error: 'No package.json found' });
      }

      // Run npm update/install for the package
      const cmd = version
        ? `npm install ${packageName}@${version}`
        : `npm update ${packageName}`;

      const { stdout, stderr } = await execAsync(cmd, {
        cwd: fullPath,
        timeout: 120000
      });

      res.json({
        success: true,
        package: packageName,
        version,
        output: stdout + stderr
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update package',
        operation: 'update package',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/dependencies/update-all - Update all outdated packages
   */
  router.post('/update-all', validateBody(dependencyProjectSchema), async (req, res) => {
    try {
      const { projectPath } = req.validatedBody;

      const fullPath = projectPath.startsWith('/')
        ? projectPath
        : join(PROJECTS_DIR, projectPath);

      // Validate project has package.json
      if (!existsSync(join(fullPath, 'package.json'))) {
        return res.status(400).json({ error: 'No package.json found' });
      }

      // Run npm update
      const { stdout, stderr } = await execAsync('npm update', {
        cwd: fullPath,
        timeout: 300000 // 5 minutes for large projects
      });

      res.json({
        success: true,
        output: stdout + stderr
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update all packages',
        operation: 'update all packages',
        requestId: req.id,
      });
    }
  });

  /**
   * POST /api/dependencies/audit-fix - Run npm audit fix
   */
  router.post('/audit-fix', validateBody(auditFixSchema), async (req, res) => {
    try {
      const { projectPath, force } = req.validatedBody;

      const fullPath = projectPath.startsWith('/')
        ? projectPath
        : join(PROJECTS_DIR, projectPath);

      // Validate project has package.json
      if (!existsSync(join(fullPath, 'package.json'))) {
        return res.status(400).json({ error: 'No package.json found' });
      }

      // Run npm audit fix
      const cmd = force ? 'npm audit fix --force' : 'npm audit fix';
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: fullPath,
        timeout: 300000 // 5 minutes
      });

      res.json({
        success: true,
        output: stdout + stderr
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to run npm audit fix',
        operation: 'npm audit fix',
        requestId: req.id,
      });
    }
  });

  return router;
}

/**
 * Determine update type based on version comparison
 */
function getUpdateType(current, latest) {
  if (!current || !latest || current === latest) return null;

  const currentParts = current.split('.').map(n => parseInt(n) || 0);
  const latestParts = latest.split('.').map(n => parseInt(n) || 0);

  if (latestParts[0] > currentParts[0]) return 'major';
  if (latestParts[1] > currentParts[1]) return 'minor';
  if (latestParts[2] > currentParts[2]) return 'patch';

  return 'patch';
}
