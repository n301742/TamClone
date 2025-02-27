import express from 'express';
import passport from 'passport';
import * as userController from '../../controllers/user.controller';
import { validateRequest } from '../../middleware/validate-request';
import { isAdmin } from '../../middleware/auth';
import { updateUserSchema, updatePreferencesSchema } from '../../validators/user.validator';

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
  authenticate: jest.fn(() => 'mocked-auth-middleware')
}));

jest.mock('../../controllers/user.controller', () => ({
  getCurrentUser: 'getCurrentUser-controller',
  getAllUsers: 'getAllUsers-controller',
  getUserById: 'getUserById-controller',
  updateUser: 'updateUser-controller',
  updatePreferences: 'updatePreferences-controller',
  updateBillingInfo: 'updateBillingInfo-controller',
  deleteUser: 'deleteUser-controller'
}));

jest.mock('../../middleware/validate-request', () => ({
  validateRequest: jest.fn(() => 'validate-middleware')
}));

jest.mock('../../middleware/auth', () => ({
  isAdmin: 'isAdmin-middleware'
}));

jest.mock('../../validators/user.validator', () => ({
  updateUserSchema: 'updateUserSchema',
  updatePreferencesSchema: 'updatePreferencesSchema'
}));

describe('User Routes', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Import the routes to trigger the route definitions
    jest.isolateModules(() => {
      require('../../routes/user.routes');
    });
  });

  it('should authenticate all routes', () => {
    expect(mockRouter.use).toHaveBeenCalledWith('mocked-auth-middleware');
    expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false });
  });

  it('should define GET /me route', () => {
    expect(mockRouter.get).toHaveBeenCalledWith('/me', userController.getCurrentUser);
  });

  it('should define GET / route with isAdmin middleware', () => {
    expect(mockRouter.get).toHaveBeenCalledWith('/', isAdmin, userController.getAllUsers);
  });

  it('should define GET /:id route', () => {
    expect(mockRouter.get).toHaveBeenCalledWith('/:id', userController.getUserById);
  });

  it('should define PUT /:id route with validation', () => {
    expect(mockRouter.put).toHaveBeenCalledWith('/:id', 'validate-middleware', userController.updateUser);
    expect(validateRequest).toHaveBeenCalledWith(updateUserSchema);
  });

  it('should define PUT /:id/preferences route with validation', () => {
    expect(mockRouter.put).toHaveBeenCalledWith('/:id/preferences', 'validate-middleware', userController.updatePreferences);
    expect(validateRequest).toHaveBeenCalledWith(updatePreferencesSchema);
  });

  it('should define PUT /:id/billing route', () => {
    expect(mockRouter.put).toHaveBeenCalledWith('/:id/billing', userController.updateBillingInfo);
  });

  it('should define DELETE /:id route', () => {
    expect(mockRouter.delete).toHaveBeenCalledWith('/:id', userController.deleteUser);
  });
}); 