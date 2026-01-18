/**
 * RBAC Middleware Tests
 * Phase 1 - Enterprise Mission Control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  hasRole,
  roleFromGroups,
  ROLE_HIERARCHY,
} from '../../server/middleware/rbac.js';

// Mock logger
vi.mock('../../server/services/logger.js', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('RBAC Middleware', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy values', () => {
      expect(ROLE_HIERARCHY.VIEWER).toBe(0);
      expect(ROLE_HIERARCHY.USER).toBe(1);
      expect(ROLE_HIERARCHY.ADMIN).toBe(2);
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBe(3);
    });
  });

  describe('roleFromGroups', () => {
    it('should return USER for empty groups', () => {
      expect(roleFromGroups([])).toBe('USER');
      expect(roleFromGroups()).toBe('USER');
    });

    it('should return SUPER_ADMIN for authentik Admins group', () => {
      expect(roleFromGroups(['authentik Admins'])).toBe('SUPER_ADMIN');
      expect(roleFromGroups(['Authentik Admins'])).toBe('SUPER_ADMIN'); // case insensitive
    });

    it('should return SUPER_ADMIN for Administrators group', () => {
      expect(roleFromGroups(['Administrators'])).toBe('SUPER_ADMIN');
    });

    it('should return ADMIN for admins group', () => {
      expect(roleFromGroups(['admins'])).toBe('ADMIN');
      expect(roleFromGroups(['Admins'])).toBe('ADMIN');
    });

    it('should return highest role when multiple groups present', () => {
      expect(roleFromGroups(['viewers', 'admins', 'Administrators'])).toBe('SUPER_ADMIN');
      expect(roleFromGroups(['viewers', 'admins'])).toBe('ADMIN');
    });

    it('should return USER for unknown groups', () => {
      expect(roleFromGroups(['random-group', 'another-group'])).toBe('USER');
    });
  });

  describe('hasRole', () => {
    it('should return true when user has exact role', () => {
      expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
      expect(hasRole('USER', 'USER')).toBe(true);
    });

    it('should return true when user has higher role', () => {
      expect(hasRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(hasRole('SUPER_ADMIN', 'USER')).toBe(true);
      expect(hasRole('ADMIN', 'USER')).toBe(true);
      expect(hasRole('USER', 'VIEWER')).toBe(true);
    });

    it('should return false when user has lower role', () => {
      expect(hasRole('USER', 'ADMIN')).toBe(false);
      expect(hasRole('USER', 'SUPER_ADMIN')).toBe(false);
      expect(hasRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
      expect(hasRole('VIEWER', 'USER')).toBe(false);
    });
  });

  describe('requireRole middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        user: null,
        dbUser: null,
        path: '/test',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should return 401 when user is not authenticated', () => {
      const middleware = requireRole('USER');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Authentication required',
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks required role', () => {
      mockReq.user = { id: '123', groups: [] };
      mockReq.dbUser = { role: 'USER' };

      const middleware = requireRole('ADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Insufficient permissions',
        required: ['ADMIN'],
        current: 'USER',
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when user has required role', () => {
      mockReq.user = { id: '123', groups: ['admins'] };
      mockReq.dbUser = { role: 'ADMIN' };

      const middleware = requireRole('ADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.userRole).toBe('ADMIN');
    });

    it('should call next when user has higher role', () => {
      mockReq.user = { id: '123', groups: ['Administrators'] };
      mockReq.dbUser = { role: 'SUPER_ADMIN' };

      const middleware = requireRole('USER');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.userRole).toBe('SUPER_ADMIN');
    });

    it('should derive role from groups when dbUser not present', () => {
      mockReq.user = { id: '123', groups: ['authentik Admins'] };
      // No dbUser

      const middleware = requireRole('ADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.userRole).toBe('SUPER_ADMIN');
    });

    it('should allow access for any of multiple allowed roles', () => {
      mockReq.user = { id: '123', groups: [] };
      mockReq.dbUser = { role: 'ADMIN' };

      const middleware = requireRole('SUPER_ADMIN', 'ADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        user: { id: '123', groups: [] },
        dbUser: null,
        path: '/test',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should block USER role', () => {
      mockReq.dbUser = { role: 'USER' };

      const middleware = requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow ADMIN role', () => {
      mockReq.dbUser = { role: 'ADMIN' };

      const middleware = requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN role', () => {
      mockReq.dbUser = { role: 'SUPER_ADMIN' };

      const middleware = requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        user: { id: '123', groups: [] },
        dbUser: null,
        path: '/test',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should block ADMIN role', () => {
      mockReq.dbUser = { role: 'ADMIN' };

      const middleware = requireSuperAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block USER role', () => {
      mockReq.dbUser = { role: 'USER' };

      const middleware = requireSuperAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN role', () => {
      mockReq.dbUser = { role: 'SUPER_ADMIN' };

      const middleware = requireSuperAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
