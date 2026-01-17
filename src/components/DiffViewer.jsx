/**
 * Diff Viewer Component
 * Git diff visualization with syntax highlighting
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { diffApi } from '../services/api.js';

// Parse unified diff format
const parseDiff = (diffText) => {
  if (!diffText) return [];

  const files = [];
  const lines = diffText.split('\n');
  let currentFile = null;
  let currentHunk = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    // New file header
    if (line.startsWith('diff --git')) {
      if (currentFile) files.push(currentFile);
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      currentFile = {
        oldPath: match ? match[1] : '',
        newPath: match ? match[2] : '',
        hunks: [],
        additions: 0,
        deletions: 0,
        status: 'modified',
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // File status indicators
    if (line.startsWith('new file mode')) {
      currentFile.status = 'added';
      continue;
    }
    if (line.startsWith('deleted file mode')) {
      currentFile.status = 'deleted';
      continue;
    }
    if (line.startsWith('rename from')) {
      currentFile.status = 'renamed';
      continue;
    }
    if (line.startsWith('Binary files')) {
      currentFile.status = 'binary';
      continue;
    }

    // Skip header lines
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ')) {
      continue;
    }

    // Hunk header
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@(.*)?/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
        currentHunk = {
          header: line,
          context: match[3] || '',
          lines: [],
        };
        currentFile.hunks.push(currentHunk);
      }
      continue;
    }

    if (!currentHunk) continue;

    // Content lines
    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'addition',
        content: line.substring(1),
        oldNum: null,
        newNum: newLineNum++,
      });
      currentFile.additions++;
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'deletion',
        content: line.substring(1),
        oldNum: oldLineNum++,
        newNum: null,
      });
      currentFile.deletions++;
    } else if (line.startsWith(' ') || line === '') {
      currentHunk.lines.push({
        type: 'context',
        content: line.substring(1) || '',
        oldNum: oldLineNum++,
        newNum: newLineNum++,
      });
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
};

// Get status badge config
const getStatusConfig = (status) => {
  const configs = {
    added: { color: '#2ecc71', bg: 'rgba(46,204,113,0.1)', label: 'A' },
    deleted: { color: '#e74c3c', bg: 'rgba(231,76,60,0.1)', label: 'D' },
    modified: { color: '#f39c12', bg: 'rgba(243,156,18,0.1)', label: 'M' },
    renamed: { color: '#9b59b6', bg: 'rgba(155,89,182,0.1)', label: 'R' },
    binary: { color: '#95a5a6', bg: 'rgba(149,165,166,0.1)', label: 'B' },
  };
  return configs[status] || configs.modified;
};

function DiffFile({ file, isExpanded, onToggle }) {
  const statusConfig = getStatusConfig(file.status);
  const stats = '+' + file.additions + ' -' + file.deletions;

  return (
    <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* File header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-2 hover:bg-white/5 text-left"
      >
        <svg
          className={'w-4 h-4 text-muted transition-transform ' + (isExpanded ? 'rotate-90' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span
          className="px-1.5 py-0.5 text-xs font-mono rounded"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          {statusConfig.label}
        </span>
        <span className="flex-1 font-mono text-sm text-primary truncate">{file.newPath}</span>
        <span className="text-xs text-muted">{stats}</span>
        <span className="text-xs">
          <span className="text-green-400">+{file.additions}</span>
          {' '}
          <span className="text-red-400">-{file.deletions}</span>
        </span>
      </button>

      {/* Diff content */}
      {isExpanded && (
        <div className="overflow-x-auto" style={{ background: 'var(--bg-primary)' }}>
          {file.status === 'binary' ? (
            <div className="p-4 text-center text-muted text-sm">Binary file not shown</div>
          ) : (
            file.hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex}>
                {/* Hunk header */}
                <div
                  className="px-4 py-1 text-xs font-mono text-muted"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {hunk.header}
                </div>
                {/* Hunk lines */}
                <table className="w-full font-mono text-xs">
                  <tbody>
                    {hunk.lines.map((line, lineIndex) => {
                      let bgColor = 'transparent';
                      let textColor = 'var(--text-secondary)';
                      let prefix = ' ';

                      if (line.type === 'addition') {
                        bgColor = 'rgba(46,204,113,0.1)';
                        textColor = '#2ecc71';
                        prefix = '+';
                      } else if (line.type === 'deletion') {
                        bgColor = 'rgba(231,76,60,0.1)';
                        textColor = '#e74c3c';
                        prefix = '-';
                      }

                      return (
                        <tr key={lineIndex} style={{ background: bgColor }}>
                          <td className="w-12 px-2 py-0 text-right text-muted select-none" style={{ background: 'var(--bg-tertiary)' }}>
                            {line.oldNum || ''}
                          </td>
                          <td className="w-12 px-2 py-0 text-right text-muted select-none" style={{ background: 'var(--bg-tertiary)' }}>
                            {line.newNum || ''}
                          </td>
                          <td className="w-4 px-1 py-0 text-center" style={{ color: textColor }}>
                            {prefix}
                          </td>
                          <td className="px-2 py-0 whitespace-pre" style={{ color: textColor }}>
                            {line.content}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function DiffViewer({
  projectPath,
  commitHash,
  isOpen,
  onClose,
  embedded = false,
}) {
  const [diff, setDiff] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [viewMode, setViewMode] = useState('unified'); // unified or split

  // Fetch diff
  const fetchDiff = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const data = await diffApi.get(projectPath, commitHash);
      setDiff(data.diff || '');
      const parsed = parseDiff(data.diff);
      setFiles(parsed);
      // Expand first file by default
      if (parsed.length > 0) {
        setExpandedFiles(new Set([parsed[0].newPath]));
      }
    } catch (err) {
      setError('Error: ' + (err.getUserMessage?.() || err.message));
    } finally {
      setLoading(false);
    }
  }, [projectPath, commitHash]);

  useEffect(() => {
    if (isOpen || embedded) {
      fetchDiff();
    }
  }, [isOpen, embedded, fetchDiff]);

  const toggleFile = (filePath) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(files.map(f => f.newPath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  // Calculate totals
  const totals = files.reduce((acc, f) => ({
    additions: acc.additions + f.additions,
    deletions: acc.deletions + f.deletions,
  }), { additions: 0, deletions: 0 });

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded" style={{ background: 'rgba(243, 156, 18, 0.2)' }}>
          <div className="text-lg font-bold text-yellow-400">{files.length}</div>
          <div className="text-xs text-muted">Files</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(46, 204, 113, 0.2)' }}>
          <div className="text-lg font-bold text-green-400">+{totals.additions}</div>
          <div className="text-xs text-muted">Additions</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(231, 76, 60, 0.2)' }}>
          <div className="text-lg font-bold text-red-400">-{totals.deletions}</div>
          <div className="text-xs text-muted">Deletions</div>
        </div>
      </div>

      {/* File list preview */}
      <div className="space-y-1 max-h-40 overflow-auto">
        {files.slice(0, 5).map((file) => {
          const statusConfig = getStatusConfig(file.status);
          return (
            <div
              key={file.newPath}
              className="flex items-center gap-2 px-2 py-1 rounded text-sm"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
            >
              <span
                className="px-1 py-0.5 text-xs font-mono rounded"
                style={{ background: statusConfig.bg, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
              <span className="flex-1 text-primary truncate font-mono text-xs">{file.newPath}</span>
              <span className="text-xs">
                <span className="text-green-400">+{file.additions}</span>
                {' '}
                <span className="text-red-400">-{file.deletions}</span>
              </span>
            </div>
          );
        })}
        {files.length === 0 && !loading && (
          <div className="text-center text-xs text-muted py-4">No changes</div>
        )}
        {loading && (
          <div className="text-center text-xs text-muted py-4">Loading diff...</div>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchDiff}
        className="w-full py-2 text-sm rounded bg-white/10 hover:bg-white/20"
      >
        Refresh Diff
      </button>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="font-medium text-primary">Diff Viewer</span>
            {commitHash && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
                {commitHash.substring(0, 7)}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between p-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted">{files.length} files changed</span>
            <span className="text-green-400">+{totals.additions} additions</span>
            <span className="text-red-400">-{totals.deletions} deletions</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="px-2 py-1 text-xs text-muted hover:text-primary">
              Expand All
            </button>
            <button onClick={collapseAll} className="px-2 py-1 text-xs text-muted hover:text-primary">
              Collapse All
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading diff...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center text-muted">
              {diff ? 'Unable to parse diff' : 'No changes to display'}
            </div>
          ) : (
            files.map((file) => (
              <DiffFile
                key={file.newPath}
                file={file}
                isExpanded={expandedFiles.has(file.newPath)}
                onToggle={() => toggleFile(file.newPath)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>{projectPath}</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
