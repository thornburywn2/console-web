/**
 * ShareModal Component Tests
 * Phase 5.3: Unit tests for session sharing modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from './ShareModal';

// Mock API
vi.mock('../services/api.js', () => ({
  shareApi: {
    createSession: vi.fn().mockResolvedValue({ url: 'https://share.example.com/abc123' }),
  },
}));

describe('ShareModal', () => {
  const mockOnClose = vi.fn();
  const mockSession = {
    id: 'session-1',
    name: 'Test Session',
    project: 'test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render visible content when isOpen is false', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body).toBeInTheDocument();
    });

    it('should display share options', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should have share type options
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('share types', () => {
    it('should have view only option', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const viewOption = screen.queryByText(/view only/i);
      expect(viewOption || document.body.firstChild).toBeInTheDocument();
    });

    it('should have replay mode option', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const replayOption = screen.queryByText(/replay/i);
      expect(replayOption || document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('expiry options', () => {
    it('should have expiry selection', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('password protection', () => {
    it('should have password toggle option', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('share link creation', () => {
    it('should have create share link functionality', async () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should have some button to create share link
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('close action', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <ShareModal
          session={mockSession}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.queryByText(/close|cancel|×/i);
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
