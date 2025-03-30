import { Router } from 'express';
import { briefButlerController } from '../controllers/brief-butler.controller';
import { briefButlerService } from '../services/brief-butler.service';

const router = Router();

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

// Submit a document to the BriefButler spool service
router.post('/spool', briefButlerController.submitSpool);

// Get status of a spool submission
router.get('/spool/status/:spoolId', briefButlerController.getSpoolStatus);

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

// Add a test route for the spool service
router.post('/spool/test', briefButlerController.testSpoolService);

// Submit document for dual delivery
router.post('/dual-delivery', briefButlerController.submitDualDelivery);

// Get status by tracking ID
router.get('/status/:trackingId', briefButlerController.getStatus);

// Get status by delivery ID and profile ID
router.get('/status-by-delivery/:deliveryId/:profileId', briefButlerController.getStatusByDelivery);

// Get document content
router.get('/document/:trackingId/:documentId/:documentVersion', briefButlerController.getDocument);

// Get receipt document
router.get('/receipt/:trackingId/:documentId/:documentVersion', briefButlerController.getReceipt);

export default router; 