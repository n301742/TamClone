import express from 'express';
import passport from 'passport';
import * as userController from '../controllers/user.controller';
import { validateRequest } from '../middleware/validate-request';
import { updateUserSchema, updatePreferencesSchema } from '../validators/user.validator';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', userController.getCurrentUser);

/**
 * @route GET /api/users
 * @desc Get all users (admin only)
 * @access Private/Admin
 */
router.get('/', isAdmin, userController.getAllUsers);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (own profile or admin)
 */
router.get('/:id', userController.getUserById);

/**
 * @route PUT /api/users/:id
 * @desc Update user profile
 * @access Private (own profile or admin)
 */
router.put('/:id', validateRequest(updateUserSchema), userController.updateUser);

/**
 * @route PUT /api/users/:id/preferences
 * @desc Update user preferences
 * @access Private (own profile only)
 */
router.put('/:id/preferences', validateRequest(updatePreferencesSchema), userController.updatePreferences);

/**
 * @route PUT /api/users/:id/billing
 * @desc Update billing information
 * @access Private (own profile only)
 */
router.put('/:id/billing', userController.updateBillingInfo);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user account
 * @access Private (own profile or admin)
 */
router.delete('/:id', userController.deleteUser);

export default router; 