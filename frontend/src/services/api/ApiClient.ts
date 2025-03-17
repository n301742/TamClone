import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Base API client for making HTTP requests to our backend
 * Handles common functionality like authentication, error handling, and request/response interceptors
 */
class ApiClient {
  private axiosInstance: AxiosInstance;
  private isDevelopment: boolean;
  private useMockApi: boolean;
  
  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Important for handling cookies/authentication
    });

    // Check if we're in development mode and if mock API is enabled
    this.isDevelopment = import.meta.env.DEV;
    this.useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';
    
    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors for handling auth tokens and errors
   */
  private setupInterceptors(): void {
    // Request interceptor for adding auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Only use mock authentication if both in development mode AND mock API is enabled
        if (this.isDevelopment && this.useMockApi && !localStorage.getItem('accessToken')) {
          console.log('🔐 DEV MODE (MOCK API): Using mock authentication token for API request');
          // Set a mock token specifically for development testing
          config.headers.Authorization = 'Bearer dev-mock-token-for-testing';
          return config;
        }
        
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling errors and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // Only use mock responses if both in development mode AND mock API is enabled
        if (this.isDevelopment && this.useMockApi && error.response?.status === 401) {
          console.warn('🔓 DEV MODE (MOCK API): Intercepting 401 Unauthorized and mocking a response');
          
          // Check if this is a file upload request
          if (originalRequest.url?.includes('/api/letters') && originalRequest.method === 'post') {
            // Create a mock response for PDF upload
            const mockResponse = {
              id: 'dev-mock-letter-id',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              description: originalRequest.data?.get('description') || 'Test Document',
              status: 'processed',
              addressExtraction: {
                confidence: 0.85,
                rawText: "John Doe\n123 Main Street\n10115 Berlin\nGermany",
                zipCodeValidation: {
                  attempted: true,
                  countryDetected: "Germany",
                  zipCodeFormat: "#####",
                  cityProvided: true,
                  matchFound: true,
                  originalCity: "Berlin",
                  suggestedCity: null
                },
                streetValidation: {
                  attempted: true,
                  streetProvided: true,
                  matchFound: true,
                  originalStreet: "Main Street",
                  suggestedStreet: null
                }
              }
            };
            
            console.log('📄 DEV MODE (MOCK API): Returning mock PDF upload response:', mockResponse);
            
            // Return the mock response in the format axios expects
            return Promise.resolve({ 
              data: mockResponse,
              status: 200,
              statusText: 'OK',
              headers: {},
              config: originalRequest,
            });
          }
          
          // For other API requests, return a generic success response
          const genericResponse = { status: 'success', message: 'DEV MODE (MOCK API): Response mocked for testing' };
          console.log('🔄 DEV MODE (MOCK API): Returning generic mock response:', genericResponse);
          
          return Promise.resolve({
            data: genericResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest,
          });
        }
        
        // Handle 401 Unauthorized errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${this.axiosInstance.defaults.baseURL}/api/auth/refresh`, {
                refreshToken,
              });
              
              const { accessToken, refreshToken: newRefreshToken } = response.data;
              
              // Update tokens in localStorage
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              
              // Retry the original request with the new token
              this.axiosInstance.defaults.headers.Authorization = `Bearer ${accessToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // If refresh token is invalid or expired, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   * @param url - The URL to make the request to
   * @param config - Optional Axios request config
   * @returns A promise with the response data
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   * @param url - The URL to make the request to
   * @param data - The data to send in the request body
   * @param config - Optional Axios request config
   * @returns A promise with the response data
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   * @param url - The URL to make the request to
   * @param data - The data to send in the request body
   * @param config - Optional Axios request config
   * @returns A promise with the response data
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   * @param url - The URL to make the request to
   * @param data - The data to send in the request body
   * @param config - Optional Axios request config
   * @returns A promise with the response data
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   * @param url - The URL to make the request to
   * @param config - Optional Axios request config
   * @returns A promise with the response data
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
    return response.data;
  }

  /**
   * Upload a file
   * @param url - The URL to upload the file to
   * @param formData - FormData containing the file and any additional data
   * @param onUploadProgress - Optional callback for tracking upload progress
   * @returns A promise with the response data
   */
  public async uploadFile<T = any>(
    url: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  }

  /**
   * Check if the backend API is available
   * @returns A promise resolving to true if available, false otherwise
   */
  public async isAvailable(): Promise<boolean> {
    try {
      // Use GET instead of HEAD request since we've added a proper health check endpoint
      await this.axiosInstance.get('/');
      return true;
    } catch (error) {
      console.warn('Backend API is not available:', JSON.stringify(error));
      return false;
    }
  }
}

// Create and export a singleton instance with the API base URL
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const apiClient = new ApiClient(apiBaseUrl);

export default apiClient; 