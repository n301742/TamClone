import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate-request';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateRequest(registerSchema), authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', validateRequest(loginSchema), authController.login);

/**
 * @route GET /api/auth/google
 * @desc Initiate Google OAuth flow
 * @access Public
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @route GET /api/auth/google/callback
 * @desc Google OAuth callback
 * @access Public
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  authController.googleCallback
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', passport.authenticate('jwt', { session: false }), authController.getCurrentUser);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Public (with refresh token)
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', passport.authenticate('jwt', { session: false }), authController.logout);

export default router; 