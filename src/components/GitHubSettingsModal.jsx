/**
 * GitHub Settings Modal
 * Configure GitHub Personal Access Token and view authentication status
 */

import { useState, useEffect } from 'react';

// GitHub Octocat icon
function GitHubIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

export default function GitHubSettingsModal({ isOpen, onClose }) {
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState(null);

  // Check current auth status on mount
  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/github/auth');
      const data = await response.json();
      setAuthStatus(data);
    } catch (err) {
      console.error('Error checking auth status:', err);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/github/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      setAuthStatus(data);
      setAccessToken('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/github/auth', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setAuthStatus({ authenticated: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <GitHubIcon className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-primary">GitHub Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Connected Status */}
          {authStatus?.authenticated ? (
            <div className="space-y-4">
              {/* User Info */}
              <div
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                {authStatus.avatarUrl && (
                  <img
                    src={authStatus.avatarUrl}
                    alt={authStatus.username}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary">{authStatus.username}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  </div>
                  {authStatus.profileUrl && (
                    <a
                      href={authStatus.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      View Profile
                    </a>
                  )}
                </div>
              </div>

              {/* Token Scopes */}
              {authStatus.tokenScopes?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Token Scopes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {authStatus.tokenScopes.map(scope => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs rounded"
                        style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Validated */}
              {authStatus.lastValidated && (
                <div className="text-sm text-muted">
                  Last validated: {new Date(authStatus.lastValidated).toLocaleString()}
                </div>
              )}

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--status-error)',
                  color: 'white',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Disconnecting...' : 'Disconnect GitHub'}
              </button>
            </div>
          ) : (
            /* Connect Form */
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                  >
                    {showToken ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Required Scopes Info */}
              <div
                className="p-3 rounded-lg text-sm"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <div className="font-medium text-secondary mb-1">Required Scopes:</div>
                <div className="text-muted space-y-1">
                  <div><code className="text-accent">repo</code> - Full repository access</div>
                  <div><code className="text-accent">read:org</code> - Read organization data</div>
                  <div><code className="text-accent">workflow</code> - GitHub Actions access</div>
                </div>
              </div>

              {/* Help Link */}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=Command%20Portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Create a new token on GitHub
              </a>

              {/* Error Display */}
              {error && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{ background: 'var(--status-error)', color: 'white' }}
                >
                  {error}
                </div>
              )}

              {/* Connect Button */}
              <button
                type="submit"
                disabled={loading || !accessToken}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'black',
                  opacity: (loading || !accessToken) ? 0.7 : 1
                }}
              >
                {loading ? 'Connecting...' : 'Connect GitHub'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
