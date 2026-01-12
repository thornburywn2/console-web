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
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Settings, History,
  X, Check, ChevronDown, ChevronUp, Loader2, AlertCircle,
  Command, Wand2
} from 'lucide-react';
import { useVoiceRecognition, checkVoiceSupport } from '../hooks/useVoiceRecognition';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { useVoiceActivityDetection, AudioLevelIndicator } from '../hooks/useVoiceActivityDetection.jsx';
import { VoiceDisambiguationDialog, VoiceDisambiguationInline } from './VoiceDisambiguationDialog';

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
    fetch('/api/voice/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setSettings(prev => ({ ...prev, ...data }));
      })
      .catch(err => console.error('Failed to load voice settings:', err));
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
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          sessionId,
          confidence: inputConfidence
        })
      });

      if (!res.ok) throw new Error('Failed to process');

      const data = await res.json();
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
      console.error('Voice processing error:', err);
      playErrorSound();
    }
  }

  // Execute a parsed command
  async function executeCommand(command, commandId) {
    if (!command) return;

    // Track execution
    if (commandId) {
      fetch('/api/voice/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId, confirmed: true })
      }).catch(err => console.error('Failed to track execution:', err));
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
  }, [playSelectSound, playSuccessSound]);

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
      await fetch('/api/voice/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
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
          <div className="mt-4 space-y-2">
            {/* Real-time audio level bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">Level:</span>
              <AudioLevelIndicator
                level={audioLevel}
                peak={peakLevel}
                threshold={settings.confidenceThreshold * 0.03}
                width={180}
                height={6}
                showThreshold={true}
              />
              {isSpeaking && (
                <span className="text-xs text-green-400 font-medium">Speaking</span>
              )}
            </div>

            {/* Animated bars for visual feedback */}
            <div className="flex items-center justify-center gap-1">
              {[...Array(7)].map((_, i) => {
                // Use audio level to drive bar heights
                const baseHeight = 8;
                const levelBoost = audioLevel * 200 * (1 + Math.sin(Date.now() / 100 + i) * 0.3);
                const height = Math.max(baseHeight, Math.min(32, baseHeight + levelBoost));

                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isSpeaking ? 'bg-green-400' : 'bg-blue-400'
                    }`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
          </div>
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
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-xs text-gray-400 mb-1">Recognized command:</p>
            <p className="text-sm font-mono text-white mb-2">
              {parsedCommand.command || parsedCommand.description}
            </p>
            {parsedCommand.description && parsedCommand.command && (
              <p className="text-xs text-gray-400 mb-2">{parsedCommand.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {(parsedCommand.confidence * 100).toFixed(0)}% confident
              </span>
              <div className="flex gap-2">
                <button
                  onClick={cancelCommand}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={() => executeCommand(parsedCommand)}
                  className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 rounded flex items-center gap-1"
                >
                  <Check size={12} />
                  Execute
                </button>
              </div>
            </div>

            {/* Suggestions for low confidence */}
            {parsedCommand.suggestions?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">Did you mean:</p>
                <div className="space-y-1">
                  {parsedCommand.suggestions.slice(0, 3).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // TODO: Execute suggestion
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                    >
                      {s.description}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          <h4 className="text-xs font-medium text-gray-400 mb-3">Voice Settings</h4>
          <div className="space-y-3">
            {/* Enable Voice */}
            <label className="flex items-center justify-between">
              <span className="text-sm">Enable voice</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => saveSettings({ enabled: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            </label>

            {/* Auto Execute */}
            <label className="flex items-center justify-between">
              <span className="text-sm">Auto-execute high confidence</span>
              <input
                type="checkbox"
                checked={settings.autoExecute}
                onChange={(e) => saveSettings({ autoExecute: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            </label>

            {/* Push to Talk */}
            <label className="flex items-center justify-between">
              <span className="text-sm">Push-to-talk</span>
              <input
                type="checkbox"
                checked={settings.pushToTalk}
                onChange={(e) => saveSettings({ pushToTalk: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            </label>

            {/* Show Transcript */}
            <label className="flex items-center justify-between">
              <span className="text-sm">Show transcript</span>
              <input
                type="checkbox"
                checked={settings.showTranscript}
                onChange={(e) => saveSettings({ showTranscript: e.target.checked })}
                className="w-4 h-4 rounded"
              />
            </label>

            {/* Sound Feedback */}
            <label className="flex items-center justify-between">
              <span className="text-sm">Sound feedback</span>
              <input
                type="checkbox"
                checked={settings.playFeedbackSounds}
                onChange={(e) => {
                  saveSettings({ playFeedbackSounds: e.target.checked });
                  setFeedbackEnabled(e.target.checked);
                }}
                className="w-4 h-4 rounded"
              />
            </label>

            {/* Confidence Threshold */}
            <div>
              <label className="flex items-center justify-between mb-1">
                <span className="text-sm">Confidence threshold</span>
                <span className="text-xs text-gray-400">
                  {(settings.confidenceThreshold * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => saveSettings({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Language */}
            <div>
              <label className="text-sm mb-1 block">Language</label>
              <select
                value={settings.language}
                onChange={(e) => saveSettings({ language: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ja-JP">Japanese</option>
                <option value="zh-CN">Chinese (Simplified)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 max-h-48 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-400 mb-3">Recent Commands</h4>
          {history.length === 0 ? (
            <p className="text-xs text-gray-500">No voice commands yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item, i) => (
                <div key={i} className="text-xs">
                  <p className="text-gray-300 truncate">{item.transcript}</p>
                  <p className="text-gray-500">
                    {item.command?.description || item.command?.action}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
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
