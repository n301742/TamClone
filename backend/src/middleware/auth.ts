import { Request, Response, NextFunction } from 'express';
import { UserRole, User } from '@prisma/client';

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Check if user exists and is authenticated
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized - Authentication required',
    });
  }

  // Check if user has admin role
  if ((req.user as User).role !== UserRole.ADMIN) {
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden - Admin access required',
    });
  }

  // User is admin, proceed to next middleware
  next();
};

/**
 * Middleware to check if user is accessing their own resource
 * @param paramIdField The request parameter field containing the user ID (default: 'id')
 */
export const isResourceOwner = (paramIdField: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists and is authenticated
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - Authentication required',
      });
    }

    const resourceId = req.params[paramIdField];
    const user = req.user as User;

    // Check if user is accessing their own resource or is an admin
    if (user.id !== resourceId && user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden - You can only access your own resources',
      });
    }

    // User is authorized, proceed to next middleware
    next();
  };
}; 