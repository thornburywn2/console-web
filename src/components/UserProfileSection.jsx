/**
 * User Profile Section for Sidebar
 * Positioned at bottom of sidebar with upward-opening dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

function UserProfileSection({ collapsed = false }) {
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!user) return null;

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0]?.toUpperCase() || '?';

  // Collapsed view - just show avatar
  if (collapsed) {
    return (
      <div className="p-2 flex justify-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => logout()}
          className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all hover:scale-105 ${
            isAdmin
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
          title={`${user.name} - Click to sign out`}
        >
          {initials}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="relative"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      {/* Dropdown Menu - Opens Upward */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 right-0 mb-1 mx-2 py-1 rounded-lg shadow-xl animate-fade-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            zIndex: 9999,
          }}
        >
          {/* User Groups */}
          {user.groups && user.groups.length > 0 && (
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                Groups
              </div>
              <div className="flex flex-wrap gap-1">
                {user.groups.slice(0, 3).map((group, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 text-xs rounded font-mono"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {group}
                  </span>
                ))}
                {user.groups.length > 3 && (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    +{user.groups.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="py-1">
            <a
              href="/outpost.goauthentik.io/sign_out"
              className="flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--status-error)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </a>
          </div>
        </div>
      )}

      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center gap-3 transition-colors hover:bg-white/5"
      >
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 ${
            isAdmin
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {initials}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user.name || user.username}
            </span>
            {isAdmin && (
              <span
                className="px-1.5 py-0.5 text-xs rounded font-mono flex-shrink-0"
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: 'rgb(168, 85, 247)',
                }}
              >
                ADMIN
              </span>
            )}
          </div>
          <div className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
            {user.email}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

export default UserProfileSection;
