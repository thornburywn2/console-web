/**
 * AgentCard Component Tests
 * Phase 5.3: Unit tests for agent marketplace card
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentCard from './AgentCard';

describe('AgentCard', () => {
  const mockOnSelect = vi.fn();
  const mockOnUninstall = vi.fn();

  const mockCategoryIcon = <svg data-testid="category-icon" />;

  const mockTriggerLabels = {
    'schedule': 'Scheduled',
    'webhook': 'Webhook',
    'manual': 'Manual',
    'file_change': 'File Change',
  };

  const baseAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'A test agent for testing purposes',
    author: 'TestAuthor',
    version: '1.0.0',
    defaultTrigger: 'schedule',
    tags: ['automation', 'testing', 'ci'],
    isInstalled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render agent name', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('should render agent description', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('A test agent for testing purposes')).toBeInTheDocument();
    });

    it('should render category icon', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByTestId('category-icon')).toBeInTheDocument();
    });

    it('should render author name', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('TestAuthor')).toBeInTheDocument();
    });

    it('should render version badge', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('should render trigger label', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });
  });

  describe('tags rendering', () => {
    it('should render up to 3 tags', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('automation')).toBeInTheDocument();
      expect(screen.getByText('testing')).toBeInTheDocument();
      expect(screen.getByText('ci')).toBeInTheDocument();
    });

    it('should show "+N more" when more than 3 tags', () => {
      const agentWithManyTags = {
        ...baseAgent,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };

      render(
        <AgentCard
          agent={agentWithManyTags}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('should handle agent with no tags', () => {
      const agentNoTags = { ...baseAgent, tags: undefined };

      render(
        <AgentCard
          agent={agentNoTags}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      // Should render without error
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });
  });

  describe('uninstalled agent', () => {
    it('should render Install button', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Install')).toBeInTheDocument();
    });

    it('should not show Installed badge', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.queryByText('Installed')).not.toBeInTheDocument();
    });

    it('should call onSelect when Install button clicked', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      fireEvent.click(screen.getByText('Install'));

      expect(mockOnSelect).toHaveBeenCalled();
    });

    it('should call onSelect when card clicked', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      // Click on the card container
      const card = screen.getByText('Test Agent').closest('div[class*="p-4"]');
      fireEvent.click(card);

      expect(mockOnSelect).toHaveBeenCalled();
    });
  });

  describe('installed agent', () => {
    const installedAgent = { ...baseAgent, isInstalled: true };

    it('should render Installed badge', () => {
      render(
        <AgentCard
          agent={installedAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('should show Active indicator', () => {
      render(
        <AgentCard
          agent={installedAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render Uninstall button', () => {
      render(
        <AgentCard
          agent={installedAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Uninstall')).toBeInTheDocument();
    });

    it('should not call onSelect when card clicked', () => {
      render(
        <AgentCard
          agent={installedAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      const card = screen.getByText('Test Agent').closest('div[class*="p-4"]');
      fireEvent.click(card);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should call onUninstall when Uninstall clicked', () => {
      render(
        <AgentCard
          agent={installedAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      fireEvent.click(screen.getByText('Uninstall'));

      expect(mockOnUninstall).toHaveBeenCalled();
    });
  });

  describe('installing state', () => {
    it('should show Installing... text when installing', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={true}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('Installing...')).toBeInTheDocument();
    });

    it('should disable Install button when installing', () => {
      render(
        <AgentCard
          agent={baseAgent}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={true}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      const installButton = screen.getByText('Installing...').closest('button');
      expect(installButton).toBeDisabled();
    });
  });

  describe('trigger label fallback', () => {
    it('should use raw trigger when no label mapping exists', () => {
      const agentWithUnknownTrigger = {
        ...baseAgent,
        defaultTrigger: 'custom_trigger',
      };

      render(
        <AgentCard
          agent={agentWithUnknownTrigger}
          categoryIcon={mockCategoryIcon}
          triggerLabels={mockTriggerLabels}
          isInstalling={false}
          onSelect={mockOnSelect}
          onUninstall={mockOnUninstall}
        />
      );

      expect(screen.getByText('custom_trigger')).toBeInTheDocument();
    });
  });
});
