import express from 'express';
import { briefButlerController } from '../controllers/brief-butler.controller';
import { briefButlerService } from '../services/brief-butler.service';

const router = express.Router();

/**
 * BriefButler API routes
 * Authentication will be handled by the API gateway or added later
 */

// Submit a letter to BriefButler
router.post('/submit', briefButlerController.submitLetter);

// Get status of a letter
router.get('/status/:trackingId', briefButlerController.getLetterStatus);

// Cancel a letter
router.post('/cancel/:trackingId', briefButlerController.cancelLetter);

// Get user profiles
router.get('/profiles/:userId', briefButlerController.getUserProfiles);

// Add test route for mock mode
router.get('/test-mock', (req, res) => {
  // Try to enable mock mode
  briefButlerService.enableMockMode();
  
  // Call getUserProfiles with mock data
  const userId = 'test-user-123';
  briefButlerService.getUserProfiles(userId)
    .then((result) => {
      res.status(200).json({
        mockModeEnabled: true,
        result
      });
    })
    .catch((error) => {
      res.status(500).json({
        mockModeEnabled: true,
        error: error.message
      });
    })
    .finally(() => {
      // Disable mock mode
      briefButlerService.disableMockMode();
    });
});

export default router; 