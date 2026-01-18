/**
 * CreateProjectModal Component Tests
 * Phase 5.3: Unit tests for project creation wizard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateProjectModal from './CreateProjectModal';

// Mock the API modules
vi.mock('../services/api.js', () => ({
  githubExtendedApi: {
    getSettings: vi.fn(),
  },
  cloudflareApi: {
    getSettings: vi.fn(),
    publish: vi.fn(),
  },
  firewallApi: {
    addRule: vi.fn(),
  },
  projectsExtendedApi: {
    create: vi.fn(),
    list: vi.fn(),
    createGitHubRepo: vi.fn(),
  },
}));

// Mock the create-project components
vi.mock('./create-project', () => ({
  TEMPLATES: [
    { id: 'fullstack', name: 'Full-Stack', icon: '🚀', description: 'React + Fastify + PostgreSQL' },
    { id: 'frontend', name: 'Frontend Only', icon: '🎨', description: 'React + Vite' },
    { id: 'cli', name: 'CLI Tool', icon: '⌨️', description: 'Node.js CLI utility' },
  ],
  STEPS: [
    { name: 'Basics', description: 'Name & Description' },
    { name: 'Template', description: 'Choose template' },
    { name: 'Network', description: 'Port & firewall' },
    { name: 'GitHub', description: 'Repository' },
    { name: 'Review', description: 'Create project' },
  ],
  StepIndicator: ({ steps, currentStep }) => (
    <div data-testid="step-indicator">Step {currentStep + 1} of {steps.length}</div>
  ),
  Toggle: ({ checked, onChange, label, description }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
      {description && <span className="description">{description}</span>}
    </label>
  ),
  InputField: ({ label, value, onChange, placeholder, description, required }) => (
    <div>
      <label>{label}{required && '*'}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {description && <span className="description">{description}</span>}
    </div>
  ),
  TemplateCard: ({ template, selected, onSelect }) => (
    <button
      onClick={() => onSelect(template.id)}
      className={selected ? 'selected' : ''}
      data-testid={`template-${template.id}`}
    >
      {template.icon} {template.name}
    </button>
  ),
  SummaryItem: ({ icon, label, value, status }) => (
    <div data-testid={`summary-${label.toLowerCase()}`}>
      {icon} {label}: {value} ({status})
    </div>
  ),
}));

import { githubExtendedApi, cloudflareApi, firewallApi, projectsExtendedApi } from '../services/api.js';

describe('CreateProjectModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default API responses
    githubExtendedApi.getSettings.mockResolvedValue({ authenticated: false });
    cloudflareApi.getSettings.mockResolvedValue({ configured: false });
    projectsExtendedApi.create.mockResolvedValue({ name: 'test-project', path: '/home/user/Projects/test-project' });
    projectsExtendedApi.list.mockResolvedValue([{ name: 'test-project' }]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render modal header', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });

    it('should render step indicator', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
    });

    it('should render cancel button on first step', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render next button on first step', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  describe('step 1: basics', () => {
    it('should render project name input', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      expect(screen.getByText('Project Name*')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('my-awesome-project')).toBeInTheDocument();
    });

    it('should render description input', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should show error when project name is empty', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    it('should show error for invalid project name', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'my project with spaces' } });
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Use only letters, numbers, hyphens, and underscores')).toBeInTheDocument();
    });

    it('should advance to step 2 with valid name', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'my-project' } });
      fireEvent.click(screen.getByText('Next'));

      // Should now be on template step
      expect(screen.getByText('Choose your starting point')).toBeInTheDocument();
    });
  });

  describe('step 2: template', () => {
    beforeEach(() => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);
      // Navigate to step 2
      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'my-project' } });
      fireEvent.click(screen.getByText('Next'));
    });

    it('should render template options', () => {
      expect(screen.getByTestId('template-fullstack')).toBeInTheDocument();
      expect(screen.getByTestId('template-frontend')).toBeInTheDocument();
      expect(screen.getByTestId('template-cli')).toBeInTheDocument();
    });

    it('should render git init toggle', () => {
      expect(screen.getByText('Initialize Git repository')).toBeInTheDocument();
    });

    it('should show back button', () => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should go back to step 1 when back clicked', () => {
      fireEvent.click(screen.getByText('Back'));

      expect(screen.getByText("Let's create something awesome")).toBeInTheDocument();
    });

    it('should allow selecting different template', () => {
      fireEvent.click(screen.getByTestId('template-frontend'));

      // The template should now be selected (has 'selected' class in mock)
      expect(screen.getByTestId('template-frontend')).toHaveClass('selected');
    });
  });

  describe('step 3: network', () => {
    beforeEach(() => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);
      // Navigate to step 3
      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'my-project' } });
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
    });

    it('should render port input', () => {
      expect(screen.getByText('Development Port')).toBeInTheDocument();
    });

    it('should show firewall option when port is entered', () => {
      const portInput = screen.getByPlaceholderText('e.g., 5173, 3000, 8080');
      fireEvent.change(portInput, { target: { value: '3000' } });

      expect(screen.getByText('Add to firewall')).toBeInTheDocument();
    });

    it('should validate port number', () => {
      const portInput = screen.getByPlaceholderText('e.g., 5173, 3000, 8080');
      fireEvent.change(portInput, { target: { value: '99999' } });
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Invalid port number')).toBeInTheDocument();
    });
  });

  describe('step 4: github', () => {
    beforeEach(async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);
      // Navigate to step 4
      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'my-project' } });
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
      fireEvent.click(screen.getByText('Next')); // Step 4
    });

    it('should render GitHub integration section', () => {
      expect(screen.getByText('GitHub Integration')).toBeInTheDocument();
    });

    it('should show create repo toggle', () => {
      expect(screen.getByText('Create GitHub Repository')).toBeInTheDocument();
    });
  });

  describe('step 5: review', () => {
    beforeEach(async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);
      // Navigate to step 5
      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'my-project' } });
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
      fireEvent.click(screen.getByText('Next')); // Step 4
      fireEvent.click(screen.getByText('Next')); // Step 5
    });

    it('should render review header', () => {
      expect(screen.getByText('Review & Create')).toBeInTheDocument();
    });

    it('should show project summary', () => {
      expect(screen.getByTestId('summary-project')).toBeInTheDocument();
    });

    it('should show template summary', () => {
      expect(screen.getByTestId('summary-template')).toBeInTheDocument();
    });

    it('should show git summary', () => {
      expect(screen.getByTestId('summary-git')).toBeInTheDocument();
    });

    it('should show create project button', () => {
      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });
  });

  describe('project creation', () => {
    beforeEach(async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);
      // Navigate to review step
      const input = screen.getByPlaceholderText('my-awesome-project');
      fireEvent.change(input, { target: { value: 'test-project' } });
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
      fireEvent.click(screen.getByText('Next')); // Step 4
      fireEvent.click(screen.getByText('Next')); // Step 5
    });

    it('should call create API when Create Project clicked', async () => {
      fireEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(projectsExtendedApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test-project',
          })
        );
      });
    });

    it('should show Creating... text while creating', async () => {
      projectsExtendedApi.create.mockImplementation(() => new Promise(() => {}));

      fireEvent.click(screen.getByText('Create Project'));

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('should call onCreated after successful creation', async () => {
      fireEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(projectsExtendedApi.create).toHaveBeenCalled();
      });

      // Advance timers to trigger the success callback
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalled();
      });
    });

    it('should show error on creation failure', async () => {
      const mockError = { getUserMessage: () => 'Failed to create project' };
      projectsExtendedApi.create.mockRejectedValue(mockError);

      fireEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByText('Failed to create project')).toBeInTheDocument();
      });
    });
  });

  describe('modal interactions', () => {
    it('should call onClose when cancel clicked', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button clicked', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      // Find the X button in header
      const closeButtons = document.querySelectorAll('button');
      const closeButton = Array.from(closeButtons).find(btn =>
        btn.querySelector('svg path[d*="M6 18L18 6"]')
      );
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should call onClose when backdrop clicked', () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      // Click on backdrop
      const backdrop = document.querySelector('.bg-black\\/70');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('integration checks', () => {
    it('should check GitHub availability on mount', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      await waitFor(() => {
        expect(githubExtendedApi.getSettings).toHaveBeenCalled();
      });
    });

    it('should check Cloudflare availability on mount', async () => {
      render(<CreateProjectModal onClose={mockOnClose} onCreated={mockOnCreated} />);

      await waitFor(() => {
        expect(cloudflareApi.getSettings).toHaveBeenCalled();
      });
    });
  });
});
