import apiClient from './ApiClient';
import type { Letter } from './types';

/**
 * PDF processing and address extraction service
 */
class PdfService {
  /**
   * API endpoint for PDF processing
   */
  private endpoint = '/api/letters';

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
    return await apiClient.post<AddressValidationResult>(
      `${this.endpoint}/validate-address`,
      address
    );
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