/**
 * Quick Chat Panel Component
 * Side panel for quick AI interactions without leaving terminal
 */

import { useState, useRef, useEffect } from 'react';
import PersonaSelector, { BUILT_IN_PERSONAS } from './PersonaSelector';

// Message component
function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
          isUser ? 'bg-accent/20 text-accent' : 'bg-white/10 text-secondary'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message Content */}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-accent/20 text-primary'
            : 'text-secondary'
        }`}
        style={!isUser ? { background: 'var(--bg-tertiary)' } : {}}
      >
        {message.content}
        <div className="text-2xs text-muted mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default function QuickChatPanel({
  isOpen,
  onClose,
  projectContext,
  onInsertToTerminal,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('default');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Available models
  const models = [
    { id: 'claude-sonnet', name: 'Claude Sonnet', description: 'Fast and capable' },
    { id: 'claude-opus', name: 'Claude Opus', description: 'Most powerful' },
    { id: 'claude-haiku', name: 'Claude Haiku', description: 'Quick responses' },
  ];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Get current persona
  const currentPersona = BUILT_IN_PERSONAS.find(p => p.id === selectedPersona) || BUILT_IN_PERSONAS[0];

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: generateMockResponse(userMessage.content, currentPersona, projectContext),
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock response (replace with actual API integration)
  const generateMockResponse = (query, persona, context) => {
    const responses = [
      `Based on my analysis, I would suggest the following approach...`,
      `Here's a possible solution you could try:\n\n\`\`\`bash\necho "Example command"\n\`\`\``,
      `Great question! Let me break this down for you...`,
      `I can help with that. First, let's understand the requirements...`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
  };

  // Copy message
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  // Insert command to terminal
  const handleInsert = (content) => {
    // Extract code blocks
    const codeMatch = content.match(/```(?:bash|shell|sh)?\n([\s\S]*?)```/);
    if (codeMatch) {
      onInsertToTerminal?.(codeMatch[1].trim());
    } else {
      onInsertToTerminal?.(content);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 z-40 flex flex-col shadow-2xl"
      style={{
        background: 'var(--bg-elevated)',
        borderLeft: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium text-primary">Quick Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-primary transition-colors"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-primary transition-colors"
            title="Close panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Model & Persona Selection */}
      <div className="p-2 flex gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Model Selector */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded text-xs"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>

        {/* Persona Selector */}
        <PersonaSelector
          selectedPersona={selectedPersona}
          onSelectPersona={(p) => setSelectedPersona(p.id)}
          compact
        />
      </div>

      {/* Project Context Indicator */}
      {projectContext && (
        <div className="px-3 py-1.5 text-2xs text-muted flex items-center gap-1" style={{ background: 'var(--bg-tertiary)' }}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Context: {projectContext}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-medium text-primary mb-1">Quick Chat</h3>
            <p className="text-xs text-muted">
              Ask questions, get help with code, or discuss your project without leaving the terminal.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setInputValue('Explain this error:')}
                className="p-2 rounded-lg text-left hover:bg-white/5"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-secondary">Explain error</span>
              </button>
              <button
                onClick={() => setInputValue('Suggest a command for:')}
                className="p-2 rounded-lg text-left hover:bg-white/5"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-secondary">Suggest command</span>
              </button>
              <button
                onClick={() => setInputValue('How do I:')}
                className="p-2 rounded-lg text-left hover:bg-white/5"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-secondary">How do I...</span>
              </button>
              <button
                onClick={() => setInputValue('Review this code:')}
                className="p-2 rounded-lg text-left hover:bg-white/5"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-secondary">Review code</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className="group">
              <ChatMessage message={message} isUser={message.role === 'user'} />
              {message.role === 'assistant' && (
                <div className="flex gap-1 mt-1 ml-9 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(message.content)}
                    className="text-2xs text-muted hover:text-primary"
                    title="Copy"
                  >
                    Copy
                  </button>
                  <span className="text-muted">|</span>
                  <button
                    onClick={() => handleInsert(message.content)}
                    className="text-2xs text-muted hover:text-primary"
                    title="Insert to terminal"
                  >
                    Insert
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs bg-white/10 text-secondary">
              AI
            </div>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask anything..."
            rows={2}
            className="w-full px-3 py-2 pr-10 rounded-lg text-sm resize-none"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors ${
              inputValue.trim() && !isLoading
                ? 'bg-accent text-white hover:bg-accent/80'
                : 'bg-white/10 text-muted cursor-not-allowed'
            }`}
            title="Send (Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-1 text-2xs text-muted">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="flex items-center gap-1">
            <span className="text-lg">{currentPersona.icon}</span>
            {currentPersona.name}
          </span>
        </div>
      </div>
    </div>
  );
}
