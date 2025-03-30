import { Router } from 'express';
import { senderProfileController } from '../controllers/sender-profile.controller';
import passport from 'passport';

const router = Router();

// Apply authentication middleware to all routes
router.use(passport.authenticate('jwt', { session: false }));

// Get all sender profiles for the authenticated user
router.get('/', senderProfileController.getAllProfiles);

// Get the default sender profile for the authenticated user
router.get('/default', senderProfileController.getDefaultProfile);

// Get a specific sender profile
router.get('/:id', senderProfileController.getProfile);

// Create a new sender profile
router.post('/', senderProfileController.createProfile);

// Update an existing sender profile
router.put('/:id', senderProfileController.updateProfile);

// Delete a sender profile
router.delete('/:id', senderProfileController.deleteProfile);

// Set a sender profile as the default
router.put('/:id/set-default', senderProfileController.setDefaultProfile);

export default router; 