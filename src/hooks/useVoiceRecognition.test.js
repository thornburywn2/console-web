/**
 * Tests for useVoiceRecognition hook
 * Web Speech API voice recognition
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecognition, checkVoiceSupport } from './useVoiceRecognition';

// Mock SpeechRecognition
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = true;
    this.lang = 'en-US';
    this.maxAlternatives = 1;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.onstart = null;
    this.onaudiostart = null;
    this.onsoundstart = null;
    this.onspeechstart = null;
    this._isRunning = false;
  }

  start() {
    if (this._isRunning) {
      throw new Error('Already started');
    }
    this._isRunning = true;
    // Simulate async start
    setTimeout(() => {
      this.onstart?.();
    }, 0);
  }

  stop() {
    this._isRunning = false;
    setTimeout(() => {
      this.onend?.();
    }, 0);
  }

  abort() {
    this._isRunning = false;
    setTimeout(() => {
      this.onend?.();
    }, 0);
  }

  // Test helpers
  simulateResult(text, isFinal = true, confidence = 0.95) {
    this.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal,
          0: { transcript: text, confidence },
          length: 1,
        },
      ],
    });
  }

  simulateError(errorType) {
    this.onerror?.({ error: errorType });
  }
}

describe('checkVoiceSupport', () => {
  beforeEach(() => {
    // Reset window mocks
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  it('should return supported: true when SpeechRecognition exists', () => {
    window.SpeechRecognition = MockSpeechRecognition;

    const support = checkVoiceSupport();
    expect(support.supported).toBe(true);
  });

  it('should return supported: true when webkitSpeechRecognition exists', () => {
    window.webkitSpeechRecognition = MockSpeechRecognition;

    const support = checkVoiceSupport();
    expect(support.supported).toBe(true);
  });

  it('should return supported: false when no Speech API', () => {
    const support = checkVoiceSupport();
    expect(support.supported).toBe(false);
  });

  it('should detect Chrome browser', () => {
    window.SpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      configurable: true,
    });

    const support = checkVoiceSupport();
    expect(support.browser).toBe('chrome');
    expect(support.continuous).toBe(true);
    expect(support.interimResults).toBe(true);
  });

  it('should detect Edge browser', () => {
    window.SpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0 Edg/120.0.0.0',
      configurable: true,
    });

    const support = checkVoiceSupport();
    expect(support.browser).toBe('edge');
  });

  it('should detect Firefox browser', () => {
    window.SpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Firefox/120.0',
      configurable: true,
    });

    const support = checkVoiceSupport();
    expect(support.browser).toBe('firefox');
    expect(support.continuous).toBe(false);
    expect(support.interimResults).toBe(false);
  });

  it('should detect Safari browser', () => {
    window.SpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Safari/605.1.15',
      configurable: true,
    });

    const support = checkVoiceSupport();
    expect(support.browser).toBe('safari');
  });
});

describe('useVoiceRecognition', () => {
  let mockRecognition;

  beforeEach(() => {
    mockRecognition = null;
    window.SpeechRecognition = class extends MockSpeechRecognition {
      constructor() {
        super();
        mockRecognition = this;
      }
    };

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.SpeechRecognition;
  });

  describe('initialization', () => {
    it('should initialize with default state when supported', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      expect(result.current.isSupported).toBe(true);
      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.confidence).toBe(0);
    });

    it('should set isSupported false when Speech API not available', () => {
      delete window.SpeechRecognition;

      const { result } = renderHook(() => useVoiceRecognition());

      expect(result.current.isSupported).toBe(false);
      expect(result.current.error).toBe('Web Speech API not supported in this browser');
    });

    it('should configure recognition with provided options', () => {
      renderHook(() =>
        useVoiceRecognition({
          language: 'es-ES',
          continuous: true,
          interimResults: false,
        })
      );

      expect(mockRecognition.lang).toBe('es-ES');
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(false);
    });
  });

  describe('startListening', () => {
    it('should start recognition', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      let started;
      await act(async () => {
        started = result.current.startListening();
        // Wait for async start
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(started).toBe(true);
      expect(result.current.isListening).toBe(true);
    });

    it('should clear previous transcript and error', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      // Simulate a previous result
      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateResult('previous text');
      });

      expect(result.current.transcript).toBe('previous text');

      // Start again
      await act(async () => {
        result.current.stopListening();
        await new Promise((r) => setTimeout(r, 10));
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.transcript).toBe('');
    });

    it('should return false if not supported', () => {
      delete window.SpeechRecognition;

      const { result } = renderHook(() => useVoiceRecognition());

      const started = result.current.startListening();
      expect(started).toBe(false);
    });

    it('should return true if already listening', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      const started = result.current.startListening();
      expect(started).toBe(true);
    });
  });

  describe('stopListening', () => {
    it('should stop recognition', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.isListening).toBe(true);

      await act(async () => {
        result.current.stopListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('abort', () => {
    it('should abort recognition and clear transcripts', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateResult('test', false);
      });

      await act(async () => {
        result.current.abort();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
    });
  });

  describe('clearTranscript', () => {
    it('should clear transcript and interimTranscript', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateResult('final text', true);
      });

      expect(result.current.transcript).toBe('final text');

      act(() => {
        result.current.clearTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
    });
  });

  describe('recognition results', () => {
    it('should update transcript on final result', async () => {
      const onResult = vi.fn();
      const { result } = renderHook(() => useVoiceRecognition({ onResult }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateResult('hello world', true, 0.95);
      });

      expect(result.current.transcript).toBe('hello world');
      expect(result.current.confidence).toBe(0.95);
      expect(onResult).toHaveBeenCalledWith({
        transcript: 'hello world',
        confidence: 0.95,
        isFinal: true,
      });
    });

    it('should update interimTranscript on interim result', async () => {
      const onResult = vi.fn();
      const { result } = renderHook(() => useVoiceRecognition({ onResult }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateResult('partial', false);
      });

      expect(result.current.interimTranscript).toBe('partial');
      expect(onResult).toHaveBeenCalledWith({
        transcript: 'partial',
        confidence: 0,
        isFinal: false,
      });
    });
  });

  describe('error handling', () => {
    it('should handle no-speech error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceRecognition({ onError }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('no-speech');
      });

      expect(result.current.error).toBe('No speech detected');
      expect(result.current.isListening).toBe(false);
      expect(onError).toHaveBeenCalledWith('no-speech', 'No speech detected');
    });

    it('should handle audio-capture error', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('audio-capture');
      });

      expect(result.current.error).toBe('Microphone not available');
    });

    it('should handle not-allowed error', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('not-allowed');
      });

      expect(result.current.error).toBe('Microphone permission denied');
    });

    it('should handle network error', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('network');
      });

      expect(result.current.error).toContain('Cannot connect to speech service');
    });

    it('should handle aborted error', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('aborted');
      });

      expect(result.current.error).toBe('Recognition aborted');
    });

    it('should handle language-not-supported error', async () => {
      const { result } = renderHook(() =>
        useVoiceRecognition({ language: 'xx-XX' })
      );

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('language-not-supported');
      });

      expect(result.current.error).toBe("Language 'xx-XX' not supported");
    });

    it('should handle unknown error', async () => {
      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        mockRecognition.simulateError('unknown-error');
      });

      expect(result.current.error).toBe('Voice error: unknown-error');
    });
  });

  describe('onEnd callback', () => {
    it('should call onEnd when recognition ends', async () => {
      const onEnd = vi.fn();
      const { result } = renderHook(() => useVoiceRecognition({ onEnd }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
        result.current.stopListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(onEnd).toHaveBeenCalled();
    });
  });

  describe('getRecognition', () => {
    it('should return recognition instance via getter', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      const recognition = result.current.getRecognition();
      expect(recognition).toBe(mockRecognition);
    });
  });

  describe('cleanup', () => {
    it('should stop recognition on unmount', async () => {
      const { result, unmount } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      unmount();

      // Should not throw
      expect(mockRecognition._isRunning).toBe(false);
    });
  });
});
