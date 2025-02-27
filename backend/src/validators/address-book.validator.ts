import { z } from 'zod';

// Schema for creating a new address
export const createAddressSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Recipient name is required'),
    address: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
    isDefault: z.boolean().optional().default(false),
  }),
});

// Schema for updating an address
export const updateAddressSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Recipient name is required').optional(),
    address: z.string().min(1, 'Street address is required').optional(),
    city: z.string().min(1, 'City is required').optional(),
    state: z.string().optional(),
    postalCode: z.string().min(1, 'Postal code is required').optional(),
    country: z.string().min(1, 'Country is required').optional(),
    isDefault: z.boolean().optional(),
  }),
});

// Schema for setting an address as default
export const setDefaultAddressSchema = z.object({
  body: z.object({
    isDefault: z.literal(true),
  }),
}); 