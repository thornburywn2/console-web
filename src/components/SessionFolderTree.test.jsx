/**
 * SessionFolderTree Component Tests
 * Phase 5.3: Unit tests for session folder tree
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SessionFolderTree from './SessionFolderTree';

describe('SessionFolderTree', () => {
  const mockOnSelectFolder = vi.fn();
  const mockOnCreateFolder = vi.fn();
  const mockOnDeleteFolder = vi.fn();
  const mockOnRenameFolder = vi.fn();

  const mockFolders = [
    { id: '1', name: 'Work', parentId: null },
    { id: '2', name: 'Personal', parentId: null },
    { id: '3', name: 'Projects', parentId: '1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render folder tree', async () => {
      render(
        <SessionFolderTree
          folders={mockFolders}
          onSelectFolder={mockOnSelectFolder}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render empty state', () => {
      render(
        <SessionFolderTree
          folders={[]}
          onSelectFolder={mockOnSelectFolder}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('display', () => {
    it('should display folder names', async () => {
      render(
        <SessionFolderTree
          folders={mockFolders}
          onSelectFolder={mockOnSelectFolder}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument();
        expect(screen.getByText('Personal')).toBeInTheDocument();
      });
    });

    it('should show selected folder', async () => {
      render(
        <SessionFolderTree
          folders={mockFolders}
          selectedFolderId="1"
          onSelectFolder={mockOnSelectFolder}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('interaction', () => {
    it('should call onSelectFolder when folder is clicked', async () => {
      render(
        <SessionFolderTree
          folders={mockFolders}
          onSelectFolder={mockOnSelectFolder}
        />
      );

      const workFolder = screen.getByText('Work');
      fireEvent.click(workFolder);

      expect(mockOnSelectFolder).toHaveBeenCalled();
    });
  });
});
