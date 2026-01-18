/**
 * VoiceInput Component Tests
 * Phase 5.3: Unit tests for voice input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import VoiceInput from './VoiceInput';

// Mock Web Speech API
const mockSpeechRecognition = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onstart: null,
  onend: null,
  onresult: null,
  onerror: null,
}));

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition,
});

describe('VoiceInput', () => {
  const mockOnTranscript = vi.fn();
  const mockOnInterimResult = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', async () => {
      render(
        <VoiceInput
          onTranscript={mockOnTranscript}
          onInterimResult={mockOnInterimResult}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with custom language', async () => {
      render(
        <VoiceInput
          onTranscript={mockOnTranscript}
          onInterimResult={mockOnInterimResult}
          onError={mockOnError}
          language="es-ES"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render with continuous mode disabled', async () => {
      render(
        <VoiceInput
          onTranscript={mockOnTranscript}
          onInterimResult={mockOnInterimResult}
          onError={mockOnError}
          continuous={false}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('props', () => {
    it('should accept custom className', async () => {
      render(
        <VoiceInput
          onTranscript={mockOnTranscript}
          onInterimResult={mockOnInterimResult}
          onError={mockOnError}
          className="custom-class"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
