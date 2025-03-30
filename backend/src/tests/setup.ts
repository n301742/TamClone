// This file contains setup code that will be run before each test
import 'jest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('mocksalt'),
  hash: jest.fn().mockImplementation((password, salt) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn().mockImplementation((plainPassword, hashedPassword) => 
    Promise.resolve(hashedPassword === `hashed_${plainPassword}` || hashedPassword === plainPassword)
  )
}));

// Increase timeout for tests
jest.setTimeout(10000);

// Global teardown after all tests
afterAll(async () => {
  // Add any cleanup code here if needed
});

// Add any global setup here if needed 