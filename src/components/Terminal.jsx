import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import 'xterm/css/xterm.css';

import {
  XTERM_THEME,
  XTERM_OPTIONS,
  clipboardLog,
  pasteLog,
  terminalBufferCache,
  copyTextToClipboard,
} from './terminal';
import { CompletionToast, CopyToast, LoadingOverlay } from './terminal';

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

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create xterm instance with glassmorphism theme
    const term = new XTerm({
      ...XTERM_OPTIONS,
      theme: XTERM_THEME,
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

    // Add Unicode11 addon for proper Unicode character width calculation
    // This is essential for block drawing characters (used in Claude CLI logo)
    const unicode11Addon = new Unicode11Addon();
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';

    // Open terminal in the container using double-rAF to ensure browser layout is complete
    let terminalOpened = false;
    let openRAF2;

    const doOpen = () => {
      const container = terminalRef.current;
      if (!container || terminalOpened) return;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        term.open(container);
        terminalOpened = true;
      }
    };

    // Double rAF: first rAF schedules after current frame, second ensures after next paint
    const openRAF1 = requestAnimationFrame(() => {
      openRAF2 = requestAnimationFrame(() => {
        doOpen();
      });
    });

    // Register OSC 52 handler for clipboard integration
    const osc52Handler = term.parser.registerOscHandler(52, (data) => {
      clipboardLog('OSC 52 received, raw data length:', data.length);

      const semicolonIdx = data.indexOf(';');
      if (semicolonIdx === -1) {
        clipboardLog('OSC 52: No semicolon found in data');
        return true;
      }

      const selection = data.substring(0, semicolonIdx);
      const base64Data = data.substring(semicolonIdx + 1);

      clipboardLog('OSC 52: selection=', selection, 'base64 length=', base64Data.length);

      if (base64Data === '?') {
        clipboardLog('OSC 52: Query request, ignoring');
        return true;
      }

      if (!base64Data || base64Data.length === 0) {
        clipboardLog('OSC 52: Empty base64 data');
        return true;
      }

      try {
        const text = atob(base64Data);
        clipboardLog('OSC 52: Decoded text length:', text.length, 'preview:', text.substring(0, 100));

        if (text && text.length > 0) {
          navigator.clipboard.writeText(text)
            .then(() => {
              clipboardLog('OSC 52: SUCCESS - Copied to clipboard');
            })
            .catch(err => {
              clipboardLog('OSC 52: Clipboard API failed:', err.name, err.message);
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
      return true;
    });

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
      if (e.button === 2) return;

      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }

      selectionTimeout = setTimeout(() => {
        const currentSelection = term.getSelection();
        const textToCopy = currentSelection && currentSelection.length > 0
          ? currentSelection
          : lastSelection;

        clipboardLog('MouseUp processing, currentSelection:', currentSelection?.length || 0, 'lastSelection:', lastSelection?.length || 0);

        if (textToCopy && textToCopy.length > 0) {
          clipboardLog('Copying text:', textToCopy.substring(0, 50));
          copyTextToClipboard(textToCopy);

          setShowCopyToast(true);
          if (copyToastTimeout) clearTimeout(copyToastTimeout);
          copyToastTimeout = setTimeout(() => setShowCopyToast(false), 1500);

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
    let lastPasteSentAt = 0;

    // Custom key handler for copy/paste
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') {
        return true;
      }

      // Ctrl+Shift+C - Copy
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const selection = term.getSelection();
        if (selection) {
          copyTextToClipboard(selection);
        }
        return false;
      }

      // Ctrl+Shift+V - Paste
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        const now = Date.now();
        pasteLog('Ctrl+Shift+V handler triggered (keydown)', { timeSinceLastSend: now - lastPasteSentAt });

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
        return false;
      }

      // Ctrl+V (regular paste)
      if (event.ctrlKey && !event.shiftKey && event.key === 'v') {
        const now = Date.now();
        pasteLog('Ctrl+V handler triggered (keydown)', { timeSinceLastSend: now - lastPasteSentAt });

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
        return false;
      }

      return true;
    });

    // Intercept browser paste event
    const handlePaste = (event) => {
      const now = Date.now();

      if (now - lastPasteSentAt < 200) {
        pasteLog('Browser paste event blocked (already handled, debounced)');
        event.preventDefault();
        return;
      }

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
    const attemptFitLocal = (retries = 0) => {
      try {
        if (term._core && term._core._renderService && term._core._renderService._renderer?.value) {
          fitAddon.fit();
          onResize(term.cols, term.rows);
        } else if (retries < 10) {
          setTimeout(() => attemptFitLocal(retries + 1), 50 * (retries + 1));
        }
      } catch (err) {
        if (retries < 10) {
          setTimeout(() => attemptFitLocal(retries + 1), 50 * (retries + 1));
        } else {
          console.error('Initial fit error after retries:', err);
        }
      }
    };

    setTimeout(() => attemptFitLocal(), 100);

    // Handle user input
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

      if (isPaste && recentlyHandledPaste) {
        pasteLog('BLOCKED onData (already handled by paste handler)');
        return;
      }

      pasteLog('SENDING to onInput');
      onInput(data);
    });

    xtermRef.current = term;

    // Cleanup
    return () => {
      if (openRAF1) cancelAnimationFrame(openRAF1);
      if (openRAF2) cancelAnimationFrame(openRAF2);
      terminalElement.removeEventListener('mouseup', handleMouseUp);
      terminalElement.removeEventListener('paste', handlePaste);
      if (selectionTimeout) clearTimeout(selectionTimeout);
      if (copyToastTimeout) clearTimeout(copyToastTimeout);
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
      if (fitAddon && term && term._core?._renderService?._renderer?.value) {
        try {
          fitAddon.fit();
          onResize(term.cols, term.rows);
        } catch (err) {
          // Silently ignore resize errors
        }
      }
    };

    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

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
      const term = xtermRef.current;
      if (!term) return;

      if (typeof data === 'string' && data.includes('\x1b]52')) {
        clipboardLog('OSC 52 sequence DETECTED in incoming terminal data!');
        clipboardLog('Data around OSC 52:', data.substring(data.indexOf('\x1b]52'), Math.min(data.indexOf('\x1b]52') + 200, data.length)));
      }

      try {
        if (isTerminalReady()) {
          term.write(data);
        } else {
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
      // Save current buffer before switching
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

        // Restore cached buffer if available
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
      const attemptFitLocal = (retries = 0) => {
        const fitAddon = fitAddonRef.current;
        if (fitAddon && isTerminalReady()) {
          try {
            fitAddon.fit();
            onResize(term.cols, term.rows);
          } catch (err) {
            if (retries < 5) {
              setTimeout(() => attemptFitLocal(retries + 1), 50);
            }
          }
        } else if (retries < 5) {
          setTimeout(() => attemptFitLocal(retries + 1), 50);
        }
      };

      setTimeout(() => attemptFitLocal(), 50);
    }

    prevProjectPathRef.current = projectPath;
  }, [projectPath, onResize, isTerminalReady]);

  // Focus terminal and refresh screen when ready
  useEffect(() => {
    if (!isReady || !xtermRef.current) return;

    const initTimeout = setTimeout(() => {
      if (!isTerminalReady()) {
        setTimeout(() => {
          if (isTerminalReady()) {
            performTerminalSetup();
          }
        }, 100);
        return;
      }
      performTerminalSetup();
    }, 50);

    function performTerminalSetup() {
      const term = xtermRef.current;
      const fitAddon = fitAddonRef.current;
      if (!term || !fitAddon) return;

      try {
        term.focus();
        term.refresh(0, term.rows - 1);

        try {
          fitAddon.fit();
          onResize(term.cols, term.rows);
        } catch (err) {
          console.debug('Immediate fit error:', err.message);
        }

        setTimeout(() => {
          if (!isTerminalReady()) return;
          try {
            fitAddon.fit();
            onResize(term.cols, term.rows);
            term.refresh(0, term.rows - 1);
          } catch (err) {
            console.debug('Follow-up fit error:', err.message);
          }
        }, 150);
      } catch (err) {
        console.debug('Terminal focus/refresh error:', err.message);
      }
    }

    return () => clearTimeout(initTimeout);
  }, [isReady, isTerminalReady, onResize]);

  return (
    <div ref={containerRef} className="terminal-container h-full relative m-3">
      {/* Glass background with blur */}
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

      <CompletionToast show={showCompletionToast} message={completionMessage} />
      <CopyToast show={showCopyToast} />
      <LoadingOverlay show={!isReady} />

      <div
        ref={terminalRef}
        className="terminal-wrapper h-full relative z-10 rounded-xl"
        style={{ opacity: isReady ? 1 : 0.3 }}
      />
    </div>
  );
}

export default Terminal;
