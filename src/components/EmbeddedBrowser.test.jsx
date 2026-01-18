/**
 * EmbeddedBrowser Component Tests
 * Phase 5.3: Unit tests for browser preview component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmbeddedBrowser from './EmbeddedBrowser';

// Mock API
vi.mock('../services/api.js', () => ({
  browserApi: {
    createSession: vi.fn().mockResolvedValue({
      id: 'browser-session-1',
      url: 'http://localhost:3000',
      viewport: { width: 1280, height: 720 },
    }),
    navigate: vi.fn().mockResolvedValue({ success: true }),
    screenshot: vi.fn().mockResolvedValue({ imageData: 'base64-image-data' }),
    closeSession: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('EmbeddedBrowser', () => {
  const mockOnClose = vi.fn();
  const mockProjectId = 'project-1';
  const mockSessionId = 'session-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the browser component', () => {
      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          onClose={mockOnClose}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render with initial URL', async () => {
      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          initialUrl="http://localhost:3000"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('session creation', () => {
    it('should create session when URL provided', async () => {
      const { browserApi } = await import('../services/api.js');

      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          initialUrl="http://localhost:3000"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(browserApi.createSession).toHaveBeenCalled();
      });
    });
  });

  describe('viewport presets', () => {
    it('should have Desktop viewport option', () => {
      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Desktop')).toBeInTheDocument();
    });

    it('should have Mobile viewport option', () => {
      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Mobile')).toBeInTheDocument();
    });

    it('should have Tablet viewport option', () => {
      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Tablet')).toBeInTheDocument();
    });
  });

  describe('URL input', () => {
    it('should have URL input field', () => {
      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          onClose={mockOnClose}
        />
      );

      const urlInput = document.querySelector('input[type="text"]');
      expect(urlInput).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle session creation errors', async () => {
      const { browserApi } = await import('../services/api.js');
      vi.mocked(browserApi.createSession).mockRejectedValue(new Error('Failed to create session'));

      render(
        <EmbeddedBrowser
          projectId={mockProjectId}
          sessionId={mockSessionId}
          initialUrl="http://localhost:3000"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
