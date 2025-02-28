import fs from 'fs';
import path from 'path';

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
 */
export class ZipValidationService {
  private germanZipCodes: Map<string, ZipCodeEntry> = new Map();
  private austrianZipCodes: Map<string, ZipCodeEntry> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // Initialize the service lazily when first used
  }

  /**
   * Initialize the ZIP code database
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load German ZIP codes
      await this.loadGermanZipCodes();
      
      // Load Austrian ZIP codes
      await this.loadAustrianZipCodes();
      
      this.isInitialized = true;
      console.log('ZIP code validation service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ZIP code validation service:', error);
      // Continue without ZIP validation if data can't be loaded
      this.isInitialized = true;
    }
  }

  /**
   * Load German ZIP codes from data file
   */
  private async loadGermanZipCodes(): Promise<void> {
    try {
      // In a real implementation, this would load from a data file or API
      // For now, we'll add some sample data for testing
      
      // Sample German ZIP codes (just a few for demonstration)
      const sampleGermanZipCodes: ZipCodeEntry[] = [
        { zipCode: '10115', city: 'Berlin', state: 'Berlin', country: 'DE' },
        { zipCode: '10117', city: 'Berlin', state: 'Berlin', country: 'DE' },
        { zipCode: '20095', city: 'Hamburg', state: 'Hamburg', country: 'DE' },
        { zipCode: '50667', city: 'Köln', state: 'Nordrhein-Westfalen', country: 'DE' },
        { zipCode: '60306', city: 'Frankfurt am Main', state: 'Hessen', country: 'DE' },
        { zipCode: '80331', city: 'München', state: 'Bayern', country: 'DE' },
        { zipCode: '70173', city: 'Stuttgart', state: 'Baden-Württemberg', country: 'DE' },
        { zipCode: '04109', city: 'Leipzig', state: 'Sachsen', country: 'DE' },
        { zipCode: '01067', city: 'Dresden', state: 'Sachsen', country: 'DE' },
        { zipCode: '30159', city: 'Hannover', state: 'Niedersachsen', country: 'DE' },
      ];
      
      // Add to map
      for (const entry of sampleGermanZipCodes) {
        this.germanZipCodes.set(entry.zipCode, entry);
      }
      
      console.log(`Loaded ${this.germanZipCodes.size} German ZIP codes`);
    } catch (error) {
      console.error('Error loading German ZIP codes:', error);
      throw error;
    }
  }

  /**
   * Load Austrian ZIP codes from data file
   */
  private async loadAustrianZipCodes(): Promise<void> {
    try {
      // In a real implementation, this would load from a data file or API
      // For now, we'll add some sample data for testing
      
      // Sample Austrian ZIP codes (just a few for demonstration)
      const sampleAustrianZipCodes: ZipCodeEntry[] = [
        { zipCode: '1010', city: 'Wien', state: 'Wien', country: 'AT' },
        { zipCode: '1020', city: 'Wien', state: 'Wien', country: 'AT' },
        { zipCode: '4020', city: 'Linz', state: 'Oberösterreich', country: 'AT' },
        { zipCode: '5020', city: 'Salzburg', state: 'Salzburg', country: 'AT' },
        { zipCode: '6020', city: 'Innsbruck', state: 'Tirol', country: 'AT' },
        { zipCode: '8010', city: 'Graz', state: 'Steiermark', country: 'AT' },
        { zipCode: '9020', city: 'Klagenfurt', state: 'Kärnten', country: 'AT' },
        { zipCode: '3100', city: 'St. Pölten', state: 'Niederösterreich', country: 'AT' },
        { zipCode: '7000', city: 'Eisenstadt', state: 'Burgenland', country: 'AT' },
        { zipCode: '6900', city: 'Bregenz', state: 'Vorarlberg', country: 'AT' },
      ];
      
      // Add to map
      for (const entry of sampleAustrianZipCodes) {
        this.austrianZipCodes.set(entry.zipCode, entry);
      }
      
      console.log(`Loaded ${this.austrianZipCodes.size} Austrian ZIP codes`);
    } catch (error) {
      console.error('Error loading Austrian ZIP codes:', error);
      throw error;
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
    
    // Check the appropriate database
    if (country === 'DE') {
      return this.germanZipCodes.get(cleanZip) || null;
    } else if (country === 'AT') {
      return this.austrianZipCodes.get(cleanZip) || null;
    }
    
    return null;
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
    country?: 'DE' | 'AT';
    mismatch?: boolean;
    originalCity?: string;
  }> {
    // If either ZIP code or city is missing, we can't validate
    if (!zipCode || !city) {
      return { isValid: false, confidenceAdjustment: 0 };
    }
    
    // Get the ZIP code entry
    const zipEntry = await this.validateZipCode(zipCode);
    
    if (!zipEntry) {
      // ZIP code not found in database
      return { isValid: false, confidenceAdjustment: -0.1 };
    }
    
    // Normalize city names for comparison
    const normalizedExtractedCity = this.normalizeCity(city);
    const normalizedExpectedCity = this.normalizeCity(zipEntry.city);
    
    // Compare extracted city with expected city
    if (normalizedExtractedCity === normalizedExpectedCity) {
      // Perfect match
      return { 
        isValid: true, 
        confidenceAdjustment: 0.1,
        country: zipEntry.country
      };
    }
    
    // Check for partial matches or common variations
    if (normalizedExpectedCity.includes(normalizedExtractedCity) || 
        normalizedExtractedCity.includes(normalizedExpectedCity)) {
      // Partial match - flag as a mismatch but still valid
      return { 
        isValid: true, 
        confidenceAdjustment: 0.05,
        suggestedCity: zipEntry.city,
        country: zipEntry.country,
        mismatch: true,
        originalCity: city
      };
    }
    
    // Check for common city name variations (e.g., Frankfurt vs. Frankfurt am Main)
    if (this.checkCityVariations(normalizedExtractedCity, normalizedExpectedCity)) {
      return {
        isValid: true,
        confidenceAdjustment: 0.05,
        suggestedCity: zipEntry.city,
        country: zipEntry.country,
        mismatch: true,
        originalCity: city
      };
    }
    
    // No match - flag as a mismatch and not valid
    return { 
      isValid: false, 
      confidenceAdjustment: -0.2,
      suggestedCity: zipEntry.city,
      country: zipEntry.country,
      mismatch: true,
      originalCity: city
    };
  }

  /**
   * Normalize a city name for comparison
   * @param city The city name to normalize
   * @returns Normalized city name
   */
  private normalizeCity(city: string): string {
    return city
      .toLowerCase()
      .trim()
      // Remove special characters
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace umlauts
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ß/g, 'ss');
  }

  /**
   * Check for common city name variations
   * @param city1 First city name
   * @param city2 Second city name
   * @returns True if the cities are variations of each other
   */
  private checkCityVariations(city1: string, city2: string): boolean {
    // Common variations for German cities
    const variations: Record<string, string[]> = {
      'frankfurt': ['frankfurt am main', 'frankfurt a.m.', 'frankfurt a. m.'],
      'munchen': ['muenchen'],
      'koln': ['cologne', 'koeln'],
      'nurnberg': ['nuernberg', 'nuremberg'],
      'dusseldorf': ['duesseldorf'],
      'wien': ['vienna'],
      'salzburg': ['salzburg city'],
    };
    
    // Check if either city is a known variation of the other
    for (const [base, vars] of Object.entries(variations)) {
      if ((city1 === base && vars.includes(city2)) || 
          (city2 === base && vars.includes(city1))) {
        return true;
      }
    }
    
    return false;
  }
}

// Export a singleton instance
export const zipValidationService = new ZipValidationService(); 