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
    allCities?: string[]; // New field to return all possible cities
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
      const internalResults = await this.checkInternalDatabase(zipCode);
      if (internalResults && internalResults.length > 0) {
        console.log(`[External ZIP Validation] ZIP code ${zipCode} found in internal database with ${internalResults.length} cities`);
        
        // Get all city names
        const cities = internalResults.map(result => result.city);
        
        // Use the first city as the primary one
        const primaryCity = cities[0];
        const state = internalResults[0].state || undefined;
        
        return { 
          isValid: true, 
          city: primaryCity,
          allCities: cities,
          state: state,
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
          // Process all places returned by the API
          const places = response.data;
          console.log(`[External ZIP Validation] Found ${places.length} localities for ZIP code ${zipCode}`);
          
          // Extract city names and state from all places
          const cities: string[] = [];
          let state = '';
          
          for (const place of places) {
            const cityName = place.name || '';
            if (cityName && !cities.includes(cityName)) {
              cities.push(cityName);
            }
            
            // Use the state from the first place (should be the same for all)
            if (!state && place.federalProvince?.name) {
              state = place.federalProvince.name;
            } else if (!state && place.district?.name) {
              state = place.district.name;
            }
          }
          
          // Cache all cities for this ZIP code
          for (const city of cities) {
            await this.cacheZipCodeResult(zipCode, city, state, countryCode, 'openplz');
          }
          
          // Use the first city as the primary one
          const primaryCity = cities[0];
          
          return {
            isValid: true,
            city: primaryCity,
            allCities: cities,
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
    allPossibleCities?: string[]; // New field to return all possible cities
    confidenceAdjustment: number;
    country?: string;
    mismatch?: boolean;  // Flag to indicate a mismatch between ZIP and city
    originalCity?: string; // Keep track of the original city
  }> {
    try {
      // Normalize the city name for better matching
      const normalizedCity = this.normalizeCity(city);
      
      // First, check if we have this ZIP code in our internal database
      const internalResults = await this.checkInternalDatabase(zipCode);
      const internalCities = internalResults?.map(result => result.city) || [];
      
      // Check if the city matches any of the cities in our internal database
      let internalMatch = false;
      if (internalResults && internalResults.length > 0) {
        const normalizedInternalCities = internalCities.map(c => this.normalizeCity(c));
        const exactMatchIndex = normalizedInternalCities.findIndex(c => c === normalizedCity);
        
        if (exactMatchIndex !== -1) {
          // Found an exact match in our internal database
          console.log(`[External ZIP Validation] ZIP code ${zipCode} with city ${city} is valid (found in internal database)`);
          internalMatch = true;
          return {
            isValid: true,
            confidenceAdjustment: 0.2,
            country: zipCode.length === 4 ? 'Austria' : 'Germany',
            suggestedCity: internalCities[exactMatchIndex],
            allPossibleCities: internalCities,
            originalCity: city,
            mismatch: false
          };
        }
      }
      
      // Always query the external API, even if we have the ZIP code in our database
      // This allows us to discover new valid city combinations
      console.log(`[External ZIP Validation] Checking external API for ZIP code ${zipCode} with city ${city}`);
      
      // Determine country code from ZIP code format
      const countryCode = zipCode.length === 4 ? 'AT' : 'DE';
      
      // Determine which API endpoint to use based on the country code
      let url;
      if (countryCode === 'AT') {
        // For Austria, the correct endpoint format is /at/Localities?postalCode=XXXX
        url = `${this.API_BASE_URL}/at/Localities?postalCode=${zipCode}`;
      } else {
        // For Germany, the correct endpoint format is /de/Localities?postalCode=XXXXX
        url = `${this.API_BASE_URL}/de/Localities?postalCode=${zipCode}`;
      }
      
      try {
        console.log(`[External ZIP Validation] Querying URL: ${url}`);
        const response = await axios.get<OpenPLZPlace[]>(url);
        
        // If we get a successful response with data, the ZIP code is valid
        if (response.data && response.data.length > 0) {
          // Process all places returned by the API
          const places = response.data;
          console.log(`[External ZIP Validation] Found ${places.length} localities for ZIP code ${zipCode}`);
          
          // Extract city names and state from all places
          const apiCities: string[] = [];
          let state = '';
          
          for (const place of places) {
            const cityName = place.name || '';
            if (cityName && !apiCities.includes(cityName)) {
              apiCities.push(cityName);
            }
            
            // Use the state from the first place (should be the same for all)
            if (!state && place.federalProvince?.name) {
              state = place.federalProvince.name;
            } else if (!state && place.district?.name) {
              state = place.district.name;
            }
          }
          
          console.log(`[External ZIP Validation] API returned cities for ${zipCode}: ${apiCities.join(', ')}`);
          
          // Combine with cities from internal database to get a complete list
          const allPossibleCities = [...new Set([...internalCities, ...apiCities])];
          
          // Normalize all possible cities
          const normalizedPossibleCities = allPossibleCities.map(c => this.normalizeCity(c));
          
          // Check if the extracted city exactly matches any of the possible cities
          const exactMatchIndex = normalizedPossibleCities.findIndex(c => c === normalizedCity);
          if (exactMatchIndex !== -1) {
            // Perfect match with one of the possible cities
            const matchedCity = allPossibleCities[exactMatchIndex];
            
            // If this is a new city for this ZIP code, add it to our database
            if (!internalCities.includes(matchedCity)) {
              console.log(`[External ZIP Validation] Adding new city ${matchedCity} for ZIP code ${zipCode} to database`);
              await this.cacheZipCodeResult(
                zipCode, 
                matchedCity, 
                state || null, 
                countryCode,
                'address-extraction'
              );
            }
            
            return {
              isValid: true,
              confidenceAdjustment: 0.2,
              country: countryCode === 'DE' ? 'Germany' : 'Austria',
              suggestedCity: matchedCity,
              allPossibleCities: allPossibleCities,
              originalCity: city,
              mismatch: false
            };
          }
          
          // Check for partial matches with any of the possible cities
          for (let i = 0; i < normalizedPossibleCities.length; i++) {
            const possibleCity = normalizedPossibleCities[i];
            if (normalizedCity.includes(possibleCity) || possibleCity.includes(normalizedCity)) {
              // Partial match with one of the possible cities - flag as a mismatch but still valid
              return {
                isValid: true,
                suggestedCity: allPossibleCities[i],
                allPossibleCities: allPossibleCities,
                originalCity: city,
                mismatch: true,
                confidenceAdjustment: 0.1,
                country: countryCode === 'DE' ? 'Germany' : 'Austria'
              };
            }
          }
          
          // No match with any of the possible cities - flag as a mismatch and not valid
          // But still return all possible cities for the ZIP code
          return {
            isValid: false,
            suggestedCity: allPossibleCities[0], // Suggest the first city as default
            allPossibleCities: allPossibleCities,
            originalCity: city,
            mismatch: true,
            confidenceAdjustment: -0.1,
            country: countryCode === 'DE' ? 'Germany' : 'Austria'
          };
        } else {
          // If the API returns no results, fall back to the internal database results
          if (internalResults && internalResults.length > 0) {
            return {
              isValid: false,
              suggestedCity: internalCities[0],
              allPossibleCities: internalCities,
              originalCity: city,
              mismatch: true,
              confidenceAdjustment: -0.1,
              country: countryCode === 'DE' ? 'Germany' : 'Austria'
            };
          }
          
          // If we get here, the ZIP code is not valid according to the API
          console.log(`[External ZIP Validation] No results found for ZIP code ${zipCode}`);
          return { 
            isValid: false, 
            confidenceAdjustment: -0.2,
            country: countryCode === 'DE' ? 'Germany' : 'Austria',
            originalCity: city,
            mismatch: true
          };
        }
      } catch (error: any) {
        // If we get a 404, it means the ZIP code doesn't exist in their database
        if (error.response && error.response.status === 404) {
          console.log(`[External ZIP Validation] ZIP code ${zipCode} not found in OpenPLZ API (404)`);
          
          // If we have internal results, use those
          if (internalResults && internalResults.length > 0) {
            return {
              isValid: false,
              suggestedCity: internalCities[0],
              allPossibleCities: internalCities,
              originalCity: city,
              mismatch: true,
              confidenceAdjustment: -0.1,
              country: countryCode === 'DE' ? 'Germany' : 'Austria'
            };
          }
          
          return { 
            isValid: false, 
            confidenceAdjustment: -0.2,
            country: countryCode === 'DE' ? 'Germany' : 'Austria',
            originalCity: city,
            mismatch: true
          };
        }
        
        // For other errors, log and return a neutral result
        console.error(`[External ZIP Validation] API error for ${zipCode}:`, error.message);
        
        // If we have internal results, use those
        if (internalResults && internalResults.length > 0) {
          return {
            isValid: false,
            suggestedCity: internalCities[0],
            allPossibleCities: internalCities,
            originalCity: city,
            mismatch: true,
            confidenceAdjustment: -0.1,
            country: countryCode === 'DE' ? 'Germany' : 'Austria'
          };
        }
        
        return { 
          isValid: false, 
          confidenceAdjustment: -0.1,
          country: countryCode === 'DE' ? 'Germany' : 'Austria',
          originalCity: city,
          mismatch: true
        };
      }
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
   * @returns Array of ZIP code entries if found, empty array otherwise
   */
  private async checkInternalDatabase(zipCode: string): Promise<{
    zipCode: string;
    city: string;
    state: string | null;
    country: string;
  }[] | null> {
    try {
      // Use type assertion to avoid TypeScript error
      const entries = await (prisma as any).zipCode.findMany({
        where: { zipCode }
      });
      
      if (entries && entries.length > 0) {
        return entries.map((entry: any) => ({
          zipCode: entry.zipCode,
          city: entry.city,
          state: entry.state,
          country: entry.country
        }));
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
      // Use type assertion to avoid TypeScript error
      const existingEntry = await (prisma as any).zipCode.findUnique({
        where: { zipCode }
      });
      
      if (existingEntry) {
        // Update existing entry
        await (prisma as any).zipCode.update({
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
        await (prisma as any).zipCode.create({
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