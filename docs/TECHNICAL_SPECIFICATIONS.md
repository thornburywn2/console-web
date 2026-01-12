# Technical Specifications

**Project:** Console.web Voice & AI Integration
**Version:** 1.0.0
**Created:** 2026-01-12
**Status:** Implementation Ready

---

## Table of Contents

1. [P0: Voice-to-Code Integration](#p0-voice-to-code-integration)
2. [P1: Aider Integration](#p1-aider-integration)
3. [P2: Tabby Docker Management](#p2-tabby-docker-management)
4. [P3: Claude Flow Multi-Agent](#p3-claude-flow-multi-agent)

---

# P0: Voice-to-Code Integration

## Overview

Implement comprehensive voice command capabilities for Console.web, enabling users to control Claude Code sessions, navigate the UI, and execute commands using natural speech.

---

## Phase 1: Basic Voice Input

### 1.1 Component Architecture

```
src/
├── components/
│   ├── voice/
│   │   ├── VoiceCommandPanel.jsx      # Main voice UI component
│   │   ├── VoiceButton.jsx            # Microphone toggle button
│   │   ├── TranscriptionDisplay.jsx   # Live transcription view
│   │   ├── VoiceStatusIndicator.jsx   # Recording/processing status
│   │   └── VoiceSettings.jsx          # Voice configuration
│   └── hooks/
│       ├── useVoiceRecognition.js     # Web Speech API hook
│       ├── useVoiceCommands.js        # Command processing hook
│       └── useAudioVisualization.js   # Audio level visualization
server/
├── routes/
│   └── voice.js                       # Voice API endpoints
├── services/
│   └── voiceProcessor.js              # Server-side voice processing
└── utils/
    └── commandPatterns.js             # Pattern matching utilities
```

### 1.2 Database Schema Changes

```prisma
// prisma/schema.prisma additions

model VoiceCommand {
  id            String   @id @default(cuid())
  sessionId     String
  session       Session  @relation(fields: [sessionId], references: [id])
  transcript    String   // Raw transcription
  parsedCommand String?  // Parsed command (if recognized)
  confidence    Float    // Recognition confidence 0-1
  executed      Boolean  @default(false)
  executedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([sessionId])
  @@index([createdAt])
}

model VoiceSettings {
  id                  String   @id @default(cuid())
  userId              String   @unique
  enabled             Boolean  @default(true)
  language            String   @default("en-US")
  continuous          Boolean  @default(false)
  interimResults      Boolean  @default(true)
  pushToTalk          Boolean  @default(false)
  pushToTalkKey       String   @default("Space")
  confidenceThreshold Float    @default(0.7)
  autoExecute         Boolean  @default(false) // Execute without confirmation
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### 1.3 API Endpoints

```
POST /api/voice/process
  Request:
    {
      "transcript": "string",
      "sessionId": "string",
      "confidence": number
    }
  Response:
    {
      "success": boolean,
      "command": {
        "type": "terminal" | "navigation" | "ui" | "unknown",
        "action": "string",
        "parameters": object,
        "confidence": number
      },
      "suggestions": string[]
    }

GET /api/voice/settings
  Response: VoiceSettings object

PUT /api/voice/settings
  Request: Partial<VoiceSettings>
  Response: VoiceSettings object

GET /api/voice/history?sessionId=X&limit=50
  Response: VoiceCommand[]

POST /api/voice/execute
  Request:
    {
      "commandId": "string",
      "confirmed": boolean
    }
  Response:
    {
      "success": boolean,
      "output": "string"
    }
```

### 1.4 Socket.IO Events

```javascript
// Client → Server
socket.emit('voice-start', { sessionId });
socket.emit('voice-transcript', {
  sessionId,
  transcript,
  isFinal: boolean,
  confidence: number
});
socket.emit('voice-stop', { sessionId });
socket.emit('voice-execute', { sessionId, command });

// Server → Client
socket.on('voice-status', { status: 'listening' | 'processing' | 'ready' });
socket.on('voice-parsed', { command, confidence, suggestions });
socket.on('voice-executed', { success, output });
socket.on('voice-error', { error, code });
```

### 1.5 React Component: VoiceCommandPanel.jsx

```jsx
// src/components/voice/VoiceCommandPanel.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, Settings, History } from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useSocket } from '../hooks/useSocket';

export function VoiceCommandPanel({ sessionId, onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedCommand, setParsedCommand] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({
    language: 'en-US',
    continuous: false,
    autoExecute: false,
    confidenceThreshold: 0.7
  });

  const socket = useSocket();
  const recognition = useVoiceRecognition(settings);

  // Handle recognition results
  const handleResult = useCallback((event) => {
    let finalTranscript = '';
    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }

    setInterimTranscript(interimText);

    if (finalTranscript) {
      setTranscript(finalTranscript);
      socket.emit('voice-transcript', {
        sessionId,
        transcript: finalTranscript,
        isFinal: true,
        confidence: event.results[0][0].confidence
      });
    }
  }, [sessionId, socket]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognition) return;

    recognition.onresult = handleResult;
    recognition.onerror = (e) => console.error('Voice error:', e);
    recognition.onend = () => {
      if (settings.continuous && isListening) {
        recognition.start();
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
    setIsListening(true);
    socket.emit('voice-start', { sessionId });
  }, [recognition, handleResult, settings.continuous, isListening, sessionId, socket]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    socket.emit('voice-stop', { sessionId });
  }, [recognition, sessionId, socket]);

  // Handle parsed command from server
  useEffect(() => {
    socket.on('voice-parsed', (data) => {
      setParsedCommand(data);
      if (data.confidence >= settings.confidenceThreshold && settings.autoExecute) {
        executeCommand(data.command);
      } else {
        setShowConfirm(true);
      }
    });

    socket.on('voice-executed', (data) => {
      setHistory(prev => [{
        transcript,
        command: parsedCommand?.command,
        success: data.success,
        timestamp: new Date()
      }, ...prev.slice(0, 49)]);
      setShowConfirm(false);
      setParsedCommand(null);
      setTranscript('');
    });

    return () => {
      socket.off('voice-parsed');
      socket.off('voice-executed');
    };
  }, [socket, settings, transcript, parsedCommand]);

  // Execute command
  const executeCommand = (command) => {
    socket.emit('voice-execute', { sessionId, command });
    onCommand?.(command);
  };

  // Keyboard shortcut for push-to-talk
  useEffect(() => {
    if (!settings.pushToTalk) return;

    const handleKeyDown = (e) => {
      if (e.code === settings.pushToTalkKey && !e.repeat) {
        startListening();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === settings.pushToTalkKey) {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings.pushToTalk, settings.pushToTalkKey, startListening, stopListening]);

  return (
    <div className="voice-command-panel bg-gray-900/50 backdrop-blur border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300">Voice Commands</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {/* open history */}}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
            title="Command History"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => {/* open settings */}}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
            title="Voice Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Microphone Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'}
          `}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <span className="text-xs text-gray-400">
          {isListening ? 'Listening...' : 'Click to speak'}
          {settings.pushToTalk && ` (or hold ${settings.pushToTalkKey})`}
        </span>
      </div>

      {/* Transcription Display */}
      {(transcript || interimTranscript) && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-sm text-white">
            {transcript}
            <span className="text-gray-400 italic">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Command Confirmation Dialog */}
      {showConfirm && parsedCommand && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-blue-500">
          <p className="text-xs text-gray-400 mb-1">Recognized command:</p>
          <p className="text-sm text-white font-mono mb-3">
            {parsedCommand.command}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Confidence: {(parsedCommand.confidence * 100).toFixed(0)}%
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setParsedCommand(null);
                }}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => executeCommand(parsedCommand.command)}
                className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 rounded"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Level Visualization (optional) */}
      {isListening && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-blue-500 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 1.6 React Hook: useVoiceRecognition.js

```javascript
// src/hooks/useVoiceRecognition.js

import { useState, useEffect, useRef } from 'react';

export function useVoiceRecognition(settings = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Web Speech API not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Create recognition instance
    const recognition = new SpeechRecognition();

    // Configure
    recognition.continuous = settings.continuous ?? false;
    recognition.interimResults = settings.interimResults ?? true;
    recognition.lang = settings.language ?? 'en-US';
    recognition.maxAlternatives = 3;

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [settings.continuous, settings.interimResults, settings.language]);

  return recognitionRef.current;
}

export function checkVoiceSupport() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return {
    supported: !!SpeechRecognition,
    browser: navigator.userAgent.includes('Chrome') ? 'chrome' :
             navigator.userAgent.includes('Safari') ? 'safari' :
             navigator.userAgent.includes('Edge') ? 'edge' : 'unknown'
  };
}
```

### 1.7 Server Route: voice.js

```javascript
// server/routes/voice.js

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get voice settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user?.id || 'default';

    let settings = await prisma.voiceSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      settings = await prisma.voiceSettings.create({
        data: { userId }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching voice settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update voice settings
router.put('/settings', async (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const updates = req.body;

    const settings = await prisma.voiceSettings.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error updating voice settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Process voice transcript
router.post('/process', async (req, res) => {
  try {
    const { transcript, sessionId, confidence } = req.body;

    if (!transcript || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Import pattern matcher
    const { parseCommand } = await import('../utils/commandPatterns.js');

    // Parse the transcript
    const parsed = parseCommand(transcript);

    // Store in database
    const voiceCommand = await prisma.voiceCommand.create({
      data: {
        sessionId,
        transcript,
        parsedCommand: parsed.command,
        confidence: parsed.confidence,
        executed: false
      }
    });

    res.json({
      success: true,
      commandId: voiceCommand.id,
      command: parsed,
      suggestions: parsed.suggestions || []
    });
  } catch (error) {
    console.error('Error processing voice:', error);
    res.status(500).json({ error: 'Failed to process voice command' });
  }
});

// Get command history
router.get('/history', async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;

    const commands = await prisma.voiceCommand.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(commands);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Execute confirmed command
router.post('/execute', async (req, res) => {
  try {
    const { commandId, confirmed } = req.body;

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
      command: command.parsedCommand
    });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

export default router;
```

---

## Phase 2: Command Pattern Matching

### 2.1 Pattern Matching Engine

```javascript
// server/utils/commandPatterns.js

/**
 * Voice Command Pattern Matching Engine
 * Supports 50+ command patterns across 5 categories
 */

// Command pattern definitions
const PATTERNS = {
  // Terminal/Claude Code Commands
  terminal: [
    {
      patterns: [
        /^(?:ask|tell|hey)\s+claude\s+(.+)$/i,
        /^claude[,:]?\s+(.+)$/i,
        /^(?:can you|please|could you)\s+(.+)$/i
      ],
      action: 'claude-query',
      format: (match) => match[1],
      description: 'Send query to Claude Code'
    },
    {
      patterns: [
        /^run\s+(?:the\s+)?tests?$/i,
        /^(?:execute|start)\s+(?:the\s+)?tests?$/i,
        /^test\s+(?:the\s+)?(?:code|project)$/i
      ],
      action: 'run-tests',
      format: () => 'npm test',
      description: 'Run test suite'
    },
    {
      patterns: [
        /^run\s+(?:the\s+)?build$/i,
        /^build\s+(?:the\s+)?(?:project|app)$/i,
        /^(?:execute|start)\s+build$/i
      ],
      action: 'run-build',
      format: () => 'npm run build',
      description: 'Run build process'
    },
    {
      patterns: [
        /^(?:start|run)\s+(?:the\s+)?(?:dev\s+)?server$/i,
        /^(?:start|run)\s+development$/i
      ],
      action: 'start-dev',
      format: () => 'npm run dev',
      description: 'Start development server'
    },
    {
      patterns: [
        /^install\s+(?:the\s+)?(?:dependencies|packages)$/i,
        /^(?:run\s+)?npm\s+install$/i
      ],
      action: 'npm-install',
      format: () => 'npm install',
      description: 'Install dependencies'
    },
    {
      patterns: [
        /^install\s+(?:package\s+)?(.+)$/i,
        /^add\s+(?:package\s+)?(.+)$/i,
        /^npm\s+install\s+(.+)$/i
      ],
      action: 'install-package',
      format: (match) => `npm install ${match[1]}`,
      description: 'Install specific package'
    },
    {
      patterns: [
        /^(?:clear|cls)(?:\s+(?:the\s+)?(?:terminal|screen))?$/i
      ],
      action: 'clear-terminal',
      format: () => 'clear',
      description: 'Clear terminal'
    },
    {
      patterns: [
        /^(?:stop|cancel|abort|ctrl\s*c)$/i,
        /^(?:kill|terminate)\s+(?:the\s+)?(?:process|command)$/i
      ],
      action: 'send-interrupt',
      format: () => '\x03', // Ctrl+C
      description: 'Send interrupt signal'
    },
    {
      patterns: [
        /^(?:show|list|display)\s+(?:the\s+)?files?$/i,
        /^(?:what(?:'s| is)\s+(?:in\s+)?(?:this|the)\s+)?(?:directory|folder)$/i,
        /^ls$/i
      ],
      action: 'list-files',
      format: () => 'ls -la',
      description: 'List directory contents'
    },
    {
      patterns: [
        /^(?:go\s+(?:to|into)|cd|change\s+(?:to|directory))\s+(.+)$/i,
        /^(?:open|enter)\s+(?:the\s+)?(?:folder|directory)\s+(.+)$/i
      ],
      action: 'change-directory',
      format: (match) => `cd ${match[1]}`,
      description: 'Change directory'
    },
    {
      patterns: [
        /^(?:show|display|cat|read)\s+(?:the\s+)?(?:file\s+)?(.+)$/i,
        /^(?:what(?:'s| is)\s+in)\s+(.+)$/i
      ],
      action: 'show-file',
      format: (match) => `cat ${match[1]}`,
      description: 'Display file contents'
    }
  ],

  // Git Commands
  git: [
    {
      patterns: [
        /^(?:git\s+)?status$/i,
        /^(?:show|check)\s+(?:git\s+)?status$/i,
        /^(?:what(?:'s| is)\s+(?:the\s+)?)?(?:git\s+)?status$/i
      ],
      action: 'git-status',
      format: () => 'git status',
      description: 'Show git status'
    },
    {
      patterns: [
        /^commit\s+(?:with\s+message\s+)?(?:"|')?(.+?)(?:"|')?$/i,
        /^(?:git\s+)?commit\s+(.+)$/i,
        /^save\s+(?:changes|work)\s+(?:as\s+)?(?:"|')?(.+?)(?:"|')?$/i
      ],
      action: 'git-commit',
      format: (match) => `git add -A && git commit -m "${match[1]}"`,
      description: 'Stage and commit changes'
    },
    {
      patterns: [
        /^push(?:\s+(?:to\s+)?(?:remote|origin))?$/i,
        /^(?:git\s+)?push$/i,
        /^upload\s+(?:changes|commits)$/i
      ],
      action: 'git-push',
      format: () => 'git push',
      description: 'Push to remote'
    },
    {
      patterns: [
        /^pull(?:\s+(?:from\s+)?(?:remote|origin))?$/i,
        /^(?:git\s+)?pull$/i,
        /^(?:get|fetch)\s+(?:latest\s+)?changes$/i
      ],
      action: 'git-pull',
      format: () => 'git pull',
      description: 'Pull from remote'
    },
    {
      patterns: [
        /^(?:show\s+)?(?:the\s+)?diff$/i,
        /^(?:what(?:'s| are)\s+(?:the\s+)?)?changes$/i,
        /^(?:git\s+)?diff$/i
      ],
      action: 'git-diff',
      format: () => 'git diff',
      description: 'Show changes'
    },
    {
      patterns: [
        /^(?:create|make|new)\s+branch\s+(.+)$/i,
        /^(?:git\s+)?(?:checkout|switch)\s+-b\s+(.+)$/i,
        /^branch\s+(.+)$/i
      ],
      action: 'git-branch-create',
      format: (match) => `git checkout -b ${match[1].replace(/\s+/g, '-')}`,
      description: 'Create new branch'
    },
    {
      patterns: [
        /^(?:switch|checkout)\s+(?:to\s+)?(?:branch\s+)?(.+)$/i,
        /^(?:go\s+to|change\s+to)\s+branch\s+(.+)$/i
      ],
      action: 'git-checkout',
      format: (match) => `git checkout ${match[1]}`,
      description: 'Switch branch'
    },
    {
      patterns: [
        /^(?:show\s+)?(?:the\s+)?(?:git\s+)?log$/i,
        /^(?:recent\s+)?commits$/i,
        /^(?:commit\s+)?history$/i
      ],
      action: 'git-log',
      format: () => 'git log --oneline -10',
      description: 'Show recent commits'
    }
  ],

  // Navigation Commands
  navigation: [
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?projects?(?:\s+(?:view|page|list))?$/i,
        /^projects?$/i
      ],
      action: 'navigate-projects',
      route: '/projects',
      description: 'Navigate to projects'
    },
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?(?:terminal|console)$/i,
        /^terminal$/i
      ],
      action: 'navigate-terminal',
      route: '/terminal',
      description: 'Navigate to terminal'
    },
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?(?:admin|dashboard)$/i,
        /^(?:admin|dashboard)$/i
      ],
      action: 'navigate-admin',
      route: '/admin',
      description: 'Navigate to admin dashboard'
    },
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?settings?$/i,
        /^settings?$/i
      ],
      action: 'navigate-settings',
      route: '/settings',
      description: 'Navigate to settings'
    },
    {
      patterns: [
        /^(?:open|switch\s+to|select)\s+(?:project\s+)?(.+)$/i,
        /^(?:work\s+on|go\s+to\s+project)\s+(.+)$/i
      ],
      action: 'open-project',
      format: (match) => ({ project: match[1] }),
      description: 'Open specific project'
    },
    {
      patterns: [
        /^(?:go\s+)?back$/i,
        /^(?:previous|back)\s+(?:page|view)$/i
      ],
      action: 'navigate-back',
      description: 'Go back'
    },
    {
      patterns: [
        /^(?:go\s+)?(?:home|start)$/i,
        /^(?:main|home)\s+(?:page|view)$/i
      ],
      action: 'navigate-home',
      route: '/',
      description: 'Go to home'
    }
  ],

  // UI Commands
  ui: [
    {
      patterns: [
        /^(?:toggle|show|hide|open|close)\s+(?:the\s+)?sidebar$/i
      ],
      action: 'toggle-sidebar',
      description: 'Toggle sidebar'
    },
    {
      patterns: [
        /^(?:dark|night)\s+mode$/i,
        /^(?:switch\s+to|enable)\s+dark(?:\s+mode)?$/i
      ],
      action: 'theme-dark',
      description: 'Switch to dark mode'
    },
    {
      patterns: [
        /^(?:light|day)\s+mode$/i,
        /^(?:switch\s+to|enable)\s+light(?:\s+mode)?$/i
      ],
      action: 'theme-light',
      description: 'Switch to light mode'
    },
    {
      patterns: [
        /^(?:full\s*screen|maximize)$/i,
        /^(?:enter|toggle)\s+full\s*screen$/i
      ],
      action: 'fullscreen-toggle',
      description: 'Toggle fullscreen'
    },
    {
      patterns: [
        /^(?:exit|leave)\s+full\s*screen$/i,
        /^(?:restore|minimize)$/i
      ],
      action: 'fullscreen-exit',
      description: 'Exit fullscreen'
    },
    {
      patterns: [
        /^(?:zoom|scale)\s+(?:in|up)$/i,
        /^(?:make\s+(?:it\s+)?)?(?:bigger|larger)$/i
      ],
      action: 'zoom-in',
      description: 'Zoom in'
    },
    {
      patterns: [
        /^(?:zoom|scale)\s+(?:out|down)$/i,
        /^(?:make\s+(?:it\s+)?)?smaller$/i
      ],
      action: 'zoom-out',
      description: 'Zoom out'
    },
    {
      patterns: [
        /^(?:reset|default)\s+zoom$/i,
        /^(?:zoom\s+)?(?:100|normal|reset)(?:\s*%)?$/i
      ],
      action: 'zoom-reset',
      description: 'Reset zoom'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:the\s+)?command\s+palette$/i,
        /^commands?$/i
      ],
      action: 'command-palette',
      description: 'Open command palette'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:the\s+)?(?:prompt|snippet)\s+library$/i,
        /^(?:prompts?|snippets?)$/i
      ],
      action: 'open-prompts',
      description: 'Open prompt library'
    }
  ],

  // Session Commands
  session: [
    {
      patterns: [
        /^(?:new|create|start)\s+(?:a\s+)?(?:new\s+)?session$/i,
        /^(?:new|fresh)\s+terminal$/i
      ],
      action: 'session-new',
      description: 'Create new session'
    },
    {
      patterns: [
        /^(?:save|persist)\s+(?:the\s+)?session$/i,
        /^(?:keep|store)\s+(?:this\s+)?session$/i
      ],
      action: 'session-save',
      description: 'Save current session'
    },
    {
      patterns: [
        /^(?:close|end|kill|terminate)\s+(?:the\s+)?session$/i,
        /^(?:exit|quit)(?:\s+session)?$/i
      ],
      action: 'session-close',
      description: 'Close session'
    },
    {
      patterns: [
        /^(?:rename|name)\s+session\s+(?:to\s+)?(.+)$/i,
        /^(?:call|set)\s+(?:this\s+)?session\s+(.+)$/i
      ],
      action: 'session-rename',
      format: (match) => ({ name: match[1] }),
      description: 'Rename session'
    },
    {
      patterns: [
        /^(?:show|list)\s+(?:all\s+)?sessions?$/i,
        /^(?:my\s+)?sessions?$/i
      ],
      action: 'session-list',
      description: 'List sessions'
    }
  ]
};

// Fuzzy matching helper
function fuzzyMatch(text, pattern) {
  const words = pattern.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();

  return words.every(word => textLower.includes(word));
}

// Calculate confidence score
function calculateConfidence(transcript, pattern, match) {
  let confidence = 0.8; // Base confidence for regex match

  // Boost for exact matches
  if (match[0].toLowerCase() === transcript.toLowerCase()) {
    confidence += 0.15;
  }

  // Boost for longer matches (more context)
  if (transcript.length > 20) {
    confidence += 0.05;
  }

  return Math.min(confidence, 1.0);
}

// Find suggestions for failed matches
function findSuggestions(transcript) {
  const suggestions = [];
  const words = transcript.toLowerCase().split(/\s+/);

  // Check for partial matches
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      const desc = item.description.toLowerCase();
      if (words.some(word => desc.includes(word))) {
        suggestions.push({
          command: item.description,
          hint: `Try: "${item.patterns[0].source.replace(/[\\^$.*+?()[\]{}|]/g, '')}"`
        });
      }
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Parse a voice transcript into a command
 * @param {string} transcript - The voice transcript
 * @returns {Object} Parsed command with confidence
 */
export function parseCommand(transcript) {
  const trimmed = transcript.trim();

  if (!trimmed) {
    return {
      type: 'unknown',
      command: null,
      confidence: 0,
      suggestions: []
    };
  }

  // Try each category
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      for (const pattern of item.patterns) {
        const match = trimmed.match(pattern);

        if (match) {
          const confidence = calculateConfidence(trimmed, pattern, match);
          const command = item.format ? item.format(match) : item.action;

          return {
            type: category,
            action: item.action,
            command: typeof command === 'string' ? command : null,
            parameters: typeof command === 'object' ? command : null,
            route: item.route || null,
            confidence,
            description: item.description,
            suggestions: []
          };
        }
      }
    }
  }

  // No match found - return with suggestions
  return {
    type: 'unknown',
    command: trimmed, // Pass through as raw command
    confidence: 0.3,
    suggestions: findSuggestions(trimmed)
  };
}

/**
 * Get all available commands
 * @returns {Array} List of all command patterns
 */
export function getAllCommands() {
  const commands = [];

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      commands.push({
        category,
        action: item.action,
        description: item.description,
        examples: item.patterns.map(p =>
          p.source.replace(/[\\^$.*+?()[\]{}|]/g, '').replace(/\s+/g, ' ')
        ).slice(0, 2)
      });
    }
  }

  return commands;
}

export default { parseCommand, getAllCommands };
```

---

## Phase 3: Smart Features

### 3.1 Voice Activity Detection (VAD)

```javascript
// src/hooks/useVoiceActivityDetection.js

import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceActivityDetection(options = {}) {
  const {
    threshold = 0.02,        // Minimum audio level to trigger
    silenceDelay = 1500,     // ms of silence before stopping
    onSpeechStart,
    onSpeechEnd,
    onAudioLevel
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const startVAD = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length) / 255;

        setAudioLevel(rms);
        onAudioLevel?.(rms);

        if (rms > threshold) {
          // Speech detected
          if (!isActive) {
            setIsActive(true);
            onSpeechStart?.();
          }

          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isActive && !silenceTimerRef.current) {
          // Start silence timer
          silenceTimerRef.current = setTimeout(() => {
            setIsActive(false);
            onSpeechEnd?.();
            silenceTimerRef.current = null;
          }, silenceDelay);
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (error) {
      console.error('VAD error:', error);
    }
  }, [threshold, silenceDelay, isActive, onSpeechStart, onSpeechEnd, onAudioLevel]);

  const stopVAD = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsActive(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => stopVAD();
  }, [stopVAD]);

  return {
    isActive,
    audioLevel,
    startVAD,
    stopVAD
  };
}
```

### 3.2 Voice Macro Recording

```javascript
// server/routes/macros.js

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Record voice macro
router.post('/record', async (req, res) => {
  try {
    const { name, commands, triggerPhrase } = req.body;
    const userId = req.user?.id || 'default';

    const macro = await prisma.voiceMacro.create({
      data: {
        userId,
        name,
        triggerPhrase: triggerPhrase.toLowerCase(),
        commands: JSON.stringify(commands),
        executionCount: 0
      }
    });

    res.json(macro);
  } catch (error) {
    console.error('Error recording macro:', error);
    res.status(500).json({ error: 'Failed to record macro' });
  }
});

// Get user macros
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'default';

    const macros = await prisma.voiceMacro.findMany({
      where: { userId },
      orderBy: { executionCount: 'desc' }
    });

    res.json(macros);
  } catch (error) {
    console.error('Error fetching macros:', error);
    res.status(500).json({ error: 'Failed to fetch macros' });
  }
});

// Execute macro
router.post('/:id/execute', async (req, res) => {
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
    console.error('Error executing macro:', error);
    res.status(500).json({ error: 'Failed to execute macro' });
  }
});

// Delete macro
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.voiceMacro.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting macro:', error);
    res.status(500).json({ error: 'Failed to delete macro' });
  }
});

export default router;
```

### 3.3 Database Schema for Macros

```prisma
// Add to prisma/schema.prisma

model VoiceMacro {
  id              String    @id @default(cuid())
  userId          String
  name            String
  triggerPhrase   String    // Voice phrase to trigger
  commands        String    // JSON array of commands
  executionCount  Int       @default(0)
  lastExecuted    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([triggerPhrase])
}
```

---

## Phase 4: Whisper.cpp Integration

### 4.1 Docker Configuration

```yaml
# docker-compose.whisper.yml

version: '3.8'

services:
  whisper:
    image: onerahmet/openai-whisper-asr-webservice:latest
    container_name: command-portal-whisper
    ports:
      - "9000:9000"
    environment:
      - ASR_MODEL=base.en  # Options: tiny, base, small, medium, large
      - ASR_ENGINE=openai_whisper
    volumes:
      - whisper-models:/root/.cache/whisper
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  whisper-models:
```

### 4.2 Whisper Service

```javascript
// server/services/whisperService.js

import FormData from 'form-data';
import fetch from 'node-fetch';

const WHISPER_URL = process.env.WHISPER_URL || 'http://localhost:9000';

export class WhisperService {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${WHISPER_URL}/health`, {
        timeout: 5000
      });
      this.isAvailable = response.ok;
    } catch (error) {
      this.isAvailable = false;
      console.warn('Whisper service not available:', error.message);
    }
  }

  async transcribe(audioBuffer, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Whisper service not available');
    }

    const {
      language = 'en',
      task = 'transcribe',
      outputFormat = 'json'
    } = options;

    const formData = new FormData();
    formData.append('audio_file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });

    const response = await fetch(
      `${WHISPER_URL}/asr?task=${task}&language=${language}&output=${outputFormat}`,
      {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Whisper error: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      text: result.text,
      confidence: result.confidence || 0.9,
      language: result.language || language,
      duration: result.duration
    };
  }

  async isHealthy() {
    await this.checkAvailability();
    return this.isAvailable;
  }
}

export const whisperService = new WhisperService();
```

### 4.3 Hybrid Voice Processing

```javascript
// server/services/voiceProcessor.js

import { parseCommand } from '../utils/commandPatterns.js';
import { whisperService } from './whisperService.js';

export class VoiceProcessor {
  constructor(options = {}) {
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.useWhisperFallback = options.useWhisperFallback ?? true;
  }

  async process(transcript, confidence, audioBuffer = null) {
    // First, try to parse with pattern matcher
    const parsed = parseCommand(transcript);

    // If confidence is high enough, return immediately
    if (parsed.confidence >= this.confidenceThreshold) {
      return {
        source: 'web-speech',
        ...parsed
      };
    }

    // Try Whisper fallback if available and we have audio
    if (this.useWhisperFallback && audioBuffer && await whisperService.isHealthy()) {
      try {
        const whisperResult = await whisperService.transcribe(audioBuffer);
        const whisperParsed = parseCommand(whisperResult.text);

        // Use Whisper result if it has higher confidence
        if (whisperParsed.confidence > parsed.confidence) {
          return {
            source: 'whisper',
            originalTranscript: transcript,
            ...whisperParsed
          };
        }
      } catch (error) {
        console.error('Whisper fallback failed:', error);
      }
    }

    // Return original result with low confidence flag
    return {
      source: 'web-speech',
      lowConfidence: parsed.confidence < this.confidenceThreshold,
      ...parsed
    };
  }
}

export const voiceProcessor = new VoiceProcessor();
```

---

## Phase 5: AI Enhancement

### 5.1 Context-Aware Command Parser

```javascript
// server/services/aiCommandParser.js

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export class AICommandParser {
  constructor() {
    this.contextWindow = [];
    this.maxContext = 10;
  }

  addContext(item) {
    this.contextWindow.push(item);
    if (this.contextWindow.length > this.maxContext) {
      this.contextWindow.shift();
    }
  }

  async parseWithAI(transcript, projectContext = {}) {
    const systemPrompt = `You are a voice command parser for a development environment.
Parse the user's voice command and return a JSON object with:
- action: The action to perform (terminal-command, navigation, ui-action, etc.)
- command: The actual command or action string
- parameters: Any extracted parameters
- confidence: Your confidence level (0-1)
- clarification: If unclear, ask for clarification

Current project: ${projectContext.name || 'unknown'}
Current directory: ${projectContext.cwd || '~'}
Recent commands: ${this.contextWindow.slice(-5).map(c => c.command).join(', ')}

Common patterns:
- "ask claude X" → Send X to Claude Code
- "run tests" → npm test
- "commit X" → git add -A && git commit -m "X"
- "open project X" → Navigate to project X
- "go to X" → Navigate to X view`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Parse this voice command: "${transcript}"`
        }]
      });

      const text = response.content[0].text;

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        action: 'unknown',
        command: transcript,
        confidence: 0.5,
        clarification: 'Could not parse command'
      };
    } catch (error) {
      console.error('AI parsing error:', error);
      return null;
    }
  }

  async handleMultiTurn(transcript, previousContext) {
    // Handle follow-up commands like "and then...", "also...", "but..."
    const followUpPatterns = [
      /^(?:and\s+)?(?:then|also|next)\s+(.+)$/i,
      /^(?:but|however)\s+(.+)$/i,
      /^(?:instead|rather)\s+(.+)$/i,
      /^(?:wait|actually)\s+(.+)$/i
    ];

    for (const pattern of followUpPatterns) {
      const match = transcript.match(pattern);
      if (match && previousContext) {
        // Combine with previous context
        return this.parseWithAI(
          `Following up on "${previousContext.command}": ${match[1]}`,
          previousContext.project
        );
      }
    }

    return null;
  }
}

export const aiCommandParser = new AICommandParser();
```

### 5.2 Text-to-Speech Response (Optional)

```javascript
// src/hooks/useTextToSpeech.js

import { useState, useCallback, useRef } from 'react';

export function useTextToSpeech(options = {}) {
  const {
    voice = null,
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (voice) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voice, rate, pitch, volume]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const getVoices = useCallback(() => {
    return window.speechSynthesis?.getVoices() || [];
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    getVoices
  };
}
```

---

# P1: Aider Integration

## Overview

Integrate Aider as an alternative AI coding assistant with native voice support and multi-LLM capabilities.

---

## Phase 1: Basic Aider Support

### 1.1 Component Architecture

```
src/
├── components/
│   ├── aider/
│   │   ├── AiderSession.jsx         # Aider terminal session
│   │   ├── AiderModeToggle.jsx      # Claude/Aider mode switch
│   │   ├── AiderModelPicker.jsx     # LLM model selection
│   │   └── AiderVoiceStatus.jsx     # Voice mode indicator
│   └── settings/
│       └── AiderSettings.jsx        # Aider configuration
server/
├── routes/
│   └── aider.js                     # Aider API endpoints
└── services/
    └── aiderManager.js              # Aider process management
```

### 1.2 Database Schema

```prisma
// Add to prisma/schema.prisma

model AiderSession {
  id            String    @id @default(cuid())
  sessionId     String    @unique
  session       Session   @relation(fields: [sessionId], references: [id])
  model         String    @default("claude-3-5-sonnet-20241022")
  provider      String    @default("anthropic") // anthropic, openai, local
  voiceEnabled  Boolean   @default(false)
  filesAdded    String[]  // Files added to chat
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AiderConfig {
  id              String   @id @default(cuid())
  userId          String   @unique
  defaultModel    String   @default("claude-3-5-sonnet-20241022")
  defaultProvider String   @default("anthropic")
  autoAddFiles    Boolean  @default(true)
  darkMode        Boolean  @default(true)
  streamOutput    Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 1.3 API Endpoints

```
POST /api/aider/session
  Request:
    {
      "projectPath": "string",
      "model": "string",
      "provider": "string"
    }
  Response:
    {
      "sessionId": "string",
      "status": "starting" | "running" | "error"
    }

GET /api/aider/models
  Response:
    {
      "anthropic": ["claude-3-5-sonnet", "claude-3-opus", ...],
      "openai": ["gpt-4", "gpt-4-turbo", ...],
      "local": ["ollama/codellama", ...]
    }

POST /api/aider/voice/start
  Request: { "sessionId": "string" }
  Response: { "status": "listening" }

POST /api/aider/voice/stop
  Request: { "sessionId": "string" }
  Response: { "status": "stopped" }

GET /api/aider/config
PUT /api/aider/config
```

### 1.4 Aider Process Manager

```javascript
// server/services/aiderManager.js

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class AiderManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  async checkInstalled() {
    return new Promise((resolve) => {
      const check = spawn('aider', ['--version']);
      check.on('close', (code) => resolve(code === 0));
      check.on('error', () => resolve(false));
    });
  }

  async startSession(sessionId, options = {}) {
    const {
      projectPath,
      model = 'claude-3-5-sonnet-20241022',
      provider = 'anthropic',
      files = []
    } = options;

    // Build aider command args
    const args = [
      '--model', model,
      '--no-auto-commits',
      '--stream'
    ];

    if (provider === 'openai') {
      args.push('--openai-api-key', process.env.OPENAI_API_KEY);
    }

    if (files.length > 0) {
      args.push(...files);
    }

    const aiderProcess = spawn('aider', args, {
      cwd: projectPath,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY
      }
    });

    const session = {
      id: sessionId,
      process: aiderProcess,
      projectPath,
      model,
      provider,
      voiceEnabled: false,
      startedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    aiderProcess.stdout.on('data', (data) => {
      this.emit('output', { sessionId, data: data.toString() });
    });

    aiderProcess.stderr.on('data', (data) => {
      this.emit('error', { sessionId, data: data.toString() });
    });

    aiderProcess.on('close', (code) => {
      this.sessions.delete(sessionId);
      this.emit('close', { sessionId, code });
    });

    return session;
  }

  sendInput(sessionId, input) {
    const session = this.sessions.get(sessionId);
    if (session?.process) {
      session.process.stdin.write(input + '\n');
    }
  }

  startVoice(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.voiceEnabled = true;
      this.sendInput(sessionId, '/voice');
    }
  }

  stopVoice(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.voiceEnabled = false;
      // Send Ctrl+C to stop voice
      session.process.stdin.write('\x03');
    }
  }

  killSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session?.process) {
      session.process.kill('SIGTERM');
      this.sessions.delete(sessionId);
    }
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

export const aiderManager = new AiderManager();
```

### 1.5 Mode Toggle Component

```jsx
// src/components/aider/AiderModeToggle.jsx

import { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';

export function AiderModeToggle({ mode, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => onChange('claude')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
          transition-colors duration-200
          ${mode === 'claude'
            ? 'bg-orange-500 text-white'
            : 'text-gray-400 hover:text-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Sparkles size={16} />
        Claude Code
      </button>

      <button
        onClick={() => onChange('aider')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
          transition-colors duration-200
          ${mode === 'aider'
            ? 'bg-green-500 text-white'
            : 'text-gray-400 hover:text-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Bot size={16} />
        Aider
      </button>
    </div>
  );
}
```

---

## Phase 2-4: Aider Voice & Multi-LLM

### 2.1 Model Picker Component

```jsx
// src/components/aider/AiderModelPicker.jsx

import { useState, useEffect } from 'react';
import { ChevronDown, Cpu, DollarSign, Zap } from 'lucide-react';

const MODELS = {
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: '$$', speed: 'fast' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', cost: '$$$', speed: 'slow' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', cost: '$', speed: 'fastest' }
  ],
  openai: [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: '$$', speed: 'fast' },
    { id: 'gpt-4', name: 'GPT-4', cost: '$$$', speed: 'slow' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', cost: '$', speed: 'fastest' }
  ],
  local: [
    { id: 'ollama/codellama', name: 'CodeLlama (Ollama)', cost: 'free', speed: 'varies' },
    { id: 'ollama/deepseek-coder', name: 'DeepSeek Coder', cost: 'free', speed: 'varies' }
  ]
};

export function AiderModelPicker({ provider, model, onProviderChange, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const currentModel = MODELS[provider]?.find(m => m.id === model);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg
                   border border-gray-700 hover:border-gray-600"
      >
        <Cpu size={16} className="text-gray-400" />
        <span className="text-sm text-white">
          {currentModel?.name || 'Select Model'}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 rounded-lg
                        border border-gray-700 shadow-xl z-50">
          {Object.entries(MODELS).map(([providerKey, models]) => (
            <div key={providerKey} className="p-2">
              <div className="text-xs text-gray-500 uppercase px-2 py-1">
                {providerKey}
              </div>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onProviderChange(providerKey);
                    onModelChange(m.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-2 py-2 rounded
                    ${model === m.id ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700'}
                  `}
                >
                  <span className="text-sm">{m.name}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      {m.cost}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={12} />
                      {m.speed}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

# P2: Tabby Docker Management

## Overview

Integrate Tabby self-hosted code completion with one-click Docker deployment.

---

## Phase 1: Tabby Deployment

### 1.1 Component Architecture

```
src/
├── components/
│   ├── tabby/
│   │   ├── TabbyDashboard.jsx       # Main Tabby management UI
│   │   ├── TabbyDeployWizard.jsx    # Setup wizard
│   │   ├── TabbyStatus.jsx          # Health and status
│   │   ├── TabbyLogs.jsx            # Log viewer
│   │   └── TabbyConfig.jsx          # Configuration editor
server/
├── routes/
│   └── tabby.js                     # Tabby API endpoints
└── services/
    └── tabbyManager.js              # Docker management for Tabby
```

### 1.2 Docker Compose Templates

```javascript
// server/templates/tabby-compose.js

export const generateTabbyCompose = (options = {}) => {
  const {
    model = 'TabbyML/StarCoder-1B',
    device = 'cpu',
    port = 8080,
    dataPath = '~/.tabby'
  } = options;

  const gpuConfig = device === 'cuda' ? `
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]` : '';

  return `
version: '3.8'

services:
  tabby:
    image: tabbyml/tabby:latest
    container_name: command-portal-tabby
    command: serve --model ${model} --device ${device}
    ports:
      - "${port}:8080"
    volumes:
      - ${dataPath}:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
${gpuConfig}

volumes:
  tabby-data:
`;
};
```

### 1.3 Tabby Manager Service

```javascript
// server/services/tabbyManager.js

import Docker from 'dockerode';
import { generateTabbyCompose } from '../templates/tabby-compose.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const docker = new Docker();

export class TabbyManager {
  constructor() {
    this.containerName = 'command-portal-tabby';
    this.composeFile = path.join(process.env.HOME, '.tabby', 'docker-compose.yml');
  }

  async checkGPU() {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader');
      return {
        available: true,
        gpus: stdout.trim().split('\n')
      };
    } catch {
      return { available: false, gpus: [] };
    }
  }

  async deploy(options = {}) {
    const { model, device, port } = options;

    // Generate compose file
    const compose = generateTabbyCompose({ model, device, port });

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.composeFile), { recursive: true });

    // Write compose file
    await fs.writeFile(this.composeFile, compose);

    // Start container
    await execAsync(`docker compose -f ${this.composeFile} up -d`);

    return { status: 'deploying', containerName: this.containerName };
  }

  async getStatus() {
    try {
      const container = docker.getContainer(this.containerName);
      const info = await container.inspect();
      const stats = await container.stats({ stream: false });

      return {
        running: info.State.Running,
        status: info.State.Status,
        health: info.State.Health?.Status || 'unknown',
        uptime: info.State.StartedAt,
        cpu: this.calculateCPU(stats),
        memory: this.calculateMemory(stats),
        port: info.NetworkSettings.Ports['8080/tcp']?.[0]?.HostPort
      };
    } catch (error) {
      return { running: false, status: 'not_deployed', error: error.message };
    }
  }

  calculateCPU(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage -
                        stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;

    return ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(1);
  }

  calculateMemory(stats) {
    const used = stats.memory_stats.usage;
    const limit = stats.memory_stats.limit;

    return {
      used: (used / 1024 / 1024).toFixed(0),
      limit: (limit / 1024 / 1024).toFixed(0),
      percent: ((used / limit) * 100).toFixed(1)
    };
  }

  async start() {
    const container = docker.getContainer(this.containerName);
    await container.start();
  }

  async stop() {
    const container = docker.getContainer(this.containerName);
    await container.stop();
  }

  async restart() {
    const container = docker.getContainer(this.containerName);
    await container.restart();
  }

  async getLogs(tail = 100) {
    const container = docker.getContainer(this.containerName);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true
    });

    return logs.toString();
  }

  async remove() {
    try {
      const container = docker.getContainer(this.containerName);
      await container.stop();
      await container.remove();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const tabbyManager = new TabbyManager();
```

### 1.4 Tabby Dashboard Component

```jsx
// src/components/tabby/TabbyDashboard.jsx

import { useState, useEffect } from 'react';
import {
  Server, Play, Square, RotateCcw, Trash2,
  Cpu, HardDrive, Activity, CheckCircle, XCircle
} from 'lucide-react';

export function TabbyDashboard() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/tabby/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (config) => {
    setDeploying(true);
    try {
      await fetch('/api/tabby/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      await fetchStatus();
    } finally {
      setDeploying(false);
    }
  };

  const handleAction = async (action) => {
    await fetch(`/api/tabby/${action}`, { method: 'POST' });
    await fetchStatus();
  };

  if (loading) {
    return <div className="animate-pulse">Loading Tabby status...</div>;
  }

  if (!status?.running && status?.status === 'not_deployed') {
    return <TabbyDeployWizard onDeploy={handleDeploy} deploying={deploying} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="text-blue-400" size={24} />
          <h2 className="text-xl font-semibold">Tabby Code Completion</h2>
        </div>

        <div className="flex items-center gap-2">
          {status?.running ? (
            <>
              <button
                onClick={() => handleAction('stop')}
                className="p-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                title="Stop"
              >
                <Square size={16} />
              </button>
              <button
                onClick={() => handleAction('restart')}
                className="p-2 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                title="Restart"
              >
                <RotateCcw size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction('start')}
              className="p-2 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
              title="Start"
            >
              <Play size={16} />
            </button>
          )}
          <button
            onClick={() => handleAction('remove')}
            className="p-2 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatusCard
          icon={status?.running ? CheckCircle : XCircle}
          label="Status"
          value={status?.status || 'Unknown'}
          color={status?.running ? 'green' : 'red'}
        />
        <StatusCard
          icon={Activity}
          label="Health"
          value={status?.health || 'Unknown'}
          color={status?.health === 'healthy' ? 'green' : 'yellow'}
        />
        <StatusCard
          icon={Cpu}
          label="CPU"
          value={`${status?.cpu || 0}%`}
          color="blue"
        />
        <StatusCard
          icon={HardDrive}
          label="Memory"
          value={`${status?.memory?.used || 0} MB`}
          color="purple"
        />
      </div>

      {/* Connection Info */}
      {status?.running && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Connection</h3>
          <code className="text-sm text-green-400">
            http://localhost:{status?.port || 8080}
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Configure your IDE to use this endpoint for code completions
          </p>
        </div>
      )}

      {/* Logs */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Logs</h3>
        <pre className="text-xs text-gray-300 max-h-48 overflow-auto font-mono">
          {logs || 'No logs available'}
        </pre>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, color }) {
  const colors = {
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400'
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={colors[color]} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <span className={`text-lg font-semibold ${colors[color]}`}>{value}</span>
    </div>
  );
}
```

---

# P3: Claude Flow Multi-Agent

## Overview

Integrate Claude Flow's multi-agent orchestration for complex development workflows.

---

## Phase 1-2: Claude Flow Setup & Swarm UI

### 1.1 Component Architecture

```
src/
├── components/
│   ├── claude-flow/
│   │   ├── SwarmDashboard.jsx       # Main swarm control panel
│   │   ├── AgentCard.jsx            # Individual agent status
│   │   ├── SwarmVisualization.jsx   # Visual agent network
│   │   ├── WorkflowSelector.jsx     # Pre-built workflows
│   │   ├── SwarmLogs.jsx            # Aggregated logs
│   │   └── SwarmProgress.jsx        # Progress tracking
server/
├── routes/
│   └── claude-flow.js               # Claude Flow API endpoints
└── services/
    └── claudeFlowManager.js         # Claude Flow process management
```

### 1.2 Claude Flow Manager

```javascript
// server/services/claudeFlowManager.js

import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ClaudeFlowManager extends EventEmitter {
  constructor() {
    super();
    this.swarms = new Map();
    this.isInstalled = false;
  }

  async checkInstalled() {
    try {
      await execAsync('npx claude-flow --version');
      this.isInstalled = true;
      return true;
    } catch {
      this.isInstalled = false;
      return false;
    }
  }

  async install() {
    await execAsync('npm install -g claude-flow');
    this.isInstalled = true;
  }

  async initialize(projectPath) {
    await execAsync('npx claude-flow init', { cwd: projectPath });
  }

  async startSwarm(swarmId, options = {}) {
    const {
      projectPath,
      workflow,
      agents = ['queen', 'coder', 'tester'],
      parallel = true
    } = options;

    const args = [
      'claude-flow',
      'swarm',
      '--workflow', workflow,
      '--agents', agents.join(','),
      parallel ? '--parallel' : ''
    ].filter(Boolean);

    const swarmProcess = spawn('npx', args, {
      cwd: projectPath,
      env: process.env
    });

    const swarm = {
      id: swarmId,
      process: swarmProcess,
      projectPath,
      workflow,
      agents: agents.map(a => ({ name: a, status: 'pending' })),
      progress: 0,
      startedAt: new Date()
    };

    this.swarms.set(swarmId, swarm);

    swarmProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.parseSwarmOutput(swarmId, output);
      this.emit('output', { swarmId, data: output });
    });

    swarmProcess.stderr.on('data', (data) => {
      this.emit('error', { swarmId, data: data.toString() });
    });

    swarmProcess.on('close', (code) => {
      const swarm = this.swarms.get(swarmId);
      if (swarm) {
        swarm.status = code === 0 ? 'completed' : 'failed';
        swarm.progress = 100;
      }
      this.emit('close', { swarmId, code });
    });

    return swarm;
  }

  parseSwarmOutput(swarmId, output) {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return;

    // Parse agent status updates
    const agentMatch = output.match(/\[(\w+)\]\s+(starting|running|completed|failed)/i);
    if (agentMatch) {
      const [, agentName, status] = agentMatch;
      const agent = swarm.agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
      if (agent) {
        agent.status = status.toLowerCase();
        this.emit('agent-status', { swarmId, agent: agentName, status });
      }
    }

    // Parse progress updates
    const progressMatch = output.match(/progress:\s*(\d+)%/i);
    if (progressMatch) {
      swarm.progress = parseInt(progressMatch[1]);
      this.emit('progress', { swarmId, progress: swarm.progress });
    }
  }

  async stopSwarm(swarmId) {
    const swarm = this.swarms.get(swarmId);
    if (swarm?.process) {
      swarm.process.kill('SIGTERM');
      swarm.status = 'stopped';
    }
  }

  getSwarm(swarmId) {
    return this.swarms.get(swarmId);
  }

  getAllSwarms() {
    return Array.from(this.swarms.values());
  }
}

export const claudeFlowManager = new ClaudeFlowManager();
```

### 1.3 Swarm Dashboard Component

```jsx
// src/components/claude-flow/SwarmDashboard.jsx

import { useState, useEffect } from 'react';
import {
  Play, Square, Users, GitBranch, CheckCircle,
  Clock, AlertCircle, Loader2
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

const WORKFLOWS = [
  {
    id: 'feature-implementation',
    name: 'Feature Implementation',
    description: 'Plan → Code → Test → Document → Review',
    agents: ['queen', 'planner', 'coder', 'tester', 'documenter', 'reviewer'],
    estimatedTime: '15-30 min'
  },
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Analyze → Fix → Test → Verify',
    agents: ['queen', 'analyzer', 'coder', 'tester'],
    estimatedTime: '5-15 min'
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review → Security → Quality → Approve',
    agents: ['queen', 'reviewer', 'security', 'quality'],
    estimatedTime: '5-10 min'
  },
  {
    id: 'refactor',
    name: 'Refactoring',
    description: 'Analyze → Plan → Refactor → Test',
    agents: ['queen', 'analyzer', 'planner', 'coder', 'tester'],
    estimatedTime: '20-40 min'
  }
];

export function SwarmDashboard({ projectPath }) {
  const [activeSwarm, setActiveSwarm] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [logs, setLogs] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    socket.on('swarm-output', (data) => {
      setLogs(prev => [...prev, { type: 'output', ...data }]);
    });

    socket.on('swarm-agent-status', (data) => {
      setActiveSwarm(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: prev.agents.map(a =>
            a.name === data.agent ? { ...a, status: data.status } : a
          )
        };
      });
    });

    socket.on('swarm-progress', (data) => {
      setActiveSwarm(prev => prev ? { ...prev, progress: data.progress } : prev);
    });

    socket.on('swarm-close', (data) => {
      setActiveSwarm(prev => prev ? { ...prev, status: data.code === 0 ? 'completed' : 'failed' } : prev);
    });

    return () => {
      socket.off('swarm-output');
      socket.off('swarm-agent-status');
      socket.off('swarm-progress');
      socket.off('swarm-close');
    };
  }, [socket]);

  const startSwarm = async () => {
    if (!selectedWorkflow) return;

    const res = await fetch('/api/claude-flow/swarm/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        workflow: selectedWorkflow.id,
        agents: selectedWorkflow.agents
      })
    });

    const data = await res.json();
    setActiveSwarm({
      ...data,
      workflow: selectedWorkflow,
      agents: selectedWorkflow.agents.map(a => ({ name: a, status: 'pending' })),
      progress: 0,
      status: 'running'
    });
    setLogs([]);
  };

  const stopSwarm = async () => {
    if (!activeSwarm) return;
    await fetch(`/api/claude-flow/swarm/${activeSwarm.id}/stop`, { method: 'POST' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-purple-400" size={24} />
          <h2 className="text-xl font-semibold">Multi-Agent Swarm</h2>
        </div>
      </div>

      {/* Workflow Selection */}
      {!activeSwarm && (
        <div className="grid grid-cols-2 gap-4">
          {WORKFLOWS.map(workflow => (
            <button
              key={workflow.id}
              onClick={() => setSelectedWorkflow(workflow)}
              className={`
                p-4 rounded-lg border text-left transition-all
                ${selectedWorkflow?.id === workflow.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'}
              `}
            >
              <h3 className="font-medium text-white">{workflow.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{workflow.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {workflow.agents.length} agents
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {workflow.estimatedTime}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Start Button */}
      {!activeSwarm && selectedWorkflow && (
        <button
          onClick={startSwarm}
          className="w-full py-3 bg-purple-500 hover:bg-purple-600 rounded-lg
                     flex items-center justify-center gap-2 font-medium"
        >
          <Play size={18} />
          Start {selectedWorkflow.name} Swarm
        </button>
      )}

      {/* Active Swarm */}
      {activeSwarm && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{activeSwarm.workflow.name}</span>
              <span className="text-sm text-gray-400">{activeSwarm.progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${activeSwarm.progress}%` }}
              />
            </div>
          </div>

          {/* Agent Status */}
          <div className="grid grid-cols-3 gap-3">
            {activeSwarm.agents.map(agent => (
              <div
                key={agent.name}
                className="p-3 bg-gray-800 rounded-lg flex items-center gap-3"
              >
                <AgentStatusIcon status={agent.status} />
                <div>
                  <div className="text-sm font-medium capitalize">{agent.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{agent.status}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stop Button */}
          {activeSwarm.status === 'running' && (
            <button
              onClick={stopSwarm}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30
                         text-red-400 rounded-lg flex items-center justify-center gap-2"
            >
              <Square size={16} />
              Stop Swarm
            </button>
          )}

          {/* Logs */}
          <div className="p-4 bg-gray-900 rounded-lg max-h-64 overflow-auto">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Swarm Activity</h3>
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-300">{log.data}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentStatusIcon({ status }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="text-green-400" size={20} />;
    case 'running':
      return <Loader2 className="text-blue-400 animate-spin" size={20} />;
    case 'failed':
      return <AlertCircle className="text-red-400" size={20} />;
    default:
      return <Clock className="text-gray-400" size={20} />;
  }
}
```

---

## Testing Requirements

### Unit Tests

```javascript
// tests/voice/commandPatterns.test.js

import { describe, it, expect } from 'vitest';
import { parseCommand, getAllCommands } from '../../server/utils/commandPatterns.js';

describe('Voice Command Pattern Matching', () => {
  describe('Terminal Commands', () => {
    it('should parse "ask claude" commands', () => {
      const result = parseCommand('ask claude to fix the bug');
      expect(result.action).toBe('claude-query');
      expect(result.command).toBe('to fix the bug');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should parse "run tests" command', () => {
      const result = parseCommand('run the tests');
      expect(result.action).toBe('run-tests');
      expect(result.command).toBe('npm test');
    });

    it('should parse git commit with message', () => {
      const result = parseCommand('commit with message "fix login bug"');
      expect(result.action).toBe('git-commit');
      expect(result.command).toContain('git add');
      expect(result.command).toContain('fix login bug');
    });
  });

  describe('Navigation Commands', () => {
    it('should parse "go to projects"', () => {
      const result = parseCommand('go to projects');
      expect(result.action).toBe('navigate-projects');
      expect(result.route).toBe('/projects');
    });

    it('should parse "open project X"', () => {
      const result = parseCommand('open project command portal');
      expect(result.action).toBe('open-project');
      expect(result.parameters.project).toBe('command portal');
    });
  });

  describe('Unknown Commands', () => {
    it('should return low confidence for unknown commands', () => {
      const result = parseCommand('xyzzy magic word');
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should provide suggestions for partial matches', () => {
      const result = parseCommand('commit something');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getAllCommands', () => {
    it('should return all available commands', () => {
      const commands = getAllCommands();
      expect(commands.length).toBeGreaterThan(40);
      expect(commands.some(c => c.category === 'terminal')).toBe(true);
      expect(commands.some(c => c.category === 'git')).toBe(true);
      expect(commands.some(c => c.category === 'navigation')).toBe(true);
    });
  });
});
```

### Integration Tests

```javascript
// tests/voice/voiceIntegration.test.js

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index.js';

describe('Voice API Integration', () => {
  describe('POST /api/voice/process', () => {
    it('should process valid transcript', async () => {
      const res = await request(app)
        .post('/api/voice/process')
        .send({
          transcript: 'run the tests',
          sessionId: 'test-session',
          confidence: 0.9
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.command.action).toBe('run-tests');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/voice/process')
        .send({ transcript: 'test' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/voice/settings', () => {
    it('should return default settings', async () => {
      const res = await request(app).get('/api/voice/settings');

      expect(res.status).toBe(200);
      expect(res.body.language).toBe('en-US');
      expect(res.body.enabled).toBe(true);
    });
  });
});
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Voice Latency (P95) | <500ms | Speech end to action |
| Pattern Match Time | <10ms | parseCommand() execution |
| Whisper Fallback | <2s | Audio to transcription |
| UI Response | <100ms | Button click to visual feedback |
| Socket.IO Latency | <50ms | Event round-trip |

---

## Security Considerations

1. **Voice Data**: Never store raw audio, only transcripts
2. **API Keys**: Stored in environment variables, never logged
3. **Command Injection**: Sanitize all parsed commands before execution
4. **Rate Limiting**: Max 60 voice commands per minute per user
5. **Authentication**: All voice endpoints require valid session

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-12 | Initial technical specifications |
