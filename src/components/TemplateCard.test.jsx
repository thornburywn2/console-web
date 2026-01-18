/**
 * TemplateCard Component Tests
 * Phase 5.3: Unit tests for project template card
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateCard from './TemplateCard';

describe('TemplateCard', () => {
  const mockTemplate = {
    name: 'Full Stack Web App',
    description: 'A complete web application with React frontend and Fastify backend',
    icon: 'Layers',
    color: '#3B82F6',
    stack: ['React', 'TypeScript', 'Fastify', 'Prisma', 'PostgreSQL'],
    difficulty: 'intermediate',
    estimatedSetupTime: '10 minutes',
  };

  const mockOnSelect = vi.fn();

  describe('basic rendering', () => {
    it('should render template name', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Full Stack Web App')).toBeInTheDocument();
    });

    it('should render template description', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/complete web application/)).toBeInTheDocument();
    });

    it('should render icon based on template icon property', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      // Layers icon maps to 📚
      expect(screen.getByText('📚')).toBeInTheDocument();
    });

    it('should render fallback icon for unknown icon type', () => {
      const templateWithUnknownIcon = {
        ...mockTemplate,
        icon: 'UnknownIcon',
      };

      render(
        <TemplateCard
          template={templateWithUnknownIcon}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('📁')).toBeInTheDocument();
    });
  });

  describe('tech stack display', () => {
    it('should display up to 4 tech stack items', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Fastify')).toBeInTheDocument();
      expect(screen.getByText('Prisma')).toBeInTheDocument();
    });

    it('should show "+N more" when stack has more than 4 items', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('should not show "+N more" when stack has 4 or fewer items', () => {
      const smallStackTemplate = {
        ...mockTemplate,
        stack: ['React', 'TypeScript'],
      };

      render(
        <TemplateCard
          template={smallStackTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    it('should handle empty stack gracefully', () => {
      const noStackTemplate = {
        ...mockTemplate,
        stack: undefined,
      };

      render(
        <TemplateCard
          template={noStackTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      // Should not crash and still render the card
      expect(screen.getByText('Full Stack Web App')).toBeInTheDocument();
    });
  });

  describe('difficulty display', () => {
    it('should display difficulty level', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('intermediate')).toBeInTheDocument();
    });

    it('should default to intermediate when difficulty not specified', () => {
      const noDifficultyTemplate = {
        ...mockTemplate,
        difficulty: undefined,
      };

      render(
        <TemplateCard
          template={noDifficultyTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('intermediate')).toBeInTheDocument();
    });

    it('should apply correct styling for beginner difficulty', () => {
      const beginnerTemplate = {
        ...mockTemplate,
        difficulty: 'beginner',
      };

      const { container } = render(
        <TemplateCard
          template={beginnerTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      const badge = screen.getByText('beginner');
      expect(badge).toHaveClass('text-green-400');
    });

    it('should apply correct styling for advanced difficulty', () => {
      const advancedTemplate = {
        ...mockTemplate,
        difficulty: 'advanced',
      };

      render(
        <TemplateCard
          template={advancedTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      const badge = screen.getByText('advanced');
      expect(badge).toHaveClass('text-red-400');
    });
  });

  describe('setup time display', () => {
    it('should display estimated setup time', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('10 minutes')).toBeInTheDocument();
    });

    it('should default to 5 minutes when not specified', () => {
      const noTimeTemplate = {
        ...mockTemplate,
        estimatedSetupTime: undefined,
      };

      render(
        <TemplateCard
          template={noTimeTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('5 minutes')).toBeInTheDocument();
    });
  });

  describe('requirements display', () => {
    it('should not show requirements section when no requirements', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText(/Requires:/)).not.toBeInTheDocument();
    });

    it('should show requirements when present', () => {
      const templateWithRequirements = {
        ...mockTemplate,
        requirements: ['Docker', 'PostgreSQL'],
      };

      render(
        <TemplateCard
          template={templateWithRequirements}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Requires: Docker, PostgreSQL')).toBeInTheDocument();
    });

    it('should not show requirements for empty array', () => {
      const templateWithEmptyRequirements = {
        ...mockTemplate,
        requirements: [],
      };

      render(
        <TemplateCard
          template={templateWithEmptyRequirements}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText(/Requires:/)).not.toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('should show selection indicator when selected', () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          selected={true}
          onSelect={mockOnSelect}
        />
      );

      // Check for checkmark SVG
      const svg = container.querySelector('svg path[d="M5 13l4 4L19 7"]');
      expect(svg).toBeInTheDocument();
    });

    it('should not show selection indicator when not selected', () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      // Checkmark should not be present
      const svg = container.querySelector('svg path[d="M5 13l4 4L19 7"]');
      expect(svg).not.toBeInTheDocument();
    });

    it('should have selected styling when selected', () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          selected={true}
          onSelect={mockOnSelect}
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('border-blue-500');
    });

    it('should have unselected styling when not selected', () => {
      const { container } = render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('border-gray-700');
    });
  });

  describe('click handling', () => {
    it('should call onSelect when clicked', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          selected={false}
          onSelect={mockOnSelect}
        />
      );

      fireEvent.click(screen.getByText('Full Stack Web App'));

      expect(mockOnSelect).toHaveBeenCalled();
    });
  });

  describe('icon mapping', () => {
    const iconTests = [
      { icon: 'Layers', expected: '📚' },
      { icon: 'Monitor', expected: '🖥️' },
      { icon: 'Terminal', expected: '💻' },
      { icon: 'Server', expected: '🖧' },
      { icon: 'Smartphone', expected: '📱' },
      { icon: 'Code', expected: '💾' },
      { icon: 'Database', expected: '🗄️' },
      { icon: 'Cloud', expected: '☁️' },
    ];

    iconTests.forEach(({ icon, expected }) => {
      it(`should map ${icon} to ${expected}`, () => {
        const templateWithIcon = {
          ...mockTemplate,
          icon,
        };

        render(
          <TemplateCard
            template={templateWithIcon}
            selected={false}
            onSelect={mockOnSelect}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });
});
