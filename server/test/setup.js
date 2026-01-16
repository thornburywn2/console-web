/**
 * Backend Test Setup
 *
 * Configures test environment for server-side testing.
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/console_web_test';
process.env.PORT = '5276'; // Different port to avoid conflicts
process.env.AUTH_ENABLED = 'false'; // Disable auth for tests
process.env.LOG_LEVEL = 'silent'; // Quiet logs during tests

// Mock Prisma client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $on: vi.fn(),
    session: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.data })),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      count: vi.fn().mockResolvedValue(0),
    },
    folder: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.data })),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      count: vi.fn().mockResolvedValue(0),
    },
    prompt: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.data })),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      count: vi.fn().mockResolvedValue(0),
    },
    snippet: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.data })),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      count: vi.fn().mockResolvedValue(0),
    },
    alertRule: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.data })),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      count: vi.fn().mockResolvedValue(0),
    },
    userSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data.create })),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

// Mock PrismaPg adapter
vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn(() => ({})),
}));

// Mock pg
vi.mock('pg', () => ({
  default: {
    Pool: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue({}),
      end: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global teardown
afterAll(() => {
  vi.resetAllMocks();
});
