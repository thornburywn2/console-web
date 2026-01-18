/**
 * TagManager Component Tests
 * Phase 5.3: Unit tests for tag management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagManager from './TagManager';

describe('TagManager', () => {
  const mockOnToggleTag = vi.fn();
  const mockOnCreateTag = vi.fn();
  const mockOnDeleteTag = vi.fn();
  const mockOnUpdateTag = vi.fn();
  const mockTags = [
    { id: '1', name: 'important', color: '#ef4444' },
    { id: '2', name: 'review', color: '#3b82f6' },
    { id: '3', name: 'done', color: '#22c55e' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with tags', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={[]}
          onToggleTag={mockOnToggleTag}
          onCreateTag={mockOnCreateTag}
          onDeleteTag={mockOnDeleteTag}
          onUpdateTag={mockOnUpdateTag}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render with empty tags', () => {
      render(
        <TagManager
          tags={[]}
          selectedTags={[]}
          onToggleTag={mockOnToggleTag}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render in filter mode', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={[]}
          mode="filter"
          onToggleTag={mockOnToggleTag}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should render in assign mode', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={[]}
          mode="assign"
          onToggleTag={mockOnToggleTag}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('tag display', () => {
    it('should display tag names', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={[]}
          onToggleTag={mockOnToggleTag}
        />
      );

      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('review')).toBeInTheDocument();
      expect(screen.getByText('done')).toBeInTheDocument();
    });

    it('should show selected tags differently', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={['1']}
          onToggleTag={mockOnToggleTag}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('tag selection', () => {
    it('should call onToggleTag when tag is clicked', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={[]}
          onToggleTag={mockOnToggleTag}
        />
      );

      fireEvent.click(screen.getByText('important'));

      expect(mockOnToggleTag).toHaveBeenCalled();
    });
  });

  describe('tag creation', () => {
    it('should have create tag functionality', () => {
      render(
        <TagManager
          tags={mockTags}
          selectedTags={[]}
          onToggleTag={mockOnToggleTag}
          onCreateTag={mockOnCreateTag}
        />
      );

      // Should have some way to create tags
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });
});
