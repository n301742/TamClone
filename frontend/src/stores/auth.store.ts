import { defineStore } from 'pinia';
import authService from '../services/auth.service';
import type { User, LoginCredentials, RegistrationData } from '../types/auth.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  }),
  
  getters: {
    // Get current user
    currentUser: (state) => state.user,
    
    // Check if user has admin role
    isAdmin: (state) => state.user?.role === 'ADMIN',
    
    // Check if authentication process is loading
    loading: (state) => state.isLoading,
    
    // Get current error message
    errorMessage: (state) => state.error
  },
  
  actions: {
    /**
     * Set loading state
     */
    setLoading(loading: boolean): void {
      this.isLoading = loading;
    },
    
    /**
     * Set error message
     */
    setError(error: string | null): void {
      this.error = error;
    },
    
    /**
     * Clear error message
     */
    clearError(): void {
      this.error = null;
    },
    
    /**
     * Log in user with email and password
     */
    async login(credentials: LoginCredentials): Promise<void> {
      this.setLoading(true);
      this.clearError();
      
      try {
        const response = await authService.login(credentials);
        this.user = response.user;
        this.isAuthenticated = true;
      } catch (error: any) {
        this.isAuthenticated = false;
        this.user = null;
        this.setError(error.response?.data?.message || 'Login failed. Please try again.');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    /**
     * Register a new user
     */
    async register(userData: RegistrationData): Promise<void> {
      this.setLoading(true);
      this.clearError();
      
      try {
        const response = await authService.register(userData);
        this.user = response.user;
        this.isAuthenticated = true;
      } catch (error: any) {
        this.isAuthenticated = false;
        this.user = null;
        this.setError(error.response?.data?.message || 'Registration failed. Please try again.');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    /**
     * Initialize Google OAuth login
     */
    loginWithGoogle(): void {
      this.setLoading(true);
      this.clearError();
      authService.initiateGoogleAuth();
    },
    
    /**
     * Log out current user
     */
    async logout(): Promise<void> {
      this.setLoading(true);
      
      try {
        await authService.logout();
      } finally {
        // Clear user data and auth state
        this.user = null;
        this.isAuthenticated = false;
        this.setLoading(false);
        
        // Clear tokens from localStorage
        localStorage.removeItem('access_token');
      }
    },
    
    /**
     * Get current user profile
     */
    async fetchCurrentUser(): Promise<void> {
      this.setLoading(true);
      this.clearError();
      
      try {
        const user = await authService.getCurrentUser();
        this.user = user;
        this.isAuthenticated = true;
      } catch (error) {
        this.user = null;
        this.isAuthenticated = false;
      } finally {
        this.setLoading(false);
      }
    },
    
    /**
     * Check authentication status
     */
    async checkAuth(): Promise<boolean> {
      // If we already checked and we're authenticated, return true
      if (this.isAuthenticated && this.user) {
        return true;
      }

      // Check if we have a token
      const token = localStorage.getItem('access_token');
      if (!token) {
        return false;
      }

      try {
        this.setLoading(true);
        await this.fetchCurrentUser();
        return this.isAuthenticated;
      } catch (error) {
        // Only set error for non-401 responses
        if ((error as any)?.response?.status !== 401) {
          this.setError('Authentication check failed');
          console.error('Auth check error:', error);
        }
        return false;
      } finally {
        this.setLoading(false);
      }
    }
  }
}); 