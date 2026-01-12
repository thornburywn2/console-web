/**
 * Share Modal Component
 * Generate shareable session links
 */

import { useState, useCallback } from 'react';

const SHARE_OPTIONS = [
  { id: 'view', name: 'View Only', description: 'Read-only access to session transcript', icon: '👁️' },
  { id: 'replay', name: 'Replay Mode', description: 'Interactive replay of terminal session', icon: '▶️' },
  { id: 'comment', name: 'Commentable', description: 'Allow inline comments on history', icon: '💬' },
];

const EXPIRY_OPTIONS = [
  { value: 0, label: 'Never expires' },
  { value: 1, label: '1 hour' },
  { value: 24, label: '24 hours' },
  { value: 168, label: '1 week' },
  { value: 720, label: '30 days' },
];

export default function ShareModal({
  session,
  isOpen,
  onClose,
}) {
  const [shareType, setShareType] = useState('view');
  const [expiryHours, setExpiryHours] = useState(168);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShareLink = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/share/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          type: shareType,
          expiryHours: expiryHours || null,
          password: usePassword ? password : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.url);
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const revokeLink = async () => {
    try {
      await fetch('/api/share/session/' + encodeURIComponent(shareUrl.split('/').pop()), {
        method: 'DELETE',
      });
      setShareUrl('');
    } catch (error) {
      console.error('Failed to revoke link:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Share Session</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Session info */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <div className="text-sm font-medium text-primary">{session?.name || 'Terminal Session'}</div>
            <div className="text-xs text-muted mt-1">
              {session?.projectPath} • {session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Now'}
            </div>
          </div>

          {!shareUrl ? (
            <>
              {/* Share type */}
              <div>
                <label className="block text-sm text-secondary mb-2">Share Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {SHARE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setShareType(opt.id)}
                      className={'flex flex-col items-center gap-1 p-3 rounded-lg text-center ' +
                        (shareType === opt.id ? 'bg-accent/20 ring-1 ring-accent' : 'bg-white/5 hover:bg-white/10')}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs font-medium text-primary">{opt.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-1">
                  {SHARE_OPTIONS.find(o => o.id === shareType)?.description}
                </p>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm text-secondary mb-2">Link Expiry</label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                >
                  {EXPIRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Password protection */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-secondary">Password protect</span>
                </label>
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                  />
                )}
              </div>

              {/* Create button */}
              <button
                onClick={createShareLink}
                disabled={creating || (usePassword && !password)}
                className="w-full py-2 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Share Link'}
              </button>
            </>
          ) : (
            <>
              {/* Share URL */}
              <div>
                <label className="block text-sm text-secondary mb-2">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 rounded text-sm font-mono"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                  />
                  <button
                    onClick={copyToClipboard}
                    className={'px-4 py-2 rounded text-sm ' +
                      (copied ? 'bg-green-500/20 text-green-400' : 'bg-accent/20 text-accent hover:bg-accent/30')}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share via */}
              <div className="flex gap-2">
                <a
                  href={'mailto:?subject=Shared Session&body=Check out this terminal session: ' + encodeURIComponent(shareUrl)}
                  className="flex-1 py-2 text-center rounded text-sm bg-white/5 hover:bg-white/10"
                >
                  Email
                </a>
                <a
                  href={'https://twitter.com/intent/tweet?text=Check out this terminal session&url=' + encodeURIComponent(shareUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-center rounded text-sm bg-white/5 hover:bg-white/10"
                >
                  Twitter
                </a>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShareUrl('')}
                  className="flex-1 py-2 text-sm text-secondary hover:text-primary"
                >
                  Create New Link
                </button>
                <button
                  onClick={revokeLink}
                  className="flex-1 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded"
                >
                  Revoke Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
