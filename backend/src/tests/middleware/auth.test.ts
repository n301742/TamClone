import { Request, Response, NextFunction } from 'express';
import { isAdmin, isResourceOwner } from '../../middleware/auth';
import { User, UserRole } from '@prisma/client';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup response and next function
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  describe('isAdmin', () => {
    it('should call next() if user is an admin', () => {
      // Setup request with admin user
      req = {
        user: {
          id: '123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as User,
      };
      
      // Call the middleware
      isAdmin(req as Request, res as Response, next);
      
      // Assertions
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    it('should return 401 if user is not authenticated', () => {
      // Setup request with no user
      req = {};
      
      // Call the middleware
      isAdmin(req as Request, res as Response, next);
      
      // Assertions
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized - Authentication required',
      });
    });
    
    it('should return 403 if user is not an admin', () => {
      // Setup request with regular user
      req = {
        user: {
          id: '123',
          email: 'user@example.com',
          role: UserRole.USER,
        } as User,
      };
      
      // Call the middleware
      isAdmin(req as Request, res as Response, next);
      
      // Assertions
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Forbidden - Admin access required',
      });
    });
  });
  
  describe('isResourceOwner', () => {
    it('should call next() if user is accessing their own resource', () => {
      // Setup request with user and matching resource ID
      req = {
        user: {
          id: '123',
          email: 'user@example.com',
          role: UserRole.USER,
        } as User,
        params: {
          id: '123',
        },
      };
      
      // Call the middleware
      const middleware = isResourceOwner();
      middleware(req as Request, res as Response, next);
      
      // Assertions
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    it('should call next() if user is an admin accessing another resource', () => {
      // Setup request with admin user and different resource ID
      req = {
        user: {
          id: '123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as User,
        params: {
          id: '456',
        },
      };
      
      // Call the middleware
      const middleware = isResourceOwner();
      middleware(req as Request, res as Response, next);
      
      // Assertions
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
    
    it('should return 401 if user is not authenticated', () => {
      // Setup request with no user
      req = {
        params: {
          id: '123',
        },
      };
      
      // Call the middleware
      const middleware = isResourceOwner();
      middleware(req as Request, res as Response, next);
      
      // Assertions
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized - Authentication required',
      });
    });
    
    it('should return 403 if user is accessing another resource', () => {
      // Setup request with regular user and different resource ID
      req = {
        user: {
          id: '123',
          email: 'user@example.com',
          role: UserRole.USER,
        } as User,
        params: {
          id: '456',
        },
      };
      
      // Call the middleware
      const middleware = isResourceOwner();
      middleware(req as Request, res as Response, next);
      
      // Assertions
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Forbidden - You can only access your own resources',
      });
    });
    
    it('should use custom parameter field if provided', () => {
      // Setup request with user and matching resource ID in custom field
      req = {
        user: {
          id: '123',
          email: 'user@example.com',
          role: UserRole.USER,
        } as User,
        params: {
          userId: '123',
        },
      };
      
      // Call the middleware with custom parameter field
      const middleware = isResourceOwner('userId');
      middleware(req as Request, res as Response, next);
      
      // Assertions
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
}); 