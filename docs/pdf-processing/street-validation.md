# Street Validation

This document details how the BriefButler application validates street names in extracted addresses.

## Overview

Street validation is a critical component of the address validation process. It ensures that the extracted street name exists in the specified postal code and city, improving the overall accuracy of the address extraction.

The street validation process follows these key steps:

1. Street name extraction from the full address line
2. Street name normalization
3. Validation against internal database
4. Validation against external API (OpenPLZ)
5. Confidence score adjustment based on validation results

## Street Name Extraction

When validating a street, the system first extracts just the street name without house numbers or additional information:

```typescript
extractStreetNameFromAddress(fullStreet: string): string {
  // Remove house numbers and additional information
  // Example: "Musterstraße 123a" -> "Musterstraße"
  
  // First, handle common prefixes
  const prefixRegex = /^(St\.|Sankt|St|Heiliger|Hl\.|Hl)\s+/i;
  const hasPrefixMatch = fullStreet.match(prefixRegex);
  const prefix = hasPrefixMatch ? hasPrefixMatch[0] : '';
  
  // Extract the street name without numbers
  const streetNameRegex = /^(.*?)(?:\s+\d|\s*,)/;
  const match = fullStreet.replace(prefixRegex, '').match(streetNameRegex);
  
  if (match && match[1]) {
    // Reattach the prefix if it existed
    return (prefix + match[1]).trim();
  }
  
  // If no match found, try to extract everything before the first number
  const fallbackRegex = /^(.*?)(?:\s+\d|\s*$)/;
  const fallbackMatch = fullStreet.match(fallbackRegex);
  
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim();
  }
  
  // If all else fails, return the original street
  return fullStreet;
}
```

This extraction is important because:

1. Street databases typically store only the street name without house numbers
2. It allows for more accurate matching against database entries
3. It handles variations in house number formats

## Street Name Normalization

Street names are normalized to improve matching accuracy:

```typescript
normalizeStreet(street: string): string {
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
```

Normalization handles:

1. Common abbreviations (e.g., "straße" to "str")
2. Special characters and accents
3. Umlauts and other language-specific characters
4. Case differences
5. Hyphenated names (converted to spaces for better matching)

## Street Suffix Patterns

The system uses configurable patterns to normalize street suffixes:

```typescript
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
```

These patterns are used during normalization to standardize street name suffixes, improving matching accuracy.

## Street Suffix Handling for API Calls

The system uses a configurable approach to handle street suffixes when making API calls:

```typescript
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
```

When validating streets against the OpenPLZ API, the system:

1. Tries the original street name first
2. Generates a base street name by removing known suffixes (e.g., "Aldegreverstraße" → "Aldegrever")
3. Tries the base street name in the API call
4. Generates additional variations (with hyphens replaced by spaces, etc.)
5. Tries each variation until a match is found

This approach solves the issue where the API only recognizes abbreviated forms (e.g., "str") but our extracted addresses contain the full form (e.g., "straße").

### Example

For a street like "Aldegreverstraße 25":

1. The system first tries "Aldegreverstraße 25"
2. Then it tries "Aldegrever" (base name without suffix)
3. If a match is found using the base name, it logs this success
4. The system can then map the API result back to the original street name format

## Enhanced Logging

The system includes detailed logging to track the street validation process:

```typescript
// Log which variation is being tried
console.log(`[Street Validation] Querying URL with variation "${variation}": ${apiUrl}`);

// Log the results from the API
console.log(`[Street Validation] API returned streets for variation "${variation}": ${apiStreets.join(', ')}`);

// Log when a match is found using the base street name
if (baseStreetName && variation === baseStreetName) {
  console.log(`[Street Validation] Successfully matched using base street name without suffix: "${baseStreetName}" for "${streetName}"`);
}
```

This logging helps with:

1. Debugging validation issues
2. Understanding which variations were successful
3. Tracking API performance
4. Identifying patterns for future optimization

## Validation Response Format

The street validation service returns a structured response with the following fields:

```typescript
interface StreetValidationResult {
  isValid: boolean;
  suggestedStreet?: string;
  originalStreet?: string;
  allPossibleStreets?: string[];
  mismatch?: boolean;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | boolean | Whether the street name is valid for the given ZIP code and city |
| `suggestedStreet` | string (optional) | The suggested street name from validation |
| `originalStreet` | string (optional) | The original street name provided for validation |
| `allPossibleStreets` | string[] (optional) | All possible streets for the given ZIP code and city |
| `mismatch` | boolean (optional) | Whether there is a mismatch between the provided street and the expected street |

## Confidence Scoring

The street validation process contributes to the overall confidence score of the address extraction:

```typescript
// In the PDF processing service
if (streetValidationResult.isValid) {
  // Add to confidence score for successful street validation
  extractedAddress.confidence += 0.6;
}
```

The confidence scoring approach:

1. Starts with a base score of 0
2. Adds 0.4 for successful ZIP/city validation
3. Adds 0.6 for successful street validation
4. Results in a maximum score of 1.0 for fully validated addresses

This scoring system provides a clear indication of address quality and reliability.

## Validation Process

The street validation process follows these steps:

1. Normalize the input street name (remove special characters, handle abbreviations)
2. Generate alternative normalizations to handle common variations
3. Check for exact matches in the database
4. If no exact match, check for alternative matches
5. If no alternative match, check for fuzzy matches
6. Return the validation result with appropriate fields

This process is implemented as follows:

```typescript
// Normalize the street name
const normalizedStreet = this.normalizeStreet(street);

// Generate alternative normalizations
const alternativeNormalizations = this.generateAlternativeNormalizations(normalizedStreet);

// Check for exact matches
const exactMatch = this.findExactMatch(normalizedStreet, possibleStreets);
if (exactMatch) {
  return {
    isValid: true,
    suggestedStreet: exactMatch,
    originalStreet: street,
    mismatch: false
  };
}

// Check for alternative matches
const alternativeMatch = this.findAlternativeMatch(alternativeNormalizations, possibleStreets);
if (alternativeMatch) {
  return {
    isValid: true,
    suggestedStreet: alternativeMatch,
    originalStreet: street,
    mismatch: false
  };
}

// Check for fuzzy matches
const fuzzyMatch = this.findFuzzyMatch(normalizedStreet, possibleStreets);
if (fuzzyMatch) {
  return {
    isValid: true,
    suggestedStreet: fuzzyMatch,
    originalStreet: street,
    mismatch: true
  };
}

// No match found
return {
  isValid: false,
  originalStreet: street,
  mismatch: true
};
```

## Database Caching

To improve performance and reduce API calls, validated streets are cached in the database:

```typescript
async saveStreetsToDatabase(postalCode: string, city: string, streets: string[]): Promise<void> {
  try {
    // Save each street to the database
    for (const streetName of streets) {
      await prisma.streetDirectory.upsert({
        where: {
          postalCode_city_street: {
            postalCode,
            city,
            street: streetName
          }
        },
        update: {
          lastValidated: new Date()
        },
        create: {
          postalCode,
          city,
          street: streetName,
          lastValidated: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error saving streets to database:', error);
  }
}
```

This caching mechanism:

1. Reduces external API calls
2. Improves validation speed
3. Builds a comprehensive street database over time
4. Allows the system to work offline if needed

## Special Handling for Austrian Addresses

Austrian addresses receive special handling during street validation:

```typescript
// For Austrian addresses, be more lenient with street validation failures
const isAustrian = result.postalCode.length === 4;
if (!streetValidationResult.isValid && isAustrian) {
  writeLog(`[PDF Processing] Austrian address detected, being more lenient with street validation`);
  // Apply smaller confidence adjustment for Austrian addresses
  // ...
}
```

This special handling accounts for:

1. Potentially less comprehensive coverage in the OpenPLZ API for Austrian addresses
2. Regional variations in street naming conventions
3. Different address formatting standards

## API Response

The street validation details are included in the API response:

```typescript
streetValidation: {
  attempted: !!(extractedAddress.street && extractedAddress.postalCode && extractedAddress.city),
  streetProvided: !!extractedAddress.street,
  matchFoundInDatabase: (extractedAddress as any).streetValidationDetails?.matchFound || false,
  originalStreet: (extractedAddress as any).streetValidationDetails?.originalStreet || extractedAddress.street || null,
  suggestedStreet: (extractedAddress as any).streetValidationDetails?.suggestedStreet || null,
  mismatch: (extractedAddress as any).streetValidationDetails?.mismatch || false
}
```

This detailed response allows clients to:

1. Understand why a particular confidence score was assigned
2. Identify specific validation issues
3. Suggest corrections to the user if needed
4. Make informed decisions about address acceptance

## Future Improvements

Planned enhancements to the street validation system:

1. Enhanced fuzzy matching using Levenshtein distance or other algorithms
2. Machine learning-based street name correction
3. Integration with additional street databases
4. Support for more countries and regions
5. Handling of business addresses with building names
6. Performance optimizations for faster validation 