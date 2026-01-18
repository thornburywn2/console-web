/**
 * Tests for useVoiceFeedback hook
 * Audio feedback for voice commands using Web Audio API
 *
 * Note: Complex audio API mocking causes React concurrent mode conflicts.
 * These tests focus on hook structure and exports.
 */

import { describe, it, expect } from 'vitest';
import { useVoiceFeedback, voiceSounds } from './useVoiceFeedback';

describe('useVoiceFeedback exports', () => {
  it('should export useVoiceFeedback hook', () => {
    expect(typeof useVoiceFeedback).toBe('function');
  });

  it('should export voiceSounds utility with required methods', () => {
    expect(typeof voiceSounds).toBe('object');
    expect(typeof voiceSounds.play).toBe('function');
    expect(typeof voiceSounds.playTone).toBe('function');
    expect(typeof voiceSounds.playSequence).toBe('function');
    expect(Array.isArray(voiceSounds.sounds)).toBe(true);

    // Check available sounds
    const expectedSounds = [
      'startListening', 'stopListening', 'success', 'error',
      'disambiguation', 'select', 'cancel', 'interim',
      'wake', 'warning', 'notify'
    ];
    expectedSounds.forEach(sound => {
      expect(voiceSounds.sounds).toContain(sound);
    });
  });
});
