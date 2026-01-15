import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

function Terminal({ socket, isReady, onInput, onResize, projectPath }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const containerRef = useRef(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

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
    });

    // Add fit addon for auto-resizing
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Add web links addon for clickable URLs
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    // Open terminal in the container
    term.open(terminalRef.current);

    // Copy selection to clipboard on mouse up (highlight-to-copy)
    const handleSelectionCopy = () => {
      const selection = term.getSelection();
      if (selection && selection.length > 0) {
        navigator.clipboard.writeText(selection).catch(err => {
          console.warn('Failed to copy to clipboard:', err);
        });
      }
    };

    // Listen for mouse up events on the terminal to trigger copy
    const terminalElement = terminalRef.current;
    terminalElement.addEventListener('mouseup', handleSelectionCopy);

    // Also support Ctrl+Shift+C for explicit copy
    term.attachCustomKeyEventHandler((event) => {
      // Ctrl+Shift+C - Copy
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection).catch(err => {
            console.warn('Failed to copy to clipboard:', err);
          });
        }
        return false; // Prevent default
      }
      // Ctrl+Shift+V - Paste
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        navigator.clipboard.readText().then(text => {
          if (text) {
            onInput(text);
          }
        }).catch(err => {
          console.warn('Failed to paste from clipboard:', err);
        });
        return false; // Prevent default
      }
      return true; // Allow other keys
    });

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

    // Handle user input
    term.onData((data) => {
      onInput(data);
    });

    // Store reference
    xtermRef.current = term;

    // Cleanup
    return () => {
      terminalElement.removeEventListener('mouseup', handleSelectionCopy);
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

  // Handle socket output
  useEffect(() => {
    if (!socket) return;

    const handleOutput = (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    };

    socket.on('terminal-output', handleOutput);

    return () => {
      socket.off('terminal-output', handleOutput);
    };
  }, [socket]);

  // Clear terminal and refit when project changes
  useEffect(() => {
    const term = xtermRef.current;
    if (term) {
      term.clear();
      term.reset();

      // Refit after clearing - check renderer is ready
      const attemptFit = (retries = 0) => {
        const fitAddon = fitAddonRef.current;
        if (fitAddon && term._core?._renderService?._renderer?.value) {
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
  }, [projectPath, onResize]);

  // Focus terminal when ready
  useEffect(() => {
    if (isReady && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [isReady]);

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
