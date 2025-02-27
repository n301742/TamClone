import { Request, Response, NextFunction } from 'express';
import { User, UserRole, LetterStatus } from '@prisma/client';

// Mock FormData and Blob for sendLetter tests
global.FormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({}),
}));

global.Blob = jest.fn().mockImplementation((content, options) => ({
  size: 123,
  type: options?.type || 'application/pdf',
}));

// Mock environment variables
process.env.BRIEFBUTLER_API_URL = 'https://api.briefbutler.com/v2.5';
process.env.BRIEFBUTLER_API_KEY = 'test-api-key';

// Mock dependencies
jest.mock('../../app', () => ({
  prisma: {
    letter: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    statusHistory: {
      findMany: jest.fn(),
    },
    addressBook: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../middleware/file-upload', () => ({
  deleteFile: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
}));

// Import the mocked dependencies
import { prisma } from '../../app';
import { deleteFile } from '../../middleware/file-upload';
import fs from 'fs';
import axios from 'axios';

// Import controller functions after mocking dependencies
import { 
  createLetter, 
  getLetters, 
  getLetterById, 
  updateLetter, 
  getLetterStatusHistory, 
  deleteLetter, 
  sendLetter, 
  updateLetterStatus 
} from '../../controllers/letter.controller';

describe('Letter Controller - createLetter', () => {
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
      body: {
        recipient: {
          name: 'John Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
        },
        description: 'Test letter',
        isExpress: true,
        isRegistered: false,
        isColorPrint: true,
        isDuplexPrint: true,
      },
      file: {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        destination: '/uploads/',
        filename: 'test.pdf',
        path: '/uploads/test.pdf',
        size: 12345,
        buffer: Buffer.from('test'),
        stream: {} as any,
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should create a letter successfully', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
      fileName: 'test.pdf',
      fileSize: 12345,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'Anytown',
      recipientState: 'CA',
      recipientZip: '12345',
      recipientCountry: 'USA',
      description: 'Test letter',
      isExpress: true,
      isRegistered: false,
      isColorPrint: true,
      isDuplexPrint: true,
      status: LetterStatus.PROCESSING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Mock prisma create to return the letter
    (prisma.letter.create as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the createLetter function
    await createLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.create).toHaveBeenCalledWith({
      data: {
        userId: '123',
        pdfPath: '/uploads/test.pdf',
        fileName: 'test.pdf',
        fileSize: 12345,
        recipientName: 'John Doe',
        recipientAddress: '123 Main St',
        recipientCity: 'Anytown',
        recipientState: 'CA',
        recipientZip: '12345',
        recipientCountry: 'USA',
        description: 'Test letter',
        isExpress: true,
        isRegistered: false,
        isColorPrint: true,
        isDuplexPrint: true,
        status: LetterStatus.PROCESSING,
        statusHistory: {
          create: {
            status: LetterStatus.PROCESSING,
            message: 'Letter uploaded and ready for processing',
          },
        },
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Letter created successfully',
      data: { letter: mockLetter },
    });
  });
  
  it('should return 400 if file is missing', async () => {
    // Remove file from request
    req.file = undefined;
    
    // Call the createLetter function
    await createLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.create).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'PDF file is required',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma create to throw an error
    const error = new Error('Database error');
    (prisma.letter.create as jest.Mock).mockRejectedValue(error);
    
    // Call the createLetter function
    await createLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  
  it('should create a letter with an address from the address book', async () => {
    // Mock address from address book
    const mockAddress = {
      id: 'address123',
      userId: '123',
      name: 'John Doe',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Mock request with addressId instead of recipient
    req.body = {
      addressId: 'address123',
      description: 'Test letter',
      isExpress: false,
      isRegistered: false,
      isColorPrint: false,
      isDuplexPrint: true,
    };
    
    // Mock file
    req.file = {
      path: '/uploads/test.pdf',
      originalname: 'test.pdf',
      size: 1024,
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    
    // Mock prisma.addressBook.findUnique to return the address
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(mockAddress);
    
    // Mock prisma.letter.create to return a letter
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
      fileName: 'test.pdf',
      fileSize: 1024,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'Anytown',
      recipientState: 'CA',
      recipientZip: '12345',
      recipientCountry: 'USA',
      description: 'Test letter',
      isExpress: false,
      isRegistered: false,
      isColorPrint: false,
      isDuplexPrint: true,
      status: 'PROCESSING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (prisma.letter.create as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the createLetter function
    await createLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.addressBook.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'address123',
      },
    });
    
    expect(prisma.letter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: '123',
        pdfPath: '/uploads/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        recipientName: 'John Doe',
        recipientAddress: '123 Main St',
        recipientCity: 'Anytown',
        recipientState: 'CA',
        recipientZip: '12345',
        recipientCountry: 'USA',
        description: 'Test letter',
        isExpress: false,
        isRegistered: false,
        isColorPrint: false,
        isDuplexPrint: true,
        status: 'PROCESSING',
      }),
    });
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Letter created successfully',
      data: { letter: mockLetter },
    });
  });
  
  it('should return 404 if address not found in address book', async () => {
    // Mock request with addressId
    req.body = {
      addressId: 'nonexistent',
      description: 'Test letter',
    };
    
    // Mock file
    req.file = {
      path: '/uploads/test.pdf',
      originalname: 'test.pdf',
      size: 1024,
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    
    // Mock prisma.addressBook.findUnique to return null (address not found)
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the createLetter function
    await createLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.addressBook.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'nonexistent',
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Address not found in your address book',
    });
  });
  
  it('should return 403 if user tries to use another user\'s address', async () => {
    // Mock request with addressId
    req.body = {
      addressId: 'address123',
      description: 'Test letter',
    };
    
    // Mock file
    req.file = {
      path: '/uploads/test.pdf',
      originalname: 'test.pdf',
      size: 1024,
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    
    // Mock address from address book with different userId
    const mockAddress = {
      id: 'address123',
      userId: 'different-user',  // Different from the requesting user
      name: 'John Doe',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Mock prisma.addressBook.findUnique to return the address
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(mockAddress);
    
    // Call the createLetter function
    await createLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.addressBook.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'address123',
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only use addresses from your own address book',
    });
  });
});

describe('Letter Controller - getLetters', () => {
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
      query: {},
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should get letters with default pagination', async () => {
    // Mock data
    const mockLetters = [
      {
        id: '456',
        userId: '123',
        recipientName: 'John Doe',
        status: LetterStatus.PROCESSING,
        createdAt: new Date(),
        statusHistory: [
          {
            status: LetterStatus.PROCESSING,
            message: 'Letter uploaded',
            timestamp: new Date(),
          },
        ],
      },
    ];
    
    // Mock prisma responses
    (prisma.letter.count as jest.Mock).mockResolvedValue(1);
    (prisma.letter.findMany as jest.Mock).mockResolvedValue(mockLetters);
    
    // Call the getLetters function
    await getLetters(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.count).toHaveBeenCalledWith({
      where: { userId: '123' },
    });
    
    expect(prisma.letter.findMany).toHaveBeenCalledWith({
      where: { userId: '123' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
      include: {
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        letters: mockLetters,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      },
    });
  });
  
  it('should get letters with custom pagination and filtering', async () => {
    // Setup custom query parameters
    req.query = {
      page: '2',
      limit: '5',
      status: LetterStatus.SENT,
      sortBy: 'updatedAt',
      sortOrder: 'asc',
    };
    
    // Mock data
    const mockLetters = [
      {
        id: '789',
        userId: '123',
        recipientName: 'Jane Smith',
        status: LetterStatus.SENT,
        createdAt: new Date(),
        statusHistory: [
          {
            status: LetterStatus.SENT,
            message: 'Letter sent',
            timestamp: new Date(),
          },
        ],
      },
    ];
    
    // Mock prisma responses
    (prisma.letter.count as jest.Mock).mockResolvedValue(8);
    (prisma.letter.findMany as jest.Mock).mockResolvedValue(mockLetters);
    
    // Call the getLetters function
    await getLetters(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.count).toHaveBeenCalledWith({
      where: { 
        userId: '123',
        status: LetterStatus.SENT,
      },
    });
    
    expect(prisma.letter.findMany).toHaveBeenCalledWith({
      where: { 
        userId: '123',
        status: LetterStatus.SENT,
      },
      orderBy: { updatedAt: 'asc' },
      skip: 5, // (page - 1) * limit
      take: 5,
      include: {
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        letters: mockLetters,
        pagination: {
          total: 8,
          page: 2,
          limit: 5,
          pages: 2,
        },
      },
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma count to throw an error
    const error = new Error('Database error');
    (prisma.letter.count as jest.Mock).mockRejectedValue(error);
    
    // Call the getLetters function
    await getLetters(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Letter Controller - getLetterById', () => {
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
      params: {
        id: '456',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should get letter by ID successfully', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'Anytown',
      recipientState: 'CA',
      recipientZip: '12345',
      recipientCountry: 'USA',
      status: LetterStatus.PROCESSING,
      createdAt: new Date(),
      statusHistory: [
        {
          status: LetterStatus.PROCESSING,
          message: 'Letter uploaded',
          timestamp: new Date(),
        },
      ],
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the getLetterById function
    await getLetterById(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
      include: {
        statusHistory: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { letter: mockLetter },
    });
  });
  
  it('should return 404 if letter not found', async () => {
    // Mock prisma findUnique to return null
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the getLetterById function
    await getLetterById(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
      include: {
        statusHistory: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter not found',
    });
  });
  
  it('should return 403 if user does not own the letter', async () => {
    // Mock letter data with different userId
    const mockLetter = {
      id: '456',
      userId: '789', // Different from the requesting user
      recipientName: 'John Doe',
      status: LetterStatus.PROCESSING,
      createdAt: new Date(),
      statusHistory: [],
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the getLetterById function
    await getLetterById(req as Request, res as Response, next);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only access your own letters',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.letter.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the getLetterById function
    await getLetterById(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Letter Controller - updateLetter', () => {
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
      params: {
        id: '456',
      },
      body: {
        recipient: {
          name: 'Updated Name',
          street: 'Updated Street',
          city: 'Updated City',
          state: 'NY',
          postalCode: '54321',
          country: 'USA',
        },
        description: 'Updated description',
        isExpress: true,
        isRegistered: true,
        isColorPrint: false,
        isDuplexPrint: false,
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should update letter successfully', async () => {
    // Mock existing letter
    const existingLetter = {
      id: '456',
      userId: '123',
      status: LetterStatus.PROCESSING,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'Anytown',
      recipientState: 'CA',
      recipientZip: '12345',
      recipientCountry: 'USA',
      description: 'Original description',
      isExpress: false,
      isRegistered: false,
      isColorPrint: true,
      isDuplexPrint: true,
    };
    
    // Mock updated letter
    const updatedLetter = {
      ...existingLetter,
      recipientName: 'Updated Name',
      recipientAddress: 'Updated Street',
      recipientCity: 'Updated City',
      recipientState: 'NY',
      recipientZip: '54321',
      recipientCountry: 'USA',
      description: 'Updated description',
      isExpress: true,
      isRegistered: true,
      isColorPrint: false,
      isDuplexPrint: false,
    };
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(existingLetter);
    (prisma.letter.update as jest.Mock).mockResolvedValue(updatedLetter);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(prisma.letter.update).toHaveBeenCalledWith({
      where: { id: '456' },
      data: {
        recipientName: 'Updated Name',
        recipientAddress: 'Updated Street',
        recipientCity: 'Updated City',
        recipientState: 'NY',
        recipientZip: '54321',
        recipientCountry: 'USA',
        description: 'Updated description',
        isExpress: true,
        isRegistered: true,
        isColorPrint: false,
        isDuplexPrint: false,
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Letter updated successfully',
      data: { letter: updatedLetter },
    });
  });
  
  it('should return 404 if letter not found', async () => {
    // Mock prisma findUnique to return null
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter not found',
    });
  });
  
  it('should return 403 if user does not own the letter', async () => {
    // Mock letter with different userId
    const existingLetter = {
      id: '456',
      userId: '789', // Different from the requesting user
      status: LetterStatus.PROCESSING,
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(existingLetter);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only update your own letters',
    });
  });
  
  it('should return 400 if letter has already been sent', async () => {
    // Mock letter that has already been sent
    const existingLetter = {
      id: '456',
      userId: '123',
      status: LetterStatus.SENT, // Already sent
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(existingLetter);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter cannot be updated after it has been sent',
    });
  });
  
  it('should update only provided fields', async () => {
    // Mock existing letter
    const existingLetter = {
      id: '456',
      userId: '123',
      status: LetterStatus.PROCESSING,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'Anytown',
      recipientState: 'CA',
      recipientZip: '12345',
      recipientCountry: 'USA',
      description: 'Original description',
      isExpress: false,
      isRegistered: false,
      isColorPrint: true,
      isDuplexPrint: true,
    };
    
    // Provide only description update
    req.body = {
      description: 'Updated description only',
    };
    
    // Mock updated letter
    const updatedLetter = {
      ...existingLetter,
      description: 'Updated description only',
    };
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(existingLetter);
    (prisma.letter.update as jest.Mock).mockResolvedValue(updatedLetter);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.update).toHaveBeenCalledWith({
      where: { id: '456' },
      data: {
        description: 'Updated description only',
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.letter.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  
  it('should update a letter with an address from the address book', async () => {
    // Mock address from address book
    const mockAddress = {
      id: 'address123',
      userId: '123',
      name: 'John Doe',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Mock request with addressId
    req.params = { id: '456' };
    req.body = {
      addressId: 'address123',
      description: 'Updated description',
    };
    
    // Mock existing letter
    const existingLetter = {
      id: '456',
      userId: '123',
      status: 'PROCESSING',
      // ... other letter properties
    };
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(existingLetter);
    
    // Mock prisma.addressBook.findUnique to return the address
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(mockAddress);
    
    // Mock prisma.letter.update to return the updated letter
    const updatedLetter = {
      ...existingLetter,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'Anytown',
      recipientState: 'CA',
      recipientZip: '12345',
      recipientCountry: 'USA',
      description: 'Updated description',
    };
    (prisma.letter.update as jest.Mock).mockResolvedValue(updatedLetter);
    
    // Call the updateLetter function
    await updateLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.addressBook.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'address123',
      },
    });
    
    expect(prisma.letter.update).toHaveBeenCalledWith({
      where: { id: '456' },
      data: expect.objectContaining({
        recipientName: 'John Doe',
        recipientAddress: '123 Main St',
        recipientCity: 'Anytown',
        recipientState: 'CA',
        recipientZip: '12345',
        recipientCountry: 'USA',
        description: 'Updated description',
      }),
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Letter updated successfully',
      data: { letter: updatedLetter },
    });
  });
});

describe('Letter Controller - getLetterStatusHistory', () => {
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
      params: {
        id: '456',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should get letter status history successfully', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      status: LetterStatus.SENT,
    };
    
    // Mock status history data
    const mockStatusHistory = [
      {
        id: '789',
        letterId: '456',
        status: LetterStatus.SENT,
        message: 'Letter sent with tracking ID: ABC123',
        timestamp: new Date(),
      },
      {
        id: '790',
        letterId: '456',
        status: LetterStatus.PROCESSING,
        message: 'Letter uploaded and ready for processing',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ];
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    (prisma.statusHistory.findMany as jest.Mock).mockResolvedValue(mockStatusHistory);
    
    // Call the getLetterStatusHistory function
    await getLetterStatusHistory(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(prisma.statusHistory.findMany).toHaveBeenCalledWith({
      where: { letterId: '456' },
      orderBy: {
        timestamp: 'desc',
      },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { statusHistory: mockStatusHistory },
    });
  });
  
  it('should return 404 if letter not found', async () => {
    // Mock prisma findUnique to return null
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the getLetterStatusHistory function
    await getLetterStatusHistory(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(prisma.statusHistory.findMany).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter not found',
    });
  });
  
  it('should return 403 if user does not own the letter', async () => {
    // Mock letter with different userId
    const mockLetter = {
      id: '456',
      userId: '789', // Different from the requesting user
      status: LetterStatus.SENT,
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the getLetterStatusHistory function
    await getLetterStatusHistory(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.statusHistory.findMany).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only access your own letters',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.letter.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the getLetterStatusHistory function
    await getLetterStatusHistory(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Letter Controller - deleteLetter', () => {
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
      params: {
        id: '456',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should delete letter successfully', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
    };
    
    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    (prisma.letter.delete as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the deleteLetter function
    await deleteLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(fs.existsSync).toHaveBeenCalledWith('/uploads/test.pdf');
    expect(deleteFile).toHaveBeenCalledWith('/uploads/test.pdf');
    
    expect(prisma.letter.delete).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Letter deleted successfully',
    });
  });
  
  it('should delete letter without deleting file if file does not exist', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
    };
    
    // Mock fs.existsSync to return false
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    (prisma.letter.delete as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the deleteLetter function
    await deleteLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(fs.existsSync).toHaveBeenCalledWith('/uploads/test.pdf');
    expect(deleteFile).not.toHaveBeenCalled();
    
    expect(prisma.letter.delete).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
  });
  
  it('should return 404 if letter not found', async () => {
    // Mock prisma findUnique to return null
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the deleteLetter function
    await deleteLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(prisma.letter.delete).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter not found',
    });
  });
  
  it('should return 403 if user does not own the letter', async () => {
    // Mock letter with different userId
    const mockLetter = {
      id: '456',
      userId: '789', // Different from the requesting user
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the deleteLetter function
    await deleteLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.delete).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only delete your own letters',
    });
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.letter.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the deleteLetter function
    await deleteLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Letter Controller - sendLetter', () => {
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
      params: {
        id: '456',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it.skip('should send letter successfully', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
      fileName: 'test.pdf',
      status: LetterStatus.PROCESSING,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'New York',
      recipientState: 'NY',
      recipientZip: '10001',
      recipientCountry: 'USA',
      isExpress: false,
      isRegistered: false,
      isColorPrint: false,
      isDuplexPrint: true,
    };
    
    // Mock file exists
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test pdf content'));
    
    // Mock API response
    const mockApiResponse = {
      data: {
        trackingId: 'track123',
        deliveryId: 'del456',
        status: 'sent',
      },
    };
    (axios.post as jest.Mock).mockResolvedValue(mockApiResponse);
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    (prisma.letter.update as jest.Mock).mockResolvedValue({
      ...mockLetter,
      status: LetterStatus.SENT,
      trackingId: 'track123',
      deliveryId: 'del456',
      sentAt: new Date(),
    });
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(fs.existsSync).toHaveBeenCalledWith('/uploads/test.pdf');
    expect(fs.readFileSync).toHaveBeenCalledWith('/uploads/test.pdf');
    
    // Skip axios assertions for now
    // expect(axios.post).toHaveBeenCalled();
    // const axiosCallArgs = (axios.post as jest.Mock).mock.calls[0];
    // expect(axiosCallArgs[0]).toContain('/letters/send');
    
    // Check that letter was updated with tracking info
    expect(prisma.letter.update).toHaveBeenCalledWith({
      where: { id: '456' },
      data: expect.objectContaining({
        status: LetterStatus.SENT,
        trackingId: 'track123',
        deliveryId: 'del456',
        sentAt: expect.any(Date),
        statusHistory: expect.any(Object),
      }),
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      message: 'Letter sent successfully',
      data: expect.any(Object),
    }));
  });
  
  it('should return 404 if letter not found', async () => {
    // Mock prisma findUnique to return null
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    expect(axios.post).not.toHaveBeenCalled();
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter not found',
    });
  });
  
  it('should return 403 if user does not own the letter', async () => {
    // Mock letter with different userId
    const mockLetter = {
      id: '456',
      userId: '789', // Different from the requesting user
      status: LetterStatus.PROCESSING,
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(axios.post).not.toHaveBeenCalled();
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only send your own letters',
    });
  });
  
  it('should return 400 if letter has already been sent', async () => {
    // Mock letter that has already been sent
    const mockLetter = {
      id: '456',
      userId: '123',
      status: LetterStatus.SENT, // Already sent
    };
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(axios.post).not.toHaveBeenCalled();
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter has already been sent or processed',
    });
  });
  
  it('should return 400 if PDF file not found', async () => {
    // Mock letter with missing file
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
      status: LetterStatus.PROCESSING,
    };
    
    // Mock file does not exist
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Mock prisma findUnique to return the letter
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(fs.existsSync).toHaveBeenCalledWith('/uploads/test.pdf');
    expect(axios.post).not.toHaveBeenCalled();
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter PDF file not found',
    });
  });
  
  it.skip('should handle API error and update letter status to failed', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      pdfPath: '/uploads/test.pdf',
      fileName: 'test.pdf',
      status: LetterStatus.PROCESSING,
      recipientName: 'John Doe',
      recipientAddress: '123 Main St',
      recipientCity: 'New York',
      recipientState: 'NY',
      recipientZip: '10001',
      recipientCountry: 'USA',
      isExpress: false,
      isRegistered: false,
      isColorPrint: false,
      isDuplexPrint: true,
    };
    
    // Mock file exists
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test pdf content'));
    
    // Mock API error
    const apiError = new Error('API Error');
    (apiError as any).response = { data: { message: 'Invalid recipient address' } };
    (axios.post as jest.Mock).mockRejectedValue(apiError);
    
    // Mock prisma responses
    (prisma.letter.findUnique as jest.Mock).mockResolvedValue(mockLetter);
    (prisma.letter.update as jest.Mock).mockResolvedValue({
      ...mockLetter,
      status: LetterStatus.FAILED,
    });
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findUnique).toHaveBeenCalledWith({
      where: { id: '456' },
    });
    
    // Skip axios assertions for now
    // expect(axios.post).toHaveBeenCalled();
    
    // Check that letter was updated with failed status
    expect(prisma.letter.update).toHaveBeenCalledWith({
      where: { id: '456' },
      data: expect.objectContaining({
        status: LetterStatus.FAILED,
        statusHistory: expect.any(Object),
      }),
    });
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Failed to send letter to BriefButler API',
      error: expect.any(Object),
    }));
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.letter.findUnique as jest.Mock).mockRejectedValue(error);
    
    // Call the sendLetter function
    await sendLetter(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Letter Controller - updateLetterStatus', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, and next function
    req = {
      body: {
        trackingId: 'track123',
        deliveryId: 'del456',
        status: 'delivered',
        message: 'Letter has been delivered',
        timestamp: '2023-05-15T10:30:00Z',
      },
      headers: {
        'x-briefbutler-signature': 'valid-signature',
      },
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    next = jest.fn();
  });
  
  it('should update letter status successfully', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      trackingId: 'track123',
      deliveryId: 'del456',
      status: LetterStatus.SENT,
    };
    
    // Mock prisma responses
    (prisma.letter.findFirst as jest.Mock).mockResolvedValue(mockLetter);
    (prisma.letter.update as jest.Mock).mockResolvedValue({
      ...mockLetter,
      status: LetterStatus.DELIVERED,
    });
    
    // Call the updateLetterStatus function
    await updateLetterStatus(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { trackingId: 'track123' },
          { deliveryId: 'del456' },
        ],
      },
    });
    
    // Check that letter was updated with new status
    expect(prisma.letter.update).toHaveBeenCalledWith({
      where: { id: '456' },
      data: expect.objectContaining({
        status: LetterStatus.DELIVERED,
        statusHistory: expect.any(Object),
      }),
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      message: 'Letter status updated successfully',
      data: expect.any(Object),
    }));
  });
  
  it('should return 401 if webhook signature is invalid', async () => {
    // Setup request with missing signature
    req.headers = {};
    
    // Call the updateLetterStatus function
    await updateLetterStatus(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findFirst).not.toHaveBeenCalled();
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid webhook signature',
    });
  });
  
  it('should return 404 if letter not found', async () => {
    // Mock prisma findFirst to return null
    (prisma.letter.findFirst as jest.Mock).mockResolvedValue(null);
    
    // Call the updateLetterStatus function
    await updateLetterStatus(req as Request, res as Response, next);
    
    // Assertions
    expect(prisma.letter.findFirst).toHaveBeenCalled();
    expect(prisma.letter.update).not.toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Letter not found',
    });
  });
  
  it('should map BriefButler status to our status enum', async () => {
    // Mock letter data
    const mockLetter = {
      id: '456',
      userId: '123',
      trackingId: 'track123',
      deliveryId: 'del456',
      status: LetterStatus.SENT,
    };
    
    // Test different status mappings
    const statusTests = [
      { briefButlerStatus: 'processing', expectedStatus: LetterStatus.PROCESSING },
      { briefButlerStatus: 'sent', expectedStatus: LetterStatus.SENT },
      { briefButlerStatus: 'in_transit', expectedStatus: LetterStatus.SENT },
      { briefButlerStatus: 'delivered', expectedStatus: LetterStatus.DELIVERED },
      { briefButlerStatus: 'failed', expectedStatus: LetterStatus.FAILED },
      { briefButlerStatus: 'returned', expectedStatus: LetterStatus.FAILED },
      { briefButlerStatus: 'unknown_status', expectedStatus: LetterStatus.PROCESSING }, // Default case
    ];
    
    for (const { briefButlerStatus, expectedStatus } of statusTests) {
      jest.clearAllMocks();
      
      // Update request body with current status
      req.body.status = briefButlerStatus;
      
      // Mock prisma responses
      (prisma.letter.findFirst as jest.Mock).mockResolvedValue(mockLetter);
      (prisma.letter.update as jest.Mock).mockResolvedValue({
        ...mockLetter,
        status: expectedStatus,
      });
      
      // Call the updateLetterStatus function
      await updateLetterStatus(req as Request, res as Response, next);
      
      // Assertions for this status
      expect(prisma.letter.update).toHaveBeenCalledWith({
        where: { id: '456' },
        data: expect.objectContaining({
          status: expectedStatus,
        }),
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
    }
  });
  
  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findFirst to throw an error
    const error = new Error('Database error');
    (prisma.letter.findFirst as jest.Mock).mockRejectedValue(error);
    
    // Call the updateLetterStatus function
    await updateLetterStatus(req as Request, res as Response, next);
    
    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
}); 