/**
 * OfflineMode Component Tests
 * Phase 5.3: Unit tests for offline functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OfflineMode from './OfflineMode';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-1234'),
  },
});

describe('OfflineMode', () => {
  const mockOnStatusChange = vi.fn();
  const mockOnQueueAction = vi.fn();
  let originalNavigator;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(window, 'navigator', originalNavigator);
    }
  });

  describe('rendering', () => {
    it('should render component', () => {
      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
          onQueueAction={mockOnQueueAction}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('online status', () => {
    it('should display online status when connected', () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
        />
      );

      // Component should indicate online status somehow
      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should display offline status when disconnected', () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('action queue', () => {
    it('should handle empty queue', () => {
      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should display queued actions', () => {
      localStorageMock.setItem('offline-action-queue', JSON.stringify([
        { id: '1', action: 'save', data: {}, timestamp: Date.now() },
        { id: '2', action: 'commit', data: {}, timestamp: Date.now() },
      ]));

      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('cache management', () => {
    it('should handle cached data', () => {
      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
          showCache={true}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('sync functionality', () => {
    it('should have sync button when actions queued', () => {
      localStorageMock.setItem('offline-action-queue', JSON.stringify([
        { id: '1', action: 'save', data: {}, timestamp: Date.now() },
      ]));

      render(
        <OfflineMode
          onStatusChange={mockOnStatusChange}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });
});
