import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { User, UserRole } from '@prisma/client';

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.user as User;
    
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        profilePicture: true,
        role: true,
        authProvider: true,
        documentRetentionDays: true,
        darkMode: true,
        createdAt: true,
        updatedAt: true,
        billingInfo: {
          select: {
            id: true,
            paymentMethod: true,
            billingAddress: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        profilePicture: true,
        role: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUser = req.user as User;

    // Check if user is requesting their own profile or is an admin
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own profile',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        profilePicture: true,
        role: true,
        authProvider: true,
        documentRetentionDays: true,
        darkMode: true,
        createdAt: true,
        updatedAt: true,
        // Include billing info if user is requesting their own profile
        billingInfo: currentUser.id === id ? {
          select: {
            id: true,
            paymentMethod: true,
            billingAddress: true,
          },
        } : undefined,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, mobileNumber, email, profilePicture } = req.body;
    const currentUser = req.user as User;

    // Check if user is updating their own profile or is an admin
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile',
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(409).json({
          status: 'error',
          message: 'Email is already taken',
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        mobileNumber,
        email,
        profilePicture,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        profilePicture: true,
        role: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'User profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { darkMode, documentRetentionDays } = req.body;
    const currentUser = req.user as User;

    // Check if user is updating their own preferences
    if (currentUser.id !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own preferences',
      });
    }

    // Update preferences
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        darkMode,
        documentRetentionDays,
      },
      select: {
        id: true,
        darkMode: true,
        documentRetentionDays: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'User preferences updated successfully',
      data: { preferences: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update billing information
 */
export const updateBillingInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paymentMethod, billingAddress } = req.body;
    const currentUser = req.user as User;

    // Check if user is updating their own billing info
    if (currentUser.id !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own billing information',
      });
    }

    // Check if billing info exists
    const existingBillingInfo = await prisma.billingInfo.findFirst({
      where: { userId: id },
    });

    let billingInfo;

    if (existingBillingInfo) {
      // Update existing billing info
      billingInfo = await prisma.billingInfo.update({
        where: { id: existingBillingInfo.id },
        data: {
          paymentMethod,
          billingAddress,
        },
      });
    } else {
      // Create new billing info
      billingInfo = await prisma.billingInfo.create({
        data: {
          userId: id,
          paymentMethod,
          billingAddress,
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Billing information updated successfully',
      data: { billingInfo },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUser = req.user as User;

    // Check if user is deleting their own account or is an admin
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own account',
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Delete user (this will cascade delete related records based on Prisma schema)
    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({
      status: 'success',
      message: 'User account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}; 