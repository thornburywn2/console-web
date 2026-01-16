/**
 * Test Helpers
 *
 * Utility functions for backend testing.
 */

import express from 'express';
import { vi } from 'vitest';

/**
 * Create a test Express app with common middleware
 */
export function createTestApp() {
  const app = express();

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock request ID
  app.use((req, res, next) => {
    req.id = 'test-request-id';
    req.log = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    next();
  });

  return app;
}

/**
 * Create mock Prisma client
 */
export function createMockPrisma() {
  return {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $on: vi.fn(),
    session: createMockModel(),
    folder: createMockModel(),
    prompt: createMockModel(),
    snippet: createMockModel(),
    alertRule: createMockModel(),
    tag: createMockModel(),
    note: createMockModel(),
    template: createMockModel(),
    agent: createMockModel(),
    agentExecution: createMockModel(),
    userSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.create })),
    },
  };
}

/**
 * Create a mock Prisma model with common operations
 */
function createMockModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({
      id: 'test-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data.data
    })),
    update: vi.fn().mockImplementation((data) => Promise.resolve({
      id: data.where.id,
      updatedAt: new Date(),
      ...data.data
    })),
    delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
    count: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
}

/**
 * Generate a valid UUID for testing
 */
export function generateTestUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create test session data
 */
export function createTestSession(overrides = {}) {
  return {
    id: generateTestUUID(),
    name: 'sp-test-session',
    projectId: null,
    workingDirectory: '/home/test/Projects',
    isActive: true,
    isPinned: false,
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test folder data
 */
export function createTestFolder(overrides = {}) {
  return {
    id: generateTestUUID(),
    name: 'Test Folder',
    icon: 'folder',
    color: '#3B82F6',
    parentId: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test prompt data
 */
export function createTestPrompt(overrides = {}) {
  return {
    id: generateTestUUID(),
    title: 'Test Prompt',
    content: 'This is a test prompt content',
    category: 'testing',
    tags: ['test'],
    isPublic: false,
    isFavorite: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test snippet data
 */
export function createTestSnippet(overrides = {}) {
  return {
    id: generateTestUUID(),
    title: 'Test Snippet',
    command: 'echo "test"',
    description: 'A test snippet',
    category: 'testing',
    tags: ['test'],
    shortcut: null,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test alert rule data
 */
export function createTestAlertRule(overrides = {}) {
  return {
    id: generateTestUUID(),
    name: 'Test Alert',
    description: 'Test alert description',
    type: 'CPU',
    condition: 'gt',
    threshold: 80,
    duration: 60,
    enabled: true,
    notifySound: true,
    notifyDesktop: true,
    cooldownMins: 5,
    lastTriggered: null,
    triggerCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
