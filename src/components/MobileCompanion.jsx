/**
 * Mobile Companion Component
 * Responsive mobile view with touch-optimized controls
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Detect mobile device
function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const orient = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

      setIsMobile(mobile);
      setIsTouch(touch);
      setOrientation(orient);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return { isMobile, isTouch, orientation };
}

// Bottom navigation for mobile
function MobileBottomNav({ activeTab, onTabChange, tabs }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-1 safe-area-bottom"
      style={{
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-default)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)'
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
            activeTab === tab.id
              ? 'bg-accent/20 text-accent'
              : 'text-muted hover:text-primary'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// Mobile header with hamburger menu
function MobileHeader({ title, onMenuToggle, onBack, showBack }) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 safe-area-top"
      style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-default)',
        paddingTop: 'env(safe-area-inset-top, 12px)'
      }}
    >
      {showBack ? (
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/10 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 hover:bg-white/10 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-primary truncate">{title}</h1>
    </header>
  );
}

// Swipeable drawer
function SwipeDrawer({ isOpen, onClose, children, position = 'left' }) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef(null);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX;

    if (position === 'left') {
      setCurrentX(Math.min(0, deltaX));
    } else {
      setCurrentX(Math.max(0, deltaX));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const threshold = 100;

    if (position === 'left' && currentX < -threshold) {
      onClose();
    } else if (position === 'right' && currentX > threshold) {
      onClose();
    }
    setCurrentX(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        className={`absolute top-0 bottom-0 w-72 ${
          position === 'left' ? 'left-0' : 'right-0'
        }`}
        style={{
          background: 'var(--bg-elevated)',
          transform: `translateX(${currentX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// Touch-friendly list item
function TouchListItem({ icon, title, subtitle, onClick, trailing }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/10 transition-colors"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-primary truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted truncate">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </button>
  );
}

// Pull to refresh
function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-opacity"
        style={{
          top: pullDistance - 40,
          opacity: pullDistance / 60,
          height: 40
        }}
      >
        {refreshing ? (
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-6 h-6 text-accent transition-transform"
            style={{ transform: `rotate(${Math.min(pullDistance * 3, 180)}deg)` }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}

// Quick action buttons for mobile
function MobileQuickActions({ actions }) {
  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="flex flex-col items-center gap-1 p-3 rounded-xl active:scale-95 transition-transform"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-2xl">{action.icon}</span>
          <span className="text-xs text-muted">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// Mobile terminal view with virtual keyboard helper
function MobileTerminalView({ sessionId, onClose }) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [specialKeysOpen, setSpecialKeysOpen] = useState(false);

  const specialKeys = [
    { label: 'Tab', key: '\t' },
    { label: 'Esc', key: '\x1b' },
    { label: 'Ctrl+C', key: '\x03' },
    { label: 'Ctrl+D', key: '\x04' },
    { label: 'Ctrl+Z', key: '\x1a' },
    { label: 'Up', key: '\x1b[A' },
    { label: 'Down', key: '\x1b[B' },
    { label: 'Clear', key: 'clear\n' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm text-muted">Session: {sessionId}</span>
        <button
          onClick={() => setSpecialKeysOpen(!specialKeysOpen)}
          className={`p-2 rounded ${specialKeysOpen ? 'bg-accent/20 text-accent' : 'hover:bg-white/10'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {/* Terminal area */}
      <div className="flex-1 overflow-hidden bg-black">
        {/* Terminal component would go here */}
        <div className="w-full h-full p-2 text-green-400 font-mono text-sm">
          Terminal view for session {sessionId}
        </div>
      </div>

      {/* Special keys */}
      {specialKeysOpen && (
        <div
          className="flex flex-wrap gap-1 p-2"
          style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}
        >
          {specialKeys.map((sk, i) => (
            <button
              key={i}
              className="px-3 py-2 text-xs rounded bg-white/10 active:bg-white/20"
            >
              {sk.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Main mobile companion view
export default function MobileCompanion({
  projects = [],
  sessions = [],
  onSelectProject,
  onSelectSession,
  onRefresh
}) {
  const { isMobile, orientation } = useMobileDetect();
  const [activeTab, setActiveTab] = useState('projects');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const tabs = [
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'sessions', label: 'Sessions', icon: '💻' },
    { id: 'docker', label: 'Docker', icon: '🐳' },
    { id: 'system', label: 'System', icon: '📊' }
  ];

  const quickActions = [
    { icon: '➕', label: 'New', onClick: () => {} },
    { icon: '🔍', label: 'Search', onClick: () => {} },
    { icon: '⚡', label: 'Quick', onClick: () => {} },
    { icon: '⚙️', label: 'Settings', onClick: () => {} }
  ];

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  if (activeSession) {
    return (
      <MobileTerminalView
        sessionId={activeSession}
        onClose={() => setActiveSession(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <MobileHeader
        title="Console.web"
        onMenuToggle={() => setMenuOpen(true)}
        showBack={false}
      />

      {/* Quick actions */}
      <MobileQuickActions actions={quickActions} />

      {/* Content */}
      <PullToRefresh onRefresh={onRefresh}>
        <div className="pb-20">
          {activeTab === 'projects' && (
            <div>
              <h2 className="px-4 py-2 text-xs font-semibold text-muted uppercase">
                Projects ({projects.length})
              </h2>
              {projects.map(project => (
                <TouchListItem
                  key={project.id}
                  icon="📁"
                  title={project.name}
                  subtitle={project.path}
                  onClick={() => onSelectProject(project)}
                  trailing={
                    <span className="text-xs text-muted">
                      {project.completion}%
                    </span>
                  }
                />
              ))}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div>
              <h2 className="px-4 py-2 text-xs font-semibold text-muted uppercase">
                Active Sessions ({sessions.length})
              </h2>
              {sessions.map(session => (
                <TouchListItem
                  key={session.id}
                  icon="💻"
                  title={session.name}
                  subtitle={`PID: ${session.pid || 'N/A'}`}
                  onClick={() => setActiveSession(session.id)}
                  trailing={
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: session.active ? '#2ecc71' : '#f39c12' }}
                    />
                  }
                />
              ))}
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="p-4 text-center text-muted">
              <span className="text-4xl">🐳</span>
              <p className="mt-2">Docker management coming soon</p>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="p-4 text-center text-muted">
              <span className="text-4xl">📊</span>
              <p className="mt-2">System stats coming soon</p>
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Bottom nav */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* Side drawer */}
      <SwipeDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        position="left"
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold text-primary mb-4">Menu</h2>
          <nav className="space-y-1">
            <TouchListItem icon="⚙️" title="Settings" onClick={() => {}} />
            <TouchListItem icon="🎨" title="Theme" onClick={() => {}} />
            <TouchListItem icon="📊" title="Statistics" onClick={() => {}} />
            <TouchListItem icon="❓" title="Help" onClick={() => {}} />
          </nav>
        </div>
      </SwipeDrawer>
    </div>
  );
}

// Hook for mobile-specific behavior
export function useMobileView() {
  const { isMobile, isTouch, orientation } = useMobileDetect();
  const [showMobileView, setShowMobileView] = useState(false);

  useEffect(() => {
    setShowMobileView(isMobile);
  }, [isMobile]);

  return {
    isMobile,
    isTouch,
    orientation,
    showMobileView,
    setShowMobileView
  };
}

// Mobile-optimized button
export function MobileButton({ children, onClick, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-white/10 text-primary',
    primary: 'bg-accent text-white',
    danger: 'bg-red-500/20 text-red-400'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform ${variants[variant]} ${className}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}
