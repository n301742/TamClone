import apiClient from './ApiClient';

/**
 * Service for parsing names using the backend name parser
 */
export default {
  /**
   * Parse a full name into components using the backend service
   * @param fullName The full name to parse
   * @returns The parsed name components
   */
  async parseName(fullName: string): Promise<{
    firstName: string;
    lastName: string;
    academicTitle: string;
    confidence: number;
    issues: string[];
  }> {
    try {
      const response = await apiClient.post('/api/utils/parse-name', { name: fullName });
      
      // Handle multiple possible response structures
      // The response could either be the data directly, or it could be in response.data
      const responseData = response.data || response;
      
      // Validate that we have a proper response with required fields
      if (!responseData || typeof responseData !== 'object') {
        throw new Error('Invalid response from server');
      }
      
      // Map backend response format to frontend format (firstName, lastName, academicTitle)
      const result = {
        firstName: responseData.firstName || '',
        lastName: responseData.lastName || '',
        academicTitle: responseData.academicTitle || '',
        confidence: responseData.confidence || 0,
        issues: Array.isArray(responseData.issues) ? responseData.issues : []
      };
      
      return result;
    } catch (error) {
      console.error('Error parsing name:', error);
      // Return a fallback object with empty values
      return {
        firstName: '',
        lastName: '',
        academicTitle: '',
        confidence: 0,
        issues: ['Error parsing name']
      };
    }
  }
}; 