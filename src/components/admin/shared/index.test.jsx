/**
 * Admin Shared Components Tests
 * Phase 5.3: Unit tests for shared admin components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabButton } from './TabButton';
import { SubTabBar } from './SubTabBar';
import { TabContainer } from './TabContainer';
import { ErrorBoundary, TabErrorFallback } from './ErrorBoundary';

describe('TabButton', () => {
  const mockSetActiveTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with label', () => {
    render(
      <TabButton
        tab="projects"
        label="PROJECTS"
        activeTab="projects"
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(screen.getByText('PROJECTS')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <TabButton
        tab="projects"
        label="PROJECTS"
        icon="📁"
        activeTab="projects"
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(screen.getByText('📁')).toBeInTheDocument();
  });

  it('should apply active styles when tab matches activeTab', () => {
    render(
      <TabButton
        tab="projects"
        label="PROJECTS"
        activeTab="projects"
        setActiveTab={mockSetActiveTab}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-hacker-green');
    expect(button).toHaveClass('border-hacker-green');
  });

  it('should apply inactive styles when tab does not match', () => {
    render(
      <TabButton
        tab="projects"
        label="PROJECTS"
        activeTab="settings"
        setActiveTab={mockSetActiveTab}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-hacker-text-dim');
    expect(button).toHaveClass('border-transparent');
  });

  it('should call setActiveTab when clicked', () => {
    render(
      <TabButton
        tab="projects"
        label="PROJECTS"
        activeTab="settings"
        setActiveTab={mockSetActiveTab}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockSetActiveTab).toHaveBeenCalledWith('projects');
  });
});

describe('SubTabBar', () => {
  const mockSetActiveTab = vi.fn();
  const mockOnRefresh = vi.fn();

  const defaultTabs = [
    { key: 'overview', label: 'OVERVIEW', color: 'green' },
    { key: 'services', label: 'SERVICES', color: 'cyan' },
    { key: 'docker', label: 'DOCKER', color: 'purple' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all tabs', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(screen.getByText('OVERVIEW')).toBeInTheDocument();
    expect(screen.getByText('SERVICES')).toBeInTheDocument();
    expect(screen.getByText('DOCKER')).toBeInTheDocument();
  });

  it('should apply active styles to selected tab', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="services"
        setActiveTab={mockSetActiveTab}
      />
    );

    const servicesBtn = screen.getByText('SERVICES');
    expect(servicesBtn).toHaveClass('bg-hacker-cyan/20');
  });

  it('should call setActiveTab when tab clicked', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
      />
    );

    fireEvent.click(screen.getByText('DOCKER'));

    expect(mockSetActiveTab).toHaveBeenCalledWith('docker');
  });

  it('should render dividers at specified indices', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
        dividers={[1]}
      />
    );

    // Divider should appear after first tab
    expect(screen.getByText('|')).toBeInTheDocument();
  });

  it('should render badge when tab has badge value', () => {
    const tabsWithBadge = [
      { key: 'alerts', label: 'ALERTS', badge: 5 },
    ];

    render(
      <SubTabBar
        tabs={tabsWithBadge}
        activeTab="alerts"
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should not render badge when badge is 0', () => {
    const tabsWithZeroBadge = [
      { key: 'alerts', label: 'ALERTS', badge: 0 },
    ];

    render(
      <SubTabBar
        tabs={tabsWithZeroBadge}
        activeTab="alerts"
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should render refresh button when onRefresh provided', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('[REFRESH]')).toBeInTheDocument();
  });

  it('should not render refresh button when onRefresh not provided', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
      />
    );

    expect(screen.queryByText('[REFRESH]')).not.toBeInTheDocument();
  });

  it('should show loading state on refresh button', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
        onRefresh={mockOnRefresh}
        loading={true}
      />
    );

    expect(screen.getByText('[LOADING...]')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button clicked', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="overview"
        setActiveTab={mockSetActiveTab}
        onRefresh={mockOnRefresh}
      />
    );

    fireEvent.click(screen.getByText('[REFRESH]'));

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should use default green color when color not specified', () => {
    const tabsNoColor = [{ key: 'test', label: 'TEST' }];

    render(
      <SubTabBar
        tabs={tabsNoColor}
        activeTab="test"
        setActiveTab={mockSetActiveTab}
      />
    );

    const button = screen.getByText('TEST');
    expect(button).toHaveClass('bg-hacker-green/20');
  });
});

describe('TabContainer', () => {
  it('should render children', () => {
    render(
      <TabContainer>
        <div>Child content</div>
      </TabContainer>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should apply default classes', () => {
    render(
      <TabContainer>
        <div>Content</div>
      </TabContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('space-y-6');
    expect(container).toHaveClass('animate-fade-in');
  });

  it('should apply additional className', () => {
    render(
      <TabContainer className="custom-class">
        <div>Content</div>
      </TabContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});

describe('TabErrorFallback', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.reload
    delete window.location;
    window.location = { reload: vi.fn() };
  });

  it('should render error message', () => {
    render(
      <TabErrorFallback
        error={new Error('Test error message')}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render default tab name', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Component Failed to Load')).toBeInTheDocument();
  });

  it('should render custom tab name', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
        tabName="Docker Panel"
      />
    );

    expect(screen.getByText('Docker Panel Failed to Load')).toBeInTheDocument();
  });

  it('should render retry button', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('[RETRY]')).toBeInTheDocument();
  });

  it('should render reload button', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('[RELOAD PAGE]')).toBeInTheDocument();
  });

  it('should call onRetry when retry clicked', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText('[RETRY]'));

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('should reload page when reload clicked', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText('[RELOAD PAGE]'));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should render error details section', () => {
    render(
      <TabErrorFallback
        error={new Error('Error')}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('[SHOW ERROR DETAILS]')).toBeInTheDocument();
  });

  it('should handle null error gracefully', () => {
    render(
      <TabErrorFallback
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Normal content</div>;
  };

  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render fallback when error thrown', () => {
    render(
      <ErrorBoundary tabName="Test Tab">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Tab Failed to Load')).toBeInTheDocument();
  });

  it('should display error message in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('should recover when error is fixed and retry clicked', () => {
    // Component that can be toggled between throwing and not throwing
    let shouldThrow = true;
    const ToggleableError = () => {
      if (shouldThrow) {
        throw new Error('Temporary error');
      }
      return <div>Recovery successful</div>;
    };

    render(
      <ErrorBoundary>
        <ToggleableError />
      </ErrorBoundary>
    );

    // Should show error state
    expect(screen.getByText('[RETRY]')).toBeInTheDocument();
    expect(screen.getByText('Temporary error')).toBeInTheDocument();

    // "Fix" the error
    shouldThrow = false;

    // Click retry
    fireEvent.click(screen.getByText('[RETRY]'));

    // Should now show recovered content
    expect(screen.getByText('Recovery successful')).toBeInTheDocument();
    expect(screen.queryByText('[RETRY]')).not.toBeInTheDocument();
  });
});
