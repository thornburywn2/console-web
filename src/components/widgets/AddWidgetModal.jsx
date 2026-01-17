/**
 * Add Widget Modal Component
 * Modal for selecting and adding new widgets
 */

import { useRef, useEffect } from 'react';
import { WIDGET_TYPES } from './constants';

export default function AddWidgetModal({ isOpen, onClose, onAdd, existingWidgets }) {
  const scrollContainerRef = useRef(null);

  // Handle wheel events for scroll (xterm captures these otherwise)
  useEffect(() => {
    if (!isOpen) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      e.stopPropagation();
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
        scrollContainer.scrollTop = newScrollTop;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  if (!isOpen) return null;

  const availableTypes = Object.entries(WIDGET_TYPES).filter(
    ([type]) => !existingWidgets.some((w) => w.type === type)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="text-sm font-semibold font-mono uppercase" style={{ color: 'var(--accent-primary)' }}>
            Add Widget
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
        <div
          ref={scrollContainerRef}
          className="p-4 flex-1 overflow-y-auto space-y-2"
          style={{ overscrollBehavior: 'contain' }}
        >
          {availableTypes.length === 0 ? (
            <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              All widgets have been added
            </div>
          ) : (
            availableTypes.map(([type, config]) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left transition-colors"
                style={{ border: `1px solid ${config.color}33` }}
              >
                <span className="text-xl">{config.icon}</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {config.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {config.description}
                    {config.requiresProject && (
                      <span className="ml-1 text-yellow-500">(requires project)</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
