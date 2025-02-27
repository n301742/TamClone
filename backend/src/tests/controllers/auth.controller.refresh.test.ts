import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { refreshToken } from '../../controllers/auth.controller';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Import the mocked prisma client
import { prisma } from '../../app';

describe('Auth Controller - Refresh Token', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, and next function
    req = {
      body: {
        refreshToken: 'valid-refresh-token',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
    
    // Mock jwt.sign
    (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
      if (options.expiresIn === '7d') {
        return 'new-refresh-token';
      }
      return 'new-access-token';
    });
  });
  
  it('should refresh tokens successfully', async () => {
    // Mock jwt.verify to return a decoded token
    (jwt.verify as jest.Mock).mockReturnValue({ sub: '123' });
    
    // Mock user data
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
    };
    
    // Mock prisma findUnique to return the user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    
    // Call the refreshToken function
    await refreshToken(req as Request, res as Response, next);
    
    // Assertions
    expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', expect.any(String));
    
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
    
    expect(jwt.sign).toHaveBeenCalledTimes(2);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });
  });
  
  it('should return 400 if refresh token is missing', async () => {
    // Set up request with missing refresh token
    req.body = {};
    
    // Call the refreshToken function
    await refreshToken(req as Request, res as Response, next);
    
    // Assertions
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Refresh token is required',
    });
  });
  
  it('should return 401 if refresh token is invalid', async () => {
    // Mock jwt.verify to throw an error
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    // Call the refreshToken function
    await refreshToken(req as Request, res as Response, next);
    
    // Assertions
    expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', expect.any(String));
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid or expired refresh token',
    });
  });
  
  it('should return 401 if user is not found', async () => {
    // Mock jwt.verify to return a decoded token
    (jwt.verify as jest.Mock).mockReturnValue({ sub: '123' });
    
    // Mock prisma findUnique to return null (user not found)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the refreshToken function
    await refreshToken(req as Request, res as Response, next);
    
    // Assertions
    expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', expect.any(String));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
    expect(jwt.sign).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'User not found',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock jwt.verify to return a decoded token
    (jwt.verify as jest.Mock).mockReturnValue({ sub: '123' });
    
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the refreshToken function
    await refreshToken(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
}); 