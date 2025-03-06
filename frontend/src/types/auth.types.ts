// Interface for login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Interface for user registration data
export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
}

// Interface for the user data returned by the API
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  profilePicture?: string;
  role: 'USER' | 'ADMIN';
  documentRetentionDays: number;
  darkMode: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface for authentication response
export interface AuthResponse {
  user: User;
  accessToken?: string; // May be absent if using HTTP-only cookies
} 