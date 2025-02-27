import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../app', () => ({
  prisma: {
    addressBook: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Import the mocked dependencies
import { prisma } from '../../app';

// Import controller functions after mocking dependencies
import {
  createAddress,
  getAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../controllers/address-book.controller';

describe('Address Book Controller - createAddress', () => {
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
        name: 'John Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        isDefault: false,
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  it('should create an address successfully', async () => {
    // Mock address data
    const mockAddress = {
      id: '456',
      userId: '123',
      name: 'John Doe',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock prisma create to return the address
    (prisma.addressBook.create as jest.Mock).mockResolvedValue(mockAddress);

    // Call the createAddress function
    await createAddress(req as Request, res as Response, next);

    // Assertions
    expect(prisma.addressBook.create).toHaveBeenCalledWith({
      data: {
        userId: '123',
        name: 'John Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        isDefault: false,
      },
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Address created successfully',
      data: { address: mockAddress },
    });
  });

  it('should unset existing default address when creating a new default', async () => {
    // Set isDefault to true in the request
    req.body.isDefault = true;

    // Mock address data
    const mockAddress = {
      id: '456',
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

    // Mock prisma create to return the address
    (prisma.addressBook.create as jest.Mock).mockResolvedValue(mockAddress);

    // Call the createAddress function
    await createAddress(req as Request, res as Response, next);

    // Assertions
    expect(prisma.addressBook.updateMany).toHaveBeenCalledWith({
      where: {
        userId: '123',
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    expect(prisma.addressBook.create).toHaveBeenCalledWith({
      data: {
        userId: '123',
        name: 'John Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        isDefault: true,
      },
    });

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should call next with error if an exception occurs', async () => {
    // Mock prisma create to throw an error
    const error = new Error('Database error');
    (prisma.addressBook.create as jest.Mock).mockRejectedValue(error);

    // Call the createAddress function
    await createAddress(req as Request, res as Response, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Address Book Controller - getAddresses', () => {
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

  it('should get all addresses for the user', async () => {
    // Mock addresses data
    const mockAddresses = [
      {
        id: '456',
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
      },
      {
        id: '789',
        userId: '123',
        name: 'Jane Smith',
        address: '456 Oak Ave',
        city: 'Othertown',
        state: 'NY',
        postalCode: '67890',
        country: 'USA',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Mock prisma findMany to return the addresses
    (prisma.addressBook.findMany as jest.Mock).mockResolvedValue(mockAddresses);

    // Call the getAddresses function
    await getAddresses(req as Request, res as Response, next);

    // Assertions
    expect(prisma.addressBook.findMany).toHaveBeenCalledWith({
      where: {
        userId: '123',
      },
      orderBy: {
        isDefault: 'desc',
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { addresses: mockAddresses },
    });
  });

  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findMany to throw an error
    const error = new Error('Database error');
    (prisma.addressBook.findMany as jest.Mock).mockRejectedValue(error);

    // Call the getAddresses function
    await getAddresses(req as Request, res as Response, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('Address Book Controller - getAddressById', () => {
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

  it('should get address by ID successfully', async () => {
    // Mock address data
    const mockAddress = {
      id: '456',
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

    // Mock prisma findUnique to return the address
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(mockAddress);

    // Call the getAddressById function
    await getAddressById(req as Request, res as Response, next);

    // Assertions
    expect(prisma.addressBook.findUnique).toHaveBeenCalledWith({
      where: {
        id: '456',
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { address: mockAddress },
    });
  });

  it('should return 404 if address not found', async () => {
    // Mock prisma findUnique to return null
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(null);

    // Call the getAddressById function
    await getAddressById(req as Request, res as Response, next);

    // Assertions
    expect(prisma.addressBook.findUnique).toHaveBeenCalledWith({
      where: {
        id: '456',
      },
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Address not found',
    });
  });

  it('should return 403 if user does not own the address', async () => {
    // Mock address with different userId
    const mockAddress = {
      id: '456',
      userId: '789', // Different from the requesting user
      name: 'John Doe',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
      isDefault: true,
    };

    // Mock prisma findUnique to return the address
    (prisma.addressBook.findUnique as jest.Mock).mockResolvedValue(mockAddress);

    // Call the getAddressById function
    await getAddressById(req as Request, res as Response, next);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'You can only access your own addresses',
    });
  });

  it('should call next with error if an exception occurs', async () => {
    // Mock prisma findUnique to throw an error
    const error = new Error('Database error');
    (prisma.addressBook.findUnique as jest.Mock).mockRejectedValue(error);

    // Call the getAddressById function
    await getAddressById(req as Request, res as Response, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
}); 