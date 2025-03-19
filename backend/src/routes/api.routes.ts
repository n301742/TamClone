import { Router } from 'express';
import { UtilsController } from '../controllers/utils.controller';

// Create utils controller instance
const utilsController = new UtilsController();

// Initialize router
const router = Router();

// Utils routes
router.post('/utils/parse-name', utilsController.parseName);

export default router; 