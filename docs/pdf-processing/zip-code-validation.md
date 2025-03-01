# ZIP Code Validation

This document details how the BriefButler application validates postal codes (ZIP codes) and their associated cities.

## Overview

ZIP code validation is a critical component of the address validation process. The system uses a multi-layered approach:

1. Internal database validation (primary, fast)
2. External API validation (fallback, comprehensive)
3. Special handling for multiple cities per ZIP code
4. Different validation rules for German vs. Austrian postal codes

## Internal ZIP Validation Service

The `ZipValidationService` provides fast validation using the database for postal codes and cities.

### Data Structure

The service queries the database for ZIP code validation:

```typescript
// Query the database for a specific ZIP code
const entries = await prisma.zipCode.findMany({
  where: {
    zipCode: zipCode
  }
});
```

### Initialization

The service initializes by checking the database:

```typescript
private async initialize(): Promise<void> {
  if (this.initialized) return;
  
  // Check how many ZIP codes we have in the database
  const count = await prisma.zipCode.count();
  console.log(`[ZIP Validation] Database contains ${count} ZIP code entries`);
  
  this.initialized = true;
}
```

### Validation Process

The `validateZipCodeCity` method checks if a given postal code and city combination is valid:

```typescript
async validateZipCodeCity(
  zipCode: string,
  city: string
): Promise<{
  isValid: boolean;
  suggestedCity?: string;
  allPossibleCities?: string[];
  mismatch?: boolean;
  confidenceAdjustment: number;
}>
```

The validation follows these steps:

1. Initialize the service if needed
2. Normalize the city name for comparison
3. Query the database for the ZIP code
4. If found, compare the provided city with the stored cities
5. Return validation results including all possible cities for the ZIP code

## External ZIP Validation Service

The `ExternalZipValidationService` provides a more comprehensive validation by querying external APIs and caching results.

### API Integration

The service integrates with:

- OpenPLZ API for German and Austrian postal codes

### Caching Mechanism

Results from external APIs are cached in the database to improve performance:

```typescript
private async cacheZipCodeResult(
  zipCode: string,
  city: string,
  state: string | null,
  countryCode: string,
  source: string = 'openplz'
): Promise<void>
```

### Validation Process

The external validation follows these steps:

1. Check the internal database cache first
2. If not found, query the appropriate external API
3. Cache the results for future use
4. Return validation results including all possible cities

## Multiple Cities Handling

A key feature of the validation system is its ability to handle multiple cities associated with a single ZIP code.

### Problem Statement

In some regions, particularly in Austria, a single postal code can serve multiple cities or municipalities. For example:

- Postal code 6971 corresponds to both "Hard" and "Fußach"
- Postal code 6850 corresponds to "Dornbirn", "Dornbirn-Schoren", and "Dornbirn-Hatlerdorf"

### Dynamic Multi-City Discovery

Our system now uses a dynamic approach to discover and validate multiple cities for a single ZIP code:

1. When a new city-ZIP code combination is encountered, the system first checks the internal database
2. If the city doesn't match any existing entries, the system queries the external API
3. If the external API confirms the city is valid for that ZIP code, the new city is added to the database
4. Future validations will recognize both cities as valid for that ZIP code

This approach eliminates the need for hard-coded special cases and allows the system to learn and adapt over time.

### Example: ZIP Code 6971

For Austrian postal code 6971, which serves both "Hard" and "Fußach":

1. The first time we encounter "6971 Hard", the system might only have "Fußach" in the database
2. The system will query the external API, which returns both "Hard" and "Fußach" as valid cities
3. The system adds "Hard" as a valid city for ZIP code 6971 in the database
4. Future validations of "6971 Hard" will succeed with high confidence

### Implementation

The validation services handle this by:

1. Always querying the external API when a city doesn't match the database entry
2. Storing each valid city-ZIP code combination in the database
3. Normalizing city names for comparison (lowercase, trimmed, special characters removed)
4. Checking if the provided city matches any of the possible cities

```typescript
// Example of city normalization
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Example of checking against all possible cities
if (allPossibleCities.some(possibleCity => 
    normalizeCity(possibleCity) === normalizeCity(address.city))) {
  // City is valid
}
```

### Common City Variations

The system also handles common variations in city names:

- Umlaut variations (e.g., "München" vs "Muenchen")
- Abbreviated forms (e.g., "St." vs "Sankt")
- Compound names with different separators (e.g., "Bad-Homburg" vs "Bad Homburg")

## German vs. Austrian Validation

The system applies different validation rules based on the postal code format:

### German Postal Codes (5 digits)

- Strict validation against both internal and external databases
- Higher confidence reduction for mismatches
- More comprehensive database coverage

### Austrian Postal Codes (4 digits)

- More lenient validation due to potential gaps in API coverage
- Smaller confidence adjustments for validation failures
- Addresses with Austrian postal codes are not invalidated solely based on API validation failures

```typescript
const isAustrian = zipCode.length === 4;
if (isAustrian) {
  // Apply more lenient validation rules
  confidenceAdjustment = confidenceAdjustment / 2;
}
```

## Confidence Scoring

The validation process contributes to the overall confidence score of the address:

- Perfect match: No confidence reduction
- Partial match (city matches one of multiple possible cities): Small confidence reduction
- Mismatch (city doesn't match any possible city): Larger confidence reduction
- No match found (ZIP code not in database): Small confidence reduction

For Austrian addresses, the confidence reductions are typically halved due to the more lenient validation approach.

## Error Handling

The validation services include robust error handling:

- If the internal database fails, the system falls back to the external API
- If the external API fails, the system logs the error and continues without validation
- Timeouts are implemented for external API calls to prevent blocking
- Rate limiting is respected for external APIs

## Database Schema

The ZIP code data is stored in the database using the following schema:

```prisma
model ZipCode {
  id          String   @id @default(uuid())
  zipCode     String
  city        String
  state       String?
  country     String
  source      String   @default("internal") // "internal", "openplz", etc.
  lastUpdated DateTime @default(now())
  createdAt   DateTime @default(now())
  
  @@unique([zipCode, city])
}
```

Our approach to handling multiple cities for a single ZIP code works as follows:

1. Each unique ZIP code-city combination has a separate entry in the database
2. When validating a city-ZIP code combination, we first check if it exists in the database
3. If it doesn't exist, we query the external API to check if it's a valid alternative
4. If confirmed valid, we add the new city-ZIP code combination as a new entry
5. This allows us to build a comprehensive database of all valid city-ZIP code combinations over time

### Example: ZIP Code 6971

For Austrian postal code 6971, which serves both "Hard" and "Fußach", we would have two separate entries in the database:

```
Entry 1:
- zipCode: "6971"
- city: "Fußach"
- country: "AT"
- source: "address-extraction"

Entry 2:
- zipCode: "6971"
- city: "Hard"
- country: "AT"
- source: "address-extraction"
```

This approach ensures that both "6971 Fußach" and "6971 Hard" are recognized as valid combinations.

### Dynamic Database Updates

The system automatically updates the database when it discovers new valid city-ZIP code combinations:

```typescript
// When a new valid city is found for a ZIP code
if (apiCities.includes(city) && !internalCities.includes(city)) {
  await this.cacheZipCodeResult(
    zipCode,
    city,
    state,
    countryCode,
    'address-extraction'
  );
  console.log(`Added new city ${city} for ZIP code ${zipCode} to database`);
}
```

This dynamic approach ensures that our database becomes more comprehensive over time, reducing the need for manual updates and special case handling.

## Maintenance and Updates

The ZIP code database requires periodic updates:

1. The system automatically updates the database when it discovers new valid city-ZIP code combinations
2. External API results are cached to improve performance and reduce API calls
3. The database can be manually updated if needed

## Street Validation

In addition to ZIP code validation, the system also validates street names using a similar approach.

### Overview

Street validation ensures that the extracted street name is valid for the given postal code and city. This adds another layer of validation to the address extraction process.

### API Integration

The street validation service integrates with:

- OpenPLZ API for German and Austrian streets

The API endpoints used are:
- For Germany: `openplzapi.org/de/Streets?name={Straßenname}&postalCode={Postleitzahl}&locality={Ortsname}`
- For Austria: `openplzapi.org/at/Streets?name={Straßenname}&postalCode={Postleitzahl}&locality={Ortsname}`

### Database Schema

The street validation data is stored in the database using the following schema:

```prisma
model StreetValidation {
  id          String   @id @default(uuid())
  street      String
  postalCode  String
  city        String
  country     String
  source      String   @default("internal") // "internal", "openplz", etc.
  lastUpdated DateTime @default(now())
  createdAt   DateTime @default(now())
  
  @@unique([street, postalCode, city])
}
```

### Validation Process

The street validation process follows these steps:

1. Check if the street exists in the internal database for the given postal code and city
2. If not found, query the OpenPLZ API to check if the street is valid
3. If the street is valid, add it to the database for future use
4. Return validation results including all possible streets for the given postal code and city

### Confidence Scoring

The street validation contributes to the overall confidence score of the address:

- Perfect match: Positive confidence adjustment (+0.2)
- Partial match (street matches one of multiple possible streets): Small positive confidence adjustment (+0.1)
- Mismatch (street doesn't match any possible street): Negative confidence adjustment (-0.2)
- No match found (street not in database or API): Small negative confidence adjustment (-0.1)

For Austrian addresses, the confidence adjustments are typically more lenient due to potential gaps in API coverage.

### Example: Street Validation

For a German address with postal code "10117" and city "Berlin":

1. The system first checks if the street "Unter den Linden" exists in the internal database for "10117 Berlin"
2. If not found, it queries the OpenPLZ API: `openplzapi.org/de/Streets?name=Unter%20den%20Linden&postalCode=10117&locality=Berlin`
3. If the API confirms the street is valid, it adds "Unter den Linden" to the database for "10117 Berlin"
4. Future validations of "Unter den Linden" in "10117 Berlin" will succeed with high confidence

### Street Name Normalization

The system normalizes street names for better matching:

```typescript
function normalizeStreet(street: string): string {
  return street
    .toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[äÄ]/g, 'a') // Replace umlauts
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[ß]/g, 'ss')
    .replace(/str\.|straße|strasse/g, 'str') // Normalize street suffixes
    .replace(/\./g, '') // Remove periods
    .replace(/-/g, ''); // Remove hyphens
}
```

This normalization handles common variations in street names, such as:
- Different spellings of "Straße" (e.g., "Strasse", "Str.")
- Umlauts and special characters
- Spaces and hyphens

## Integration with Address Extraction

Both ZIP code validation and street validation are integrated into the address extraction process:

1. The system first extracts the address components from the PDF
2. It then validates the postal code and city
3. If the postal code and city are valid, it validates the street
4. The validation results contribute to the overall confidence score of the extracted address

This multi-layered validation approach ensures that the extracted address is as accurate as possible.

## Troubleshooting

Common issues and their solutions:

1. **Missing ZIP codes**: Check if the ZIP code exists in the official database
2. **City mismatches**: Verify if the city is an alternative name or a district of a larger city
3. **API failures**: Check API status and rate limits
4. **Performance issues**: Monitor cache hit rates and consider preloading more common ZIP codes

### Handling Multiple Cities for a Single ZIP Code

When you encounter validation failures with a confidence score around 0.6 for Austrian addresses:

1. Check if the ZIP code might serve multiple cities
2. Verify the actual cities for that ZIP code using an official Austrian postal service reference
3. Update the database entry to include all possible cities in the `allPossibleCities` array:

```typescript
// Example of updating the database with multiple cities
await prisma.zipCode.upsert({
  where: { 
    postalCode_country: {
      postalCode: '6971',
      country: 'AT'
    }
  },
  update: {
    allCities: ['Fußach', 'Hard']
  },
  create: {
    postalCode: '6971',
    city: 'Fußach',
    country: 'AT',
    allCities: ['Fußach', 'Hard']
  }
});
```

## Future Improvements

Planned enhancements to the ZIP code validation system:

1. Support for additional countries (Switzerland, Liechtenstein)
2. Improved fuzzy matching for city names
3. Integration with address autocomplete services
4. Machine learning-based confidence scoring
5. Comprehensive database of Austrian postal codes with all possible cities for each ZIP code

## Validation Response Format

The validation service returns a structured response with the following fields:

```typescript
interface ZipValidationResult {
  isValid: boolean;
  suggestedCity?: string;
  originalCity?: string;
  allPossibleCities?: string[];
  mismatch?: boolean;
  country?: string;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | boolean | Whether the ZIP code and city combination is valid |
| `suggestedCity` | string (optional) | The suggested city name from validation |
| `originalCity` | string (optional) | The original city name provided for validation |
| `allPossibleCities` | string[] (optional) | All possible cities for the given ZIP code |
| `mismatch` | boolean (optional) | Whether there is a mismatch between the provided city and the expected city |
| `country` | string (optional) | The country code for the ZIP code (e.g., "DE", "AT") |

## Special Handling for Austrian Addresses

Austrian postal codes (4-digit format) receive special handling in the validation process:

1. The system recognizes Austrian postal codes by their 4-digit format
2. For Vienna districts, the system handles the special format (e.g., "Wien, Josefstadt")
3. If external validation fails for Austrian addresses, the system is more lenient in its validation

This special handling is implemented as follows:

```typescript
// Detect Austrian postal code by length
const isAustrian = postalCode.length === 4;

// If validation fails but it's an Austrian address
if (!validationResult.isValid && isAustrian) {
  // Be more lenient with Austrian addresses
  console.log('Austrian postal code detected, being more lenient with validation');
  
  // For Austrian addresses, don't invalidate the address just because the API validation failed
  isValid = true;
}
``` 