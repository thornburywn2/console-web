/**
 * MCPStatusIndicator Component Tests
 * Phase 5.3: Unit tests for MCP server status indicators
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MCPStatusIndicator, { MCPStatusBadge, MCPAggregateStatus } from './MCPStatusIndicator';

describe('MCPStatusIndicator', () => {
  describe('status display', () => {
    it('should render with CONNECTED status', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTED" />);

      const dot = container.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('title', 'Connected');
    });

    it('should render with DISCONNECTED status', () => {
      const { container } = render(<MCPStatusIndicator status="DISCONNECTED" />);

      const dot = container.querySelector('.bg-gray-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('title', 'Disconnected');
    });

    it('should render with CONNECTING status', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTING" />);

      const dot = container.querySelector('.bg-yellow-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('title', 'Connecting');
    });

    it('should render with ERROR status', () => {
      const { container } = render(<MCPStatusIndicator status="ERROR" />);

      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('title', 'Error');
    });

    it('should default to DISCONNECTED for invalid status', () => {
      const { container } = render(<MCPStatusIndicator status="INVALID" />);

      const dot = container.querySelector('.bg-gray-500');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('isRunning override', () => {
    it('should show CONNECTING when isRunning is true and status is DISCONNECTED', () => {
      const { container } = render(<MCPStatusIndicator status="DISCONNECTED" isRunning={true} />);

      const dot = container.querySelector('.bg-yellow-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('title', 'Connecting');
    });

    it('should not change status when isRunning is true but already connected', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTED" isRunning={true} />);

      const dot = container.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render small size', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTED" size="sm" />);

      const dot = container.querySelector('.w-2.h-2');
      expect(dot).toBeInTheDocument();
    });

    it('should render medium size (default)', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTED" />);

      const dot = container.querySelector('.w-3.h-3');
      expect(dot).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTED" size="lg" />);

      const dot = container.querySelector('.w-4.h-4');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('label display', () => {
    it('should not show label by default', () => {
      render(<MCPStatusIndicator status="CONNECTED" />);

      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<MCPStatusIndicator status="CONNECTED" showLabel={true} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show correct label for each status', () => {
      const { rerender } = render(<MCPStatusIndicator status="CONNECTED" showLabel={true} />);
      expect(screen.getByText('Connected')).toBeInTheDocument();

      rerender(<MCPStatusIndicator status="DISCONNECTED" showLabel={true} />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();

      rerender(<MCPStatusIndicator status="CONNECTING" showLabel={true} />);
      expect(screen.getByText('Connecting')).toBeInTheDocument();

      rerender(<MCPStatusIndicator status="ERROR" showLabel={true} />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(<MCPStatusIndicator status="CONNECTED" className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});

describe('MCPStatusBadge', () => {
  it('should render CONNECTED badge', () => {
    render(<MCPStatusBadge status="CONNECTED" />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should render DISCONNECTED badge', () => {
    render(<MCPStatusBadge status="DISCONNECTED" />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should render CONNECTING badge', () => {
    render(<MCPStatusBadge status="CONNECTING" />);

    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('should render ERROR badge', () => {
    render(<MCPStatusBadge status="ERROR" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should show CONNECTING when isRunning is true and status is DISCONNECTED', () => {
    render(<MCPStatusBadge status="DISCONNECTED" isRunning={true} />);

    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const { container } = render(<MCPStatusBadge status="CONNECTED" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('border');
    expect(badge).toHaveClass('bg-green-500/20');
  });
});

describe('MCPAggregateStatus', () => {
  it('should show all servers connected', () => {
    const servers = [
      { status: 'CONNECTED' },
      { status: 'CONNECTED' },
      { status: 'CONNECTED' },
    ];

    render(<MCPAggregateStatus servers={servers} />);

    expect(screen.getByText('3/3 servers')).toBeInTheDocument();
  });

  it('should show partial connection', () => {
    const servers = [
      { status: 'CONNECTED' },
      { status: 'DISCONNECTED' },
      { status: 'DISCONNECTED' },
    ];

    render(<MCPAggregateStatus servers={servers} />);

    expect(screen.getByText('1/3 servers')).toBeInTheDocument();
  });

  it('should count isRunning servers as connected', () => {
    const servers = [
      { status: 'CONNECTED' },
      { status: 'DISCONNECTED', isRunning: true },
      { status: 'DISCONNECTED' },
    ];

    render(<MCPAggregateStatus servers={servers} />);

    expect(screen.getByText('2/3 servers')).toBeInTheDocument();
  });

  it('should show error status when any server has error', () => {
    const servers = [
      { status: 'CONNECTED' },
      { status: 'ERROR' },
      { status: 'CONNECTED' },
    ];

    const { container } = render(<MCPAggregateStatus servers={servers} />);

    // Should use error styling (red dot)
    const dot = container.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });

  it('should handle empty server array', () => {
    render(<MCPAggregateStatus servers={[]} />);

    expect(screen.getByText('0/0 servers')).toBeInTheDocument();
  });

  it('should show all disconnected status', () => {
    const servers = [
      { status: 'DISCONNECTED' },
      { status: 'DISCONNECTED' },
    ];

    const { container } = render(<MCPAggregateStatus servers={servers} />);

    // Should use disconnected styling (gray dot)
    const dot = container.querySelector('.bg-gray-500');
    expect(dot).toBeInTheDocument();
    expect(screen.getByText('0/2 servers')).toBeInTheDocument();
  });
});
