/**
 * Tests for useAgentSocket hook
 * Real-time agent status and output updates via Socket.IO
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentSocket, useRunningAgentCount } from './useAgentSocket';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('useAgentSocket', () => {
  let socketHandlers = {};

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers = {};

    // Capture event handlers
    mockSocket.on.mockImplementation((event, handler) => {
      socketHandlers[event] = handler;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAgentSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.runningAgents).toEqual([]);
      expect(result.current.runningCount).toBe(0);
      expect(result.current.recentEvents).toEqual([]);
    });

    it('should set up socket event listeners', () => {
      renderHook(() => useAgentSocket());

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('agent:status', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('agent:output', expect.any(Function));
    });

    it('should disconnect socket on unmount', () => {
      const { unmount } = renderHook(() => useAgentSocket());
      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('connection status', () => {
    it('should update isConnected on connect event', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers.connect?.();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should update isConnected on disconnect event', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers.connect?.();
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        socketHandlers.disconnect?.();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('agent:status event', () => {
    it('should add running agent on RUNNING status', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'RUNNING',
          startedAt: '2024-01-01T00:00:00Z',
        });
      });

      expect(result.current.runningCount).toBe(1);
      expect(result.current.runningAgents).toHaveLength(1);
      expect(result.current.runningAgents[0]).toMatchObject({
        agentId: 'agent-1',
        executionId: 'exec-1',
        status: 'RUNNING',
      });
    });

    it('should add running agent on PENDING status', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-2',
          executionId: 'exec-2',
          status: 'PENDING',
          startedAt: '2024-01-01T00:00:00Z',
        });
      });

      expect(result.current.runningCount).toBe(1);
      expect(result.current.runningAgents[0].status).toBe('PENDING');
    });

    it('should remove agent on COMPLETED status', async () => {
      const { result } = renderHook(() => useAgentSocket());

      // Add agent
      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'RUNNING',
          startedAt: '2024-01-01T00:00:00Z',
        });
      });

      expect(result.current.runningCount).toBe(1);

      // Complete agent
      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'COMPLETED',
          endedAt: '2024-01-01T00:01:00Z',
        });
      });

      expect(result.current.runningCount).toBe(0);
    });

    it('should remove agent on FAILED status', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'RUNNING',
          startedAt: '2024-01-01T00:00:00Z',
        });
      });

      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'FAILED',
          endedAt: '2024-01-01T00:01:00Z',
          error: 'Test error',
        });
      });

      expect(result.current.runningCount).toBe(0);
    });

    it('should add status change to recent events', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'RUNNING',
          startedAt: '2024-01-01T00:00:00Z',
        });
      });

      expect(result.current.recentEvents).toHaveLength(1);
      expect(result.current.recentEvents[0]).toMatchObject({
        agentId: 'agent-1',
        executionId: 'exec-1',
        status: 'RUNNING',
      });
    });

    it('should limit recent events to 20', async () => {
      const { result } = renderHook(() => useAgentSocket());

      // Add 25 events
      for (let i = 0; i < 25; i++) {
        act(() => {
          socketHandlers['agent:status']?.({
            agentId: `agent-${i}`,
            executionId: `exec-${i}`,
            status: 'RUNNING',
            startedAt: '2024-01-01T00:00:00Z',
          });
        });
      }

      expect(result.current.recentEvents).toHaveLength(20);
    });
  });

  describe('agent:output event', () => {
    it('should store agent output by executionId', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:output']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          actionIndex: 0,
          output: 'Test output line 1',
        });
      });

      const output = result.current.getAgentOutput('exec-1');
      expect(output).toHaveLength(1);
      expect(output[0]).toMatchObject({
        actionIndex: 0,
        output: 'Test output line 1',
      });
    });

    it('should append multiple outputs for same execution', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:output']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          actionIndex: 0,
          output: 'Line 1',
        });
      });

      act(() => {
        socketHandlers['agent:output']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          actionIndex: 1,
          output: 'Line 2',
        });
      });

      const output = result.current.getAgentOutput('exec-1');
      expect(output).toHaveLength(2);
    });
  });

  describe('helper methods', () => {
    it('getRunningAgent should return agent by ID', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:status']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          status: 'RUNNING',
          startedAt: '2024-01-01T00:00:00Z',
        });
      });

      const agent = result.current.getRunningAgent('agent-1');
      expect(agent).toMatchObject({
        executionId: 'exec-1',
        status: 'RUNNING',
      });
    });

    it('getRunningAgent should return undefined for non-existent agent', () => {
      const { result } = renderHook(() => useAgentSocket());

      const agent = result.current.getRunningAgent('non-existent');
      expect(agent).toBeUndefined();
    });

    it('getAgentOutput should return empty array for unknown execution', () => {
      const { result } = renderHook(() => useAgentSocket());

      const output = result.current.getAgentOutput('unknown');
      expect(output).toEqual([]);
    });

    it('clearAgentOutput should remove output for execution', async () => {
      const { result } = renderHook(() => useAgentSocket());

      act(() => {
        socketHandlers['agent:output']?.({
          agentId: 'agent-1',
          executionId: 'exec-1',
          actionIndex: 0,
          output: 'Test',
        });
      });

      expect(result.current.getAgentOutput('exec-1')).toHaveLength(1);

      act(() => {
        result.current.clearAgentOutput('exec-1');
      });

      expect(result.current.getAgentOutput('exec-1')).toEqual([]);
    });
  });
});

describe('useRunningAgentCount', () => {
  let socketHandlers = {};

  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers = {};
    mockSocket.on.mockImplementation((event, handler) => {
      socketHandlers[event] = handler;
    });
  });

  it('should return running agent count', async () => {
    const { result } = renderHook(() => useRunningAgentCount());

    expect(result.current).toBe(0);

    act(() => {
      socketHandlers['agent:status']?.({
        agentId: 'agent-1',
        executionId: 'exec-1',
        status: 'RUNNING',
        startedAt: '2024-01-01T00:00:00Z',
      });
    });

    expect(result.current).toBe(1);
  });
});
