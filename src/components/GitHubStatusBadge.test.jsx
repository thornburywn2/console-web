/**
 * GitHubStatusBadge Component Tests
 * Phase 5.3: Unit tests for GitHub sync status badge
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GitHubStatusBadge, { GitHubStatusDot } from './GitHubStatusBadge';

describe('GitHubStatusBadge', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('status rendering', () => {
    it('should render synced status with correct title', () => {
      render(<GitHubStatusBadge status="synced" onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Synced with GitHub');
    });

    it('should render ahead status with commit count', () => {
      render(<GitHubStatusBadge status="ahead" aheadBy={3} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', '3 commits ahead');
    });

    it('should render ahead status with singular commit', () => {
      render(<GitHubStatusBadge status="ahead" aheadBy={1} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', '1 commit ahead');
    });

    it('should render behind status with commit count', () => {
      render(<GitHubStatusBadge status="behind" behindBy={5} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', '5 commits behind');
    });

    it('should render behind status with singular commit', () => {
      render(<GitHubStatusBadge status="behind" behindBy={1} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', '1 commit behind');
    });

    it('should render diverged status with ahead and behind counts', () => {
      render(<GitHubStatusBadge status="diverged" aheadBy={2} behindBy={3} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', '2 ahead, 3 behind');
    });

    it('should render error status', () => {
      render(<GitHubStatusBadge status="error" onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Sync error');
    });

    it('should render unknown status for invalid status', () => {
      render(<GitHubStatusBadge status="invalid" onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Unknown status');
    });
  });

  describe('count badge', () => {
    it('should show count badge for ahead status', () => {
      const { container } = render(<GitHubStatusBadge status="ahead" aheadBy={3} onClick={mockOnClick} />);

      const badge = container.querySelector('.rounded-full');
      expect(badge).toBeInTheDocument();
    });

    it('should show count badge for behind status', () => {
      const { container } = render(<GitHubStatusBadge status="behind" behindBy={2} onClick={mockOnClick} />);

      const badge = container.querySelector('.rounded-full');
      expect(badge).toBeInTheDocument();
    });

    it('should show count badge for diverged status', () => {
      const { container } = render(<GitHubStatusBadge status="diverged" aheadBy={1} behindBy={1} onClick={mockOnClick} />);

      const badge = container.querySelector('.rounded-full');
      expect(badge).toBeInTheDocument();
    });

    it('should not show count badge for synced status', () => {
      const { container } = render(<GitHubStatusBadge status="synced" onClick={mockOnClick} />);

      // Only the SVG circle should be present, not an extra badge
      const badges = container.querySelectorAll('span.rounded-full');
      expect(badges.length).toBe(0);
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      render(<GitHubStatusBadge status="synced" onClick={mockOnClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('should render GitHub icon', () => {
      const { container } = render(<GitHubStatusBadge status="synced" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Check for GitHub path
      const path = svg.querySelector('path');
      expect(path).toBeInTheDocument();
    });

    it('should use green color for synced status', () => {
      const { container } = render(<GitHubStatusBadge status="synced" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#22c55e');
    });

    it('should use amber color for ahead status', () => {
      const { container } = render(<GitHubStatusBadge status="ahead" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#f59e0b');
    });

    it('should use orange color for behind status', () => {
      const { container } = render(<GitHubStatusBadge status="behind" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#f97316');
    });

    it('should use red color for diverged status', () => {
      const { container } = render(<GitHubStatusBadge status="diverged" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#ef4444');
    });

    it('should use red color for error status', () => {
      const { container } = render(<GitHubStatusBadge status="error" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#ef4444');
    });

    it('should use gray color for unknown status', () => {
      const { container } = render(<GitHubStatusBadge status="unknown" onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#6b7280');
    });
  });
});

describe('GitHubStatusDot', () => {
  it('should render with correct title for synced', () => {
    render(<GitHubStatusDot status="synced" />);

    const dot = screen.getByTitle('Synced with GitHub');
    expect(dot).toBeInTheDocument();
  });

  it('should render with correct title for ahead', () => {
    render(<GitHubStatusDot status="ahead" />);

    const dot = screen.getByTitle('Local commits to push');
    expect(dot).toBeInTheDocument();
  });

  it('should render with correct title for behind', () => {
    render(<GitHubStatusDot status="behind" />);

    const dot = screen.getByTitle('Remote commits to pull');
    expect(dot).toBeInTheDocument();
  });

  it('should render with correct title for diverged', () => {
    render(<GitHubStatusDot status="diverged" />);

    const dot = screen.getByTitle('Diverged from remote');
    expect(dot).toBeInTheDocument();
  });

  it('should render with correct title for error', () => {
    render(<GitHubStatusDot status="error" />);

    const dot = screen.getByTitle('Sync error');
    expect(dot).toBeInTheDocument();
  });

  it('should use green background for synced', () => {
    render(<GitHubStatusDot status="synced" />);

    const dot = screen.getByTitle('Synced with GitHub');
    expect(dot).toHaveStyle({ background: '#22c55e' });
  });

  it('should use gray background for unknown status', () => {
    render(<GitHubStatusDot status="invalid" />);

    const dot = screen.getByTitle('Unknown status');
    expect(dot).toHaveStyle({ background: '#6b7280' });
  });
});
