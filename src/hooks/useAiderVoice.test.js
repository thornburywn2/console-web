/**
 * Tests for useAiderVoice hook
 * Voice command routing for Aider integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiderVoice } from './useAiderVoice';

// Mock the API service
vi.mock('../services/api.js', () => ({
  aiderApi: {
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    startVoice: vi.fn(),
    stopVoice: vi.fn(),
    sendInput: vi.fn(),
    getStatus: vi.fn(),
  },
}));

import { aiderApi } from '../services/api.js';

describe('useAiderVoice', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockOnModeSwitch = vi.fn();
  const mockOnAiderCommand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAiderVoice());

      expect(result.current.aiderSession).toBeNull();
      expect(result.current.aiderVoiceActive).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasActiveSession).toBe(false);
    });
  });

  describe('startAiderSession', () => {
    it('should start a new Aider session', async () => {
      const mockSession = { id: 'session-1', projectPath: '/test/path' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });

      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      expect(aiderApi.createSession).toHaveBeenCalledWith('/test/path', {});
      expect(result.current.aiderSession).toEqual(mockSession);
      expect(result.current.hasActiveSession).toBe(true);
    });

    it('should pass session options to API', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });

      const { result } = renderHook(() => useAiderVoice());
      const options = { model: 'gpt-4' };

      await act(async () => {
        await result.current.startAiderSession('/test/path', options);
      });

      expect(aiderApi.createSession).toHaveBeenCalledWith('/test/path', options);
    });

    it('should set loading state during session creation', async () => {
      let resolvePromise;
      aiderApi.createSession.mockImplementationOnce(() =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useAiderVoice());

      act(() => {
        result.current.startAiderSession('/test/path');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({ session: { id: 'session-1' } });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set error on failure', async () => {
      const error = new Error('Failed to create session');
      error.getUserMessage = () => 'Failed to create session';
      aiderApi.createSession.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        try {
          await result.current.startAiderSession('/test/path');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Failed to create session');
    });

    it('should set up socket listeners when socket provided', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });

      const { result } = renderHook(() =>
        useAiderVoice({ socket: mockSocket })
      );

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      expect(mockSocket.on).toHaveBeenCalledWith('aider:session-1:voice', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('aider:session-1:status', expect.any(Function));
    });
  });

  describe('stopAiderSession', () => {
    it('should stop the current session', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });
      aiderApi.deleteSession.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      expect(result.current.hasActiveSession).toBe(true);

      await act(async () => {
        await result.current.stopAiderSession();
      });

      expect(aiderApi.deleteSession).toHaveBeenCalledWith('session-1');
      expect(result.current.aiderSession).toBeNull();
      expect(result.current.hasActiveSession).toBe(false);
    });

    it('should do nothing if no active session', async () => {
      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        await result.current.stopAiderSession();
      });

      expect(aiderApi.deleteSession).not.toHaveBeenCalled();
    });

    it('should clean up socket listeners when socket provided', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });
      aiderApi.deleteSession.mockResolvedValueOnce({});

      const { result } = renderHook(() =>
        useAiderVoice({ socket: mockSocket })
      );

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      await act(async () => {
        await result.current.stopAiderSession();
      });

      expect(mockSocket.off).toHaveBeenCalledWith('aider:session-1:voice');
      expect(mockSocket.off).toHaveBeenCalledWith('aider:session-1:status');
    });
  });

  describe('startAiderVoice', () => {
    it('should start voice mode for active session', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });
      aiderApi.startVoice.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      await act(async () => {
        await result.current.startAiderVoice();
      });

      expect(aiderApi.startVoice).toHaveBeenCalledWith('session-1');
      expect(result.current.aiderVoiceActive).toBe(true);
    });

    it('should set error if no active session', async () => {
      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        await result.current.startAiderVoice();
      });

      expect(result.current.error).toBe('No Aider session active');
    });
  });

  describe('stopAiderVoice', () => {
    it('should stop voice mode for active session', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });
      aiderApi.startVoice.mockResolvedValueOnce({});
      aiderApi.stopVoice.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAiderVoice());

      // Start session first
      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      // Then start voice in separate act to allow state update
      await act(async () => {
        await result.current.startAiderVoice();
      });

      expect(result.current.aiderVoiceActive).toBe(true);

      await act(async () => {
        await result.current.stopAiderVoice();
      });

      expect(aiderApi.stopVoice).toHaveBeenCalledWith('session-1');
      expect(result.current.aiderVoiceActive).toBe(false);
    });
  });

  describe('sendToAider', () => {
    it('should send input to Aider session', async () => {
      const mockSession = { id: 'session-1' };
      aiderApi.createSession.mockResolvedValueOnce({ session: mockSession });
      aiderApi.sendInput.mockResolvedValueOnce({});

      const { result } = renderHook(() =>
        useAiderVoice({ onAiderCommand: mockOnAiderCommand })
      );

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      await act(async () => {
        await result.current.sendToAider('test input');
      });

      expect(aiderApi.sendInput).toHaveBeenCalledWith('session-1', 'test input');
      expect(mockOnAiderCommand).toHaveBeenCalledWith({ type: 'input', input: 'test input' });
    });

    it('should set error if no active session', async () => {
      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        await result.current.sendToAider('test');
      });

      expect(result.current.error).toBe('No Aider session active');
    });
  });

  describe('isAiderCommand', () => {
    it('should return true for aider type commands', () => {
      const { result } = renderHook(() => useAiderVoice());

      expect(result.current.isAiderCommand({ type: 'aider' })).toBe(true);
    });

    it('should return true for commands with aider- action prefix', () => {
      const { result } = renderHook(() => useAiderVoice());

      expect(result.current.isAiderCommand({ action: 'aider-start' })).toBe(true);
      expect(result.current.isAiderCommand({ action: 'aider-stop' })).toBe(true);
    });

    it('should return falsy for non-aider commands', () => {
      const { result } = renderHook(() => useAiderVoice());

      expect(result.current.isAiderCommand({ type: 'terminal' })).toBeFalsy();
      expect(result.current.isAiderCommand({ action: 'run-command' })).toBeFalsy();
    });

    it('should return falsy for null/undefined', () => {
      const { result } = renderHook(() => useAiderVoice());

      expect(result.current.isAiderCommand(null)).toBeFalsy();
      expect(result.current.isAiderCommand(undefined)).toBeFalsy();
    });
  });

  describe('handleAiderVoiceCommand', () => {
    beforeEach(() => {
      aiderApi.createSession.mockResolvedValue({ session: { id: 'session-1' } });
      aiderApi.deleteSession.mockResolvedValue({});
      aiderApi.startVoice.mockResolvedValue({});
      aiderApi.stopVoice.mockResolvedValue({});
      aiderApi.sendInput.mockResolvedValue({});
    });

    it('should handle aider-start command', async () => {
      const { result } = renderHook(() =>
        useAiderVoice({ onModeSwitch: mockOnModeSwitch })
      );

      await act(async () => {
        await result.current.handleAiderVoiceCommand(
          { action: 'aider-start' },
          '/test/path'
        );
      });

      expect(aiderApi.createSession).toHaveBeenCalled();
      expect(mockOnModeSwitch).toHaveBeenCalledWith('aider');
    });

    it('should handle aider-stop command', async () => {
      const { result } = renderHook(() =>
        useAiderVoice({ onModeSwitch: mockOnModeSwitch })
      );

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      await act(async () => {
        await result.current.handleAiderVoiceCommand(
          { action: 'aider-stop' },
          '/test/path'
        );
      });

      expect(aiderApi.deleteSession).toHaveBeenCalled();
      expect(mockOnModeSwitch).toHaveBeenCalledWith('claude');
    });

    it('should handle switch-to-claude command', async () => {
      const { result } = renderHook(() =>
        useAiderVoice({ onModeSwitch: mockOnModeSwitch })
      );

      await act(async () => {
        await result.current.handleAiderVoiceCommand(
          { action: 'switch-to-claude' },
          '/test/path'
        );
      });

      expect(mockOnModeSwitch).toHaveBeenCalledWith('claude');
    });

    it('should handle aider-query command', async () => {
      const { result } = renderHook(() =>
        useAiderVoice({ onAiderCommand: mockOnAiderCommand })
      );

      await act(async () => {
        await result.current.startAiderSession('/test/path');
      });

      await act(async () => {
        await result.current.handleAiderVoiceCommand(
          { action: 'aider-query', command: '/help' },
          '/test/path'
        );
      });

      expect(aiderApi.sendInput).toHaveBeenCalledWith('session-1', '/help');
    });
  });

  describe('getAiderStatus', () => {
    it('should get Aider status', async () => {
      const mockStatus = { installed: true, version: '0.50.0' };
      aiderApi.getStatus.mockResolvedValueOnce(mockStatus);

      const { result } = renderHook(() => useAiderVoice());

      let status;
      await act(async () => {
        status = await result.current.getAiderStatus();
      });

      expect(aiderApi.getStatus).toHaveBeenCalled();
      expect(status).toEqual(mockStatus);
    });

    it('should return null on error', async () => {
      aiderApi.getStatus.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useAiderVoice());

      let status;
      await act(async () => {
        status = await result.current.getAiderStatus();
      });

      expect(status).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', async () => {
      const error = new Error('Test error');
      error.getUserMessage = () => 'Test error';
      aiderApi.createSession.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAiderVoice());

      await act(async () => {
        try {
          await result.current.startAiderSession('/test/path');
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
