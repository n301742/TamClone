import { createLetterSchema, updateLetterSchema, letterStatusSchema } from '../../validators/letter.validator';

describe('Letter Validators', () => {
  describe('createLetterSchema', () => {
    it('should validate a valid letter creation request', () => {
      const validData = {
        body: {
          recipient: {
            name: 'John Doe',
            street: '123 Main St',
            city: 'New York',
            postalCode: '10001',
            country: 'USA',
          },
          description: 'Test letter',
          isExpress: true,
          isRegistered: true,
          isColorPrint: false,
          isDuplexPrint: true,
        },
      };

      const result = createLetterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate when optional fields are missing', () => {
      const validData = {
        body: {
          recipient: {
            name: 'John Doe',
            street: '123 Main St',
            city: 'New York',
            postalCode: '10001',
            country: 'USA',
          },
        },
      };

      const result = createLetterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing recipient name', () => {
      const invalidData = {
        body: {
          recipient: {
            street: '123 Main St',
            city: 'New York',
            postalCode: '10001',
            country: 'USA',
          },
        },
      };

      const result = createLetterSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'recipient', 'name']);
      }
    });

    it('should reject missing required recipient fields', () => {
      const invalidData = {
        body: {
          recipient: {
            name: 'John Doe',
          },
        },
      };

      const result = createLetterSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Check that we have errors for missing street, city, postalCode, and country
        const paths = result.error.issues.map(issue => issue.path);
        expect(paths).toContainEqual(['body', 'recipient', 'street']);
        expect(paths).toContainEqual(['body', 'recipient', 'city']);
        expect(paths).toContainEqual(['body', 'recipient', 'postalCode']);
        expect(paths).toContainEqual(['body', 'recipient', 'country']);
      }
    });
  });

  describe('updateLetterSchema', () => {
    it('should validate a valid letter update request', () => {
      const validData = {
        body: {
          recipient: {
            name: 'John Doe',
            street: '123 Main St',
            city: 'New York',
            postalCode: '10001',
            country: 'USA',
          },
          description: 'Updated test letter',
          isExpress: false,
        },
      };

      const result = updateLetterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate when only updating some fields', () => {
      const validData = {
        body: {
          description: 'Updated description only',
        },
      };

      const result = updateLetterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid recipient data when provided', () => {
      const invalidData = {
        body: {
          recipient: {
            name: 'John Doe',
            // Missing required fields
          },
        },
      };

      const result = updateLetterSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Check that we have errors for missing street, city, postalCode, and country
        const paths = result.error.issues.map(issue => issue.path);
        expect(paths).toContainEqual(['body', 'recipient', 'street']);
        expect(paths).toContainEqual(['body', 'recipient', 'city']);
        expect(paths).toContainEqual(['body', 'recipient', 'postalCode']);
        expect(paths).toContainEqual(['body', 'recipient', 'country']);
      }
    });
  });

  describe('letterStatusSchema', () => {
    it('should validate a valid status update', () => {
      const validData = {
        body: {
          status: 'DELIVERED',
          message: 'Letter was delivered successfully',
          timestamp: '2023-05-01T12:00:00Z',
        },
      };

      const result = letterStatusSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const validData = {
        body: {
          status: 'PROCESSING',
        },
      };

      const result = letterStatusSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status value', () => {
      const invalidData = {
        body: {
          status: 'INVALID_STATUS',
        },
      };

      const result = letterStatusSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'status']);
      }
    });

    it('should reject invalid timestamp format', () => {
      const invalidData = {
        body: {
          status: 'DELIVERED',
          timestamp: 'not-a-date',
        },
      };

      const result = letterStatusSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'timestamp']);
      }
    });
  });
}); 