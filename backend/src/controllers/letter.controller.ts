import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { User, Letter, LetterStatus } from '@prisma/client';
import { deleteFile } from '../middleware/file-upload';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { pdfProcessingService, AddressFormType } from '../services/pdf-processing.service';
import { BriefButlerService } from '../services/brief-butler.service';
import { SpoolSubmissionData } from '../types/briefbutler.types';

// BriefButler API configuration
const BRIEFBUTLER_API_URL = process.env.BRIEFBUTLER_API_URL || 'https://api.briefbutler.com/v2.5';
const BRIEFBUTLER_API_KEY = process.env.BRIEFBUTLER_API_KEY || '';

// Type for API response
interface BriefButlerResponse {
  trackingId: string;
  deliveryId: string;
  status: string;
}

/**
 * Interface for recipient data with name components and address
 */
interface RecipientData {
  name: string;
  firstName: string;
  lastName: string;
  academicTitle: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Helper function to convert string booleans to actual booleans
const convertToBoolean = (value: any, defaultValue = false): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

/**
 * Create a new letter
 */
export const createLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('TEST LOG: Creating a new letter');
    console.log('Request body:', JSON.stringify(req.body));
    
    const { 
      recipient,
      addressId,
      description, 
      isExpress, 
      isRegistered, 
      isColorPrint, 
      isDuplexPrint,
      extractAddress, // New flag to indicate if we should extract address from PDF
      formType // Form type for address extraction
    } = req.body;
    
    // Convert boolean values from strings to actual booleans
    const convertedIsExpress = convertToBoolean(isExpress);
    const convertedIsRegistered = convertToBoolean(isRegistered);
    const convertedIsColorPrint = convertToBoolean(isColorPrint);
    const convertedIsDuplexPrint = convertToBoolean(isDuplexPrint, true); // Default to true
    
    console.log('Extract address flag:', extractAddress, typeof extractAddress);
    
    const user = req.user as User;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'PDF file is required',
      });
    }

    console.log('File uploaded:', file.path);

    // If addressId is provided, get the address from the address book
    let recipientData: RecipientData = {
      name: '',
      firstName: '',
      lastName: '',
      academicTitle: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    };

    // If extractAddress is true, try to extract address from the PDF
    let addressExtractionDetails = null;
    if (extractAddress === true || extractAddress === 'true') {
      try {
        console.log('Extracting address from PDF:', file.path);
        
        // Convert formType string to AddressFormType enum
        let addressFormType;
        if (formType === 'formA') {
          addressFormType = AddressFormType.FORM_A;
        } else if (formType === 'din676') {
          addressFormType = AddressFormType.DIN_676;
        } else {
          // Default to formB
          addressFormType = AddressFormType.FORM_B;
        }
        
        console.log(`Using form type: ${formType} (${addressFormType})`);

        // First, detect if the PDF is text-based or a scanned image
        const pdfTypeResult = await pdfProcessingService.detectPdfType(file.path);
        console.log('PDF type detection result:', JSON.stringify(pdfTypeResult));

        // If it's a scanned PDF, return an appropriate error
        if (!pdfTypeResult.isTextBased) {
          return res.status(422).json({
            status: 'error',
            message: 'Scanned PDF detected. This PDF appears to be a scanned image without extractable text.',
            data: {
              pdfType: 'scanned',
              confidence: pdfTypeResult.confidence,
              requiresOcr: true
            }
          });
        }
        
        // If PDF is text-based, proceed with address extraction
        const extractedAddress = await pdfProcessingService.extractAddressFromPdf(
          file.path,
          addressFormType
        );
        
        console.log('Extracted address result:', JSON.stringify(extractedAddress));
        
        // Store extraction details for the response
        addressExtractionDetails = {
          confidence: extractedAddress.confidence,
          rawText: extractedAddress.rawText,
          zipCodeValidation: {
            attempted: !!(extractedAddress.postalCode && extractedAddress.city),
            countryDetected: extractedAddress.country || null,
            zipCodeFormat: extractedAddress.postalCode ? 
              (extractedAddress.postalCode.length === 5 ? 'German (5-digit)' : 
               extractedAddress.postalCode.length === 4 ? 'Austrian (4-digit)' : 'Unknown') : null,
            cityProvided: !!extractedAddress.city,
            matchFound: (extractedAddress as any).zipValidationDetails?.matchFound || false,
            originalCity: (extractedAddress as any).zipValidationDetails?.originalCity || extractedAddress.city || null,
            suggestedCity: (extractedAddress as any).zipValidationDetails?.suggestedCity || null
          },
          streetValidation: {
            attempted: !!(extractedAddress.street && extractedAddress.postalCode && extractedAddress.city),
            streetProvided: !!extractedAddress.street,
            matchFound: (extractedAddress as any).streetValidationDetails?.matchFound || false,
            originalStreet: (extractedAddress as any).streetValidationDetails?.originalStreet || extractedAddress.street || null,
            suggestedStreet: (extractedAddress as any).streetValidationDetails?.suggestedStreet || null
          },
          // Add the structured address fields
          name: extractedAddress.name || '',
          street: extractedAddress.street || '',
          city: extractedAddress.city || '',
          state: extractedAddress.state || '',
          postalCode: extractedAddress.postalCode || '',
          country: extractedAddress.country || ''
        };
        
        // Always use extracted address regardless of confidence
        recipientData = {
          name: extractedAddress.name || '',
          firstName: extractedAddress.firstName || '',
          lastName: extractedAddress.lastName || '',
          academicTitle: extractedAddress.academicTitle || '',
          address: extractedAddress.street || '',
          city: extractedAddress.city || '',
          state: extractedAddress.state || '',
          postalCode: extractedAddress.postalCode || '',
          country: extractedAddress.country || '',
        };
        
        console.log('Using extracted address with confidence:', extractedAddress.confidence);
      } catch (error) {
        console.error('Error extracting address from PDF:', error);
        // Continue with other address sources if extraction fails
      }
    } else {
      console.log('Address extraction not requested');
    }

    // If addressId is provided, use address from address book (overrides extracted address)
    if (addressId) {
      const address = await prisma.addressBook.findUnique({
        where: {
          id: addressId,
        },
      });

      if (!address) {
        return res.status(404).json({
          status: 'error',
          message: 'Address not found in your address book',
        });
      }

      if (address.userId !== user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only use addresses from your own address book',
        });
      }

      recipientData = {
        name: address.name,
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        academicTitle: address.academicTitle || '',
        address: address.address,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      };
    } else if (recipient) {
      // Use the provided recipient information (overrides extracted address)
      recipientData = {
        name: recipient.name,
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        academicTitle: recipient.academicTitle || '',
        address: recipient.street,
        city: recipient.city,
        state: recipient.state || '',
        postalCode: recipient.postalCode,
        country: recipient.country,
      };
    }

    // Create letter record
    const letter = await prisma.letter.create({
      data: {
        userId: user.id,
        pdfPath: file.path,
        fileName: file.originalname,
        fileSize: file.size,
        recipientName: recipientData.name,
        recipientAddress: recipientData.address,
        recipientCity: recipientData.city,
        recipientState: recipientData.state,
        recipientZip: recipientData.postalCode,
        recipientCountry: recipientData.country,
        description,
        isExpress: convertedIsExpress,
        isRegistered: convertedIsRegistered,
        isColorPrint: convertedIsColorPrint,
        isDuplexPrint: convertedIsDuplexPrint,
        status: LetterStatus.PROCESSING,
        statusHistory: {
          create: {
            status: LetterStatus.PROCESSING,
            message: 'Letter uploaded and ready for processing',
          },
        },
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Letter created successfully',
      data: { 
        letter,
        addressExtraction: addressExtractionDetails
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all letters for the current user
 */
export const getLetters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as User;
    const { status, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Parse pagination parameters
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter
    const filter: any = {
      userId: user.id,
    };

    if (status) {
      filter.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.letter.count({
      where: filter,
    });

    // Get letters with pagination and sorting
    const letters = await prisma.letter.findMany({
      where: filter,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      skip,
      take: limitNumber,
      include: {
        statusHistory: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        letters,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(totalCount / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get letter by ID
 */
export const getLetterById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    const letter = await prisma.letter.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }

    // Check if user owns the letter
    if (letter.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own letters',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { letter },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update letter details
 */
export const updateLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { 
      recipient,
      addressId,
      description, 
      isExpress, 
      isRegistered, 
      isColorPrint, 
      isDuplexPrint 
    } = req.body;
    
    // Convert boolean values from strings to actual booleans
    const convertedIsExpress = convertToBoolean(isExpress);
    const convertedIsRegistered = convertToBoolean(isRegistered);
    const convertedIsColorPrint = convertToBoolean(isColorPrint);
    const convertedIsDuplexPrint = convertToBoolean(isDuplexPrint, true); // Default to true
    
    const user = req.user as User;

    // Find the letter
    const letter = await prisma.letter.findUnique({
      where: { id },
    });

    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }

    // Check if the letter belongs to the user
    if (letter.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own letters',
      });
    }

    // Check if the letter has already been sent
    if (letter.status !== LetterStatus.PROCESSING) {
      return res.status(400).json({
        status: 'error',
        message: 'Letter cannot be updated after it has been sent',
      });
    }

    // Prepare update data
    const updateData: any = {};

    // If addressId is provided, get the address from the address book
    if (addressId) {
      const address = await prisma.addressBook.findUnique({
        where: {
          id: addressId,
        },
      });

      if (!address) {
        return res.status(404).json({
          status: 'error',
          message: 'Address not found in your address book',
        });
      }

      if (address.userId !== user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only use addresses from your own address book',
        });
      }

      updateData.recipientName = address.name;
      updateData.recipientAddress = address.address;
      updateData.recipientCity = address.city;
      updateData.recipientState = address.state;
      updateData.recipientZip = address.postalCode;
      updateData.recipientCountry = address.country;
    } else if (recipient) {
      // Update recipient information if provided
      updateData.recipientName = recipient.name;
      updateData.recipientAddress = recipient.street;
      updateData.recipientCity = recipient.city;
      updateData.recipientState = recipient.state || '';
      updateData.recipientZip = recipient.postalCode;
      updateData.recipientCountry = recipient.country;
    }

    // Update other fields if provided
    if (description !== undefined) updateData.description = description;
    if (isExpress !== undefined) updateData.isExpress = convertedIsExpress;
    if (isRegistered !== undefined) updateData.isRegistered = convertedIsRegistered;
    if (isColorPrint !== undefined) updateData.isColorPrint = convertedIsColorPrint;
    if (isDuplexPrint !== undefined) updateData.isDuplexPrint = convertedIsDuplexPrint;

    // Update the letter
    const updatedLetter = await prisma.letter.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Letter updated successfully',
      data: { letter: updatedLetter },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get letter status history
 */
export const getLetterStatusHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    // Get letter
    const letter = await prisma.letter.findUnique({
      where: { id },
    });

    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }

    // Check if user owns the letter
    if (letter.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own letters',
      });
    }

    // Get status history
    const statusHistory = await prisma.statusHistory.findMany({
      where: { letterId: id },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return res.status(200).json({
      status: 'success',
      data: { statusHistory },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send letter to BriefButler API
 */
export const sendLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    // Get letter
    const letter = await prisma.letter.findUnique({
      where: { id },
    });

    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }

    // Check if user owns the letter
    if (letter.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only send your own letters',
      });
    }

    // Check if letter can be sent (only if not sent yet)
    if (letter.status !== LetterStatus.PROCESSING) {
      return res.status(400).json({
        status: 'error',
        message: 'Letter has already been sent or processed',
      });
    }

    // Check if file exists
    if (!letter.pdfPath || !fs.existsSync(letter.pdfPath)) {
      return res.status(400).json({
        status: 'error',
        message: 'Letter PDF file not found',
      });
    }

    // Prepare file for upload
    const fileBuffer = fs.readFileSync(letter.pdfPath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, letter.fileName || 'letter.pdf');

    // Prepare recipient data
    const recipient = {
      name: letter.recipientName,
      address: letter.recipientAddress,
      city: letter.recipientCity,
      state: letter.recipientState,
      zip: letter.recipientZip,
      country: letter.recipientCountry,
    };
    formData.append('recipient', JSON.stringify(recipient));

    // Prepare options
    const options = {
      isExpress: letter.isExpress,
      isRegistered: letter.isRegistered,
      isColorPrint: letter.isColorPrint,
      isDuplexPrint: letter.isDuplexPrint,
    };
    formData.append('options', JSON.stringify(options));

    try {
      // Send letter to BriefButler API
      const response = await axios.post<BriefButlerResponse>(
        `${BRIEFBUTLER_API_URL}/letters/send`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${BRIEFBUTLER_API_KEY}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Update letter with tracking information
      const updatedLetter = await prisma.letter.update({
        where: { id },
        data: {
          status: LetterStatus.SENT,
          trackingId: response.data.trackingId,
          deliveryId: response.data.deliveryId,
          sentAt: new Date(),
          statusHistory: {
            create: {
              status: LetterStatus.SENT,
              message: `Letter sent with tracking ID: ${response.data.trackingId}`,
            },
          },
        },
      });

      return res.status(200).json({
        status: 'success',
        message: 'Letter sent successfully',
        data: {
          letter: updatedLetter,
          tracking: {
            trackingId: response.data.trackingId,
            deliveryId: response.data.deliveryId,
          },
        },
      });
    } catch (apiError: any) {
      // Handle API error
      console.error('BriefButler API Error:', apiError.response?.data || apiError.message);

      // Update letter status to failed
      await prisma.letter.update({
        where: { id },
        data: {
          status: LetterStatus.FAILED,
          statusHistory: {
            create: {
              status: LetterStatus.FAILED,
              message: `Failed to send letter: ${apiError.response?.data?.message || apiError.message}`,
            },
          },
        },
      });

      return res.status(500).json({
        status: 'error',
        message: 'Failed to send letter to BriefButler API',
        error: apiError.response?.data || apiError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete letter
 */
export const deleteLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    // Get letter
    const letter = await prisma.letter.findUnique({
      where: { id },
    });

    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }

    // Check if user owns the letter
    if (letter.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own letters',
      });
    }

    // Delete file if it exists
    if (letter.pdfPath && fs.existsSync(letter.pdfPath)) {
      await deleteFile(letter.pdfPath);
    }

    // Delete letter from database
    await prisma.letter.delete({
      where: { id },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Letter deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update letter status from webhook
 * This endpoint is called by the BriefButler API to update letter status
 */
export const updateLetterStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trackingId, deliveryId, status, message, timestamp } = req.body;
    
    // Validate webhook signature
    const signature = req.headers['x-briefbutler-signature'] as string;
    if (!signature || !verifyWebhookSignature(signature, req.body)) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid webhook signature',
      });
    }
    
    // Find letter by tracking ID or delivery ID
    const letter = await prisma.letter.findFirst({
      where: {
        OR: [
          { trackingId },
          { deliveryId },
        ],
      },
    });
    
    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }
    
    // Map BriefButler status to our status enum
    const letterStatus = mapBriefButlerStatus(status);
    
    // Update letter status
    const updatedLetter = await prisma.letter.update({
      where: { id: letter.id },
      data: {
        status: letterStatus,
        statusHistory: {
          create: {
            status: letterStatus,
            message: message || `Status updated to ${letterStatus}`,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
          },
        },
      },
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Letter status updated successfully',
      data: { letter: updatedLetter },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify webhook signature from BriefButler API
 */
function verifyWebhookSignature(signature: string, payload: any): boolean {
  // In a real implementation, this would verify the signature using HMAC
  // For now, we'll just check if the signature exists
  // TODO: Implement proper signature verification
  return !!signature;
}

/**
 * Map BriefButler status to our status enum
 */
function mapBriefButlerStatus(briefButlerStatus: string): LetterStatus {
  const statusMap: Record<string, LetterStatus> = {
    'processing': LetterStatus.PROCESSING,
    'sent': LetterStatus.SENT,
    'in_transit': LetterStatus.SENT,
    'delivered': LetterStatus.DELIVERED,
    'failed': LetterStatus.FAILED,
    'returned': LetterStatus.FAILED,
  };
  
  return statusMap[briefButlerStatus.toLowerCase()] || LetterStatus.PROCESSING;
}

/**
 * Send a document to BriefButler with metadata
 * This allows direct integration with BriefButler from the frontend
 */
export const sendToBriefButler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metadata = req.body;
    
    // Validate required metadata fields
    const requiredFields = ['name', 'street', 'city', 'postalCode', 'country', 'formType'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
    
    // Get the letter from the database
    const letter = await prisma.letter.findUnique({
      where: { id },
    });
    
    if (!letter) {
      return res.status(404).json({
        status: 'error',
        message: 'Letter not found',
      });
    }
    
    // Check if the letter already has a tracking ID
    if (letter.trackingId) {
      return res.status(400).json({
        status: 'error',
        message: 'Letter has already been submitted to BriefButler',
      });
    }
    
    // Ensure PDF path exists
    if (!letter.pdfPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Letter does not have a PDF file',
      });
    }
    
    // Create absolute path to PDF file
    const absolutePdfPath = path.resolve(process.cwd(), letter.pdfPath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePdfPath)) {
      return res.status(400).json({
        status: 'error',
        message: 'Letter PDF file not found on server',
      });
    }
    
    // Create spool submission data
    const spoolData: SpoolSubmissionData = {
      pdfPath: absolutePdfPath,
      recipientName: metadata.name,
      recipientAddress: metadata.street,
      recipientCity: metadata.city,
      recipientZip: metadata.postalCode,
      recipientCountry: metadata.country,
      recipientState: metadata.state || undefined,
      senderName: `${(req.user as any)?.firstName || ''} ${(req.user as any)?.lastName || ''}`.trim() || 'Default Sender',
      senderAddress: metadata.senderAddress || 'Default Address',
      senderCity: metadata.senderCity || 'Default City',
      senderZip: metadata.senderZip || '1000',
      senderCountry: metadata.senderCountry || 'Austria',
      senderState: metadata.senderState || undefined,
      reference: `letter-${letter.id}`,
      isColorPrint: metadata.isColorPrint || false,
      isDuplexPrint: metadata.isDuplexPrint !== false,
      isExpress: metadata.isExpress || false,
      isRegistered: metadata.isRegistered || false,
      deliveryProfile: metadata.deliveryProfile || 'briefbutler-test'
    };
    
    // Initialize BriefButler service
    const briefButlerService = new BriefButlerService();
    
    // Submit to BriefButler spool service
    const result = await briefButlerService.submitSpool(spoolData);
    
    if (!result.success) {
      // Record the failure in status history
      await prisma.statusHistory.create({
        data: {
          letterId: letter.id,
          status: LetterStatus.FAILED,
          message: result.message || 'Failed to submit letter to BriefButler',
        },
      });
      
      return res.status(400).json({
        status: 'error',
        message: result.message,
        error: result.error,
      });
    }
    
    // Extract tracking ID from response
    const deliveryId = result.data?.spool_id || result.data?.id || null;
    const deliveryStatus = result.data?.status || LetterStatus.SENT;
    
    // Update letter with tracking ID and status
    const updatedLetter = await prisma.letter.update({
      where: { id },
      data: {
        deliveryId,
        status: deliveryStatus,
        sentAt: new Date(),
      },
    });
    
    // Add status history entry
    await prisma.statusHistory.create({
      data: {
        letterId: letter.id,
        status: LetterStatus.SENT,
        message: 'Letter submitted to BriefButler spool service',
      },
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Letter submitted to BriefButler successfully',
      data: {
        letterId: letter.id,
        briefButlerId: deliveryId,
        briefButlerStatus: deliveryStatus,
        briefButlerResponse: result.data,
      },
    });
  } catch (error: any) {
    console.error('Error in sendToBriefButler controller:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit letter to BriefButler',
      error: error.message,
    });
  }
}; 