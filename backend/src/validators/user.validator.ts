import { z } from 'zod';

// Schema for updating user profile
export const updateUserSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .optional(),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .optional(),
    mobileNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\+?[0-9]{10,15}$/.test(val),
        'Mobile number must be a valid phone number'
      ),
    email: z
      .string()
      .email('Invalid email address')
      .min(5, 'Email must be at least 5 characters')
      .max(100, 'Email must be less than 100 characters')
      .optional(),
    profilePicture: z.string().url('Profile picture must be a valid URL').optional(),
  }),
});

// Schema for updating user preferences
export const updatePreferencesSchema = z.object({
  body: z.object({
    darkMode: z.boolean().optional(),
    documentRetentionDays: z
      .number()
      .int('Document retention days must be an integer')
      .min(1, 'Document retention days must be at least 1')
      .max(365, 'Document retention days must be less than 365')
      .optional(),
    notificationPreferences: z
      .object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
      })
      .optional(),
  }),
});

// Schema for updating billing information
export const updateBillingSchema = z.object({
  body: z.object({
    paymentMethod: z.string().optional(),
    billingAddress: z
      .object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        postalCode: z.string().min(1, 'Postal code is required'),
        country: z.string().min(1, 'Country is required'),
      })
      .optional(),
  }),
}); 