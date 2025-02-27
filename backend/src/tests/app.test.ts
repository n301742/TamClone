import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    listen: jest.fn(),
  };
  const mockExpress = jest.fn(() => mockApp);
  (mockExpress as any).json = jest.fn(() => 'json-middleware');
  (mockExpress as any).urlencoded = jest.fn(() => 'urlencoded-middleware');
  (mockExpress as any).static = jest.fn(() => 'static-middleware');
  return mockExpress;
});

jest.mock('cors', () => jest.fn(() => 'cors-middleware'));
jest.mock('helmet', () => jest.fn(() => 'helmet-middleware'));
jest.mock('passport', () => ({
  initialize: jest.fn(() => 'passport-middleware'),
  use: jest.fn(),
  authenticate: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn()
}));

// Mock passport-jwt
jest.mock('passport-jwt', () => ({
  Strategy: jest.fn(),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn()
  }
}));

// Mock passport-google-oauth20
jest.mock('passport-google-oauth20', () => ({
  Strategy: jest.fn()
}));

// Mock the PrismaClient
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        $disconnect: mockDisconnect,
      };
    }),
  };
});

jest.mock('../routes/auth.routes', () => 'auth-routes', { virtual: true });
jest.mock('../routes/user.routes', () => 'user-routes', { virtual: true });
jest.mock('../routes/letter.routes', () => 'letter-routes', { virtual: true });

// Mock process.env
const originalEnv = process.env;

// Mock process.exit
const mockExit = jest.fn((code?: number | string | null) => {
  return undefined as never;
});
process.exit = mockExit;

describe('App', () => {
  let mockApp: any;
  let mockExit: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock process.env
    process.env = { 
      ...originalEnv, 
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret'
    };
    
    // Mock process.exit and console methods
    mockExit = jest.spyOn(process, 'exit').mockImplementation((_code?: number | string | null) => undefined as never);
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Import the app to trigger the setup
    jest.isolateModules(() => {
      require('../app');
      mockApp = (express as any)();
    });
  });

  afterEach(() => {
    // Restore process.env
    process.env = originalEnv;
    
    // Restore mocks
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should initialize the Express app with middleware', () => {
    expect(express).toHaveBeenCalled();
    expect(mockApp.use).toHaveBeenCalledWith('helmet-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('cors-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('json-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('urlencoded-middleware');
    expect((express as any).json).toHaveBeenCalled();
    expect((express as any).urlencoded).toHaveBeenCalledWith({ extended: true });
  });

  it('should set up static file serving for uploads', () => {
    expect(mockApp.use).toHaveBeenCalledWith('/uploads', 'static-middleware');
    expect((express as any).static).toHaveBeenCalled();
  });

  it('should initialize Passport', () => {
    expect(mockApp.use).toHaveBeenCalledWith('passport-middleware');
    expect(passport.initialize).toHaveBeenCalled();
  });

  it('should register routes', () => {
    expect(mockApp.use).toHaveBeenCalledWith('/api/auth', 'auth-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/users', 'user-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/letters', 'letter-routes');
  });

  it('should set up health check endpoints', () => {
    expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(mockApp.get).toHaveBeenCalledWith('/api/health', expect.any(Function));
  });

  it('should set up error handling middleware', () => {
    expect(mockApp.use).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should not start the server in test mode', () => {
    expect(mockApp.listen).not.toHaveBeenCalled();
  });

  it('should handle SIGINT gracefully', async () => {
    // Simulate SIGINT
    process.emit('SIGINT');

    // Wait for promises to resolve
    await new Promise(process.nextTick);

    // Check if prisma.$disconnect was called
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });
}); 