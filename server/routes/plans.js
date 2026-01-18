/**
 * Plan Mode API Routes
 * AI planning visualization with Mermaid diagrams
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { sendSafeError } from '../utils/errorResponse.js';

const log = createLogger('plans');

export function createPlansRouter(prisma) {
  const router = Router();

  // =============================================================================
  // PLAN SESSION CRUD
  // =============================================================================

  /**
   * Get all plan sessions with filtering
   */
  router.get('/', async (req, res) => {
    try {
      const {
        projectId,
        sessionId,
        status,
        limit = 50,
        offset = 0
      } = req.query;

      const where = {};

      if (projectId) where.projectId = projectId;
      if (sessionId) where.sessionId = sessionId;
      if (status) where.status = status.toUpperCase();

      const [plans, total] = await Promise.all([
        prisma.planSession.findMany({
          where,
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.planSession.count({ where })
      ]);

      res.json({
        plans,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
      });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch plans',
        operation: 'fetch plans',
        requestId: req.id
      });
    }
  });

  /**
   * Get a single plan with steps
   */
  router.get('/:id', async (req, res) => {
    try {
      const plan = await prisma.planSession.findUnique({
        where: { id: req.params.id },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      res.json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to fetch plan',
        operation: 'fetch plan',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  /**
   * Create a new plan session
   */
  router.post('/', async (req, res) => {
    try {
      const {
        projectId,
        sessionId,
        title,
        description,
        goal,
        steps = [],
        aiModel,
        mermaidDiagram
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const plan = await prisma.planSession.create({
        data: {
          projectId,
          sessionId,
          title: title.trim(),
          description,
          goal,
          aiModel,
          mermaidDiagram,
          status: 'PLANNING',
          steps: {
            create: steps.map((step, index) => ({
              order: index + 1,
              title: step.title,
              description: step.description,
              command: step.command,
              dependsOn: step.dependsOn || [],
              tags: step.tags || [],
              status: 'PENDING'
            }))
          }
        },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        }
      });

      res.status(201).json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to create plan',
        operation: 'create plan',
        requestId: req.id
      });
    }
  });

  /**
   * Update a plan session
   */
  router.put('/:id', async (req, res) => {
    try {
      const {
        title,
        description,
        goal,
        status,
        mermaidDiagram,
        tokenCount
      } = req.body;

      const existing = await prisma.planSession.findUnique({
        where: { id: req.params.id }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description;
      if (goal !== undefined) updateData.goal = goal;
      if (status !== undefined) updateData.status = status;
      if (mermaidDiagram !== undefined) updateData.mermaidDiagram = mermaidDiagram;
      if (tokenCount !== undefined) updateData.tokenCount = tokenCount;

      // Set completedAt when status changes to COMPLETED
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      const plan = await prisma.planSession.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        }
      });

      res.json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update plan',
        operation: 'update plan',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  /**
   * Delete a plan session
   */
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.planSession.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true, id: req.params.id });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete plan',
        operation: 'delete plan',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  // =============================================================================
  // PLAN STEPS
  // =============================================================================

  /**
   * Add a step to a plan
   */
  router.post('/:id/steps', async (req, res) => {
    try {
      const { title, description, command, dependsOn, tags, insertAfter } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: 'Step title is required' });
      }

      // Get current steps to determine order
      const existingSteps = await prisma.planStep.findMany({
        where: { planId: req.params.id },
        orderBy: { order: 'asc' }
      });

      let newOrder;
      if (insertAfter) {
        const afterStep = existingSteps.find(s => s.id === insertAfter);
        if (afterStep) {
          newOrder = afterStep.order + 1;
          // Shift subsequent steps
          await prisma.planStep.updateMany({
            where: {
              planId: req.params.id,
              order: { gte: newOrder }
            },
            data: { order: { increment: 1 } }
          });
        } else {
          newOrder = existingSteps.length + 1;
        }
      } else {
        newOrder = existingSteps.length + 1;
      }

      const step = await prisma.planStep.create({
        data: {
          planId: req.params.id,
          order: newOrder,
          title: title.trim(),
          description,
          command,
          dependsOn: dependsOn || [],
          tags: tags || [],
          status: 'PENDING'
        }
      });

      res.status(201).json(step);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to add step',
        operation: 'add plan step',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  /**
   * Reorder steps
   * NOTE: This route MUST be defined BEFORE /:planId/steps/:stepId
   * otherwise "reorder" gets matched as a stepId parameter
   */
  router.put('/:id/steps/reorder', async (req, res) => {
    try {
      const { stepIds } = req.body;

      if (!Array.isArray(stepIds)) {
        return res.status(400).json({ error: 'stepIds array is required' });
      }

      // Update order for each step
      await Promise.all(
        stepIds.map((id, index) =>
          prisma.planStep.update({
            where: { id },
            data: { order: index + 1 }
          })
        )
      );

      const plan = await prisma.planSession.findUnique({
        where: { id: req.params.id },
        include: {
          steps: { orderBy: { order: 'asc' } }
        }
      });

      res.json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to reorder steps',
        operation: 'reorder plan steps',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  /**
   * Update a step
   */
  router.put('/:planId/steps/:stepId', async (req, res) => {
    try {
      const { stepId } = req.params;
      const {
        title,
        description,
        command,
        status,
        output,
        error,
        dependsOn,
        notes,
        tags
      } = req.body;

      const existing = await prisma.planStep.findUnique({
        where: { id: stepId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Step not found' });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description;
      if (command !== undefined) updateData.command = command;
      if (status !== undefined) updateData.status = status;
      if (output !== undefined) updateData.output = output;
      if (error !== undefined) updateData.error = error;
      if (dependsOn !== undefined) updateData.dependsOn = dependsOn;
      if (notes !== undefined) updateData.notes = notes;
      if (tags !== undefined) updateData.tags = tags;

      // Set timing based on status changes
      if (status === 'IN_PROGRESS' && existing.status === 'PENDING') {
        updateData.startedAt = new Date();
      }
      if ((status === 'COMPLETED' || status === 'FAILED' || status === 'SKIPPED') && existing.startedAt) {
        updateData.completedAt = new Date();
        updateData.duration = new Date() - new Date(existing.startedAt);
      }

      const step = await prisma.planStep.update({
        where: { id: stepId },
        data: updateData
      });

      res.json(step);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to update step',
        operation: 'update plan step',
        requestId: req.id,
        context: { planId: req.params.planId, stepId: req.params.stepId }
      });
    }
  });

  /**
   * Delete a step
   */
  router.delete('/:planId/steps/:stepId', async (req, res) => {
    try {
      const { planId, stepId } = req.params;

      const step = await prisma.planStep.findUnique({
        where: { id: stepId }
      });

      if (!step) {
        return res.status(404).json({ error: 'Step not found' });
      }

      // Delete the step
      await prisma.planStep.delete({
        where: { id: stepId }
      });

      // Reorder remaining steps
      await prisma.planStep.updateMany({
        where: {
          planId,
          order: { gt: step.order }
        },
        data: { order: { decrement: 1 } }
      });

      res.json({ success: true, id: stepId });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to delete step',
        operation: 'delete plan step',
        requestId: req.id,
        context: { planId: req.params.planId, stepId: req.params.stepId }
      });
    }
  });

  // =============================================================================
  // PLAN EXECUTION
  // =============================================================================

  /**
   * Start executing a plan
   */
  router.post('/:id/execute', async (req, res) => {
    try {
      const plan = await prisma.planSession.update({
        where: { id: req.params.id },
        data: { status: 'EXECUTING' },
        include: {
          steps: { orderBy: { order: 'asc' } }
        }
      });

      // Mark first non-blocked step as in progress
      const firstStep = plan.steps.find(s => s.status === 'PENDING' && s.dependsOn.length === 0);
      if (firstStep) {
        await prisma.planStep.update({
          where: { id: firstStep.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date() }
        });
      }

      res.json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to start execution',
        operation: 'start plan execution',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  /**
   * Pause plan execution
   */
  router.post('/:id/pause', async (req, res) => {
    try {
      const plan = await prisma.planSession.update({
        where: { id: req.params.id },
        data: { status: 'PAUSED' },
        include: {
          steps: { orderBy: { order: 'asc' } }
        }
      });

      res.json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to pause',
        operation: 'pause plan execution',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  /**
   * Cancel plan execution
   */
  router.post('/:id/cancel', async (req, res) => {
    try {
      const plan = await prisma.planSession.update({
        where: { id: req.params.id },
        data: {
          status: 'CANCELLED',
          completedAt: new Date()
        },
        include: {
          steps: { orderBy: { order: 'asc' } }
        }
      });

      // Mark in-progress steps as skipped
      await prisma.planStep.updateMany({
        where: {
          planId: req.params.id,
          status: 'IN_PROGRESS'
        },
        data: { status: 'SKIPPED' }
      });

      res.json(plan);
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to cancel',
        operation: 'cancel plan execution',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  // =============================================================================
  // MERMAID DIAGRAM GENERATION
  // =============================================================================

  /**
   * Generate Mermaid diagram for a plan
   */
  router.get('/:id/diagram', async (req, res) => {
    try {
      const plan = await prisma.planSession.findUnique({
        where: { id: req.params.id },
        include: {
          steps: { orderBy: { order: 'asc' } }
        }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Generate Mermaid flowchart
      let mermaid = 'flowchart TD\n';

      // Add nodes
      plan.steps.forEach(step => {
        const statusClass = getStatusClass(step.status);
        mermaid += `    ${step.id}["${step.order}. ${escapeForMermaid(step.title)}"]:::${statusClass}\n`;
      });

      mermaid += '\n';

      // Add edges based on dependencies
      plan.steps.forEach(step => {
        if (step.dependsOn.length > 0) {
          step.dependsOn.forEach(depId => {
            mermaid += `    ${depId} --> ${step.id}\n`;
          });
        } else if (step.order > 1) {
          // Default sequential connection
          const prevStep = plan.steps.find(s => s.order === step.order - 1);
          if (prevStep) {
            mermaid += `    ${prevStep.id} --> ${step.id}\n`;
          }
        }
      });

      // Add style classes
      mermaid += '\n';
      mermaid += '    classDef pending fill:#6b7280,stroke:#9ca3af\n';
      mermaid += '    classDef inProgress fill:#3b82f6,stroke:#60a5fa\n';
      mermaid += '    classDef completed fill:#22c55e,stroke:#4ade80\n';
      mermaid += '    classDef failed fill:#ef4444,stroke:#f87171\n';
      mermaid += '    classDef skipped fill:#a855f7,stroke:#c084fc\n';
      mermaid += '    classDef blocked fill:#f59e0b,stroke:#fbbf24\n';

      res.json({ diagram: mermaid, steps: plan.steps });
    } catch (error) {
      return sendSafeError(res, error, {
        userMessage: 'Failed to generate diagram',
        operation: 'generate plan diagram',
        requestId: req.id,
        context: { planId: req.params.id }
      });
    }
  });

  return router;
}

// Helper functions
function getStatusClass(status) {
  const classes = {
    PENDING: 'pending',
    IN_PROGRESS: 'inProgress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    BLOCKED: 'blocked'
  };
  return classes[status] || 'pending';
}

function escapeForMermaid(text) {
  return text
    .replace(/"/g, "'")
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .substring(0, 50);
}

export default createPlansRouter;
