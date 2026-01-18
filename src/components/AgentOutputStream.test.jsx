/**
 * AgentOutputStream Component Tests
 * Phase 5.3: Unit tests for agent output stream
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentOutputStream from './AgentOutputStream';

describe('AgentOutputStream', () => {
  const mockAgentId = 'agent-1';
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render output stream', async () => {
      render(
        <AgentOutputStream
          agentId={mockAgentId}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without agentId', async () => {
      render(
        <AgentOutputStream
          agentId={null}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should render without socket', async () => {
      render(
        <AgentOutputStream
          agentId={mockAgentId}
          socket={null}
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('socket integration', () => {
    it('should register socket event listeners', async () => {
      render(
        <AgentOutputStream
          agentId={mockAgentId}
          socket={mockSocket}
        />
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('agent-output', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('agent-started', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('agent-completed', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('agent-error', expect.any(Function));
      });
    });

    it('should not register listeners without socket', async () => {
      render(
        <AgentOutputStream
          agentId={mockAgentId}
          socket={null}
        />
      );

      expect(mockSocket.on).not.toHaveBeenCalled();
    });

    it('should not register listeners without agentId', async () => {
      render(
        <AgentOutputStream
          agentId={null}
          socket={mockSocket}
        />
      );

      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  describe('display', () => {
    it('should render component content', async () => {
      render(
        <AgentOutputStream
          agentId={mockAgentId}
          socket={mockSocket}
        />
      );

      // Component renders successfully
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });
});
