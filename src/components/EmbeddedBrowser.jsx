/**
 * EmbeddedBrowser Component
 * Browser preview for agent UI inspection and debugging
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { browserApi } from '../services/api.js';

// Default viewport sizes
const VIEWPORT_PRESETS = [
  { name: 'Desktop', width: 1280, height: 720 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Full', width: '100%', height: '100%' }
];

export default function EmbeddedBrowser({ projectId, sessionId, initialUrl = '', onClose }) {
  const [browserSession, setBrowserSession] = useState(null);
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [viewport, setViewport] = useState(VIEWPORT_PRESETS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const iframeRef = useRef(null);

  // Create or load browser session
  useEffect(() => {
    if (initialUrl) {
      createSession(initialUrl);
    }
  }, []);

  // Create new browser session
  const createSession = async (targetUrl) => {
    try {
      setIsLoading(true);
      setError(null);

      const session = await browserApi.createSession({
        projectId,
        sessionId,
        url: targetUrl,
        viewport: { width: viewport.width, height: viewport.height }
      });

      setBrowserSession(session);
      setUrl(targetUrl);
      setInputUrl(targetUrl);
    } catch (err) {
      setError(err.getUserMessage?.() || 'Failed to create browser session');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to URL
  const handleNavigate = async (e) => {
    e?.preventDefault();
    if (!inputUrl.trim()) return;

    let targetUrl = inputUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    if (browserSession) {
      try {
        await browserApi.navigate(browserSession.id, targetUrl);
        setUrl(targetUrl);
      } catch (err) {
        console.error('Navigation error:', err.getUserMessage?.() || err.message);
      }
    } else {
      createSession(targetUrl);
    }
  };

  // Take screenshot
  const takeScreenshot = async () => {
    if (!browserSession || !iframeRef.current) return;

    try {
      // For security reasons, we can't directly capture iframe content
      // Instead, we'll save the URL and timestamp as a "screenshot"
      await browserApi.saveScreenshot(browserSession.id, {
        url,
        dataUrl: `screenshot-placeholder-${Date.now()}`,
        annotation: `Screenshot at ${new Date().toLocaleTimeString()}`
      });
      fetchScreenshots();
    } catch (err) {
      console.error('Screenshot error:', err.getUserMessage?.() || err.message);
    }
  };

  // Fetch screenshots
  const fetchScreenshots = async () => {
    if (!browserSession) return;

    try {
      const data = await browserApi.getScreenshots(browserSession.id);
      setScreenshots(data.screenshots);
    } catch (err) {
      console.error('Error fetching screenshots:', err.getUserMessage?.() || err.message);
    }
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    if (iframeRef.current) {
      try {
        // Try to get the title (may fail due to CORS)
        const title = iframeRef.current.contentDocument?.title;
        if (title && browserSession) {
          browserApi.updateSession(browserSession.id, { title }).catch(() => {});
        }
      } catch (e) {
        // CORS restriction, expected
      }
    }
  };

  // Add console log
  const addConsoleLog = (level, message) => {
    const log = {
      level,
      message,
      timestamp: new Date().toISOString()
    };
    setConsoleLogs(prev => [...prev, log].slice(-100));

    if (browserSession) {
      browserApi.saveConsoleLogs(browserSession.id, [log]).catch(() => {});
    }
  };

  // Refresh iframe
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = url;
    }
  };

  // Go back
  const handleBack = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (e) {
        // CORS restriction
      }
    }
  };

  // Go forward
  const handleForward = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.forward();
      } catch (e) {
        // CORS restriction
      }
    }
  };

  // Close session
  const handleClose = async () => {
    if (browserSession) {
      await browserApi.closeSession(browserSession.id).catch(() => {});
    }
    if (onClose) onClose();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Browser toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            title="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleForward}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            title="Forward"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={handleRefresh}
            className={`p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* URL bar */}
        <form onSubmit={handleNavigate} className="flex-1 flex">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full pl-10 pr-4 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
          >
            Go
          </button>
        </form>

        {/* Viewport selector */}
        <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
          {VIEWPORT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setViewport(preset)}
              className={`px-2 py-1 text-xs rounded ${
                viewport.name === preset.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
              title={preset.name}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
          <button
            onClick={takeScreenshot}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            title="Take Screenshot"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`p-1.5 rounded ${showConsole ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
            title="Toggle Console"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => { setShowHistory(!showHistory); fetchScreenshots(); }}
            className={`p-1.5 rounded ${showHistory ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
            title="Screenshot History"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/50 text-red-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Browser view */}
        <div className="flex-1 flex items-center justify-center bg-gray-950 p-4 overflow-auto">
          {url ? (
            <div
              className="bg-white rounded-lg shadow-2xl overflow-hidden"
              style={{
                width: viewport.width === '100%' ? '100%' : viewport.width,
                height: viewport.height === '100%' ? '100%' : viewport.height,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
                  <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={url}
                onLoad={handleIframeLoad}
                className="w-full h-full border-0"
                title="Browser Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <p>Enter a URL to preview</p>
              <p className="text-sm text-gray-600 mt-2">
                Great for previewing your app during development
              </p>
            </div>
          )}
        </div>

        {/* Screenshot history sidebar */}
        {showHistory && (
          <div className="w-64 border-l border-gray-700 flex flex-col bg-gray-800">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">Screenshots</h3>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {screenshots.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No screenshots yet</p>
              ) : (
                <div className="space-y-2">
                  {screenshots.map(ss => (
                    <div key={ss.id} className="p-2 bg-gray-900 rounded text-xs">
                      <p className="text-gray-400 truncate">{ss.url}</p>
                      <p className="text-gray-500">{new Date(ss.timestamp).toLocaleString()}</p>
                      {ss.annotation && (
                        <p className="text-gray-400 mt-1">{ss.annotation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Console panel */}
      {showConsole && (
        <div className="h-48 border-t border-gray-700 bg-gray-900 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-400">Console</span>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2 font-mono text-xs">
            {consoleLogs.length === 0 ? (
              <p className="text-gray-500">Console output will appear here...</p>
            ) : (
              consoleLogs.map((log, i) => (
                <div
                  key={i}
                  className={`py-0.5 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    log.level === 'info' ? 'text-blue-400' :
                    'text-gray-400'
                  }`}
                >
                  <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
