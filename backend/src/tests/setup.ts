// This file contains setup code that will be run before each test

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Increase timeout for tests
jest.setTimeout(10000);

// Global teardown after all tests
afterAll(async () => {
  // Add any cleanup code here if needed
});

// This file is used to set up the test environment
import 'jest';

// Add any global setup here if needed 