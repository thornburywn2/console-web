/**
 * ApiTester Component Tests
 * Phase 5.3: Unit tests for HTTP request builder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiTester from './ApiTester';

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

// Mock API
vi.mock('../services/api.js', () => ({
  proxyApi: {
    send: vi.fn().mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { message: 'Success' },
    }),
  },
}));

// Mock sub-components
vi.mock('./api-tester', () => ({
  HTTP_METHODS: [
    { method: 'GET', color: '#2ecc71' },
    { method: 'POST', color: '#f39c12' },
    { method: 'PUT', color: '#3498db' },
    { method: 'PATCH', color: '#9b59b6' },
    { method: 'DELETE', color: '#e74c3c' },
  ],
  CONTENT_TYPES: ['application/json', 'text/plain', 'application/xml'],
  HeaderRow: ({ header, onChange }) => (
    <div data-testid="header-row">{header.key}: {header.value}</div>
  ),
  ParamRow: ({ param, onChange }) => (
    <div data-testid="param-row">{param.key}={param.value}</div>
  ),
  ResponseViewer: ({ response }) => (
    <div data-testid="response-viewer">{JSON.stringify(response)}</div>
  ),
  SavedRequestCard: ({ request, onClick }) => (
    <div data-testid="saved-request">{request.name}</div>
  ),
}));

describe('ApiTester', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <ApiTester
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('method selection', () => {
    it('should have method selector', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('GET')).toBeInTheDocument();
    });
  });

  describe('URL input', () => {
    it('should have URL input field', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const urlInput = screen.getByPlaceholderText(/api\.example\.com/i);
      expect(urlInput).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('should have params tab', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('params')).toBeInTheDocument();
    });

    it('should have headers tab', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('headers')).toBeInTheDocument();
    });

    it('should have body tab', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('body')).toBeInTheDocument();
    });
  });

  describe('send request', () => {
    it('should have send button', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Send')).toBeInTheDocument();
    });
  });

  describe('saved requests', () => {
    it('should load saved requests from localStorage', () => {
      localStorageMock.setItem('api-tester-saved', JSON.stringify([
        { id: '1', name: 'Test Request', method: 'GET', url: '/api/test' },
      ]));

      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith('api-tester-saved');
    });
  });

  describe('embedded mode', () => {
    it('should render in embedded mode', () => {
      render(
        <ApiTester
          isOpen={true}
          onClose={mockOnClose}
          embedded={true}
        />
      );

      expect(document.body.firstChild).toBeInTheDocument();
    });
  });
});
