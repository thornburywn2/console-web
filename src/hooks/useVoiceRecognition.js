/**
 * useVoiceRecognition - Web Speech API Hook for Voice Commands
 * P0 Phase 1: Basic Voice Input
 *
 * Provides voice recognition capabilities using the Web Speech API
 * with support for continuous listening, interim results, and
 * multiple browser implementations.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Check browser support for Web Speech API
 * @returns {Object} Support information
 */
export function checkVoiceSupport() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const userAgent = navigator.userAgent;

  let browser = 'unknown';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'edge';
  } else if (userAgent.includes('Firefox')) {
    browser = 'firefox';
  }

  return {
    supported: !!SpeechRecognition,
    browser,
    continuous: browser === 'chrome' || browser === 'edge',
    interimResults: browser === 'chrome' || browser === 'edge'
  };
}

/**
 * Voice Recognition Hook
 * @param {Object} options - Configuration options
 * @param {string} options.language - Recognition language (default: 'en-US')
 * @param {boolean} options.continuous - Continue listening after results (default: false)
 * @param {boolean} options.interimResults - Show interim results (default: true)
 * @param {Function} options.onResult - Callback for recognition results
 * @param {Function} options.onError - Callback for errors
 * @param {Function} options.onEnd - Callback when recognition ends
 * @returns {Object} Voice recognition controls and state
 */
export function useVoiceRecognition(options = {}) {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Web Speech API not supported in this browser');
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 3;

    // Handle results
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const conf = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += text;
          setConfidence(conf);
        } else {
          interim += text;
        }
      }

      setInterimTranscript(interim);

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResult?.({
          transcript: finalTranscript,
          confidence: event.results[event.results.length - 1][0].confidence,
          isFinal: true
        });
      } else if (interim) {
        onResult?.({
          transcript: interim,
          confidence: 0,
          isFinal: false
        });
      }
    };

    // Handle errors
    recognition.onerror = (event) => {
      let errorMessage = 'Voice recognition error';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied';
          break;
        case 'network':
          errorMessage = 'Cannot connect to speech service. Chrome uses Google servers - check network/firewall. Try Firefox for offline recognition.';
          break;
        case 'aborted':
          errorMessage = 'Recognition aborted';
          break;
        case 'language-not-supported':
          errorMessage = `Language '${language}' not supported`;
          break;
        default:
          errorMessage = `Voice error: ${event.error}`;
      }

      setError(errorMessage);
      setIsListening(false);
      isListeningRef.current = false;
      onError?.(event.error, errorMessage);
    };

    // Handle end
    recognition.onend = () => {
      // Auto-restart if continuous mode and should keep listening
      if (shouldRestartRef.current && continuous && isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        onEnd?.();
      }
    };

    // Handle start
    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
      isListeningRef.current = true;
    };

    // Handle audio start
    recognition.onaudiostart = () => {
      // Audio capture started
    };

    // Handle sound start
    recognition.onsoundstart = () => {
      // Sound detected
    };

    // Handle speech start
    recognition.onspeechstart = () => {
      // Speech detected
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Voice recognition not available');
      return false;
    }

    if (isListeningRef.current) {
      return true; // Already listening
    }

    try {
      shouldRestartRef.current = continuous;
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
      return true;
    } catch (e) {
      setError(`Failed to start: ${e.message}`);
      return false;
    }
  }, [isSupported, continuous]);

  // Stop listening
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;

    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
    }

    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  // Abort (stop immediately without waiting for results)
  const abort = useCallback(() => {
    shouldRestartRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore errors
      }
    }

    setIsListening(false);
    isListeningRef.current = false;
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    // State
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    confidence,

    // Controls
    startListening,
    stopListening,
    abort,
    clearTranscript,

    // Raw recognition getter (for advanced use - access via callback to avoid render issues)
    getRecognition: () => recognitionRef.current
  };
}

export default useVoiceRecognition;
