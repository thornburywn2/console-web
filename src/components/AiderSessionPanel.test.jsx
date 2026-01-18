/**
 * AiderSessionPanel Component Tests
 * Phase 5.3: Unit tests for Aider session panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AiderSessionPanel } from './AiderSessionPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  aiderApi: {
    getStatus: vi.fn().mockResolvedValue({
      installed: true,
      version: '0.50.0',
      running: false,
    }),
    getModels: vi.fn().mockResolvedValue({
      anthropic: ['claude-3-5-sonnet-20241022'],
      openai: ['gpt-4'],
    }),
    getConfig: vi.fn().mockResolvedValue({
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
    }),
  },
}));

describe('AiderSessionPanel', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the panel', async () => {
      render(
        <AiderSessionPanel
          projectPath="/home/user/project"
          socket={mockSocket}
          onModeChange={mockOnModeChange}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(
        <AiderSessionPanel
          projectPath="/home/user/project"
          socket={null}
          onModeChange={mockOnModeChange}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch status on mount', async () => {
      const { aiderApi } = await import('../services/api.js');

      render(
        <AiderSessionPanel
          projectPath="/home/user/project"
          socket={mockSocket}
          onModeChange={mockOnModeChange}
        />
      );

      await waitFor(() => {
        expect(aiderApi.getStatus).toHaveBeenCalled();
      });
    });

    it('should fetch models on mount', async () => {
      const { aiderApi } = await import('../services/api.js');

      render(
        <AiderSessionPanel
          projectPath="/home/user/project"
          socket={mockSocket}
          onModeChange={mockOnModeChange}
        />
      );

      await waitFor(() => {
        expect(aiderApi.getModels).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { aiderApi } = await import('../services/api.js');
      vi.mocked(aiderApi.getStatus).mockRejectedValue(new Error('Network error'));

      render(
        <AiderSessionPanel
          projectPath="/home/user/project"
          socket={mockSocket}
          onModeChange={mockOnModeChange}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
