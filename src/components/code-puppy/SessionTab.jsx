/**
 * Session Tab Component
 * Displays session list and terminal interface
 */

import { useRef, useEffect } from 'react';
import { formatUptime } from './constants';

export default function SessionTab({
  sessions,
  activeSession,
  setActiveSession,
  sessionOutput,
  setSessionOutput,
  inputValue,
  setInputValue,
  onStopSession,
  onRemoveSession,
  onSendInput,
  actionLoading,
}) {
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [sessionOutput]);

  return (
    <div className="space-y-4">
      {/* Session List */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">Sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-muted text-sm">No sessions. Create one from the Status tab.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} onClick={() => { setActiveSession(s.id); setSessionOutput([]); }}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  activeSession === s.id ? 'bg-primary/20 border border-primary/50' : 'bg-surface hover:bg-surface-hover'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{s.projectPath.split('/').pop()}</span>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${
                      s.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted">{formatUptime(s.uptime)}</span>
                    {s.status === 'running' && (
                      <button onClick={(e) => { e.stopPropagation(); onStopSession(s.id); }}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">■</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onRemoveSession(s.id); }}
                      className="p-1 rounded hover:bg-red-500/20 text-red-400 text-xs">✕</button>
                  </div>
                </div>
                <div className="text-xs text-muted">{s.agent} | {s.model}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminal */}
      {activeSession && (
        <div className="glass-panel rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-black/30 border-b border-border">
            <span className="text-sm font-medium text-foreground">Terminal</span>
            <button onClick={() => setSessionOutput([])} className="text-xs text-muted hover:text-foreground">Clear</button>
          </div>
          <div ref={outputRef} className="h-72 overflow-y-auto p-3 font-mono text-xs bg-black/50">
            {sessionOutput.map((item, i) => (
              <div key={i} className={`whitespace-pre-wrap ${
                item.type === 'input' ? 'text-green-400' : item.type === 'error' ? 'text-red-400' : 'text-gray-300'
              }`}>
                {item.type === 'input' && <span className="text-blue-400">{'>>> '}</span>}
                {item.data}
              </div>
            ))}
            {sessionOutput.length === 0 && <span className="text-muted">Waiting for output...</span>}
          </div>
          <form onSubmit={onSendInput} className="flex border-t border-border">
            <span className="px-2 py-2 text-green-400 bg-black/30 text-sm">{'>>>'}</span>
            <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or /command..."
              className="flex-1 px-2 py-2 bg-black/30 text-foreground text-sm focus:outline-none" />
            <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
