import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../app';
import { User, UserRole, AuthProvider } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { register } from '../../controllers/auth.controller';

// Mock dependencies
jest.mock('../../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
}));

describe('Auth Controller - Register', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request with registration data
    mockRequest = {
      body: {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        mobileNumber: '+1234567890',
      },
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup mock next function
    mockNext = jest.fn();
  });

  it('should return 409 if user already exists', async () => {
    // Setup the Prisma mock to return an existing user
    const mockUser = {
      id: 'existing-user-id',
      email: 'newuser@example.com',
    };
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // Call the register function
    await register(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('already exists'),
      })
    );
    
    // Verify user.create was not called
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should create a new user and return 201 on successful registration', async () => {
    // Setup the Prisma mock to return null (user not found)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Setup the Prisma mock to return a created user
    const mockCreatedUser = {
      id: 'new-user-id',
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      mobileNumber: '+1234567890',
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
      createdAt: new Date(),
    };
    
    (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);

    // Call the register function
    await register(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('registered successfully'),
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: mockCreatedUser.id,
            email: mockCreatedUser.email,
          }),
          accessToken: 'mock-token',
          refreshToken: 'mock-token',
        }),
      })
    );
    
    // Verify bcrypt.genSalt and bcrypt.hash were called
    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith(
      mockRequest.body.password,
      'salt'
    );
    
    // Verify user.create was called with the correct data
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: mockRequest.body.email,
          firstName: mockRequest.body.firstName,
          lastName: mockRequest.body.lastName,
          passwordHash: 'hashed-password',
          authProvider: AuthProvider.LOCAL,
          role: UserRole.USER,
          documentRetentionDays: 30,
        }),
      })
    );
    
    // Verify jwt.sign was called twice (for access token and refresh token)
    expect(jwt.sign).toHaveBeenCalledTimes(2);
  });

  it('should call next with error if an exception occurs', async () => {
    // Setup the Prisma mock to throw an error
    const mockError = new Error('Database error');
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(mockError);

    // Call the register function
    await register(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify next was called with the error
    expect(mockNext).toHaveBeenCalledWith(mockError);
    
    // Verify response methods were not called
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
}); 