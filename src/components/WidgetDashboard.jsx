/**
 * Widget Dashboard Component
 * Customizable widget layout with drag-drop support and grid snapping
 * Full feature parity with RightSidebar panels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import SystemStats from './SystemStats';
import ProjectContext from './ProjectContext';
import PortWizard from './PortWizard';
import SessionManager from './SessionManager';
import GitHubProjectPanel from './GitHubProjectPanel';
import CloudflarePublishPanel from './CloudflarePublishPanel';

// Import modular widget components
import {
  WIDGET_TYPES,
  HEIGHT_SNAPS,
  DEFAULT_WIDGETS,
  SIDEBAR_DEFAULTS,
  LEFT_SIDEBAR_DEFAULTS,
  DockerWidget,
  ProjectsWidget,
  DraggableWidget,
  AddWidgetModal,
  NoProjectSelected,
} from './widgets';

// Main dashboard component
export default function WidgetDashboard({
  selectedProject,
  projects = [],
  onKillSession,
  onSelectProject,
  onOpenAdmin,
  onOpenCheckpoints,
  onOpenGitHubSettings,
  onRefresh,
  onAction,
  sidebarMode = false,
  leftSidebarMode = false,
  storageKey = 'dashboard-widgets',
  hideToolbar = false,
  projectsDir,
}) {
  const [widgets, setWidgets] = useState([]);
  const [expandedWidgets, setExpandedWidgets] = useState({});
  const [heightSnaps, setHeightSnaps] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const gridRef = useRef(null);
  const containerRef = useRef(null);
  const isHoveringRef = useRef(false);

  // Handle wheel events to fix scroll in sidebars (xterm captures wheel events)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => { isHoveringRef.current = true; };
    const handleMouseLeave = () => { isHoveringRef.current = false; };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    const handleWheel = (e) => {
      if (!isHoveringRef.current) return;

      const scrollContainer = gridRef.current;
      if (!scrollContainer) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        scrollContainer.scrollTop = newScrollTop;
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  // Determine defaults based on mode
  const getDefaults = useCallback(() => {
    if (leftSidebarMode) return LEFT_SIDEBAR_DEFAULTS;
    if (sidebarMode) return SIDEBAR_DEFAULTS;
    return DEFAULT_WIDGETS;
  }, [leftSidebarMode, sidebarMode]);

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWidgets(parsed.widgets || parsed);
        setExpandedWidgets(parsed.expanded || {});
        setHeightSnaps(parsed.heights || {});
      } catch {
        setWidgets(getDefaults());
      }
    } else {
      setWidgets(getDefaults());
    }
  }, [storageKey, getDefaults]);

  // Initialize expanded state for new widgets
  useEffect(() => {
    const newExpanded = { ...expandedWidgets };
    widgets.forEach((w) => {
      if (newExpanded[w.id] === undefined) {
        newExpanded[w.id] = true;
      }
    });
    if (JSON.stringify(newExpanded) !== JSON.stringify(expandedWidgets)) {
      setExpandedWidgets(newExpanded);
    }
  }, [widgets]);

  // Save layout (includes widgets, expanded state, and height snaps)
  const saveLayout = useCallback(
    (newWidgets, newExpanded = expandedWidgets, newHeights = heightSnaps) => {
      localStorage.setItem(storageKey, JSON.stringify({
        widgets: newWidgets,
        expanded: newExpanded,
        heights: newHeights,
      }));
      setWidgets(newWidgets);
      if (newExpanded !== expandedWidgets) {
        setExpandedWidgets(newExpanded);
      }
      if (newHeights !== heightSnaps) {
        setHeightSnaps(newHeights);
      }
    },
    [storageKey, expandedWidgets, heightSnaps]
  );

  const handleToggleExpanded = useCallback(
    (widgetId) => {
      const newExpanded = { ...expandedWidgets, [widgetId]: !expandedWidgets[widgetId] };
      setExpandedWidgets(newExpanded);
      localStorage.setItem(storageKey, JSON.stringify({ widgets, expanded: newExpanded, heights: heightSnaps }));
    },
    [widgets, expandedWidgets, heightSnaps, storageKey]
  );

  const handleHeightChange = useCallback(
    (widgetId, newHeight) => {
      const newHeights = { ...heightSnaps, [widgetId]: newHeight };
      setHeightSnaps(newHeights);
      localStorage.setItem(storageKey, JSON.stringify({ widgets, expanded: expandedWidgets, heights: newHeights }));
    },
    [widgets, expandedWidgets, heightSnaps, storageKey]
  );

  const handleRemoveWidget = useCallback(
    (id) => {
      saveLayout(widgets.filter((w) => w.id !== id));
    },
    [widgets, saveLayout]
  );

  const handleAddWidget = useCallback(
    (type) => {
      const typeConfig = WIDGET_TYPES[type];
      const newWidget = {
        id: `${type}-${Date.now()}`,
        type,
        title: typeConfig?.title || type,
      };
      const newExpanded = { ...expandedWidgets, [newWidget.id]: true };
      const newHeights = { ...heightSnaps, [newWidget.id]: typeConfig?.defaultHeight || 'medium' };
      saveLayout([...widgets, newWidget], newExpanded, newHeights);
    },
    [widgets, expandedWidgets, heightSnaps, saveLayout]
  );

  const handleResetLayout = useCallback(() => {
    const defaults = getDefaults();
    const newExpanded = {};
    const newHeights = {};
    defaults.forEach((w) => {
      newExpanded[w.id] = true;
      const typeConfig = WIDGET_TYPES[w.type];
      newHeights[w.id] = typeConfig?.defaultHeight || 'medium';
    });
    saveLayout(defaults, newExpanded, newHeights);
  }, [saveLayout, getDefaults]);

  // Drag and drop handlers
  const handleDragStart = useCallback((widgetId) => {
    setDraggedWidget(widgetId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragOver = useCallback(
    (e, index) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedWidget && index !== dropTargetIndex) {
        setDropTargetIndex(index);
      }
    },
    [draggedWidget, dropTargetIndex]
  );

  const handleDrop = useCallback(
    (e, targetIndex) => {
      e.preventDefault();
      const widgetId = e.dataTransfer.getData('widgetId');
      if (!widgetId) return;

      const sourceIndex = widgets.findIndex((w) => w.id === widgetId);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return;

      // Reorder widgets
      const newWidgets = [...widgets];
      const [removed] = newWidgets.splice(sourceIndex, 1);
      newWidgets.splice(targetIndex, 0, removed);

      saveLayout(newWidgets);
      setDraggedWidget(null);
      setDropTargetIndex(null);
    },
    [widgets, saveLayout]
  );

  // Render widget content based on type
  const renderWidgetContent = (widget, fillHeight = false) => {
    const config = WIDGET_TYPES[widget.type];

    // For widgets that require a project
    if (config?.requiresProject && !selectedProject) {
      return <NoProjectSelected widgetType={widget.type} />;
    }

    switch (widget.type) {
      case 'system':
        return <SystemStats />;

      case 'projectInfo':
        return (
          <div className="space-y-2">
            <ProjectContext project={selectedProject} />
            {onOpenCheckpoints && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={onOpenCheckpoints}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono rounded hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Checkpoints & Rollback
                </button>
              </div>
            )}
          </div>
        );

      case 'github':
        return (
          <GitHubProjectPanel
            project={selectedProject}
            onOpenSettings={onOpenGitHubSettings}
            onRefresh={onRefresh}
          />
        );

      case 'cloudflare':
        return <CloudflarePublishPanel project={selectedProject} onRefresh={onRefresh} />;

      case 'ports':
        return <PortWizard projects={projects} onSelectProject={onSelectProject} />;

      case 'sessions':
        return (
          <SessionManager projects={projects} onKillSession={onKillSession} onSelectProject={onSelectProject} />
        );

      case 'docker':
        return <DockerWidget />;

      case 'projects':
        return (
          <ProjectsWidget
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
            onKillSession={onKillSession}
            fillHeight={fillHeight}
            projectsDir={projectsDir}
            onRefresh={onRefresh}
          />
        );

      default:
        return (
          <div className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-2xl">📦</span>
            <div className="text-xs font-mono mt-2">Unknown widget type</div>
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Toolbar */}
      {!hideToolbar && (
        <div
          className="flex items-center justify-between px-2 py-1.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>
            {isEditing ? 'Edit Mode' : 'Widgets'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1 text-xs rounded transition-colors hover:bg-white/10"
              style={{ color: 'var(--accent-secondary)' }}
              title="Add widget"
            >
              +
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1 text-xs rounded transition-colors ${
                isEditing ? 'bg-yellow-500/20' : 'hover:bg-white/10'
              }`}
              style={{ color: isEditing ? '#eab308' : 'var(--text-secondary)' }}
              title={isEditing ? 'Done editing' : 'Edit layout'}
            >
              {isEditing ? '✓' : '✎'}
            </button>
            {isEditing && (
              <button
                onClick={handleResetLayout}
                className="p-1 text-xs rounded transition-colors hover:bg-red-500/20"
                style={{ color: '#ef4444' }}
                title="Reset to defaults"
              >
                ↺
              </button>
            )}
          </div>
        </div>
      )}

      {/* Widget List - uses flex layout to support fill-height widgets */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto py-2 px-2 flex flex-col gap-2 min-h-0"
        style={{ overscrollBehavior: 'contain' }}
      >
        {widgets.map((widget, index) => {
          const widgetHeight = heightSnaps[widget.id] || WIDGET_TYPES[widget.type]?.defaultHeight || 'medium';
          const isFillWidget = HEIGHT_SNAPS[widgetHeight]?.height === 'auto';

          return (
          <div
            key={widget.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`transition-all duration-200 ${
              dropTargetIndex === index && draggedWidget !== widget.id ? 'transform translate-y-2' : ''
            } ${isFillWidget && expandedWidgets[widget.id] !== false ? 'flex-1 flex flex-col min-h-0' : ''}`}
          >
            <DraggableWidget
              widget={widget}
              isEditing={isEditing}
              onRemove={handleRemoveWidget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isDragging={draggedWidget === widget.id}
              isDropTarget={dropTargetIndex === index && draggedWidget !== widget.id}
              expanded={expandedWidgets[widget.id] !== false}
              onToggle={() => handleToggleExpanded(widget.id)}
              heightSnap={heightSnaps[widget.id]}
              onHeightChange={handleHeightChange}
            >
              {renderWidgetContent(widget, isFillWidget && expandedWidgets[widget.id] !== false)}
            </DraggableWidget>
          </div>
          );
        })}

        {/* Drop zone at bottom when editing */}
        {isEditing && widgets.length > 0 && (
          <div
            onDragOver={(e) => handleDragOver(e, widgets.length)}
            onDrop={(e) => handleDrop(e, widgets.length)}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
              dropTargetIndex === widgets.length ? 'border-hacker-cyan bg-hacker-cyan/10' : ''
            }`}
            style={{ borderColor: dropTargetIndex === widgets.length ? undefined : 'var(--border-subtle)' }}
          >
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Drop here
            </span>
          </div>
        )}

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-2xl mb-2">📊</span>
            <p className="text-xs font-mono">No widgets configured</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-xs font-mono hover:underline"
              style={{ color: 'var(--accent-secondary)' }}
            >
              Add widget
            </button>
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddWidget}
        existingWidgets={widgets}
      />
    </div>
  );
}

// Export for right sidebar use
export function RightSidebarWidgets(props) {
  return <WidgetDashboard {...props} sidebarMode={true} storageKey="cw-sidebar-right-widgets" />;
}

// Legacy alias for backwards compatibility
export const SidebarWidgets = RightSidebarWidgets;

// Export for left sidebar use (projects list)
export function LeftSidebarWidgets(props) {
  return <WidgetDashboard {...props} leftSidebarMode={true} storageKey="cw-sidebar-left-widgets" />;
}
