/**
 * File Preview Component
 * Quick syntax-highlighted file preview
 */

import { useState, useEffect } from 'react';

// Simple syntax highlighting (basic patterns)
const highlightSyntax = (code, language) => {
  if (!code) return code;
  
  // Basic patterns for common languages
  const patterns = {
    keyword: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|extends|implements|interface|type|enum|public|private|protected|static|readonly)\b/g,
    string: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comment: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
    number: /\b\d+\.?\d*\b/g,
    function: /\b([a-zA-Z_]\w*)\s*\(/g,
  };

  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply highlighting
  result = result.replace(patterns.comment, '<span style="color: var(--text-muted)">$&</span>');
  result = result.replace(patterns.string, '<span style="color: #a5d6ff">$&</span>');
  result = result.replace(patterns.keyword, '<span style="color: #ff7b72">$&</span>');
  result = result.replace(patterns.number, '<span style="color: #79c0ff">$&</span>');

  return result;
};

// Detect language from extension
const detectLanguage = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    html: 'html', css: 'css', scss: 'scss', json: 'json',
    md: 'markdown', yml: 'yaml', yaml: 'yaml', sh: 'bash',
  };
  return langMap[ext] || 'text';
};

export default function FilePreview({
  file,
  content,
  isOpen,
  onClose,
  onInsertPath,
  onOpenInEditor,
}) {
  const [fileContent, setFileContent] = useState(content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && file && !content) {
      fetchContent();
    } else if (content) {
      setFileContent(content);
    }
  }, [isOpen, file, content]);

  const fetchContent = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/files/' + encodeURIComponent(file.path) + '/content');
      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
      } else {
        setError('Failed to load file');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const language = file ? detectLanguage(file.name) : 'text';
  const lines = fileContent.split('\n');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="font-medium text-primary">{file?.name || 'Preview'}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">{language}</span>
          </div>
          <div className="flex items-center gap-2">
            {onInsertPath && (
              <button
                onClick={() => onInsertPath(file.path)}
                className="px-3 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30"
              >
                Insert Path
              </button>
            )}
            {onOpenInEditor && (
              <button
                onClick={() => onOpenInEditor(file)}
                className="px-3 py-1 text-xs text-secondary hover:text-primary"
              >
                Open in Editor
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : (
            <div className="flex">
              {/* Line Numbers */}
              <div
                className="flex-shrink-0 py-3 px-2 text-right select-none"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {lines.map((_, i) => (
                  <div key={i} className="text-xs font-mono leading-5">{i + 1}</div>
                ))}
              </div>
              
              {/* Code */}
              <pre
                className="flex-1 p-3 overflow-x-auto text-xs font-mono leading-5"
                style={{ color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{ __html: highlightSyntax(fileContent, language) }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-2 text-xs text-muted" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
          <span>{lines.length} lines</span>
          <span>{file?.path || ''}</span>
        </div>
      </div>
    </div>
  );
}
