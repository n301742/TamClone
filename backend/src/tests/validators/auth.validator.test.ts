import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  passwordResetRequestSchema, 
  passwordResetSchema 
} from '../../validators/auth.validator';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration request', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          mobileNumber: '+1234567890',
        },
      };
      
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should validate when optional fields are missing', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };
      
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        },
      };
      
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'email']);
      }
    });
    
    it('should reject weak password', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        },
      };
      
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'password']);
      }
    });
    
    it('should reject invalid mobile number', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          mobileNumber: 'not-a-number',
        },
      };
      
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'mobileNumber']);
      }
    });
  });
  
  describe('loginSchema', () => {
    it('should validate a valid login request', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      };
      
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject missing email', () => {
      const invalidData = {
        body: {
          password: 'Password123!',
        },
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'email']);
      }
    });
    
    it('should reject missing password', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
        },
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'password']);
      }
    });
  });
  
  describe('refreshTokenSchema', () => {
    it('should validate a valid refresh token request', () => {
      const validData = {
        body: {
          refreshToken: 'valid-refresh-token',
        },
      };
      
      const result = refreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject missing refresh token', () => {
      const invalidData = {
        body: {},
      };
      
      const result = refreshTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'refreshToken']);
      }
    });
  });
  
  describe('passwordResetRequestSchema', () => {
    it('should validate a valid password reset request', () => {
      const validData = {
        body: {
          email: 'test@example.com',
        },
      };
      
      const result = passwordResetRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'invalid-email',
        },
      };
      
      const result = passwordResetRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'email']);
      }
    });
  });
  
  describe('passwordResetSchema', () => {
    it('should validate a valid password reset', () => {
      const validData = {
        body: {
          token: 'valid-token',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      };
      
      const result = passwordResetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject when passwords do not match', () => {
      const invalidData = {
        body: {
          token: 'valid-token',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        },
      };
      
      const result = passwordResetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });
    
    it('should reject weak password', () => {
      const invalidData = {
        body: {
          token: 'valid-token',
          password: 'weak',
          confirmPassword: 'weak',
        },
      };
      
      const result = passwordResetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['body', 'password']);
      }
    });
  });
}); 