import express from 'express';
import passport from 'passport';
import * as addressBookController from '../controllers/address-book.controller';
import { validateRequest } from '../middleware/validate-request';
import { createAddressSchema, updateAddressSchema, setDefaultAddressSchema } from '../validators/address-book.validator';

const router = express.Router();

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @route POST /api/address-book
 * @desc Create a new address
 * @access Private
 */
router.post(
  '/',
  validateRequest(createAddressSchema),
  addressBookController.createAddress
);

/**
 * @route GET /api/address-book
 * @desc Get all addresses for the current user
 * @access Private
 */
router.get('/', addressBookController.getAddresses);

/**
 * @route GET /api/address-book/:id
 * @desc Get address by ID
 * @access Private
 */
router.get('/:id', addressBookController.getAddressById);

/**
 * @route PUT /api/address-book/:id
 * @desc Update address
 * @access Private
 */
router.put(
  '/:id',
  validateRequest(updateAddressSchema),
  addressBookController.updateAddress
);

/**
 * @route DELETE /api/address-book/:id
 * @desc Delete address
 * @access Private
 */
router.delete('/:id', addressBookController.deleteAddress);

/**
 * @route PATCH /api/address-book/:id/default
 * @desc Set address as default
 * @access Private
 */
router.patch(
  '/:id/default',
  validateRequest(setDefaultAddressSchema),
  addressBookController.setDefaultAddress
);

export default router; 