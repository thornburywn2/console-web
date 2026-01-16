/**
 * Voice API Routes
 * P0 Phase 1-4: Voice Input, Pattern Matching, and Whisper Integration
 *
 * Handles voice command processing, settings, history, and Whisper transcription
 */

import express from 'express';
import multer from 'multer';
import { parseCommand, getAllCommands, getAllCommandsFlat } from '../utils/commandPatterns.js';
import { whisperService } from '../services/whisperService.js';
import { voiceAIService } from '../services/voiceAIService.js';
import { createLogger } from '../services/logger.js';

const log = createLogger('voice');

// Initialize AI service
voiceAIService.initialize();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

export function createVoiceRouter(prisma) {
  const router = express.Router();

  // ============================================
  // Voice Settings
  // ============================================

  /**
   * GET /api/voice/settings
   * Get user voice settings
   */
  router.get('/settings', async (req, res) => {
    try {
      const userId = req.user?.id || 'default';

      let settings = await prisma.voiceSettings.findUnique({
        where: { userId }
      });

      // Create default settings if not found
      if (!settings) {
        settings = await prisma.voiceSettings.create({
          data: {
            userId,
            enabled: true,
            language: 'en-US',
            continuous: false,
            interimResults: true,
            pushToTalk: false,
            pushToTalkKey: 'Space',
            confidenceThreshold: 0.7,
            autoExecute: false,
            showTranscript: true,
            playFeedbackSounds: true
          }
        });
      }

      res.json(settings);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch voice settings');
      res.status(500).json({ error: 'Failed to fetch voice settings' });
    }
  });

  /**
   * PUT /api/voice/settings
   * Update user voice settings
   */
  router.put('/settings', async (req, res) => {
    try {
      const userId = req.user?.id || 'default';
      const updates = req.body;

      // Validate updates
      const allowedFields = [
        'enabled', 'language', 'continuous', 'interimResults',
        'pushToTalk', 'pushToTalkKey', 'confidenceThreshold',
        'autoExecute', 'showTranscript', 'playFeedbackSounds'
      ];

      const filteredUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      const settings = await prisma.voiceSettings.upsert({
        where: { userId },
        update: filteredUpdates,
        create: { userId, ...filteredUpdates }
      });

      res.json(settings);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to update voice settings');
      res.status(500).json({ error: 'Failed to update voice settings' });
    }
  });

  // ============================================
  // Voice Command Processing
  // ============================================

  /**
   * POST /api/voice/process
   * Process a voice transcript and return parsed command
   */
  router.post('/process', async (req, res) => {
    try {
      const { transcript, sessionId, confidence: inputConfidence } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: 'Missing transcript' });
      }

      // Parse the transcript
      const parsed = parseCommand(transcript);

      // Store in database if sessionId provided
      let voiceCommand = null;
      if (sessionId) {
        try {
          voiceCommand = await prisma.voiceCommand.create({
            data: {
              sessionId,
              transcript,
              parsedCommand: parsed.command,
              action: parsed.action,
              confidence: parsed.confidence,
              inputConfidence: inputConfidence || 0,
              executed: false
            }
          });
        } catch (dbError) {
          // Log but don't fail the request
          log.error({ error: dbError.message }, 'failed to store voice command');
        }
      }

      res.json({
        success: true,
        commandId: voiceCommand?.id || null,
        command: parsed,
        suggestions: parsed.suggestions || []
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to process voice command');
      res.status(500).json({ error: 'Failed to process voice command' });
    }
  });

  /**
   * POST /api/voice/execute
   * Mark a command as executed
   */
  router.post('/execute', async (req, res) => {
    try {
      const { commandId, confirmed } = req.body;

      if (!commandId) {
        return res.json({ success: true, message: 'No command ID provided' });
      }

      if (!confirmed) {
        return res.json({ success: false, message: 'Command not confirmed' });
      }

      const command = await prisma.voiceCommand.update({
        where: { id: commandId },
        data: {
          executed: true,
          executedAt: new Date()
        }
      });

      res.json({
        success: true,
        command: command.parsedCommand,
        action: command.action
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to execute voice command');
      res.status(500).json({ error: 'Failed to execute voice command' });
    }
  });

  // ============================================
  // Voice Command History
  // ============================================

  /**
   * GET /api/voice/history
   * Get voice command history
   */
  router.get('/history', async (req, res) => {
    try {
      const { sessionId, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (sessionId) {
        where.sessionId = sessionId;
      }

      const commands = await prisma.voiceCommand.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      const total = await prisma.voiceCommand.count({ where });

      res.json({
        commands,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch voice history');
      res.status(500).json({ error: 'Failed to fetch voice history' });
    }
  });

  /**
   * DELETE /api/voice/history
   * Clear voice command history
   */
  router.delete('/history', async (req, res) => {
    try {
      const { sessionId } = req.query;

      const where = {};
      if (sessionId) {
        where.sessionId = sessionId;
      }

      const result = await prisma.voiceCommand.deleteMany({ where });

      res.json({
        success: true,
        deleted: result.count
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to clear voice history');
      res.status(500).json({ error: 'Failed to clear voice history' });
    }
  });

  // ============================================
  // Voice Command Reference
  // ============================================

  /**
   * GET /api/voice/commands
   * Get all available voice commands
   */
  router.get('/commands', (req, res) => {
    try {
      const { format = 'grouped' } = req.query;

      if (format === 'flat') {
        res.json(getAllCommandsFlat());
      } else {
        res.json(getAllCommands());
      }
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch voice commands');
      res.status(500).json({ error: 'Failed to fetch voice commands' });
    }
  });

  // ============================================
  // Voice Macros
  // ============================================

  /**
   * GET /api/voice/macros
   * Get user voice macros
   */
  router.get('/macros', async (req, res) => {
    try {
      const userId = req.user?.id || 'default';

      const macros = await prisma.voiceMacro.findMany({
        where: { userId },
        orderBy: { executionCount: 'desc' }
      });

      res.json(macros);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to fetch voice macros');
      res.status(500).json({ error: 'Failed to fetch voice macros' });
    }
  });

  /**
   * POST /api/voice/macros
   * Create a voice macro
   */
  router.post('/macros', async (req, res) => {
    try {
      const userId = req.user?.id || 'default';
      const { name, triggerPhrase, commands, description } = req.body;

      if (!name || !triggerPhrase || !commands) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const macro = await prisma.voiceMacro.create({
        data: {
          userId,
          name,
          triggerPhrase: triggerPhrase.toLowerCase().trim(),
          commands: JSON.stringify(commands),
          description,
          executionCount: 0
        }
      });

      res.json(macro);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to create voice macro');
      res.status(500).json({ error: 'Failed to create voice macro' });
    }
  });

  /**
   * PUT /api/voice/macros/:id
   * Update a voice macro
   */
  router.put('/macros/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, triggerPhrase, commands, description } = req.body;

      const updates = {};
      if (name) updates.name = name;
      if (triggerPhrase) updates.triggerPhrase = triggerPhrase.toLowerCase().trim();
      if (commands) updates.commands = JSON.stringify(commands);
      if (description !== undefined) updates.description = description;

      const macro = await prisma.voiceMacro.update({
        where: { id },
        data: updates
      });

      res.json(macro);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to update voice macro');
      res.status(500).json({ error: 'Failed to update voice macro' });
    }
  });

  /**
   * POST /api/voice/macros/:id/execute
   * Execute a voice macro
   */
  router.post('/macros/:id/execute', async (req, res) => {
    try {
      const { id } = req.params;

      const macro = await prisma.voiceMacro.update({
        where: { id },
        data: {
          executionCount: { increment: 1 },
          lastExecuted: new Date()
        }
      });

      const commands = JSON.parse(macro.commands);

      res.json({
        success: true,
        commands,
        macro
      });
    } catch (error) {
      log.error({ error: error.message, macroId: req.params.id, requestId: req.id }, 'failed to execute voice macro');
      res.status(500).json({ error: 'Failed to execute voice macro' });
    }
  });

  /**
   * DELETE /api/voice/macros/:id
   * Delete a voice macro
   */
  router.delete('/macros/:id', async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.voiceMacro.delete({ where: { id } });

      res.json({ success: true });
    } catch (error) {
      log.error({ error: error.message, macroId: req.params.id, requestId: req.id }, 'failed to delete voice macro');
      res.status(500).json({ error: 'Failed to delete voice macro' });
    }
  });

  // ============================================
  // Whisper Transcription (Phase 4)
  // ============================================

  /**
   * GET /api/voice/whisper/status
   * Get Whisper service status
   */
  router.get('/whisper/status', async (req, res) => {
    try {
      const status = await whisperService.getStatus();
      res.json(status);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Whisper status');
      res.status(500).json({ error: 'Failed to get Whisper status' });
    }
  });

  /**
   * POST /api/voice/whisper/initialize
   * Initialize Whisper service
   */
  router.post('/whisper/initialize', async (req, res) => {
    try {
      const success = await whisperService.initialize();
      res.json({
        success,
        status: await whisperService.getStatus()
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to initialize Whisper');
      res.status(500).json({ error: 'Failed to initialize Whisper' });
    }
  });

  /**
   * GET /api/voice/whisper/models
   * Get available Whisper models
   */
  router.get('/whisper/models', (req, res) => {
    try {
      const models = whisperService.getModels();
      res.json(models);
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get Whisper models');
      res.status(500).json({ error: 'Failed to get Whisper models' });
    }
  });

  /**
   * POST /api/voice/whisper/model
   * Set active Whisper model
   */
  router.post('/whisper/model', async (req, res) => {
    try {
      const { model } = req.body;

      if (!model) {
        return res.status(400).json({ error: 'Model name required' });
      }

      whisperService.setModel(model);

      // Optionally download model
      if (req.body.download) {
        await whisperService.downloadModel(model);
      }

      res.json({
        success: true,
        model,
        status: await whisperService.getStatus()
      });
    } catch (error) {
      log.error({ error: error.message, model: req.body.model, requestId: req.id }, 'failed to set Whisper model');
      res.status(500).json({ error: error.message || 'Failed to set Whisper model' });
    }
  });

  /**
   * POST /api/voice/whisper/transcribe
   * Transcribe audio using Whisper
   */
  router.post('/whisper/transcribe', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const options = {
        model: req.body.model,
        language: req.body.language || 'en',
        translate: req.body.translate === 'true',
        timestamps: req.body.timestamps === 'true',
        prompt: req.body.prompt
      };

      // Transcribe using Whisper
      const result = await whisperService.transcribeBlob(
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        options
      );

      // Parse the transcription as a command
      const parsed = parseCommand(result.text);

      // Store in database if sessionId provided
      let voiceCommand = null;
      if (req.body.sessionId) {
        try {
          voiceCommand = await prisma.voiceCommand.create({
            data: {
              sessionId: req.body.sessionId,
              transcript: result.text,
              parsedCommand: parsed.command,
              action: parsed.action,
              confidence: parsed.confidence,
              inputConfidence: result.confidence || 0.9,
              executed: false
            }
          });
        } catch (dbError) {
          log.error({ error: dbError.message }, 'failed to store voice command');
        }
      }

      res.json({
        success: true,
        transcription: result,
        commandId: voiceCommand?.id || null,
        command: parsed
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to transcribe with Whisper');
      res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
    }
  });

  /**
   * POST /api/voice/whisper/download
   * Download a Whisper model
   */
  router.post('/whisper/download', async (req, res) => {
    try {
      const { model } = req.body;

      if (!model) {
        return res.status(400).json({ error: 'Model name required' });
      }

      const modelPath = await whisperService.downloadModel(model);

      res.json({
        success: true,
        model,
        path: modelPath
      });
    } catch (error) {
      log.error({ error: error.message, model: req.body.model, requestId: req.id }, 'failed to download Whisper model');
      res.status(500).json({ error: error.message || 'Failed to download model' });
    }
  });

  // ============================================
  // AI-Enhanced Parsing (Phase 5)
  // ============================================

  /**
   * GET /api/voice/ai/status
   * Get AI service status
   */
  router.get('/ai/status', (req, res) => {
    res.json({
      available: voiceAIService.isAvailable(),
      model: 'claude-3-haiku-20240307'
    });
  });

  /**
   * POST /api/voice/ai/parse
   * Parse voice command using AI with context awareness
   */
  router.post('/ai/parse', async (req, res) => {
    try {
      const {
        transcript,
        sessionId,
        currentProject,
        currentBranch,
        recentCommands,
        recentVoiceCommands
      } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: 'Missing transcript' });
      }

      if (!voiceAIService.isAvailable()) {
        // Fall back to regex-based parsing
        const parsed = parseCommand(transcript);
        return res.json({
          success: true,
          command: parsed,
          aiParsed: false,
          fallback: true
        });
      }

      const result = await voiceAIService.parseCommand(transcript, {
        sessionId,
        currentProject,
        currentBranch,
        recentCommands,
        recentVoiceCommands
      });

      // Store in database if sessionId provided
      let voiceCommand = null;
      if (sessionId && result.parsed) {
        try {
          voiceCommand = await prisma.voiceCommand.create({
            data: {
              sessionId,
              transcript,
              parsedCommand: result.parsed.command,
              action: result.parsed.action,
              confidence: result.parsed.confidence,
              inputConfidence: 0.9,
              executed: false
            }
          });
        } catch (dbError) {
          log.error({ error: dbError.message }, 'failed to store voice command');
        }
      }

      res.json({
        success: true,
        commandId: voiceCommand?.id || null,
        command: result.parsed,
        aiParsed: true,
        explanation: result.parsed?.explanation
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'AI parsing failed, falling back to regex');

      // Fall back to regex parsing on error
      const parsed = parseCommand(req.body.transcript);
      res.json({
        success: true,
        command: parsed,
        aiParsed: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/voice/ai/disambiguate
   * Use AI to choose between ambiguous command interpretations
   */
  router.post('/ai/disambiguate', async (req, res) => {
    try {
      const { transcript, alternatives, context } = req.body;

      if (!transcript || !alternatives?.length) {
        return res.status(400).json({ error: 'Missing transcript or alternatives' });
      }

      if (!voiceAIService.isAvailable()) {
        return res.json({
          success: true,
          selected: alternatives[0],
          aiSelected: false
        });
      }

      const selected = await voiceAIService.disambiguate(transcript, alternatives, context);

      res.json({
        success: true,
        selected,
        aiSelected: true
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to disambiguate command');
      res.status(500).json({ error: 'Failed to disambiguate' });
    }
  });

  /**
   * POST /api/voice/ai/suggest
   * Get AI-powered command suggestions based on context
   */
  router.post('/ai/suggest', async (req, res) => {
    try {
      const { currentProject, currentBranch, recentCommands, lastError } = req.body;

      if (!voiceAIService.isAvailable()) {
        return res.json({
          suggestions: [],
          aiGenerated: false
        });
      }

      const suggestions = await voiceAIService.suggestCommands({
        currentProject,
        currentBranch,
        recentCommands,
        lastError
      });

      res.json({
        suggestions,
        aiGenerated: true
      });
    } catch (error) {
      log.error({ error: error.message, requestId: req.id }, 'failed to get suggestions');
      res.json({ suggestions: [], aiGenerated: false });
    }
  });

  /**
   * POST /api/voice/ai/conversation
   * Continue multi-turn voice conversation
   */
  router.post('/ai/conversation', async (req, res) => {
    try {
      const { sessionId, message, context } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
      }

      if (!voiceAIService.isAvailable()) {
        return res.status(503).json({ error: 'AI service not available' });
      }

      const result = await voiceAIService.continueConversation(sessionId, message, context);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      log.error({ error: error.message, sessionId: req.body.sessionId, requestId: req.id }, 'voice conversation failed');
      res.status(500).json({ error: 'Conversation failed' });
    }
  });

  /**
   * DELETE /api/voice/ai/conversation/:sessionId
   * Clear conversation history for a session
   */
  router.delete('/ai/conversation/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    voiceAIService.clearHistory(sessionId);
    res.json({ success: true });
  });

  return router;
}

export default createVoiceRouter;
