/**
 * File Browser Component
 * Tree view navigation of project files
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '../services/api.js';

// File type icons
const getFileIcon = (name, isDirectory) => {
  if (isDirectory) return '📁';
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    js: '📜', jsx: '⚛️', ts: '💠', tsx: '⚛️',
    json: '📋', md: '📝', txt: '📄',
    html: '🌐', css: '🎨', scss: '🎨',
    py: '🐍', rs: '🦀', go: '🔷',
    sh: '💻', yml: '⚙️', yaml: '⚙️',
    env: '🔐', lock: '🔒',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
  };
  return icons[ext] || '📄';
};

function FileTreeNode({ node, level = 0, onSelect, onExpand, expandedPaths }) {
  const isExpanded = expandedPaths.has(node.path);
  const paddingLeft = 12 + level * 16;

  const handleClick = () => {
    if (node.isDirectory) {
      onExpand(node.path);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full text-left flex items-center gap-2 py-1 px-2 hover:bg-white/5 transition-colors"
        style={{ paddingLeft }}
      >
        {node.isDirectory && (
          <svg
            className={'w-3 h-3 text-muted transition-transform ' + (isExpanded ? 'rotate-90' : '')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!node.isDirectory && <span className="w-3" />}
        <span className="text-sm">{getFileIcon(node.name, node.isDirectory)}</span>
        <span className={'text-sm truncate ' + (node.isDirectory ? 'text-primary font-medium' : 'text-secondary')}>
          {node.name}
        </span>
      </button>
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onExpand={onExpand}
              expandedPaths={expandedPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileBrowser({
  projectPath,
  onSelectFile,
  onInsertPath,
  isOpen,
  onClose,
  embedded = false,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = useCallback(async (path) => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const data = await filesApi.list(path);
      setFiles(data);
    } catch (err) {
      const message = err.getUserMessage?.() || 'Failed to load files';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((isOpen || embedded) && projectPath) {
      fetchFiles(projectPath);
    }
  }, [isOpen, embedded, projectPath, fetchFiles]);

  const handleExpand = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (file) => {
    onSelectFile && onSelectFile(file);
  };

  const handleInsertPath = (file) => {
    onInsertPath && onInsertPath(file.path);
  };

  const filterFiles = (nodes, query) => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();
    return nodes.filter(node => {
      if (node.name.toLowerCase().includes(lowerQuery)) return true;
      if (node.isDirectory && node.children) {
        const filtered = filterFiles(node.children, query);
        if (filtered.length > 0) return true;
      }
      return false;
    });
  };

  const filteredFiles = filterFiles(files, searchQuery);

  if (!isOpen && !embedded) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="font-medium text-primary text-sm">Files</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 rounded text-xs"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted">Loading...</div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-red-400">{error}</div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </div>
        ) : (
          filteredFiles.map(node => (
            <FileTreeNode
              key={node.path}
              node={node}
              onSelect={handleSelect}
              onExpand={handleExpand}
              expandedPaths={expandedPaths}
            />
          ))
        )}
      </div>
    </div>
  );
}
