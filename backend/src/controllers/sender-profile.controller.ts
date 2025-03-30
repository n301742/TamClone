import { Request, Response } from 'express';
import { prisma } from '../app';
import { logger } from '../utils/logger';

/**
 * Controller for managing sender profiles
 * Used for BriefButler API integration
 */
export const senderProfileController = {
  /**
   * Get all sender profiles for a user
   * @route GET /api/sender-profiles
   */
  async getAllProfiles(req: Request, res: Response) {
    try {
      const user = req.user as any;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      const profiles = await prisma.senderProfile.findMany({
        where: {
          userId: user.id
        },
        orderBy: {
          isDefault: 'desc'
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Sender profiles retrieved successfully',
        data: profiles
      });
    } catch (error: any) {
      logger.error(`Error getting sender profiles: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get sender profiles',
        details: error.message
      });
    }
  },
  
  /**
   * Get a specific sender profile
   * @route GET /api/sender-profiles/:id
   */
  async getProfile(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const { id } = req.params;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      // Find the profile and ensure it belongs to the user
      const profile = await prisma.senderProfile.findFirst({
        where: {
          id,
          userId: user.id
        }
      });
      
      if (!profile) {
        return res.status(404).json({
          status: 'error',
          message: 'Sender profile not found'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Sender profile retrieved successfully',
        data: profile
      });
    } catch (error: any) {
      logger.error(`Error getting sender profile: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get sender profile',
        details: error.message
      });
    }
  },
  
  /**
   * Get the default sender profile for a user
   * @route GET /api/sender-profiles/default
   */
  async getDefaultProfile(req: Request, res: Response) {
    try {
      const user = req.user as any;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      // Find the default profile
      const profile = await prisma.senderProfile.findFirst({
        where: {
          userId: user.id,
          isDefault: true
        }
      });
      
      if (!profile) {
        // If no default is set, get any profile (first one)
        const anyProfile = await prisma.senderProfile.findFirst({
          where: {
            userId: user.id
          }
        });
        
        if (!anyProfile) {
          return res.status(404).json({
            status: 'error',
            message: 'No sender profiles found'
          });
        }
        
        return res.status(200).json({
          status: 'success',
          message: 'No default profile found, returning the first available profile',
          data: anyProfile
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Default sender profile retrieved successfully',
        data: profile
      });
    } catch (error: any) {
      logger.error(`Error getting default sender profile: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get default sender profile',
        details: error.message
      });
    }
  },
  
  /**
   * Create a new sender profile
   * @route POST /api/sender-profiles
   */
  async createProfile(req: Request, res: Response) {
    try {
      const user = req.user as any;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      const { name, companyName, isCompany, address, city, state, zip, country, email, phone, isDefault, deliveryProfile } = req.body;
      
      // Validate required fields
      if (!name || !address || !city || !zip || !country) {
        return res.status(400).json({
          status: 'error',
          message: 'Required fields are missing: name, address, city, zip, and country are required'
        });
      }
      
      // Convert country name to country code if needed
      let countryCode = country;
      if (country === 'Austria') countryCode = 'AT';
      if (country === 'Germany') countryCode = 'DE';
      if (country === 'Switzerland') countryCode = 'CH';
      
      // If this is set as default, unset any existing default profiles
      if (isDefault) {
        await prisma.senderProfile.updateMany({
          where: {
            userId: user.id,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }
      
      // Create the new profile
      const profile = await prisma.senderProfile.create({
        data: {
          userId: user.id,
          name,
          companyName,
          isCompany: !!isCompany,
          address,
          city,
          state: state || '',
          zip,
          country: countryCode,
          email,
          phone,
          isDefault: !!isDefault,
          deliveryProfile: deliveryProfile || 'briefbutler-test'
        }
      });
      
      return res.status(201).json({
        status: 'success',
        message: 'Sender profile created successfully',
        data: profile
      });
    } catch (error: any) {
      logger.error(`Error creating sender profile: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create sender profile',
        details: error.message
      });
    }
  },
  
  /**
   * Update an existing sender profile
   * @route PUT /api/sender-profiles/:id
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const { id } = req.params;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      // Check if profile exists and belongs to user
      const existingProfile = await prisma.senderProfile.findFirst({
        where: {
          id,
          userId: user.id
        }
      });
      
      if (!existingProfile) {
        return res.status(404).json({
          status: 'error',
          message: 'Sender profile not found or does not belong to you'
        });
      }
      
      const { name, companyName, isCompany, address, city, state, zip, country, email, phone, isDefault, deliveryProfile } = req.body;
      
      // Validate required fields
      if (!name || !address || !city || !zip || !country) {
        return res.status(400).json({
          status: 'error',
          message: 'Required fields are missing: name, address, city, zip, and country are required'
        });
      }
      
      // Convert country name to country code if needed
      let countryCode = country;
      if (country === 'Austria') countryCode = 'AT';
      if (country === 'Germany') countryCode = 'DE';
      if (country === 'Switzerland') countryCode = 'CH';
      
      // If this is set as default, unset any existing default profiles
      if (isDefault) {
        await prisma.senderProfile.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
            id: { not: id } // Don't update this profile
          },
          data: {
            isDefault: false
          }
        });
      }
      
      // Update the profile
      const updatedProfile = await prisma.senderProfile.update({
        where: { id },
        data: {
          name,
          companyName,
          isCompany: !!isCompany,
          address,
          city,
          state: state || '',
          zip,
          country: countryCode,
          email,
          phone,
          isDefault: !!isDefault,
          deliveryProfile: deliveryProfile || 'briefbutler-test'
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Sender profile updated successfully',
        data: updatedProfile
      });
    } catch (error: any) {
      logger.error(`Error updating sender profile: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update sender profile',
        details: error.message
      });
    }
  },
  
  /**
   * Delete a sender profile
   * @route DELETE /api/sender-profiles/:id
   */
  async deleteProfile(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const { id } = req.params;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      // Check if profile exists and belongs to user
      const existingProfile = await prisma.senderProfile.findFirst({
        where: {
          id,
          userId: user.id
        }
      });
      
      if (!existingProfile) {
        return res.status(404).json({
          status: 'error',
          message: 'Sender profile not found or does not belong to you'
        });
      }
      
      // Delete the profile
      await prisma.senderProfile.delete({
        where: { id }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Sender profile deleted successfully'
      });
    } catch (error: any) {
      logger.error(`Error deleting sender profile: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete sender profile',
        details: error.message
      });
    }
  },
  
  /**
   * Set a sender profile as the default
   * @route PUT /api/sender-profiles/:id/set-default
   */
  async setDefaultProfile(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const { id } = req.params;
      
      if (!user || !user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        });
      }
      
      // Check if profile exists and belongs to user
      const existingProfile = await prisma.senderProfile.findFirst({
        where: {
          id,
          userId: user.id
        }
      });
      
      if (!existingProfile) {
        return res.status(404).json({
          status: 'error',
          message: 'Sender profile not found or does not belong to you'
        });
      }
      
      // Unset any existing default profiles
      await prisma.senderProfile.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
      
      // Set this profile as default
      const updatedProfile = await prisma.senderProfile.update({
        where: { id },
        data: {
          isDefault: true
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Sender profile set as default successfully',
        data: updatedProfile
      });
    } catch (error: any) {
      logger.error(`Error setting default sender profile: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to set default sender profile',
        details: error.message
      });
    }
  }
}; 