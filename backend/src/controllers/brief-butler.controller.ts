import { Request, Response } from 'express';
import { briefButlerService } from '../services/brief-butler.service';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { prisma } from '../app';
import { LetterStatus } from '@prisma/client';
import { SpoolSubmissionData } from '../types/briefbutler.types';
import { PdfProcessingService } from '../services/pdf-processing.service';
import { BriefButlerService } from '../services/brief-butler.service';
import { AddressFormType } from '../services/pdf-processing.service';

// Check for test mode environment variable
if (process.env.BRIEFBUTLER_TEST_MODE === 'true') {
  // Enable mock mode if we're in test mode
  briefButlerService.enableMockMode();
  logger.info('BriefButlerService: Mock mode enabled via environment variable');
}

/**
 * Controller for BriefButler operations
 * Handles sending letters, tracking status, and managing profiles
 */
export const briefButlerController = {
  /**
   * Submit a letter to the BriefButler service
   * @param req Express request
   * @param res Express response
   */
  async submitLetter(req: Request, res: Response) {
    try {
      const { letterId, profileId } = req.body;
      
      if (!letterId || !profileId) {
        return res.status(400).json({
          status: 'error',
          message: 'Letter ID and profile ID are required',
        });
      }
      
      // Get letter details from database
      const letter = await prisma.letter.findUnique({
        where: { id: letterId },
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
      
      // Validate recipient data
      if (!letter.recipientName || !letter.recipientAddress || !letter.recipientCity || 
          !letter.recipientZip || !letter.recipientCountry) {
        return res.status(400).json({
          status: 'error',
          message: 'Letter is missing required recipient information',
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
      
      // Submit letter to BriefButler
      const result = await briefButlerService.submitLetter({
        pdfPath: absolutePdfPath,
        recipientName: letter.recipientName,
        recipientAddress: letter.recipientAddress,
        recipientCity: letter.recipientCity,
        recipientZip: letter.recipientZip,
        recipientCountry: letter.recipientCountry,
        recipientState: letter.recipientState || undefined,
        profileId,
        isExpress: letter.isExpress,
        isRegistered: letter.isRegistered,
        isColorPrint: letter.isColorPrint,
        isDuplexPrint: letter.isDuplexPrint,
      });
      
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
      const trackingId = result.data?.trackingId || result.data?.id || null;
      
      // Update letter with tracking ID and status
      const updatedLetter = await prisma.letter.update({
        where: { id: letter.id },
        data: {
          trackingId,
          status: LetterStatus.SENT,
          sentAt: new Date(),
          profileId,
        },
      });
      
      // Add status history entry
      await prisma.statusHistory.create({
        data: {
          letterId: letter.id,
          status: LetterStatus.SENT,
          message: 'Letter submitted to BriefButler',
        },
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Letter submitted to BriefButler',
        data: {
          letterId: letter.id,
          trackingId,
          briefButlerResponse: result.data,
        },
      });
    } catch (error: any) {
      logger.error('Error in submitLetter controller:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to submit letter',
        error: error.message,
      });
    }
  },
  
  /**
   * Get the status of a letter from BriefButler
   * @param req Express request
   * @param res Express response
   */
  async getLetterStatus(req: Request, res: Response) {
    try {
      const { trackingId } = req.params;
      
      if (!trackingId) {
        return res.status(400).json({
          status: 'error',
          message: 'Tracking ID is required',
        });
      }
      
      // Check if letter exists in our database
      const letter = await prisma.letter.findUnique({
        where: { trackingId },
      });
      
      if (!letter) {
        return res.status(404).json({
          status: 'error',
          message: 'Letter not found with this tracking ID',
        });
      }
      
      // Get status from BriefButler
      const result = await briefButlerService.getLetterStatus(trackingId);
      
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.message,
          error: result.error,
        });
      }
      
      // Extract status from response
      const briefButlerStatus = result.data?.status;
      let newStatus = letter.status;
      
      // Map BriefButler status to our status
      if (briefButlerStatus) {
        if (briefButlerStatus.toLowerCase().includes('delivered')) {
          newStatus = LetterStatus.DELIVERED;
        } else if (briefButlerStatus.toLowerCase().includes('failed') || 
                  briefButlerStatus.toLowerCase().includes('error')) {
          newStatus = LetterStatus.FAILED;
        } else if (briefButlerStatus.toLowerCase().includes('processing') || 
                  briefButlerStatus.toLowerCase().includes('pending')) {
          newStatus = LetterStatus.PROCESSING;
        } else if (briefButlerStatus.toLowerCase().includes('sent') || 
                  briefButlerStatus.toLowerCase().includes('transit')) {
          newStatus = LetterStatus.SENT;
        }
      }
      
      // If status changed, update letter and add history
      if (newStatus !== letter.status) {
        // Update letter status
        await prisma.letter.update({
          where: { id: letter.id },
          data: {
            status: newStatus,
            ...(newStatus === LetterStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
          },
        });
        
        // Add status history entry
        await prisma.statusHistory.create({
          data: {
            letterId: letter.id,
            status: newStatus,
            message: `Status updated from BriefButler: ${briefButlerStatus}`,
          },
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Letter status retrieved',
        data: {
          letterId: letter.id,
          trackingId,
          status: newStatus,
          briefButlerStatus,
          briefButlerDetails: result.data,
        },
      });
    } catch (error: any) {
      logger.error('Error in getLetterStatus controller:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get letter status',
        error: error.message,
      });
    }
  },
  
  /**
   * Cancel a letter that hasn't been sent yet
   * @param req Express request
   * @param res Express response
   */
  async cancelLetter(req: Request, res: Response) {
    try {
      const { trackingId } = req.params;
      
      if (!trackingId) {
        return res.status(400).json({
          status: 'error',
          message: 'Tracking ID is required',
        });
      }
      
      // Check if letter exists in our database
      const letter = await prisma.letter.findUnique({
        where: { trackingId },
      });
      
      if (!letter) {
        return res.status(404).json({
          status: 'error',
          message: 'Letter not found with this tracking ID',
        });
      }
      
      // Can only cancel if not delivered
      if (letter.status === LetterStatus.DELIVERED) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot cancel a letter that has already been delivered',
        });
      }
      
      // Try to cancel via BriefButler
      const result = await briefButlerService.cancelLetter(trackingId);
      
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.message,
          error: result.error,
        });
      }
      
      // Update letter status to FAILED (for canceled)
      await prisma.letter.update({
        where: { id: letter.id },
        data: {
          status: LetterStatus.FAILED,
        },
      });
      
      // Add status history entry
      await prisma.statusHistory.create({
        data: {
          letterId: letter.id,
          status: LetterStatus.FAILED,
          message: 'Letter canceled by user',
        },
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Letter canceled successfully',
        data: {
          letterId: letter.id,
          trackingId,
          briefButlerResponse: result.data,
        },
      });
    } catch (error: any) {
      logger.error('Error in cancelLetter controller:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to cancel letter',
        error: error.message,
      });
    }
  },
  
  /**
   * Get all profiles for a user
   * @param req Express request
   * @param res Express response
   */
  async getUserProfiles(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID is required',
        });
      }
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
      
      // Get profiles from BriefButler
      const result = await briefButlerService.getUserProfiles(userId);
      
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.message,
          error: result.error,
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'User profiles retrieved',
        data: {
          userId,
          profiles: result.data,
        },
      });
    } catch (error: any) {
      logger.error('Error in getUserProfiles controller:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get user profiles',
        error: error.message,
      });
    }
  },

  /**
   * Submit a document to the BriefButler spool service for dual delivery
   * @route POST /api/brief-butler/spool
   */
  async submitSpool(req: Request, res: Response) {
    try {
      const { letterId, senderData } = req.body;
      
      if (!letterId) {
        return res.status(400).json({
          status: 'error',
          message: 'Letter ID is required'
        });
      }
      
      if (!senderData || !senderData.name || !senderData.address || !senderData.city || !senderData.zip || !senderData.country) {
        return res.status(400).json({
          status: 'error',
          message: 'Sender information is incomplete. Name, address, city, zip, and country are required.'
        });
      }
      
      // Get the letter from the database
      const letter = await prisma.letter.findUnique({
        where: { id: letterId }
      });
      
      if (!letter) {
        return res.status(404).json({
          status: 'error',
          message: 'Letter not found'
        });
      }
      
      if (!letter.pdfPath) {
        return res.status(400).json({
          status: 'error',
          message: 'PDF file path is missing from the letter'
        });
      }
      
      // Check if letter has recipient information
      // If not, we need to extract the address from the PDF
      if (!letter.recipientName || !letter.recipientAddress || !letter.recipientCity || !letter.recipientZip) {
        // Initialize the PDF processing service
        const pdfProcessingService = new PdfProcessingService();
        
        try {
          // Extract address from the PDF
          const extractionResult = await pdfProcessingService.extractAddressFromPdf(
            path.join(process.cwd(), letter.pdfPath),
            'formB' as AddressFormType // Default form type, can be made configurable
          );
          
          // Update the letter with the extracted address
          await prisma.letter.update({
            where: { id: letterId },
            data: {
              recipientName: extractionResult.name,
              recipientAddress: extractionResult.street,
              recipientCity: extractionResult.city,
              recipientZip: extractionResult.postalCode, // Assuming 'postalCode' is the correct property
              recipientCountry: extractionResult.country || 'Germany' // Default to Germany if not specified
            }
          });
          
          // Refresh the letter object with updated data
          const updatedLetter = await prisma.letter.findUnique({
            where: { id: letterId }
          });
          
          if (!updatedLetter) {
            throw new Error('Failed to retrieve updated letter');
          }
          
          letter.recipientName = updatedLetter.recipientName;
          letter.recipientAddress = updatedLetter.recipientAddress;
          letter.recipientCity = updatedLetter.recipientCity;
          letter.recipientZip = updatedLetter.recipientZip;
          letter.recipientCountry = updatedLetter.recipientCountry;
        } catch (error: any) {
          logger.error('Error extracting address from PDF:', error.message);
          return res.status(400).json({
            status: 'error',
            message: 'Failed to extract address from PDF. Please provide recipient information manually.',
            details: error.message
          });
        }
      }
      
      // Ensure recipient information exists
      if (!letter.recipientName || !letter.recipientAddress || !letter.recipientCity || !letter.recipientZip || !letter.recipientCountry) {
        return res.status(400).json({
          status: 'error',
          message: 'Recipient information is incomplete. Cannot proceed with spool submission.'
        });
      }
      
      // Prepare the spool submission data
      const spoolData: SpoolSubmissionData = {
        pdfPath: path.join(process.cwd(), letter.pdfPath),
        recipientName: letter.recipientName,
        recipientAddress: letter.recipientAddress,
        recipientCity: letter.recipientCity,
        recipientZip: letter.recipientZip,
        recipientCountry: letter.recipientCountry,
        recipientState: letter.recipientState || '',
        recipientEmail: senderData.recipientEmail || '', // From sender data only
        recipientPhone: senderData.recipientPhone || '+43123456789', // Add valid default phone number
        senderName: senderData.name,
        senderAddress: senderData.address,
        senderCity: senderData.city,
        senderZip: senderData.zip,
        senderCountry: senderData.country,
        senderState: senderData.state || '',
        reference: senderData.reference || letter.description || '',
        isColorPrint: letter.isColorPrint,
        isDuplexPrint: letter.isDuplexPrint,
        priority: (senderData.priority || 'normal').toUpperCase() // Make sure priority is in uppercase
      };
      
      // Initialize the BriefButler service
      const briefButlerService = new BriefButlerService();
      
      // Submit the letter to the spool service
      const result = await briefButlerService.submitSpool(spoolData);
      
      if (!result.success) {
        return res.status(500).json({
          status: 'error',
          message: result.message,
          details: result.error
        });
      }
      
      // Update the letter status in the database
      await prisma.letter.update({
        where: { id: letterId },
        data: {
          status: 'PROCESSING',
          deliveryId: result.data.spool_id,
          updatedAt: new Date()
        }
      });
      
      // Add a status history entry
      await prisma.statusHistory.create({
        data: {
          letterId: letterId,
          status: 'PROCESSING',
          message: 'Submitted to BriefButler spool service',
          timestamp: new Date()
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Letter submitted to spool service successfully',
        data: {
          letterId: letterId,
          spoolId: result.data.spool_id,
          status: 'PROCESSING'
        }
      });
    } catch (error: any) {
      logger.error('Error in submitSpool controller:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to submit letter to spool service',
        details: error.message
      });
    }
  },

  /**
   * Get the status of a document submitted to the spool service
   * @route GET /api/brief-butler/spool/status/:spoolId
   */
  async getSpoolStatus(req: Request, res: Response) {
    try {
      const { spoolId } = req.params;
      
      if (!spoolId) {
        return res.status(400).json({
          status: 'error',
          message: 'Spool ID is required'
        });
      }
      
      // Initialize the BriefButler service
      const briefButlerService = new BriefButlerService();
      
      // Get the status from the BriefButler API
      const result = await briefButlerService.getSpoolStatus(spoolId);
      
      if (!result.success) {
        return res.status(500).json({
          status: 'error',
          message: result.message,
          details: result.error
        });
      }
      
      // Find the letter with this spool ID
      const letter = await prisma.letter.findFirst({
        where: { deliveryId: spoolId }
      });
      
      if (letter) {
        // Check if the status has changed
        if (letter.status !== result.data.status) {
          // Update the letter status in the database
          await prisma.letter.update({
            where: { id: letter.id },
            data: {
              status: result.data.status,
              updatedAt: new Date()
            }
          });
          
          // Add a status history entry
          await prisma.statusHistory.create({
            data: {
              letterId: letter.id,
              status: result.data.status,
              message: `Status updated by BriefButler spool service: ${result.data.status}`,
              timestamp: new Date()
            }
          });
        }
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Spool status retrieved successfully',
        data: result.data
      });
    } catch (error: any) {
      logger.error('Error in getSpoolStatus controller:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get spool status',
        details: error.message
      });
    }
  },

  /**
   * Test the spool service with a mock PDF
   * @route POST /api/brief-butler/spool/test
   */
  async testSpoolService(req: Request, res: Response) {
    try {
      logger.info('BriefButlerController: Testing spool service with mock data');
      
      // Create temporary mock PDF file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const mockPdfPath = path.join(tempDir, 'test-document.pdf');
      
      // Create a simple PDF file with text content if it doesn't exist
      if (!fs.existsSync(mockPdfPath)) {
        logger.info(`Creating mock PDF file at ${mockPdfPath}`);
        // Simple PDF content (could be improved)
        const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Font << /F1 6 0 R >> >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Test Document) Tj ET\nendstream\nendobj\n6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 7\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\n0000000260 00000 n\n0000000354 00000 n\ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n423\n%%EOF';
        fs.writeFileSync(mockPdfPath, pdfContent);
      }
      
      logger.info(`Using mock PDF at ${mockPdfPath}`);
      
      // Enable mock mode for testing
      briefButlerService.enableMockMode();
      
      // Create test data
      const spoolData: SpoolSubmissionData = {
        pdfPath: mockPdfPath,
        recipientName: 'Test Recipient',
        recipientAddress: 'Test Street 123',
        recipientCity: 'Vienna',
        recipientZip: '1030',
        recipientCountry: 'AT',
        recipientState: '',
        recipientEmail: 'test@example.com',
        recipientPhone: '+43123456789',
        senderName: 'Test Sender',
        senderAddress: 'Sender Street 456',
        senderCity: 'Vienna',
        senderZip: '1010',
        senderCountry: 'AT',
        senderState: '',
        reference: 'TEST-REF-123',
        isColorPrint: true,
        isDuplexPrint: true,
        priority: 'PRIORITY'
      };
      
      // Submit to service
      const result = await briefButlerService.submitSpool(spoolData);
      
      return res.status(200).json({
        status: 'success',
        message: 'Test submission completed',
        data: result
      });
    } catch (error: any) {
      logger.error('Error in test spool service:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to test spool service',
        details: error.message
      });
    }
  },
}; 