/**
 * Import Wizard Component
 * Import chat history from other AI tools (ChatGPT, Claude, etc.)
 */

import { useState, useCallback } from 'react';
import {
  IMPORT_SOURCES,
  parseChatGPT,
  parseClaude,
  parseGeneric,
  parseText,
  parseTerminal,
  SourceCard,
  ConversationPreview,
} from './import-wizard';

export default function ImportWizard({
  isOpen,
  onClose,
  onImport,
}) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState(null);
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState(new Set());

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(selectedFile);
  }, []);

  // Parse file content
  const parseContent = useCallback(() => {
    if (!fileContent || !source) return;

    setError(null);
    try {
      let conversations = [];

      if (source.parser === 'text' || source.parser === 'terminal') {
        const parser = source.parser === 'terminal' ? parseTerminal : parseText;
        conversations = parser(fileContent, file?.name);
      } else {
        const data = JSON.parse(fileContent);

        switch (source.parser) {
          case 'chatgpt':
            conversations = parseChatGPT(data);
            break;
          case 'claude':
            conversations = parseClaude(data);
            break;
          case 'generic':
          default:
            conversations = parseGeneric(data);
        }
      }

      if (conversations.length === 0) {
        setError('No conversations found in file');
        return;
      }

      setPreview(conversations);
      setSelectedConversations(new Set(conversations.map(c => c.id)));
      setStep(3);
    } catch (err) {
      setError('Failed to parse file: ' + err.message);
    }
  }, [fileContent, source, file]);

  // Handle import
  const handleImport = async () => {
    if (!preview || selectedConversations.size === 0) return;

    setImporting(true);
    try {
      const toImport = preview.filter(c => selectedConversations.has(c.id));
      await onImport?.(toImport);
      onClose();
    } catch (err) {
      setError('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Toggle conversation selection
  const toggleConversation = (id) => {
    setSelectedConversations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedConversations(new Set(preview?.map(c => c.id) || []));
  };

  const selectNone = () => {
    setSelectedConversations(new Set());
  };

  const reset = () => {
    setStep(1);
    setSource(null);
    setFile(null);
    setFileContent(null);
    setPreview(null);
    setError(null);
    setSelectedConversations(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Import History</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="flex items-center gap-1 mr-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={'w-2 h-2 rounded-full ' + (step >= s ? 'bg-accent' : 'bg-white/20')}
                />
              ))}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: Select Source */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-secondary">Select the source of your chat history:</p>
              <div className="grid grid-cols-1 gap-2">
                {IMPORT_SOURCES.map(src => (
                  <SourceCard
                    key={src.id}
                    source={src}
                    onClick={() => { setSource(src); setStep(2); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Upload File */}
          {step === 2 && source && (
            <div className="space-y-4">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-accent">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <span className="text-2xl">{source.icon}</span>
                <div>
                  <div className="font-medium text-primary">{source.name}</div>
                  <div className="text-xs text-muted">Accepted: {source.formats.join(', ')}</div>
                </div>
              </div>

              <label
                className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <svg className="w-10 h-10 text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-secondary">
                  {file ? file.name : 'Click to select file or drag and drop'}
                </span>
                <input
                  type="file"
                  accept={source.formats.map(f => '.' + f).join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {file && fileContent && (
                <button
                  onClick={parseContent}
                  className="w-full py-2 bg-accent text-white rounded-lg hover:bg-accent/80"
                >
                  Parse File
                </button>
              )}
            </div>
          )}

          {/* Step 3: Review and Import */}
          {step === 3 && preview && (
            <div className="space-y-4">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-accent">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary">
                  Found {preview.length} conversation{preview.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-accent">Select All</button>
                  <span className="text-muted">|</span>
                  <button onClick={selectNone} className="text-xs text-accent">Select None</button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {preview.map(conv => (
                  <ConversationPreview
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversations.has(conv.id)}
                    onToggle={() => toggleConversation(conv.id)}
                  />
                ))}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={reset} className="text-sm text-muted hover:text-primary">
            Start Over
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary hover:text-primary"
            >
              Cancel
            </button>
            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={importing || selectedConversations.size === 0}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import ' + selectedConversations.size + ' Conversation' + (selectedConversations.size !== 1 ? 's' : '')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
