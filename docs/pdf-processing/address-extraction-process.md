# Address Extraction Process

This document details how the PDF Processing Service extracts address information from uploaded PDF documents.

## Overview

The address extraction process follows these key steps:

1. PDF document loading
2. Address window identification based on document standards
3. Text extraction from the address window area
4. Text parsing to identify address components
5. Validation of extracted address data
6. Confidence scoring of the extraction results

## Document Standards

The service supports multiple document standards for address positioning:

### DIN 5008 Form A (hochgestelltes Anschriftfeld)
- Position from top edge: 27mm
- Height of address field: 40mm
- Position from left edge: 20mm
- Width of address field: 85mm

### DIN 5008 Form B (tiefgestelltes Anschriftfeld)
- Position from top edge: 45mm
- Height of address field: 40mm
- Position from left edge: 20mm
- Width of address field: 85mm

### DIN 676 Type A
- Position from top edge: 40mm
- Height of address field: 40mm
- Position from left edge: 20mm
- Width of address field: 85mm

## Detailed Process Flow

### 1. PDF Document Loading

The process begins with loading the PDF document using the `pdf.js-extract` library:

```typescript
const pdfBuffer = fs.readFileSync(filePath);
const pdfExtract = new PDFExtract();
const data = await pdfExtract.extractBuffer(pdfBuffer);
```

### 2. Address Window Identification

Based on the specified form type (Form A, Form B, or DIN 676), the service identifies the coordinates of the address window:

```typescript
switch (formType) {
  case AddressFormType.FORM_A:
    addressWindow = {
      left: DIN_5008.addressField.left,
      top: DIN_5008.addressField.formA.top,
      width: DIN_5008.addressField.width,
      height: DIN_5008.addressField.formA.height
    };
    break;
  // Other cases...
}
```

### 3. Text Extraction from Address Window

The service extracts text content that falls within the address window area:

```typescript
const windowItems = this.extractTextFromArea(
  contentItems,
  addressWindow.top,
  addressWindow.left,
  addressWindow.width,
  addressWindow.height
);
```

The `extractTextFromArea` method filters content items based on their position coordinates to include only those that fall within the address window.

### 4. Text Processing and Line Grouping

Extracted text items are grouped by lines based on their y-coordinates:

```typescript
const windowLines = this.groupTextByLines(windowItems);
```

The service then formats the text with proper spacing:

```typescript
const windowText = this.formatTextWithImprovedSpacing(windowLines);
```

### 5. Address Parsing

The formatted text is parsed to identify address components according to DIN 5008 standards:

```typescript
const addressData = await this.parseAddressFromText(windowText);
```

The parsing process identifies:
- Sender information (typically first line)
- Salutation (e.g., "Herr", "Frau")
- Recipient name
- Street and house number
- Postal code and city
- Optional country

### 6. Address Validation

The extracted address is validated to ensure it contains the minimum required fields:

```typescript
if (await this.isValidAddress(addressData)) {
  // Address is valid
}
```

A valid address must have:
- A name
- A street
- Either a city or a postal code

### 7. ZIP Code and City Validation

If a postal code and city are present, they are validated using a multi-layered approach:

1. First, the internal database is checked using `ZipValidationService`, which queries the database for matching ZIP code entries
2. If internal validation fails, external validation is attempted using `ExternalZipValidationService`
3. The validation process checks if the extracted city matches any of the possible cities for the given ZIP code
4. If a valid city-ZIP code combination is found in the external API but not in our database, it's automatically added to the database for future use

This dynamic approach allows the system to learn and adapt over time, eliminating the need for hard-coded special cases.

### 8. Street Validation

After validating the ZIP code and city, the system validates the street name:

1. The system checks if the extracted street exists for the given postal code and city
2. First, the internal database is checked using `StreetValidationService`
3. If internal validation fails, external validation is attempted using the OpenPLZ API
4. The validation process checks if the extracted street matches any of the possible streets for the given postal code and city
5. If a valid street is found in the external API but not in our database, it's automatically added to the database for future use

The street validation follows the same dynamic approach as ZIP code validation, allowing the system to learn and adapt over time.

```typescript
// Example of street validation
const streetValidationResult = await streetValidationService.validateStreet(
  street,
  postalCode,
  city
);

if (streetValidationResult.isValid) {
  // Street is valid for this postal code and city
  console.log(`Street "${street}" is valid for ${postalCode} ${city}`);
} else if (streetValidationResult.mismatch) {
  // Street might be valid but doesn't exactly match
  console.log(`Street "${street}" might be valid for ${postalCode} ${city}`);
  console.log(`Suggested street: ${streetValidationResult.suggestedStreet}`);
} else {
  // Street is not valid
  console.log(`Street "${street}" is not valid for ${postalCode} ${city}`);
}
```

### 9. Confidence Scoring

A confidence score is calculated based on the validation results:

```typescript
let confidence = 0.9; // Start with high confidence

// Apply confidence adjustment for ZIP code validation
if (addressData.zipValidationDetails) {
  if (addressData.zipValidationDetails.mismatch) {
    confidence -= 0.3; // More significant reduction for mismatches
  } else if (!addressData.zipValidationDetails.matchFound) {
    confidence -= 0.1; // Small reduction for no match found
  }
}

// Apply confidence adjustment for street validation
if (addressData.streetValidationDetails) {
  if (addressData.streetValidationDetails.mismatch) {
    confidence -= 0.2; // Reduction for street mismatches
  } else if (!addressData.streetValidationDetails.matchFound) {
    confidence -= 0.1; // Small reduction for no match found
  }
}
```

## Special Handling Cases

### Multiple Cities for a Single ZIP Code

The system now handles multiple cities for a single ZIP code dynamically:

1. When querying the database, all entries with the same ZIP code are retrieved
2. The extracted city is compared against all cities found in the database
3. If the extracted city matches any of the cities, it's considered valid
4. If not found in the database but confirmed valid by the external API, the new city-ZIP code combination is added to the database
5. This approach allows the system to automatically discover and validate new city-ZIP code combinations

For example, Austrian postal code 6971 corresponds to both "Hard" and "Fußach". Both combinations are stored as separate entries in the database, allowing the system to validate either city as correct for that ZIP code.

### Austrian Postal Codes

Austrian postal codes (4 digits) receive special handling:

1. More lenient validation due to potential gaps in the external API coverage
2. Smaller confidence adjustments for validation failures
3. Addresses with Austrian postal codes are not invalidated solely based on API validation failures

## Error Handling

The service includes robust error handling to ensure the process continues even if certain steps fail:

- If the PDF file is not found or cannot be read, an error is thrown
- If no pages are found in the PDF, an error is thrown
- If text extraction fails, the process logs the error and continues
- If ZIP code validation fails, the process logs the error and continues without validation

## Output Format

The final output is an `ExtractedAddress` object containing:

```typescript
{
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  confidence: number;
  rawText?: string;
  zipValidationDetails?: {
    matchFound: boolean;
    originalCity?: string;
    suggestedCity?: string;
    allPossibleCities?: string[];
    mismatch?: boolean;
  };
  streetValidationDetails?: {
    matchFound: boolean;
    originalStreet?: string;
    suggestedStreet?: string;
    allPossibleStreets?: string[];
    mismatch?: boolean;
  };
}
```

## API Response Format

When the address extraction is performed through the API, the response includes detailed validation information:

```typescript
{
  confidence: number;
  rawText: string;
  zipCodeValidation: {
    attempted: boolean;
    countryDetected: string | null;
    zipCodeFormat: string | null;
    cityProvided: boolean;
    matchFoundInDatabase: boolean;
    originalCity: string | null;
    suggestedCity: string | null;
  };
  streetValidation: {
    attempted: boolean;
    streetProvided: boolean;
    matchFoundInDatabase: boolean;
    originalStreet: string | null;
    suggestedStreet: string | null;
    mismatch: boolean;
  };
}
```

This detailed response allows clients to understand why a particular confidence score was assigned and what validation issues were encountered.

## Logging

The service includes comprehensive logging to track the extraction process:

- Each step of the process is logged with timestamps
- Extracted text is logged for debugging
- Validation results are logged
- Confidence adjustments are logged
- Any errors or mismatches are logged

This logging is essential for troubleshooting and improving the extraction process.

## Address Validation Details

The extracted address includes detailed validation information:

```typescript
interface ExtractedAddress {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  confidence: number;
  rawText?: string;
  zipValidationDetails?: {
    matchFound: boolean;
    originalCity?: string;
    suggestedCity?: string;
    allPossibleCities?: string[];
    mismatch?: boolean;
  };
  streetValidationDetails?: {
    matchFound: boolean;
    originalStreet?: string;
    suggestedStreet?: string;
    allPossibleStreets?: string[];
    mismatch?: boolean;
  };
}
``` 