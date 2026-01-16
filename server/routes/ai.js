/**
 * AI Routes
 * Endpoints for AI-related features: usage tracking, analysis, etc.
 */

import { Router } from 'express';
import { createLogger } from '../services/logger.js';

const log = createLogger('ai');

export function createAIRouter(prisma) {
  const router = Router();

  /**
   * GET /api/ai/usage
   * Get AI token usage statistics
   */
  router.get('/usage', async (req, res) => {
    try {
      const { sessionId, projectId, range = 'today' } = req.query;

      // Calculate date range
      let startDate = new Date();
      switch (range) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      // Build query conditions
      const where = {
        timestamp: { gte: startDate },
      };
      if (sessionId) where.sessionId = sessionId;
      if (projectId) where.projectId = projectId;

      // Get usage data
      const usageData = await prisma.aPIUsage.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      });

      // Aggregate stats
      const stats = usageData.reduce(
        (acc, record) => ({
          inputTokens: acc.inputTokens + record.inputTokens,
          outputTokens: acc.outputTokens + record.outputTokens,
          totalTokens: acc.totalTokens + record.inputTokens + record.outputTokens,
          requests: acc.requests + 1,
        }),
        { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 }
      );

      // Group by day for history
      const historyMap = {};
      usageData.forEach(record => {
        const date = record.timestamp.toISOString().split('T')[0];
        if (!historyMap[date]) {
          historyMap[date] = { date, input: 0, output: 0, requests: 0 };
        }
        historyMap[date].input += record.inputTokens;
        historyMap[date].output += record.outputTokens;
        historyMap[date].requests += 1;
      });

      res.json({
        ...stats,
        model: 'claude-sonnet',
        history: Object.values(historyMap).slice(0, 7),
      });
    } catch (error) {
      log.error({ error: error.message, range: req.query.range, sessionId: req.query.sessionId, requestId: req.id }, 'failed to fetch AI usage');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/usage
   * Record AI token usage
   */
  router.post('/usage', async (req, res) => {
    try {
      const { sessionId, projectId, inputTokens, outputTokens, model } = req.body;

      const usage = await prisma.aPIUsage.create({
        data: {
          sessionId,
          projectId,
          inputTokens: inputTokens || 0,
          outputTokens: outputTokens || 0,
          model: model || 'claude-sonnet',
          provider: 'anthropic',
        },
      });

      res.json(usage);
    } catch (error) {
      log.error({ error: error.message, model: req.body.model, requestId: req.id }, 'failed to record AI usage');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/analyze-error
   * Analyze an error and provide suggestions
   */
  router.post('/analyze-error', async (req, res) => {
    try {
      const { error, context, projectPath } = req.body;

      // In a real implementation, this would call Claude API
      // For now, return a structured analysis based on error type
      const analysis = {
        summary: `This error indicates a problem with ${error.type || 'the code'}`,
        cause: 'The error was likely caused by...',
        solution: 'To fix this issue, you should...',
        commands: [
          { label: 'View logs', command: 'tail -50 npm-debug.log' },
          { label: 'Check status', command: 'npm run test' },
        ],
        confidence: 0.85,
      };

      res.json(analysis);
    } catch (error) {
      log.error({ error: error.message, projectPath: req.body.projectPath, requestId: req.id }, 'failed to analyze error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/explain
   * Get AI explanation for code or concept
   */
  router.post('/explain', async (req, res) => {
    try {
      const { code, language, context } = req.body;

      // In a real implementation, this would call Claude API
      const explanation = {
        summary: 'This code performs the following operations...',
        breakdown: [
          { line: '1-3', explanation: 'Function declaration and parameter handling' },
          { line: '4-8', explanation: 'Main logic implementation' },
        ],
        suggestions: [
          'Consider adding error handling',
          'This could be optimized by...',
        ],
      };

      res.json(explanation);
    } catch (error) {
      log.error({ error: error.message, language: req.body.language, requestId: req.id }, 'failed to explain code');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/commit-message
   * Generate a commit message from git diff
   */
  router.post('/commit-message', async (req, res) => {
    try {
      const { diff, conventionalCommits = true } = req.body;

      // In a real implementation, this would call Claude API with the diff
      // For now, return a placeholder response
      const suggestions = [
        {
          message: 'feat: add new feature',
          description: 'Based on the changes detected...',
        },
        {
          message: 'fix: resolve issue with...',
          description: 'Alternative interpretation...',
        },
      ];

      res.json({ suggestions, conventionalCommits });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to generate commit message');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/ai/personas
   * Get custom AI personas
   */
  router.get('/personas', async (req, res) => {
    try {
      const personas = await prisma.aIPersona.findMany({
        orderBy: { name: 'asc' },
      }).catch(() => []);
      res.json(personas);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch personas');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/personas
   * Create a custom AI persona
   */
  router.post('/personas', async (req, res) => {
    try {
      const { name, description, icon, systemPrompt } = req.body;

      const persona = await prisma.aIPersona.create({
        data: { name, description, icon, systemPrompt },
      });

      res.status(201).json(persona);
    } catch (error) {
      log.error({ error: error.message, personaName: req.body.name, requestId: req.id }, 'failed to create persona');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/ai/personas/:id
   * Update a custom AI persona
   */
  router.put('/personas/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, systemPrompt } = req.body;

      const persona = await prisma.aIPersona.update({
        where: { id },
        data: { name, description, icon, systemPrompt },
      });

      res.json(persona);
    } catch (error) {
      log.error({ error: error.message, personaId: req.params.id, requestId: req.id }, 'failed to update persona');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/ai/personas/:id
   * Delete a custom AI persona
   */
  router.delete('/personas/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.aIPersona.delete({ where: { id } });

      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, personaId: req.params.id, requestId: req.id }, 'failed to delete persona');
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
