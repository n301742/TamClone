import fs from 'fs';
import path from 'path';
import { PdfProcessingService, ExtractedAddress } from '../../services/pdf-processing.service';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer, options) => {
    return Promise.resolve({
      numpages: 1,
      text: 'John Doe\n123 Main St\nAnytown, CA 12345\nUSA',
    });
  });
});

jest.mock('pdf.js-extract', () => ({
  PDFExtract: jest.fn().mockImplementation(() => ({
    extract: jest.fn().mockResolvedValue({
      pages: [
        {
          content: [
            { str: 'John Doe', x: 100, y: 50 },
            { str: '123 Main St', x: 100, y: 70 },
            { str: 'Anytown, CA 12345', x: 100, y: 90 },
            { str: 'USA', x: 100, y: 110 },
          ],
        },
      ],
    }),
  })),
}));

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockImplementation(() => ({
    loadLanguage: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({
      data: {
        text: 'John Doe\n123 Main St\nAnytown, CA 12345\nUSA',
        confidence: 95,
      },
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('PdfProcessingService', () => {
  let pdfProcessingService: PdfProcessingService;
  const testPdfPath = '/path/to/test.pdf';
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test pdf content'));
    
    // Create service instance
    pdfProcessingService = new PdfProcessingService();
  });
  
  describe('extractAddressFromPdf', () => {
    it('should extract address from PDF text content', async () => {
      // Call the method
      const result = await pdfProcessingService.extractAddressFromPdf(testPdfPath);
      
      // Assertions
      expect(fs.existsSync).toHaveBeenCalledWith(testPdfPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(testPdfPath);
      
      // Check extracted address
      expect(result).toEqual({
        name: 'John Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        rawText: 'John Doe\n123 Main St\nAnytown, CA 12345\nUSA',
        confidence: 0.8,
      });
    });
    
    it('should throw error if PDF file not found', async () => {
      // Setup mock to return false for file existence
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Call the method and expect it to throw
      await expect(pdfProcessingService.extractAddressFromPdf(testPdfPath))
        .rejects
        .toThrow('Failed to extract address: PDF file not found');
      
      expect(fs.existsSync).toHaveBeenCalledWith(testPdfPath);
    });
    
    it('should handle empty or invalid text content', async () => {
      // Mock pdf-parse to return empty text
      jest.requireMock('pdf-parse').mockResolvedValueOnce({
        numpages: 1,
        text: '',
      });
      
      // Call the method
      const result = await pdfProcessingService.extractAddressFromPdf(testPdfPath);
      
      // Should fall back to OCR
      expect(result.rawText).toBe('John Doe\n123 Main St\nAnytown, CA 12345\nUSA');
      expect(result.confidence).toBe(0.95);
    });
  });
  
  describe('parseAddressFromText', () => {
    it('should parse address components correctly', () => {
      // Call the private method using any type assertion
      const result = (pdfProcessingService as any).parseAddressFromText(
        'John Doe\n123 Main St\nAnytown, CA 12345\nUSA'
      );
      
      // Assertions
      expect(result).toEqual({
        name: 'John Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
      });
    });
    
    it('should handle address without state', () => {
      // Call the private method using any type assertion
      const result = (pdfProcessingService as any).parseAddressFromText(
        'John Doe\n123 Main St\nAnytown 12345\nUSA'
      );
      
      // Assertions
      expect(result).toEqual({
        name: 'John Doe',
        street: '123 Main St',
        city: 'Anytown',
        postalCode: '12345',
        country: 'USA',
      });
    });
    
    it('should handle address without postal code', () => {
      // Call the private method using any type assertion
      const result = (pdfProcessingService as any).parseAddressFromText(
        'John Doe\n123 Main St\nAnytown, CA\nUSA'
      );
      
      // Assertions
      expect(result).toEqual({
        name: 'John Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        country: 'USA',
      });
    });
    
    it('should handle minimal address', () => {
      // Call the private method using any type assertion
      const result = (pdfProcessingService as any).parseAddressFromText(
        'John Doe\n123 Main St'
      );
      
      // Assertions
      expect(result).toEqual({
        name: 'John Doe',
        street: '123 Main St',
      });
    });
    
    it('should return empty object for insufficient lines', () => {
      // Call the private method using any type assertion
      const result = (pdfProcessingService as any).parseAddressFromText(
        'John Doe'
      );
      
      // Assertions
      expect(result).toEqual({});
    });
  });
}); 