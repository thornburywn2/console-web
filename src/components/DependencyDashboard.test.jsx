/**
 * DependencyDashboard Component Tests
 * Phase 5.3: Unit tests for dependency dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DependencyDashboard from './DependencyDashboard';

// Mock API
vi.mock('../services/api.js', () => ({
  dependenciesApi: {
    list: vi.fn().mockResolvedValue({
      packages: [
        { name: 'react', current: '18.0.0', latest: '18.2.0', updateType: 'minor', isDev: false, vulnerabilities: 0 },
        { name: 'typescript', current: '5.0.0', latest: '5.0.0', updateType: null, isDev: true, vulnerabilities: 0 },
        { name: 'lodash', current: '4.17.0', latest: '4.17.21', updateType: 'patch', isDev: false, vulnerabilities: 1 },
      ],
      vulnerabilities: [
        { package: 'lodash', severity: 'moderate', title: 'Prototype Pollution', via: 'lodash', fixAvailable: true },
      ],
    }),
    update: vi.fn().mockResolvedValue({ success: true }),
    updateAll: vi.fn().mockResolvedValue({ success: true }),
    auditFix: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('DependencyDashboard', () => {
  const mockOnClose = vi.fn();
  const mockProjectPath = '/home/user/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <DependencyDashboard
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false and not embedded', () => {
      render(
        <DependencyDashboard
          isOpen={false}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render in embedded mode', async () => {
      render(
        <DependencyDashboard
          isOpen={false}
          embedded={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch dependencies when opened', async () => {
      const { dependenciesApi } = await import('../services/api.js');

      render(
        <DependencyDashboard
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(dependenciesApi.list).toHaveBeenCalledWith(mockProjectPath);
      });
    });
  });

  describe('display', () => {
    it('should display Dependencies title', async () => {
      render(
        <DependencyDashboard
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Dependencies')).toBeInTheDocument();
      });
    });

    it('should display Packages tab', async () => {
      render(
        <DependencyDashboard
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Packages')).toBeInTheDocument();
      });
    });

    it('should display Vulnerabilities tab', async () => {
      render(
        <DependencyDashboard
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Vulnerabilities/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { dependenciesApi } = await import('../services/api.js');
      vi.mocked(dependenciesApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <DependencyDashboard
          isOpen={true}
          onClose={mockOnClose}
          projectPath={mockProjectPath}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
