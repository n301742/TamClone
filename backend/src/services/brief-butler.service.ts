import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Interface for BriefButler API responses
 */
interface BriefButlerApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Interface for letter submission data
 */
interface LetterSubmissionData {
  // Letter information
  pdfPath: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  recipientCountry: string;
  recipientState?: string;
  
  // Sender information (from profile)
  profileId: string;
  
  // Delivery options
  isExpress: boolean;
  isRegistered: boolean;
  isColorPrint: boolean;
  isDuplexPrint: boolean;
}

/**
 * Service for interacting with the BriefButler API
 * Handles sending documents, tracking status, and managing submissions
 */
class BriefButlerService {
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly certificatePath: string;
  private readonly certificatePassword: string;
  private inMockMode: boolean = false;

  constructor() {
    // Get configuration from environment variables
    this.baseUrl = process.env.BRIEFBUTLER_API_URL || 'https://opsworkspace.int.hpcdual.at/api';
    this.certificatePath = process.env.BRIEFBUTLER_CERTIFICATE_PATH || '';
    this.certificatePassword = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || '';
    
    if (!this.certificatePath) {
      logger.error('BriefButler certificate path not configured in environment variables');
    }
    
    // Create HTTPS agent with client certificate
    const httpsAgent = new https.Agent({
      pfx: fs.existsSync(this.certificatePath) ? fs.readFileSync(this.certificatePath) : undefined,
      passphrase: this.certificatePassword,
      rejectUnauthorized: process.env.NODE_ENV === 'production', // Only verify SSL in production
    });
    
    // Create axios instance with default configuration
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    // Add request logging
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug(`BriefButler API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('BriefButler API Request Error:', error);
        return Promise.reject(error);
      }
    );
    
    // Add response logging
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug(`BriefButler API Response Status: ${response.status}`);
        return response;
      },
      (error) => {
        logger.error('BriefButler API Response Error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
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
          trackingId: 'mock-tracking-123',
          status: 'processing',
          timestamp: new Date().toISOString(),
        },
        message: 'Letter submitted successfully (MOCK)',
      };
    }
    
    try {
      // Read the PDF file as a base64 string
      const pdfContent = fs.readFileSync(data.pdfPath, { encoding: 'base64' });
      
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
      const response = await this.apiClient.post('/spool/letter', payload);
      
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
          trackingId,
          status: 'processing',
          timestamp: new Date().toISOString(),
        },
        message: 'Letter status retrieved successfully (MOCK)',
      };
    }
    
    try {
      const response = await this.apiClient.get(`/spool/status/${trackingId}`);
      
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
          trackingId,
          status: 'canceled',
          timestamp: new Date().toISOString(),
        },
        message: 'Letter canceled successfully (MOCK)',
      };
    }
    
    try {
      const response = await this.apiClient.post(`/spool/cancel/${trackingId}`);
      
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
      const response = await this.apiClient.get(`/spool/profiles/${userId}`);
      
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