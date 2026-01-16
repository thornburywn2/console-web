/**
 * Security Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  globalErrorHandler,
  notFoundHandler,
  jsonSizeLimit,
} from './security.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Security Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
      id: 'test-request-id',
      ip: '127.0.0.1',
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false,
    };
    mockNext = vi.fn();
  });

  describe('globalErrorHandler', () => {
    it('should handle 500 errors with generic message', () => {
      const error = new Error('Database connection failed');

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Internal server error');
      expect(response.message).toContain('unexpected error');
      expect(response.requestId).toBe('test-request-id');
    });

    it('should handle 400 errors with original message', () => {
      const error = new Error('Invalid input');
      error.status = 400;

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Invalid input');
    });

    it('should use statusCode if status is not set', () => {
      const error = new Error('Not found');
      error.statusCode = 404;

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should delegate to next if headers already sent', () => {
      mockRes.headersSent = true;
      const error = new Error('Test error');

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should include stack trace in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Server error');
      error.stack = 'Error: Server error\n    at test.js:1:1';

      globalErrorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with path info', () => {
      mockReq.path = '/unknown/route';
      mockReq.method = 'POST';

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Not Found');
      expect(response.message).toBe('Cannot POST /unknown/route');
      expect(response.requestId).toBe('test-request-id');
    });

    it('should handle GET requests', () => {
      mockReq.path = '/api/missing';
      mockReq.method = 'GET';

      notFoundHandler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.message).toBe('Cannot GET /api/missing');
    });
  });

  describe('jsonSizeLimit', () => {
    it('should allow requests within limit', () => {
      mockReq.headers['content-length'] = '1000';

      const middleware = jsonSizeLimit('10mb');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests over limit', () => {
      mockReq.headers['content-length'] = '20000000'; // 20MB

      const middleware = jsonSizeLimit('10mb');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockNext).not.toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Payload Too Large');
    });

    it('should handle kb units', () => {
      mockReq.headers['content-length'] = '2000'; // 2KB

      const middleware = jsonSizeLimit('1kb');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
    });

    it('should allow missing content-length', () => {
      const middleware = jsonSizeLimit('10mb');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default 10mb if invalid format', () => {
      mockReq.headers['content-length'] = '5000000'; // 5MB - under 10MB default

      const middleware = jsonSizeLimit('invalid');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
