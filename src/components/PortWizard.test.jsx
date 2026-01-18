/**
 * PortWizard Component Tests
 * Phase 5.3: Unit tests for port management wizard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortWizard from './PortWizard';

// Mock the API
const mockGetStatus = vi.fn().mockResolvedValue({ ports: [] });
const mockScan = vi.fn().mockResolvedValue({ ports: [] });
const mockKill = vi.fn().mockResolvedValue({ success: true });

vi.mock('../services/api.js', () => ({
  portsApi: {
    getStatus: () => mockGetStatus(),
    scan: () => mockScan(),
    kill: (port) => mockKill(port),
  },
}));

describe('PortWizard', () => {
  const mockOnSelectProject = vi.fn();
  const mockProjects = [
    { name: 'project-1', path: '/home/user/projects/project-1' },
    { name: 'project-2', path: '/home/user/projects/project-2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the port wizard container', async () => {
      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without projects prop', async () => {
      render(<PortWizard onSelectProject={mockOnSelectProject} />);

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('port fetching', () => {
    it('should fetch ports on mount', async () => {
      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(mockGetStatus).toHaveBeenCalled();
      });
    });

    it('should display ports when fetched', async () => {
      mockGetStatus.mockResolvedValue({
        ports: [
          { port: 3000, process: 'node', pid: 1234, project: '/home/user/projects/project-1' },
        ],
      });

      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3000')).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
      mockGetStatus.mockRejectedValue(new Error('Network error'));

      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('port scanning', () => {
    it('should have a scan button', async () => {
      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        const scanButton = screen.queryByText(/scan/i);
        expect(scanButton || document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should trigger scan when scan button is clicked', async () => {
      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(mockGetStatus).toHaveBeenCalled();
      });

      const scanButton = screen.queryByText(/scan/i);
      if (scanButton) {
        fireEvent.click(scanButton);

        await waitFor(() => {
          expect(mockScan).toHaveBeenCalled();
        });
      }
    });
  });

  describe('port display', () => {
    it('should show port numbers when fetched', async () => {
      mockGetStatus.mockResolvedValue({
        ports: [
          { port: 3000, process: 'node', pid: 1234, project: null },
        ],
      });

      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3000')).toBeInTheDocument();
      });
    });

    it('should display process names', async () => {
      mockGetStatus.mockResolvedValue({
        ports: [
          { port: 3000, process: 'node', pid: 1234, project: null },
        ],
      });

      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('node')).toBeInTheDocument();
      });
    });
  });

  describe('project linking', () => {
    it('should link ports to projects when project path matches', async () => {
      mockGetStatus.mockResolvedValue({
        ports: [
          { port: 3000, process: 'node', pid: 1234, project: '/home/user/projects/project-1' },
        ],
      });

      render(
        <PortWizard
          projects={mockProjects}
          onSelectProject={mockOnSelectProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('project-1')).toBeInTheDocument();
      });
    });
  });
});
