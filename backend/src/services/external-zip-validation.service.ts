import axios from 'axios';
import { prisma } from '../app';
import { zipValidationService } from './zip-validation.service';

// Define interfaces for the OpenPLZ API response
interface OpenPLZPlace {
  plz?: string;
  ort?: string;
  bundesland?: string;
  vorwahl?: string;
  lat?: number;
  lon?: number;
  // For Localities response (both German and Austrian)
  postalCode?: string;
  name?: string;
  municipality?: {
    name: string;
  };
  federalProvince?: {
    name: string;
  };
  district?: {
    name: string;
  };
}

/**
 * Service for validating ZIP codes using external APIs and caching results
 */
export class ExternalZipValidationService {
  private readonly API_BASE_URL = 'https://openplzapi.org';
  
  /**
   * Validate a ZIP code using external API and cache the result
   * @param zipCode The ZIP code to validate
   * @returns Promise with validation result
   */
  public async validateZipCode(zipCode: string): Promise<{
    isValid: boolean;
    city?: string;
    state?: string;
    country?: string;
    confidenceAdjustment: number;
  }> {
    try {
      // First, check if we already have this ZIP code in our internal database
      const countryCode = zipValidationService.getCountryFromZipCode(zipCode);
      if (!countryCode) {
        console.log(`[External ZIP Validation] Unknown ZIP code format: ${zipCode}`);
        return { isValid: false, confidenceAdjustment: -0.2 };
      }
      
      // Check our internal database first
      const internalResult = await this.checkInternalDatabase(zipCode);
      if (internalResult && internalResult.city) {
        console.log(`[External ZIP Validation] ZIP code ${zipCode} found in internal database`);
        return { 
          isValid: true, 
          city: internalResult.city,
          state: internalResult.state || undefined,
          country: countryCode === 'DE' ? 'Germany' : 'Austria',
          confidenceAdjustment: 0.2 
        };
      }
      
      // If not found in internal database, query the external API
      console.log(`[External ZIP Validation] ZIP code ${zipCode} not found in internal database, querying OpenPLZ API`);
      
      try {
        // Determine which API endpoint to use based on the country code
        let url;
        if (countryCode === 'AT') {
          // For Austria, the correct endpoint format is /at/Localities?postalCode=XXXX
          url = `${this.API_BASE_URL}/at/Localities?postalCode=${zipCode}`;
        } else {
          // For Germany, the correct endpoint format is /de/Localities?postalCode=XXXXX
          url = `${this.API_BASE_URL}/de/Localities?postalCode=${zipCode}`;
        }
        
        console.log(`[External ZIP Validation] Querying URL: ${url}`);
        const response = await axios.get<OpenPLZPlace[]>(url);
        
        // If we get a successful response with data, the ZIP code is valid
        if (response.data && response.data.length > 0) {
          const place = response.data[0];
          
          // Handle response format (same for both DE and AT in Localities endpoint)
          const city = place.name || '';
          const state = place.federalProvince?.name || place.district?.name || '';
          
          // Cache this result in our internal database
          await this.cacheZipCodeResult(zipCode, city, state, countryCode, 'openplz');
          
          return {
            isValid: true,
            city,
            state,
            country: countryCode === 'DE' ? 'Germany' : 'Austria',
            confidenceAdjustment: 0.2
          };
        }
        
        // If we get here, the ZIP code is not valid
        console.log(`[External ZIP Validation] No results found for ZIP code ${zipCode}`);
        return { isValid: false, confidenceAdjustment: -0.2 };
      } catch (error: any) {
        // If we get a 404, it means the ZIP code doesn't exist in their database
        if (error.response && error.response.status === 404) {
          console.log(`[External ZIP Validation] ZIP code ${zipCode} not found in OpenPLZ API (404)`);
          return { isValid: false, confidenceAdjustment: -0.2 };
        }
        
        // For other errors, log and return a neutral result
        console.error(`[External ZIP Validation] API error for ${zipCode}:`, error.message);
        return { isValid: false, confidenceAdjustment: -0.1 };
      }
    } catch (error) {
      console.error(`[External ZIP Validation] Error validating ZIP code ${zipCode}:`, error);
      
      // If the API call fails, we'll assume the ZIP code might be valid
      // but we couldn't verify it, so we return a neutral result
      return { isValid: false, confidenceAdjustment: -0.1 };
    }
  }
  
  /**
   * Validate if a ZIP code matches a city
   * @param zipCode The ZIP code to validate
   * @param city The city to match against
   * @returns Promise with validation result
   */
  public async validateZipCodeCity(zipCode: string, city: string): Promise<{
    isValid: boolean;
    suggestedCity?: string;
    confidenceAdjustment: number;
    country?: string;
    mismatch?: boolean;  // New flag to indicate a mismatch between ZIP and city
    originalCity?: string; // Keep track of the original city
  }> {
    try {
      // Normalize the city name for better matching
      const normalizedCity = this.normalizeCity(city);
      
      // First, validate the ZIP code
      const validationResult = await this.validateZipCode(zipCode);
      
      // If the ZIP code is not valid, return the result
      if (!validationResult.isValid) {
        return {
          isValid: false,
          confidenceAdjustment: validationResult.confidenceAdjustment,
          country: validationResult.country,
          // Always include the original city
          originalCity: city,
          // Set mismatch to true since we couldn't validate
          mismatch: true
        };
      }
      
      // If we have a city from the validation, compare it with the provided city
      if (validationResult.city) {
        const normalizedValidCity = this.normalizeCity(validationResult.city);
        
        // Check if the cities match
        if (normalizedCity === normalizedValidCity) {
          // Perfect match
          return {
            isValid: true,
            confidenceAdjustment: 0.2,
            country: validationResult.country,
            suggestedCity: validationResult.city, // Include suggested city even for perfect matches
            originalCity: city,
            mismatch: false
          };
        } else if (normalizedCity.includes(normalizedValidCity) || normalizedValidCity.includes(normalizedCity)) {
          // Partial match - flag as a mismatch but still valid
          return {
            isValid: true,
            suggestedCity: validationResult.city,
            originalCity: city,
            mismatch: true,
            confidenceAdjustment: 0.1,
            country: validationResult.country
          };
        } else {
          // No match - flag as a mismatch and not valid
          return {
            isValid: false,
            suggestedCity: validationResult.city,
            originalCity: city,
            mismatch: true,
            confidenceAdjustment: -0.1,
            country: validationResult.country
          };
        }
      }
      
      // If we don't have a city from the API, we can't validate
      return { 
        isValid: false, 
        confidenceAdjustment: -0.1,
        country: validationResult.country,
        originalCity: city,
        mismatch: true
      };
    } catch (error) {
      console.error(`[External ZIP Validation] Error validating ZIP code ${zipCode} and city ${city}:`, error);
      return { 
        isValid: false, 
        confidenceAdjustment: -0.1,
        originalCity: city,
        mismatch: true
      };
    }
  }
  
  /**
   * Check if a ZIP code exists in our internal database
   * @param zipCode The ZIP code to check
   * @returns The ZIP code entry if found, null otherwise
   */
  private async checkInternalDatabase(zipCode: string): Promise<{
    zipCode: string;
    city: string;
    state: string | null;
    country: string;
  } | null> {
    try {
      const entry = await prisma.zipCode.findUnique({
        where: { zipCode }
      });
      
      if (entry) {
        return {
          zipCode: entry.zipCode,
          city: entry.city,
          state: entry.state,
          country: entry.country
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[External ZIP Validation] Error checking internal database for ZIP code ${zipCode}:`, error);
      return null;
    }
  }
  
  /**
   * Cache a ZIP code validation result in our internal database
   * @param zipCode The ZIP code
   * @param city The city
   * @param state The state
   * @param countryCode The country code (DE or AT)
   * @param source The source of the data (e.g., 'openplz')
   */
  private async cacheZipCodeResult(
    zipCode: string, 
    city: string, 
    state: string | null, 
    countryCode: string,
    source: string = 'openplz'
  ): Promise<void> {
    try {
      // Check if we already have this ZIP code in our database
      const existingEntry = await prisma.zipCode.findUnique({
        where: { zipCode }
      });
      
      if (existingEntry) {
        // Update existing entry
        await prisma.zipCode.update({
          where: { zipCode },
          data: {
            city,
            state,
            country: countryCode,
            source,
            lastUpdated: new Date()
          }
        });
        
        console.log(`[External ZIP Validation] Updated ZIP code ${zipCode} in database`);
      } else {
        // Create new entry
        await prisma.zipCode.create({
          data: {
            zipCode,
            city,
            state,
            country: countryCode,
            source,
            lastUpdated: new Date()
          }
        });
        
        console.log(`[External ZIP Validation] Added ZIP code ${zipCode} to database`);
      }
    } catch (error) {
      console.error(`[External ZIP Validation] Error caching ZIP code ${zipCode}:`, error);
    }
  }
  
  /**
   * Normalize a city name for better matching
   * @param city The city name to normalize
   * @returns Normalized city name
   */
  private normalizeCity(city: string): string {
    return city
      .toLowerCase()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[äÄ]/g, 'a') // Replace umlauts
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[ß]/g, 'ss');
  }
}

// Export a singleton instance
export const externalZipValidationService = new ExternalZipValidationService(); 