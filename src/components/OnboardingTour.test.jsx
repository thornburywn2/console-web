/**
 * OnboardingTour Component Tests
 * Phase 5.3: Unit tests for onboarding tour
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OnboardingTour from './OnboardingTour';

describe('OnboardingTour', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  const mockSteps = [
    { id: 'step1', title: 'Step 1', content: 'First step', placement: 'center' },
    { id: 'step2', title: 'Step 2', content: 'Second step', placement: 'center' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render by default', () => {
      render(
        <OnboardingTour
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Tour should not be visible without autoStart
      expect(screen.queryByText('Welcome to Console.web')).not.toBeInTheDocument();
    });

    it('should render when autoStart is true', async () => {
      render(
        <OnboardingTour
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          autoStart={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Console.web')).toBeInTheDocument();
      });
    });

    it('should render custom steps when provided', async () => {
      render(
        <OnboardingTour
          steps={mockSteps}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          autoStart={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeInTheDocument();
      });
    });
  });

  describe('display', () => {
    it('should display Next button when active', async () => {
      render(
        <OnboardingTour
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          autoStart={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should display Previous button when active', async () => {
      render(
        <OnboardingTour
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
          autoStart={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
    });
  });
});
