import axios from 'axios';
// Use type declarations instead of direct imports for axios types
type AxiosInstance = any;
type AxiosRequestConfig = any;
type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
};

// Create a base API instance with common configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api', // Backend API URL
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true // Important for handling cookies (JWT tokens)
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        await refreshToken();
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh token fails, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Function to refresh the token
async function refreshToken(): Promise<void> {
  try {
    const response = await apiClient.post('/auth/refresh');
    const newToken = response.data.accessToken;
    
    if (newToken) {
      localStorage.setItem('access_token', newToken);
    }
  } catch (error) {
    localStorage.removeItem('access_token');
    throw error;
  }
}

// Generic API request method
export async function apiRequest<T>(
  method: string, 
  url: string, 
  data?: any, 
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient({
      method,
      url,
      data,
      ...config
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Export the API client
export default apiClient; 