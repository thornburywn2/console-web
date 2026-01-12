/**
 * Markdown Viewer Component
 * Renders CLAUDE.md and README files with styling
 */

import { useState, useEffect, useMemo } from 'react';

// Simple markdown parser (no external dependencies)
const parseMarkdown = (md) => {
  if (!md) return '';

  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Code blocks (must be first)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return '<pre class="code-block" data-lang="' + lang + '"><code>' + code.trim() + '</code></pre>';
    })

    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

    // Headers
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

    // Horizontal rules
    .replace(/^---+$/gm, '<hr />')
    .replace(/^\*\*\*+$/gm, '<hr />')

    // Bold and italic
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')

    // Strikethrough
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" />')

    // Blockquotes
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')

    // Unordered lists
    .replace(/^\s*[-*+]\s+(.+)$/gm, '<li class="ul-item">$1</li>')

    // Ordered lists
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="ol-item">$1</li>')

    // Task lists
    .replace(/<li class="ul-item">\[x\]\s*/gi, '<li class="task-item checked">')
    .replace(/<li class="ul-item">\[\s*\]\s*/g, '<li class="task-item">')

    // Tables (basic support)
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) {
        return '<tr class="table-separator"></tr>';
      }
      const cellHtml = cells.map(c => '<td>' + c + '</td>').join('');
      return '<tr>' + cellHtml + '</tr>';
    })

    // Paragraphs
    .replace(/\n\n+/g, '</p><p>')

    // Line breaks
    .replace(/\n/g, '<br />');

  // Wrap in paragraph
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br \/>/g, '<p>');

  // Wrap consecutive list items
  html = html.replace(/(<li class="ul-item">[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');
  html = html.replace(/(<li class="ol-item">[\s\S]*?<\/li>)+/g, '<ol>$&</ol>');
  html = html.replace(/(<li class="task-item[^"]*">[\s\S]*?<\/li>)+/g, '<ul class="task-list">$&</ul>');

  // Wrap tables
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table>$&</table>');

  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote><br \/><blockquote>/g, '<br />');

  return html;
};

// Extract table of contents
const extractTOC = (md) => {
  if (!md) return [];
  const headers = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = regex.exec(md)) !== null) {
    headers.push({
      level: match[1].length,
      text: match[2],
      id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    });
  }

  return headers;
};

export default function MarkdownViewer({
  filePath,
  content,
  title,
  isOpen,
  onClose,
  showTOC = true,
}) {
  const [markdown, setMarkdown] = useState(content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tocOpen, setTocOpen] = useState(true);

  // Fetch content if not provided
  useEffect(() => {
    if (content) {
      setMarkdown(content);
      return;
    }

    if (!filePath || !isOpen) return;

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/files/' + encodeURIComponent(filePath) + '/content');
        if (response.ok) {
          const text = await response.text();
          setMarkdown(text);
        } else {
          setError('Failed to load file');
        }
      } catch (err) {
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [filePath, content, isOpen]);

  const html = useMemo(() => parseMarkdown(markdown), [markdown]);
  const toc = useMemo(() => extractTOC(markdown), [markdown]);

  const scrollToHeader = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl overflow-hidden flex"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Table of Contents Sidebar */}
        {showTOC && toc.length > 0 && (
          <div
            className={'flex-shrink-0 overflow-hidden transition-all ' + (tocOpen ? 'w-64' : 'w-0')}
            style={{ borderRight: tocOpen ? '1px solid var(--border-subtle)' : 'none', background: 'var(--bg-tertiary)' }}
          >
            <div className="p-3 h-full overflow-y-auto">
              <div className="text-xs font-semibold text-muted uppercase mb-2">Contents</div>
              <nav className="space-y-1">
                {toc.map((header, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToHeader(header.id)}
                    className="block w-full text-left text-sm text-secondary hover:text-primary truncate"
                    style={{ paddingLeft: (header.level - 1) * 12 + 'px' }}
                  >
                    {header.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              {showTOC && toc.length > 0 && (
                <button
                  onClick={() => setTocOpen(!tocOpen)}
                  className="p-1 hover:bg-white/10 rounded"
                  title="Toggle contents"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              )}
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium text-primary">{title || filePath?.split('/').pop() || 'Markdown Viewer'}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="text-center text-muted">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-400">{error}</div>
            ) : (
              <article
                className="markdown-body prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Markdown styles */}
      <style>{`
        .markdown-body {
          color: var(--text-primary);
          line-height: 1.7;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3,
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          color: var(--text-primary);
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.3;
        }
        .markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.3em; }
        .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.3em; }
        .markdown-body h3 { font-size: 1.25em; }
        .markdown-body h4 { font-size: 1em; }
        .markdown-body h5 { font-size: 0.875em; }
        .markdown-body h6 { font-size: 0.85em; color: var(--text-muted); }

        .markdown-body p { margin: 1em 0; }

        .markdown-body a { color: var(--accent-primary); text-decoration: none; }
        .markdown-body a:hover { text-decoration: underline; }

        .markdown-body strong { font-weight: 600; }
        .markdown-body em { font-style: italic; }
        .markdown-body del { text-decoration: line-through; opacity: 0.7; }

        .markdown-body .code-block {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 1em;
          overflow-x: auto;
          margin: 1em 0;
          font-size: 0.875em;
        }
        .markdown-body .code-block code {
          background: none;
          padding: 0;
          white-space: pre;
        }

        .markdown-body .inline-code {
          background: var(--bg-tertiary);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.875em;
          font-family: monospace;
        }

        .markdown-body blockquote {
          border-left: 4px solid var(--accent-primary);
          margin: 1em 0;
          padding: 0.5em 1em;
          background: var(--bg-glass);
          color: var(--text-secondary);
        }

        .markdown-body ul, .markdown-body ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        .markdown-body li { margin: 0.25em 0; }

        .markdown-body .task-list { list-style: none; padding-left: 0; }
        .markdown-body .task-item { display: flex; align-items: center; gap: 0.5em; }
        .markdown-body .task-item::before {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid var(--border-default);
          border-radius: 3px;
          flex-shrink: 0;
        }
        .markdown-body .task-item.checked::before {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
        }

        .markdown-body hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 2em 0;
        }

        .markdown-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .markdown-body td, .markdown-body th {
          border: 1px solid var(--border-subtle);
          padding: 0.5em 1em;
        }
        .markdown-body tr:nth-child(even) {
          background: var(--bg-glass);
        }

        .markdown-body .md-image {
          max-width: 100%;
          border-radius: 6px;
          margin: 1em 0;
        }
      `}</style>
    </div>
  );
}
