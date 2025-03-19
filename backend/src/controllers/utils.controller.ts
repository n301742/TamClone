import { NextFunction, Request, Response } from 'express';
import { parseName } from '../utils/name-parser';

/**
 * Controller for utility endpoints
 */
export class UtilsController {
  /**
   * Parse a name into its components
   * @param req Request with name in body
   * @param res Response with parsed name components
   * @param next Next middleware function
   */
  public parseName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;
      
      if (!name) {
        res.status(400).json({ 
          success: false, 
          message: 'Name is required' 
        });
        return;
      }
      
      // Use the name parser utility
      const parsedName = parseName(name);
      
      res.status(200).json(parsedName);
    } catch (error) {
      next(error);
    }
  };
} 