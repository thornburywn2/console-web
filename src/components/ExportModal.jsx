/**
 * Export Modal Component
 * Export session history in various formats
 */

import { useState } from 'react';

const EXPORT_FORMATS = [
  {
    id: 'markdown',
    name: 'Markdown',
    extension: '.md',
    icon: '📝',
    description: 'Formatted markdown with code blocks',
  },
  {
    id: 'text',
    name: 'Plain Text',
    extension: '.txt',
    icon: '📄',
    description: 'Simple text without formatting',
  },
  {
    id: 'json',
    name: 'JSON',
    extension: '.json',
    icon: '🔧',
    description: 'Structured data for programmatic use',
  },
  {
    id: 'html',
    name: 'HTML',
    extension: '.html',
    icon: '🌐',
    description: 'Styled HTML page for viewing',
  },
];

const CONTENT_OPTIONS = [
  { id: 'commands', label: 'Commands', description: 'Include commands entered' },
  { id: 'output', label: 'Output', description: 'Include command output' },
  { id: 'timestamps', label: 'Timestamps', description: 'Include time information' },
  { id: 'metadata', label: 'Metadata', description: 'Include session info' },
];

// Generate markdown export
const generateMarkdown = (session, options) => {
  let md = '# Session Export\n\n';

  if (options.metadata) {
    md += '## Session Information\n\n';
    md += '| Property | Value |\n';
    md += '|----------|-------|\n';
    md += '| **Project** | ' + (session.projectPath || 'N/A') + ' |\n';
    md += '| **Created** | ' + (session.createdAt || new Date().toISOString()) + ' |\n';
    md += '| **Session ID** | ' + (session.id || 'N/A') + ' |\n';
    md += '\n---\n\n';
  }

  md += '## Terminal History\n\n';

  if (session.history && session.history.length > 0) {
    session.history.forEach((entry, i) => {
      if (options.timestamps && entry.timestamp) {
        md += '**[' + entry.timestamp + ']**\n\n';
      }

      if (options.commands && entry.command) {
        md += '```bash\n' + entry.command + '\n```\n\n';
      }

      if (options.output && entry.output) {
        md += '```\n' + entry.output + '\n```\n\n';
      }
    });
  } else if (session.content) {
    md += '```\n' + session.content + '\n```\n';
  } else {
    md += '*No history available*\n';
  }

  md += '\n---\n\n*Exported from Console.web on ' + new Date().toISOString() + '*\n';

  return md;
};

// Generate plain text export
const generateText = (session, options) => {
  let text = '=== Session Export ===\n\n';

  if (options.metadata) {
    text += 'Project: ' + (session.projectPath || 'N/A') + '\n';
    text += 'Created: ' + (session.createdAt || 'N/A') + '\n';
    text += 'Session ID: ' + (session.id || 'N/A') + '\n';
    text += '\n' + '='.repeat(40) + '\n\n';
  }

  text += 'Terminal History:\n\n';

  if (session.history && session.history.length > 0) {
    session.history.forEach((entry) => {
      if (options.timestamps && entry.timestamp) {
        text += '[' + entry.timestamp + ']\n';
      }
      if (options.commands && entry.command) {
        text += '$ ' + entry.command + '\n';
      }
      if (options.output && entry.output) {
        text += entry.output + '\n';
      }
      text += '\n';
    });
  } else if (session.content) {
    text += session.content + '\n';
  } else {
    text += '(No history available)\n';
  }

  text += '\n' + '='.repeat(40) + '\n';
  text += 'Exported: ' + new Date().toISOString() + '\n';

  return text;
};

// Generate JSON export
const generateJSON = (session, options) => {
  const data = {
    exportedAt: new Date().toISOString(),
    exportFormat: 'command-portal-v1',
  };

  if (options.metadata) {
    data.session = {
      id: session.id,
      projectPath: session.projectPath,
      createdAt: session.createdAt,
      name: session.name,
    };
  }

  data.history = (session.history || []).map(entry => {
    const item = {};
    if (options.timestamps) item.timestamp = entry.timestamp;
    if (options.commands) item.command = entry.command;
    if (options.output) item.output = entry.output;
    return item;
  });

  if (!session.history && session.content) {
    data.content = session.content;
  }

  return JSON.stringify(data, null, 2);
};

// Generate HTML export
const generateHTML = (session, options) => {
  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '  <meta charset="UTF-8">\n';
  html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '  <title>Session Export - ' + (session.name || session.id || 'Terminal') + '</title>\n';
  html += '  <style>\n';
  html += '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; max-width: 900px; margin: 0 auto; padding: 2rem; }\n';
  html += '    h1 { color: #9b59b6; border-bottom: 2px solid #9b59b6; padding-bottom: 0.5rem; }\n';
  html += '    .metadata { background: #16213e; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }\n';
  html += '    .metadata dt { color: #9b59b6; font-weight: bold; }\n';
  html += '    .metadata dd { margin: 0 0 0.5rem 0; }\n';
  html += '    .entry { margin-bottom: 1.5rem; }\n';
  html += '    .timestamp { color: #7f8c8d; font-size: 0.875rem; }\n';
  html += '    .command { background: #0f3460; padding: 0.75rem 1rem; border-radius: 6px; font-family: monospace; margin: 0.5rem 0; border-left: 3px solid #9b59b6; }\n';
  html += '    .command::before { content: "$ "; color: #9b59b6; }\n';
  html += '    .output { background: #16213e; padding: 0.75rem 1rem; border-radius: 6px; font-family: monospace; white-space: pre-wrap; font-size: 0.875rem; overflow-x: auto; }\n';
  html += '    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #333; color: #7f8c8d; font-size: 0.75rem; }\n';
  html += '  </style>\n';
  html += '</head>\n<body>\n';

  html += '  <h1>Session Export</h1>\n';

  if (options.metadata) {
    html += '  <dl class="metadata">\n';
    html += '    <dt>Project</dt><dd>' + (session.projectPath || 'N/A') + '</dd>\n';
    html += '    <dt>Created</dt><dd>' + (session.createdAt || 'N/A') + '</dd>\n';
    html += '    <dt>Session ID</dt><dd>' + (session.id || 'N/A') + '</dd>\n';
    html += '  </dl>\n';
  }

  html += '  <h2>Terminal History</h2>\n';

  if (session.history && session.history.length > 0) {
    session.history.forEach(entry => {
      html += '  <div class="entry">\n';
      if (options.timestamps && entry.timestamp) {
        html += '    <div class="timestamp">' + entry.timestamp + '</div>\n';
      }
      if (options.commands && entry.command) {
        html += '    <div class="command">' + escapeHtml(entry.command) + '</div>\n';
      }
      if (options.output && entry.output) {
        html += '    <div class="output">' + escapeHtml(entry.output) + '</div>\n';
      }
      html += '  </div>\n';
    });
  } else if (session.content) {
    html += '  <div class="output">' + escapeHtml(session.content) + '</div>\n';
  } else {
    html += '  <p><em>No history available</em></p>\n';
  }

  html += '  <footer>Exported from Console.web on ' + new Date().toISOString() + '</footer>\n';
  html += '</body>\n</html>';

  return html;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export default function ExportModal({
  isOpen,
  onClose,
  session,
}) {
  const [format, setFormat] = useState('markdown');
  const [options, setOptions] = useState({
    commands: true,
    output: true,
    timestamps: true,
    metadata: true,
  });
  const [preview, setPreview] = useState('');
  const [exporting, setExporting] = useState(false);

  const toggleOption = (id) => {
    setOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate preview
  const generatePreview = () => {
    if (!session) return '';

    switch (format) {
      case 'markdown':
        return generateMarkdown(session, options);
      case 'text':
        return generateText(session, options);
      case 'json':
        return generateJSON(session, options);
      case 'html':
        return generateHTML(session, options);
      default:
        return '';
    }
  };

  const handleExport = () => {
    setExporting(true);

    try {
      const content = generatePreview();
      const formatConfig = EXPORT_FORMATS.find(f => f.id === format);
      const filename = 'session-export-' + new Date().toISOString().slice(0, 10) + formatConfig.extension;

      const mimeTypes = {
        markdown: 'text/markdown',
        text: 'text/plain',
        json: 'application/json',
        html: 'text/html',
      };

      const blob = new Blob([content], { type: mimeTypes[format] });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async () => {
    const content = generatePreview();
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Export Session</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  className={'flex items-center gap-3 p-3 rounded-lg border transition-colors ' +
                    (format === fmt.id
                      ? 'border-accent bg-accent/10'
                      : 'border-transparent hover:bg-white/5')}
                  style={{ background: format === fmt.id ? undefined : 'var(--bg-glass)' }}
                >
                  <span className="text-2xl">{fmt.icon}</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-primary">{fmt.name}</div>
                    <div className="text-xs text-muted">{fmt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Options */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Include Content</label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5"
                  style={{ background: 'var(--bg-glass)' }}
                >
                  <input
                    type="checkbox"
                    checked={options[opt.id]}
                    onChange={() => toggleOption(opt.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <div className="text-sm text-primary">{opt.label}</div>
                    <div className="text-xs text-muted">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary">Preview</label>
              <button
                onClick={copyToClipboard}
                className="text-xs text-accent hover:underline"
              >
                Copy to clipboard
              </button>
            </div>
            <pre
              className="p-3 rounded-lg text-xs font-mono overflow-auto max-h-48"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              {generatePreview().substring(0, 2000)}
              {generatePreview().length > 2000 && '\n\n... (truncated)'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
