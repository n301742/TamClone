import { Request, Response } from 'express';
import { briefButlerService } from '../services/brief-butler.service';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { prisma } from '../app';
import { LetterStatus } from '@prisma/client';

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
}; 