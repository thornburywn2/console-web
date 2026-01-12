/**
 * Test Utilities
 * Common utilities for testing React components
 */

import { render } from '@testing-library/react';
import { AuthProvider } from '../hooks/useAuth';

/**
 * Render with all providers
 */
export function renderWithProviders(ui, options = {}) {
  const { authState = {}, ...renderOptions } = options;

  function Wrapper({ children }) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Create mock project data
 */
export function createMockProject(overrides = {}) {
  return {
    id: 'test-project-1',
    name: 'Test Project',
    path: '/home/user/Projects/test-project',
    hasActiveSession: false,
    completion: {
      percentage: 50,
      items: {
        readme: true,
        tests: false,
        docs: true,
      },
    },
    ...overrides,
  };
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    isAdmin: false,
    groups: [],
    ...overrides,
  };
}

/**
 * Create mock session template
 */
export function createMockTemplate(overrides = {}) {
  return {
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    icon: '🧪',
    commands: ['npm install', 'npm run dev'],
    isBuiltIn: false,
    ...overrides,
  };
}

/**
 * Wait for async operations
 */
export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock API responses
 */
export const mockApiResponses = {
  projects: [
    createMockProject({ id: '1', name: 'Project 1' }),
    createMockProject({ id: '2', name: 'Project 2' }),
  ],
  user: createMockUser(),
  templates: [
    createMockTemplate({ id: '1', name: 'Docker Debug' }),
    createMockTemplate({ id: '2', name: 'NPM Dev' }),
  ],
};
