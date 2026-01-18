/**
 * Background Agents API Routes
 * CRUD operations and execution management for background agents
 * Replaces the workflow system with event-driven agents
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { validateBody } from '../middleware/validate.js';
import { agentSchema, agentUpdateSchema } from '../validation/schemas.js';
import { sendSafeError } from '../utils/errorResponse.js';
import { buildOwnershipFilter, getOwnerIdForCreate, auditLog } from '../middleware/rbac.js';
import { enforceQuota } from '../middleware/quotas.js';

const log = createLogger('agents');

export function createAgentsRouter(prisma, agentRunner) {
  const router = Router();

  // =============================================================================
  // AGENT CRUD
  // =============================================================================

  /**
   * Get all agents with recent executions
   * Supports filtering by trigger type, enabled status, and project
   */
  router.get('/', async (req, res) => {
    try {
      const { trigger, enabled, projectId } = req.query;

      // RBAC: Build ownership filter (Phase 2)
      // Agents can be public (marketplace) or user-owned
      const ownershipFilter = buildOwnershipFilter(req, { includePublic: true });

      const where = {
        ...ownershipFilter, // Apply RBAC ownership filter
      };

      if (trigger) {
        where.triggerType = trigger.toUpperCase();
      }

      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      if (projectId) {
        where.projectId = projectId;
      }

      const agents = await prisma.agent.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, path: true }
          },
          executions: {
            take: 5,
            orderBy: { startedAt: 'desc' },
            select: {
              id: true,
              status: true,
              startedAt: true,
              endedAt: true
            }
          }
        },
        orderBy: [
          { enabled: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      // Add running status from agent runner
      const status = agentRunner.getStatus();
      const agentsWithStatus = agents.map(agent => ({
        ...agent,
        isRunning: status.running.some(r => r.agentId === agent.id)
      }));

      res.json(agentsWithStatus);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch agents',
        operation: 'fetch agents',
        requestId: req.id,
      });
    }
  });

  /**
   * Get a single agent by ID with full execution history (paginated)
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Get executions separately for pagination
      const [executions, totalExecutions] = await Promise.all([
        prisma.agentExecution.findMany({
          where: { agentId: id },
          orderBy: { startedAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.agentExecution.count({ where: { agentId: id } })
      ]);

      // Check if agent is currently running
      const status = agentRunner.getStatus();
      const isRunning = status.running.some(r => r.agentId === id);

      res.json({
        ...agent,
        isRunning,
        executions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalExecutions,
          pages: Math.ceil(totalExecutions / parseInt(limit))
        }
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch agent',
        operation: 'fetch agent',
        requestId: req.id,
        context: { agentId: req.params.id },
      });
    }
  });

  /**
   * Create a new agent
   */
  router.post('/', enforceQuota(prisma, 'agent'), validateBody(agentSchema), auditLog(prisma, 'CREATE', 'agent'), async (req, res) => {
    try {
      const { name, description, triggerType, triggerConfig, actions, enabled, projectId } = req.validatedBody;

      // Verify project exists if specified
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(400).json({ error: 'Project not found' });
        }
      }

      const agent = await prisma.agent.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          triggerType,
          triggerConfig: triggerConfig || null,
          actions,
          enabled: enabled !== false,
          projectId: projectId || null,
          ownerId: getOwnerIdForCreate(req)
        },
        include: {
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      // Set up triggers if enabled
      if (agent.enabled) {
        await agentRunner.setupAgentTriggers(agent);
      }

      res.status(201).json(agent);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create agent',
        operation: 'create agent',
        requestId: req.id,
      });
    }
  });

  /**
   * Update an agent
   */
  router.put('/:id', validateBody(agentUpdateSchema), auditLog(prisma, 'UPDATE', 'agent'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, triggerType, triggerConfig, actions, enabled, projectId } = req.validatedBody;

      // Check agent exists
      const existing = await prisma.agent.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Verify project exists if specified
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(400).json({ error: 'Project not found' });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (triggerType !== undefined) updateData.triggerType = triggerType;
      if (triggerConfig !== undefined) updateData.triggerConfig = triggerConfig;
      if (actions !== undefined) updateData.actions = actions;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (projectId !== undefined) updateData.projectId = projectId || null;

      const agent = await prisma.agent.update({
        where: { id },
        data: updateData,
        include: {
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      // Reload agent triggers
      await agentRunner.reloadAgent(id);

      res.json(agent);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update agent',
        operation: 'update agent',
        requestId: req.id,
        context: { agentId: req.params.id },
      });
    }
  });

  /**
   * Delete an agent
   */
  router.delete('/:id', auditLog(prisma, 'DELETE', 'agent'), async (req, res) => {
    try {
      const { id } = req.params;

      // Check agent exists
      const existing = await prisma.agent.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Stop if running
      await agentRunner.stopAgent(id);

      // Delete agent (cascades to executions)
      await prisma.agent.delete({ where: { id } });

      // Clean up triggers
      await agentRunner.reloadAgent(id);

      res.json({ success: true, id });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete agent',
        operation: 'delete agent',
        requestId: req.id,
        context: { agentId: req.params.id },
      });
    }
  });

  // =============================================================================
  // AGENT EXECUTION
  // =============================================================================

  /**
   * Manually trigger an agent
   */
  router.post('/:id/run', enforceQuota(prisma, 'agentRun'), auditLog(prisma, 'EXECUTE', 'agent'), async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({ where: { id } });
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const execution = await agentRunner.runAgent(id);

      if (!execution) {
        return res.status(409).json({
          error: 'Agent could not be started',
          reason: agentRunner.runningAgents.has(id)
            ? 'Agent is already running'
            : 'Maximum concurrent agents reached'
        });
      }

      res.json({
        success: true,
        executionId: execution.id,
        status: 'RUNNING'
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to run agent',
        operation: 'run agent',
        requestId: req.id,
        context: { agentId: req.params.id },
      });
    }
  });

  /**
   * Stop a running agent
   */
  router.post('/:id/stop', auditLog(prisma, 'EXECUTE', 'agent'), async (req, res) => {
    try {
      const { id } = req.params;

      const stopped = await agentRunner.stopAgent(id);

      if (!stopped) {
        return res.status(404).json({ error: 'Agent is not running' });
      }

      res.json({ success: true, status: 'CANCELLED' });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to stop agent',
        operation: 'stop agent',
        requestId: req.id,
        context: { agentId: req.params.id },
      });
    }
  });

  /**
   * Toggle agent enabled status
   */
  router.post('/:id/toggle', auditLog(prisma, 'UPDATE', 'agent'), async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({ where: { id } });
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const updated = await prisma.agent.update({
        where: { id },
        data: { enabled: !agent.enabled },
        include: {
          project: {
            select: { id: true, name: true, path: true }
          }
        }
      });

      // Reload triggers
      await agentRunner.reloadAgent(id);

      res.json(updated);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to toggle agent',
        operation: 'toggle agent',
        requestId: req.id,
        context: { agentId: req.params.id },
      });
    }
  });

  // =============================================================================
  // EXECUTION HISTORY
  // =============================================================================

  /**
   * Get execution details
   */
  router.get('/executions/:executionId', async (req, res) => {
    try {
      const { executionId } = req.params;

      const execution = await prisma.agentExecution.findUnique({
        where: { id: executionId },
        include: {
          agent: {
            select: { id: true, name: true }
          }
        }
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      res.json(execution);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch execution',
        operation: 'fetch execution',
        requestId: req.id,
        context: { executionId: req.params.executionId },
      });
    }
  });

  /**
   * Clear old execution history (for maintenance)
   */
  router.delete('/executions/cleanup', async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days));

      const result = await prisma.agentExecution.deleteMany({
        where: {
          startedAt: { lt: cutoff }
        }
      });

      res.json({
        success: true,
        deleted: result.count,
        cutoffDate: cutoff
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to clean up executions',
        operation: 'clean up executions',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // AGENT RUNNER STATUS
  // =============================================================================

  /**
   * Get agent runner status
   */
  router.get('/status/runner', async (req, res) => {
    try {
      const status = agentRunner.getStatus();
      res.json(status);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch runner status',
        operation: 'fetch runner status',
        requestId: req.id,
      });
    }
  });

  // =============================================================================
  // TRIGGER TYPES REFERENCE
  // =============================================================================

  /**
   * Get available trigger types
   */
  router.get('/meta/triggers', (req, res) => {
    res.json({
      triggers: [
        // Git events
        { value: 'GIT_PRE_COMMIT', label: 'Git: Pre-Commit', category: 'git' },
        { value: 'GIT_POST_COMMIT', label: 'Git: Post-Commit', category: 'git' },
        { value: 'GIT_PRE_PUSH', label: 'Git: Pre-Push', category: 'git' },
        { value: 'GIT_POST_MERGE', label: 'Git: Post-Merge', category: 'git' },
        { value: 'GIT_POST_CHECKOUT', label: 'Git: Post-Checkout', category: 'git' },
        // File events
        { value: 'FILE_CHANGE', label: 'File: Change', category: 'file', hasConfig: true },
        // Session events
        { value: 'SESSION_START', label: 'Session: Start', category: 'session' },
        { value: 'SESSION_END', label: 'Session: End', category: 'session' },
        { value: 'SESSION_ERROR', label: 'Session: Error', category: 'session' },
        { value: 'SESSION_IDLE', label: 'Session: Idle', category: 'session' },
        { value: 'SESSION_RECONNECT', label: 'Session: Reconnect', category: 'session' },
        { value: 'SESSION_COMMAND_COMPLETE', label: 'Session: Command Complete', category: 'session' },
        // System events
        { value: 'SYSTEM_RESOURCE', label: 'System: Resource Alert', category: 'system' },
        { value: 'SYSTEM_SERVICE', label: 'System: Service Change', category: 'system' },
        { value: 'SYSTEM_ALERT', label: 'System: Alert Triggered', category: 'system' },
        { value: 'SYSTEM_UPTIME', label: 'System: Uptime Change', category: 'system' },
        // Manual
        { value: 'MANUAL', label: 'Manual Trigger', category: 'manual' }
      ]
    });
  });

  /**
   * Get available action types
   */
  router.get('/meta/actions', (req, res) => {
    res.json({
      actions: [
        {
          value: 'shell',
          label: 'Shell Command',
          description: 'Execute a shell command in the project directory',
          fields: [
            { name: 'command', type: 'text', label: 'Command', required: true }
          ]
        },
        {
          value: 'api',
          label: 'API Call',
          description: 'Make an HTTP request to an API endpoint',
          fields: [
            { name: 'url', type: 'url', label: 'URL', required: true },
            { name: 'method', type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' }
          ]
        },
        {
          value: 'mcp',
          label: 'MCP Tool',
          description: 'Invoke an MCP server tool',
          fields: [
            { name: 'serverId', type: 'select', label: 'MCP Server', required: true },
            { name: 'toolName', type: 'select', label: 'Tool', required: true },
            { name: 'args', type: 'json', label: 'Arguments' }
          ]
        }
      ]
    });
  });

  return router;
}

export default createAgentsRouter;
