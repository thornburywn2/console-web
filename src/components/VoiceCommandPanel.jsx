/**
 * VoiceCommandPanel - Voice Command Interface
 * P0 Phase 1 & 2: Basic Voice Input + Enhanced Pattern Matching
 *
 * Provides voice input capabilities for controlling Claude Code sessions
 * and navigating the Console.web interface.
 *
 * Features:
 * - Web Speech API voice recognition
 * - Enhanced fuzzy pattern matching
 * - Command disambiguation dialog
 * - Audio feedback sounds
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceApi } from '../services/api.js';
import {
  Mic, MicOff, Settings, History,
  ChevronUp, AlertCircle, Wand2
} from 'lucide-react';
import { useVoiceRecognition, checkVoiceSupport } from '../hooks/useVoiceRecognition';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { useVoiceActivityDetection } from '../hooks/useVoiceActivityDetection.jsx';
import { VoiceDisambiguationDialog } from './VoiceDisambiguationDialog';
import {
  VoiceSettingsPanel,
  VoiceHistoryPanel,
  AudioVisualization,
  CommandConfirmation
} from './voice-command';

/**
 * Main Voice Command Panel Component
 */
export function VoiceCommandPanel({
  sessionId,
  socket,
  isConnected,
  onCommand,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  // P1: Aider Integration props
  codingMode = 'claude',
  aiderVoice = null,
  projectPath = null
}) {
  const [settings, setSettings] = useState({
    enabled: true,
    language: 'en-US',
    continuous: false,
    autoExecute: false,
    confidenceThreshold: 0.7,
    showTranscript: true,
    pushToTalk: false,
    pushToTalkKey: 'Space',
    playFeedbackSounds: true
  });

  const [parsedCommand, setParsedCommand] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [voiceSupport, setVoiceSupport] = useState(null);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguationAlternatives, setDisambiguationAlternatives] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const pushToTalkActive = useRef(false);

  // Voice feedback sounds
  const {
    isEnabled: feedbackEnabled,
    setIsEnabled: setFeedbackEnabled,
    onStartListening: playStartSound,
    onStopListening: playStopSound,
    onSuccess: playSuccessSound,
    onError: playErrorSound,
    onDisambiguation: playDisambiguationSound,
    onSelect: playSelectSound,
    onCancel: playCancelSound,
    onWarning: playWarningSound
  } = useVoiceFeedback({ enabled: settings.playFeedbackSounds });

  // Voice Activity Detection
  const {
    isActive: vadActive,
    isSpeaking,
    audioLevel,
    peakLevel,
    start: startVAD,
    stop: stopVAD,
    resetPeak
  } = useVoiceActivityDetection({
    silenceThreshold: settings.confidenceThreshold * 0.03,
    onSpeechStart: () => {
      // Auto-start listening when speech detected (if not already listening)
      if (settings.continuous && !isListening) {
        startListening();
      }
    },
    onSpeechEnd: ({ duration }) => {
      // Could be used for automatic stop after silence
      console.log('Speech ended, duration:', duration);
    }
  });

  // Check voice support on mount
  useEffect(() => {
    setVoiceSupport(checkVoiceSupport());
  }, []);

  // Voice recognition hook
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    clearTranscript
  } = useVoiceRecognition({
    language: settings.language,
    continuous: settings.continuous,
    interimResults: true,
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    onEnd: handleVoiceEnd
  });

  // Load settings from server
  useEffect(() => {
    voiceApi.getSettings()
      .then(data => {
        if (data) setSettings(prev => ({ ...prev, ...data }));
      })
      .catch(err => console.error('Failed to load voice settings:', err.getUserMessage?.() || err.message));
  }, []);

  // Handle voice result
  function handleVoiceResult(result) {
    if (!result.isFinal) return;

    // Process the transcript
    processTranscript(result.transcript, result.confidence);
  }

  // Process transcript through server
  async function processTranscript(text, inputConfidence) {
    setCurrentTranscript(text);

    try {
      const data = await voiceApi.process({
        transcript: text,
        sessionId,
        confidence: inputConfidence
      });

      setParsedCommand(data.command);

      // Check if disambiguation is needed
      if (data.command.needsDisambiguation && data.command.alternatives?.length > 0) {
        playDisambiguationSound();
        setDisambiguationAlternatives(data.command.alternatives);
        setShowDisambiguation(true);
        return;
      }

      // Low confidence warning
      if (data.command.confidence < settings.confidenceThreshold && data.command.action !== 'passthrough') {
        playWarningSound();
      }

      // Auto-execute if confidence is high enough
      if (
        settings.autoExecute &&
        data.command.confidence >= settings.confidenceThreshold &&
        data.command.action !== 'unknown'
      ) {
        playSuccessSound();
        executeCommand(data.command, data.commandId);
      } else {
        setShowConfirm(true);
      }
    } catch (err) {
      console.error('Voice processing error:', err.getUserMessage?.() || err.message);
      playErrorSound();
    }
  }

  // Execute a parsed command
  async function executeCommand(command, commandId) {
    if (!command) return;

    // Track execution
    if (commandId) {
      voiceApi.execute({ commandId, confirmed: true })
        .catch(err => console.error('Failed to track execution:', err.getUserMessage?.() || err.message));
    }

    // Add to local history
    setHistory(prev => [{
      transcript,
      command,
      timestamp: new Date(),
      success: true
    }, ...prev.slice(0, 49)]);

    // Handle different command types
    switch (command.type) {
      case 'terminal':
        // Send to terminal via socket
        if (socket && isConnected && command.command) {
          socket.emit('terminal-input', command.command + '\n');
        }
        onCommand?.(command);
        break;

      case 'navigation':
        if (command.route) {
          onNavigate?.(command.route);
        } else if (command.parameters?.project) {
          onNavigate?.('project', command.parameters.project);
        }
        onCommand?.(command);
        break;

      case 'ui':
        // Handle UI commands
        onCommand?.(command);
        break;

      case 'session':
        // Handle session commands
        onCommand?.(command);
        break;

      // P1: Aider Integration - Route Aider commands
      case 'aider':
        if (aiderVoice && projectPath) {
          aiderVoice.handleAiderVoiceCommand(command, projectPath);
        }
        onCommand?.(command);
        break;

      case 'mode-switch':
        // Mode switching commands (e.g., switch-to-claude)
        if (aiderVoice) {
          aiderVoice.handleAiderVoiceCommand(command, projectPath);
        }
        onCommand?.(command);
        break;

      default:
        // Check if in Aider mode and route to Aider
        if (codingMode === 'aider' && aiderVoice?.hasActiveSession) {
          // Send to Aider session instead of terminal
          if (command.command) {
            aiderVoice.sendToAider(command.command);
          }
          onCommand?.(command);
        } else {
          // Pass through unknown commands to Claude terminal
          if (socket && isConnected && command.command) {
            socket.emit('terminal-input', command.command + '\n');
          }
          onCommand?.(command);
        }
    }

    // Reset state
    setShowConfirm(false);
    setParsedCommand(null);
    clearTranscript();
  }

  // Handle voice error
  function handleVoiceError(code, message) {
    console.error('Voice error:', code, message);
  }

  // Handle voice end
  function handleVoiceEnd() {
    // Voice session ended
  }

  // Toggle listening with sound feedback and VAD
  const toggleListening = useCallback(async () => {
    if (isListening) {
      playStopSound();
      stopListening();
      stopVAD();
    } else {
      playStartSound();
      await startVAD();
      startListening();
    }
  }, [isListening, startListening, stopListening, playStartSound, playStopSound, startVAD, stopVAD]);

  // Handle disambiguation selection
  const handleDisambiguationSelect = useCallback((command) => {
    playSelectSound();
    setShowDisambiguation(false);
    setDisambiguationAlternatives([]);
    playSuccessSound();
    executeCommand(command);
  }, [playSelectSound, playSuccessSound, executeCommand]);

  // Handle disambiguation cancel
  const handleDisambiguationCancel = useCallback(() => {
    playCancelSound();
    setShowDisambiguation(false);
    setDisambiguationAlternatives([]);
    setParsedCommand(null);
    clearTranscript();
  }, [playCancelSound, clearTranscript]);

  // Push-to-talk handlers
  useEffect(() => {
    if (!settings.pushToTalk) return;

    const handleKeyDown = (e) => {
      if (e.code === settings.pushToTalkKey && !e.repeat && !pushToTalkActive.current) {
        pushToTalkActive.current = true;
        startListening();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === settings.pushToTalkKey && pushToTalkActive.current) {
        pushToTalkActive.current = false;
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

  // Cancel current command
  const cancelCommand = () => {
    playCancelSound();
    setShowConfirm(false);
    setParsedCommand(null);
    clearTranscript();
  };

  // Save settings
  const saveSettings = async (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      await voiceApi.updateSettings(updates);
    } catch (err) {
      console.error('Failed to save settings:', err.getUserMessage?.() || err.message);
    }
  };

  // Not supported
  if (!isSupported || !voiceSupport?.supported) {
    return (
      <div className="voice-panel-unsupported p-4 glass-elevated rounded-lg">
        <div className="flex items-center gap-2 text-yellow-400">
          <AlertCircle size={18} />
          <span className="text-sm">Voice commands not supported in this browser</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Try Chrome, Edge, or Safari for voice support.
        </p>
      </div>
    );
  }

  // Collapsed view
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`
          voice-panel-collapsed p-2 rounded-full transition-all
          ${isListening ? 'bg-red-500 animate-pulse' : 'glass-elevated hover:bg-white/10'}
        `}
        title="Voice Commands"
      >
        {isListening ? <Mic size={20} /> : <MicOff size={20} className="text-gray-400" />}
      </button>
    );
  }

  return (
    <div className="voice-command-panel glass-elevated rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-purple-400" />
          <h3 className="text-sm font-medium">Voice Commands</h3>
          {isListening && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Listening
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400"
            title="History"
          >
            <History size={14} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400"
            title="Settings"
          >
            <Settings size={14} />
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400"
              title="Collapse"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Microphone Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggleListening}
            disabled={!settings.enabled}
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-200 relative
              ${!settings.enabled
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : isListening
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                  : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30'}
            `}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? (
              <>
                <Mic size={24} className="text-white" />
                {/* Pulse animation */}
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              </>
            ) : (
              <MicOff size={24} className="text-white" />
            )}
          </button>

          <span className="text-xs text-gray-400 text-center">
            {!settings.enabled
              ? 'Voice disabled'
              : isListening
                ? 'Speak now...'
                : settings.pushToTalk
                  ? `Hold ${settings.pushToTalkKey} to speak`
                  : 'Click to speak'}
          </span>
        </div>

        {/* Audio Level Visualization */}
        {isListening && (
          <AudioVisualization
            audioLevel={audioLevel}
            peakLevel={peakLevel}
            threshold={settings.confidenceThreshold * 0.03}
            isSpeaking={isSpeaking}
          />
        )}

        {/* Transcription Display */}
        {settings.showTranscript && (transcript || interimTranscript) && (
          <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/10">
            <p className="text-sm">
              <span className="text-white">{transcript}</span>
              <span className="text-gray-400 italic">{interimTranscript}</span>
            </p>
            {confidence > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Confidence: {(confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Command Confirmation Dialog */}
        {showConfirm && parsedCommand && (
          <CommandConfirmation
            command={parsedCommand}
            onExecute={executeCommand}
            onCancel={cancelCommand}
            onSelectSuggestion={(s) => {
              playSelectSound();
              setHistory(prev => [...prev.slice(-19), {
                transcript: s.description,
                command: s,
                timestamp: new Date().toISOString(),
                success: true
              }]);
              executeCommand(s);
            }}
          />
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <VoiceSettingsPanel
          settings={settings}
          onSave={saveSettings}
          onFeedbackChange={setFeedbackEnabled}
        />
      )}

      {/* History Panel */}
      {showHistory && (
        <VoiceHistoryPanel history={history} />
      )}

      {/* Quick Commands Footer */}
      <div className="px-4 py-2 border-t border-white/10 bg-black/20">
        <p className="text-xs text-gray-500">
          Try: "run tests", "git status", "ask claude...", "go to admin"
        </p>
      </div>

      {/* Disambiguation Dialog */}
      <VoiceDisambiguationDialog
        isOpen={showDisambiguation}
        transcript={currentTranscript}
        primaryCommand={parsedCommand}
        alternatives={disambiguationAlternatives}
        onSelect={handleDisambiguationSelect}
        onCancel={handleDisambiguationCancel}
        onExecute={handleDisambiguationSelect}
        autoSelectTimeout={5000}
      />
    </div>
  );
}

/**
 * Compact Voice Button for toolbar
 */
export function VoiceButton({ onClick, isListening, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-all
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'glass-elevated hover:bg-white/10'}
      `}
      title={isListening ? 'Stop listening' : 'Start voice command'}
    >
      {isListening ? (
        <Mic size={18} className="text-white" />
      ) : (
        <MicOff size={18} className="text-gray-400" />
      )}
    </button>
  );
}

export default VoiceCommandPanel;
