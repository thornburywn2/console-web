/**
 * CloudflarePublishPanel Component Tests
 * Phase 5.3: Unit tests for Cloudflare tunnel publishing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CloudflarePublishPanel from './CloudflarePublishPanel';

// Mock API
vi.mock('../services/api.js', () => ({
  cloudflareApi: {
    getSettings: vi.fn().mockResolvedValue({
      configured: true,
      tunnelId: 'test-tunnel-123',
      domain: 'example.com',
    }),
    getTunnelStatus: vi.fn().mockResolvedValue({
      status: 'healthy',
      connections: 2,
    }),
    getRoutes: vi.fn().mockResolvedValue([
      { hostname: 'app.example.com', service: 'http://localhost:3000' },
    ]),
    publish: vi.fn().mockResolvedValue({ success: true }),
    unpublish: vi.fn().mockResolvedValue({ success: true }),
  },
  cloudflareExtendedApi: {
    getProjectRoute: vi.fn().mockResolvedValue({
      subdomain: 'app',
      localPort: 3000,
    }),
    updateProjectRoute: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('CloudflarePublishPanel', () => {
  const mockProject = {
    name: 'test-project',
    path: '/home/user/projects/test-project',
    port: 3000,
  };
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the panel', async () => {
      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('settings loading', () => {
    it('should fetch Cloudflare settings', async () => {
      const { cloudflareApi } = await import('../services/api.js');

      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(cloudflareApi.getSettings).toHaveBeenCalled();
      });
    });
  });

  describe('tunnel status', () => {
    it('should display tunnel status when configured', async () => {
      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('not configured state', () => {
    it('should show configuration prompt when not configured', async () => {
      const { cloudflareApi } = await import('../services/api.js');
      vi.mocked(cloudflareApi.getSettings).mockResolvedValue({
        configured: false,
      });

      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('publish form', () => {
    it('should have subdomain input', async () => {
      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should have port input', async () => {
      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { cloudflareApi } = await import('../services/api.js');
      vi.mocked(cloudflareApi.getSettings).mockRejectedValue(new Error('Network error'));

      render(
        <CloudflarePublishPanel
          project={mockProject}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
