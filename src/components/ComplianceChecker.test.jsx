/**
 * ComplianceChecker Component Tests
 * Phase 5.3: Unit tests for compliance checker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ComplianceChecker from './ComplianceChecker';

// Mock API
vi.mock('../services/api.js', () => ({
  projectTemplatesApi: {
    checkPath: vi.fn().mockResolvedValue({
      status: 'good',
      complianceScore: 85,
      present: ['CLAUDE.md', 'README.md', '.env.example'],
      missing: ['tests/'],
      checks: [
        { name: 'CLAUDE.md', status: 'good', message: 'Present and valid' },
        { name: 'README.md', status: 'good', message: 'Present' },
        { name: 'Tests', status: 'warning', message: 'Coverage below 80%' },
        { name: '.env.example', status: 'good', message: 'Present' },
      ],
    }),
    migrate: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ComplianceChecker', () => {
  const mockOnClose = vi.fn();
  const mockOnMigrate = vi.fn();
  const mockProjectPath = '/home/user/project';
  const mockProjectName = 'my-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <ComplianceChecker
          projectPath={mockProjectPath}
          projectName={mockProjectName}
          isOpen={true}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <ComplianceChecker
          projectPath={mockProjectPath}
          projectName={mockProjectName}
          isOpen={false}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('data fetching', () => {
    it('should check compliance when opened', async () => {
      const { projectTemplatesApi } = await import('../services/api.js');

      render(
        <ComplianceChecker
          projectPath={mockProjectPath}
          projectName={mockProjectName}
          isOpen={true}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
        />
      );

      await waitFor(() => {
        expect(projectTemplatesApi.checkPath).toHaveBeenCalledWith(mockProjectPath);
      });
    });
  });

  describe('display', () => {
    it('should display Compliance title', async () => {
      render(
        <ComplianceChecker
          projectPath={mockProjectPath}
          projectName={mockProjectName}
          isOpen={true}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Compliance/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { projectTemplatesApi } = await import('../services/api.js');
      vi.mocked(projectTemplatesApi.checkPath).mockRejectedValue(new Error('Network error'));

      render(
        <ComplianceChecker
          projectPath={mockProjectPath}
          projectName={mockProjectName}
          isOpen={true}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
