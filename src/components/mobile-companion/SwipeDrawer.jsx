/**
 * Swipeable drawer
 */

import { useState, useRef } from 'react';

export function SwipeDrawer({ isOpen, onClose, children, position = 'left' }) {
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
