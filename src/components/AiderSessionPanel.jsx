/**
 * Aider Session Panel
 * P1 Phase 1: Aider AI Coding Assistant Integration
 *
 * Provides a UI for managing Aider sessions within Console.web.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

export function AiderSessionPanel({ projectPath, socket, onModeChange }) {
  const [status, setStatus] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [models, setModels] = useState({});
  const [config, setConfig] = useState(null);
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022');
  const [selectedProvider, setSelectedProvider] = useState('anthropic');

  const outputRef = useRef(null);
  const inputRef = useRef(null);

  // Check Aider status on mount
  useEffect(() => {
    checkStatus();
    loadModels();
    loadConfig();
  }, []);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Socket event listeners for active session
  useEffect(() => {
    if (!socket || !session) return;

    const handleOutput = (data) => {
      setOutput(prev => [...prev, { type: 'stdout', content: data, timestamp: Date.now() }]);
    };

    const handleError = (data) => {
      setOutput(prev => [...prev, { type: 'stderr', content: data, timestamp: Date.now() }]);
    };

    const handleStatus = (newStatus) => {
      setSession(prev => prev ? { ...prev, status: newStatus } : null);
    };

    const handleVoice = (voiceStatus) => {
      setSession(prev => prev ? { ...prev, voiceActive: voiceStatus === 'listening' } : null);
    };

    socket.on(`aider:${session.id}:output`, handleOutput);
    socket.on(`aider:${session.id}:error`, handleError);
    socket.on(`aider:${session.id}:status`, handleStatus);
    socket.on(`aider:${session.id}:voice`, handleVoice);

    return () => {
      socket.off(`aider:${session.id}:output`, handleOutput);
      socket.off(`aider:${session.id}:error`, handleError);
      socket.off(`aider:${session.id}:status`, handleStatus);
      socket.off(`aider:${session.id}:voice`, handleVoice);
    };
  }, [socket, session?.id]);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/aider/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to check Aider status:', err);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/aider/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/aider/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.defaultModel) setSelectedModel(data.defaultModel);
        if (data.defaultProvider) setSelectedProvider(data.defaultProvider);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const startSession = async () => {
    if (!projectPath) {
      setError('No project selected');
      return;
    }

    setLoading(true);
    setError(null);
    setOutput([]);

    try {
      const res = await fetch(`${API_URL}/api/aider/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          model: selectedModel,
          provider: selectedProvider,
          options: {}
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start session');
      }

      const data = await res.json();
      setSession(data.session);
      setOutput([{ type: 'info', content: `Session started with ${selectedModel}`, timestamp: Date.now() }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    if (!session) return;

    setLoading(true);
    try {
      await fetch(`${API_URL}/api/aider/sessions/${session.id}`, {
        method: 'DELETE'
      });
      setSession(null);
      setOutput(prev => [...prev, { type: 'info', content: 'Session stopped', timestamp: Date.now() }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendInput = async () => {
    if (!session || !input.trim()) return;

    const message = input.trim();
    setInput('');
    setOutput(prev => [...prev, { type: 'input', content: `> ${message}`, timestamp: Date.now() }]);

    try {
      await fetch(`${API_URL}/api/aider/sessions/${session.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: message })
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVoice = async () => {
    if (!session) return;

    const endpoint = session.voiceActive ? 'stop' : 'start';
    try {
      await fetch(`${API_URL}/api/aider/sessions/${session.id}/voice/${endpoint}`, {
        method: 'POST'
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendInput();
    }
  };

  const formatUptime = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Not installed view
  if (status && !status.installation?.installed) {
    return (
      <div className="p-4 bg-surface rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-2 text-text">Aider Not Installed</h3>
        <p className="text-text-secondary mb-4">
          Aider is an AI coding assistant that works in your terminal.
        </p>
        <code className="block p-3 bg-gray-900 rounded text-sm font-mono text-green-400">
          pip install aider-chat
        </code>
        <button
          onClick={checkStatus}
          className="mt-4 px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-text">Aider Session</h3>
          {session && (
            <span className={`px-2 py-0.5 rounded text-xs ${
              session.status === 'running' ? 'bg-green-500/20 text-green-400' :
              session.status === 'starting' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {session.status}
            </span>
          )}
          {session?.voiceActive && (
            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
              Voice Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {session && (
            <>
              <span className="text-xs text-text-secondary">
                {formatUptime(session.uptime)}
              </span>
              <button
                onClick={toggleVoice}
                className={`p-2 rounded transition-colors ${
                  session.voiceActive
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                    : 'hover:bg-surface text-text-secondary'
                }`}
                title={session.voiceActive ? 'Stop voice' : 'Start voice'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            </>
          )}

          {!session ? (
            <button
              onClick={startSession}
              disabled={loading || !projectPath}
              className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Start Session'}
            </button>
          ) : (
            <button
              onClick={stopSession}
              disabled={loading}
              className="px-3 py-1.5 bg-red-500/80 text-white rounded text-sm hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? 'Stopping...' : 'Stop'}
            </button>
          )}
        </div>
      </div>

      {/* Model Selection (when no session) */}
      {!session && (
        <div className="p-3 border-b border-border bg-surface-secondary/50 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-2 py-1 bg-surface border border-border rounded text-sm text-text"
            >
              {Object.entries(models).map(([key, provider]) => (
                <option key={key} value={key} disabled={!provider.available}>
                  {provider.name} {!provider.available && `(${provider.reason})`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-2 py-1 bg-surface border border-border rounded text-sm text-text"
            >
              {models[selectedProvider]?.models?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.recommended && '(recommended)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-gray-900/50 min-h-[200px]"
      >
        {output.length === 0 && !session && (
          <div className="text-text-secondary text-center py-8">
            {projectPath
              ? 'Start a session to begin coding with Aider'
              : 'Select a project to start an Aider session'
            }
          </div>
        )}
        {output.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap break-all ${
              line.type === 'stderr' ? 'text-red-400' :
              line.type === 'input' ? 'text-blue-400' :
              line.type === 'info' ? 'text-gray-400 italic' :
              'text-gray-200'
            }`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input Area */}
      {session && (
        <div className="p-3 border-t border-border bg-surface-secondary">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or command..."
              className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text placeholder:text-text-secondary focus:outline-none focus:border-accent"
              disabled={session.status !== 'running'}
            />
            <button
              onClick={sendInput}
              disabled={!input.trim() || session.status !== 'running'}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <div className="flex gap-2 mt-2 text-xs text-text-secondary">
            <button
              onClick={() => setInput('/add ')}
              className="hover:text-text"
            >
              /add
            </button>
            <button
              onClick={() => setInput('/drop ')}
              className="hover:text-text"
            >
              /drop
            </button>
            <button
              onClick={() => setInput('/diff')}
              className="hover:text-text"
            >
              /diff
            </button>
            <button
              onClick={() => setInput('/undo')}
              className="hover:text-text"
            >
              /undo
            </button>
            <button
              onClick={() => setInput('/clear')}
              className="hover:text-text"
            >
              /clear
            </button>
            <button
              onClick={() => setInput('/help')}
              className="hover:text-text"
            >
              /help
            </button>
          </div>
        </div>
      )}

      {/* Session Info Footer */}
      {session && (
        <div className="p-2 border-t border-border bg-surface-secondary/50 text-xs text-text-secondary flex justify-between">
          <span>Files: {session.filesAdded?.length || 0}</span>
          <span>{session.model} ({session.provider})</span>
        </div>
      )}
    </div>
  );
}

export default AiderSessionPanel;
