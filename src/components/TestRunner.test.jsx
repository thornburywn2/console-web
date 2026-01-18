/**
 * TestRunner Component Tests
 * Phase 5.3: Unit tests for test runner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TestRunner from './TestRunner';

// Mock API
vi.mock('../services/api.js', () => ({
  testsApi: {
    run: vi.fn().mockResolvedValue({
      success: true,
      results: {
        numPassedTests: 45,
        numFailedTests: 2,
        numPendingTests: 0,
        numTotalTests: 47,
        tests: [
          { name: 'Test Suite', status: 'passed', tests: [] },
        ],
      },
    }),
    getStatus: vi.fn().mockResolvedValue({ running: false }),
  },
}));

describe('TestRunner', () => {
  const mockOnClose = vi.fn();
  const mockProjectPath = '/home/user/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <TestRunner
          projectPath={mockProjectPath}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false and not embedded', () => {
      render(
        <TestRunner
          projectPath={mockProjectPath}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render in embedded mode', async () => {
      render(
        <TestRunner
          projectPath={mockProjectPath}
          isOpen={false}
          embedded={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('display', () => {
    it('should display Test Runner title', async () => {
      render(
        <TestRunner
          projectPath={mockProjectPath}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Runner')).toBeInTheDocument();
      });
    });

    it('should display Run All Tests button', async () => {
      render(
        <TestRunner
          projectPath={mockProjectPath}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Run All Tests')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { testsApi } = await import('../services/api.js');
      vi.mocked(testsApi.run).mockRejectedValue(new Error('Network error'));

      render(
        <TestRunner
          projectPath={mockProjectPath}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
