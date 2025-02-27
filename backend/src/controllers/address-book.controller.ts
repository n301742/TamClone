import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { User } from '@prisma/client';

/**
 * @desc    Create a new address in the address book
 * @route   POST /api/address-book
 * @access  Private
 */
export const createAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as User;
    const { name, address, city, state, postalCode, country, isDefault } = req.body;

    // If this address is set as default, unset any existing default
    if (isDefault) {
      await prisma.addressBook.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create the new address
    const newAddress = await prisma.addressBook.create({
      data: {
        userId: user.id,
        name,
        address,
        city,
        state: state || '',
        postalCode,
        country,
        isDefault: isDefault || false,
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Address created successfully',
      data: { address: newAddress },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all addresses for the current user
 * @route   GET /api/address-book
 * @access  Private
 */
export const getAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as User;

    const addresses = await prisma.addressBook.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        isDefault: 'desc', // Default addresses first
      },
    });

    return res.status(200).json({
      status: 'success',
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get address by ID
 * @route   GET /api/address-book/:id
 * @access  Private
 */
export const getAddressById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as User;
    const { id } = req.params;

    const address = await prisma.addressBook.findUnique({
      where: {
        id,
      },
    });

    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found',
      });
    }

    // Check if the address belongs to the user
    if (address.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own addresses',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/address-book/:id
 * @access  Private
 */
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as User;
    const { id } = req.params;
    const { name, address, city, state, postalCode, country, isDefault } = req.body;

    // Check if address exists
    const existingAddress = await prisma.addressBook.findUnique({
      where: {
        id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found',
      });
    }

    // Check if the address belongs to the user
    if (existingAddress.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own addresses',
      });
    }

    // If this address is being set as default, unset any existing default
    if (isDefault && !existingAddress.isDefault) {
      await prisma.addressBook.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update the address
    const updatedAddress = await prisma.addressBook.update({
      where: {
        id,
      },
      data: {
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        state: state !== undefined ? state : undefined,
        postalCode: postalCode !== undefined ? postalCode : undefined,
        country: country !== undefined ? country : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Address updated successfully',
      data: { address: updatedAddress },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/address-book/:id
 * @access  Private
 */
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as User;
    const { id } = req.params;

    // Check if address exists
    const existingAddress = await prisma.addressBook.findUnique({
      where: {
        id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found',
      });
    }

    // Check if the address belongs to the user
    if (existingAddress.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own addresses',
      });
    }

    // Delete the address
    await prisma.addressBook.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Address deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set address as default
 * @route   PATCH /api/address-book/:id/default
 * @access  Private
 */
export const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as User;
    const { id } = req.params;

    // Check if address exists
    const existingAddress = await prisma.addressBook.findUnique({
      where: {
        id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found',
      });
    }

    // Check if the address belongs to the user
    if (existingAddress.userId !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own addresses',
      });
    }

    // Unset any existing default address
    await prisma.addressBook.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this address as default
    const updatedAddress = await prisma.addressBook.update({
      where: {
        id,
      },
      data: {
        isDefault: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Address set as default successfully',
      data: { address: updatedAddress },
    });
  } catch (error) {
    next(error);
  }
}; 