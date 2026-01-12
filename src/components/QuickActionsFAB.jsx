/**
 * Quick Actions FAB Component
 * Floating action button with common actions
 */

import { useState, useEffect, useRef } from 'react';

const QUICK_ACTIONS = [
  {
    id: 'new-session',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    label: 'New Session',
    shortcut: 'Ctrl+N',
    color: '#2ecc71'
  },
  {
    id: 'command-palette',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Command Palette',
    shortcut: 'Ctrl+Shift+P',
    color: '#3498db'
  },
  {
    id: 'quick-search',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    label: 'Quick Search',
    shortcut: 'Ctrl+K',
    color: '#9b59b6'
  },
  {
    id: 'toggle-sidebar',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    label: 'Toggle Sidebar',
    shortcut: 'Ctrl+B',
    color: '#f39c12'
  },
  {
    id: 'focus-mode',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Focus Mode',
    shortcut: 'F11',
    color: '#e74c3c'
  },
  {
    id: 'run-tests',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Run Tests',
    shortcut: 'Ctrl+Shift+T',
    color: '#1abc9c'
  }
];

function ActionButton({ action, onClick, index, total }) {
  const angle = ((index / total) * Math.PI * 1.5) - Math.PI * 0.25;
  const radius = 70;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <button
      onClick={() => onClick(action.id)}
      className="absolute w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110"
      style={{
        background: action.color,
        left: `calc(50% + ${x}px - 20px)`,
        top: `calc(50% + ${y}px - 20px)`,
        animationDelay: `${index * 50}ms`
      }}
      title={`${action.label} (${action.shortcut})`}
    >
      <span className="text-white">{action.icon}</span>
    </button>
  );
}

export default function QuickActionsFAB({
  position = 'bottom-right',
  onAction,
  customActions = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const fabRef = useRef(null);

  const actions = [...QUICK_ACTIONS, ...customActions];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleAction = (actionId) => {
    setIsOpen(false);
    onAction?.(actionId);
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <div
      ref={fabRef}
      className={`fixed z-50 ${positionClasses[position]}`}
    >
      {/* Expanded Actions */}
      {isOpen && (
        <div className="absolute inset-0 w-48 h-48 -translate-x-1/2 -translate-y-1/2" style={{ left: '28px', top: '28px' }}>
          {actions.map((action, i) => (
            <ActionButton
              key={action.id}
              action={action}
              index={i}
              total={actions.length}
              onClick={handleAction}
            />
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isOpen ? 'bg-red-500 rotate-45' : 'bg-accent hover:bg-accent/80'
        }`}
      >
        <svg
          className="w-6 h-6 text-white transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Label */}
      {!isOpen && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-muted bg-black/50 px-2 py-1 rounded">Quick Actions</span>
        </div>
      )}
    </div>
  );
}

// Compact FAB for mobile
export function CompactFAB({ onAction }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 p-2 rounded-lg shadow-xl space-y-2" style={{ background: 'var(--bg-elevated)' }}>
          {QUICK_ACTIONS.slice(0, 4).map(action => (
            <button
              key={action.id}
              onClick={() => { setIsOpen(false); onAction?.(action.id); }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-white/10"
            >
              <span style={{ color: action.color }}>{action.icon}</span>
              <span className="text-sm text-secondary">{action.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
          isOpen ? 'bg-red-500' : 'bg-accent'
        }`}
      >
        <svg
          className={`w-6 h-6 text-white transition-transform ${isOpen ? 'rotate-45' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
