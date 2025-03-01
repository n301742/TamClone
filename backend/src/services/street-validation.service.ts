import axios from 'axios';
import { prisma } from '../app';
import { PrismaClient } from '@prisma/client';

// Define interfaces for the OpenPLZ API response
interface OpenPLZStreet {
  name?: string;
  postalCode?: string;
  locality?: string;
  district?: string;
  federalProvince?: {
    name: string;
  };
}

// Define interface for street validation result
interface StreetValidationResult {
  isValid: boolean;
  suggestedStreet?: string;
  allPossibleStreets?: string[];
  mismatch?: boolean;
  originalStreet?: string;
}

/**
 * Service for validating street names using external APIs and caching results
 */
export class StreetValidationService {
  private readonly API_BASE_URL = 'https://openplzapi.org';
  
  // Common street suffix variations for normalization
  private readonly STREET_SUFFIX_PATTERNS = [
    { pattern: /straße$/i, replacement: 'str' },
    { pattern: /strasse$/i, replacement: 'str' },
    { pattern: /str\.?$/i, replacement: 'str' },
    { pattern: /gasse$/i, replacement: 'g' },
    { pattern: /g\.?$/i, replacement: 'g' },
    { pattern: /weg$/i, replacement: 'w' },
    { pattern: /w\.?$/i, replacement: 'w' },
    { pattern: /allee$/i, replacement: 'a' },
    { pattern: /a\.?$/i, replacement: 'a' },
    { pattern: /platz$/i, replacement: 'pl' },
    { pattern: /pl\.?$/i, replacement: 'pl' },
    { pattern: /ring$/i, replacement: 'r' },
    { pattern: /r\.?$/i, replacement: 'r' },
    { pattern: /damm$/i, replacement: 'd' },
    { pattern: /d\.?$/i, replacement: 'd' }
  ];
  
  // Configurable street suffixes to trim before API calls
  private readonly STREET_SUFFIXES = [
    { suffix: 'straße', abbreviated: 'str' },
    { suffix: 'strasse', abbreviated: 'str' },
    { suffix: 'str.', abbreviated: 'str' },
    { suffix: 'str', abbreviated: 'str' },
    { suffix: 'gasse', abbreviated: 'g' },
    { suffix: 'weg', abbreviated: 'w' },
    { suffix: 'allee', abbreviated: 'a' },
    { suffix: 'platz', abbreviated: 'pl' },
    { suffix: 'ring', abbreviated: 'r' },
    { suffix: 'damm', abbreviated: 'd' }
  ];
  
  /**
   * Validate a street name for a given postal code and city
   * @param street The street name to validate
   * @param postalCode The postal code
   * @param city The city name
   * @returns Promise with validation result
   */
  public async validateStreet(
    street: string,
    postalCode: string,
    city: string
  ): Promise<StreetValidationResult> {
    try {
      // Extract just the street name without house numbers
      const streetName = this.extractStreetNameFromAddress(street);
      const normalizedStreet = this.normalizeStreet(streetName);
      
      console.log(`[Street Validation] Normalized street: "${streetName}" -> "${normalizedStreet}"`);
      
      // Try alternative normalizations for better matching
      const alternativeNormalizations = this.generateAlternativeNormalizations(streetName);
      console.log(`[Street Validation] Generated ${alternativeNormalizations.length} alternative normalizations`);
      
      // Check internal database first
      const internalStreets = await this.getStreetsFromDatabase(postalCode, city);
      
      if (internalStreets.length > 0) {
        // Log the streets we're comparing against
        console.log(`[Street Validation] Found ${internalStreets.length} streets in database for ${postalCode} ${city}`);
        
        // Check if the street exists in our database (exact match)
        const matchingStreet = internalStreets.find(
          (dbStreet: string) => this.normalizeStreet(dbStreet) === normalizedStreet
        );
        
        if (matchingStreet) {
          console.log(`[Street Validation] Exact match found: "${streetName}" matches "${matchingStreet}"`);
          return {
            isValid: true,
            suggestedStreet: matchingStreet,
            allPossibleStreets: internalStreets,
            originalStreet: street,
            mismatch: false
          };
        }
        
        // Check for alternative normalizations
        for (const altNorm of alternativeNormalizations) {
          const altMatch = internalStreets.find(
            (dbStreet: string) => this.normalizeStreet(dbStreet) === altNorm
          );
          
          if (altMatch) {
            console.log(`[Street Validation] Alternative normalization match found: "${streetName}" matches "${altMatch}" via "${altNorm}"`);
            return {
              isValid: true,
              suggestedStreet: altMatch,
              allPossibleStreets: internalStreets,
              originalStreet: street,
              mismatch: false
            };
          }
        }
        
        // If no exact match, try fuzzy matching with improved logic for hyphenated streets
        const fuzzyMatches = internalStreets.filter((dbStreet: string) => {
          const normalizedDbStreet = this.normalizeStreet(dbStreet);
          
          // Log the comparison for debugging
          console.log(`[Street Validation] Comparing: "${normalizedStreet}" with "${normalizedDbStreet}"`);
          
          // Use our improved matching logic
          if (this.isStreetMatch(normalizedStreet, normalizedDbStreet)) {
            console.log(`[Street Validation] Fuzzy match found: "${streetName}" similar to "${dbStreet}"`);
            return true;
          }
          
          // Try alternative normalizations with fuzzy matching
          for (const altNorm of alternativeNormalizations) {
            if (this.isStreetMatch(altNorm, normalizedDbStreet)) {
              console.log(`[Street Validation] Fuzzy match with alternative normalization: "${altNorm}" similar to "${normalizedDbStreet}"`);
              return true;
            }
          }
          
          return false;
        });
        
        if (fuzzyMatches.length > 0) {
          console.log(`[Street Validation] Using fuzzy match: "${streetName}" -> "${fuzzyMatches[0]}"`);
          return {
            isValid: true,
            suggestedStreet: fuzzyMatches[0],
            allPossibleStreets: fuzzyMatches,
            originalStreet: street,
            mismatch: true // Indicate it's not an exact match
          };
        }
      }
      
      // Continue with external validation if not found internally
      console.log(`[Street Validation] Checking external API for street "${streetName}" in ${postalCode} ${city}`);
      
      // Try multiple variations of the street name for API queries
      const streetVariations = this.generateStreetVariationsForApi(streetName);
      let apiResults: any[] = [];
      let apiStreets: string[] = [];
      
      // Try each variation until we get results
      for (const variation of streetVariations) {
        // Construct the API URL based on country
        const isAustrian = postalCode.length === 4;
        const apiUrl = isAustrian
          ? `https://openplzapi.org/at/Streets?name=${encodeURIComponent(variation)}&postalCode=${postalCode}&locality=${encodeURIComponent(city)}`
          : `https://openplzapi.org/de/Streets?name=${encodeURIComponent(variation)}&postalCode=${postalCode}&locality=${encodeURIComponent(city)}`;
        
        console.log(`[Street Validation] Querying URL with variation "${variation}": ${apiUrl}`);
        
        try {
          const response = await axios.get(apiUrl);
          
          if (response.data && response.data.length > 0) {
            apiResults = response.data;
            apiStreets = apiResults.map((item: any) => item.name);
            console.log(`[Street Validation] API returned streets for variation "${variation}": ${apiStreets.join(', ')}`);
            
            // Log if this was a base street name without suffix
            const baseStreetName = this.getBaseStreetNameWithoutSuffix(streetName);
            if (baseStreetName && variation === baseStreetName) {
              console.log(`[Street Validation] Successfully matched using base street name without suffix: "${baseStreetName}" for "${streetName}"`);
            }
            
            break; // Exit the loop if we found results
          }
        } catch (error) {
          console.error(`[Street Validation] Error querying API with variation "${variation}": ${error}`);
          // Continue to the next variation
        }
      }
      
      if (apiStreets.length > 0) {
        // Street found in external API
        console.log(`[Street Validation] API returned streets: ${apiStreets.join(', ')}`);
        
        // Check if any of the returned streets match our normalized street
        const exactMatch = apiStreets.find((apiStreet: string) => 
          this.normalizeStreet(apiStreet) === normalizedStreet
        );
        
        // Check for alternative normalizations
        let altMatch = null;
        if (!exactMatch) {
          for (const altNorm of alternativeNormalizations) {
            altMatch = apiStreets.find((apiStreet: string) => 
              this.normalizeStreet(apiStreet) === altNorm
            );
            if (altMatch) {
              console.log(`[Street Validation] Alternative normalization match in API results: "${streetName}" matches "${altMatch}" via "${altNorm}"`);
              break;
            }
          }
        }
        
        // If no exact or alternative match, try fuzzy matching
        let fuzzyMatch = null;
        if (!exactMatch && !altMatch) {
          fuzzyMatch = apiStreets.find((apiStreet: string) => 
            this.isStreetMatch(this.normalizeStreet(apiStreet), normalizedStreet)
          );
          
          // If still no match, try more aggressive fuzzy matching
          if (!fuzzyMatch) {
            fuzzyMatch = this.findBestFuzzyMatch(streetName, apiStreets);
          }
        }
        
        if (exactMatch) {
          console.log(`[Street Validation] Exact match found in API results: "${streetName}" matches "${exactMatch}"`);
        } else if (altMatch) {
          console.log(`[Street Validation] Alternative match found in API results: "${streetName}" matches "${altMatch}"`);
        } else if (fuzzyMatch) {
          console.log(`[Street Validation] Fuzzy match found in API results: "${streetName}" similar to "${fuzzyMatch}"`);
        } else {
          console.log(`[Street Validation] No match in API results, using first result: "${apiStreets[0]}"`);
        }
        
        // Save to database for future use
        await this.saveStreetsToDatabase(postalCode, city, apiStreets);
        
        // For Austrian addresses, be more lenient with validation
        const isAustrian = postalCode.length === 4;
        if (isAustrian && !exactMatch && !altMatch && !fuzzyMatch) {
          console.log(`[Street Validation] Austrian address - being more lenient with validation`);
          return {
            isValid: true,
            suggestedStreet: apiStreets[0],
            allPossibleStreets: apiStreets,
            originalStreet: street,
            mismatch: true
          };
        }
        
        return {
          isValid: true,
          suggestedStreet: exactMatch || altMatch || fuzzyMatch || apiStreets[0],
          allPossibleStreets: apiStreets,
          originalStreet: street,
          mismatch: !(exactMatch || altMatch) // Only mark as mismatch if no exact or alternative match found
        };
      } else {
        // No results from API, but we should be more lenient with validation
        // For hyphenated streets, we'll be more lenient as they might be newer streets not in the database
        if (streetName.includes('-')) {
          console.log(`[Street Validation] No results for hyphenated street "${streetName}" - being lenient`);
          return {
            isValid: true, // Consider valid for hyphenated streets
            suggestedStreet: streetName,
            allPossibleStreets: [streetName],
            originalStreet: street,
            mismatch: true
          };
        }
        
        const isAustrian = postalCode.length === 4;
        if (isAustrian) {
          console.log(`[Street Validation] No results for Austrian street "${streetName}" - being lenient`);
          return {
            isValid: true, // Consider valid for Austrian addresses
            suggestedStreet: streetName,
            allPossibleStreets: [streetName],
            originalStreet: street,
            mismatch: true
          };
        }
        
        console.log(`[Street Validation] No results found for street "${streetName}" in ${postalCode} ${city}`);
        return {
          isValid: false,
          suggestedStreet: streetName,
          allPossibleStreets: [streetName],
          originalStreet: street,
          mismatch: true
        };
      }
    } catch (error) {
      console.error(`[Street Validation] Error validating street "${street}" in ${postalCode} ${city}:`, error);
      return { 
        isValid: false, 
        suggestedStreet: street,
        allPossibleStreets: [street],
        originalStreet: street,
        mismatch: true
      };
    }
  }
  
  /**
   * Generates variations of a street name for API queries
   * @param street The original street name
   * @returns An array of street name variations to try in API calls
   */
  private generateStreetVariationsForApi(street: string): string[] {
    const variations: string[] = [street]; // Original street name
    
    // Add base street name without suffix
    const baseStreetName = this.getBaseStreetNameWithoutSuffix(street);
    if (baseStreetName && baseStreetName !== street) {
      variations.push(baseStreetName);
    }
    
    // For hyphenated streets, try variations
    if (street.includes('-')) {
      // Replace hyphens with spaces
      variations.push(street.replace(/-/g, ' '));
      
      // Split by hyphens and try the first part
      const parts = street.split('-');
      if (parts.length > 0) {
        variations.push(parts[0].trim());
      }
      
      // For streets like "Josef-Schröder-Straße", try "Josef Schröder Str"
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.toLowerCase().includes('straße') || 
            lastPart.toLowerCase().includes('strasse') || 
            lastPart.toLowerCase().includes('str')) {
          // Join all parts except the last one with spaces
          const nameOnly = parts.slice(0, parts.length - 1).join(' ');
          variations.push(nameOnly);
          variations.push(`${nameOnly} Str`);
          variations.push(`${nameOnly} Straße`);
          variations.push(`${nameOnly} Strasse`);
          variations.push(`${nameOnly}straße`);
          variations.push(`${nameOnly}str`);
        }
      }
    } else if (street.includes(' ')) {
      // For non-hyphenated multi-word streets, try variations
      const parts = street.split(' ');
      
      // Try the first word (for streets like "Josef Schröder Straße")
      if (parts.length > 0) {
        variations.push(parts[0].trim());
      }
      
      // Try without the suffix
      const lastPart = parts[parts.length - 1];
      if (lastPart.toLowerCase().includes('straße') || 
          lastPart.toLowerCase().includes('strasse') || 
          lastPart.toLowerCase().includes('str')) {
        const nameOnly = parts.slice(0, parts.length - 1).join(' ');
        variations.push(nameOnly);
      }
    }
    
    // Remove duplicates
    return [...new Set(variations)];
  }
  
  /**
   * Extracts the base street name without any suffix
   * @param street The original street name
   * @returns The base street name without suffix
   */
  private getBaseStreetNameWithoutSuffix(street: string): string | null {
    const lowerStreet = street.toLowerCase().trim();
    
    // Check for space-separated suffix (e.g., "Aldegrever Straße")
    const parts = lowerStreet.split(' ');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      for (const suffixObj of this.STREET_SUFFIXES) {
        if (lastPart === suffixObj.suffix) {
          return parts.slice(0, parts.length - 1).join(' ');
        }
      }
    }
    
    // Check for attached suffix (e.g., "Aldegreverstraße")
    for (const suffixObj of this.STREET_SUFFIXES) {
      if (lowerStreet.endsWith(suffixObj.suffix)) {
        return lowerStreet.slice(0, lowerStreet.length - suffixObj.suffix.length);
      }
    }
    
    return null;
  }
  
  /**
   * Find the best fuzzy match between a street name and a list of candidates
   * @param street The street name to match
   * @param candidates List of candidate street names
   * @returns The best matching street name or null if no good match found
   */
  private findBestFuzzyMatch(street: string, candidates: string[]): string | null {
    // Normalize the input street
    const normalizedStreet = this.normalizeStreet(street);
    
    // First try to find matches where one is a substring of the other
    for (const candidate of candidates) {
      const normalizedCandidate = this.normalizeStreet(candidate);
      
      // If one is a substring of the other
      if (normalizedStreet.includes(normalizedCandidate) || 
          normalizedCandidate.includes(normalizedStreet)) {
        return candidate;
      }
    }
    
    // For hyphenated streets, try matching parts
    if (street.includes('-')) {
      const parts = street.split('-');
      
      for (const candidate of candidates) {
        // Check if any part of the hyphenated name is in the candidate
        for (const part of parts) {
          if (part.length > 2 && candidate.toLowerCase().includes(part.toLowerCase())) {
            return candidate;
          }
        }
      }
    }
    
    // Try matching individual words
    const words = normalizedStreet.split(' ').filter(w => w.length > 2);
    
    if (words.length > 0) {
      for (const candidate of candidates) {
        const candidateWords = this.normalizeStreet(candidate).split(' ').filter(w => w.length > 2);
        
        // Count matching words
        const matchingWords = words.filter(word => candidateWords.includes(word)).length;
        
        // If at least one significant word matches
        if (matchingWords > 0) {
          return candidate;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Generate alternative normalizations for a street name to improve matching
   * @param street The street name to normalize
   * @returns Array of alternative normalized forms
   */
  private generateAlternativeNormalizations(street: string): string[] {
    const alternatives: string[] = [];
    const baseNormalized = street.trim().toLowerCase();
    
    // Handle hyphenated names with and without hyphens
    if (baseNormalized.includes('-')) {
      alternatives.push(this.normalizeStreet(baseNormalized.replace(/-/g, ' ')));
      alternatives.push(this.normalizeStreet(baseNormalized.replace(/-/g, '')));
      
      // For streets like "Josef-Schröder-Straße", try "josefschroderstr"
      const parts = baseNormalized.split('-');
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('straße') || lastPart.includes('strasse') || lastPart.includes('str')) {
          // Join all parts except the last one
          const nameOnly = parts.slice(0, parts.length - 1).join('');
          alternatives.push(this.normalizeStreet(`${nameOnly}${lastPart}`));
          alternatives.push(this.normalizeStreet(`${nameOnly} ${lastPart}`));
          
          // Try with different suffix variations
          alternatives.push(this.normalizeStreet(`${nameOnly}str`));
          alternatives.push(this.normalizeStreet(`${nameOnly} str`));
        }
      }
    } else {
      // Try to identify potential hyphenation points (e.g., "Josef Schröder" -> "Josef-Schröder")
      const words = baseNormalized.split(' ');
      if (words.length >= 2) {
        const hyphenated = words.join('-');
        alternatives.push(this.normalizeStreet(hyphenated));
      }
    }
    
    // Handle common suffix variations
    const suffixVariations = [
      { from: 'straße', to: 'str' },
      { from: 'strasse', to: 'str' },
      { from: 'str', to: 'straße' },
      { from: 'str.', to: 'straße' },
      { from: 'gasse', to: 'g' },
      { from: 'g', to: 'gasse' },
      { from: 'g.', to: 'gasse' },
      { from: 'weg', to: 'w' },
      { from: 'w', to: 'weg' },
      { from: 'w.', to: 'weg' },
      { from: 'platz', to: 'pl' },
      { from: 'pl', to: 'platz' },
      { from: 'pl.', to: 'platz' },
      { from: 'allee', to: 'a' },
      { from: 'a', to: 'allee' },
      { from: 'a.', to: 'allee' }
    ];
    
    for (const variation of suffixVariations) {
      if (baseNormalized.endsWith(variation.from)) {
        const withoutSuffix = baseNormalized.slice(0, -variation.from.length).trim();
        const withNewSuffix = `${withoutSuffix} ${variation.to}`;
        alternatives.push(this.normalizeStreet(withNewSuffix));
      }
    }
    
    // Remove duplicates and filter out empty strings
    return [...new Set(alternatives)].filter(a => a.length > 0);
  }
  
  /**
   * Extract just the street name from a full street address
   * @param streetAddress The full street address (e.g., "Hauptstraße 123")
   * @returns The street name only (e.g., "Hauptstraße")
   */
  private extractStreetNameFromAddress(streetAddress: string): string {
    // Handle multi-word street names with common prefixes
    const commonPrefixes = ['am', 'an', 'auf', 'bei', 'im', 'in', 'zum', 'zur'];
    const parts = streetAddress.split(' ');
    
    if (parts.length <= 1) {
      return streetAddress;
    }
    
    // Check for common two-word street names
    if (parts.length >= 2 && commonPrefixes.includes(parts[0].toLowerCase())) {
      // For cases like "Am Markt 12" -> return "Am Markt"
      return `${parts[0]} ${parts[1]}`;
    }
    
    // Extract everything before the first number
    const streetNameMatch = streetAddress.match(/^([^\d]+)/);
    if (streetNameMatch) {
      return streetNameMatch[0].trim();
    }
    
    // Fallback to first part
    return parts[0];
  }
  
  /**
   * Normalize a street name for better matching
   * @param street The street name to normalize
   * @returns Normalized street name
   */
  private normalizeStreet(street: string): string {
    let normalizedStreet = street
      .trim()
      .toLowerCase();
    
    // Handle hyphenated names by replacing with spaces for better matching
    normalizedStreet = normalizedStreet.replace(/-/g, ' ');
    
    // Apply all suffix pattern replacements
    for (const pattern of this.STREET_SUFFIX_PATTERNS) {
      normalizedStreet = normalizedStreet.replace(pattern.pattern, pattern.replacement);
    }
    
    // Remove special characters
    normalizedStreet = normalizedStreet
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace umlauts
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ß/g, 'ss')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
      
    console.log(`[Street Validation] Deep normalization: "${street}" -> "${normalizedStreet}"`);
    return normalizedStreet;
  }
  
  /**
   * Check if two street names match after normalization
   * @param street1 First street name
   * @param street2 Second street name
   * @returns True if the streets match, false otherwise
   */
  private isStreetMatch(street1: string, street2: string): boolean {
    // Exact match after normalization
    if (street1 === street2) {
      return true;
    }
    
    // Check if one is a substring of the other (after normalization)
    if (street1.includes(street2) || street2.includes(street1)) {
      return true;
    }
    
    // Split into words and check if most words match
    const words1 = street1.split(' ').filter(w => w.length > 2); // Only consider words with 3+ chars
    const words2 = street2.split(' ').filter(w => w.length > 2);
    
    if (words1.length > 0 && words2.length > 0) {
      // Count matching words
      const matchingWords = words1.filter(word => words2.includes(word)).length;
      
      // If more than half of the words match, consider it a match
      if (matchingWords >= Math.min(words1.length, words2.length) / 2) {
        return true;
      }
    }
    
    // Check for common abbreviation patterns
    // For example, "Hauptstr" should match "Hauptstraße"
    if ((street1.includes('str') && street2.includes('str')) ||
        (street1.includes('g') && street2.includes('g')) ||
        (street1.includes('w') && street2.includes('w')) ||
        (street1.includes('pl') && street2.includes('pl')) ||
        (street1.includes('a') && street2.includes('a'))) {
      
      // Remove the common suffix and check if the base names match
      const base1 = street1
        .replace(/str$/, '')
        .replace(/g$/, '')
        .replace(/w$/, '')
        .replace(/pl$/, '')
        .replace(/a$/, '');
      
      const base2 = street2
        .replace(/str$/, '')
        .replace(/g$/, '')
        .replace(/w$/, '')
        .replace(/pl$/, '')
        .replace(/a$/, '');
      
      if (base1 === base2 || base1.includes(base2) || base2.includes(base1)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Gets streets from the database for a given postal code and city
   */
  private async getStreetsFromDatabase(postalCode: string, city: string): Promise<string[]> {
    try {
      // Use type assertion to avoid TypeScript error
      const results = await (prisma as any).streetValidation.findMany({
        where: {
          postalCode,
          city
        },
        select: {
          street: true
        }
      });
      
      return results.map((result: { street: string }) => result.street);
    } catch (error) {
      console.error(`[Street Validation] Error getting streets from database: ${error}`);
      return [];
    }
  }
  
  /**
   * Saves streets to the database for a given postal code and city
   */
  private async saveStreetsToDatabase(postalCode: string, city: string, streets: string[]): Promise<void> {
    try {
      // Save each street to the database
      for (const street of streets) {
        await (prisma as any).streetValidation.upsert({
          where: {
            street_postalCode_city: {
              postalCode,
              city,
              street
            }
          },
          update: {
            lastUpdated: new Date()
          },
          create: {
            postalCode,
            city,
            street,
            country: postalCode.length === 4 ? 'AT' : 'DE',
            source: 'openplz',
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      console.error(`[Street Validation] Error saving streets to database: ${error}`);
    }
  }
}

// Export a singleton instance
export const streetValidationService = new StreetValidationService(); 