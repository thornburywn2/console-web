/**
 * useVoiceActivityDetection - Voice Activity Detection Hook
 * P0 Phase 3: Voice Activity Detection (VAD)
 *
 * Detects when the user is speaking using Web Audio API analysis.
 * Features:
 * - Real-time audio level monitoring
 * - Automatic speech start/end detection
 * - Silence threshold configuration
 * - Energy-based VAD algorithm
 * - Noise gate filtering
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Default VAD configuration
 */
const DEFAULT_CONFIG = {
  // Volume threshold to detect speech (0-1)
  silenceThreshold: 0.02,
  // Duration of silence before considering speech ended (ms)
  silenceTimeout: 1500,
  // Minimum speech duration to trigger (ms)
  minSpeechDuration: 200,
  // Audio analysis frequency (ms)
  analysisInterval: 50,
  // Number of consecutive samples above threshold to start
  consecutiveSamplesRequired: 3,
  // Enable automatic gain control
  autoGainControl: true,
  // Enable echo cancellation
  echoCancellation: true,
  // Enable noise suppression
  noiseSuppression: true
};

/**
 * Voice Activity Detection Hook
 */
export function useVoiceActivityDetection(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [error, setError] = useState(null);

  // Audio processing refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // VAD state refs
  const silenceTimeoutRef = useRef(null);
  const speechStartTimeRef = useRef(null);
  const consecutiveAboveThresholdRef = useRef(0);
  const lastLevelRef = useRef(0);

  // Callback refs
  const onSpeechStartRef = useRef(options.onSpeechStart);
  const onSpeechEndRef = useRef(options.onSpeechEnd);
  const onLevelChangeRef = useRef(options.onLevelChange);

  // Update callback refs when options change
  useEffect(() => {
    onSpeechStartRef.current = options.onSpeechStart;
    onSpeechEndRef.current = options.onSpeechEnd;
    onLevelChangeRef.current = options.onLevelChange;
  }, [options.onSpeechStart, options.onSpeechEnd, options.onLevelChange]);

  // Check browser support
  useEffect(() => {
    const supported = !!(
      navigator.mediaDevices?.getUserMedia &&
      window.AudioContext || window.webkitAudioContext
    );
    setIsSupported(supported);
  }, []);

  /**
   * Calculate RMS (Root Mean Square) volume level
   */
  const calculateRMS = useCallback((dataArray) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = (dataArray[i] - 128) / 128;
      sum += value * value;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  /**
   * Analyze audio and detect speech
   */
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isActive) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);

    // Calculate volume level
    const level = calculateRMS(dataArray);
    const smoothedLevel = lastLevelRef.current * 0.7 + level * 0.3;
    lastLevelRef.current = smoothedLevel;

    setAudioLevel(smoothedLevel);
    setPeakLevel(prev => Math.max(prev * 0.995, smoothedLevel));

    // Notify level change
    if (onLevelChangeRef.current) {
      onLevelChangeRef.current(smoothedLevel);
    }

    // VAD logic
    const isAboveThreshold = smoothedLevel > config.silenceThreshold;

    if (isAboveThreshold) {
      consecutiveAboveThresholdRef.current++;

      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Start speech detection
      if (
        !isSpeaking &&
        consecutiveAboveThresholdRef.current >= config.consecutiveSamplesRequired
      ) {
        speechStartTimeRef.current = Date.now();
        setIsSpeaking(true);

        if (onSpeechStartRef.current) {
          onSpeechStartRef.current();
        }
      }
    } else {
      consecutiveAboveThresholdRef.current = 0;

      // Handle silence (potential speech end)
      if (isSpeaking && !silenceTimeoutRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          const speechDuration = Date.now() - (speechStartTimeRef.current || 0);

          if (speechDuration >= config.minSpeechDuration) {
            setIsSpeaking(false);

            if (onSpeechEndRef.current) {
              onSpeechEndRef.current({ duration: speechDuration });
            }
          }

          silenceTimeoutRef.current = null;
        }, config.silenceTimeout);
      }
    }

    // Continue analysis loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [isActive, isSpeaking, config, calculateRMS]);

  /**
   * Start voice activity detection
   */
  const start = useCallback(async () => {
    if (!isSupported) {
      setError('Voice activity detection not supported');
      return false;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: config.autoGainControl,
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context and analyser
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();

      // Configure analyser
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;

      // Connect source to analyser
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      setIsActive(true);
      setError(null);

      return true;
    } catch (err) {
      console.error('VAD start error:', err);
      setError(err.message || 'Failed to start voice detection');
      return false;
    }
  }, [isSupported, config]);

  /**
   * Stop voice activity detection
   */
  const stop = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Reset state
    setIsActive(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    consecutiveAboveThresholdRef.current = 0;
    lastLevelRef.current = 0;
  }, []);

  // Start analysis loop when active
  useEffect(() => {
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, analyzeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  /**
   * Reset peak level
   */
  const resetPeak = useCallback(() => {
    setPeakLevel(0);
  }, []);

  /**
   * Update silence threshold dynamically
   */
  const setThreshold = useCallback((threshold) => {
    config.silenceThreshold = Math.max(0.001, Math.min(1, threshold));
  }, [config]);

  return {
    // State
    isSupported,
    isActive,
    isSpeaking,
    audioLevel,
    peakLevel,
    error,
    // Actions
    start,
    stop,
    resetPeak,
    setThreshold
  };
}

/**
 * Audio Level Visualizer Component (helper)
 */
export function AudioLevelIndicator({
  level,
  peak,
  threshold,
  width = 100,
  height = 8,
  showThreshold = true
}) {
  const levelWidth = Math.min(100, level * 100 / 0.5) * width / 100;
  const peakPosition = Math.min(100, (peak || 0) * 100 / 0.5) * width / 100;
  const thresholdPosition = Math.min(100, threshold * 100 / 0.5) * width / 100;

  return (
    <div
      className="relative bg-gray-800 rounded overflow-hidden"
      style={{ width, height }}
    >
      {/* Level bar */}
      <div
        className={`absolute left-0 top-0 h-full transition-all duration-50 ${
          level > threshold ? 'bg-green-500' : 'bg-blue-500'
        }`}
        style={{ width: levelWidth }}
      />

      {/* Peak indicator */}
      {peak > 0 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-white/60"
          style={{ left: peakPosition }}
        />
      )}

      {/* Threshold line */}
      {showThreshold && (
        <div
          className="absolute top-0 h-full w-0.5 bg-yellow-500/80"
          style={{ left: thresholdPosition }}
        />
      )}
    </div>
  );
}

export default useVoiceActivityDetection;
