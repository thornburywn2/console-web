/**
 * BulkActionBar Component Tests
 * Phase 5.3: Unit tests for bulk action bar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionBar from './BulkActionBar';

describe('BulkActionBar', () => {
  const mockCallbacks = {
    onPin: vi.fn(),
    onUnpin: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
    onAddTag: vi.fn(),
    onClearSelection: vi.fn(),
  };

  const mockFolders = [
    { id: 'folder-1', name: 'Work', icon: '💼', color: '#3b82f6' },
    { id: 'folder-2', name: 'Personal', icon: '🏠', color: '#10b981' },
  ];

  const mockTags = [
    { id: 'tag-1', name: 'Important', color: '#ef4444' },
    { id: 'tag-2', name: 'Review', color: '#f59e0b' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  describe('visibility', () => {
    it('should return null when selectedCount is 0', () => {
      const { container } = render(
        <BulkActionBar selectedCount={0} {...mockCallbacks} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when selectedCount is greater than 0', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('selected')).toBeInTheDocument();
    });
  });

  describe('selection count', () => {
    it('should display the correct selection count', () => {
      render(
        <BulkActionBar selectedCount={5} {...mockCallbacks} />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should update when count changes', () => {
      const { rerender } = render(
        <BulkActionBar selectedCount={2} {...mockCallbacks} />
      );

      expect(screen.getByText('2')).toBeInTheDocument();

      rerender(<BulkActionBar selectedCount={10} {...mockCallbacks} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should call onPin when Pin button is clicked', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Pin selected'));

      expect(mockCallbacks.onPin).toHaveBeenCalled();
    });

    it('should call onUnpin when Unpin button is clicked', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Unpin selected'));

      expect(mockCallbacks.onUnpin).toHaveBeenCalled();
    });

    it('should call onArchive when Archive button is clicked', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Archive selected'));

      expect(mockCallbacks.onArchive).toHaveBeenCalled();
    });

    it('should call onClearSelection when clear button is clicked', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Clear selection'));

      expect(mockCallbacks.onClearSelection).toHaveBeenCalled();
    });
  });

  describe('delete functionality', () => {
    it('should show confirmation before deleting', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Delete selected'));

      expect(window.confirm).toHaveBeenCalledWith('Delete 3 sessions? This cannot be undone.');
    });

    it('should show singular confirmation for one session', () => {
      render(
        <BulkActionBar selectedCount={1} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Delete selected'));

      expect(window.confirm).toHaveBeenCalledWith('Delete 1 session? This cannot be undone.');
    });

    it('should call onDelete after confirmation', () => {
      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Delete selected'));

      expect(mockCallbacks.onDelete).toHaveBeenCalled();
    });

    it('should not call onDelete if confirmation is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <BulkActionBar selectedCount={3} {...mockCallbacks} />
      );

      fireEvent.click(screen.getByTitle('Delete selected'));

      expect(mockCallbacks.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('move to folder menu', () => {
    it('should toggle move menu when Move button is clicked', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
        />
      );

      // Menu should not be visible initially
      expect(screen.queryByText(/Root \(No folder\)/)).not.toBeInTheDocument();

      // Click to open menu
      fireEvent.click(screen.getByTitle('Move to folder'));

      expect(screen.getByText(/Root \(No folder\)/)).toBeInTheDocument();
    });

    it('should display all folders in the menu', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
        />
      );

      fireEvent.click(screen.getByTitle('Move to folder'));

      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('should call onMove with null when Root is selected', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
        />
      );

      fireEvent.click(screen.getByTitle('Move to folder'));
      fireEvent.click(screen.getByText(/Root \(No folder\)/));

      expect(mockCallbacks.onMove).toHaveBeenCalledWith(null);
    });

    it('should call onMove with folder id when folder is selected', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
        />
      );

      fireEvent.click(screen.getByTitle('Move to folder'));
      fireEvent.click(screen.getByText('Work'));

      expect(mockCallbacks.onMove).toHaveBeenCalledWith('folder-1');
    });

    it('should close menu after selection', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
        />
      );

      fireEvent.click(screen.getByTitle('Move to folder'));
      fireEvent.click(screen.getByText('Work'));

      expect(screen.queryByText(/Root \(No folder\)/)).not.toBeInTheDocument();
    });

    it('should show "No folders" when folders array is empty', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={[]}
        />
      );

      fireEvent.click(screen.getByTitle('Move to folder'));

      expect(screen.getByText('No folders')).toBeInTheDocument();
    });
  });

  describe('add tag menu', () => {
    it('should toggle tag menu when Tag button is clicked', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          tags={mockTags}
        />
      );

      // Menu should not be visible initially
      expect(screen.queryByText('Important')).not.toBeInTheDocument();

      // Click to open menu
      fireEvent.click(screen.getByTitle('Add tag'));

      expect(screen.getByText('Important')).toBeInTheDocument();
    });

    it('should display all tags in the menu', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          tags={mockTags}
        />
      );

      fireEvent.click(screen.getByTitle('Add tag'));

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should call onAddTag with tag id when tag is selected', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          tags={mockTags}
        />
      );

      fireEvent.click(screen.getByTitle('Add tag'));
      fireEvent.click(screen.getByText('Important'));

      expect(mockCallbacks.onAddTag).toHaveBeenCalledWith('tag-1');
    });

    it('should close menu after selection', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          tags={mockTags}
        />
      );

      fireEvent.click(screen.getByTitle('Add tag'));
      fireEvent.click(screen.getByText('Important'));

      expect(screen.queryByText('Review')).not.toBeInTheDocument();
    });

    it('should show "No tags" when tags array is empty', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          tags={[]}
        />
      );

      fireEvent.click(screen.getByTitle('Add tag'));

      expect(screen.getByText('No tags')).toBeInTheDocument();
    });
  });

  describe('menu interaction', () => {
    it('should close tag menu when move menu is opened', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
          tags={mockTags}
        />
      );

      // Open tag menu
      fireEvent.click(screen.getByTitle('Add tag'));
      expect(screen.getByText('Important')).toBeInTheDocument();

      // Open move menu should close tag menu
      fireEvent.click(screen.getByTitle('Move to folder'));
      expect(screen.queryByText('Important')).not.toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should close move menu when tag menu is opened', () => {
      render(
        <BulkActionBar
          selectedCount={3}
          {...mockCallbacks}
          folders={mockFolders}
          tags={mockTags}
        />
      );

      // Open move menu
      fireEvent.click(screen.getByTitle('Move to folder'));
      expect(screen.getByText('Work')).toBeInTheDocument();

      // Open tag menu should close move menu
      fireEvent.click(screen.getByTitle('Add tag'));
      expect(screen.queryByText('Work')).not.toBeInTheDocument();
      expect(screen.getByText('Important')).toBeInTheDocument();
    });
  });
});
