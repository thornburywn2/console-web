/**
 * AgentConfigModal Component Tests
 * Phase 5.3: Unit tests for agent config modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AgentConfigModal from './AgentConfigModal';

describe('AgentConfigModal', () => {
  const mockOnInstall = vi.fn();
  const mockOnClose = vi.fn();

  const mockAgent = {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    defaultTrigger: 'MANUAL',
    configFields: [
      { name: 'field1', label: 'Field 1', type: 'text', default: 'default value' },
      { name: 'field2', label: 'Field 2', type: 'boolean', default: false },
    ],
  };

  const mockTriggerLabels = {
    MANUAL: 'Manual Trigger',
    FILE_CHANGE: 'File Change',
  };

  const mockProjects = [
    { id: '1', name: 'Project 1' },
    { id: '2', name: 'Project 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal with agent info', () => {
      render(
        <AgentConfigModal
          agent={mockAgent}
          triggerLabels={mockTriggerLabels}
          projects={mockProjects}
          isInstalling={false}
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('should render config fields', () => {
      render(
        <AgentConfigModal
          agent={mockAgent}
          triggerLabels={mockTriggerLabels}
          projects={mockProjects}
          isInstalling={false}
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Field 1')).toBeInTheDocument();
    });

    it('should render with no projects', () => {
      render(
        <AgentConfigModal
          agent={mockAgent}
          triggerLabels={mockTriggerLabels}
          projects={[]}
          isInstalling={false}
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onInstall when form is submitted', async () => {
      render(
        <AgentConfigModal
          agent={mockAgent}
          triggerLabels={mockTriggerLabels}
          projects={mockProjects}
          isInstalling={false}
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      const installButton = screen.getByText('Install Agent');
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(mockOnInstall).toHaveBeenCalled();
      });
    });

    it('should disable install button when installing', () => {
      render(
        <AgentConfigModal
          agent={mockAgent}
          triggerLabels={mockTriggerLabels}
          projects={mockProjects}
          isInstalling={true}
          onInstall={mockOnInstall}
          onClose={mockOnClose}
        />
      );

      const installButton = screen.getByText(/Installing/i);
      expect(installButton.closest('button')).toBeDisabled();
    });
  });
});
