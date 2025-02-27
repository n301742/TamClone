import { updateUserSchema, updatePreferencesSchema, updateBillingSchema } from '../../validators/user.validator';

describe('User Validators', () => {
  describe('updateUserSchema', () => {
    it('should validate a valid user update request', () => {
      const validData = {
        body: {
          firstName: 'John',
          lastName: 'Doe',
          mobileNumber: '+1234567890',
          email: 'john.doe@example.com',
          profilePicture: 'https://example.com/profile.jpg',
        },
      };

      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate when only updating some fields', () => {
      const validData = {
        body: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid first name', () => {
      const invalidData = {
        body: {
          firstName: 'J', // Too short
        },
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'firstName']);
      }
    });

    it('should reject invalid last name', () => {
      const invalidData = {
        body: {
          lastName: 'D', // Too short
        },
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'lastName']);
      }
    });

    it('should reject invalid mobile number', () => {
      const invalidData = {
        body: {
          mobileNumber: 'not-a-number',
        },
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'mobileNumber']);
      }
    });

    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'not-an-email',
        },
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'email']);
      }
    });

    it('should reject invalid profile picture URL', () => {
      const invalidData = {
        body: {
          profilePicture: 'not-a-url',
        },
      };

      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'profilePicture']);
      }
    });
  });

  describe('updatePreferencesSchema', () => {
    it('should validate a valid preferences update', () => {
      const validData = {
        body: {
          darkMode: true,
          documentRetentionDays: 30,
          notificationPreferences: {
            email: true,
            push: false,
            sms: true,
          },
        },
      };

      const result = updatePreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate when only updating some preferences', () => {
      const validData = {
        body: {
          darkMode: false,
        },
      };

      const result = updatePreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid document retention days', () => {
      const invalidData = {
        body: {
          documentRetentionDays: 0, // Too low
        },
      };

      const result = updatePreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'documentRetentionDays']);
      }
    });

    it('should reject non-integer document retention days', () => {
      const invalidData = {
        body: {
          documentRetentionDays: 10.5, // Not an integer
        },
      };

      const result = updatePreferencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'documentRetentionDays']);
      }
    });
  });

  describe('updateBillingSchema', () => {
    it('should validate a valid billing update', () => {
      const validData = {
        body: {
          paymentMethod: 'credit_card',
          billingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
          },
        },
      };

      const result = updateBillingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate when only updating payment method', () => {
      const validData = {
        body: {
          paymentMethod: 'paypal',
        },
      };

      const result = updateBillingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject incomplete billing address', () => {
      const invalidData = {
        body: {
          billingAddress: {
            street: '123 Main St',
            // Missing other required fields
          },
        },
      };

      const result = updateBillingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Check that we have errors for missing city, state, postalCode, and country
        const paths = result.error.issues.map(issue => issue.path);
        expect(paths).toContainEqual(['body', 'billingAddress', 'city']);
        expect(paths).toContainEqual(['body', 'billingAddress', 'state']);
        expect(paths).toContainEqual(['body', 'billingAddress', 'postalCode']);
        expect(paths).toContainEqual(['body', 'billingAddress', 'country']);
      }
    });
  });
}); 