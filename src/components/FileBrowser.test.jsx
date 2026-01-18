/**
 * FileBrowser Component Tests
 * Phase 5.3: Unit tests for file browser
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FileBrowser from './FileBrowser';

// Mock API
vi.mock('../services/api.js', () => ({
  filesApi: {
    list: vi.fn().mockResolvedValue([
      { name: 'src', path: '/project/src', isDirectory: true, children: [] },
      { name: 'package.json', path: '/project/package.json', isDirectory: false },
      { name: 'README.md', path: '/project/README.md', isDirectory: false },
    ]),
  },
}));

describe('FileBrowser', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectFile = vi.fn();
  const mockProjectPath = '/home/user/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <FileBrowser
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false and not embedded', () => {
      render(
        <FileBrowser
          isOpen={false}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render in embedded mode', async () => {
      render(
        <FileBrowser
          isOpen={false}
          embedded={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('file fetching', () => {
    it('should fetch files when opened', async () => {
      const { filesApi } = await import('../services/api.js');

      render(
        <FileBrowser
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      await waitFor(() => {
        expect(filesApi.list).toHaveBeenCalledWith(mockProjectPath);
      });
    });
  });

  describe('file display', () => {
    it('should display Files title', async () => {
      render(
        <FileBrowser
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Files')).toBeInTheDocument();
      });
    });

    it('should have search input', async () => {
      render(
        <FileBrowser
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search files/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { filesApi } = await import('../services/api.js');
      vi.mocked(filesApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <FileBrowser
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
          onSelectFile={mockOnSelectFile}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
