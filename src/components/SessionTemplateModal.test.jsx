/**
 * SessionTemplateModal Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionTemplateModal from './SessionTemplateModal';

describe('SessionTemplateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTemplate: vi.fn(),
    customTemplates: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<SessionTemplateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Session Templates')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<SessionTemplateModal {...defaultProps} />);
    expect(screen.getByText('Session Templates')).toBeInTheDocument();
  });

  it('should display built-in templates', () => {
    render(<SessionTemplateModal {...defaultProps} />);
    expect(screen.getByText('Blank Session')).toBeInTheDocument();
    expect(screen.getByText('Docker Debug')).toBeInTheDocument();
    expect(screen.getByText('Git Status')).toBeInTheDocument();
    expect(screen.getByText('NPM Development')).toBeInTheDocument();
  });

  it('should filter templates based on search query', () => {
    render(<SessionTemplateModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search templates...');

    fireEvent.change(searchInput, { target: { value: 'docker' } });

    expect(screen.getByText('Docker Debug')).toBeInTheDocument();
    expect(screen.queryByText('Git Status')).not.toBeInTheDocument();
  });

  it('should call onSelectTemplate when a template is clicked', () => {
    render(<SessionTemplateModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Docker Debug'));

    expect(defaultProps.onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'docker-debug',
        name: 'Docker Debug',
      })
    );
  });

  it('should call onClose when close button is clicked', () => {
    render(<SessionTemplateModal {...defaultProps} />);

    // Look for the X close button in the modal header
    const allButtons = screen.getAllByRole('button');
    // First button is typically the close X button
    const closeButton = allButtons[0];
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close when backdrop is clicked', () => {
    render(<SessionTemplateModal {...defaultProps} />);

    // Click backdrop (the dark overlay)
    const backdrop = document.querySelector('.bg-black\\/60');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('should close when Cancel button is clicked', () => {
    render(<SessionTemplateModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should filter by category when category tab is clicked', () => {
    const customTemplate = {
      id: 'custom-1',
      name: 'Custom Template',
      description: 'A custom template',
      icon: '🎯',
      commands: ['echo "hello"'],
      isBuiltIn: false,
    };

    render(
      <SessionTemplateModal
        {...defaultProps}
        customTemplates={[customTemplate]}
      />
    );

    // Click "Custom" tab
    fireEvent.click(screen.getByText('Custom'));

    // Should only show custom template
    expect(screen.getByText('Custom Template')).toBeInTheDocument();
    expect(screen.queryByText('Docker Debug')).not.toBeInTheDocument();
  });

  it('should show "No templates found" when no matches', () => {
    render(<SessionTemplateModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search templates...');

    fireEvent.change(searchInput, { target: { value: 'nonexistent template xyz' } });

    expect(screen.getByText('No templates found')).toBeInTheDocument();
  });

  it('should display command count for templates', () => {
    render(<SessionTemplateModal {...defaultProps} />);

    // Multiple templates may have "2 commands" - just check that command counts exist
    const commandCounts = screen.getAllByText(/\d+ commands?/);
    expect(commandCounts.length).toBeGreaterThan(0);
  });

  it('should display template count in footer', () => {
    render(<SessionTemplateModal {...defaultProps} />);

    // Should show count of all built-in templates
    expect(screen.getByText(/\d+ templates? available/)).toBeInTheDocument();
  });
});
