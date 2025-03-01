# ZIP Code Validation

This document details how the BriefButler application validates postal codes (ZIP codes) and their associated cities.

## Overview

ZIP code validation is a critical component of the address validation process. The system uses a multi-layered approach:

1. Internal database validation (primary, fast)
2. External API validation (fallback, comprehensive)
3. Special handling for multiple cities per ZIP code
4. Different validation rules for German vs. Austrian postal codes

## Internal ZIP Validation Service

The `ZipValidationService` provides fast validation using an in-memory database of postal codes and cities.

### Data Structure

The service maintains two separate maps for German and Austrian postal codes:

```typescript
private germanZipCodes: Map<string, ZipEntry> = new Map();
private austrianZipCodes: Map<string, ZipEntry> = new Map();
```

Where `ZipEntry` contains:

```typescript
interface ZipEntry {
  zipCode: string;
  city: string;
  state?: string;
  country: string;
}
```

### Initialization

The service initializes lazily, loading data only when first used:

```typescript
private async initialize(): Promise<void> {
  if (this.initialized) return;
  
  await Promise.all([
    this.loadGermanZipCodes(),
    this.loadAustrianZipCodes()
  ]);
  
  this.initialized = true;
  logger.info(`ZIP validation service initialized with ${this.germanZipCodes.size} German and ${this.austrianZipCodes.size} Austrian ZIP codes`);
}
```

### Validation Process

The `validateZipCodeCity` method checks if a given postal code and city combination is valid:

```typescript
async validateZipCodeCity(
  postalCode: string,
  city: string
): Promise<{
  matchFound: boolean;
  originalCity?: string;
  suggestedCity?: string;
  allPossibleCities?: string[];
  mismatch?: boolean;
}>
```

The validation follows these steps:

1. Initialize the service if needed
2. Normalize the city name for comparison
3. Determine if the postal code is German (5 digits) or Austrian (4 digits)
4. Look up the postal code in the appropriate map
5. If found, compare the provided city with the stored city
6. Return validation results including all possible cities for the ZIP code

## External ZIP Validation Service

The `ExternalZipValidationService` provides a more comprehensive validation by querying external APIs and caching results.

### API Integration

The service integrates with:

- OpenPLZ API for German postal codes
- Austrian Post API for Austrian postal codes

### Caching Mechanism

Results from external APIs are cached in the database to improve performance:

```typescript
private async cacheZipCodeResult(
  postalCode: string,
  city: string,
  allPossibleCities: string[],
  country: string
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
const isAustrian = postalCode.length === 4;
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
  zipCode     String   @unique
  city        String
  state       String?
  country     String
  source      String   @default("internal") // "internal", "openplz", etc.
  lastUpdated DateTime @default(now())
  createdAt   DateTime @default(now())
}
```

Our approach to handling multiple cities for a single ZIP code works as follows:

1. Each unique ZIP code has a single entry in the database with the primary city
2. When validating a city-ZIP code combination, we first check if it matches the database entry
3. If it doesn't match, we query the external API to check if it's a valid alternative
4. If confirmed valid, we add the new city-ZIP code combination as a new entry
5. This allows us to build a comprehensive database of all valid city-ZIP code combinations over time

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

1. German postal codes are updated quarterly
2. Austrian postal codes are updated annually
3. The update process involves:
   - Downloading the latest data from official sources
   - Transforming the data to match the internal format
   - Updating the database with new entries
   - Logging changes for auditing purposes

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