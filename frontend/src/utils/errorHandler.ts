import { AxiosError } from 'axios';
import type { ApiError } from '../services/api/types';
import type { ToastServiceMethods } from 'primevue/toastservice';

/**
 * Standardized function to handle API errors
 * Extracts error messages from the API response and displays them using toast
 * 
 * @param error - The error thrown by axios
 * @param toast - PrimeVue toast service instance
 * @param defaultMessage - Fallback message if API error has no details
 * @returns The error for further processing if needed
 */
export function handleApiError(
  error: any, 
  toast: ToastServiceMethods,
  defaultMessage: string = 'An error occurred. Please try again.'
): Error {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage;
  
  if (error instanceof AxiosError && error.response) {
    const { data, status } = error.response;
    
    // Handle specific error cases based on status code
    if (status === 401) {
      errorMessage = 'Your session has expired. Please log in again.';
    } else if (status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (status === 422) {
      errorMessage = 'The data you provided is invalid.';
    } else if (status >= 500) {
      errorMessage = 'A server error occurred. Please try again later.';
    }
    
    // Use API error message if available
    if (data && typeof data === 'object') {
      const apiError = data as ApiError;
      if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      // Handle validation errors
      if (apiError.errors) {
        const validationErrors = Object.values(apiError.errors)
          .flat()
          .join(' ');
        
        if (validationErrors) {
          errorMessage = validationErrors;
        }
      }
    }
  }
  
  // Show toast notification
  toast.add({
    severity: 'error',
    summary: 'Error',
    detail: errorMessage,
    life: 5000
  });
  
  // Return the error for further processing if needed
  return new Error(errorMessage);
}

/**
 * Handles generic errors (not necessarily API-related)
 * 
 * @param error - Any type of error
 * @param toast - PrimeVue toast service instance
 * @param defaultMessage - Fallback message if error has no details
 */
export function handleGenericError(
  error: any,
  toast: ToastServiceMethods,
  defaultMessage: string = 'An error occurred'
): void {
  console.error('Error:', error);
  
  let errorMessage = defaultMessage;
  
  if (error instanceof Error) {
    errorMessage = error.message || defaultMessage;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  toast.add({
    severity: 'error',
    summary: 'Error',
    detail: errorMessage,
    life: 5000
  });
} 