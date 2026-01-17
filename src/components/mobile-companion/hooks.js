/**
 * Mobile Companion Hooks
 */

import { useState, useEffect } from 'react';

// Detect mobile device
export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const orient = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

      setIsMobile(mobile);
      setIsTouch(touch);
      setOrientation(orient);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return { isMobile, isTouch, orientation };
}

// Hook for mobile-specific behavior
export function useMobileView() {
  const { isMobile, isTouch, orientation } = useMobileDetect();
  const [showMobileView, setShowMobileView] = useState(false);

  useEffect(() => {
    setShowMobileView(isMobile);
  }, [isMobile]);

  return {
    isMobile,
    isTouch,
    orientation,
    showMobileView,
    setShowMobileView
  };
}
