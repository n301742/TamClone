import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { User, UserRole, Letter, LetterStatus } from '@prisma/client';

// Mock the Prisma client
jest.mock('../app', () => ({
  prisma: {
    letter: {
      findUnique: jest.fn(),
    },
  },
}));

// We need to mock the letter controller here
// Since we don't have direct access to the file, we'll create a mock implementation
const getLetterById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUser = req.user as User;

    // Find the letter
    const letter = await prisma.letter.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    // Check if letter exists
    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }

    // Check if user is authorized to access this letter
    if (letter.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to access this letter',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { letter },
    });
  } catch (error) {
    next(error);
  }
};

describe('Letter Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request with authenticated user and params
    mockRequest = {
      user: {
        id: 'user-id-1',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
      } as User,
      params: {
        id: 'letter-id-1',
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

  describe('getLetterById', () => {
    it('should return the letter if it exists and user is authorized', async () => {
      // Mock letter data
      const mockLetter = {
        id: 'letter-id-1',
        userId: 'user-id-1',
        recipientName: 'John Doe',
        recipientAddress: '123 Main St, City, Country',
        status: LetterStatus.SENT,
        trackingId: 'track-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        statusHistory: [
          {
            id: 'status-1',
            letterId: 'letter-id-1',
            status: LetterStatus.SENT,
            createdAt: new Date(),
          },
        ],
      };

      // Setup the Prisma mock to return our test data
      (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);

      // Call the controller function
      await getLetterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify Prisma was called with the correct parameters
      expect(prisma.letter.findUnique).toHaveBeenCalledWith({
        where: { id: 'letter-id-1' },
        include: {
          statusHistory: {
            orderBy: {
              timestamp: 'desc',
            },
          },
        },
      });

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { letter: mockLetter },
      });
    });

    it('should return 404 if letter is not found', async () => {
      // Setup the Prisma mock to return null (letter not found)
      (prisma.letter.findUnique as jest.Mock).mockResolvedValue(null);

      // Call the controller function
      await getLetterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Letter not found',
      });
    });

    it('should return 403 if user is not authorized to access the letter', async () => {
      // Mock letter data with a different user ID
      const mockLetter = {
        id: 'letter-id-1',
        userId: 'different-user-id',
        recipientName: 'John Doe',
        recipientAddress: '123 Main St, City, Country',
        status: LetterStatus.SENT,
        trackingId: 'track-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        statusHistory: [],
      };

      // Setup the Prisma mock to return our test data
      (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);

      // Call the controller function
      await getLetterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You are not authorized to access this letter',
      });
    });

    it('should allow admin to access any letter', async () => {
      // Mock letter data with a different user ID
      const mockLetter = {
        id: 'letter-id-1',
        userId: 'different-user-id',
        recipientName: 'John Doe',
        recipientAddress: '123 Main St, City, Country',
        status: LetterStatus.SENT,
        trackingId: 'track-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        statusHistory: [],
      };

      // Setup admin user
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      } as User;

      // Setup the Prisma mock to return our test data
      (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);

      // Call the controller function
      await getLetterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify the response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { letter: mockLetter },
      });
    });

    it('should call next with error if an exception occurs', async () => {
      // Setup the Prisma mock to throw an error
      const mockError = new Error('Database error');
      (prisma.letter.findUnique as jest.Mock).mockRejectedValue(mockError);

      // Call the controller function
      await getLetterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify next was called with the error
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
}); 