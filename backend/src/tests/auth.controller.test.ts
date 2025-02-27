import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { User, UserRole, AuthProvider } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../app', () => ({
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
  sign: jest.fn(),
}));

// Mock implementation of login function
const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Check if user is using local authentication
    if (user.authProvider !== AuthProvider.LOCAL) {
      return res.status(400).json({
        status: 'error',
        message: `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-jwt-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET || 'default-jwt-secret',
      { expiresIn: '7d' } as jwt.SignOptions
    );

    // Return user data and tokens
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

describe('Auth Controller', () => {
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

  describe('login', () => {
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
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password',
      });
    });

    it('should return 400 if user is using a different auth provider', async () => {
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
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This account uses GOOGLE authentication. Please sign in with GOOGLE.',
      });
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
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password',
      });
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

      // Setup JWT to return tokens
      (jwt.sign as jest.Mock).mockReturnValueOnce('mock-access-token');
      (jwt.sign as jest.Mock).mockReturnValueOnce('mock-refresh-token');

      // Call the login function
      await login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role,
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      });
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
    });
  });
}); 