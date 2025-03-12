import apiClient from './ApiClient';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from './types';

/**
 * Authentication service for handling login, registration, and user management
 */
class AuthService {
  /**
   * Endpoint for authentication API
   */
  private endpoint = '/api/auth';

  /**
   * Login with email and password
   * @param credentials - Login credentials
   * @returns Promise with login response containing tokens and user info
   */
  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(`${this.endpoint}/login`, credentials);
    
    // Store tokens in localStorage
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    return response;
  }

  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Promise with login response containing tokens and user info
   */
  public async register(userData: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(`${this.endpoint}/register`, userData);
    
    // Store tokens in localStorage
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    return response;
  }

  /**
   * Get current user profile
   * @returns Promise with user data
   */
  public async getCurrentUser(): Promise<User> {
    return await apiClient.get<User>(`${this.endpoint}/me`);
  }

  /**
   * Refresh access token using refresh token
   * @returns Promise with new tokens
   */
  public async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      `${this.endpoint}/refresh`, 
      { refreshToken }
    );
    
    // Update tokens in localStorage
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    return response;
  }

  /**
   * Logout the current user
   */
  public async logout(): Promise<void> {
    try {
      await apiClient.post(`${this.endpoint}/logout`);
    } finally {
      // Clear tokens from localStorage even if the API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  /**
   * Check if user is authenticated
   * @returns boolean indicating if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService; 