import path from 'path';
import multer from 'multer';
import { upload, deleteFile } from '../../middleware/file-upload';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlink: jest.fn(),
}));

// Import fs after mocking
import * as fs from 'fs';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('File Upload Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upload configuration', () => {
    it('should have correct storage configuration', () => {
      // Check that storage is configured
      expect((upload as any).storage).toBeDefined();
    });

    it('should have correct file size limit', () => {
      // Check that limits are configured
      expect((upload as any).limits).toBeDefined();
      expect((upload as any).limits?.fileSize).toBeDefined();
    });

    it('should have correct file filter', () => {
      // Check that fileFilter is configured
      expect((upload as any).fileFilter).toBeDefined();
    });

    it('should accept PDF files', () => {
      // Create a mock file filter callback
      const cb = jest.fn();
      
      // Create a mock request and file
      const req = {} as Express.Request;
      const file = {
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;
      
      // Call the file filter function directly
      if ((upload as any).fileFilter) {
        (upload as any).fileFilter(req, file, cb);
      }
      
      // Check that the callback was called with the correct arguments
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject non-PDF files', () => {
      // Create a mock file filter callback
      const cb = jest.fn();
      
      // Create a mock request and file
      const req = {} as Express.Request;
      const file = {
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
      } as Express.Multer.File;
      
      // Call the file filter function directly
      if ((upload as any).fileFilter) {
        (upload as any).fileFilter(req, file, cb);
      }
      
      // Check that the callback was called with an error
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      expect(cb.mock.calls[0][0].message).toBe('Only PDF files are allowed');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      // Mock fs.unlink to simulate successful deletion
      (fs.unlink as jest.MockedFunction<typeof fs.unlink>).mockImplementation(
        (path, callback) => {
          if (callback) callback(null);
          return undefined as any;
        }
      );
      
      // Call the deleteFile function
      await expect(deleteFile('/path/to/file.pdf')).resolves.toBeUndefined();
      
      // Check that fs.unlink was called with the correct path
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.pdf', expect.any(Function));
    });

    it('should resolve if file does not exist', async () => {
      // Mock fs.unlink to simulate file not found error
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      
      (fs.unlink as jest.MockedFunction<typeof fs.unlink>).mockImplementation(
        (path, callback) => {
          if (callback) callback(error);
          return undefined as any;
        }
      );
      
      // Call the deleteFile function
      await expect(deleteFile('/path/to/nonexistent.pdf')).resolves.toBeUndefined();
      
      // Check that fs.unlink was called with the correct path
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/nonexistent.pdf', expect.any(Function));
    });

    it('should reject if an error occurs during deletion', async () => {
      // Mock fs.unlink to simulate an error
      const error = new Error('Permission denied');
      
      (fs.unlink as jest.MockedFunction<typeof fs.unlink>).mockImplementation(
        (path, callback) => {
          if (callback) callback(error);
          return undefined as any;
        }
      );
      
      // Call the deleteFile function
      await expect(deleteFile('/path/to/file.pdf')).rejects.toThrow('Permission denied');
      
      // Check that fs.unlink was called with the correct path
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.pdf', expect.any(Function));
    });
  });

  describe('upload directory', () => {
    it('should create upload directory if it does not exist', () => {
      // Mock fs.existsSync to return false
      (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockReturnValue(false);
      
      // Re-import the module to trigger the directory creation
      jest.isolateModules(() => {
        require('../../middleware/file-upload');
      });
      
      // Check that fs.mkdirSync was called
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should not create upload directory if it already exists', () => {
      // Mock fs.existsSync to return true
      (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockReturnValue(true);
      
      // Re-import the module to check directory creation
      jest.isolateModules(() => {
        require('../../middleware/file-upload');
      });
      
      // Check that fs.mkdirSync was not called
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
}); 