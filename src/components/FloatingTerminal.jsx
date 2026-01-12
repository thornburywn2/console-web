/**
 * Floating Terminal Component
 * Picture-in-Picture style floating mini-terminal
 */

import { useState, useRef, useEffect } from 'react';

export default function FloatingTerminal({
  isOpen,
  onClose,
  terminalContent,
  sessionName,
  onResize,
  onMove,
}) {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 320 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - size.width)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - size.height)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onMove?.(position);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, size, onMove]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(300, e.clientX - position.x);
      const newHeight = Math.max(200, e.clientY - position.y);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResize?.(size);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position, onResize]);

  const handleDragStart = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-move select-none"
        style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-secondary truncate max-w-[150px]">
            {sessionName || 'Terminal'}
          </span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Close"
          >
            <svg className="w-3.5 h-3.5 text-muted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        className="overflow-auto font-mono text-xs p-2"
        style={{
          height: 'calc(100% - 36px)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <pre className="whitespace-pre-wrap break-words">
          {terminalContent || 'Terminal output will appear here...'}
        </pre>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <svg className="w-4 h-4 text-muted" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div>
  );
}
