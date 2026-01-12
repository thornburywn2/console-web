import { useState, useEffect, useRef } from 'react';
import { RightSidebarWidgets } from './WidgetDashboard';

function RightSidebar({
  selectedProject,
  projects,
  onKillSession,
  onSelectProject,
  onOpenAdmin,
  onOpenCheckpoints,
  onOpenGitHubSettings,
  onRefresh,
  socket,
}) {
  const asideRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isHoveringRef = useRef(false);

  // Track mouse enter/leave on the sidebar
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const handleMouseEnter = () => {
      isHoveringRef.current = true;
    };

    const handleMouseLeave = () => {
      isHoveringRef.current = false;
    };

    aside.addEventListener('mouseenter', handleMouseEnter);
    aside.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      aside.removeEventListener('mouseenter', handleMouseEnter);
      aside.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Handle wheel events at document level to intercept before xterm gets them
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleDocumentWheel = (e) => {
      // Only handle if mouse is over the sidebar
      if (!isHoveringRef.current) return;

      // Stop the event completely
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Manually scroll the container
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        container.scrollTop = newScrollTop;
      }
    };

    // Add to document with capture phase - this runs BEFORE any other handlers
    document.addEventListener('wheel', handleDocumentWheel, { passive: false, capture: true });

    return () => {
      document.removeEventListener('wheel', handleDocumentWheel, { capture: true });
    };
  }, []);

  return (
    <aside
      ref={asideRef}
      className="w-72 h-full flex-shrink-0 glass-sidebar-right overflow-hidden flex flex-col relative z-20"
    >
      {/* Header */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2 font-mono" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            DASHBOARD
          </h2>
        </div>
      </div>

      {/* Scrollable content - Widgets only */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto py-2 space-y-2 px-2"
        style={{ overscrollBehavior: 'contain' }}
      >
        <RightSidebarWidgets
          selectedProject={selectedProject}
          projects={projects}
          onKillSession={onKillSession}
          onSelectProject={onSelectProject}
          onOpenAdmin={onOpenAdmin}
          onOpenCheckpoints={onOpenCheckpoints}
          onOpenGitHubSettings={onOpenGitHubSettings}
          onRefresh={onRefresh}
          onAction={(action) => {
            if (action === 'admin') onOpenAdmin?.();
            if (action === 'settings') onOpenAdmin?.('settings');
            if (action === 'search') {/* Could trigger command palette */}
          }}
        />
      </div>
    </aside>
  );
}

export default RightSidebar;
