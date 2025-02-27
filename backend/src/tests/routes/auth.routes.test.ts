import express from 'express';
import passport from 'passport';
import * as authController from '../../controllers/auth.controller';
import { validateRequest } from '../../middleware/validate-request';
import { loginSchema, registerSchema, refreshTokenSchema } from '../../validators/auth.validator';

// Create a mock router to capture route definitions
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  route: jest.fn().mockReturnThis()
};

// Mock Express Router
jest.mock('express', () => {
  return {
    Router: jest.fn(() => mockRouter)
  };
});

// Mock dependencies
jest.mock('passport', () => ({
  authenticate: jest.fn((strategy, options) => `mocked-${strategy}-auth-middleware`)
}));

jest.mock('../../controllers/auth.controller', () => ({
  register: 'register-controller',
  login: 'login-controller',
  googleCallback: 'googleCallback-controller',
  getCurrentUser: 'getCurrentUser-controller',
  refreshToken: 'refreshToken-controller',
  logout: 'logout-controller'
}));

jest.mock('../../middleware/validate-request', () => ({
  validateRequest: jest.fn(() => 'validate-middleware')
}));

jest.mock('../../validators/auth.validator', () => ({
  loginSchema: 'loginSchema',
  registerSchema: 'registerSchema',
  refreshTokenSchema: 'refreshTokenSchema'
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Import the routes to trigger the route definitions
    jest.isolateModules(() => {
      require('../../routes/auth.routes');
    });
  });

  it('should define POST /register route with validation', () => {
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/register', 
      'validate-middleware', 
      authController.register
    );
    expect(validateRequest).toHaveBeenCalledWith(registerSchema);
  });

  it('should define POST /login route with validation', () => {
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/login', 
      'validate-middleware', 
      authController.login
    );
    expect(validateRequest).toHaveBeenCalledWith(loginSchema);
  });

  it('should define GET /google route for Google OAuth flow', () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      '/google', 
      'mocked-google-auth-middleware'
    );
    expect(passport.authenticate).toHaveBeenCalledWith('google', {
      scope: ['profile', 'email']
    });
  });

  it('should define GET /google/callback route', () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      '/google/callback',
      'mocked-google-auth-middleware',
      authController.googleCallback
    );
    expect(passport.authenticate).toHaveBeenCalledWith('google', { session: false });
  });

  it('should define GET /me route with JWT authentication', () => {
    expect(mockRouter.get).toHaveBeenCalledWith(
      '/me',
      'mocked-jwt-auth-middleware',
      authController.getCurrentUser
    );
    expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false });
  });

  it('should define POST /refresh route', () => {
    expect(mockRouter.post).toHaveBeenCalledWith('/refresh', authController.refreshToken);
  });

  it('should define POST /logout route with JWT authentication', () => {
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/logout',
      'mocked-jwt-auth-middleware',
      authController.logout
    );
    expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false });
  });
}); 