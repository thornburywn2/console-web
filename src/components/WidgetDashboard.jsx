/**
 * Widget Dashboard Component
 * Customizable widget layout with drag-drop support
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_WIDGETS = [
  { id: 'system-status', type: 'system', title: 'System Status', size: 'medium', position: { x: 0, y: 0 } },
  { id: 'active-sessions', type: 'sessions', title: 'Active Sessions', size: 'small', position: { x: 1, y: 0 } },
  { id: 'docker-containers', type: 'docker', title: 'Docker Containers', size: 'medium', position: { x: 0, y: 1 } },
  { id: 'recent-activity', type: 'activity', title: 'Recent Activity', size: 'large', position: { x: 1, y: 1 } },
  { id: 'quick-actions', type: 'actions', title: 'Quick Actions', size: 'small', position: { x: 2, y: 0 } },
  { id: 'resource-chart', type: 'chart', title: 'Resource Usage', size: 'large', position: { x: 0, y: 2 } }
];

const WIDGET_TYPES = {
  system: {
    icon: '📊',
    description: 'System CPU, memory, and disk status'
  },
  sessions: {
    icon: '💻',
    description: 'Active terminal sessions'
  },
  docker: {
    icon: '🐳',
    description: 'Docker container status'
  },
  activity: {
    icon: '📋',
    description: 'Recent project activity'
  },
  actions: {
    icon: '⚡',
    description: 'Quick action buttons'
  },
  chart: {
    icon: '📈',
    description: 'Resource usage charts'
  },
  projects: {
    icon: '📁',
    description: 'Project list'
  },
  services: {
    icon: '🔧',
    description: 'Service status'
  },
  notes: {
    icon: '📝',
    description: 'Quick notes'
  },
  clock: {
    icon: '🕐',
    description: 'Clock and date'
  }
};

const WIDGET_SIZES = {
  small: { cols: 1, rows: 1, minWidth: 200, minHeight: 150 },
  medium: { cols: 1, rows: 2, minWidth: 200, minHeight: 300 },
  large: { cols: 2, rows: 2, minWidth: 400, minHeight: 300 },
  wide: { cols: 2, rows: 1, minWidth: 400, minHeight: 150 },
  tall: { cols: 1, rows: 3, minWidth: 200, minHeight: 450 }
};

// Individual widget component
function Widget({ widget, isEditing, onRemove, onResize, onDragStart, children }) {
  const [isDragging, setIsDragging] = useState(false);
  const widgetRef = useRef(null);

  const handleDragStart = (e) => {
    if (!isEditing) return;
    setIsDragging(true);
    onDragStart?.(widget.id, e);
  };

  const sizeConfig = WIDGET_SIZES[widget.size] || WIDGET_SIZES.medium;
  const typeConfig = WIDGET_TYPES[widget.type] || { icon: '📦', description: 'Widget' };

  return (
    <div
      ref={widgetRef}
      className={`relative rounded-xl overflow-hidden transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isEditing ? 'cursor-move ring-2 ring-accent/30' : ''}`}
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        gridColumn: `span ${sizeConfig.cols}`,
        gridRow: `span ${sizeConfig.rows}`,
        minHeight: sizeConfig.minHeight
      }}
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span>{typeConfig.icon}</span>
          <span className="text-sm font-medium text-primary">{widget.title}</span>
        </div>
        {isEditing && (
          <div className="flex items-center gap-1">
            {/* Size selector */}
            <select
              value={widget.size}
              onChange={(e) => onResize(widget.id, e.target.value)}
              className="text-xs bg-transparent border border-white/20 rounded px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {Object.keys(WIDGET_SIZES).map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            {/* Remove button */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(widget.id); }}
              className="p-1 hover:bg-red-500/20 rounded text-red-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 h-full overflow-auto">
        {children}
      </div>
    </div>
  );
}

// Widget content components
function SystemStatusWidget() {
  const [stats, setStats] = useState({ cpu: 0, memory: 0, disk: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/system');
        if (response.ok) {
          const data = await response.json();
          setStats({
            cpu: data.cpu?.usage || 0,
            memory: data.memory?.usedPercent || 0,
            disk: data.disk?.usedPercent || 0
          });
        }
      } catch {
        // Mock data
        setStats({ cpu: 45, memory: 62, disk: 38 });
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const bars = [
    { label: 'CPU', value: stats.cpu, color: '#3498db' },
    { label: 'Memory', value: stats.memory, color: '#2ecc71' },
    { label: 'Disk', value: stats.disk, color: '#f39c12' }
  ];

  return (
    <div className="space-y-3">
      {bars.map(bar => (
        <div key={bar.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">{bar.label}</span>
            <span className="text-primary">{bar.value.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${bar.value}%`, background: bar.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsWidget() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          setSessions(data.slice(0, 5));
        }
      } catch {
        setSessions([]);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div className="space-y-2">
      {sessions.length === 0 ? (
        <div className="text-center text-muted text-sm py-4">No active sessions</div>
      ) : (
        sessions.map(session => (
          <div
            key={session.id}
            className="flex items-center gap-2 p-2 rounded"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: session.active ? '#2ecc71' : '#f39c12' }}
            />
            <span className="text-sm text-primary truncate">{session.name}</span>
          </div>
        ))
      )}
    </div>
  );
}

function DockerWidget() {
  const [containers, setContainers] = useState([]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await fetch('/api/admin/docker/containers');
        if (response.ok) {
          const data = await response.json();
          setContainers(data.slice(0, 5));
        }
      } catch {
        setContainers([]);
      }
    };
    fetchContainers();
  }, []);

  return (
    <div className="space-y-2">
      {containers.length === 0 ? (
        <div className="text-center text-muted text-sm py-4">No containers</div>
      ) : (
        containers.map(container => (
          <div
            key={container.Id}
            className="flex items-center gap-2 p-2 rounded"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <span className="text-xl">🐳</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-primary truncate">
                {container.Names?.[0]?.replace('/', '')}
              </div>
              <div className="text-xs text-muted">{container.State}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ActivityWidget() {
  const activities = [
    { id: 1, action: 'Session started', project: 'claude-code-manager', time: '2 min ago' },
    { id: 2, action: 'Container restarted', project: 'authentik', time: '15 min ago' },
    { id: 3, action: 'Build completed', project: 'pai-agent', time: '1 hour ago' }
  ];

  return (
    <div className="space-y-2">
      {activities.map(activity => (
        <div
          key={activity.id}
          className="p-2 rounded"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <div className="text-sm text-primary">{activity.action}</div>
          <div className="flex justify-between text-xs text-muted">
            <span>{activity.project}</span>
            <span>{activity.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActionsWidget({ onAction }) {
  const actions = [
    { icon: '➕', label: 'New Session', action: 'new-session' },
    { icon: '🔍', label: 'Search', action: 'search' },
    { icon: '📊', label: 'Stats', action: 'stats' },
    { icon: '⚙️', label: 'Settings', action: 'settings' }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(action => (
        <button
          key={action.action}
          onClick={() => onAction?.(action.action)}
          className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/5"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <span className="text-xl">{action.icon}</span>
          <span className="text-xs text-muted">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function ChartWidget() {
  // Simple placeholder for chart
  return (
    <div className="h-full flex items-center justify-center text-muted">
      <div className="text-center">
        <span className="text-4xl">📈</span>
        <p className="text-sm mt-2">Resource chart</p>
      </div>
    </div>
  );
}

function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-3xl font-mono text-primary">
        {time.toLocaleTimeString()}
      </div>
      <div className="text-sm text-muted">
        {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

// Add widget modal
function AddWidgetModal({ isOpen, onClose, onAdd, existingWidgets }) {
  if (!isOpen) return null;

  const availableTypes = Object.entries(WIDGET_TYPES).filter(
    ([type]) => !existingWidgets.some(w => w.type === type)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold text-primary">Add Widget</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-auto space-y-2">
          {availableTypes.length === 0 ? (
            <div className="text-center text-muted py-4">All widgets added</div>
          ) : (
            availableTypes.map(([type, config]) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <div className="text-sm font-medium text-primary capitalize">{type}</div>
                  <div className="text-xs text-muted">{config.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Main dashboard component
export default function WidgetDashboard({ onAction }) {
  const [widgets, setWidgets] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    if (saved) {
      setWidgets(JSON.parse(saved));
    } else {
      setWidgets(DEFAULT_WIDGETS);
    }
  }, []);

  // Save layout
  const saveLayout = useCallback((newWidgets) => {
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
    setWidgets(newWidgets);
  }, []);

  const handleRemoveWidget = useCallback((id) => {
    saveLayout(widgets.filter(w => w.id !== id));
  }, [widgets, saveLayout]);

  const handleResizeWidget = useCallback((id, newSize) => {
    saveLayout(widgets.map(w => w.id === id ? { ...w, size: newSize } : w));
  }, [widgets, saveLayout]);

  const handleAddWidget = useCallback((type) => {
    const typeConfig = WIDGET_TYPES[type];
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      size: 'medium',
      position: { x: widgets.length % 3, y: Math.floor(widgets.length / 3) }
    };
    saveLayout([...widgets, newWidget]);
  }, [widgets, saveLayout]);

  const handleResetLayout = useCallback(() => {
    saveLayout(DEFAULT_WIDGETS);
  }, [saveLayout]);

  const renderWidgetContent = (widget) => {
    switch (widget.type) {
      case 'system':
        return <SystemStatusWidget />;
      case 'sessions':
        return <SessionsWidget />;
      case 'docker':
        return <DockerWidget />;
      case 'activity':
        return <ActivityWidget />;
      case 'actions':
        return <QuickActionsWidget onAction={onAction} />;
      case 'chart':
        return <ChartWidget />;
      case 'clock':
        return <ClockWidget />;
      default:
        return <div className="text-muted text-sm">Widget content</div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h2 className="text-lg font-semibold text-primary">Dashboard</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-accent/20 text-accent hover:bg-accent/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Widget
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded ${
              isEditing ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-muted hover:text-primary'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isEditing ? 'Done' : 'Edit'}
          </button>
          {isEditing && (
            <button
              onClick={handleResetLayout}
              className="px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Widget Grid */}
      <div
        className="flex-1 overflow-auto p-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gridAutoRows: 'minmax(150px, auto)',
          gap: '1rem'
        }}
      >
        {widgets.map(widget => (
          <Widget
            key={widget.id}
            widget={widget}
            isEditing={isEditing}
            onRemove={handleRemoveWidget}
            onResize={handleResizeWidget}
          >
            {renderWidgetContent(widget)}
          </Widget>
        ))}

        {widgets.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted">
            <span className="text-4xl mb-2">📊</span>
            <p>No widgets yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-accent hover:underline"
            >
              Add your first widget
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

// Compact dashboard widget for embedding
export function DashboardPreview({ widgets = [], maxWidgets = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {widgets.slice(0, maxWidgets).map(widget => {
        const typeConfig = WIDGET_TYPES[widget.type] || { icon: '📦' };
        return (
          <div
            key={widget.id}
            className="flex items-center gap-2 p-2 rounded"
            style={{ background: 'var(--bg-glass)' }}
          >
            <span>{typeConfig.icon}</span>
            <span className="text-xs text-muted truncate">{widget.title}</span>
          </div>
        );
      })}
    </div>
  );
}
