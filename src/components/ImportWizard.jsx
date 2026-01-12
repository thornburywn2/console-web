/**
 * Import Wizard Component
 * Import chat history from other AI tools (ChatGPT, Claude, etc.)
 */

import { useState, useCallback } from 'react';

const IMPORT_SOURCES = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '🤖',
    description: 'Import from OpenAI ChatGPT export',
    formats: ['json'],
    parser: 'chatgpt',
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: '🧠',
    description: 'Import from Anthropic Claude export',
    formats: ['json'],
    parser: 'claude',
  },
  {
    id: 'generic',
    name: 'Generic JSON',
    icon: '📄',
    description: 'Import from generic JSON format',
    formats: ['json'],
    parser: 'generic',
  },
  {
    id: 'text',
    name: 'Plain Text',
    icon: '📝',
    description: 'Import from plain text file',
    formats: ['txt', 'md'],
    parser: 'text',
  },
  {
    id: 'terminal',
    name: 'Terminal Log',
    icon: '💻',
    description: 'Import terminal session log',
    formats: ['txt', 'log'],
    parser: 'terminal',
  },
];

// Parse ChatGPT export format
const parseChatGPT = (data) => {
  const conversations = [];

  // ChatGPT exports as array or object with conversations
  const items = Array.isArray(data) ? data : data.conversations || [data];

  for (const item of items) {
    const conv = {
      id: item.id || crypto.randomUUID(),
      title: item.title || 'Imported Conversation',
      createdAt: item.create_time ? new Date(item.create_time * 1000).toISOString() : new Date().toISOString(),
      messages: [],
    };

    // Parse message tree
    const mapping = item.mapping || {};
    for (const nodeId of Object.keys(mapping)) {
      const node = mapping[nodeId];
      if (node.message && node.message.content && node.message.content.parts) {
        const content = node.message.content.parts.join('\n');
        if (content.trim()) {
          conv.messages.push({
            role: node.message.author?.role || 'unknown',
            content: content,
            timestamp: node.message.create_time
              ? new Date(node.message.create_time * 1000).toISOString()
              : null,
          });
        }
      }
    }

    if (conv.messages.length > 0) {
      conversations.push(conv);
    }
  }

  return conversations;
};

// Parse Claude export format
const parseClaude = (data) => {
  const conversations = [];

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const conv = {
      id: item.uuid || item.id || crypto.randomUUID(),
      title: item.name || item.title || 'Imported Conversation',
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      messages: [],
    };

    const messages = item.chat_messages || item.messages || [];
    for (const msg of messages) {
      conv.messages.push({
        role: msg.sender || msg.role || 'unknown',
        content: msg.text || msg.content || '',
        timestamp: msg.created_at || msg.timestamp || null,
      });
    }

    if (conv.messages.length > 0) {
      conversations.push(conv);
    }
  }

  return conversations;
};

// Parse generic JSON format
const parseGeneric = (data) => {
  const conversations = [];

  // Try to detect format
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const conv = {
      id: item.id || crypto.randomUUID(),
      title: item.title || item.name || 'Imported Conversation',
      createdAt: item.createdAt || item.created_at || item.timestamp || new Date().toISOString(),
      messages: [],
    };

    // Look for messages in common locations
    const messages = item.messages || item.chat || item.history || item.conversation || [];

    for (const msg of messages) {
      conv.messages.push({
        role: msg.role || msg.sender || msg.author || 'unknown',
        content: msg.content || msg.text || msg.message || String(msg),
        timestamp: msg.timestamp || msg.created_at || msg.time || null,
      });
    }

    // If no messages found but item has content, treat as single message
    if (conv.messages.length === 0 && (item.content || item.text)) {
      conv.messages.push({
        role: 'user',
        content: item.content || item.text,
        timestamp: null,
      });
    }

    if (conv.messages.length > 0) {
      conversations.push(conv);
    }
  }

  return conversations;
};

// Parse plain text file
const parseText = (text, filename) => {
  const lines = text.split('\n');
  const messages = [];

  let currentRole = 'user';
  let currentContent = [];

  for (const line of lines) {
    // Detect role changes
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.startsWith('user:') || lowerLine.startsWith('human:') || lowerLine.startsWith('me:')) {
      if (currentContent.length > 0) {
        messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
      }
      currentRole = 'user';
      currentContent = [line.substring(line.indexOf(':') + 1).trim()];
    } else if (lowerLine.startsWith('assistant:') || lowerLine.startsWith('ai:') || lowerLine.startsWith('claude:') || lowerLine.startsWith('chatgpt:')) {
      if (currentContent.length > 0) {
        messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
      }
      currentRole = 'assistant';
      currentContent = [line.substring(line.indexOf(':') + 1).trim()];
    } else {
      currentContent.push(line);
    }
  }

  // Add last message
  if (currentContent.length > 0) {
    messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
  }

  // Filter empty messages
  const filteredMessages = messages.filter(m => m.content.trim());

  return [{
    id: crypto.randomUUID(),
    title: filename || 'Imported Text',
    createdAt: new Date().toISOString(),
    messages: filteredMessages,
  }];
};

// Parse terminal log
const parseTerminal = (text, filename) => {
  const lines = text.split('\n');
  const commands = [];

  let currentCommand = null;
  let currentOutput = [];

  for (const line of lines) {
    // Detect command prompts
    if (line.match(/^[$#>]\s/) || line.match(/^\w+[@:]/)) {
      if (currentCommand) {
        commands.push({
          role: 'user',
          content: currentCommand,
          output: currentOutput.join('\n').trim(),
        });
      }
      currentCommand = line.replace(/^[$#>]\s*/, '').trim();
      currentOutput = [];
    } else if (currentCommand) {
      currentOutput.push(line);
    }
  }

  // Add last command
  if (currentCommand) {
    commands.push({
      role: 'user',
      content: currentCommand,
      output: currentOutput.join('\n').trim(),
    });
  }

  // Convert to messages format
  const messages = [];
  for (const cmd of commands) {
    messages.push({ role: 'user', content: '$ ' + cmd.content });
    if (cmd.output) {
      messages.push({ role: 'assistant', content: cmd.output });
    }
  }

  return [{
    id: crypto.randomUUID(),
    title: filename || 'Terminal Session',
    createdAt: new Date().toISOString(),
    messages: messages,
  }];
};

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
                  <button
                    key={src.id}
                    onClick={() => { setSource(src); setStep(2); }}
                    className="flex items-center gap-4 p-4 rounded-lg text-left hover:bg-white/5 transition-colors"
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span className="text-3xl">{src.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-primary">{src.name}</div>
                      <div className="text-sm text-muted">{src.description}</div>
                      <div className="text-xs text-muted mt-1">
                        Formats: {src.formats.join(', ')}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
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
                  <label
                    key={conv.id}
                    className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5"
                    style={{ background: 'var(--bg-glass)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedConversations.has(conv.id)}
                      onChange={() => toggleConversation(conv.id)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary truncate">{conv.title}</div>
                      <div className="text-xs text-muted">
                        {conv.messages.length} messages • {new Date(conv.createdAt).toLocaleDateString()}
                      </div>
                      {conv.messages[0] && (
                        <div className="text-xs text-secondary mt-1 truncate">
                          {conv.messages[0].content.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </label>
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
