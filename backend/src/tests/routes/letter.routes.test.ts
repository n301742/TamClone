import express from 'express';
import passport from 'passport';
import * as letterController from '../../controllers/letter.controller';
import { validateRequest } from '../../middleware/validate-request';
import { upload } from '../../middleware/file-upload';
import { createLetterSchema, updateLetterSchema, letterStatusSchema } from '../../validators/letter.validator';

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

jest.mock('../../controllers/letter.controller', () => ({
  createLetter: 'createLetter-controller',
  getLetters: 'getLetters-controller',
  getLetterById: 'getLetterById-controller',
  updateLetter: 'updateLetter-controller',
  getLetterStatusHistory: 'getLetterStatusHistory-controller',
  sendLetter: 'sendLetter-controller',
  deleteLetter: 'deleteLetter-controller',
  updateLetterStatus: 'updateLetterStatus-controller'
}));

jest.mock('../../middleware/validate-request', () => ({
  validateRequest: jest.fn(() => 'validate-middleware')
}));

jest.mock('../../middleware/file-upload', () => ({
  upload: {
    single: jest.fn(() => 'upload-middleware')
  }
}));

jest.mock('../../validators/letter.validator', () => ({
  createLetterSchema: 'createLetterSchema',
  updateLetterSchema: 'updateLetterSchema',
  letterStatusSchema: 'letterStatusSchema'
}));

describe('Letter Routes', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Import the routes to trigger the route definitions
    jest.isolateModules(() => {
      require('../../routes/letter.routes');
    });
  });

  it('should authenticate all routes except webhook', () => {
    expect(mockRouter.use).toHaveBeenCalledWith(
      /^(?!\/webhook)/,
      'mocked-auth-middleware'
    );
    expect(passport.authenticate).toHaveBeenCalledWith('jwt', { session: false });
  });

  it('should define POST / route with file upload and validation', () => {
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/',
      'upload-middleware',
      'validate-middleware',
      letterController.createLetter
    );
    expect(upload.single).toHaveBeenCalledWith('pdfFile');
    expect(validateRequest).toHaveBeenCalledWith(createLetterSchema);
  });

  it('should define GET / route', () => {
    expect(mockRouter.get).toHaveBeenCalledWith('/', letterController.getLetters);
  });

  it('should define GET /:id route', () => {
    expect(mockRouter.get).toHaveBeenCalledWith('/:id', letterController.getLetterById);
  });

  it('should define PUT /:id route with validation', () => {
    expect(mockRouter.put).toHaveBeenCalledWith(
      '/:id',
      'validate-middleware',
      letterController.updateLetter
    );
    expect(validateRequest).toHaveBeenCalledWith(updateLetterSchema);
  });

  it('should define GET /:id/status route', () => {
    expect(mockRouter.get).toHaveBeenCalledWith('/:id/status', letterController.getLetterStatusHistory);
  });

  it('should define POST /:id/send route', () => {
    expect(mockRouter.post).toHaveBeenCalledWith('/:id/send', letterController.sendLetter);
  });

  it('should define DELETE /:id route', () => {
    expect(mockRouter.delete).toHaveBeenCalledWith('/:id', letterController.deleteLetter);
  });

  it('should define POST /webhook route with validation', () => {
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/webhook',
      'validate-middleware',
      letterController.updateLetterStatus
    );
    expect(validateRequest).toHaveBeenCalledWith(letterStatusSchema);
  });
}); 