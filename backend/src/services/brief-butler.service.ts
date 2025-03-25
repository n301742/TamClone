import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import { BriefButlerApiResponse, LetterSubmissionData, SpoolSubmissionData } from '../types/briefbutler.types';

// Load environment variables
dotenv.config();

/**
 * BriefButler service for interacting with the BriefButler API
 * Provides methods for submitting documents to the BriefButler spool service
 * and checking their status
 */
export class BriefButlerService {
  private apiClient: AxiosInstance;
  private inMockMode: boolean;

  constructor() {
    const apiUrl = process.env.BRIEFBUTLER_API_URL || 'https://demodelivery.briefbutler.com';
    this.inMockMode = process.env.BRIEFBUTLER_TEST_MODE === 'true';
    
    logger.info('BriefButlerService: Initializing with certificate authentication');
    
    // Locate the converted certificate files
    const certPath = process.env.BRIEFBUTLER_CERTIFICATE_PATH || 
      path.resolve(process.cwd(), 'certificates/converted/cert.crt');
    const keyPath = process.env.BRIEFBUTLER_KEY_PATH || 
      path.resolve(process.cwd(), 'certificates/converted/key.key');
    
    logger.info(`BriefButlerService: Using certificate: ${certPath}`);
    logger.info(`BriefButlerService: Using key: ${keyPath}`);
    
    let httpsAgent = undefined;
    
    if (!this.inMockMode) {
      try {
        // Check if cert and key exist
        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
          throw new Error(`Certificate or key file not found at ${certPath} or ${keyPath}`);
        }
        
        // Read the certificate and key files
        const cert = fs.readFileSync(certPath);
        const key = fs.readFileSync(keyPath);
        
        // Create HTTPS agent with certificate and key
        httpsAgent = new https.Agent({
          cert,
          key,
          rejectUnauthorized: false // Set to false for testing
        });
        
        logger.info('BriefButlerService: Certificate and key loaded successfully');
      } catch (error: any) {
        logger.error(`BriefButlerService: Error loading certificate: ${error.message}`);
        logger.warn('BriefButlerService: Initializing without certificate - API calls may fail');
        
        // Create a basic HTTPS agent without certificate
        httpsAgent = new https.Agent({
          rejectUnauthorized: false
        });
      }
    }

    // Create axios instance with the HTTPS agent and any additional configuration
    this.apiClient = axios.create({
      baseURL: apiUrl,
      httpsAgent,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (this.inMockMode) {
      logger.warn('BriefButlerService initialized in MOCK MODE. No real API calls will be made.');
    } else {
      logger.info(`BriefButlerService initialized with API URL: ${apiUrl}`);
    }
  }
  
  /**
   * Enable mock mode for testing
   * When in mock mode, all service methods will return mock responses
   * instead of making real API calls
   */
  enableMockMode() {
    this.inMockMode = true;
    logger.info('BriefButlerService: Mock mode enabled');
  }
  
  /**
   * Disable mock mode
   */
  disableMockMode() {
    this.inMockMode = false;
    logger.info('BriefButlerService: Mock mode disabled');
  }
  
  /**
   * Submit a new letter to the BriefButler service
   * @param data Letter submission data
   * @returns The BriefButler API response with tracking information
   */
  async submitLetter(data: LetterSubmissionData): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for submitLetter');
      return {
        success: true,
        data: {
          tracking_id: 'mock-tracking-123',
          status: 'processing',
          timestamp: new Date().toISOString(),
        },
        message: 'Letter submitted successfully (MOCK)',
      };
    }
    
    try {
      // Read the PDF file as a base64 string
      const pdfPath = data.pdfPath;
      logger.debug(`BriefButlerService: Reading PDF file from ${pdfPath}`);
      
      if (!fs.existsSync(pdfPath)) {
        logger.error(`BriefButlerService: PDF file not found at ${pdfPath}`);
        return {
          success: false,
          error: `PDF file not found at ${pdfPath}`,
          message: 'Failed to submit letter to BriefButler',
        };
      }
      
      const pdfContent = fs.readFileSync(data.pdfPath, { encoding: 'base64' });
      const filename = path.basename(data.pdfPath);
      
      // Check if PDF content is valid
      if (!pdfContent || pdfContent.length === 0) {
        logger.error('BriefButlerService: PDF content is empty');
        return {
          success: false,
          error: 'PDF content is empty',
          message: 'Failed to submit letter to BriefButler',
        };
      }
      
      logger.debug(`BriefButlerService: PDF file read successfully. Content length: ${pdfContent.length} bytes`);
      
      // Prepare the request payload
      const payload = {
        document: pdfContent,
        profile_id: data.profileId,
        recipient: {
          name: data.recipientName,
          address: data.recipientAddress,
          city: data.recipientCity,
          zip: data.recipientZip,
          country: data.recipientCountry,
          state: data.recipientState || '',
        },
        options: {
          express: data.isExpress,
          registered: data.isRegistered,
          color: data.isColorPrint,
          duplex: data.isDuplexPrint,
        }
      };
      
      // Make the API request
      const response = await this.apiClient.post('/letter', payload);
      
      return {
        success: true,
        data: response.data,
        message: 'Letter submitted successfully',
      };
    } catch (error: any) {
      logger.error('Error submitting letter to BriefButler:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to submit letter to BriefButler',
      };
    }
  }
  
  /**
   * Get the status of a letter from the BriefButler service
   * @param trackingId The tracking ID of the letter
   * @returns The current status of the letter
   */
  async getLetterStatus(trackingId: string): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getLetterStatus');
      return {
        success: true,
        data: {
          tracking_id: trackingId,
          status: 'processing',
          timestamp: new Date().toISOString(),
        },
        message: 'Letter status retrieved successfully (MOCK)',
      };
    }
    
    try {
      const response = await this.apiClient.get(`/status/${trackingId}`);
      
      return {
        success: true,
        data: response.data,
        message: 'Letter status retrieved successfully',
      };
    } catch (error: any) {
      logger.error('Error getting letter status from BriefButler:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to get letter status from BriefButler',
      };
    }
  }
  
  /**
   * Cancel a letter that hasn't been sent yet
   * @param trackingId The tracking ID of the letter to cancel
   * @returns Success or failure of the cancellation
   */
  async cancelLetter(trackingId: string): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for cancelLetter');
      return {
        success: true,
        data: {
          tracking_id: trackingId,
          status: 'canceled',
          timestamp: new Date().toISOString(),
        },
        message: 'Letter canceled successfully (MOCK)',
      };
    }
    
    try {
      const response = await this.apiClient.post(`/cancel/${trackingId}`);
      
      return {
        success: true,
        data: response.data,
        message: 'Letter canceled successfully',
      };
    } catch (error: any) {
      logger.error('Error canceling letter in BriefButler:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to cancel letter in BriefButler',
      };
    }
  }
  
  /**
   * Submit a document to the BriefButler spool service
   * @param data The data for the submission
   * @returns Promise resolving to the API response
   */
  async submitSpool(data: SpoolSubmissionData): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for submitSpool');
      return {
        success: true,
        data: {
          spool_id: 'mock-spool-123',
          status: 'processing',
          timestamp: new Date().toISOString(),
        },
        message: 'Document submitted to spool successfully (MOCK)',
      };
    }
    
    try {
      // Read the PDF file as a base64 string
      const pdfPath = data.pdfPath;
      logger.debug(`BriefButlerService: Reading PDF file from ${pdfPath}`);
      
      if (!fs.existsSync(pdfPath)) {
        logger.error(`BriefButlerService: PDF file not found at ${pdfPath}`);
        return {
          success: false,
          error: `PDF file not found at ${pdfPath}`,
          message: 'Failed to submit document to BriefButler spool service',
        };
      }
      
      const pdfContent = fs.readFileSync(data.pdfPath, { encoding: 'base64' });
      const filename = path.basename(data.pdfPath);
      
      // Try only the correct endpoint
      const endpoint = '/endpoint-spool/dualDelivery';
      
      // Allow for a configurable deliveryProfile (default to "briefbutler-test" for now)
      const deliveryProfile = data.deliveryProfile || "briefbutler-test";
      
      // Simple payload structure following API documentation
      const payload = {
        metadata: {
          deliveryId: `Delivery_${Date.now()}`,
          caseId: `Case_${Date.now()}`
        },
        configuration: {
          deliveryProfile,
          allowEmail: true,
          costcenter: data.reference || "default-costcenter" 
        },
        receiver: {
          email: data.recipientEmail || "",
          recipient: {
            physicalPerson: {
              familyName: data.recipientName.split(' ').pop() || data.recipientName,
              givenName: data.recipientName.split(' ').shift() || ""
            }
          },
          postalAddress: {
            street: data.recipientAddress,
            postalCode: data.recipientZip,
            city: data.recipientCity,
            countryCode: "AT" // Default to Austria
          }
        },
        sender: {
          person: {
            physicalPerson: {
              familyName: data.senderName.split(' ').pop() || data.senderName,
              givenName: data.senderName.split(' ').shift() || ""
            }
          },
          postalAddress: {
            street: data.senderAddress,
            postalCode: data.senderZip,
            city: data.senderCity,
            countryCode: "AT" // Default to Austria
          }
        },
        subject: data.reference || "Document Delivery",
        documents: [
          {
            content: pdfContent,
            mimeType: "application/pdf",
            name: filename,
            documentId: `doc_${Date.now()}`,
            type: "Standard"
          }
        ]
      };
      
      logger.debug(`BriefButlerService: Making request to endpoint: ${endpoint}`);
      
      try {
        const response = await this.apiClient.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        logger.debug('BriefButlerService: Response successfully received');
        
        return {
          success: true,
          data: response.data,
          message: 'Document submitted to spool service successfully',
        };
      } catch (error: any) {
        logger.error(`BriefButlerService: Error with endpoint ${endpoint}: ${error.message}`);
        
        if (error.response) {
          logger.error(`Response status: ${error.response.status}`);
          logger.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
        }
        
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          message: 'Failed to submit document to BriefButler spool service',
        };
      }
    } catch (error: any) {
      logger.error('BriefButlerService: Error submitting document:', error.message);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to submit document to BriefButler spool service',
      };
    }
  }
  
  /**
   * Get the status of a spool submission
   * @param spoolId The ID of the spool submission
   * @returns Promise resolving to the API response
   */
  async getSpoolStatus(spoolId: string): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getSpoolStatus');
      return {
        success: true,
        data: {
          spool_id: spoolId,
          status: 'processing',
          timestamp: new Date().toISOString(),
        },
        message: 'Spool status retrieved successfully (MOCK)',
      };
    }
    
    try {
      logger.debug(`BriefButlerService: Getting status for spool ID: ${spoolId}`);
      
      // Use the correct endpoint for status retrieval
      const endpoint = `/endpoint-spool/status/${spoolId}`;
      
      logger.debug(`BriefButlerService: Making request to endpoint: ${endpoint}`);
      
      try {
        const response = await this.apiClient.get(endpoint, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        logger.debug('BriefButlerService: Response successfully received');
        
        return {
          success: true,
          data: response.data,
          message: 'Spool status retrieved successfully',
        };
      } catch (error: any) {
        logger.error(`BriefButlerService: Error with endpoint ${endpoint}: ${error.message}`);
        
        if (error.response) {
          logger.error(`Response status: ${error.response.status}`);
          logger.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
        }
        
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          message: 'Failed to get spool status from BriefButler',
        };
      }
    } catch (error: any) {
      logger.error('BriefButlerService: Error getting spool status:', error.message);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to get spool status from BriefButler',
      };
    }
  }
  
  /**
   * Get all available profiles for a user
   * @param userId The ID of the user
   * @returns List of available profiles
   */
  async getUserProfiles(userId: string): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getUserProfiles');
      return {
        success: true,
        data: [
          {
            id: 'mock-profile-1',
            name: 'Mock Profile 1',
            address: 'Mock Address 1',
          },
          {
            id: 'mock-profile-2',
            name: 'Mock Profile 2',
            address: 'Mock Address 2',
          },
        ],
        message: 'User profiles retrieved successfully (MOCK)',
      };
    }
    
    try {
      const response = await this.apiClient.get(`/profiles/${userId}`);
      
      return {
        success: true,
        data: response.data,
        message: 'User profiles retrieved successfully',
      };
    } catch (error: any) {
      logger.error('Error getting user profiles from BriefButler:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to get user profiles from BriefButler',
      };
    }
  }
}

// Export a singleton instance
export const briefButlerService = new BriefButlerService(); 