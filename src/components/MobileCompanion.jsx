/**
 * Mobile Companion Component
 * Responsive mobile view with touch-optimized controls
 */

import { useState } from 'react';
import {
  useMobileDetect,
  useMobileView,
  MobileBottomNav,
  MobileHeader,
  SwipeDrawer,
  TouchListItem,
  PullToRefresh,
  MobileQuickActions,
  MobileTerminalView,
  MobileButton,
} from './mobile-companion';

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

// Re-export hooks and components for external use
export { useMobileView, MobileButton };
