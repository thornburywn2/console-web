/**
 * Session Persistence Service
 * Database operations for terminal session state management
 */

import { basename } from 'path';
import { createLogger } from './logger.js';

const dbLog = createLogger('database');
const sessionLog = createLogger('session');

/**
 * Create session persistence service
 * @param {import('@prisma/client').PrismaClient} prisma - Prisma client instance
 * @returns {Object} Session persistence methods
 */
export function createSessionPersistence(prisma) {
  /**
   * Get or create a project in the database
   * @param {string} projectPath - Full path to the project
   * @returns {Promise<Object|null>} Project record or null
   */
  async function getOrCreateProject(projectPath) {
    const name = basename(projectPath);
    try {
      let project = await prisma.project.findUnique({ where: { path: projectPath } });
      if (!project) {
        project = await prisma.project.create({
          data: {
            name,
            path: projectPath,
            displayName: name,
          }
        });
      }
      return project;
    } catch (error) {
      dbLog.error({ error: error.message, projectPath }, 'failed to get/create project');
      return null;
    }
  }

  /**
   * Update project last accessed time
   * @param {string} projectPath - Full path to the project
   */
  async function updateProjectAccess(projectPath) {
    try {
      await prisma.project.update({
        where: { path: projectPath },
        data: { lastAccessed: new Date() }
      });
    } catch {
      // Project might not exist yet, ignore
    }
  }

  /**
   * Save session state to database
   * @param {string} projectPath - Path to project
   * @param {string} sessionName - Terminal session name
   * @param {Object} terminalSize - Terminal dimensions
   * @param {string} workingDir - Working directory
   * @param {string} ownerId - User ID who owns/created the session (Phase 2 RBAC)
   * @returns {Promise<Object|null>} Session record or null
   */
  async function saveSessionState(projectPath, sessionName, terminalSize = null, workingDir = null, ownerId = null) {
    try {
      const project = await getOrCreateProject(projectPath);
      if (!project) return null;

      const session = await prisma.session.upsert({
        where: {
          projectId_sessionName: {
            projectId: project.id,
            sessionName
          }
        },
        update: {
          status: 'ACTIVE',
          lastActiveAt: new Date(),
          terminalSize: terminalSize || undefined,
          workingDirectory: workingDir || undefined
          // Note: Don't update ownerId on reconnect - preserve original owner
        },
        create: {
          projectId: project.id,
          sessionName,
          status: 'ACTIVE',
          terminalSize,
          workingDirectory: workingDir,
          ownerId: ownerId // Set owner on creation (Phase 2 RBAC)
        }
      });

      await updateProjectAccess(projectPath);
      return session;
    } catch (error) {
      sessionLog.error({ error: error.message, projectPath, sessionName }, 'failed to save session state');
      return null;
    }
  }

  /**
   * Get session state from database
   * @param {string} projectPath - Path to project
   * @param {string} sessionName - Terminal session name
   * @returns {Promise<Object|null>} Session record or null
   */
  async function getSessionState(projectPath, sessionName) {
    try {
      const project = await prisma.project.findUnique({ where: { path: projectPath } });
      if (!project) return null;

      return await prisma.session.findUnique({
        where: {
          projectId_sessionName: {
            projectId: project.id,
            sessionName
          }
        }
      });
    } catch (error) {
      sessionLog.error({ error: error.message, projectPath, sessionName }, 'failed to get session state');
      return null;
    }
  }

  /**
   * Mark session as disconnected
   * @param {string} projectPath - Path to project
   * @param {string} sessionName - Terminal session name
   */
  async function markSessionDisconnected(projectPath, sessionName) {
    try {
      const project = await prisma.project.findUnique({ where: { path: projectPath } });
      if (!project) return;

      await prisma.session.updateMany({
        where: {
          projectId: project.id,
          sessionName
        },
        data: {
          status: 'DISCONNECTED',
          lastActiveAt: new Date()
        }
      });
      sessionLog.debug({ projectPath, sessionName }, 'session marked disconnected');
    } catch (error) {
      sessionLog.error({ error: error.message, projectPath, sessionName }, 'failed to mark session disconnected');
    }
  }

  /**
   * Mark session as terminated
   * @param {string} projectPath - Path to project
   * @param {string} sessionName - Terminal session name
   */
  async function markSessionTerminated(projectPath, sessionName) {
    try {
      const project = await prisma.project.findUnique({ where: { path: projectPath } });
      if (!project) return;

      await prisma.session.updateMany({
        where: {
          projectId: project.id,
          sessionName
        },
        data: {
          status: 'TERMINATED',
          lastActiveAt: new Date()
        }
      });
      sessionLog.debug({ projectPath, sessionName }, 'session marked terminated');
    } catch (error) {
      sessionLog.error({ error: error.message, projectPath, sessionName }, 'failed to mark session terminated');
    }
  }

  /**
   * Get all active sessions for a project
   * @param {string} projectPath - Path to project
   * @returns {Promise<Array>} Array of session records
   */
  async function getProjectSessions(projectPath) {
    try {
      const project = await prisma.project.findUnique({ where: { path: projectPath } });
      if (!project) return [];

      return await prisma.session.findMany({
        where: {
          projectId: project.id,
          status: { in: ['ACTIVE', 'DISCONNECTED'] }
        },
        orderBy: { lastActiveAt: 'desc' }
      });
    } catch (error) {
      sessionLog.error({ error: error.message, projectPath }, 'failed to get project sessions');
      return [];
    }
  }

  /**
   * Get user settings from database
   * @returns {Promise<Object|null>} User settings or null
   */
  async function getUserSettings() {
    try {
      let settings = await prisma.userSettings.findUnique({ where: { id: 'default' } });
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { id: 'default' }
        });
      }
      return settings;
    } catch (error) {
      dbLog.error({ error: error.message }, 'failed to get user settings');
      return null;
    }
  }

  /**
   * Update user settings
   * @param {Object} data - Settings data to update
   * @returns {Promise<Object|null>} Updated settings or null
   */
  async function updateUserSettings(data) {
    try {
      return await prisma.userSettings.upsert({
        where: { id: 'default' },
        update: data,
        create: { id: 'default', ...data }
      });
    } catch (error) {
      dbLog.error({ error: error.message }, 'failed to update user settings');
      return null;
    }
  }

  return {
    getOrCreateProject,
    updateProjectAccess,
    saveSessionState,
    getSessionState,
    markSessionDisconnected,
    markSessionTerminated,
    getProjectSessions,
    getUserSettings,
    updateUserSettings,
  };
}

export default createSessionPersistence;
