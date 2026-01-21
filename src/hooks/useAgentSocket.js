/**
 * useAgentSocket Hook
 * Provides real-time agent status and output updates via Socket.IO
 * Phase 3.5: Mission Control - Agent Observability
 * Enhanced with granular action-level tracking for visualization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Socket URL - same as main app
const SOCKET_URL = '';

/**
 * Action status enum for visualization
 */
export const ActionStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

/**
 * Hook for subscribing to agent events
 * @returns {Object} Agent event state and handlers
 */
export function useAgentSocket() {
  const [runningAgents, setRunningAgents] = useState(new Map()); // agentId -> execution state
  const [agentOutputs, setAgentOutputs] = useState(new Map()); // executionId -> output lines
  const [actionStates, setActionStates] = useState(new Map()); // executionId -> action states array
  const [streamingChunks, setStreamingChunks] = useState(new Map()); // actionId -> chunks array
  const [recentEvents, setRecentEvents] = useState([]); // Recent status changes
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    // Create dedicated socket for agent events
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle agent status updates
    socket.on('agent:status', (data) => {
      const { agentId, executionId, status, startedAt, endedAt, error } = data;

      setRunningAgents((prev) => {
        const next = new Map(prev);

        if (status === 'RUNNING' || status === 'PENDING') {
          next.set(agentId, {
            executionId,
            status,
            startedAt,
            error: null,
            currentActionIndex: 0,
            totalActions: 0,
          });
        } else {
          // Completed, failed, or cancelled
          next.delete(agentId);
        }

        return next;
      });

      // Add to recent events
      setRecentEvents((prev) => [
        {
          id: `${executionId}-${Date.now()}`,
          agentId,
          executionId,
          status,
          timestamp: endedAt || startedAt || new Date().toISOString(),
          error,
        },
        ...prev.slice(0, 19), // Keep last 20 events
      ]);
    });

    // Handle action start - new granular event
    socket.on('agent:action-start', (data) => {
      const { agentId, executionId, actionId, actionIndex, actionType, actionConfig, totalActions, startedAt } = data;

      // Update running agent with action progress
      setRunningAgents((prev) => {
        const next = new Map(prev);
        const existing = next.get(agentId);
        if (existing) {
          next.set(agentId, {
            ...existing,
            currentActionIndex: actionIndex,
            totalActions,
          });
        }
        return next;
      });

      // Initialize or update action states for this execution
      setActionStates((prev) => {
        const next = new Map(prev);
        const actions = next.get(executionId) || [];

        // Ensure array is large enough
        while (actions.length <= actionIndex) {
          actions.push({
            actionId: `${executionId}-action-${actions.length}`,
            actionIndex: actions.length,
            actionType: 'unknown',
            status: ActionStatus.PENDING,
            output: '',
            error: null,
            startedAt: null,
            endedAt: null,
            duration: null,
          });
        }

        // Update this action
        actions[actionIndex] = {
          actionId,
          actionIndex,
          actionType,
          actionConfig,
          status: ActionStatus.RUNNING,
          output: '',
          error: null,
          startedAt,
          endedAt: null,
          duration: null,
        };

        next.set(executionId, actions);
        return next;
      });
    });

    // Handle streaming action output - real-time chunks
    socket.on('agent:action-output', (data) => {
      const { executionId, actionId, actionIndex, chunk, timestamp } = data;

      // Append chunk to streaming buffer
      setStreamingChunks((prev) => {
        const next = new Map(prev);
        const chunks = next.get(actionId) || [];
        next.set(actionId, [...chunks, { chunk, timestamp }]);
        return next;
      });

      // Update action output
      setActionStates((prev) => {
        const next = new Map(prev);
        const actions = next.get(executionId) || [];
        if (actions[actionIndex]) {
          actions[actionIndex] = {
            ...actions[actionIndex],
            output: (actions[actionIndex].output || '') + chunk,
          };
          next.set(executionId, [...actions]);
        }
        return next;
      });
    });

    // Handle action complete - final state
    socket.on('agent:action-complete', (data) => {
      const { executionId, actionId, actionIndex, actionType, status, output, duration, endedAt } = data;

      setActionStates((prev) => {
        const next = new Map(prev);
        const actions = next.get(executionId) || [];
        if (actions[actionIndex]) {
          actions[actionIndex] = {
            ...actions[actionIndex],
            status: ActionStatus.COMPLETED,
            output: output || actions[actionIndex].output,
            endedAt,
            duration,
          };
          next.set(executionId, [...actions]);
        }
        return next;
      });
    });

    // Handle action error
    socket.on('agent:action-error', (data) => {
      const { executionId, actionId, actionIndex, actionType, error, duration, endedAt } = data;

      setActionStates((prev) => {
        const next = new Map(prev);
        const actions = next.get(executionId) || [];
        if (actions[actionIndex]) {
          actions[actionIndex] = {
            ...actions[actionIndex],
            status: ActionStatus.FAILED,
            error,
            endedAt,
            duration,
          };
          next.set(executionId, [...actions]);
        }
        return next;
      });
    });

    // Handle legacy agent output (backward compatibility)
    socket.on('agent:output', (data) => {
      const { agentId, executionId, actionIndex, output } = data;

      setAgentOutputs((prev) => {
        const next = new Map(prev);
        const existing = next.get(executionId) || [];
        next.set(executionId, [
          ...existing,
          {
            timestamp: new Date().toISOString(),
            actionIndex,
            output,
          },
        ]);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Get running agent by ID
  const getRunningAgent = useCallback(
    (agentId) => runningAgents.get(agentId),
    [runningAgents]
  );

  // Get output for an execution (legacy)
  const getAgentOutput = useCallback(
    (executionId) => agentOutputs.get(executionId) || [],
    [agentOutputs]
  );

  // Get action states for an execution (new granular data)
  const getActionStates = useCallback(
    (executionId) => actionStates.get(executionId) || [],
    [actionStates]
  );

  // Get streaming chunks for an action
  const getStreamingChunks = useCallback(
    (actionId) => streamingChunks.get(actionId) || [],
    [streamingChunks]
  );

  // Clear output for an execution
  const clearAgentOutput = useCallback((executionId) => {
    setAgentOutputs((prev) => {
      const next = new Map(prev);
      next.delete(executionId);
      return next;
    });
    setActionStates((prev) => {
      const next = new Map(prev);
      next.delete(executionId);
      return next;
    });
  }, []);

  // Clear streaming chunks for an action
  const clearStreamingChunks = useCallback((actionId) => {
    setStreamingChunks((prev) => {
      const next = new Map(prev);
      next.delete(actionId);
      return next;
    });
  }, []);

  // Get all currently running agents
  const getAllRunning = useCallback(() => {
    return Array.from(runningAgents.entries()).map(([agentId, state]) => ({
      agentId,
      ...state,
    }));
  }, [runningAgents]);

  return {
    isConnected,
    runningAgents: getAllRunning(),
    runningCount: runningAgents.size,
    recentEvents,
    getRunningAgent,
    getAgentOutput,
    getActionStates,
    getStreamingChunks,
    clearAgentOutput,
    clearStreamingChunks,
  };
}

/**
 * Simplified hook just for running agent count
 * Lightweight alternative when you only need the count
 */
export function useRunningAgentCount() {
  const { runningCount } = useAgentSocket();
  return runningCount;
}

export default useAgentSocket;
