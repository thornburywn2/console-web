import { useState, useEffect, useCallback, useRef } from 'react';
import PortWizard from './PortWizard';
import SystemStats from './SystemStats';
import SessionManager from './SessionManager';
import ProjectContext from './ProjectContext';
import GitHubProjectPanel from './GitHubProjectPanel';
import CloudflarePublishPanel from './CloudflarePublishPanel';

// Docker Status Widget - compact overview
function DockerStatusWidget({ onOpenAdmin }) {
  const [dockerData, setDockerData] = useState(null);

  useEffect(() => {
    const fetchDocker = async () => {
      try {
        const [systemRes, containersRes] = await Promise.all([
          fetch('/api/docker/system'),
          fetch('/api/docker/containers?all=true'),
        ]);
        if (systemRes.ok && containersRes.ok) {
          const system = await systemRes.json();
          const containers = await containersRes.json();
          setDockerData({ system, containers });
        }
      } catch (err) {
        console.error('Docker fetch error:', err);
      }
    };
    fetchDocker();
    const interval = setInterval(fetchDocker, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!dockerData) {
    return <div className="text-xs text-hacker-text-dim font-mono">Loading...</div>;
  }

  // API returns lowercase properties (name, state) not PascalCase (Names, State)
  const running = dockerData.containers.filter(c => c.state === 'running').length;
  const total = dockerData.containers.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-hacker-text-dim">Containers</span>
        <span>
          <span className="text-hacker-green">{running}</span>
          <span className="text-hacker-text-dim"> / {total}</span>
        </span>
      </div>
      <div className="flex gap-1">
        {dockerData.containers.slice(0, 6).map((c, index) => (
          <div
            key={c.id || c.fullId || `container-${index}`}
            className={`w-2 h-2 rounded-sm ${c.state === 'running' ? 'bg-hacker-green' : 'bg-hacker-error'}`}
            title={`${c.name || c.id || 'unknown'}: ${c.state}`}
          />
        ))}
        {dockerData.containers.length > 6 && (
          <span className="text-[10px] text-hacker-text-dim">+{dockerData.containers.length - 6}</span>
        )}
      </div>
      <button
        onClick={onOpenAdmin}
        className="w-full text-[10px] font-mono text-hacker-cyan hover:underline text-left"
      >
        Open Docker Manager →
      </button>
    </div>
  );
}

// Stack Status Widget - Sovereign Stack overview with clickable services
function StackStatusWidget({ onOpenAdmin }) {
  const [stackData, setStackData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStack = async () => {
      try {
        const [servicesRes, healthRes] = await Promise.all([
          fetch('/api/stack/services'),
          fetch('/api/stack/health'),
        ]);
        if (servicesRes.ok && healthRes.ok) {
          const services = await servicesRes.json();
          const health = await healthRes.json();
          setStackData({ services, health });
        }
      } catch (err) {
        console.error('Stack fetch error:', err);
      }
    };
    fetchStack();
    const interval = setInterval(fetchStack, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stackData) {
    return <div className="text-xs text-hacker-text-dim font-mono">Loading...</div>;
  }

  const icons = {
    authentik: '🛡️',
    openwebui: '💬',
    silverbullet: '📝',
    plane: '📋',
    n8n: '⚡',
    voiceRouter: '🎤',
    monitoring: '📊',
  };

  const healthColors = {
    healthy: 'bg-hacker-green',
    degraded: 'bg-hacker-warning',
    stopped: 'bg-hacker-error',
    unknown: 'bg-hacker-text-dim',
  };

  const healthCount = stackData.services.filter(s => s.health === 'healthy').length;
  const totalServices = stackData.services.length;

  return (
    <div className="space-y-2">
      {/* Health summary bar */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-hacker-text-dim">Services</span>
        <span className={healthCount === totalServices ? 'text-hacker-green' : healthCount > 0 ? 'text-hacker-warning' : 'text-hacker-error'}>
          {healthCount}/{totalServices} healthy
        </span>
      </div>

      {/* Compact grid view */}
      <div className="flex flex-wrap gap-1">
        {stackData.services.map(s => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-all hover:bg-hacker-bg/50 border border-transparent hover:border-hacker-purple/30"
            title={`${s.name}: ${s.description}\nPort: ${s.port}\nStatus: ${s.health}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${healthColors[s.health] || healthColors.unknown}`} />
            <span>{icons[s.id] || '🔧'}</span>
            <span className="text-hacker-text-dim hidden sm:inline">{s.name?.split(' ')[0]}</span>
          </a>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-1 pt-1 border-t border-hacker-purple/20">
          {stackData.services.map(s => (
            <div key={s.id} className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${healthColors[s.health] || healthColors.unknown}`} />
                <span className="text-hacker-text">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-hacker-text-dim">:{s.port}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hacker-cyan hover:underline"
                >
                  open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-mono text-hacker-text-dim hover:text-hacker-purple transition-colors"
        >
          {expanded ? '▲ less' : '▼ details'}
        </button>
        <button
          onClick={onOpenAdmin}
          className="text-[10px] font-mono text-hacker-purple hover:underline"
        >
          Manage →
        </button>
      </div>
    </div>
  );
}

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
  const [expandedPanels, setExpandedPanels] = useState({
    docker: true,
    stack: true,
    ports: true,
    system: true,
    sessions: true,
    project: true,
    github: true,
    cloudflare: true,
  });

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

  const togglePanel = (panel) => {
    setExpandedPanels((prev) => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

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

      {/* Scrollable content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto py-2 space-y-2 px-2"
        style={{ overscrollBehavior: 'contain' }}
      >
          {/* System Stats */}
          <CollapsiblePanel
            title="SYSTEM"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            expanded={expandedPanels.system}
            onToggle={() => togglePanel('system')}
            accentColor="cyan"
          >
            <SystemStats />
          </CollapsiblePanel>

          {/* Ports */}
          <CollapsiblePanel
            title="PORTS"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            expanded={expandedPanels.ports}
            onToggle={() => togglePanel('ports')}
            accentColor="green"
          >
            <PortWizard projects={projects} onSelectProject={onSelectProject} />
          </CollapsiblePanel>

          {/* Project Context - only show when project is selected */}
          {selectedProject && (
            <CollapsiblePanel
              title="PROJECT"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              }
              expanded={expandedPanels.project}
              onToggle={() => togglePanel('project')}
              accentColor="cyan"
            >
              <div className="space-y-2">
                <ProjectContext project={selectedProject} />
                {/* Quick Actions */}
                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={onOpenCheckpoints}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono rounded hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--accent-secondary)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Checkpoints & Rollback
                  </button>
                </div>
              </div>
            </CollapsiblePanel>
          )}

          {/* GitHub Panel - only show when project is selected */}
          {selectedProject && (
            <CollapsiblePanel
              title="GITHUB"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              }
              expanded={expandedPanels.github}
              onToggle={() => togglePanel('github')}
              accentColor="purple"
            >
              <GitHubProjectPanel
                project={selectedProject}
                onOpenSettings={onOpenGitHubSettings}
                onRefresh={onRefresh}
              />
            </CollapsiblePanel>
          )}

          {/* Cloudflare Panel - only show when project is selected */}
          {selectedProject && (
            <CollapsiblePanel
              title="CLOUDFLARE"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.5765-.4961-.9873-.5049l-8.1084-.1113c-.0537-.0009-.1025-.0229-.1377-.0615-.0351-.0385-.0545-.0903-.0535-.1435.0019-.0463.0257-.0885.0618-.1182.0361-.0298.0833-.0452.1308-.0412l8.1608.1122c.8662.0322 1.7933-.6133 2.1033-1.4697l.393-1.0875c.0425-.1173.0634-.242.0567-.3672-.244-4.4717-4.0044-8.0528-8.5438-8.0528-4.5223 0-8.2779 3.5588-8.5438 8.0528-.0067.1253.0142.25.0567.3672l.393 1.0875c.3057.8564 1.2329 1.5019 2.1033 1.4697l8.1608-.1122c.0475-.004.095.0114.1308.0412.0361.0297.06.0719.0618.1182.001.0532-.0184.105-.0535.1435-.0352.0386-.084.0606-.1377.0615l-8.1084.1113c-.4108.0088-.7627.1885-.9873.5049-.2461.3447-.3028.8086-.1553 1.3154l.1113.3838c.3516 1.2109 1.4458 2.0557 2.7159 2.0997l10.6702.5879c.0195.001.0382-.0049.0533-.017.0152-.0121.0259-.0299.0299-.0496.0027-.0139.0023-.0281-.0013-.0419-.0035-.0137-.0102-.0268-.0194-.0382l-.8799-1.09c-.3594-.4448-.8928-.7051-1.5005-.7305z"/>
                </svg>
              }
              expanded={expandedPanels.cloudflare}
              onToggle={() => togglePanel('cloudflare')}
              accentColor="cyan"
            >
              <CloudflarePublishPanel
                project={selectedProject}
                onRefresh={onRefresh}
              />
            </CollapsiblePanel>
          )}

          {/* Session Manager */}
          <CollapsiblePanel
            title="SESSIONS"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            expanded={expandedPanels.sessions}
            onToggle={() => togglePanel('sessions')}
            accentColor="purple"
          >
            <SessionManager
              projects={projects}
              onKillSession={onKillSession}
              onSelectProject={onSelectProject}
            />
          </CollapsiblePanel>

          {/* Docker Status */}
          <CollapsiblePanel
            title="DOCKER"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            expanded={expandedPanels.docker}
            onToggle={() => togglePanel('docker')}
            accentColor="cyan"
          >
            <DockerStatusWidget onOpenAdmin={onOpenAdmin} />
          </CollapsiblePanel>

          {/* Sovereign Stack Status */}
          <CollapsiblePanel
            title="SOVEREIGN STACK"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            expanded={expandedPanels.stack}
            onToggle={() => togglePanel('stack')}
            accentColor="purple"
          >
            <StackStatusWidget onOpenAdmin={onOpenAdmin} />
          </CollapsiblePanel>
      </div>
    </aside>
  );
}

// Collapsible panel wrapper component
function CollapsiblePanel({ title, icon, expanded, onToggle, children, accentColor = 'green' }) {
  const colorMap = {
    green: { main: 'var(--accent-primary)', bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.2)', borderHover: 'rgba(16, 185, 129, 0.4)' },
    cyan: { main: 'var(--accent-secondary)', bg: 'rgba(6, 182, 212, 0.05)', border: 'rgba(6, 182, 212, 0.2)', borderHover: 'rgba(6, 182, 212, 0.4)' },
    purple: { main: 'var(--accent-tertiary)', bg: 'rgba(139, 92, 246, 0.05)', border: 'rgba(139, 92, 246, 0.2)', borderHover: 'rgba(139, 92, 246, 0.4)' },
  };

  const colors = colorMap[accentColor] || colorMap.green;

  return (
    <div
      className="widget-panel rounded-lg transition-colors overflow-hidden"
      style={{ borderColor: colors.border }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.borderHover}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
    >
      <button
        onClick={onToggle}
        className="widget-header w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ background: colors.bg }}
      >
        <div className="widget-title flex items-center gap-2">
          <span style={{ color: colors.main }}>{icon}</span>
          <span className="text-xs font-semibold font-mono" style={{ color: 'var(--text-secondary)' }}>{title}</span>
        </div>
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="widget-content p-2">{children}</div>}
    </div>
  );
}

export default RightSidebar;
