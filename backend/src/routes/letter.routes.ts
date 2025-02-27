import express from 'express';
import passport from 'passport';
import * as letterController from '../controllers/letter.controller';
import { validateRequest } from '../middleware/validate-request';
import { createLetterSchema, updateLetterSchema, letterStatusSchema } from '../validators/letter.validator';
import { upload } from '../middleware/file-upload';

const router = express.Router();

// All routes require authentication except the webhook
router.use(
  /^(?!\/webhook)/,
  passport.authenticate('jwt', { session: false })
);

/**
 * @route POST /api/letters
 * @desc Upload and create a new letter
 * @access Private
 */
router.post(
  '/',
  upload.single('pdfFile'),
  validateRequest(createLetterSchema),
  letterController.createLetter
);

/**
 * @route GET /api/letters
 * @desc Get all letters for the current user
 * @access Private
 */
router.get('/', letterController.getLetters);

/**
 * @route GET /api/letters/:id
 * @desc Get letter by ID
 * @access Private
 */
router.get('/:id', letterController.getLetterById);

/**
 * @route PUT /api/letters/:id
 * @desc Update letter details
 * @access Private
 */
router.put(
  '/:id',
  validateRequest(updateLetterSchema),
  letterController.updateLetter
);

/**
 * @route GET /api/letters/:id/status
 * @desc Get letter status history
 * @access Private
 */
router.get('/:id/status', letterController.getLetterStatusHistory);

/**
 * @route POST /api/letters/:id/send
 * @desc Send letter to BriefButler API
 * @access Private
 */
router.post('/:id/send', letterController.sendLetter);

/**
 * @route DELETE /api/letters/:id
 * @desc Delete a letter
 * @access Private
 */
router.delete('/:id', letterController.deleteLetter);

/**
 * @route POST /api/letters/webhook
 * @desc Webhook endpoint for BriefButler API to update letter status
 * @access Public (secured by webhook signature)
 */
router.post(
  '/webhook',
  validateRequest(letterStatusSchema),
  letterController.updateLetterStatus
);

export default router; 