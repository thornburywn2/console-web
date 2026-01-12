/**
 * Offline Mode Component
 * Basic offline functionality with service worker support
 */

import { useState, useEffect, useCallback } from 'react';

// Check if we're online
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Queue for offline actions
const offlineQueue = {
  key: 'offline-action-queue',

  add(action) {
    const queue = this.get();
    queue.push({ ...action, timestamp: Date.now(), id: crypto.randomUUID() });
    localStorage.setItem(this.key, JSON.stringify(queue));
  },

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  },

  remove(id) {
    const queue = this.get().filter(item => item.id !== id);
    localStorage.setItem(this.key, JSON.stringify(queue));
  },

  clear() {
    localStorage.removeItem(this.key);
  }
};

// Cache for offline data
const offlineCache = {
  key: 'offline-cache',

  set(resource, data) {
    const cache = this.getAll();
    cache[resource] = { data, timestamp: Date.now() };
    localStorage.setItem(this.key, JSON.stringify(cache));
  },

  get(resource) {
    const cache = this.getAll();
    return cache[resource]?.data;
  },

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '{}');
    } catch {
      return {};
    }
  },

  clear() {
    localStorage.removeItem(this.key);
  }
};

function OfflineBanner({ onRetry }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-2 px-4 text-sm"
      style={{ background: '#f39c12', color: '#000' }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
      </svg>
      <span>You're offline. Some features may be limited.</span>
      <button
        onClick={onRetry}
        className="px-3 py-1 rounded bg-black/20 hover:bg-black/30"
      >
        Retry
      </button>
    </div>
  );
}

function QueuedActionItem({ action, onRemove }) {
  const typeIcons = {
    command: '⌨️',
    save: '💾',
    sync: '🔄',
    api: '🌐'
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-xl">{typeIcons[action.type] || '📋'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-primary truncate">{action.description}</div>
        <div className="text-xs text-muted">
          Queued {new Date(action.timestamp).toLocaleTimeString()}
        </div>
      </div>
      <button
        onClick={() => onRemove(action.id)}
        className="p-1 hover:bg-white/10 rounded text-muted hover:text-red-400"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function CachedDataPanel({ cache, onClear }) {
  const entries = Object.entries(cache);
  const totalSize = JSON.stringify(cache).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">Cached Data</span>
        <span className="text-xs text-muted">
          {(totalSize / 1024).toFixed(1)} KB
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center text-muted py-4 text-sm">
          No cached data
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, { timestamp }]) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 rounded text-sm"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="text-secondary truncate">{key}</span>
              <span className="text-xs text-muted">
                {new Date(timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <button
          onClick={onClear}
          className="w-full px-3 py-2 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
        >
          Clear Cache
        </button>
      )}
    </div>
  );
}

export default function OfflineMode({ isOpen, onClose }) {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState([]);
  const [cache, setCache] = useState({});
  const [syncing, setSyncing] = useState(false);

  // Load queue and cache
  useEffect(() => {
    setQueue(offlineQueue.get());
    setCache(offlineCache.getAll());
  }, [isOpen]);

  const handleRemoveAction = useCallback((id) => {
    offlineQueue.remove(id);
    setQueue(offlineQueue.get());
  }, []);

  const handleClearCache = useCallback(() => {
    offlineCache.clear();
    setCache({});
  }, []);

  const handleSync = useCallback(async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    const currentQueue = offlineQueue.get();

    for (const action of currentQueue) {
      try {
        // Process each queued action
        if (action.endpoint) {
          await fetch(action.endpoint, {
            method: action.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: action.body ? JSON.stringify(action.body) : undefined
          });
        }
        offlineQueue.remove(action.id);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }

    setQueue(offlineQueue.get());
    setSyncing(false);
  }, [isOnline, syncing]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      handleSync();
    }
  }, [isOnline, queue.length, handleSync]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Offline Mode</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              background: isOnline ? 'rgba(46, 204, 113, 0.1)' : 'rgba(243, 156, 18, 0.1)',
              border: `1px solid ${isOnline ? '#2ecc71' : '#f39c12'}`
            }}
          >
            <div
              className={`w-3 h-3 rounded-full ${isOnline ? 'animate-pulse' : ''}`}
              style={{ background: isOnline ? '#2ecc71' : '#f39c12' }}
            />
            <div>
              <div className="text-sm font-medium" style={{ color: isOnline ? '#2ecc71' : '#f39c12' }}>
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-xs text-muted">
                {isOnline ? 'All features available' : 'Limited functionality'}
              </div>
            </div>
          </div>

          {/* Queued Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Pending Actions</span>
              <span className="text-xs text-muted">{queue.length} queued</span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center text-muted py-4 text-sm">
                No pending actions
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {queue.map(action => (
                    <QueuedActionItem
                      key={action.id}
                      action={action}
                      onRemove={handleRemoveAction}
                    />
                  ))}
                </div>

                {isOnline && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50"
                  >
                    {syncing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync Now
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Cached Data */}
          <CachedDataPanel cache={cache} onClear={handleClearCache} />
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 text-xs text-muted text-center"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          Actions performed while offline will sync when connection is restored
        </div>
      </div>
    </div>
  );
}

// Hook to manage offline actions
export function useOfflineAction() {
  const isOnline = useOnlineStatus();

  const queueAction = useCallback((action) => {
    if (!isOnline) {
      offlineQueue.add(action);
      return { queued: true };
    }
    return { queued: false };
  }, [isOnline]);

  const cacheData = useCallback((resource, data) => {
    offlineCache.set(resource, data);
  }, []);

  const getCachedData = useCallback((resource) => {
    return offlineCache.get(resource);
  }, []);

  return {
    isOnline,
    queueAction,
    cacheData,
    getCachedData
  };
}

// Offline status indicator for header
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    }
  }, [isOnline]);

  if (isOnline && !showBanner) return null;

  if (!isOnline) {
    return <OfflineBanner onRetry={() => window.location.reload()} />;
  }

  // Just came back online
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm animate-fade-in"
      style={{ background: '#2ecc71', color: '#fff' }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>Back online!</span>
      <button
        onClick={() => setShowBanner(false)}
        className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30"
      >
        Dismiss
      </button>
    </div>
  );
}
