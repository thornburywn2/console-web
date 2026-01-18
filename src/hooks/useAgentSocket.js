/**
 * useAgentSocket Hook
 * Provides real-time agent status and output updates via Socket.IO
 * Phase 3.5: Mission Control - Agent Observability
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Socket URL - same as main app
const SOCKET_URL = '';

/**
 * Hook for subscribing to agent events
 * @returns {Object} Agent event state and handlers
 */
export function useAgentSocket() {
  const [runningAgents, setRunningAgents] = useState(new Map()); // agentId -> execution state
  const [agentOutputs, setAgentOutputs] = useState(new Map()); // executionId -> output lines
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
      console.log('[AgentSocket] Connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[AgentSocket] Disconnected');
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

    // Handle agent output
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

  // Get output for an execution
  const getAgentOutput = useCallback(
    (executionId) => agentOutputs.get(executionId) || [],
    [agentOutputs]
  );

  // Clear output for an execution
  const clearAgentOutput = useCallback((executionId) => {
    setAgentOutputs((prev) => {
      const next = new Map(prev);
      next.delete(executionId);
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
    clearAgentOutput,
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
