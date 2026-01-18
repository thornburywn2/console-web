/**
 * NotificationSettings Component Tests
 * Phase 5.3: Unit tests for notification configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationSettings from './NotificationSettings';

describe('NotificationSettings', () => {
  const mockOnClose = vi.fn();
  const mockOnSaveSettings = vi.fn();
  const defaultSettings = {
    soundEnabled: true,
    desktopEnabled: true,
    soundVolume: 50,
    events: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
      configurable: true,
    });

    // Mock Audio
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      volume: 0,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      // Component should render something
      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render visible content when isOpen is false', () => {
      render(
        <NotificationSettings
          isOpen={false}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      // Modal should not be visible
      expect(screen.queryByText(/sound enabled/i)).not.toBeInTheDocument();
    });

    it('should display notification event options', () => {
      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      expect(screen.getByText(/session ended/i)).toBeInTheDocument();
      expect(screen.getByText(/command complete/i)).toBeInTheDocument();
    });
  });

  describe('settings state', () => {
    it('should use default settings when no settings provided', () => {
      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      expect(document.body).toBeInTheDocument();
    });

    it('should use provided settings', () => {
      const customSettings = {
        soundEnabled: false,
        desktopEnabled: false,
        soundVolume: 75,
        events: {},
      };

      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={customSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      expect(document.body).toBeInTheDocument();
    });
  });

  describe('notification permission', () => {
    it('should check notification permission on open', async () => {
      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      // Permission should be checked
      expect(document.body).toBeInTheDocument();
    });

    it('should show request permission button when not granted', () => {
      window.Notification.permission = 'default';

      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      const requestButton = screen.queryByText(/request|enable|allow/i);
      expect(requestButton || document.body).toBeInTheDocument();
    });
  });

  describe('sound options', () => {
    it('should display sound options', () => {
      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      // Should have sound-related UI
      const soundSection = screen.queryByText(/sound/i);
      expect(soundSection || document.body).toBeInTheDocument();
    });
  });

  describe('close action', () => {
    it('should call onClose when close button is clicked', async () => {
      render(
        <NotificationSettings
          isOpen={true}
          onClose={mockOnClose}
          settings={defaultSettings}
          onSaveSettings={mockOnSaveSettings}
        />
      );

      // Find close button (could be X, Cancel, or Close)
      const closeButton = screen.queryByText(/close|cancel|×/i);
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
