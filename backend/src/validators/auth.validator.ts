import { z } from 'zod';

// Schema for user registration
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .min(5, 'Email must be at least 5 characters')
      .max(100, 'Email must be less than 100 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters'),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters'),
    mobileNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\+?[0-9]{10,15}$/.test(val),
        'Mobile number must be a valid phone number'
      ),
  }),
});

// Schema for user login
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Schema for token refresh
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// Schema for password reset request
export const passwordResetRequestSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

// Schema for password reset
export const passwordResetSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
}); 