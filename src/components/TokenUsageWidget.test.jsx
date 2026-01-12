/**
 * TokenUsageWidget Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TokenUsageWidget, { TokenUsageInline } from './TokenUsageWidget';

describe('TokenUsageWidget', () => {
  const mockUsageData = {
    inputTokens: 45230,
    outputTokens: 12450,
    totalTokens: 57680,
    requests: 23,
    model: 'claude-sonnet',
    history: [
      { date: '2026-01-07', input: 15000, output: 4000, requests: 8 },
      { date: '2026-01-06', input: 18230, output: 5200, requests: 9 },
      { date: '2026-01-05', input: 12000, output: 3250, requests: 6 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading state initially', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(<TokenUsageWidget />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display token usage after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should display total tokens formatted
    expect(screen.getByText('57.7K')).toBeInTheDocument();
    expect(screen.getByText('tokens')).toBeInTheDocument();
  });

  it('should display Token Usage header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    expect(screen.getByText('Token Usage')).toBeInTheDocument();
  });

  it('should display input and output token breakdown', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('45.2K')).toBeInTheDocument(); // Input tokens
    expect(screen.getByText('12.4K')).toBeInTheDocument(); // Output tokens (12450 rounds to 12.4K)
  });

  it('should display estimated cost', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    // Cost calculation: (45230/1M * 3.00) + (12450/1M * 15.00)
    // = 0.13569 + 0.18675 = 0.32244
    expect(screen.getByText('$0.3224')).toBeInTheDocument();
  });

  it('should display request count', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('should display model information', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Model: claude-sonnet')).toBeInTheDocument();
    expect(screen.getByText('$3.00/1M in | $15.00/1M out')).toBeInTheDocument();
  });

  it('should display usage history when showDetails is true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget showDetails={true} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Recent Usage')).toBeInTheDocument();
  });

  it('should not display usage history when showDetails is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget showDetails={false} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('Recent Usage')).not.toBeInTheDocument();
  });

  it('should allow changing time range', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('today');

    fireEvent.change(select, { target: { value: 'week' } });
    expect(select).toHaveValue('week');

    // Should fetch with new range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('range=week'));
    });
  });

  it('should include sessionId in API request when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget sessionId="test-session-123" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('sessionId=test-session-123'));
    });
  });

  it('should include projectId in API request when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsageData),
    });

    render(<TokenUsageWidget projectId="project-456" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('projectId=project-456'));
    });
  });

  it('should show usage percentage correctly', async () => {
    const lowUsageData = { ...mockUsageData, totalTokens: 100000 }; // 10% of 1M
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(lowUsageData),
    });

    render(<TokenUsageWidget />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('10.0% of limit')).toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<TokenUsageWidget />);

    // Should still display fallback data after error
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show mock data
    expect(screen.getByText('57.7K')).toBeInTheDocument();
  });

  describe('compact mode', () => {
    it('should render compact version when compact=true', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUsageData),
      });

      render(<TokenUsageWidget compact={true} />);

      await waitFor(() => {
        expect(screen.getByText(/tokens/)).toBeInTheDocument();
      });

      // Should not show the full header
      expect(screen.queryByText('Token Usage')).not.toBeInTheDocument();
      // Should not show the time range selector
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });
});

describe('TokenUsageInline', () => {
  it('should render token count', () => {
    render(<TokenUsageInline tokens={50000} />);
    expect(screen.getByText('50.0K')).toBeInTheDocument();
  });

  it('should render cost when provided', () => {
    render(<TokenUsageInline tokens={50000} cost={0.15} />);
    expect(screen.getByText('50.0K')).toBeInTheDocument();
    // Cost is rendered with parentheses and currency formatting
    expect(screen.getByText(/\$0\.1500/)).toBeInTheDocument();
  });

  it('should not render cost when not provided', () => {
    render(<TokenUsageInline tokens={50000} />);
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<TokenUsageInline tokens={50000} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should format large numbers correctly', () => {
    render(<TokenUsageInline tokens={1500000} />);
    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  it('should format small numbers correctly', () => {
    render(<TokenUsageInline tokens={500} />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
