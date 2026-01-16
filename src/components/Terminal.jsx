import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import 'xterm/css/xterm.css';

// Debug logging for clipboard (shpool passes OSC 52 through natively)
const CLIPBOARD_DEBUG = false; // Set to true to debug clipboard issues
const clipboardLog = (...args) => CLIPBOARD_DEBUG && console.log('[Clipboard]', ...args);

// Debug logging for paste issues
const PASTE_DEBUG = false; // Set to true to debug paste duplication
const pasteLog = (...args) => PASTE_DEBUG && console.log('[Paste]', ...args);

// Cache terminal buffers per project path (survives component re-renders)
const terminalBufferCache = new Map();

function Terminal({ socket, isReady, onInput, onResize, projectPath }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const serializeAddonRef = useRef(null);
  const containerRef = useRef(null);
  const prevProjectPathRef = useRef(null); // Track previous project to avoid unnecessary clears
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [showCopyToast, setShowCopyToast] = useState(false); // Show "Copied!" feedback

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Handle command completion notifications
  useEffect(() => {
    if (!socket) return;

    const handleCommandComplete = ({ projectName, activityDuration }) => {
      const durationSec = (activityDuration / 1000).toFixed(1);

      // Show in-app toast notification
      setCompletionMessage(`Task complete (${durationSec}s)`);
      setShowCompletionToast(true);
      setTimeout(() => setShowCompletionToast(false), 3000);

      // Show browser notification if tab is not focused and permission granted
      if (document.hidden && notificationPermission === 'granted') {
        const notification = new Notification('Command Complete', {
          body: `${projectName}: Task finished (${durationSec}s)`,
          icon: '/favicon.ico',
          tag: `command-complete-${projectName}`,
          requireInteraction: false,
          silent: false
        });

        // Focus window when notification is clicked
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    };

    socket.on('command-complete', handleCommandComplete);

    return () => {
      socket.off('command-complete', handleCommandComplete);
    };
  }, [socket, notificationPermission]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create xterm instance with glassmorphism theme
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: 'transparent', // Transparent to show glass effect
        foreground: '#e8eff7',
        cursor: '#10b981',
        cursorAccent: '#0c0c0c',
        selectionBackground: 'rgba(16, 185, 129, 0.3)',
        black: '#1a1a1a',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e8eff7',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
      scrollback: 10000,
      convertEol: true,
      scrollOnUserInput: true,
      rightClickSelectsWord: false, // Allow browser's default right-click menu
    });

    // Add fit addon for auto-resizing
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Add serialize addon for buffer caching
    const serializeAddon = new SerializeAddon();
    term.loadAddon(serializeAddon);
    serializeAddonRef.current = serializeAddon;

    // Add web links addon for clickable URLs
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    // Open terminal in the container
    term.open(terminalRef.current);

    // Register OSC 52 handler for clipboard integration
    // OSC 52 format: ESC ] 52 ; <selection> ; <base64-data> BEL/ST
    // Shpool passes these through natively (no special config needed)
    const osc52Handler = term.parser.registerOscHandler(52, (data) => {
      clipboardLog('OSC 52 received, raw data length:', data.length);

      // Parse OSC 52 data: "c;<base64-encoded-text>" or ";<base64-encoded-text>"
      const semicolonIdx = data.indexOf(';');
      if (semicolonIdx === -1) {
        clipboardLog('OSC 52: No semicolon found in data');
        return true;
      }

      const selection = data.substring(0, semicolonIdx);
      const base64Data = data.substring(semicolonIdx + 1);

      clipboardLog('OSC 52: selection=', selection, 'base64 length=', base64Data.length);

      // Handle clipboard query (application asking for clipboard content)
      if (base64Data === '?') {
        clipboardLog('OSC 52: Query request, ignoring');
        return true;
      }

      // Skip empty data
      if (!base64Data || base64Data.length === 0) {
        clipboardLog('OSC 52: Empty base64 data');
        return true;
      }

      try {
        // Decode base64 to get the actual text
        const text = atob(base64Data);
        clipboardLog('OSC 52: Decoded text length:', text.length, 'preview:', text.substring(0, 100));

        if (text && text.length > 0) {
          navigator.clipboard.writeText(text)
            .then(() => {
              clipboardLog('OSC 52: SUCCESS - Copied to clipboard');
            })
            .catch(err => {
              clipboardLog('OSC 52: Clipboard API failed:', err.name, err.message);
              // Fallback for non-secure contexts
              try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                clipboardLog('OSC 52: Fallback execCommand result:', success);
              } catch (fallbackErr) {
                clipboardLog('OSC 52: Fallback also failed:', fallbackErr);
              }
            });
        }
      } catch (e) {
        clipboardLog('OSC 52: Base64 decode failed:', e.message, 'data preview:', base64Data.substring(0, 50));
      }
      return true; // Mark as handled
    });

    // Helper to copy text to clipboard with fallback
    const copyTextToClipboard = (text) => {
      if (!text || text.length === 0) return;

      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('Copied to clipboard:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        })
        .catch(err => {
          // Fallback for non-secure contexts: use execCommand
          console.warn('Clipboard API failed, trying fallback:', err);
          try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            console.log('Copied via fallback');
          } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
          }
        });
    };

    // Track the last valid selection to copy on mouseup
    let lastSelection = '';
    let selectionTimeout = null;
    let copyToastTimeout = null;

    // Use onSelectionChange to track selection as it happens
    const selectionDisposable = term.onSelectionChange(() => {
      const selection = term.getSelection();
      clipboardLog('Selection changed:', selection ? `"${selection.substring(0, 50)}..." (${selection.length} chars)` : 'none');
      if (selection && selection.length > 0) {
        lastSelection = selection;
      }
    });

    // Copy on mouseup using the tracked selection (auto-copy like native terminal)
    const handleMouseUp = (e) => {
      clipboardLog('MouseUp event, button:', e.button);
      // Skip if right-click (let browser handle it)
      if (e.button === 2) return;

      // Clear any pending timeout
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }

      // Small delay to ensure selection is finalized
      selectionTimeout = setTimeout(() => {
        // First try to get current selection
        const currentSelection = term.getSelection();
        const textToCopy = currentSelection && currentSelection.length > 0
          ? currentSelection
          : lastSelection;

        clipboardLog('MouseUp processing, currentSelection:', currentSelection?.length || 0, 'lastSelection:', lastSelection?.length || 0);

        if (textToCopy && textToCopy.length > 0) {
          clipboardLog('Copying text:', textToCopy.substring(0, 50));
          copyTextToClipboard(textToCopy);

          // Show copy toast feedback
          setShowCopyToast(true);
          if (copyToastTimeout) clearTimeout(copyToastTimeout);
          copyToastTimeout = setTimeout(() => setShowCopyToast(false), 1500);

          // Clear lastSelection after successful copy
          lastSelection = '';
        } else {
          clipboardLog('No text to copy');
        }
      }, 50);
    };

    const terminalElement = terminalRef.current;
    terminalElement.addEventListener('mouseup', handleMouseUp);

    // Track if we're handling a paste to prevent duplicates
    let pasteHandledAt = 0;
    let lastPasteSentAt = 0;  // Track when we actually sent paste to onInput

    // Custom key handler for copy/paste
    term.attachCustomKeyEventHandler((event) => {
      // Only handle keydown, not keyup
      if (event.type !== 'keydown') {
        return true;
      }

      // Ctrl+Shift+C - Copy
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const selection = term.getSelection();
        if (selection) {
          copyTextToClipboard(selection);
        }
        return false; // Prevent default
      }

      // Ctrl+Shift+V - Paste (we handle it, block xterm's handling)
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        const now = Date.now();
        pasteLog('Ctrl+Shift+V handler triggered (keydown)', { timeSinceLastSend: now - lastPasteSentAt });

        // Debounce: skip if we just sent a paste (within 200ms)
        if (now - lastPasteSentAt < 200) {
          pasteLog('Ctrl+Shift+V SKIPPED (debounced, sent too recently)');
          return false;
        }

        pasteHandledAt = now;
        lastPasteSentAt = now;
        navigator.clipboard.readText().then(text => {
          if (text) {
            pasteLog('Ctrl+Shift+V sending to onInput:', text.substring(0, 50));
            onInput(text);
          }
        }).catch(err => {
          console.warn('Failed to paste from clipboard:', err);
        });
        return false; // Prevent xterm's default paste handling
      }

      // Ctrl+V (regular paste) - also handle to prevent xterm double-fire
      if (event.ctrlKey && !event.shiftKey && event.key === 'v') {
        const now = Date.now();
        pasteLog('Ctrl+V handler triggered (keydown)', { timeSinceLastSend: now - lastPasteSentAt });

        // Debounce: skip if we just sent a paste (within 200ms)
        if (now - lastPasteSentAt < 200) {
          pasteLog('Ctrl+V SKIPPED (debounced, sent too recently)');
          return false;
        }

        pasteHandledAt = now;
        lastPasteSentAt = now;
        navigator.clipboard.readText().then(text => {
          if (text) {
            pasteLog('Ctrl+V sending to onInput:', text.substring(0, 50));
            onInput(text);
          }
        }).catch(err => {
          console.warn('Failed to paste from clipboard:', err);
        });
        return false; // Prevent xterm's default paste handling
      }

      return true; // Allow other keys
    });

    // Intercept browser paste event to prevent xterm from also handling it
    const handlePaste = (event) => {
      const now = Date.now();

      // If we already handled this paste via key handler, skip
      if (now - lastPasteSentAt < 200) {
        pasteLog('Browser paste event blocked (already handled, debounced)');
        event.preventDefault();
        return;
      }

      // Handle right-click paste or menu paste
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        pasteLog('Browser paste event handling:', text.substring(0, 50));
        pasteHandledAt = now;
        lastPasteSentAt = now;
        event.preventDefault();
        onInput(text);
      }
    };
    terminalElement.addEventListener('paste', handlePaste);

    // Initial fit - wait for renderer to be ready
    const attemptFit = (retries = 0) => {
      try {
        // Check if renderer is ready before fitting
        if (term._core && term._core._renderService && term._core._renderService._renderer?.value) {
          fitAddon.fit();
          onResize(term.cols, term.rows);
        } else if (retries < 10) {
          // Retry with exponential backoff
          setTimeout(() => attemptFit(retries + 1), 50 * (retries + 1));
        }
      } catch (err) {
        if (retries < 10) {
          setTimeout(() => attemptFit(retries + 1), 50 * (retries + 1));
        } else {
          console.error('Initial fit error after retries:', err);
        }
      }
    };

    // Start initial fit attempt after a short delay
    setTimeout(() => attemptFit(), 100);

    // Handle user input - skip if we just handled a paste via key handler
    term.onData((data) => {
      const now = Date.now();
      const isPaste = data.length > 1;
      const recentlyHandledPaste = (now - lastPasteSentAt) < 200;

      pasteLog('onData fired:', {
        dataLength: data.length,
        dataPreview: data.substring(0, 50),
        isPaste,
        recentlyHandledPaste,
        timeSinceLastPasteSent: now - lastPasteSentAt
      });

      // Skip if this is paste data and we already handled it via key handler
      if (isPaste && recentlyHandledPaste) {
        pasteLog('BLOCKED onData (already handled by paste handler)');
        return;
      }

      pasteLog('SENDING to onInput');
      onInput(data);
    });

    // Store reference
    xtermRef.current = term;

    // Cleanup
    return () => {
      terminalElement.removeEventListener('mouseup', handleMouseUp);
      terminalElement.removeEventListener('paste', handlePaste);
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      if (copyToastTimeout) {
        clearTimeout(copyToastTimeout);
      }
      selectionDisposable.dispose();
      osc52Handler.dispose();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [onInput, onResize]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const term = xtermRef.current;
      const fitAddon = fitAddonRef.current;
      // Check if terminal and renderer are ready before fitting
      if (fitAddon && term && term._core?._renderService?._renderer?.value) {
        try {
          fitAddon.fit();
          onResize(term.cols, term.rows);
        } catch (err) {
          // Silently ignore resize errors - terminal may be in transition
        }
      }
    };

    // Debounced resize handler
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(debouncedResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', debouncedResize);
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [onResize]);

  // Helper to check if terminal renderer is ready
  const isTerminalReady = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return false;
    try {
      // Check if the render service and dimensions are available
      return !!(term._core?._renderService?._renderer?.value?.dimensions);
    } catch {
      return false;
    }
  }, []);

  // Handle socket output
  useEffect(() => {
    if (!socket) return;

    const handleOutput = (data) => {
      const term = xtermRef.current;
      if (!term) return;

      // Debug: Check for OSC 52 in incoming data
      if (typeof data === 'string' && data.includes('\x1b]52')) {
        clipboardLog('OSC 52 sequence DETECTED in incoming terminal data!');
        clipboardLog('Data around OSC 52:', data.substring(data.indexOf('\x1b]52'), Math.min(data.indexOf('\x1b]52') + 200, data.length)));
      }

      try {
        // Only write if renderer is ready to prevent viewport dimension errors
        if (isTerminalReady()) {
          term.write(data);
        } else {
          // Queue the write for when terminal is ready
          const attemptWrite = (retries = 0) => {
            if (isTerminalReady()) {
              term.write(data);
            } else if (retries < 10) {
              setTimeout(() => attemptWrite(retries + 1), 50);
            }
          };
          setTimeout(() => attemptWrite(), 50);
        }
      } catch (err) {
        // Silently ignore write errors during reconnection
        console.debug('Terminal write error (likely during reconnect):', err.message);
      }
    };

    socket.on('terminal-output', handleOutput);

    return () => {
      socket.off('terminal-output', handleOutput);
    };
  }, [socket, isTerminalReady]);

  // Save/restore terminal buffer when switching projects
  useEffect(() => {
    const term = xtermRef.current;
    const serializeAddon = serializeAddonRef.current;
    const prevPath = prevProjectPathRef.current;
    const isDifferentProject = prevPath && prevPath !== projectPath;

    if (term && isTerminalReady()) {
      // Save current buffer before switching (if we have a previous project)
      if (isDifferentProject && prevPath && serializeAddon) {
        try {
          const serialized = serializeAddon.serialize();
          if (serialized && serialized.length > 0) {
            terminalBufferCache.set(prevPath, serialized);
            console.debug(`[Terminal] Saved buffer for ${prevPath} (${serialized.length} chars)`);
          }
        } catch (err) {
          console.debug('Failed to save terminal buffer:', err.message);
        }
      }

      // Clear terminal for the new project
      if (isDifferentProject) {
        try {
          term.clear();
          term.reset();
        } catch (err) {
          console.debug('Terminal clear error:', err.message);
        }

        // Restore cached buffer if available for the new project
        const cachedBuffer = terminalBufferCache.get(projectPath);
        if (cachedBuffer) {
          try {
            term.write(cachedBuffer);
            console.debug(`[Terminal] Restored buffer for ${projectPath}`);
          } catch (err) {
            console.debug('Failed to restore terminal buffer:', err.message);
          }
        }
      }

      // Refit terminal
      const attemptFit = (retries = 0) => {
        const fitAddon = fitAddonRef.current;
        if (fitAddon && isTerminalReady()) {
          try {
            fitAddon.fit();
            onResize(term.cols, term.rows);
          } catch (err) {
            if (retries < 5) {
              setTimeout(() => attemptFit(retries + 1), 50);
            }
          }
        } else if (retries < 5) {
          setTimeout(() => attemptFit(retries + 1), 50);
        }
      };

      setTimeout(() => attemptFit(), 50);
    }

    // Update previous project reference
    prevProjectPathRef.current = projectPath;
  }, [projectPath, onResize, isTerminalReady]);

  // Focus terminal and refresh screen when ready
  useEffect(() => {
    if (isReady && xtermRef.current && isTerminalReady()) {
      const term = xtermRef.current;
      const fitAddon = fitAddonRef.current;

      try {
        // Focus the terminal
        term.focus();

        // Force xterm.js to repaint all rows
        term.refresh(0, term.rows - 1);

        // Trigger a resize immediately to send dimensions to server
        // This is critical for shpool sessions to redraw content
        if (fitAddon) {
          try {
            fitAddon.fit();
            onResize(term.cols, term.rows);
          } catch (err) {
            console.debug('Immediate fit error:', err.message);
          }

          // Follow-up resize after a short delay to ensure content is drawn
          setTimeout(() => {
            try {
              fitAddon.fit();
              onResize(term.cols, term.rows);
              term.refresh(0, term.rows - 1);
            } catch (err) {
              console.debug('Follow-up fit error:', err.message);
            }
          }, 150);
        }
      } catch (err) {
        console.debug('Terminal focus/refresh error:', err.message);
      }
    }
  }, [isReady, isTerminalReady, onResize]);

  return (
    <div ref={containerRef} className="terminal-container h-full relative m-3">
      {/* Glass background with blur - z-index -1 to be behind terminal */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'rgba(12, 12, 12, 0.5)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border-subtle)',
          zIndex: -1,
        }}
      />

      {/* Command completion toast */}
      {showCompletionToast && (
        <div
          className="absolute top-3 right-3 z-20 px-4 py-2 rounded-lg animate-pulse"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-sm font-mono text-green-400">
              {completionMessage}
            </span>
          </div>
        </div>
      )}

      {/* Copy toast feedback */}
      {showCopyToast && (
        <div
          className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(59, 130, 246, 0.9)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-sm font-mono text-white">📋 Copied!</span>
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl" style={{ background: 'rgba(12, 12, 12, 0.7)' }}>
          <div className="glass-elevated text-center p-8 rounded-xl">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 w-12 h-12 mx-auto rounded-full animate-ping" style={{ background: 'rgba(16, 185, 129, 0.2)' }} />
              <svg className="w-12 h-12 mx-auto mb-4 animate-spin relative z-10" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>
              {'>'} INITIALIZING SESSION...
            </p>
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
              Establishing secure connection
            </p>
          </div>
        </div>
      )}
      <div
        ref={terminalRef}
        className="terminal-wrapper h-full relative z-10 rounded-xl"
        style={{ opacity: isReady ? 1 : 0.3 }}
      />
    </div>
  );
}

export default Terminal;
