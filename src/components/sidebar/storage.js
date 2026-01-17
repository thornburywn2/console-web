/**
 * Sidebar localStorage Utilities
 */

import { LAST_ACCESSED_KEY, FAVORITES_KEY } from './constants';

// Get last accessed times from localStorage
export const getLastAccessed = () => {
  try {
    const stored = localStorage.getItem(LAST_ACCESSED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save last accessed time for a project
export const setLastAccessed = (projectPath) => {
  try {
    const current = getLastAccessed();
    current[projectPath] = Date.now();
    localStorage.setItem(LAST_ACCESSED_KEY, JSON.stringify(current));
  } catch {
    // Ignore localStorage errors
  }
};

// Get favorites from localStorage
export const getFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save favorites to localStorage
export const saveFavorites = (favorites) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore localStorage errors
  }
};
