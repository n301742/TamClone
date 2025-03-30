import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import { BriefButlerApiResponse, LetterSubmissionData, SpoolSubmissionData, DualDeliveryRequest } from '../types/briefbutler.types';

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
    
    // Get the P12/PFX certificate path and password
    let p12CertPath = process.env.BRIEFBUTLER_CERTIFICATE_PATH ? 
      path.resolve(process.cwd(), process.env.BRIEFBUTLER_CERTIFICATE_PATH) : 
      path.resolve(process.cwd(), 'backend/certificates/BB_Test_2024.p12');
    const certPassword = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar';
    
    logger.info(`BriefButlerService: Using P12 certificate: ${p12CertPath}`);
    logger.info(`BriefButlerService: Current working directory: ${process.cwd()}`);
    
    // Debug output to help identify certificate location
    try {
      if (fs.existsSync(p12CertPath)) {
        logger.info(`BriefButlerService: Certificate file exists at ${p12CertPath}`);
      } else {
        // Try to find the certificate in several potential locations
        const potentialPaths = [
          path.resolve(process.cwd(), 'backend/certificates/BB_Test_2024.p12'),
          path.resolve(process.cwd(), 'certificates/BB_Test_2024.p12'),
          path.resolve(__dirname, '../../certificates/BB_Test_2024.p12'),
          path.resolve(__dirname, '../../../certificates/BB_Test_2024.p12')
        ];
        
        logger.error(`BriefButlerService: Certificate not found at ${p12CertPath}, trying alternative paths...`);
        
        for (const altPath of potentialPaths) {
          if (fs.existsSync(altPath)) {
            logger.info(`BriefButlerService: Found certificate at alternative path: ${altPath}`);
            // Use this path instead
            p12CertPath = altPath;
            break;
          }
        }
      }
    } catch (error: any) {
      logger.error(`BriefButlerService: Error checking certificate path: ${error.message}`);
    }
    
    // Check for required certificate files
    let httpsAgent = undefined;
    
    if (!this.inMockMode) {
      try {
        // First check if PEM files exist in temp directory
        const tempDir = path.join(process.cwd(), 'backend/certs_temp');
        const pemCertPath = path.join(tempDir, 'certificate.pem');
        const pemKeyPath = path.join(tempDir, 'private_key.pem');
        
        if (fs.existsSync(pemCertPath) && fs.existsSync(pemKeyPath)) {
          logger.info(`BriefButlerService: Using PEM files from ${tempDir}`);
          
          // Load PEM files
          const cert = fs.readFileSync(pemCertPath);
          const key = fs.readFileSync(pemKeyPath);
          
          // Create HTTPS agent with PEM files
          httpsAgent = new https.Agent({
            cert,
            key,
            rejectUnauthorized: false // Set to true in production
          });
          
          logger.info('BriefButlerService: PEM certificate loaded successfully');
        } else {
          // Try to load the PKCS#12 certificate
          logger.info(`BriefButlerService: Loading certificate from ${p12CertPath}`);
          const pfxData = fs.readFileSync(p12CertPath);
          
          // Create HTTPS agent with the certificate
          httpsAgent = new https.Agent({
            pfx: pfxData,
            passphrase: certPassword,
            rejectUnauthorized: false // Set to true in production
          });
          
          logger.info('BriefButlerService: Certificate loaded successfully');
        }
      } catch (error: any) {
        logger.error(`BriefButlerService: Error loading certificate: ${error.message}`);
        this.inMockMode = true;
      }
    }
    
    // Create the API client
    this.apiClient = axios.create({
      baseURL: apiUrl,
      httpsAgent,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    logger.info(`BriefButlerService: Initialized with base URL: ${apiUrl}, mock mode: ${this.inMockMode}`);
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
    // Check for mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Using mock mode as configured');
      return this.getMockSpoolResponse(data);
    }
    
    // Continue with real API call
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
      
      // Log file size for debugging
      const fileSizeKB = Math.round(pdfContent.length / 1024);
      logger.debug(`BriefButlerService: PDF file size: ${fileSizeKB} KB`);
      
      // Format recipient name into first and last name
      const nameParts = data.recipientName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || data.recipientName;
      
      // Create payload for the dual delivery endpoint
      const payload = {
        // Basic metadata 
        metadata: {
          deliveryId: `Del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          caseId: data.reference || `Case_${Date.now()}`
        },
        // Delivery configuration
        configuration: {
          deliveryProfile: data.deliveryProfile || "briefbutler-test",
          allowEmail: false,  // Disable email for now
          colorPrint: !!data.isColorPrint,
          duplexPrint: !!data.isDuplexPrint,
        },
        // Recipient information
        receiver: {
          recipient: {
            physicalPerson: {
              givenName: firstName,
              familyName: lastName
            }
          },
          postalAddress: {
            streetName: data.recipientAddress,
            postalCode: data.recipientZip,
            city: data.recipientCity,
            country: data.recipientCountry || "AT"
          }
        },
        // Document to be sent
        document: {
          content: pdfContent,
          fileName: filename,
          mimeType: "application/pdf"
        }
      };
      
      logger.debug(`BriefButlerService: Making request to endpoint: /endpoint-spool/dualDelivery`);
      logger.debug(`BriefButlerService: Using delivery profile: "${payload.configuration.deliveryProfile}"`);
      logger.debug(`BriefButlerService: Recipient: ${firstName} ${lastName}, ${payload.receiver.postalAddress.streetName}, ${payload.receiver.postalAddress.city}, ${payload.receiver.postalAddress.postalCode}`);
      logger.debug(`BriefButlerService: Options: color=${payload.configuration.colorPrint}, duplex=${payload.configuration.duplexPrint}`);
      logger.debug(`BriefButlerService: Metadata: deliveryId="${payload.metadata.deliveryId}", caseId="${payload.metadata.caseId}"`);
      logger.debug(`BriefButlerService: Document size: ${pdfContent.length} chars (${fileSizeKB}KB)`);
      
      try {
        // Log the full URL being called
        logger.debug(`BriefButlerService: Full URL: ${this.apiClient.defaults.baseURL}/endpoint-spool/dualDelivery`);
        
        // Set a longer timeout for this specific request
        const response = await this.apiClient.post('/endpoint-spool/dualDelivery', payload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 120000 // 2 minutes timeout for this specific request
        });
        
        logger.debug('BriefButlerService: Response successfully received');
        logger.debug('BriefButlerService: Response data: ' + JSON.stringify(response.data));
        
        return {
          success: true,
          data: response.data,
          message: 'Document submitted to BriefButler successfully',
        };
      } catch (error: any) {
        logger.error(`BriefButlerService: Error with endpoint /endpoint-spool/dualDelivery: ${error.message}`);
        
        if (error.response) {
          logger.error(`Response status: ${error.response.status}`);
          logger.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
          
          // Add more detailed logging for specific error codes
          if (error.response.status === 401) {
            logger.error('This appears to be an authentication error. The certificate may be invalid or expired.');
          } else if (error.response.status === 400) {
            logger.error('This appears to be a bad request error. The payload format may be incorrect.');
            logger.error('Payload structure sent: ' + JSON.stringify(Object.keys(payload)));
            if (error.response.data) {
              logger.error('Response error details:');
              logger.error(JSON.stringify(error.response.data, null, 2));
            }
          } else if (error.response.status === 404) {
            logger.error('This appears to be a 404 Not Found error. The API endpoint might be incorrect.');
            logger.error(`Full URL attempted: ${this.apiClient.defaults.baseURL}/endpoint-spool/dualDelivery`);
            // Try with a fallback endpoint if we get a 404
            try {
              logger.info('Attempting fallback endpoint: /spool/dualDelivery');
              const fallbackResponse = await this.apiClient.post('/spool/dualDelivery', payload, {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                timeout: 120000
              });
              
              logger.info('Fallback endpoint succeeded!');
              return {
                success: true,
                data: fallbackResponse.data,
                message: 'Document submitted to BriefButler successfully (fallback endpoint)',
              };
            } catch (fallbackError: any) {
              logger.error(`Fallback endpoint also failed: ${fallbackError.message}`);
            }
          } else if (error.response.status === 500) {
            logger.error('This is a server-side error. The BriefButler service may be experiencing issues.');
            if (error.response.data) {
              logger.error('Server error details:');
              logger.error(JSON.stringify(error.response.data, null, 2));
            }
          }
        }
        
        // Don't fall back to mock mode for real errors, return the actual error
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          message: 'Failed to submit document to BriefButler spool service',
        };
      }
    } catch (error: any) {
      logger.error('BriefButlerService: Error submitting document:', error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit document to BriefButler spool service',
      };
    }
  }
  
  /**
   * Get a mock response for spool submission
   * Used when falling back to mock mode after a real API failure
   */
  private getMockSpoolResponse(data: SpoolSubmissionData): BriefButlerApiResponse {
    const mockTrackingId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.debug(`BriefButlerService: Returning mock response for submitSpool with ID: ${mockTrackingId}`);
    
    return {
      success: true,
      data: {
        spool_id: mockTrackingId,
        status: 'processing',
        message: 'Document received for processing',
        timestamp: new Date().toISOString(),
      },
      message: 'Document submitted to spool successfully (MOCK MODE)',
    };
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

  /**
   * Submit a document for dual delivery using the BriefButler spool service
   * @param data Document submission data
   * @returns BriefButler API response with tracking information
   */
  async submitDualDelivery(data: SpoolSubmissionData): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for submitDualDelivery');
      return {
        success: true,
        data: {
          trackingId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        },
        message: 'Document submitted successfully (MOCK)',
      };
    }
    
    try {
      logger.info('BriefButlerService: Preparing to submit document for dual delivery');
      
      // Read the PDF file as base64
      if (!fs.existsSync(data.pdfPath)) {
        logger.error(`BriefButlerService: PDF file not found at ${data.pdfPath}`);
        return {
          success: false,
          error: `PDF file not found at ${data.pdfPath}`,
          message: 'Failed to submit document',
        };
      }
      
      const pdfContent = fs.readFileSync(data.pdfPath, { encoding: 'base64' });
      
      // Calculate file size in KB for logging
      const fileSizeKB = Math.round(pdfContent.length / 1024);
      logger.info(`BriefButlerService: PDF file read successfully. Size: ${fileSizeKB} KB`);
      
      // Determine first and last name
      let givenName = '';
      let familyName = '';
      
      if (data.recipientFirstName || data.recipientLastName) {
        givenName = data.recipientFirstName || '';
        familyName = data.recipientLastName || '';
        logger.debug(`BriefButlerService: Using provided first and last name fields: "${givenName}" "${familyName}"`);
      } else {
        // Parse recipient name into components (assuming "FirstName LastName" format)
        const nameParts = data.recipientName.split(' ');
        givenName = nameParts.length > 1 ? nameParts[0] : data.recipientName;
        familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        logger.debug(`BriefButlerService: Parsed first and last name from full name: "${givenName}" "${familyName}"`);
      }
      
      // Validate sender information
      if (!data.senderName || !data.senderAddress || !data.senderCity || !data.senderZip || !data.senderCountry) {
        const errorMsg = 'Missing required sender information';
        logger.error(`BriefButlerService: ${errorMsg}`, {
          senderName: data.senderName,
          senderAddress: data.senderAddress, 
          senderCity: data.senderCity,
          senderZip: data.senderZip,
          senderCountry: data.senderCountry
        });
        return {
          success: false,
          error: errorMsg,
          message: 'Failed to submit document: missing sender information',
        };
      }
      
      // Parse sender name similarly
      const senderNameParts = data.senderName.split(' ');
      const senderIsCompany = data.senderName.length > 30;
      logger.debug(`BriefButlerService: Sender appears to be a ${senderIsCompany ? 'company' : 'person'}: "${data.senderName}"`);
      
      // Enhanced validation for country codes
      const validCountryCodes = ['AT', 'DE', 'CH']; // Add more as needed
      const recipientCountryCode = data.recipientCountry.length <= 2 ? data.recipientCountry : 'AT'; // Default to AT if not a country code
      const senderCountryCode = data.senderCountry.length <= 2 ? data.senderCountry : 'AT'; // Default to AT if not a country code
      
      // Prepare the request body according to the actual API format
      const requestBody: DualDeliveryRequest = {
        metadata: {
          deliveryId: data.reference || `letter-${Date.now()}`,
        },
        configuration: {
          deliveryProfile: data.deliveryProfile || 'briefbutler-test',
          allowEmail: !!data.recipientEmail,
        },
        receiver: {
          email: data.recipientEmail,
          phoneNumber: data.recipientPhone,
          recipient: {
            physicalPerson: {
              familyName: familyName || 'Unknown',
              givenName: givenName,
              // Include academic title as postfixTitle if available
              postfixTitle: data.recipientAcademicTitle || undefined
            }
          },
          postalAddress: {
            street: data.recipientAddress,
            postalCode: data.recipientZip,
            city: data.recipientCity,
            countryCode: recipientCountryCode,
          }
        },
        sender: {
          person: senderIsCompany 
            ? { legalPerson: { name: data.senderName } }
            : { 
                physicalPerson: { 
                  familyName: senderNameParts.length > 1 ? senderNameParts.slice(1).join(' ') : data.senderName,
                  givenName: senderNameParts.length > 1 ? senderNameParts[0] : '',
                }
              },
          postalAddress: {
            street: data.senderAddress,
            postalCode: data.senderZip,
            city: data.senderCity,
            countryCode: senderCountryCode,
          }
        },
        subject: 'Document Delivery',
        documents: [
          {
            content: pdfContent,
            mimeType: 'application/pdf',
            name: path.basename(data.pdfPath),
            type: 'Standard',
            realm: 'GENERAL',
          }
        ]
      };
      
      // Log detailed request information for debugging
      logger.info('BriefButlerService: Making request to /endpoint-spool/dualDelivery');
      logger.debug('BriefButlerService: Request payload:', {
        metadata: requestBody.metadata,
        configuration: requestBody.configuration,
        receiver: {
          email: requestBody.receiver.email,
          phoneNumber: requestBody.receiver.phoneNumber,
          recipient: requestBody.receiver.recipient,
          postalAddress: requestBody.receiver.postalAddress
        },
        sender: {
          person: requestBody.sender?.person,
          postalAddress: requestBody.sender?.postalAddress
        },
        documents: requestBody.documents.map(doc => ({
          name: doc.name,
          type: doc.type,
          realm: doc.realm,
          contentLength: doc.content.length
        }))
      });
      
      const response = await this.apiClient.post('/endpoint-spool/dualDelivery', requestBody);
      logger.info('BriefButlerService: Document submitted successfully');
      
      return {
        success: true,
        data: response.data,
        message: 'Document submitted successfully',
      };
    } catch (error: any) {
      logger.error(`BriefButlerService: Error submitting document: ${error.message}`);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        
        if (error.response.status === 500) {
          logger.error(`This is a server-side error. The BriefButler service may be experiencing issues.`);
          logger.error(`Server error details:`);
          logger.error(error.response.data);
        }
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        message: 'Failed to submit document',
      };
    }
  }

  /**
   * Get the status of a document by its tracking ID
   * @param trackingId The tracking ID of the document
   * @returns BriefButler API response with status information
   */
  async getTrackingStatus(trackingId: string): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getTrackingStatus');
      return {
        success: true,
        data: {
          trackingId: trackingId,
          state: {
            stateName: 'processing',
            stateCode: 201,
            timestamp: new Date().toISOString(),
          },
          history: [
            {
              stateName: 'received',
              stateCode: 101,
              timestamp: new Date(Date.now() - 3600000).toISOString(),
            }
          ]
        },
        message: 'Status retrieved successfully (MOCK)',
      };
    }
    
    try {
      logger.info(`BriefButlerService: Getting status for tracking ID: ${trackingId}`);
      const response = await this.apiClient.get(`/endpoint-status/message/trackingId/${trackingId}`);
      logger.info('BriefButlerService: Status retrieved successfully');
      
      return {
        success: true,
        data: response.data,
        message: 'Status retrieved successfully',
      };
    } catch (error: any) {
      logger.error(`BriefButlerService: Error getting status: ${error.message}`);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        message: 'Failed to get status',
      };
    }
  }

  /**
   * Get the status of a document by its delivery ID and profile ID
   * @param deliveryId The delivery ID of the document
   * @param profileId The profile ID used for submission
   * @returns BriefButler API response with status information
   */
  async getDeliveryIdStatus(deliveryId: string, profileId: string): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getDeliveryIdStatus');
      return {
        success: true,
        data: [
          {
            trackingId: `mock-tracking-for-${deliveryId}`,
            state: {
              stateName: 'processing',
              stateCode: 201,
              timestamp: new Date().toISOString(),
            }
          }
        ],
        message: 'Status retrieved successfully (MOCK)',
      };
    }
    
    try {
      logger.info(`BriefButlerService: Getting status for delivery ID: ${deliveryId} and profile ID: ${profileId}`);
      const response = await this.apiClient.get(`/endpoint-status/message/deliveryId/${deliveryId}/${profileId}`);
      logger.info('BriefButlerService: Status retrieved successfully');
      
      return {
        success: true,
        data: response.data,
        message: 'Status retrieved successfully',
      };
    } catch (error: any) {
      logger.error(`BriefButlerService: Error getting status: ${error.message}`);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        message: 'Failed to get status',
      };
    }
  }

  /**
   * Get the content of an outgoing document
   * @param trackingId The tracking ID of the document
   * @param documentId The document ID
   * @param documentVersion The document version
   * @returns BriefButler API response with document content
   */
  async getDocumentContent(trackingId: string, documentId: string, documentVersion: number): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getDocumentContent');
      return {
        success: true,
        data: Buffer.from('Mock PDF content'),
        message: 'Document content retrieved successfully (MOCK)',
      };
    }
    
    try {
      logger.info(`BriefButlerService: Getting document content for tracking ID: ${trackingId}, document ID: ${documentId}, version: ${documentVersion}`);
      
      // Use responseType 'arraybuffer' to get binary data
      const response = await this.apiClient.get(
        `/endpoint-status/message/outgoingDocument/${trackingId}/${documentId}/${documentVersion}`,
        { responseType: 'arraybuffer' }
      );
      
      logger.info('BriefButlerService: Document content retrieved successfully');
      
      return {
        success: true,
        data: response.data,
        message: 'Document content retrieved successfully',
      };
    } catch (error: any) {
      logger.error(`BriefButlerService: Error getting document content: ${error.message}`);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
      }
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to get document content',
      };
    }
  }

  /**
   * Get the content of a return receipt document
   * @param trackingId The tracking ID of the document
   * @param documentId The document ID
   * @param documentVersion The document version
   * @returns BriefButler API response with receipt document content
   */
  async getReceiptDocument(trackingId: string, documentId: string, documentVersion: number): Promise<BriefButlerApiResponse> {
    // Return mock response if in mock mode
    if (this.inMockMode) {
      logger.debug('BriefButlerService: Returning mock response for getReceiptDocument');
      return {
        success: true,
        data: Buffer.from('Mock receipt content'),
        message: 'Receipt document retrieved successfully (MOCK)',
      };
    }
    
    try {
      logger.info(`BriefButlerService: Getting receipt document for tracking ID: ${trackingId}, document ID: ${documentId}, version: ${documentVersion}`);
      
      // Use responseType 'arraybuffer' to get binary data
      const response = await this.apiClient.get(
        `/endpoint-status/message/returnReceipt/${trackingId}/${documentId}/${documentVersion}`,
        { responseType: 'arraybuffer' }
      );
      
      logger.info('BriefButlerService: Receipt document retrieved successfully');
      
      return {
        success: true,
        data: response.data,
        message: 'Receipt document retrieved successfully',
      };
    } catch (error: any) {
      logger.error(`BriefButlerService: Error getting receipt document: ${error.message}`);
      
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
      }
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to get receipt document',
      };
    }
  }
}

// Export a singleton instance
export const briefButlerService = new BriefButlerService(); 