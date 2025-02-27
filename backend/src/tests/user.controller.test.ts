import { Request, Response, NextFunction } from 'express';
import { getCurrentUser } from '../controllers/user.controller';
import { prisma } from '../app';
import { User, UserRole } from '@prisma/client';

// Mock the Prisma client
jest.mock('../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('User Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request with authenticated user
    mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
      } as User,
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup mock next function
    mockNext = jest.fn();
  });

  describe('getCurrentUser', () => {
    it('should return the current user profile', async () => {
      // Mock the user data that Prisma would return
      const mockUserData = {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        mobileNumber: '1234567890',
        profilePicture: null,
        role: UserRole.USER,
        authProvider: 'LOCAL',
        documentRetentionDays: 30,
        darkMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        billingInfo: null,
      };

      // Setup the Prisma mock to return our test data
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData);

      // Call the controller function
      await getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify Prisma was called with the correct parameters
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          // ... other fields
        }),
      });

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: mockUserData },
      });
    });

    it('should return 404 if user is not found', async () => {
      // Setup the Prisma mock to return null (user not found)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Call the controller function
      await getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found',
      });
    });

    it('should call next with error if an exception occurs', async () => {
      // Setup the Prisma mock to throw an error
      const mockError = new Error('Database error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(mockError);

      // Call the controller function
      await getCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify next was called with the error
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
}); 