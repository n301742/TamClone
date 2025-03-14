import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../services/api';
import apiClient from '../services/api/ApiClient';

/**
 * Authentication store for managing user authentication state
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const apiConnected = ref<boolean | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!user.value || authService.isAuthenticated());
  const userFullName = computed(() => {
    if (!user.value) return '';
    return `${user.value.firstName} ${user.value.lastName}`;
  });

  // Actions
  /**
   * Initialize the auth store by checking if user is logged in
   * and verifying API connectivity
   */
  async function initialize() {
    loading.value = true;
    
    try {
      // Check if API is reachable
      apiConnected.value = await checkApiConnectivity();
      
      if (apiConnected.value && authService.isAuthenticated() && !user.value) {
        await fetchCurrentUser();
      }
    } catch (err) {
      console.error('Failed to initialize auth store:', err);
      apiConnected.value = false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Check if the backend API is available
   */
  async function checkApiConnectivity(): Promise<boolean> {
    try {
      await apiClient.isAvailable();
      console.log('✅ API is connected and reachable');
      return true;
    } catch (err) {
      console.warn('⚠️ API is not reachable:', err);
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async function login(credentials: LoginRequest) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await authService.login(credentials);
      user.value = response.user;
      apiConnected.value = true;
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      error.value = errorMessage;
      console.error('Login error:', errorMessage);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Register a new user
   */
  async function register(userData: RegisterRequest) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await authService.register(userData);
      user.value = response.user;
      return response;
    } catch (err: any) {
      error.value = err.message || 'Registration failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch current user profile
   */
  async function fetchCurrentUser() {
    loading.value = true;
    error.value = null;
    
    try {
      if (!authService.isAuthenticated()) {
        user.value = null;
        return null;
      }
      
      user.value = await authService.getCurrentUser();
      return user.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user profile';
      user.value = null;
      
      // If unauthorized, clear tokens
      if (err.response?.status === 401) {
        await logout();
      }
      
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logout the current user
   */
  async function logout() {
    loading.value = true;
    error.value = null;
    
    try {
      await authService.logout();
    } catch (err: any) {
      error.value = err.message || 'Logout failed';
    } finally {
      user.value = null;
      loading.value = false;
    }
  }

  return {
    // State
    user,
    loading,
    error,
    apiConnected,
    
    // Getters
    isAuthenticated,
    userFullName,
    
    // Actions
    initialize,
    checkApiConnectivity,
    login,
    register,
    fetchCurrentUser,
    logout
  };
}); 