/**
 * SetupWizard Component Tests
 * Phase 5.3: Unit tests for setup wizard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SetupWizard from './SetupWizard';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock child components
vi.mock('./setup-wizard', () => ({
  STORAGE_KEY: 'cw-setup-complete',
  FEATURES_KEY: 'cw-features',
  WIDGET_PRESET_KEY: 'cw-widget-preset',
  FEATURES: {
    terminal: { id: 'terminal', name: 'Terminal', defaultEnabled: true },
    docker: { id: 'docker', name: 'Docker', defaultEnabled: true },
    git: { id: 'git', name: 'Git', defaultEnabled: true },
  },
  WIDGET_PRESETS: {
    devops: { id: 'devops', name: 'DevOps' },
    minimal: { id: 'minimal', name: 'Minimal' },
  },
  THEMES: [
    { id: 'default', name: 'Default' },
    { id: 'dark', name: 'Dark' },
  ],
  StepIndicator: ({ steps, currentStep }) => (
    <div data-testid="step-indicator">Step {currentStep + 1} of {steps.length}</div>
  ),
  FeatureCard: ({ feature, enabled, onToggle }) => (
    <button data-testid={`feature-${feature.id}`} onClick={onToggle}>
      {feature.name}: {enabled ? 'On' : 'Off'}
    </button>
  ),
  PresetCard: ({ preset, selected, onSelect }) => (
    <button data-testid={`preset-${preset.id}`} onClick={onSelect}>
      {preset.name}
    </button>
  ),
  ThemeCard: ({ theme, selected, onSelect }) => (
    <button data-testid={`theme-${theme.id}`} onClick={onSelect}>
      {theme.name}
    </button>
  ),
}));

describe('SetupWizard', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('rendering', () => {
    it('should render the wizard', async () => {
      render(
        <SetupWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render step indicator', async () => {
      render(
        <SetupWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should start at step 0', () => {
      render(
        <SetupWizard
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 1');
    });
  });
});
