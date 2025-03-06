import apiClient, { apiRequest } from './api.service';
import type { User, LoginCredentials, RegistrationData, AuthResponse } from '../types/auth.types';

// Re-export types for backward compatibility
export type { User, LoginCredentials, RegistrationData, AuthResponse };

/**
 * Authentication service for handling user login, registration, and session management
 */
const authService = {
  /**
   * Log in a user with email and password
   * @param credentials - User login credentials
   * @returns Promise with user data
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('post', '/auth/login', credentials);
  },

  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Promise with user data
   */
  async register(userData: RegistrationData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('post', '/auth/register', userData);
  },

  /**
   * Log out the current user
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    return apiRequest<void>('post', '/auth/logout');
  },

  /**
   * Get the current user profile
   * @returns Promise with user data
   */
  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('get', '/users/me');
  },

  /**
   * Initiate Google OAuth authentication
   * This will redirect to Google's OAuth page
   */
  initiateGoogleAuth(): void {
    window.location.href = `${apiClient.defaults.baseURL}/auth/google`;
  },

  /**
   * Check if the user is authenticated
   * @returns Promise that resolves to true if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default authService; 