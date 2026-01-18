/**
 * Tests for Voice API Routes
 * Tests settings, command processing, history, macros, Whisper, and AI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createVoiceRouter } from './voice.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock error response
vi.mock('../utils/errorResponse.js', () => ({
  sendSafeError: vi.fn((res, error, options) => {
    res.status(500).json({ error: options.userMessage });
  }),
}));

// Mock command patterns
vi.mock('../utils/commandPatterns.js', () => ({
  parseCommand: vi.fn((transcript) => ({
    command: transcript.toLowerCase().includes('git') ? 'git status' : 'echo test',
    action: 'execute',
    confidence: 0.95,
    suggestions: [],
  })),
  getAllCommands: vi.fn(() => ({
    git: [{ pattern: 'git status', action: 'git status' }],
    file: [{ pattern: 'list files', action: 'ls' }],
  })),
  getAllCommandsFlat: vi.fn(() => [
    { pattern: 'git status', action: 'git status', category: 'git' },
    { pattern: 'list files', action: 'ls', category: 'file' },
  ]),
}));

// Mock whisper service
vi.mock('../services/whisperService.js', () => ({
  whisperService: {
    getStatus: vi.fn(),
    initialize: vi.fn(),
    getModels: vi.fn(),
    setModel: vi.fn(),
    downloadModel: vi.fn(),
    transcribeBlob: vi.fn(),
  },
}));

// Mock voice AI service
vi.mock('../services/voiceAIService.js', () => ({
  voiceAIService: {
    initialize: vi.fn(),
    isAvailable: vi.fn(),
    parseCommand: vi.fn(),
    disambiguate: vi.fn(),
    suggestCommands: vi.fn(),
    continueConversation: vi.fn(),
    clearHistory: vi.fn(),
  },
}));

// Import mocked modules for manipulation
import { whisperService } from '../services/whisperService.js';
import { voiceAIService } from '../services/voiceAIService.js';
import { parseCommand, getAllCommands, getAllCommandsFlat } from '../utils/commandPatterns.js';

// Create mock prisma
function createMockPrisma() {
  return {
    voiceSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    voiceCommand: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    voiceMacro: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

// Create app with router
function createApp(prisma) {
  const app = express();
  app.use(express.json());
  // Add mock user
  app.use((req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  });
  app.use('/api/voice', createVoiceRouter(prisma));
  return app;
}

describe('Voice Routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ==========================================================================
  // VOICE SETTINGS
  // ==========================================================================
  describe('GET /api/voice/settings', () => {
    it('should return existing settings', async () => {
      const settings = {
        id: 'vs-1',
        userId: 'user-1',
        enabled: true,
        language: 'en-US',
        continuous: false,
        confidenceThreshold: 0.7,
      };
      mockPrisma.voiceSettings.findUnique.mockResolvedValue(settings);

      const res = await request(app).get('/api/voice/settings');

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.language).toBe('en-US');
    });

    it('should create default settings if not found', async () => {
      mockPrisma.voiceSettings.findUnique.mockResolvedValue(null);
      mockPrisma.voiceSettings.create.mockResolvedValue({
        id: 'vs-new',
        userId: 'user-1',
        enabled: true,
        language: 'en-US',
        confidenceThreshold: 0.7,
      });

      const res = await request(app).get('/api/voice/settings');

      expect(res.status).toBe(200);
      expect(mockPrisma.voiceSettings.create).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceSettings.findUnique.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/voice/settings');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/voice/settings', () => {
    it('should update settings with allowed fields', async () => {
      const updated = {
        id: 'vs-1',
        userId: 'user-1',
        enabled: false,
        language: 'es-ES',
        continuous: true,
      };
      mockPrisma.voiceSettings.upsert.mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/voice/settings')
        .send({
          enabled: false,
          language: 'es-ES',
          continuous: true,
          invalidField: 'ignored',
        });

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it('should filter out invalid fields', async () => {
      mockPrisma.voiceSettings.upsert.mockResolvedValue({ id: 'vs-1' });

      await request(app)
        .put('/api/voice/settings')
        .send({
          enabled: true,
          hackAttempt: 'DROP TABLE',
        });

      const call = mockPrisma.voiceSettings.upsert.mock.calls[0][0];
      expect(call.update).not.toHaveProperty('hackAttempt');
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceSettings.upsert.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .put('/api/voice/settings')
        .send({ enabled: true });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // VOICE COMMAND PROCESSING
  // ==========================================================================
  describe('POST /api/voice/process', () => {
    it('should process transcript and return parsed command', async () => {
      const res = await request(app)
        .post('/api/voice/process')
        .send({ transcript: 'git status' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.command).toBeDefined();
      expect(parseCommand).toHaveBeenCalledWith('git status');
    });

    it('should store command in database when sessionId provided', async () => {
      mockPrisma.voiceCommand.create.mockResolvedValue({
        id: 'vc-1',
        transcript: 'git status',
      });

      const res = await request(app)
        .post('/api/voice/process')
        .send({
          transcript: 'git status',
          sessionId: 'session-1',
          confidence: 0.95,
        });

      expect(res.status).toBe(200);
      expect(res.body.commandId).toBe('vc-1');
      expect(mockPrisma.voiceCommand.create).toHaveBeenCalled();
    });

    it('should continue even if database storage fails', async () => {
      mockPrisma.voiceCommand.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/voice/process')
        .send({
          transcript: 'git status',
          sessionId: 'session-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.commandId).toBeNull();
    });

    it('should reject missing transcript', async () => {
      const res = await request(app)
        .post('/api/voice/process')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing transcript');
    });
  });

  describe('POST /api/voice/execute', () => {
    it('should mark command as executed', async () => {
      mockPrisma.voiceCommand.update.mockResolvedValue({
        id: 'vc-1',
        parsedCommand: 'git status',
        action: 'execute',
        executed: true,
      });

      const res = await request(app)
        .post('/api/voice/execute')
        .send({ commandId: 'vc-1', confirmed: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.command).toBe('git status');
    });

    it('should handle missing commandId gracefully', async () => {
      const res = await request(app)
        .post('/api/voice/execute')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('No command ID provided');
    });

    it('should reject unconfirmed commands', async () => {
      const res = await request(app)
        .post('/api/voice/execute')
        .send({ commandId: 'vc-1', confirmed: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Command not confirmed');
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceCommand.update.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/voice/execute')
        .send({ commandId: 'vc-1', confirmed: true });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // VOICE COMMAND HISTORY
  // ==========================================================================
  describe('GET /api/voice/history', () => {
    it('should return paginated history', async () => {
      const commands = [
        { id: 'vc-1', transcript: 'git status', executed: true },
        { id: 'vc-2', transcript: 'npm test', executed: false },
      ];
      mockPrisma.voiceCommand.findMany.mockResolvedValue(commands);
      mockPrisma.voiceCommand.count.mockResolvedValue(2);

      const res = await request(app).get('/api/voice/history');

      expect(res.status).toBe(200);
      expect(res.body.commands).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should filter by sessionId', async () => {
      mockPrisma.voiceCommand.findMany.mockResolvedValue([]);
      mockPrisma.voiceCommand.count.mockResolvedValue(0);

      await request(app).get('/api/voice/history?sessionId=session-1');

      expect(mockPrisma.voiceCommand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'session-1' },
        })
      );
    });

    it('should respect pagination parameters', async () => {
      mockPrisma.voiceCommand.findMany.mockResolvedValue([]);
      mockPrisma.voiceCommand.count.mockResolvedValue(100);

      const res = await request(app).get('/api/voice/history?limit=10&offset=20');

      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(20);
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceCommand.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/voice/history');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/voice/history', () => {
    it('should clear all history', async () => {
      mockPrisma.voiceCommand.deleteMany.mockResolvedValue({ count: 10 });

      const res = await request(app).delete('/api/voice/history');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted).toBe(10);
    });

    it('should clear history for specific session', async () => {
      mockPrisma.voiceCommand.deleteMany.mockResolvedValue({ count: 5 });

      await request(app).delete('/api/voice/history?sessionId=session-1');

      expect(mockPrisma.voiceCommand.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceCommand.deleteMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/api/voice/history');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // VOICE COMMANDS REFERENCE
  // ==========================================================================
  describe('GET /api/voice/commands', () => {
    it('should return grouped commands by default', async () => {
      const res = await request(app).get('/api/voice/commands');

      expect(res.status).toBe(200);
      expect(getAllCommands).toHaveBeenCalled();
    });

    it('should return flat commands when format=flat', async () => {
      const res = await request(app).get('/api/voice/commands?format=flat');

      expect(res.status).toBe(200);
      expect(getAllCommandsFlat).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // VOICE MACROS
  // ==========================================================================
  describe('GET /api/voice/macros', () => {
    it('should return user macros', async () => {
      const macros = [
        { id: 'm-1', name: 'Build', triggerPhrase: 'build project', executionCount: 5 },
        { id: 'm-2', name: 'Deploy', triggerPhrase: 'deploy production', executionCount: 2 },
      ];
      mockPrisma.voiceMacro.findMany.mockResolvedValue(macros);

      const res = await request(app).get('/api/voice/macros');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceMacro.findMany.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/voice/macros');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/voice/macros', () => {
    it('should create a macro', async () => {
      const macro = {
        id: 'm-new',
        name: 'Build All',
        triggerPhrase: 'build everything',
        commands: '["npm run build","npm run test"]',
      };
      mockPrisma.voiceMacro.create.mockResolvedValue(macro);

      const res = await request(app)
        .post('/api/voice/macros')
        .send({
          name: 'Build All',
          triggerPhrase: 'Build Everything',
          commands: ['npm run build', 'npm run test'],
          description: 'Build and test',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Build All');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/voice/macros')
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should normalize trigger phrase to lowercase', async () => {
      mockPrisma.voiceMacro.create.mockResolvedValue({ id: 'm-1' });

      await request(app)
        .post('/api/voice/macros')
        .send({
          name: 'Test',
          triggerPhrase: 'BUILD PROJECT',
          commands: ['npm build'],
        });

      const call = mockPrisma.voiceMacro.create.mock.calls[0][0];
      expect(call.data.triggerPhrase).toBe('build project');
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceMacro.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/voice/macros')
        .send({
          name: 'Test',
          triggerPhrase: 'test',
          commands: ['echo test'],
        });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/voice/macros/:id', () => {
    it('should update a macro', async () => {
      mockPrisma.voiceMacro.update.mockResolvedValue({
        id: 'm-1',
        name: 'Updated Name',
      });

      const res = await request(app)
        .put('/api/voice/macros/m-1')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should normalize trigger phrase on update', async () => {
      mockPrisma.voiceMacro.update.mockResolvedValue({ id: 'm-1' });

      await request(app)
        .put('/api/voice/macros/m-1')
        .send({ triggerPhrase: 'NEW PHRASE' });

      const call = mockPrisma.voiceMacro.update.mock.calls[0][0];
      expect(call.data.triggerPhrase).toBe('new phrase');
    });

    it('should handle database errors', async () => {
      mockPrisma.voiceMacro.update.mockRejectedValue(new Error('Not found'));

      const res = await request(app)
        .put('/api/voice/macros/nonexistent')
        .send({ name: 'Test' });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/voice/macros/:id/execute', () => {
    it('should execute macro and return commands', async () => {
      mockPrisma.voiceMacro.update.mockResolvedValue({
        id: 'm-1',
        name: 'Build',
        commands: '["npm run build","npm run test"]',
        executionCount: 6,
      });

      const res = await request(app).post('/api/voice/macros/m-1/execute');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.commands).toEqual(['npm run build', 'npm run test']);
    });

    it('should increment execution count', async () => {
      mockPrisma.voiceMacro.update.mockResolvedValue({
        id: 'm-1',
        commands: '[]',
      });

      await request(app).post('/api/voice/macros/m-1/execute');

      expect(mockPrisma.voiceMacro.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executionCount: { increment: 1 },
          }),
        })
      );
    });

    it('should handle non-existent macro', async () => {
      mockPrisma.voiceMacro.update.mockRejectedValue(new Error('Not found'));

      const res = await request(app).post('/api/voice/macros/nonexistent/execute');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/voice/macros/:id', () => {
    it('should delete a macro', async () => {
      mockPrisma.voiceMacro.delete.mockResolvedValue({ id: 'm-1' });

      const res = await request(app).delete('/api/voice/macros/m-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle non-existent macro', async () => {
      mockPrisma.voiceMacro.delete.mockRejectedValue(new Error('Not found'));

      const res = await request(app).delete('/api/voice/macros/nonexistent');

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // WHISPER TRANSCRIPTION
  // ==========================================================================
  describe('GET /api/voice/whisper/status', () => {
    it('should return Whisper status', async () => {
      whisperService.getStatus.mockResolvedValue({
        available: true,
        model: 'base',
        modelPath: '/models/base.bin',
      });

      const res = await request(app).get('/api/voice/whisper/status');

      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
    });

    it('should handle errors', async () => {
      whisperService.getStatus.mockRejectedValue(new Error('Status error'));

      const res = await request(app).get('/api/voice/whisper/status');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/voice/whisper/initialize', () => {
    it('should initialize Whisper service', async () => {
      whisperService.initialize.mockResolvedValue(true);
      whisperService.getStatus.mockResolvedValue({ available: true });

      const res = await request(app).post('/api/voice/whisper/initialize');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle initialization failure', async () => {
      whisperService.initialize.mockRejectedValue(new Error('Init failed'));

      const res = await request(app).post('/api/voice/whisper/initialize');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/voice/whisper/models', () => {
    it('should return available models', async () => {
      whisperService.getModels.mockReturnValue([
        { name: 'tiny', size: '75 MB' },
        { name: 'base', size: '148 MB' },
        { name: 'small', size: '488 MB' },
      ]);

      const res = await request(app).get('/api/voice/whisper/models');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });
  });

  describe('POST /api/voice/whisper/model', () => {
    it('should set active model', async () => {
      whisperService.getStatus.mockResolvedValue({ model: 'small' });

      const res = await request(app)
        .post('/api/voice/whisper/model')
        .send({ model: 'small' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(whisperService.setModel).toHaveBeenCalledWith('small');
    });

    it('should download model when requested', async () => {
      whisperService.downloadModel.mockResolvedValue('/models/small.bin');
      whisperService.getStatus.mockResolvedValue({ model: 'small' });

      const res = await request(app)
        .post('/api/voice/whisper/model')
        .send({ model: 'small', download: true });

      expect(res.status).toBe(200);
      expect(whisperService.downloadModel).toHaveBeenCalledWith('small');
    });

    it('should reject missing model name', async () => {
      const res = await request(app)
        .post('/api/voice/whisper/model')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Model name required');
    });
  });

  describe('POST /api/voice/whisper/download', () => {
    it('should download model', async () => {
      whisperService.downloadModel.mockResolvedValue('/models/small.bin');

      const res = await request(app)
        .post('/api/voice/whisper/download')
        .send({ model: 'small' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.path).toBe('/models/small.bin');
    });

    it('should reject missing model name', async () => {
      const res = await request(app)
        .post('/api/voice/whisper/download')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Model name required');
    });

    it('should handle download errors', async () => {
      whisperService.downloadModel.mockRejectedValue(new Error('Download failed'));

      const res = await request(app)
        .post('/api/voice/whisper/download')
        .send({ model: 'large' });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================================================
  // AI-ENHANCED PARSING
  // ==========================================================================
  describe('GET /api/voice/ai/status', () => {
    it('should return AI service status', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);

      const res = await request(app).get('/api/voice/ai/status');

      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.model).toBe('claude-3-haiku-20240307');
    });
  });

  describe('POST /api/voice/ai/parse', () => {
    it('should parse command with AI when available', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.parseCommand.mockResolvedValue({
        parsed: {
          command: 'git push origin main',
          action: 'execute',
          confidence: 0.98,
          explanation: 'Push to main branch',
        },
      });

      const res = await request(app)
        .post('/api/voice/ai/parse')
        .send({
          transcript: 'push to main',
          currentProject: 'test-project',
          currentBranch: 'main',
        });

      expect(res.status).toBe(200);
      expect(res.body.aiParsed).toBe(true);
      expect(res.body.command.command).toBe('git push origin main');
    });

    it('should fall back to regex when AI not available', async () => {
      voiceAIService.isAvailable.mockReturnValue(false);

      const res = await request(app)
        .post('/api/voice/ai/parse')
        .send({ transcript: 'git status' });

      expect(res.status).toBe(200);
      expect(res.body.aiParsed).toBe(false);
      expect(res.body.fallback).toBe(true);
    });

    it('should store command when sessionId provided', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.parseCommand.mockResolvedValue({
        parsed: { command: 'git status', action: 'execute', confidence: 0.95 },
      });
      mockPrisma.voiceCommand.create.mockResolvedValue({ id: 'vc-1' });

      const res = await request(app)
        .post('/api/voice/ai/parse')
        .send({
          transcript: 'git status',
          sessionId: 'session-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.commandId).toBe('vc-1');
    });

    it('should reject missing transcript', async () => {
      const res = await request(app)
        .post('/api/voice/ai/parse')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing transcript');
    });

    it('should fall back to regex on AI error', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.parseCommand.mockRejectedValue(new Error('AI error'));

      const res = await request(app)
        .post('/api/voice/ai/parse')
        .send({ transcript: 'git status' });

      expect(res.status).toBe(200);
      expect(res.body.aiParsed).toBe(false);
      expect(res.body.error).toBe('AI error');
    });
  });

  describe('POST /api/voice/ai/disambiguate', () => {
    it('should disambiguate with AI when available', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.disambiguate.mockResolvedValue({
        command: 'npm run test',
        confidence: 0.9,
      });

      const res = await request(app)
        .post('/api/voice/ai/disambiguate')
        .send({
          transcript: 'run tests',
          alternatives: [
            { command: 'npm run test' },
            { command: 'npm test' },
          ],
          context: { currentProject: 'test' },
        });

      expect(res.status).toBe(200);
      expect(res.body.aiSelected).toBe(true);
      expect(res.body.selected.command).toBe('npm run test');
    });

    it('should use first alternative when AI not available', async () => {
      voiceAIService.isAvailable.mockReturnValue(false);

      const res = await request(app)
        .post('/api/voice/ai/disambiguate')
        .send({
          transcript: 'run tests',
          alternatives: [
            { command: 'npm run test' },
            { command: 'npm test' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.aiSelected).toBe(false);
      expect(res.body.selected.command).toBe('npm run test');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/voice/ai/disambiguate')
        .send({ transcript: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing transcript or alternatives');
    });
  });

  describe('POST /api/voice/ai/suggest', () => {
    it('should return AI-generated suggestions', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.suggestCommands.mockResolvedValue([
        { command: 'git status', reason: 'Check for changes' },
        { command: 'npm test', reason: 'Run tests' },
      ]);

      const res = await request(app)
        .post('/api/voice/ai/suggest')
        .send({
          currentProject: 'test',
          recentCommands: ['git add .'],
        });

      expect(res.status).toBe(200);
      expect(res.body.aiGenerated).toBe(true);
      expect(res.body.suggestions).toHaveLength(2);
    });

    it('should return empty array when AI not available', async () => {
      voiceAIService.isAvailable.mockReturnValue(false);

      const res = await request(app)
        .post('/api/voice/ai/suggest')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.aiGenerated).toBe(false);
      expect(res.body.suggestions).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.suggestCommands.mockRejectedValue(new Error('AI error'));

      const res = await request(app)
        .post('/api/voice/ai/suggest')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });
  });

  describe('POST /api/voice/ai/conversation', () => {
    it('should continue conversation', async () => {
      voiceAIService.isAvailable.mockReturnValue(true);
      voiceAIService.continueConversation.mockResolvedValue({
        response: 'I can help you with that',
        command: 'npm install lodash',
      });

      const res = await request(app)
        .post('/api/voice/ai/conversation')
        .send({
          sessionId: 'session-1',
          message: 'install lodash',
          context: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.response).toBeDefined();
    });

    it('should reject missing sessionId or message', async () => {
      const res = await request(app)
        .post('/api/voice/ai/conversation')
        .send({ sessionId: 'session-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing sessionId or message');
    });

    it('should return 503 when AI not available', async () => {
      voiceAIService.isAvailable.mockReturnValue(false);

      const res = await request(app)
        .post('/api/voice/ai/conversation')
        .send({
          sessionId: 'session-1',
          message: 'hello',
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('AI service not available');
    });
  });

  describe('DELETE /api/voice/ai/conversation/:sessionId', () => {
    it('should clear conversation history', async () => {
      const res = await request(app).delete('/api/voice/ai/conversation/session-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(voiceAIService.clearHistory).toHaveBeenCalledWith('session-1');
    });
  });
});
