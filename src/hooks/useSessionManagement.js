/**
 * Session Management Hook
 * Manages folders, tags, and session organization state
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { foldersApi, tagsApi, sessionsApi } from '../services/api.js';

export function useSessionManagement() {
  // Folders state
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [foldersLoading, setFoldersLoading] = useState(true);

  // Tags state
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  // Multi-select state
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // View state
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'folders' | 'grid'

  // =============================================================================
  // FOLDERS API
  // =============================================================================

  const fetchFolders = useCallback(async () => {
    try {
      setFoldersLoading(true);
      const data = await foldersApi.list();
      setFolders(data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (name, parentId = null) => {
    try {
      const folder = await foldersApi.create(name, parentId);
      setFolders(prev => [...prev, folder]);
      return folder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }, []);

  const renameFolder = useCallback(async (id, name) => {
    try {
      const folder = await foldersApi.update(id, { name });
      setFolders(prev => prev.map(f => f.id === id ? folder : f));
      return folder;
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw error;
    }
  }, []);

  const deleteFolder = useCallback(async (id) => {
    try {
      await foldersApi.delete(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }, [selectedFolderId]);

  // =============================================================================
  // TAGS API
  // =============================================================================

  const fetchTags = useCallback(async () => {
    try {
      setTagsLoading(true);
      const data = await tagsApi.list();
      setTags(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  const createTag = useCallback(async ({ name, color }) => {
    try {
      const tag = await tagsApi.create({ name, color });
      setTags(prev => [...prev, tag]);
      return tag;
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  }, []);

  const updateTag = useCallback(async (id, updates) => {
    try {
      const tag = await tagsApi.update(id, updates);
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...tag } : t));
      return tag;
    } catch (error) {
      console.error('Error updating tag:', error);
      throw error;
    }
  }, []);

  const deleteTag = useCallback(async (id) => {
    try {
      await tagsApi.delete(id);
      setTags(prev => prev.filter(t => t.id !== id));
      setSelectedTags(prev => prev.filter(tagId => tagId !== id));
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }, []);

  const toggleTagFilter = useCallback((tagId) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      }
      return [...prev, tagId];
    });
  }, []);

  // =============================================================================
  // SESSION OPERATIONS
  // =============================================================================

  const toggleSessionSelect = useCallback((sessionId) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      // Exit multi-select mode if nothing selected
      if (next.size === 0) {
        setIsMultiSelectMode(false);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessions(new Set());
    setIsMultiSelectMode(false);
  }, []);

  const selectAll = useCallback((sessionIds) => {
    setSelectedSessions(new Set(sessionIds));
    setIsMultiSelectMode(true);
  }, []);

  const moveSessionToFolder = useCallback(async (sessionId, folderId) => {
    try {
      return await sessionsApi.setFolder(sessionId, folderId);
    } catch (error) {
      console.error('Error moving session:', error);
      throw error;
    }
  }, []);

  const pinSession = useCallback(async (sessionId, isPinned = true) => {
    try {
      return await sessionsApi.setPin(sessionId, isPinned);
    } catch (error) {
      console.error('Error pinning session:', error);
      throw error;
    }
  }, []);

  const archiveSession = useCallback(async (sessionId, isArchived = true) => {
    try {
      return await sessionsApi.setArchive(sessionId, isArchived);
    } catch (error) {
      console.error('Error archiving session:', error);
      throw error;
    }
  }, []);

  const addTagToSession = useCallback(async (sessionId, tagId) => {
    try {
      return await sessionsApi.addTag(sessionId, tagId);
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }, []);

  const removeTagFromSession = useCallback(async (sessionId, tagId) => {
    try {
      await sessionsApi.removeTag(sessionId, tagId);
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }, []);

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  const bulkPin = useCallback(async () => {
    const promises = Array.from(selectedSessions).map(id => pinSession(id, true));
    await Promise.allSettled(promises);
    clearSelection();
  }, [selectedSessions, pinSession, clearSelection]);

  const bulkUnpin = useCallback(async () => {
    const promises = Array.from(selectedSessions).map(id => pinSession(id, false));
    await Promise.allSettled(promises);
    clearSelection();
  }, [selectedSessions, pinSession, clearSelection]);

  const bulkArchive = useCallback(async () => {
    const promises = Array.from(selectedSessions).map(id => archiveSession(id, true));
    await Promise.allSettled(promises);
    clearSelection();
  }, [selectedSessions, archiveSession, clearSelection]);

  const bulkMove = useCallback(async (folderId) => {
    const promises = Array.from(selectedSessions).map(id => moveSessionToFolder(id, folderId));
    await Promise.allSettled(promises);
    clearSelection();
    fetchFolders(); // Refresh folder counts
  }, [selectedSessions, moveSessionToFolder, clearSelection, fetchFolders]);

  const bulkAddTag = useCallback(async (tagId) => {
    const promises = Array.from(selectedSessions).map(id => addTagToSession(id, tagId));
    await Promise.allSettled(promises);
    clearSelection();
    fetchTags(); // Refresh tag counts
  }, [selectedSessions, addTagToSession, clearSelection, fetchTags]);

  const bulkDelete = useCallback(async () => {
    try {
      await sessionsApi.bulk('delete', Array.from(selectedSessions));
      clearSelection();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      throw error;
    }
  }, [selectedSessions, clearSelection]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Load folders and tags on mount
  useEffect(() => {
    fetchFolders();
    fetchTags();
  }, [fetchFolders, fetchTags]);

  // Persist view preferences
  useEffect(() => {
    try {
      localStorage.setItem('cw-view-mode', viewMode);
      localStorage.setItem('cw-show-archived', JSON.stringify(showArchived));
    } catch {
      // Ignore localStorage errors
    }
  }, [viewMode, showArchived]);

  // Load view preferences
  useEffect(() => {
    try {
      const savedViewMode = localStorage.getItem('cw-view-mode');
      const savedShowArchived = localStorage.getItem('cw-show-archived');
      if (savedViewMode) setViewMode(savedViewMode);
      if (savedShowArchived) setShowArchived(JSON.parse(savedShowArchived));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return {
    // Folders
    folders,
    selectedFolderId,
    setSelectedFolderId,
    foldersLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    fetchFolders,

    // Tags
    tags,
    selectedTags,
    tagsLoading,
    createTag,
    updateTag,
    deleteTag,
    toggleTagFilter,
    fetchTags,

    // Multi-select
    selectedSessions,
    isMultiSelectMode,
    setIsMultiSelectMode,
    toggleSessionSelect,
    clearSelection,
    selectAll,

    // Session operations
    moveSessionToFolder,
    pinSession,
    archiveSession,
    addTagToSession,
    removeTagFromSession,

    // Bulk operations
    bulkPin,
    bulkUnpin,
    bulkArchive,
    bulkMove,
    bulkAddTag,
    bulkDelete,

    // View state
    showArchived,
    setShowArchived,
    viewMode,
    setViewMode
  };
}

export default useSessionManagement;
