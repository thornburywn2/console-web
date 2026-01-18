/**
 * useSessionManagement Hook Tests
 * Phase 5.3: Unit tests for session management hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManagement } from './useSessionManagement';

// Mock the API services
vi.mock('../services/api.js', () => ({
  foldersApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  tagsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sessionsApi: {
    setFolder: vi.fn(),
    setPin: vi.fn(),
    setArchive: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    bulk: vi.fn(),
  },
}));

import { foldersApi, tagsApi, sessionsApi } from '../services/api.js';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    reset: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('useSessionManagement', () => {
  const mockFolders = [
    { id: 'folder-1', name: 'Work', parentId: null },
    { id: 'folder-2', name: 'Personal', parentId: null },
  ];

  const mockTags = [
    { id: 'tag-1', name: 'Important', color: '#ff0000' },
    { id: 'tag-2', name: 'Review', color: '#00ff00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.reset();
    foldersApi.list.mockResolvedValue(mockFolders);
    tagsApi.list.mockResolvedValue(mockTags);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should fetch folders on mount', async () => {
      renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(foldersApi.list).toHaveBeenCalled();
      });
    });

    it('should fetch tags on mount', async () => {
      renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(tagsApi.list).toHaveBeenCalled();
      });
    });

    it('should set folders loading to false after fetch', async () => {
      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.foldersLoading).toBe(false);
      });
    });

    it('should set tags loading to false after fetch', async () => {
      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.tagsLoading).toBe(false);
      });
    });
  });

  describe('folders API', () => {
    it('should populate folders after fetch', async () => {
      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.folders).toEqual(mockFolders);
      });
    });

    it('should create a folder', async () => {
      const newFolder = { id: 'folder-3', name: 'New Folder', parentId: null };
      foldersApi.create.mockResolvedValue(newFolder);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.folders).toEqual(mockFolders);
      });

      await act(async () => {
        await result.current.createFolder('New Folder');
      });

      expect(foldersApi.create).toHaveBeenCalledWith('New Folder', null);
      expect(result.current.folders).toContainEqual(newFolder);
    });

    it('should create folder with parent', async () => {
      const newFolder = { id: 'folder-3', name: 'Sub Folder', parentId: 'folder-1' };
      foldersApi.create.mockResolvedValue(newFolder);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.foldersLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createFolder('Sub Folder', 'folder-1');
      });

      expect(foldersApi.create).toHaveBeenCalledWith('Sub Folder', 'folder-1');
    });

    it('should rename a folder', async () => {
      const updatedFolder = { id: 'folder-1', name: 'Updated Name', parentId: null };
      foldersApi.update.mockResolvedValue(updatedFolder);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.foldersLoading).toBe(false);
      });

      await act(async () => {
        await result.current.renameFolder('folder-1', 'Updated Name');
      });

      expect(foldersApi.update).toHaveBeenCalledWith('folder-1', { name: 'Updated Name' });
      expect(result.current.folders.find(f => f.id === 'folder-1')?.name).toBe('Updated Name');
    });

    it('should delete a folder', async () => {
      foldersApi.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.foldersLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteFolder('folder-1');
      });

      expect(foldersApi.delete).toHaveBeenCalledWith('folder-1');
      expect(result.current.folders.find(f => f.id === 'folder-1')).toBeUndefined();
    });

    it('should clear selected folder when deleting it', async () => {
      foldersApi.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.foldersLoading).toBe(false);
      });

      act(() => {
        result.current.setSelectedFolderId('folder-1');
      });

      expect(result.current.selectedFolderId).toBe('folder-1');

      await act(async () => {
        await result.current.deleteFolder('folder-1');
      });

      expect(result.current.selectedFolderId).toBeNull();
    });
  });

  describe('tags API', () => {
    it('should populate tags after fetch', async () => {
      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.tags).toEqual(mockTags);
      });
    });

    it('should create a tag', async () => {
      const newTag = { id: 'tag-3', name: 'New Tag', color: '#0000ff' };
      tagsApi.create.mockResolvedValue(newTag);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.tagsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createTag({ name: 'New Tag', color: '#0000ff' });
      });

      expect(tagsApi.create).toHaveBeenCalledWith({ name: 'New Tag', color: '#0000ff' });
      expect(result.current.tags).toContainEqual(newTag);
    });

    it('should update a tag', async () => {
      const updatedTag = { id: 'tag-1', name: 'Updated', color: '#ff00ff' };
      tagsApi.update.mockResolvedValue(updatedTag);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.tagsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTag('tag-1', { name: 'Updated', color: '#ff00ff' });
      });

      expect(tagsApi.update).toHaveBeenCalledWith('tag-1', { name: 'Updated', color: '#ff00ff' });
    });

    it('should delete a tag', async () => {
      tagsApi.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.tagsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      expect(tagsApi.delete).toHaveBeenCalledWith('tag-1');
      expect(result.current.tags.find(t => t.id === 'tag-1')).toBeUndefined();
    });

    it('should toggle tag filter', async () => {
      const { result } = renderHook(() => useSessionManagement());

      await waitFor(() => {
        expect(result.current.tagsLoading).toBe(false);
      });

      expect(result.current.selectedTags).toEqual([]);

      act(() => {
        result.current.toggleTagFilter('tag-1');
      });

      expect(result.current.selectedTags).toContain('tag-1');

      act(() => {
        result.current.toggleTagFilter('tag-1');
      });

      expect(result.current.selectedTags).not.toContain('tag-1');
    });
  });

  describe('session selection', () => {
    it('should toggle session selection', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.toggleSessionSelect('session-1');
      });

      expect(result.current.selectedSessions.has('session-1')).toBe(true);

      act(() => {
        result.current.toggleSessionSelect('session-1');
      });

      expect(result.current.selectedSessions.has('session-1')).toBe(false);
    });

    it('should exit multi-select mode when no selections', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.setIsMultiSelectMode(true);
        result.current.toggleSessionSelect('session-1');
      });

      expect(result.current.isMultiSelectMode).toBe(true);

      act(() => {
        result.current.toggleSessionSelect('session-1');
      });

      expect(result.current.isMultiSelectMode).toBe(false);
    });

    it('should clear all selections', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.toggleSessionSelect('session-1');
        result.current.toggleSessionSelect('session-2');
        result.current.setIsMultiSelectMode(true);
      });

      expect(result.current.selectedSessions.size).toBe(2);
      expect(result.current.isMultiSelectMode).toBe(true);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedSessions.size).toBe(0);
      expect(result.current.isMultiSelectMode).toBe(false);
    });

    it('should select all sessions', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.selectAll(['session-1', 'session-2', 'session-3']);
      });

      expect(result.current.selectedSessions.size).toBe(3);
      expect(result.current.isMultiSelectMode).toBe(true);
    });
  });

  describe('session operations', () => {
    it('should move session to folder', async () => {
      sessionsApi.setFolder.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSessionManagement());

      await act(async () => {
        await result.current.moveSessionToFolder('session-1', 'folder-1');
      });

      expect(sessionsApi.setFolder).toHaveBeenCalledWith('session-1', 'folder-1');
    });

    it('should pin session', async () => {
      sessionsApi.setPin.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSessionManagement());

      await act(async () => {
        await result.current.pinSession('session-1', true);
      });

      expect(sessionsApi.setPin).toHaveBeenCalledWith('session-1', true);
    });

    it('should archive session', async () => {
      sessionsApi.setArchive.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSessionManagement());

      await act(async () => {
        await result.current.archiveSession('session-1', true);
      });

      expect(sessionsApi.setArchive).toHaveBeenCalledWith('session-1', true);
    });

    it('should add tag to session', async () => {
      sessionsApi.addTag.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSessionManagement());

      await act(async () => {
        await result.current.addTagToSession('session-1', 'tag-1');
      });

      expect(sessionsApi.addTag).toHaveBeenCalledWith('session-1', 'tag-1');
    });

    it('should remove tag from session', async () => {
      sessionsApi.removeTag.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSessionManagement());

      await act(async () => {
        await result.current.removeTagFromSession('session-1', 'tag-1');
      });

      expect(sessionsApi.removeTag).toHaveBeenCalledWith('session-1', 'tag-1');
    });
  });

  describe('bulk operations', () => {
    beforeEach(async () => {
      sessionsApi.setPin.mockResolvedValue({ success: true });
      sessionsApi.setArchive.mockResolvedValue({ success: true });
      sessionsApi.setFolder.mockResolvedValue({ success: true });
      sessionsApi.addTag.mockResolvedValue({ success: true });
      sessionsApi.bulk.mockResolvedValue({ success: true });
    });

    it('should bulk pin sessions', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.selectAll(['session-1', 'session-2']);
      });

      await act(async () => {
        await result.current.bulkPin();
      });

      expect(sessionsApi.setPin).toHaveBeenCalledTimes(2);
      expect(result.current.selectedSessions.size).toBe(0);
    });

    it('should bulk unpin sessions', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.selectAll(['session-1', 'session-2']);
      });

      await act(async () => {
        await result.current.bulkUnpin();
      });

      expect(sessionsApi.setPin).toHaveBeenCalledWith('session-1', false);
      expect(sessionsApi.setPin).toHaveBeenCalledWith('session-2', false);
    });

    it('should bulk archive sessions', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.selectAll(['session-1', 'session-2']);
      });

      await act(async () => {
        await result.current.bulkArchive();
      });

      expect(sessionsApi.setArchive).toHaveBeenCalledTimes(2);
    });

    it('should bulk move sessions to folder', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.selectAll(['session-1', 'session-2']);
      });

      await act(async () => {
        await result.current.bulkMove('folder-1');
      });

      expect(sessionsApi.setFolder).toHaveBeenCalledWith('session-1', 'folder-1');
      expect(sessionsApi.setFolder).toHaveBeenCalledWith('session-2', 'folder-1');
    });

    it('should bulk delete sessions', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.selectAll(['session-1', 'session-2']);
      });

      await act(async () => {
        await result.current.bulkDelete();
      });

      expect(sessionsApi.bulk).toHaveBeenCalledWith('delete', ['session-1', 'session-2']);
    });
  });

  describe('view state', () => {
    it('should default viewMode to list', async () => {
      const { result } = renderHook(() => useSessionManagement());

      expect(result.current.viewMode).toBe('list');
    });

    it('should toggle showArchived', async () => {
      const { result } = renderHook(() => useSessionManagement());

      expect(result.current.showArchived).toBe(false);

      act(() => {
        result.current.setShowArchived(true);
      });

      expect(result.current.showArchived).toBe(true);
    });

    it('should change viewMode', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(result.current.viewMode).toBe('grid');
    });

    it('should persist viewMode to localStorage', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.setViewMode('folders');
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cw-view-mode', 'folders');
      });
    });

    it('should persist showArchived to localStorage', async () => {
      const { result } = renderHook(() => useSessionManagement());

      act(() => {
        result.current.setShowArchived(true);
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cw-show-archived', 'true');
      });
    });
  });
});
