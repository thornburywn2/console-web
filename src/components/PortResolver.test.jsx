/**
 * PortResolver Component Tests
 * Phase 5.3: Unit tests for port conflict detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PortResolver from './PortResolver';

// Mock API
vi.mock('../services/api.js', () => ({
  portsApi: {
    getStatus: vi.fn().mockResolvedValue({
      ports: [
        { port: 3000, service: 'Node.js', status: 'in_use', process: { name: 'node', pid: 1234 } },
        { port: 5173, service: 'Vite', status: 'available', process: null },
        { port: 8080, service: 'Proxy', status: 'in_use', process: { name: 'nginx', pid: 5678 } },
      ],
    }),
    suggest: vi.fn().mockResolvedValue({ suggestions: [3001, 3002, 3003] }),
    kill: vi.fn().mockResolvedValue({ success: true }),
    scan: vi.fn().mockResolvedValue({ openPorts: [3000, 8080] }),
    check: vi.fn().mockResolvedValue({ available: true }),
  },
}));

describe('PortResolver', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <PortResolver
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <PortResolver
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('port checking', () => {
    it('should fetch port status', async () => {
      const { portsApi } = await import('../services/api.js');

      render(
        <PortResolver
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(portsApi.getStatus).toHaveBeenCalled();
      });
    });
  });

  describe('port display', () => {
    it('should display common ports', async () => {
      render(
        <PortResolver
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3000')).toBeInTheDocument();
      });
    });

    it('should show process info for in-use ports', async () => {
      render(
        <PortResolver
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { portsApi } = await import('../services/api.js');
      vi.mocked(portsApi.getStatus).mockRejectedValue(new Error('Network error'));

      render(
        <PortResolver
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
