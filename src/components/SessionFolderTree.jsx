/**
 * Session Folder Tree Component
 * Hierarchical folder view for organizing sessions
 */

import { useState, useEffect } from 'react';

export default function SessionFolderTree({
  folders = [],
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState(null);

  // Build tree structure from flat folder list
  const buildTree = (folders, parentId = null) => {
    return folders
      .filter(f => f.parentId === parentId)
      .map(folder => ({
        ...folder,
        children: buildTree(folders, folder.id)
      }));
  };

  const folderTree = buildTree(folders);

  // Toggle folder expansion
  const toggleExpand = (folderId) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  // Start editing folder name
  const startEdit = (folder) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  // Save edited name
  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      onRenameFolder?.(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  // Start creating new folder
  const startCreate = (parentId = null) => {
    setIsCreating(true);
    setNewFolderParentId(parentId);
    setNewFolderName('');
    if (parentId) {
      setExpandedFolders(prev => new Set([...prev, parentId]));
    }
  };

  // Save new folder
  const saveNewFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder?.(newFolderName.trim(), newFolderParentId);
    }
    setIsCreating(false);
    setNewFolderName('');
    setNewFolderParentId(null);
  };

  // Render a single folder
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group transition-colors ${
            isSelected
              ? 'bg-accent/10 text-accent'
              : 'hover:bg-white/5 text-secondary hover:text-primary'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelectFolder?.(folder.id)}
        >
          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(folder.id);
            }}
            className="w-4 h-4 flex items-center justify-center text-xs opacity-50 hover:opacity-100"
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : '·'}
          </button>

          {/* Folder Icon */}
          <span style={{ color: folder.color || 'var(--accent-secondary)' }}>
            {folder.icon || '📁'}
          </span>

          {/* Name */}
          {editingId === folder.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditingName('');
                }
              }}
              className="flex-1 bg-transparent border-b border-accent outline-none text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm truncate">{folder.name}</span>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startCreate(folder.id);
              }}
              className="p-1 hover:bg-white/10 rounded text-xs"
              title="Add subfolder"
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEdit(folder);
              }}
              className="p-1 hover:bg-white/10 rounded text-xs"
              title="Rename"
            >
              ✎
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${folder.name}"?`)) {
                  onDeleteFolder?.(folder.id);
                }
              }}
              className="p-1 hover:bg-red-500/20 rounded text-xs text-red-400"
              title="Delete"
            >
              ×
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && folder.children && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}

            {/* New folder input if creating under this folder */}
            {isCreating && newFolderParentId === folder.id && (
              <div
                className="flex items-center gap-2 px-2 py-1.5"
                style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
              >
                <span className="w-4"></span>
                <span>📁</span>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={saveNewFolder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveNewFolder();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder="New folder..."
                  className="flex-1 bg-transparent border-b border-accent outline-none text-sm"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Folders
        </span>
        <button
          onClick={() => startCreate(null)}
          className="p-1 hover:bg-white/10 rounded text-xs"
          title="New folder"
        >
          +
        </button>
      </div>

      {/* All Projects (root) */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
          selectedFolderId === null
            ? 'bg-accent/10 text-accent'
            : 'hover:bg-white/5 text-secondary hover:text-primary'
        }`}
        onClick={() => onSelectFolder?.(null)}
      >
        <span className="w-4"></span>
        <span>🏠</span>
        <span className="flex-1 text-sm">All Projects</span>
      </div>

      {/* Folder Tree */}
      {folderTree.map(folder => renderFolder(folder))}

      {/* New folder at root level */}
      {isCreating && newFolderParentId === null && (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="w-4"></span>
          <span>📁</span>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={saveNewFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNewFolder();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewFolderName('');
              }
            }}
            placeholder="New folder..."
            className="flex-1 bg-transparent border-b border-accent outline-none text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Empty State */}
      {folders.length === 0 && !isCreating && (
        <div className="px-2 py-4 text-center text-xs text-muted">
          No folders yet
        </div>
      )}
    </div>
  );
}
