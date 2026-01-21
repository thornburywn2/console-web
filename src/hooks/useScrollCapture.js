/**
 * useScrollCapture Hook
 * Captures wheel events to enable scrolling in sidebars when xterm.js is active.
 * xterm.js intercepts wheel events globally, preventing normal scroll behavior.
 *
 * Usage:
 *   const { containerRef, scrollRef } = useScrollCapture();
 *   <div ref={containerRef}><div ref={scrollRef}>...content...</div></div>
 */

import { useEffect, useRef } from 'react';

export default function useScrollCapture() {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const isHoveringRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const scrollElement = scrollRef.current || container;
    if (!container) return;

    const handleMouseEnter = () => { isHoveringRef.current = true; };
    const handleMouseLeave = () => { isHoveringRef.current = false; };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    const handleWheel = (e) => {
      if (!isHoveringRef.current || !scrollElement) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        scrollElement.scrollTop = Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY));
      }
    };

    // Capture phase runs before xterm's handlers
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  return { containerRef, scrollRef };
}
