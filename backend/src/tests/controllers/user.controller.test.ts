import { Request, Response, NextFunction } from 'express';
import { getCurrentUser } from '../../controllers/user.controller';
import { User, UserRole, AuthProvider } from '@prisma/client';

// Mock dependencies
jest.mock('../../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Import the mocked prisma client
import { prisma } from '../../app';

describe('User Controller - getCurrentUser', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, and next function
    req = {
      user: {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      } as User,
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should return the current user profile', async () => {
    // Mock user data with billing info
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      mobileNumber: '+1234567890',
      profilePicture: 'profile.jpg',
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
      documentRetentionDays: 30,
      darkMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      billingInfo: {
        id: '456',
        paymentMethod: 'credit_card',
        billingAddress: '{"street":"123 Main St","city":"Anytown","state":"CA","zip":"12345","country":"USA"}',
      },
    };
    
    // Mock prisma findUnique to return the user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    
    // Call the getCurrentUser function
    await getCurrentUser(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        profilePicture: true,
        role: true,
        authProvider: true,
        documentRetentionDays: true,
        darkMode: true,
        createdAt: true,
        updatedAt: true,
        billingInfo: {
          select: {
            id: true,
            paymentMethod: true,
            billingAddress: true,
          },
        },
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { user: mockUser },
    });
  });
  
  it('should return 404 if user is not found', async () => {
    // Mock prisma findUnique to return null (user not found)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the getCurrentUser function
    await getCurrentUser(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
      select: expect.any(Object),
    });
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'User not found',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the getCurrentUser function
    await getCurrentUser(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
}); 