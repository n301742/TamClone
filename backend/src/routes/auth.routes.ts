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
router.get('/google', (req, res, next) => {
  console.log('Starting Google authentication flow');
  console.log('Query params:', req.query);
  
  const redirectUri = req.query.redirect_uri;
  if (redirectUri) {
    // Store redirect_uri in session or query param to retain after callback
    req.query.state = Buffer.from(JSON.stringify({ redirectUri })).toString('base64');
    console.log('Added state with redirectUri:', redirectUri);
  }
  
  // Add a second level of debugging to help identify issues
  console.log('Authenticating with Google using passport strategy');
  
  passport.authenticate('google', {
    scope: [
      'profile', 
      'email',
      'openid'
    ],
    accessType: 'offline',
    prompt: 'consent',
    session: false
  })(req, res, next);
});

/**
 * @route GET /api/auth/google/callback
 * @desc Google OAuth callback
 * @access Public
 */
router.get('/google/callback', 
  (req, res, next) => {
    console.log('Received Google callback with query params:', req.query);
    // Parse state if it exists
    if (req.query.state) {
      try {
        const stateObj = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString());
        if (stateObj.redirectUri) {
          req.query.redirect_uri = stateObj.redirectUri;
          console.log('Retrieved redirectUri from state:', stateObj.redirectUri);
        }
      } catch (err) {
        console.error('Error parsing state:', err);
      }
    }
    
    // Check for error parameter which indicates OAuth failure
    if (req.query.error) {
      console.error('Google OAuth error:', req.query.error);
      return res.redirect(`/api/auth/google/failure?error=${encodeURIComponent(req.query.error as string)}`);
    }
    
    next();
  },
  (req, res, next) => {
    console.log('Calling passport.authenticate for callback');
    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/api/auth/google/failure'
    })(req, res, next);
  },
  authController.googleCallback
);

/**
 * @route GET /api/auth/google/failure
 * @desc Handle Google OAuth failure
 * @access Public
 */
router.get('/google/failure', (req, res) => {
  console.log('Google authentication failed');
  const errorMsg = req.query.error ? `Error: ${req.query.error}` : 'Authentication failed';
  console.error('Failure details:', errorMsg);
  
  // Redirect to frontend with error
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMsg)}`);
});

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