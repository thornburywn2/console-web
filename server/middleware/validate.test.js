/**
 * Validation Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { validate, validateBody, validateQuery, validateParams, validateMultiple } from './validate.js';

// Mock logger
vi.mock('../services/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
      method: 'POST',
      id: 'test-id',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().optional(),
    });

    it('should validate body and call next on success', () => {
      mockReq.body = { name: 'Test' };

      const middleware = validate(testSchema, 'body');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({ name: 'Test' });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should validate query parameters', () => {
      mockReq.query = { name: 'Test', age: 25 };

      const middleware = validate(testSchema, 'query');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedQuery).toEqual({ name: 'Test', age: 25 });
    });

    it('should validate URL params', () => {
      mockReq.params = { name: 'test-param' };

      const middleware = validate(z.object({ name: z.string() }), 'params');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedParams).toEqual({ name: 'test-param' });
    });

    it('should return 400 for invalid data', () => {
      mockReq.body = { name: '' }; // Empty string fails min(1)

      const middleware = validate(testSchema, 'body');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Validation failed');
      expect(response.issues).toBeDefined();
      expect(response.requestId).toBe('test-id');
    });

    it('should include validation issue details', () => {
      mockReq.body = { wrongField: 'value' };

      const middleware = validate(testSchema, 'body');
      middleware(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.issues).toContainEqual(
        expect.objectContaining({ code: 'invalid_type' })
      );
    });
  });

  describe('validateBody', () => {
    it('should be a shortcut for validate with body source', () => {
      const schema = z.object({ test: z.string() });
      mockReq.body = { test: 'value' };

      const middleware = validateBody(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({ test: 'value' });
    });
  });

  describe('validateQuery', () => {
    it('should be a shortcut for validate with query source', () => {
      const schema = z.object({ page: z.coerce.number() });
      mockReq.query = { page: '5' };

      const middleware = validateQuery(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedQuery).toEqual({ page: 5 });
    });
  });

  describe('validateParams', () => {
    it('should be a shortcut for validate with params source', () => {
      const schema = z.object({ id: z.string().uuid() });
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validateParams(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedParams).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple sources at once', () => {
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      mockReq.body = { name: 'Test' };

      const middleware = validateMultiple({
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ name: z.string() }),
      });
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedParams).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(mockReq.validatedBody).toEqual({ name: 'Test' });
    });

    it('should collect all validation errors', () => {
      mockReq.params = { id: 'not-a-uuid' };
      mockReq.body = { name: '' };

      const middleware = validateMultiple({
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ name: z.string().min(1) }),
      });
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.issues.length).toBeGreaterThan(1);
    });
  });
});
