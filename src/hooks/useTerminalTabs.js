/**
 * useTerminalTabs Hook
 * Manages terminal tabs state, API calls, and socket events
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api/sessions';

/**
 * Hook for managing terminal tabs
 * @param {object} socket - Socket.IO instance
 * @param {string} projectPath - Current project path
 * @returns {object} Tab state and actions
 */
export function useTerminalTabs(socket, projectPath) {
  const [tabs, setTabs] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track project path changes
  const prevProjectPathRef = useRef(projectPath);

  // Request tabs sync from server
  const syncTabs = useCallback(() => {
    if (!socket || !projectPath) return;

    setIsLoading(true);
    socket.emit('tabs-sync', { projectPath });
  }, [socket, projectPath]);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    // Handle tabs sync response
    const handleTabsSync = ({ projectPath: syncProjectPath, tabs: syncTabs, activeSessionId: syncActiveId, error: syncError }) => {
      // Only handle sync for current project
      if (syncProjectPath !== projectPath) return;

      setIsLoading(false);

      if (syncError) {
        setError(syncError);
        return;
      }

      setTabs(syncTabs || []);
      setActiveSessionId(syncActiveId);
      setError(null);
    };

    // Handle tab selected confirmation
    const handleTabSelected = ({ projectPath: selectedProjectPath, sessionId, tab: _tab }) => {
      if (selectedProjectPath !== projectPath) return;
      setActiveSessionId(sessionId);
    };

    socket.on('tabs-sync', handleTabsSync);
    socket.on('tab-selected', handleTabSelected);

    return () => {
      socket.off('tabs-sync', handleTabsSync);
      socket.off('tab-selected', handleTabSelected);
    };
  }, [socket, projectPath]);

  // Sync tabs on mount and when project changes
  // Consolidated into single useEffect to prevent double-sync
  useEffect(() => {
    if (!socket || !projectPath) return;

    // Only sync if this is a new project (different from what we last synced)
    if (projectPath !== prevProjectPathRef.current) {
      prevProjectPathRef.current = projectPath;
      syncTabs();
    }
  }, [socket, projectPath, syncTabs]);

  // Emit tab-select when activeSessionId changes to ensure PTY is attached
  // This handles both initial load and tab switching
  const prevActiveIdRef = useRef(null);
  useEffect(() => {
    if (!socket || !projectPath || !activeSessionId) return;

    // Only emit if the active session actually changed
    if (activeSessionId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeSessionId;
      socket.emit('tab-select', { projectPath, sessionId: activeSessionId });
    }
  }, [socket, projectPath, activeSessionId]);

  // Create a new tab
  const createTab = useCallback(async (options = {}) => {
    if (!projectPath) {
      return null;
    }

    try {
      setIsLoading(true);
      // Encode each path segment separately, filtering empty strings to avoid double slashes
      const encodedPath = projectPath
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
      const url = `${API_BASE}/project/${encodedPath}/tabs`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(JSON.parse(errorText).error || 'Failed to create tab');
      }

      const newTab = await response.json();

      // Add to local state
      setTabs(prev => [...prev, newTab]);
      setActiveSessionId(newTab.id);

      return newTab;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  // Select a tab
  const selectTab = useCallback((sessionId) => {
    if (!socket || !projectPath || !sessionId) return;

    setActiveSessionId(sessionId);
    socket.emit('tab-select', { projectPath, sessionId });
  }, [socket, projectPath]);

  // Close a tab
  const closeTab = useCallback(async (sessionId) => {
    if (!sessionId) return;

    // Don't allow closing the last tab
    if (tabs.length <= 1) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${sessionId}/tab`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to close tab');
      }

      // Remove from local state
      setTabs(prev => prev.filter(t => t.id !== sessionId));

      // If closing active tab, switch to another
      if (activeSessionId === sessionId) {
        const currentIndex = tabs.findIndex(t => t.id === sessionId);
        const newActiveIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        const newActiveTab = tabs.filter(t => t.id !== sessionId)[newActiveIndex];
        if (newActiveTab) {
          selectTab(newActiveTab.id);
        }
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [tabs, activeSessionId, selectTab]);

  // Rename a tab
  const renameTab = useCallback(async (sessionId, newName) => {
    if (!sessionId || !newName) return;

    try {
      const response = await fetch(`${API_BASE}/${sessionId}/tab`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename tab');
      }

      const updatedTab = await response.json();

      // Update local state
      setTabs(prev => prev.map(t => t.id === sessionId ? { ...t, ...updatedTab } : t));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Change tab color
  const setTabColor = useCallback(async (sessionId, color) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_BASE}/${sessionId}/tab`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ color }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change tab color');
      }

      const updatedTab = await response.json();

      // Update local state
      setTabs(prev => prev.map(t => t.id === sessionId ? { ...t, ...updatedTab } : t));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Reorder tabs
  const reorderTabs = useCallback(async (sessionIds) => {
    if (!projectPath || !sessionIds.length) return;

    try {
      const encodedPath = projectPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
      const response = await fetch(`${API_BASE}/project/${encodedPath}/tabs/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder tabs');
      }

      const reorderedTabs = await response.json();
      setTabs(reorderedTabs);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [projectPath]);

  // Get next tab (for keyboard navigation)
  const getNextTab = useCallback(() => {
    if (!tabs.length) return null;
    const currentIndex = tabs.findIndex(t => t.id === activeSessionId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    return tabs[nextIndex];
  }, [tabs, activeSessionId]);

  // Get previous tab (for keyboard navigation)
  const getPreviousTab = useCallback(() => {
    if (!tabs.length) return null;
    const currentIndex = tabs.findIndex(t => t.id === activeSessionId);
    const prevIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
    return tabs[prevIndex];
  }, [tabs, activeSessionId]);

  // Select tab by index (1-based for keyboard shortcuts)
  const selectTabByIndex = useCallback((index) => {
    const tab = tabs[index - 1];
    if (tab) {
      selectTab(tab.id);
    }
  }, [tabs, selectTab]);

  // Get the active tab object
  const activeTab = tabs.find(t => t.id === activeSessionId) || tabs[0] || null;

  return {
    tabs,
    activeSessionId,
    activeTab,
    isLoading,
    error,

    // Actions
    createTab,
    selectTab,
    closeTab,
    renameTab,
    setTabColor,
    reorderTabs,
    syncTabs,

    // Navigation helpers
    getNextTab,
    getPreviousTab,
    selectTabByIndex,
  };
}

export default useTerminalTabs;
