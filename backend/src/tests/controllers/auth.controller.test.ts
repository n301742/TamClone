import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { register } from '../../controllers/auth.controller';
import { AuthProvider, UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Import the mocked prisma client
import { prisma } from '../../app';

describe('Auth Controller - Register', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, and next function
    req = {
      body: {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        mobileNumber: '+1234567890',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
    
    // Mock bcrypt functions
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    
    // Mock jwt.sign
    (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
      if (options.expiresIn === '7d') {
        return 'refresh-token';
      }
      return 'access-token';
    });
  });
  
  it('should register a new user successfully', async () => {
    // Mock prisma findUnique to return null (user doesn't exist)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Mock prisma create to return a new user
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      mobileNumber: '+1234567890',
      passwordHash: 'hashedPassword',
      authProvider: AuthProvider.LOCAL,
      role: UserRole.USER,
      documentRetentionDays: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
    
    // Call the register function
    await register(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    
    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt');
    
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        mobileNumber: '+1234567890',
        authProvider: AuthProvider.LOCAL,
        role: UserRole.USER,
        documentRetentionDays: 30,
      },
    });
    
    expect(jwt.sign).toHaveBeenCalledTimes(2);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.USER,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
  });
  
  it('should return 409 if user already exists', async () => {
    // Mock prisma findUnique to return an existing user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '123',
      email: 'test@example.com',
    });
    
    // Call the register function
    await register(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'User with this email already exists',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the register function
    await register(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
}); 