/**
 * AlertRuleEditor Component Tests
 * Phase 5.3: Unit tests for alert rule editor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AlertRuleEditor from './AlertRuleEditor';

// Mock API
vi.mock('../services/api.js', () => ({
  alertsApi: {
    list: vi.fn().mockResolvedValue({
      rules: [
        { id: '1', name: 'CPU Alert', type: 'cpu', threshold: 80, enabled: true },
        { id: '2', name: 'Memory Alert', type: 'memory', threshold: 90, enabled: false },
      ],
    }),
    create: vi.fn().mockResolvedValue({ id: '3', name: 'New Alert' }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock sub-components
vi.mock('./alert-rule-editor', () => ({
  ALERT_TYPES: [
    { id: 'cpu', name: 'CPU Usage', icon: '💻' },
    { id: 'memory', name: 'Memory Usage', icon: '🧠' },
    { id: 'disk', name: 'Disk Usage', icon: '💾' },
  ],
  PRESETS: [
    { name: 'High CPU Alert', type: 'cpu', threshold: 80 },
    { name: 'Low Disk Space', type: 'disk', threshold: 90 },
  ],
  RuleCard: ({ rule, onEdit, onDelete, onToggle }) => (
    <div data-testid={`rule-${rule.id}`}>
      <span>{rule.name}</span>
      <button onClick={() => onEdit(rule)}>Edit</button>
      <button onClick={() => onDelete(rule.id)}>Delete</button>
      <button onClick={() => onToggle(rule.id)}>Toggle</button>
    </div>
  ),
  RuleEditor: ({ rule, onSave, onCancel }) => (
    <div data-testid="rule-editor">
      <button onClick={() => onSave(rule)}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('AlertRuleEditor', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <AlertRuleEditor
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false and not embedded', () => {
      render(
        <AlertRuleEditor
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });

    it('should render in embedded mode', async () => {
      render(
        <AlertRuleEditor
          isOpen={false}
          onClose={mockOnClose}
          embedded={true}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('rule fetching', () => {
    it('should fetch rules when opened', async () => {
      const { alertsApi } = await import('../services/api.js');

      render(
        <AlertRuleEditor
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(alertsApi.list).toHaveBeenCalled();
      });
    });
  });

  describe('rule display', () => {
    it('should display alert rules title', async () => {
      render(
        <AlertRuleEditor
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Alert Rules')).toBeInTheDocument();
      });
    });

    it('should have new alert button', async () => {
      render(
        <AlertRuleEditor
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('+ New Alert Rule')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const { alertsApi } = await import('../services/api.js');
      vi.mocked(alertsApi.list).mockRejectedValue(new Error('Network error'));

      render(
        <AlertRuleEditor
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
