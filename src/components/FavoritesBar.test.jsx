/**
 * FavoritesBar Component Tests
 * Phase 5.3: Unit tests for favorites bar and widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FavoritesBar, { FavoritesWidget } from './FavoritesBar';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    reset: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock window.open
const mockOpen = vi.fn();
Object.defineProperty(window, 'open', { value: mockOpen });

describe('FavoritesBar', () => {
  const mockOnOpenProject = vi.fn();
  const mockOnOpenSession = vi.fn();
  const mockOnRunCommand = vi.fn();
  const mockOnOpenUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('should show "Add your first favorite" when no favorites', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      expect(screen.getByText('Add your first favorite')).toBeInTheDocument();
    });

    it('should open add modal when "Add your first favorite" clicked', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Add your first favorite'));

      expect(screen.getByRole('heading', { name: 'Add Favorite' })).toBeInTheDocument();
    });
  });

  describe('with favorites', () => {
    const mockFavorites = [
      { id: 1, type: 'project', name: 'My Project', value: '/path/to/project' },
      { id: 2, type: 'session', name: 'Dev Session', value: 'session-123' },
      { id: 3, type: 'command', name: 'Run Dev', value: 'npm run dev' },
    ];

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFavorites));
    });

    it('should render favorite items', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      expect(screen.getByText('My Project')).toBeInTheDocument();
      expect(screen.getByText('Dev Session')).toBeInTheDocument();
      expect(screen.getByText('Run Dev')).toBeInTheDocument();
    });

    it('should render Add button', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should call onOpenProject when project favorite clicked', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('My Project'));

      expect(mockOnOpenProject).toHaveBeenCalledWith('/path/to/project');
    });

    it('should call onOpenSession when session favorite clicked', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Dev Session'));

      expect(mockOnOpenSession).toHaveBeenCalledWith('session-123');
    });

    it('should call onRunCommand when command favorite clicked', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Run Dev'));

      expect(mockOnRunCommand).toHaveBeenCalledWith('npm run dev');
    });

    it('should open URL in new tab when url favorite clicked', () => {
      const favoritesWithUrl = [
        { id: 1, type: 'url', name: 'GitHub', value: 'https://github.com' },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(favoritesWithUrl));

      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('GitHub'));

      expect(mockOpen).toHaveBeenCalledWith('https://github.com', '_blank');
    });
  });

  describe('add favorite modal', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(null);
    });

    it('should render modal content', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Add your first favorite'));

      expect(screen.getByRole('heading', { name: 'Add Favorite' })).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Display name')).toBeInTheDocument();
    });

    it('should show all type options', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Add your first favorite'));

      expect(screen.getByText('project')).toBeInTheDocument();
      expect(screen.getByText('session')).toBeInTheDocument();
      expect(screen.getByText('command')).toBeInTheDocument();
      expect(screen.getByText('prompt')).toBeInTheDocument();
      expect(screen.getByText('url')).toBeInTheDocument();
    });

    it('should close modal when Cancel clicked', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Add your first favorite'));
      // Modal header shows "Add Favorite" title
      expect(screen.getByRole('heading', { name: 'Add Favorite' })).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      // Modal should close, showing empty state again
      expect(screen.queryByRole('heading', { name: 'Add Favorite' })).not.toBeInTheDocument();
    });

    it('should change input label based on type selection', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Add your first favorite'));

      // Select URL type
      fireEvent.click(screen.getByText('url'));
      expect(screen.getByText('URL')).toBeInTheDocument();

      // Select command type
      fireEvent.click(screen.getByText('command'));
      expect(screen.getByText('Command')).toBeInTheDocument();
    });

    it('should add favorite and save to localStorage', () => {
      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      fireEvent.click(screen.getByText('Add your first favorite'));

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Display name'), {
        target: { value: 'New Project' },
      });
      fireEvent.change(screen.getByPlaceholderText('Value'), {
        target: { value: '/projects/new' },
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Add Favorite' }));

      // Should have saved to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('remove favorite', () => {
    it('should remove favorite when X button clicked', () => {
      const mockFavorites = [
        { id: 1, type: 'project', name: 'Test Project', value: '/test' },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFavorites));

      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      // The remove button is inside the favorite item
      const removeButton = document.querySelector('button svg path[d*="M6 18L18 6"]');
      expect(removeButton).toBeInTheDocument();

      fireEvent.click(removeButton.closest('button'));

      // Should update localStorage with empty array
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'favorites-bar',
        '[]'
      );
    });
  });

  describe('localStorage integration', () => {
    it('should load favorites from localStorage on mount', () => {
      const mockFavorites = [{ id: 1, type: 'project', name: 'Loaded', value: '/loaded' }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFavorites));

      render(
        <FavoritesBar
          onOpenProject={mockOnOpenProject}
          onOpenSession={mockOnOpenSession}
          onRunCommand={mockOnRunCommand}
          onOpenUrl={mockOnOpenUrl}
        />
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('favorites-bar');
      expect(screen.getByText('Loaded')).toBeInTheDocument();
    });
  });
});

describe('FavoritesWidget', () => {
  const mockOnOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no favorites', () => {
    const { container } = render(<FavoritesWidget favorites={[]} onOpen={mockOnOpen} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render favorites', () => {
    const favorites = [
      { id: 1, type: 'project', name: 'Widget Project', value: '/proj' },
      { id: 2, type: 'session', name: 'Widget Session', value: 'sess-1' },
    ];

    render(<FavoritesWidget favorites={favorites} onOpen={mockOnOpen} />);

    expect(screen.getByText('Widget Project')).toBeInTheDocument();
    expect(screen.getByText('Widget Session')).toBeInTheDocument();
  });

  it('should only show first 5 favorites', () => {
    const favorites = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      type: 'project',
      name: `Project ${i}`,
      value: `/proj${i}`,
    }));

    render(<FavoritesWidget favorites={favorites} onOpen={mockOnOpen} />);

    expect(screen.getByText('Project 0')).toBeInTheDocument();
    expect(screen.getByText('Project 4')).toBeInTheDocument();
    expect(screen.queryByText('Project 5')).not.toBeInTheDocument();
  });

  it('should call onOpen when favorite clicked', () => {
    const favorites = [
      { id: 1, type: 'project', name: 'Click Me', value: '/click' },
    ];

    render(<FavoritesWidget favorites={favorites} onOpen={mockOnOpen} />);

    fireEvent.click(screen.getByText('Click Me'));

    expect(mockOnOpen).toHaveBeenCalledWith(favorites[0]);
  });
});
