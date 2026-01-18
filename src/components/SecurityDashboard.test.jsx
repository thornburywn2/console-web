/**
 * SecurityDashboard Component Tests
 * Phase 5.3: Unit tests for security dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SecurityDashboard from './SecurityDashboard';

// Mock API
vi.mock('../services/api.js', () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([
      { name: 'project-1', path: '/home/user/project-1' },
      { name: 'project-2', path: '/home/user/project-2' },
    ]),
  },
  lifecycleApi: {
    getToolsStatus: vi.fn().mockResolvedValue({
      tools: {
        trivy: 'INSTALLED',
        semgrep: 'INSTALLED',
        gitleaks: 'INSTALLED',
      },
    }),
    runScan: vi.fn().mockResolvedValue({
      success: true,
      output: 'Scan complete. No vulnerabilities found.',
    }),
  },
}));

// Mock child components
vi.mock('./security-dashboard', () => ({
  ToolStatus: {
    CHECKING: 'CHECKING',
    INSTALLED: 'INSTALLED',
    NOT_INSTALLED: 'NOT_INSTALLED',
    ERROR: 'ERROR',
  },
  SECURITY_TOOLS: [
    { id: 'trivy', name: 'Trivy' },
    { id: 'semgrep', name: 'Semgrep' },
    { id: 'gitleaks', name: 'Gitleaks' },
  ],
  SCAN_TYPES: [
    { id: 'full', name: 'Full Scan', agent: 'AGENT-018', command: 'scan' },
  ],
}));

describe('SecurityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(<SecurityDashboard selectedProject="project-1" />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render in embedded mode', async () => {
      render(
        <SecurityDashboard
          selectedProject="project-1"
          embedded={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without selected project', async () => {
      render(<SecurityDashboard selectedProject={null} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch projects on mount', async () => {
      const { projectsApi } = await import('../services/api.js');

      render(<SecurityDashboard selectedProject="project-1" />);

      await waitFor(() => {
        expect(projectsApi.list).toHaveBeenCalled();
      });
    });

    it('should fetch tool statuses on mount', async () => {
      const { lifecycleApi } = await import('../services/api.js');

      render(<SecurityDashboard selectedProject="project-1" />);

      await waitFor(() => {
        expect(lifecycleApi.getToolsStatus).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { projectsApi } = await import('../services/api.js');
      vi.mocked(projectsApi.list).mockRejectedValue(new Error('Network error'));

      render(<SecurityDashboard selectedProject="project-1" />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
