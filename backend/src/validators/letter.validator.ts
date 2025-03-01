import { z } from 'zod';

// Schema for creating a new letter
export const createLetterSchema = z.object({
  body: z.object({
    // Either recipient information or addressId must be provided, or extractAddress must be true
    recipient: z.object({
      name: z.string().min(1, 'Recipient name is required'),
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().optional(),
      postalCode: z.string().min(1, 'Postal code is required'),
      country: z.string().min(1, 'Country is required'),
    }).optional(),
    addressId: z.string().uuid('Invalid address ID format').optional(),
    // New option to extract address from PDF - accept both boolean and string values
    extractAddress: z.preprocess(
      // Convert string 'true'/'false' to boolean
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional()
    ),
    // Form type for address extraction (formA, formB, or din676)
    formType: z.enum(['formA', 'formB', 'din676']).optional().default('formB'),
    // Optional metadata
    description: z.string().optional(),
    isExpress: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional().default(false)
    ),
    isRegistered: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional().default(false)
    ),
    isColorPrint: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional().default(false)
    ),
    isDuplexPrint: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional().default(true)
    ),
  }).refine(
    (data) => data.recipient || data.addressId || data.extractAddress === true,
    {
      message: 'Either recipient information, addressId, or extractAddress must be provided',
      path: ['recipient'],
    }
  ),
  // The file will be handled by multer middleware
});

// Schema for updating a letter
export const updateLetterSchema = z.object({
  body: z.object({
    // Recipient information (only if not yet sent)
    recipient: z
      .object({
        name: z.string().min(1, 'Recipient name is required'),
        street: z.string().min(1, 'Street address is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().optional(),
        postalCode: z.string().min(1, 'Postal code is required'),
        country: z.string().min(1, 'Country is required'),
      })
      .optional(),
    addressId: z.string().uuid('Invalid address ID format').optional(),
    // Optional metadata
    description: z.string().optional(),
    isExpress: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional()
    ),
    isRegistered: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional()
    ),
    isColorPrint: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional()
    ),
    isDuplexPrint: z.preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean().optional()
    ),
  }),
});

// Schema for letter status update
export const letterStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'NOT_FETCHED']),
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
  }),
}); 