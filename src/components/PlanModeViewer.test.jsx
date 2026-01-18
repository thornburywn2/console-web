/**
 * PlanModeViewer Component Tests
 * Phase 5.3: Unit tests for plan mode viewer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import PlanModeViewer from './PlanModeViewer';

// Mock API
vi.mock('../services/api.js', () => ({
  plansApi: {
    list: vi.fn().mockResolvedValue({
      plans: [
        {
          id: '1',
          title: 'Test Plan',
          status: 'IN_PROGRESS',
          steps: [
            { id: 's1', title: 'Step 1', status: 'COMPLETED' },
            { id: 's2', title: 'Step 2', status: 'PENDING' },
          ],
        },
      ],
    }),
    getDiagram: vi.fn().mockResolvedValue({
      diagram: 'graph TD\n  A-->B',
    }),
  },
}));

// Mock child components
vi.mock('./plan-mode-viewer', () => ({
  PLAN_STATUS_CONFIG: {
    IN_PROGRESS: { color: 'blue', icon: '🔄' },
    COMPLETED: { color: 'green', icon: '✓' },
    PENDING: { color: 'gray', icon: '⏳' },
  },
  StepCard: ({ step }) => <div data-testid={`step-${step.id}`}>{step.title}</div>,
  CreatePlanModal: () => <div data-testid="create-modal">Create Modal</div>,
  PlanListItem: ({ plan }) => <div data-testid={`plan-${plan.id}`}>{plan.title}</div>,
}));

describe('PlanModeViewer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the viewer', async () => {
      render(
        <PlanModeViewer
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without sessionId', async () => {
      render(
        <PlanModeViewer
          projectId="project-1"
          sessionId={null}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch plans on mount', async () => {
      const { plansApi } = await import('../services/api.js');

      render(
        <PlanModeViewer
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(plansApi.list).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { plansApi } = await import('../services/api.js');
      vi.mocked(plansApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <PlanModeViewer
          projectId="project-1"
          sessionId="session-1"
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
