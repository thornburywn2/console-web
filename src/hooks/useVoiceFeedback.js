/**
 * useVoiceFeedback - Audio Feedback for Voice Commands
 * P0 Phase 2: Voice Feedback Sounds
 *
 * Provides audio feedback using Web Audio API for voice command events:
 * - Start listening beep
 * - Stop listening beep
 * - Command recognized success tone
 * - Command failed error tone
 * - Disambiguation multiple-match tone
 */

import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Audio context singleton for the application
 */
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate a beep tone
 * @param {Object} options - Tone options
 */
function playTone(options = {}) {
  const {
    frequency = 440,
    duration = 0.15,
    type = 'sine',
    volume = 0.3,
    attack = 0.01,
    decay = 0.05
  } = options;

  try {
    const ctx = getAudioContext();

    // Resume audio context if suspended (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Failed to play audio feedback:', err);
  }
}

/**
 * Play a sequence of tones
 * @param {Array} tones - Array of tone options with delays
 */
function playSequence(tones) {
  tones.forEach(({ delay = 0, ...options }) => {
    setTimeout(() => playTone(options), delay);
  });
}

// Predefined sound effects
const SOUNDS = {
  // Start listening - rising tone
  startListening: () => {
    playSequence([
      { frequency: 440, duration: 0.1, volume: 0.25 },
      { frequency: 660, duration: 0.1, delay: 100, volume: 0.25 }
    ]);
  },

  // Stop listening - falling tone
  stopListening: () => {
    playSequence([
      { frequency: 660, duration: 0.1, volume: 0.2 },
      { frequency: 440, duration: 0.1, delay: 100, volume: 0.2 }
    ]);
  },

  // Command recognized - success chime
  success: () => {
    playSequence([
      { frequency: 523, duration: 0.1, type: 'sine', volume: 0.3 },
      { frequency: 659, duration: 0.1, delay: 80, type: 'sine', volume: 0.3 },
      { frequency: 784, duration: 0.15, delay: 160, type: 'sine', volume: 0.35 }
    ]);
  },

  // Command failed - error tone
  error: () => {
    playSequence([
      { frequency: 200, duration: 0.15, type: 'square', volume: 0.2 },
      { frequency: 150, duration: 0.2, delay: 150, type: 'square', volume: 0.2 }
    ]);
  },

  // Disambiguation needed - questioning tone
  disambiguation: () => {
    playSequence([
      { frequency: 440, duration: 0.1, type: 'sine', volume: 0.25 },
      { frequency: 550, duration: 0.12, delay: 100, type: 'sine', volume: 0.25 },
      { frequency: 440, duration: 0.15, delay: 220, type: 'sine', volume: 0.2 }
    ]);
  },

  // Option selected - soft click
  select: () => {
    playTone({
      frequency: 800,
      duration: 0.05,
      type: 'sine',
      volume: 0.15
    });
  },

  // Cancel - soft descending tone
  cancel: () => {
    playSequence([
      { frequency: 400, duration: 0.08, volume: 0.15 },
      { frequency: 300, duration: 0.1, delay: 80, volume: 0.12 }
    ]);
  },

  // Typing/interim result - very soft tick
  interim: () => {
    playTone({
      frequency: 1200,
      duration: 0.02,
      type: 'sine',
      volume: 0.08
    });
  },

  // Ready/wake word detected
  wake: () => {
    playSequence([
      { frequency: 880, duration: 0.08, type: 'sine', volume: 0.3 },
      { frequency: 1100, duration: 0.1, delay: 80, type: 'sine', volume: 0.35 }
    ]);
  },

  // Low confidence warning
  warning: () => {
    playSequence([
      { frequency: 350, duration: 0.12, type: 'triangle', volume: 0.2 },
      { frequency: 400, duration: 0.1, delay: 120, type: 'triangle', volume: 0.2 }
    ]);
  },

  // Notification/attention
  notify: () => {
    playSequence([
      { frequency: 660, duration: 0.1, type: 'sine', volume: 0.25 },
      { frequency: 880, duration: 0.12, delay: 100, type: 'sine', volume: 0.28 }
    ]);
  }
};

/**
 * Custom hook for voice feedback sounds
 */
export function useVoiceFeedback(options = {}) {
  const {
    enabled = true,
    volume = 1.0,
    interimFeedback = false
  } = options;

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [masterVolume, setMasterVolume] = useState(volume);
  const lastInterimTime = useRef(0);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      try {
        getAudioContext();
      } catch (err) {
        console.warn('Audio context not available');
      }
    };

    // Initialize on click or key press
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  // Play a sound effect
  const playSound = useCallback((soundName, customOptions = {}) => {
    if (!isEnabled) return;

    const soundFn = SOUNDS[soundName];
    if (soundFn) {
      // Apply master volume
      soundFn();
    } else {
      // Play custom tone if provided
      playTone({
        volume: 0.3 * masterVolume,
        ...customOptions
      });
    }
  }, [isEnabled, masterVolume]);

  // Sound effect wrappers
  const onStartListening = useCallback(() => {
    playSound('startListening');
  }, [playSound]);

  const onStopListening = useCallback(() => {
    playSound('stopListening');
  }, [playSound]);

  const onSuccess = useCallback(() => {
    playSound('success');
  }, [playSound]);

  const onError = useCallback(() => {
    playSound('error');
  }, [playSound]);

  const onDisambiguation = useCallback(() => {
    playSound('disambiguation');
  }, [playSound]);

  const onSelect = useCallback(() => {
    playSound('select');
  }, [playSound]);

  const onCancel = useCallback(() => {
    playSound('cancel');
  }, [playSound]);

  const onInterim = useCallback(() => {
    if (!interimFeedback) return;

    // Throttle interim feedback to prevent audio spam
    const now = Date.now();
    if (now - lastInterimTime.current > 500) {
      lastInterimTime.current = now;
      playSound('interim');
    }
  }, [playSound, interimFeedback]);

  const onWake = useCallback(() => {
    playSound('wake');
  }, [playSound]);

  const onWarning = useCallback(() => {
    playSound('warning');
  }, [playSound]);

  const onNotify = useCallback(() => {
    playSound('notify');
  }, [playSound]);

  // Toggle enabled state
  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  return {
    isEnabled,
    setIsEnabled,
    toggleEnabled,
    masterVolume,
    setMasterVolume,
    playSound,
    // Convenience methods
    onStartListening,
    onStopListening,
    onSuccess,
    onError,
    onDisambiguation,
    onSelect,
    onCancel,
    onInterim,
    onWake,
    onWarning,
    onNotify
  };
}

/**
 * Simple sound effect player (non-hook version)
 */
export const voiceSounds = {
  play: (soundName) => {
    const soundFn = SOUNDS[soundName];
    if (soundFn) soundFn();
  },
  playTone,
  playSequence,
  sounds: Object.keys(SOUNDS)
};

export default useVoiceFeedback;
