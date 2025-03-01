import { prisma } from '../app';

/**
 * Interface for ZIP code database entry
 */
interface ZipCodeEntry {
  zipCode: string;
  city: string;
  state?: string;
  country: 'DE' | 'AT'; // DE for Germany, AT for Austria
}

/**
 * Service for validating ZIP codes and matching them to cities
 * Uses the database for validation instead of in-memory sample data
 */
export class ZipValidationService {
  private isInitialized: boolean = false;

  constructor() {
    // Initialize the service lazily when first used
  }

  /**
   * Initialize the ZIP code validation service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if we have any ZIP codes in the database
      const count = await prisma.zipCode.count();
      console.log(`ZIP code validation service initialized with ${count} entries in database`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ZIP code validation service:', error);
      // Continue without ZIP validation if database can't be accessed
      this.isInitialized = true;
    }
  }

  /**
   * Determine the country based on ZIP code format
   * @param zipCode The ZIP code to check
   * @returns The country code ('DE' for Germany, 'AT' for Austria, null if unknown)
   */
  public getCountryFromZipCode(zipCode: string): 'DE' | 'AT' | null {
    // Clean the ZIP code (remove spaces, etc.)
    const cleanZip = zipCode.trim().replace(/\s+/g, '');
    
    // German ZIP codes have 5 digits
    if (/^\d{5}$/.test(cleanZip)) {
      return 'DE';
    }
    
    // Austrian ZIP codes have 4 digits
    if (/^\d{4}$/.test(cleanZip)) {
      return 'AT';
    }
    
    // Unknown format
    return null;
  }

  /**
   * Validate if a ZIP code exists and get its corresponding city
   * @param zipCode The ZIP code to validate
   * @returns The ZIP code entry if valid, null otherwise
   */
  public async validateZipCode(zipCode: string): Promise<ZipCodeEntry | null> {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Clean the ZIP code (remove spaces, etc.)
    const cleanZip = zipCode.trim().replace(/\s+/g, '');
    
    // Determine the country
    const country = this.getCountryFromZipCode(cleanZip);
    
    if (!country) {
      console.log(`Invalid ZIP code format: ${zipCode}`);
      return null;
    }
    
    try {
      // Query the database for this ZIP code
      const entries = await prisma.zipCode.findMany({
        where: { 
          zipCode: cleanZip,
          country
        },
        take: 1 // Just get the first entry for basic validation
      });
      
      if (entries && entries.length > 0) {
        // Return the first entry as the primary one
        return {
          zipCode: entries[0].zipCode,
          city: entries[0].city,
          state: entries[0].state || undefined,
          country: entries[0].country as 'DE' | 'AT'
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error querying database for ZIP code ${zipCode}:`, error);
      return null;
    }
  }

  /**
   * Validate if a ZIP code matches a city
   * @param zipCode The ZIP code to validate
   * @param city The city to match
   * @returns Validation result with confidence adjustment
   */
  public async validateZipCodeCity(zipCode: string, city: string): Promise<{
    isValid: boolean;
    confidenceAdjustment: number;
    suggestedCity?: string;
    allPossibleCities?: string[];
    country?: 'DE' | 'AT';
    mismatch?: boolean;
    originalCity?: string;
  }> {
    // If either ZIP code or city is missing, we can't validate
    if (!zipCode || !city) {
      return { isValid: false, confidenceAdjustment: 0 };
    }
    
    try {
      // Ensure the service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Clean the ZIP code (remove spaces, etc.)
      const cleanZip = zipCode.trim().replace(/\s+/g, '');
      
      // Determine the country
      const country = this.getCountryFromZipCode(cleanZip);
      
      if (!country) {
        console.log(`Invalid ZIP code format: ${zipCode}`);
        return { isValid: false, confidenceAdjustment: -0.1 };
      }
      
      // Query the database for all cities with this ZIP code
      const entries = await prisma.zipCode.findMany({
        where: { 
          zipCode: cleanZip,
          country
        }
      });
      
      if (!entries || entries.length === 0) {
        // ZIP code not found in database
        return { isValid: false, confidenceAdjustment: -0.1 };
      }
      
      // Get all possible cities for this ZIP code
      const allPossibleCities = entries.map(entry => entry.city);
      
      // Normalize city names for comparison
      const normalizedExtractedCity = this.normalizeCityForComparison(city);
      
      // Check for exact matches
      for (const entry of entries) {
        const normalizedDbCity = this.normalizeCityForComparison(entry.city);
        
        if (normalizedExtractedCity === normalizedDbCity) {
          // Perfect match
          return { 
            isValid: true, 
            confidenceAdjustment: 0.1,
            country,
            suggestedCity: entry.city,
            allPossibleCities
          };
        }
      }
      
      // Check for major city matches (like Wien vs Wien, Josefstadt)
      for (const entry of entries) {
        if (this.isMajorCityMatch(city, entry.city)) {
          // Major city match - consider it valid without penalty
          return { 
            isValid: true, 
            confidenceAdjustment: 0.1, // Same as exact match
            country,
            suggestedCity: entry.city,
            allPossibleCities,
            // Still mark as mismatch for informational purposes, but don't penalize
            mismatch: true,
            originalCity: city
          };
        }
      }
      
      // Check for partial matches
      for (const entry of entries) {
        const normalizedDbCity = this.normalizeCityForComparison(entry.city);
        
        if (normalizedDbCity.includes(normalizedExtractedCity) || 
            normalizedExtractedCity.includes(normalizedDbCity)) {
          // Partial match - flag as a mismatch but still valid
          return { 
            isValid: true, 
            confidenceAdjustment: 0.05,
            suggestedCity: entry.city,
            allPossibleCities,
            country,
            mismatch: true,
            originalCity: city
          };
        }
      }
      
      // Check for city name variations
      for (const entry of entries) {
        const normalizedDbCity = this.normalizeCityForComparison(entry.city);
        
        if (this.checkCityVariations(normalizedExtractedCity, normalizedDbCity)) {
          return {
            isValid: true,
            confidenceAdjustment: 0.05,
            suggestedCity: entry.city,
            allPossibleCities,
            country,
            mismatch: true,
            originalCity: city
          };
        }
      }
      
      // No match - flag as a mismatch and not valid
      return { 
        isValid: false, 
        confidenceAdjustment: -0.2,
        suggestedCity: entries[0].city,
        allPossibleCities,
        country,
        mismatch: true,
        originalCity: city
      };
    } catch (error) {
      console.error(`Error validating ZIP code ${zipCode} and city ${city}:`, error);
      return { 
        isValid: false, 
        confidenceAdjustment: -0.1,
        originalCity: city,
        mismatch: true
      };
    }
  }

  /**
   * Normalize city name for display purposes
   * This preserves the original case but removes special characters
   */
  private normalizeCity(city: string): string {
    return city
      .trim()
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[äÄ]/g, (match) => match === 'ä' ? 'a' : 'A')
      .replace(/[öÖ]/g, (match) => match === 'ö' ? 'o' : 'O')
      .replace(/[üÜ]/g, (match) => match === 'ü' ? 'u' : 'U')
      .replace(/[ß]/g, 'ss');
  }

  /**
   * Normalize city name for comparison purposes
   * This converts to lowercase and removes spaces for case-insensitive comparison
   */
  private normalizeCityForComparison(city: string): string {
    return this.normalizeCity(city).toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Special handling for major cities with districts
   * @param extractedCity The city extracted from the address
   * @param dbCity The city from the database
   * @returns True if the cities should be considered a match
   */
  private isMajorCityMatch(extractedCity: string, dbCity: string): boolean {
    // Handle Vienna/Wien special case
    if (extractedCity.toLowerCase() === 'wien' && dbCity.toLowerCase().startsWith('wien,')) {
      return true;
    }
    
    // Handle other major cities with districts
    const majorCities = ['berlin', 'hamburg', 'munich', 'münchen', 'cologne', 'köln', 'frankfurt'];
    
    for (const city of majorCities) {
      if (extractedCity.toLowerCase() === city && dbCity.toLowerCase().startsWith(city + ',')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if two city names might be variations of each other
   * Uses string similarity and common patterns instead of hard-coded variations
   * @param city1 First city name (normalized)
   * @param city2 Second city name (normalized)
   * @returns True if the cities are likely variations of each other
   */
  private checkCityVariations(city1: string, city2: string): boolean {
    // If either string is empty, they can't be variations
    if (!city1 || !city2) {
      return false;
    }
    
    // Check for exact match after normalization
    if (city1 === city2) {
      return true;
    }
    
    // Check if one is a substring of the other
    if (city1.includes(city2) || city2.includes(city1)) {
      return true;
    }
    
    // Check for common prefixes (e.g., "Frankfurt" vs "Frankfurt am Main")
    // Get the shorter string length for comparison
    const minLength = Math.min(city1.length, city2.length);
    const prefixLength = Math.floor(minLength * 0.7); // Use 70% of the shorter string as prefix
    
    if (prefixLength >= 4) { // Only check if prefix is at least 4 chars
      if (city1.substring(0, prefixLength) === city2.substring(0, prefixLength)) {
        return true;
      }
    }
    
    // Check for common abbreviations and patterns
    const patterns = [
      { full: 'saint', abbr: 'st' },
      { full: 'sankt', abbr: 'st' },
      { full: 'am main', abbr: '' },
      { full: 'an der', abbr: '' },
      { full: 'a.m.', abbr: '' },
      { full: 'a. m.', abbr: '' },
    ];
    
    // Try replacing patterns in both directions
    for (const pattern of patterns) {
      const city1WithPattern = city1.replace(pattern.abbr, pattern.full);
      const city1WithoutPattern = city1.replace(pattern.full, pattern.abbr);
      const city2WithPattern = city2.replace(pattern.abbr, pattern.full);
      const city2WithoutPattern = city2.replace(pattern.full, pattern.abbr);
      
      if (city1WithPattern === city2 || city1 === city2WithPattern ||
          city1WithoutPattern === city2 || city1 === city2WithoutPattern) {
        return true;
      }
    }
    
    // Calculate string similarity (Levenshtein distance)
    const distance = this.levenshteinDistance(city1, city2);
    const maxLength = Math.max(city1.length, city2.length);
    const similarity = 1 - distance / maxLength;
    
    // If similarity is above threshold, consider them variations
    return similarity > 0.8;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * @param a First string
   * @param b Second string
   * @returns The Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
}

// Export a singleton instance
export const zipValidationService = new ZipValidationService(); 