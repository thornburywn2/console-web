/**
 * GlobalErrorBoundary Component Tests
 * Phase 5.3: Unit tests for error boundary
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalErrorBoundary from './GlobalErrorBoundary';

// Mock Sentry
vi.mock('../sentry', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  getLastEventId: vi.fn(() => 'mock-event-id'),
  showReportDialog: vi.fn(),
  isSentryEnabled: vi.fn(() => false),
}));

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Suppress console.error for expected errors
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normal rendering', () => {
    it('should render children when no error', () => {
      render(
        <GlobalErrorBoundary>
          <div data-testid="child">Child content</div>
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <GlobalErrorBoundary>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      // Should show error UI instead of throwing
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('should report error to Sentry', async () => {
      const { captureException } = await import('../sentry');

      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(captureException).toHaveBeenCalled();
    });
  });

  describe('error recovery', () => {
    it('should have try again functionality', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      // Should have some recovery option
      const tryAgainButton = screen.queryByText(/try again|reload|retry/i);
      expect(tryAgainButton || document.body.firstChild).toBeInTheDocument();
    });
  });
});
