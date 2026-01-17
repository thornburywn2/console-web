/**
 * Aider Voice Integration Hook
 * P1 Phase 2: Voice command routing for Aider
 *
 * Bridges voice commands with Aider session management.
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useCallback, useRef } from 'react';
import { aiderApi } from '../services/api.js';

export function useAiderVoice(options = {}) {
  const {
    onModeSwitch,
    onAiderCommand,
    socket
  } = options;

  const [aiderSession, setAiderSession] = useState(null);
  const [aiderVoiceActive, setAiderVoiceActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastSessionRef = useRef(null);

  /**
   * Start a new Aider session
   */
  const startAiderSession = useCallback(async (projectPath, sessionOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const data = await aiderApi.createSession(projectPath, sessionOptions);
      setAiderSession(data.session);
      lastSessionRef.current = data.session;

      // Set up socket listeners for this session
      if (socket && data.session?.id) {
        socket.on(`aider:${data.session.id}:voice`, (status) => {
          setAiderVoiceActive(status === 'listening');
        });

        socket.on(`aider:${data.session.id}:status`, (status) => {
          setAiderSession(prev => prev ? { ...prev, status } : null);
          if (status === 'stopped') {
            setAiderVoiceActive(false);
          }
        });
      }

      return data.session;
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [socket]);

  /**
   * Stop current Aider session
   */
  const stopAiderSession = useCallback(async () => {
    if (!aiderSession) return;

    setLoading(true);
    try {
      await aiderApi.deleteSession(aiderSession.id);

      // Clean up socket listeners
      if (socket && aiderSession.id) {
        socket.off(`aider:${aiderSession.id}:voice`);
        socket.off(`aider:${aiderSession.id}:status`);
      }

      setAiderSession(null);
      setAiderVoiceActive(false);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [aiderSession, socket]);

  /**
   * Start Aider's built-in voice mode
   */
  const startAiderVoice = useCallback(async () => {
    if (!aiderSession) {
      setError('No Aider session active');
      return;
    }

    try {
      await aiderApi.startVoice(aiderSession.id);
      setAiderVoiceActive(true);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  }, [aiderSession]);

  /**
   * Stop Aider's built-in voice mode
   */
  const stopAiderVoice = useCallback(async () => {
    if (!aiderSession) return;

    try {
      await aiderApi.stopVoice(aiderSession.id);
      setAiderVoiceActive(false);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  }, [aiderSession]);

  /**
   * Send input to Aider
   */
  const sendToAider = useCallback(async (input) => {
    if (!aiderSession) {
      setError('No Aider session active');
      return;
    }

    try {
      await aiderApi.sendInput(aiderSession.id, input);
      onAiderCommand?.({ type: 'input', input });
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    }
  }, [aiderSession, onAiderCommand]);

  /**
   * Handle a parsed voice command for Aider
   */
  const handleAiderVoiceCommand = useCallback(async (command, projectPath) => {
    const { action, command: aiderCommand } = command;

    switch (action) {
      case 'aider-start':
        if (!aiderSession) {
          await startAiderSession(projectPath);
        }
        onModeSwitch?.('aider');
        break;

      case 'aider-stop':
        await stopAiderSession();
        onModeSwitch?.('claude');
        break;

      case 'aider-voice-start':
        if (!aiderSession) {
          await startAiderSession(projectPath);
        }
        await startAiderVoice();
        break;

      case 'aider-voice-stop':
        await stopAiderVoice();
        break;

      case 'aider-add-file':
      case 'aider-drop-file':
      case 'aider-diff':
      case 'aider-undo':
      case 'aider-clear':
      case 'aider-help':
      case 'aider-model':
      case 'aider-set-model':
      case 'aider-commit':
        if (aiderCommand) {
          await sendToAider(aiderCommand);
        }
        break;

      case 'aider-query':
        if (aiderCommand) {
          await sendToAider(aiderCommand);
        }
        break;

      case 'switch-to-claude':
        // Keep Aider session but switch mode
        onModeSwitch?.('claude');
        break;

      default:
        console.warn('Unknown Aider voice command:', action);
    }

    onAiderCommand?.(command);
  }, [
    aiderSession,
    startAiderSession,
    stopAiderSession,
    startAiderVoice,
    stopAiderVoice,
    sendToAider,
    onModeSwitch,
    onAiderCommand
  ]);

  /**
   * Check if command should be routed to Aider
   */
  const isAiderCommand = useCallback((command) => {
    return command?.type === 'aider' || command?.action?.startsWith('aider-');
  }, []);

  /**
   * Get Aider status
   */
  const getAiderStatus = useCallback(async () => {
    try {
      return await aiderApi.getStatus();
    } catch (err) {
      console.error('Failed to get Aider status:', err);
      return null;
    }
  }, []);

  return {
    // State
    aiderSession,
    aiderVoiceActive,
    loading,
    error,

    // Session management
    startAiderSession,
    stopAiderSession,

    // Voice mode
    startAiderVoice,
    stopAiderVoice,

    // Communication
    sendToAider,

    // Voice command handling
    handleAiderVoiceCommand,
    isAiderCommand,

    // Status
    getAiderStatus,
    hasActiveSession: !!aiderSession,

    // Error clearing
    clearError: () => setError(null)
  };
}

export default useAiderVoice;
