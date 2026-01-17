/**
 * SetupWizard Hooks
 * Custom hooks for setup wizard state management
 */

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEY, FEATURES_KEY, WIDGET_PRESET_KEY } from './constants';

/**
 * Hook to check if setup wizard is needed
 */
export function useSetupWizard() {
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay for smoother UX
      const timer = setTimeout(() => setShowSetup(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = useCallback(() => {
    setShowSetup(false);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FEATURES_KEY);
    localStorage.removeItem(WIDGET_PRESET_KEY);
    localStorage.removeItem('tour-completed');
    setShowSetup(true);
  }, []);

  return {
    showSetup,
    complete,
    reset,
    isCompleted: !!localStorage.getItem(STORAGE_KEY),
  };
}

/**
 * Get enabled features from localStorage
 */
export function getEnabledFeatures() {
  try {
    const stored = localStorage.getItem(FEATURES_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
