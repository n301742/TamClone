import apiClient from './ApiClient';
import { LetterStatus } from './types';
import type { Letter } from './types';
import { useAuthStore } from '../../stores/auth';

/**
 * PDF processing and address extraction service
 */
class PdfService {
  /**
   * API endpoint for PDF processing
   */
  private endpoint = '/api/letters';
  
  /**
   * Flag to determine if we're in development mode
   */
  private isDevelopment = import.meta.env.DEV;
  
  /**
   * Flag to determine if mock API is enabled
   */
  private useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

  /**
   * Upload a PDF file and extract address information
   * 
   * @param file - The PDF file to upload
   * @param options - Additional options for letter creation
   * @returns Promise with the letter data including address extraction results
   */
  public async uploadPdfWithAddressExtraction(
    file: File,
    options: {
      description?: string;
      formType?: 'formA' | 'formB' | 'din676';
      isExpress?: boolean;
      isRegistered?: boolean;
      isColorPrint?: boolean;
      isDuplexPrint?: boolean;
    } = {}
  ): Promise<Letter & { addressExtraction?: AddressExtraction }> {
    // Check if we should use mock data (in development or if API is unreachable)
    if (this.isDevelopment && this.useMockApi) {
      try {
        // Try to check API connectivity
        const isApiAvailable = await apiClient.isAvailable();
        
        if (!isApiAvailable) {
          console.log('📝 PdfService: API unavailable, using mock data');
          return this.getMockResponse(file.name, options.description);
        }
      } catch (error) {
        console.warn('⚠️ PdfService: Error checking API connectivity, using mock data', error);
        return this.getMockResponse(file.name, options.description);
      }
    }
    
    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('extractAddress', 'true');
    
    // Add optional parameters if provided
    if (options.description) {
      formData.append('description', options.description);
    }
    
    if (options.formType) {
      formData.append('formType', options.formType);
    }
    
    if (options.isExpress !== undefined) {
      formData.append('isExpress', options.isExpress.toString());
    }
    
    if (options.isRegistered !== undefined) {
      formData.append('isRegistered', options.isRegistered.toString());
    }
    
    if (options.isColorPrint !== undefined) {
      formData.append('isColorPrint', options.isColorPrint.toString());
    }
    
    if (options.isDuplexPrint !== undefined) {
      formData.append('isDuplexPrint', options.isDuplexPrint.toString());
    }
    
    console.log('📤 PdfService: Uploading file with options:', options);
    
    try {
      const response = await apiClient.uploadFile<Letter & { addressExtraction?: AddressExtraction }>(
        this.endpoint,
        formData
      );
      
      console.log('📥 PdfService: Received response:', response);
      
      // Ensure the response contains the expected structure
      if (import.meta.env.DEV && !response.addressExtraction && response.id === 'dev-mock-letter-id') {
        console.warn('⚠️ PdfService: Development mock data may not have the correct structure');
      }
      
      return response;
    } catch (error) {
      console.error('❌ PdfService: Upload failed:', error);
      
      // If we're in development mode with mock API enabled, return mock data on failure
      if (this.isDevelopment && this.useMockApi) {
        console.log('📝 PdfService: API request failed, using mock data instead');
        return this.getMockResponse(file.name, options.description);
      }
      
      throw error;
    }
  }

  /**
   * Validate a specific address
   * 
   * @param address - The address to validate
   * @returns Promise with validation results
   */
  public async validateAddress(address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  }): Promise<AddressValidationResult> {
    // Check if we should use mock data
    if (this.isDevelopment && this.useMockApi) {
      console.log('📝 PdfService: Using mock data for address validation');
      
      return {
        isValid: true,
        confidence: 0.92,
        zipCodeValidation: {
          attempted: true,
          countryDetected: address.country || 'Germany',
          zipCodeFormat: '#####',
          cityProvided: !!address.city,
          matchFound: true,
          originalCity: address.city,
          suggestedCity: null
        },
        streetValidation: {
          attempted: true,
          streetProvided: !!address.street,
          matchFound: true,
          originalStreet: address.street,
          suggestedStreet: null
        }
      };
    }
    
    return await apiClient.post<AddressValidationResult>(
      `${this.endpoint}/validate-address`,
      address
    );
  }
  
  /**
   * Generate a mock response for development and testing
   * 
   * @param fileName - Original file name
   * @param description - Optional description
   * @returns Mock letter data with address extraction
   */
  private getMockResponse(fileName: string, description?: string): Letter & { addressExtraction: AddressExtraction } {
    const now = new Date();
    
    return {
      id: `mock-${Math.random().toString(36).substring(2, 10)}`,
      userId: 'mock-user-123',
      title: fileName || 'Uploaded Document',
      status: LetterStatus.DRAFT,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      addressExtraction: {
        confidence: 0.85,
        rawText: "John Doe\n123 Main Street\n10115 Berlin\nGermany",
        zipCodeValidation: {
          attempted: true,
          countryDetected: "Germany",
          zipCodeFormat: "#####",
          cityProvided: true,
          matchFound: true,
          originalCity: "Berlin",
          suggestedCity: null
        },
        streetValidation: {
          attempted: true,
          streetProvided: true,
          matchFound: true,
          originalStreet: "Main Street",
          suggestedStreet: null
        }
      }
    };
  }
}

/**
 * Address extraction response interfaces
 */
export interface AddressExtraction {
  confidence: number;
  rawText: string;
  zipCodeValidation: ZipCodeValidation;
  streetValidation: StreetValidation;
}

export interface ZipCodeValidation {
  attempted: boolean;
  countryDetected: string;
  zipCodeFormat: string;
  cityProvided: boolean;
  matchFound: boolean;
  originalCity: string;
  suggestedCity: string | null;
}

export interface StreetValidation {
  attempted: boolean;
  streetProvided: boolean;
  matchFound: boolean;
  originalStreet: string;
  suggestedStreet: string | null;
}

export interface AddressValidationResult {
  isValid: boolean;
  confidence: number;
  zipCodeValidation: ZipCodeValidation;
  streetValidation: StreetValidation;
  suggestions?: {
    city?: string;
    street?: string;
  }
}

// Create and export a singleton instance
const pdfService = new PdfService();
export default pdfService; 