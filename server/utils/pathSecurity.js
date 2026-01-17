/**
 * Path Security Utilities
 * Centralized utilities to prevent path traversal attacks across all routes
 */

import { resolve, normalize, join } from 'path';
import os from 'os';
import { createLogger, logSecurityEvent } from '../services/logger.js';

const log = createLogger('security');

// Default allowed base directories
const PROJECTS_DIR = process.env.PROJECTS_DIR || join(os.homedir(), 'Projects');
const CLAUDE_DIR = process.env.CLAUDE_DIR || join(os.homedir(), '.claude');

/**
 * Validates a project/file name to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, underscores, and dots.
 * Rejects any path components like '..' or '/' or '\\'.
 *
 * @param {string} name - The name to validate
 * @returns {boolean} - True if valid, false if potentially malicious
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;

  // Reject if contains path traversal patterns
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return false;
  }

  // Reject null bytes (common injection technique)
  if (name.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Validates a project name specifically (stricter than general name validation).
 * Only allows alphanumeric characters, hyphens, underscores.
 * Rejects hidden files (starting with .) and path components.
 *
 * @param {string} name - The project name to validate
 * @returns {boolean} - True if valid, false if potentially malicious
 */
export function isValidProjectName(name) {
  if (!name || typeof name !== 'string') return false;

  // Reject if contains path traversal patterns
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return false;
  }

  // Reject if starts or ends with dots (hidden files, edge cases)
  if (name.startsWith('.') || name.endsWith('.')) {
    return false;
  }

  // Reject null bytes
  if (name.includes('\0')) {
    return false;
  }

  // Only allow alphanumeric, hyphens, underscores, and single dots
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  return validPattern.test(name);
}

/**
 * Safely resolves a path and ensures it stays within the allowed base directory.
 * Prevents path traversal attacks by validating the resolved path.
 *
 * @param {string} baseDir - The allowed base directory
 * @param {string[]} pathParts - Path components to join
 * @returns {string|null} - The safe resolved path, or null if traversal detected
 */
export function safePath(baseDir, ...pathParts) {
  try {
    const normalizedBase = resolve(baseDir);
    const targetPath = resolve(normalizedBase, ...pathParts);

    // Ensure the resolved path is still within the base directory
    if (!targetPath.startsWith(normalizedBase + '/') && targetPath !== normalizedBase) {
      logSecurityEvent({
        event: 'path_traversal_attempt',
        baseDir: normalizedBase,
        attemptedPath: pathParts.join('/'),
        resolvedPath: targetPath,
      });
      return null;
    }

    return targetPath;
  } catch (error) {
    log.error({ error: error.message, baseDir, pathParts }, 'error in safePath');
    return null;
  }
}

/**
 * Safely resolves a project path within PROJECTS_DIR.
 *
 * @param {string} projectName - The project name
 * @param {string[]} additionalPaths - Additional path components
 * @returns {string|null} - The safe resolved path, or null if invalid
 */
export function safeProjectPath(projectName, ...additionalPaths) {
  if (!isValidProjectName(projectName)) {
    return null;
  }
  return safePath(PROJECTS_DIR, projectName, ...additionalPaths);
}

/**
 * Validates and resolves a path that could be absolute or relative to PROJECTS_DIR.
 * For absolute paths, ensures they're within PROJECTS_DIR or other allowed directories.
 * For relative paths, joins with PROJECTS_DIR and validates.
 *
 * @param {string} inputPath - The input path (absolute or relative)
 * @param {string[]} allowedBases - Array of allowed base directories (defaults to [PROJECTS_DIR])
 * @returns {string|null} - The safe resolved path, or null if invalid
 */
export function validateAndResolvePath(inputPath, allowedBases = [PROJECTS_DIR]) {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }

  // Reject null bytes
  if (inputPath.includes('\0')) {
    logSecurityEvent({
      event: 'null_byte_injection_attempt',
      inputPath,
    });
    return null;
  }

  // Resolve to absolute path
  let resolvedPath;
  if (inputPath.startsWith('/')) {
    resolvedPath = resolve(inputPath);
  } else {
    resolvedPath = resolve(PROJECTS_DIR, inputPath);
  }

  // Check if the resolved path is within any allowed base
  const isAllowed = allowedBases.some(base => {
    const normalizedBase = resolve(base);
    return resolvedPath.startsWith(normalizedBase + '/') || resolvedPath === normalizedBase;
  });

  if (!isAllowed) {
    logSecurityEvent({
      event: 'path_outside_allowed_bases',
      inputPath,
      resolvedPath,
      allowedBases,
    });
    return null;
  }

  return resolvedPath;
}

/**
 * Express middleware to validate project name parameter.
 * Returns 400 if invalid, continues if valid.
 */
export function validateProjectNameMiddleware(req, res, next) {
  const projectName = req.params.projectName || req.params.project;
  if (projectName && !isValidProjectName(projectName)) {
    logSecurityEvent({
      event: 'invalid_project_name',
      projectName,
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({ error: 'Invalid project name' });
  }
  next();
}

/**
 * Express middleware to validate path parameters.
 * Checks for path traversal in common parameters.
 */
export function validatePathMiddleware(req, res, next) {
  const pathParams = ['projectPath', 'filePath', 'path', 'dir'];

  for (const param of pathParams) {
    const value = req.params[param];
    if (value) {
      const decoded = decodeURIComponent(value);
      // Check for obvious traversal attempts
      if (decoded.includes('..') || decoded.includes('\0')) {
        logSecurityEvent({
          event: 'path_traversal_in_param',
          param,
          value: decoded,
          ip: req.ip,
          path: req.path,
        });
        return res.status(400).json({ error: 'Invalid path parameter' });
      }
    }
  }
  next();
}

export { PROJECTS_DIR, CLAUDE_DIR };
