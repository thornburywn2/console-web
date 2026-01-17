/**
 * Draggable Widget Component
 * Individual widget wrapper with drag support and height snapping
 */

import { WIDGET_TYPES, HEIGHT_SNAPS } from './constants';

export default function DraggableWidget({
  widget,
  isEditing,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging,
  isDropTarget,
  children,
  expanded,
  onToggle,
  heightSnap,
  onHeightChange,
}) {
  const typeConfig = WIDGET_TYPES[widget.type] || { icon: '📦', title: 'Widget', color: '#666' };
  const currentHeight = heightSnap || typeConfig.defaultHeight || 'medium';
  const heightConfig = HEIGHT_SNAPS[currentHeight] || HEIGHT_SNAPS.medium;
  const isFillMode = heightConfig.height === 'auto';

  return (
    <div
      className={`
        widget-panel rounded-lg overflow-hidden transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95 z-50' : ''}
        ${isDropTarget ? 'ring-2 ring-hacker-cyan ring-offset-2 ring-offset-transparent' : ''}
        ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isFillMode && expanded ? 'flex-1 flex flex-col min-h-0' : ''}
      `}
      style={{
        borderColor: `${typeConfig.color}33`,
      }}
      draggable={isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData('widgetId', widget.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(widget.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      {/* Header */}
      <button
        onClick={() => !isEditing && onToggle?.()}
        className="widget-header w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ background: `${typeConfig.color}10` }}
      >
        <div className="widget-title flex items-center gap-2">
          <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
          <span className="text-xs font-semibold font-mono" style={{ color: 'var(--text-secondary)' }}>
            {widget.title || typeConfig.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Height snap buttons - show when editing */}
          {isEditing && (
            <div className="flex items-center gap-0.5 mr-2">
              {Object.entries(HEIGHT_SNAPS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHeightChange?.(widget.id, key);
                  }}
                  className={`w-5 h-5 text-[10px] font-mono rounded transition-colors ${
                    currentHeight === key
                      ? 'bg-hacker-cyan/30 text-hacker-cyan'
                      : 'hover:bg-white/10 text-hacker-text-dim'
                  }`}
                  title={`${key} height`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(widget.id);
              }}
              className="p-1 hover:bg-red-500/20 rounded text-red-400 text-xs"
              title="Remove widget"
            >
              ✕
            </button>
          )}
          {!isEditing && (
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Content - with height control when expanded */}
      {expanded && (
        <div
          className={`widget-content p-2 overflow-auto ${isFillMode ? 'flex-1 min-h-0' : ''}`}
          style={isFillMode ? {} : { maxHeight: `${heightConfig.height}px` }}
        >
          {children}
        </div>
      )}

      {/* Drag handle indicator */}
      {isEditing && (
        <div className="absolute bottom-1 right-1 text-[10px] text-hacker-text-dim">⋮⋮</div>
      )}
    </div>
  );
}
