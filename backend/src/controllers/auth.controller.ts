import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../app';
import { AuthProvider, User, UserRole } from '@prisma/client';

// JWT configuration
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Generate JWT tokens for a user
 */
const generateTokens = (user: User) => {
  // Create JWT payload
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate access token
  const accessToken = jwt.sign(
    payload, 
    JWT_SECRET, 
    {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    { sub: user.id }, 
    JWT_SECRET, 
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, mobileNumber } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        mobileNumber,
        authProvider: AuthProvider.LOCAL,
        role: UserRole.USER,
        documentRetentionDays: 30, // Default value
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Return user data and tokens
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login with email and password
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Check if user exists and is using local auth
    if (!user || user.authProvider !== AuthProvider.LOCAL) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Return user data and tokens
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth callback
 */
export const googleCallback = (req: Request, res: Response) => {
  // User will be attached by passport middleware
  const user = req.user as User;

  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Redirect to frontend with tokens
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Create a secure way to pass tokens to the frontend
  // In production, you'd want to use a more secure method
  const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}`;
  
  return res.redirect(redirectUrl);
};

/**
 * Get current user profile
 */
export const getCurrentUser = (req: Request, res: Response) => {
  const user = req.user as User;

  return res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobileNumber: user.mobileNumber,
        profilePicture: user.profilePicture,
        role: user.role,
        documentRetentionDays: user.documentRetentionDays,
        darkMode: user.darkMode,
        createdAt: user.createdAt,
      },
    },
  });
};

/**
 * Refresh JWT token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET) as { sub: string };
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = (req: Request, res: Response) => {
  // In a stateless JWT authentication system, the client is responsible for
  // discarding the tokens. The server can't invalidate the tokens directly.
  // For a more secure implementation, you could maintain a blacklist of revoked tokens.

  return res.status(200).json({
    status: 'success',
    message: 'Logout successful',
  });
}; 