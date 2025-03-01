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
  return street
    .trim()
    .toLowerCase()
    // Replace common street suffix variations
    .replace(/straße$/i, 'str')
    .replace(/strasse$/i, 'str')
    .replace(/gasse$/i, 'g')
    .replace(/weg$/i, 'w')
    .replace(/allee$/i, 'a')
    .replace(/platz$/i, 'pl')
    // Remove special characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace umlauts
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}
```

Normalization handles:

1. Common abbreviations (e.g., "straße" to "str")
2. Special characters and accents
3. Umlauts and other language-specific characters
4. Case differences

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