/**
 * Macro Recorder Component
 * Record and replay command sequences
 */

import { useState, useEffect, useRef } from 'react';

export default function MacroRecorder({
  isOpen,
  onClose,
  onInsertMacro,
  sessionId,
}) {
  const [macros, setMacros] = useState([]);
  const [recording, setRecording] = useState(false);
  const [currentMacro, setCurrentMacro] = useState(null);
  const [commands, setCommands] = useState([]);
  const [macroName, setMacroName] = useState('');
  const [playing, setPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(-1);

  // Fetch saved macros
  useEffect(() => {
    const loadMacros = async () => {
      try {
        const stored = localStorage.getItem('command-portal-macros');
        if (stored) {
          setMacros(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load macros:', e);
      }
    };
    if (isOpen) loadMacros();
  }, [isOpen]);

  // Save macros to localStorage
  const saveMacros = (newMacros) => {
    setMacros(newMacros);
    localStorage.setItem('command-portal-macros', JSON.stringify(newMacros));
  };

  // Start recording
  const startRecording = () => {
    setRecording(true);
    setCommands([]);
    setMacroName('');
    setCurrentMacro(null);
  };

  // Stop recording and save
  const stopRecording = () => {
    if (commands.length === 0) {
      setRecording(false);
      return;
    }

    const name = macroName || 'Macro ' + (macros.length + 1);
    const newMacro = {
      id: crypto.randomUUID(),
      name,
      commands: [...commands],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    saveMacros([newMacro, ...macros]);
    setRecording(false);
    setCommands([]);
    setMacroName('');
  };

  // Add command during recording
  const addCommand = (command) => {
    if (recording) {
      setCommands(prev => [...prev, {
        id: crypto.randomUUID(),
        command,
        timestamp: Date.now(),
      }]);
    }
  };

  // Play macro
  const playMacro = async (macro) => {
    if (playing) return;

    setPlaying(true);
    setPlayingIndex(0);

    // Update usage count
    const updatedMacros = macros.map(m =>
      m.id === macro.id ? { ...m, usageCount: m.usageCount + 1 } : m
    );
    saveMacros(updatedMacros);

    for (let i = 0; i < macro.commands.length; i++) {
      setPlayingIndex(i);
      const cmd = macro.commands[i];

      // Insert command via callback
      if (onInsertMacro) {
        await onInsertMacro(cmd.command);
      }

      // Calculate delay (maintain timing ratios)
      if (i < macro.commands.length - 1) {
        const nextCmd = macro.commands[i + 1];
        const delay = Math.min(
          Math.max(nextCmd.timestamp - cmd.timestamp, 100),
          2000
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setPlaying(false);
    setPlayingIndex(-1);
  };

  // Delete macro
  const deleteMacro = (id) => {
    saveMacros(macros.filter(m => m.id !== id));
  };

  // Edit macro name
  const renameMacro = (id, newName) => {
    saveMacros(macros.map(m =>
      m.id === id ? { ...m, name: newName } : m
    ));
  };

  // Export macros
  const exportMacros = () => {
    const data = JSON.stringify(macros, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'command-portal-macros.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import macros
  const importMacros = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          saveMacros([...imported, ...macros]);
        }
      } catch (err) {
        console.error('Failed to import macros:', err);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Macro Recorder</h2>
            <span className="text-xs text-muted">({macros.length} saved)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Recording panel */}
        {recording && (
          <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(239,68,68,0.1)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-400 font-medium">Recording...</span>
              <span className="text-xs text-muted">{commands.length} command(s)</span>
            </div>

            <input
              type="text"
              value={macroName}
              onChange={(e) => setMacroName(e.target.value)}
              placeholder="Macro name (optional)"
              className="w-full px-3 py-2 rounded text-sm mb-3"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            />

            {commands.length > 0 && (
              <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                {commands.map((cmd, i) => (
                  <div key={cmd.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted">{i + 1}.</span>
                    <code className="text-secondary font-mono">{cmd.command}</code>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={stopRecording}
                className="flex-1 py-2 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
              >
                Stop Recording
              </button>
              <button
                onClick={() => { setRecording(false); setCommands([]); }}
                className="px-4 py-2 text-sm text-muted hover:text-primary"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-muted mt-2">
              Type commands in the terminal to record them
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {!recording && (
            <>
              {/* Actions */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={startRecording}
                  disabled={playing}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Record New Macro
                </button>
                <div className="flex-1" />
                <label className="px-3 py-1.5 text-xs text-accent hover:underline cursor-pointer">
                  Import
                  <input type="file" accept=".json" onChange={importMacros} className="hidden" />
                </label>
                <button
                  onClick={exportMacros}
                  disabled={macros.length === 0}
                  className="px-3 py-1.5 text-xs text-accent hover:underline disabled:opacity-50"
                >
                  Export
                </button>
              </div>

              {/* Macro list */}
              {macros.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted mb-2">No macros recorded yet</p>
                  <p className="text-xs text-muted">
                    Click "Record New Macro" and type commands in the terminal to create one
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {macros.map((macro, idx) => (
                    <div
                      key={macro.id}
                      className="flex items-start gap-3 p-3 rounded-lg group"
                      style={{ background: 'var(--bg-glass)' }}
                    >
                      {/* Play button */}
                      <button
                        onClick={() => playMacro(macro)}
                        disabled={playing}
                        className={'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ' +
                          (playing && playingIndex >= 0 && currentMacro?.id === macro.id
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-accent/20 text-accent hover:bg-accent/30')}
                      >
                        {playing && currentMacro?.id === macro.id ? (
                          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="6" width="4" height="12" rx="1" />
                            <rect x="14" y="6" width="4" height="12" rx="1" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-primary truncate">{macro.name}</h3>
                          <span className="text-xs text-muted">
                            {macro.commands.length} command{macro.commands.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-1">
                          Created {new Date(macro.createdAt).toLocaleDateString()} • Used {macro.usageCount} times
                        </div>
                        <div className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
                          {macro.commands.slice(0, 5).map((cmd, i) => (
                            <div key={cmd.id} className="flex items-center gap-2 text-xs">
                              <span className={'w-4 text-right ' + (playing && playingIndex === i && currentMacro?.id === macro.id ? 'text-green-400' : 'text-muted')}>
                                {i + 1}.
                              </span>
                              <code className="text-secondary font-mono truncate">{cmd.command}</code>
                            </div>
                          ))}
                          {macro.commands.length > 5 && (
                            <div className="text-xs text-muted ml-6">
                              +{macro.commands.length - 5} more...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            const name = prompt('Rename macro:', macro.name);
                            if (name) renameMacro(macro.id, name);
                          }}
                          className="p-1.5 text-muted hover:text-primary rounded"
                          title="Rename"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMacro(macro.id)}
                          className="p-1.5 text-muted hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>Macros are stored locally in your browser</span>
          {playing && <span className="text-green-400">Playing macro...</span>}
        </div>
      </div>
    </div>
  );
}

// Export hook for recording commands from terminal
export function useMacroRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const commandsRef = useRef([]);

  const startRecording = () => {
    setIsRecording(true);
    commandsRef.current = [];
  };

  const stopRecording = () => {
    setIsRecording(false);
    const commands = commandsRef.current;
    commandsRef.current = [];
    return commands;
  };

  const recordCommand = (command) => {
    if (isRecording) {
      commandsRef.current.push({
        id: crypto.randomUUID(),
        command,
        timestamp: Date.now(),
      });
    }
  };

  return { isRecording, startRecording, stopRecording, recordCommand };
}
