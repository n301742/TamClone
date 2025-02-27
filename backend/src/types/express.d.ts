import { User as PrismaUser } from '@prisma/client';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface User extends PrismaUser {}
    
    interface Request {
      user?: User;
    }
  }
}

// This export is needed to make this file a module
export {}; 