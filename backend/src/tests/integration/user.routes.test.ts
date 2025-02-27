import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { getCurrentUser } from '../../controllers/user.controller';

// Mock the Prisma client
jest.mock('../../app', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Import the prisma mock
const { prisma } = require('../../app');

// Create a test Express app
const app = express();

// Mock passport authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  // Add a mock user to the request
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
  };
  next();
};

// Setup routes for testing
app.get('/api/users/me', mockAuthMiddleware, getCurrentUser);

describe('User Routes - Integration Tests', () => {
  let testUser: Partial<User>;
  let authToken: string;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a test user
    testUser = {
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
    };

    // Create a JWT token for authentication
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );

    // Mock the Prisma findUnique to return our test user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUser);
  });

  describe('GET /api/users/me', () => {
    it('should return the current user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });
    });

    // Note: In a real integration test, we would also test:
    // - Unauthorized access (no token)
    // - Invalid token
    // - Expired token
    // But these would require more complex setup with the actual app
  });
}); 