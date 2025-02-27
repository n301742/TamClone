import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../app';
import { User, UserRole, AuthProvider } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { login } from '../../controllers/auth.controller';

// Mock dependencies
jest.mock('../../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
}));

describe('Auth Controller - Login', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request with login credentials
    mockRequest = {
      body: {
        email: 'user@example.com',
        password: 'Password123!',
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

  it('should return 401 if user does not exist', async () => {
    // Setup the Prisma mock to return null (user not found)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    // Call the login function
    await login(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Invalid email or password'),
      })
    );
    
    // Verify bcrypt.compare was not called
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should return 401 if user is using a different auth provider', async () => {
    // Mock user data with Google auth provider
    const mockUser = {
      id: 'user-id-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      authProvider: AuthProvider.GOOGLE,
    };

    // Setup the Prisma mock to return our test data
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // Call the login function
    await login(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Invalid email or password'),
      })
    );
    
    // Verify bcrypt.compare was not called
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should return 401 if password is invalid', async () => {
    // Mock user data
    const mockUser = {
      id: 'user-id-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
    };

    // Setup the Prisma mock to return our test data
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // Setup bcrypt to return false (invalid password)
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    // Call the login function
    await login(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Invalid email or password'),
      })
    );
    
    // Verify bcrypt.compare was called with the correct parameters
    expect(bcrypt.compare).toHaveBeenCalledWith(
      mockRequest.body.password,
      mockUser.passwordHash
    );
  });

  it('should return user data and tokens if login is successful', async () => {
    // Mock user data
    const mockUser = {
      id: 'user-id-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
    };

    // Setup the Prisma mock to return our test data
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // Setup bcrypt to return true (valid password)
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Call the login function
    await login(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('Login successful'),
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
          }),
          accessToken: 'mock-token',
          refreshToken: 'mock-token',
        }),
      })
    );
    
    // Verify bcrypt.compare was called with the correct parameters
    expect(bcrypt.compare).toHaveBeenCalledWith(
      mockRequest.body.password,
      mockUser.passwordHash
    );
    
    // Verify jwt.sign was called twice (for access token and refresh token)
    expect(jwt.sign).toHaveBeenCalledTimes(2);
  });

  it('should call next with error if an exception occurs', async () => {
    // Setup the Prisma mock to throw an error
    const mockError = new Error('Database error');
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(mockError);

    // Call the login function
    await login(
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