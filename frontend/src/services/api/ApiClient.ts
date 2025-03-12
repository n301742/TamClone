import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Base API client for making HTTP requests to our backend
 * Handles common functionality like authentication, error handling, and request/response interceptors
 */
class ApiClient {
  private axiosInstance: AxiosInstance;
  
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

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors for handling auth tokens and errors
   */
  private setupInterceptors(): void {
    // Request interceptor for adding auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
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
}

// Create and export a singleton instance with the API base URL
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const apiClient = new ApiClient(apiBaseUrl);

export default apiClient; 