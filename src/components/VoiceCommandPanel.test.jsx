/**
 * VoiceCommandPanel Component Tests
 * Phase 5.3: Unit tests for voice command panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { VoiceCommandPanel } from './VoiceCommandPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  voiceApi: {
    getSettings: vi.fn().mockResolvedValue({
      enabled: true,
      language: 'en-US',
      continuous: false,
    }),
    getHistory: vi.fn().mockResolvedValue([]),
  },
}));

// Mock hooks
vi.mock('../hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: false,
    transcript: '',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    error: null,
  }),
  checkVoiceSupport: () => ({ supported: true, reasons: [] }),
}));

vi.mock('../hooks/useVoiceFeedback', () => ({
  useVoiceFeedback: () => ({
    isEnabled: true,
    setIsEnabled: vi.fn(),
    onStartListening: vi.fn(),
    onStopListening: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }),
}));

vi.mock('../hooks/useVoiceActivityDetection.jsx', () => ({
  useVoiceActivityDetection: () => ({
    isActive: false,
    volume: 0,
  }),
}));

// Mock child components
vi.mock('./VoiceDisambiguationDialog', () => ({
  VoiceDisambiguationDialog: () => <div data-testid="disambiguation-dialog">Dialog</div>,
}));

vi.mock('./voice-command', () => ({
  VoiceSettingsPanel: () => <div data-testid="settings-panel">Settings</div>,
  VoiceHistoryPanel: () => <div data-testid="history-panel">History</div>,
  AudioVisualization: () => <div data-testid="audio-viz">Audio Viz</div>,
  CommandConfirmation: () => <div data-testid="command-confirm">Confirm</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mic: () => <span>Mic</span>,
  MicOff: () => <span>MicOff</span>,
  Settings: () => <span>Settings</span>,
  History: () => <span>History</span>,
  ChevronUp: () => <span>ChevronUp</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Wand2: () => <span>Wand2</span>,
}));

describe('VoiceCommandPanel', () => {
  const mockOnCommand = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnToggleCollapse = vi.fn();
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the panel', async () => {
      render(
        <VoiceCommandPanel
          sessionId="session-1"
          socket={mockSocket}
          isConnected={true}
          onCommand={mockOnCommand}
          onNavigate={mockOnNavigate}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render in collapsed mode', async () => {
      render(
        <VoiceCommandPanel
          sessionId="session-1"
          socket={mockSocket}
          isConnected={true}
          onCommand={mockOnCommand}
          onNavigate={mockOnNavigate}
          collapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(
        <VoiceCommandPanel
          sessionId="session-1"
          socket={null}
          isConnected={false}
          onCommand={mockOnCommand}
          onNavigate={mockOnNavigate}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
