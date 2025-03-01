# Address Validation Documentation

## Overview

BriefButler provides robust address validation capabilities to ensure that uploaded letters contain valid and deliverable addresses. The system performs validation on both postal codes/cities and street names, using a combination of internal database lookups and external API services.

## Validation Process

When a PDF is uploaded with the `extractAddress` flag set to `true`, the system:

1. Extracts text from the address window area of the PDF
2. Parses the text to identify recipient name, street, postal code, city, and country
3. Validates the postal code and city combination
4. If the postal code and city are valid, validates the street name against known streets for that postal code/city
5. Returns the extracted address with validation details and confidence score

## API Response Format

When a letter is created with address extraction, the API response includes detailed validation information:

```json
{
  "status": "success",
  "message": "Letter created successfully",
  "data": {
    "letter": {
      // Letter details including recipient information from the extracted address
    },
    "addressExtraction": {
      "confidence": 0.9,
      "rawText": "Extracted raw text from the PDF...",
      "zipCodeValidation": {
        "attempted": true,
        "countryDetected": "Germany",
        "zipCodeFormat": "German (5-digit)",
        "cityProvided": true,
        "matchFound": true,
        "originalCity": "Paderborn",
        "suggestedCity": "Paderborn"
      },
      "streetValidation": {
        "attempted": true,
        "streetProvided": true,
        "matchFound": true,
        "originalStreet": "Josef-Schröder-Straße 78",
        "suggestedStreet": "Josef-Schröder-Str."
      }
    }
  }
}
```

### Address Extraction Fields

| Field | Type | Description |
|-------|------|-------------|
| `confidence` | number | Confidence score (0-1) for the extracted address |
| `rawText` | string | Raw text extracted from the address window |

### ZIP Code Validation Fields

| Field | Type | Description |
|-------|------|-------------|
| `attempted` | boolean | Whether ZIP code validation was attempted |
| `countryDetected` | string | Detected country based on ZIP code format |
| `zipCodeFormat` | string | Format of the ZIP code (e.g., "German (5-digit)") |
| `cityProvided` | boolean | Whether a city was provided in the extracted address |
| `matchFound` | boolean | Whether the ZIP code and city combination was found in the validation database |
| `originalCity` | string | The city name as extracted from the PDF |
| `suggestedCity` | string | The suggested city name from validation (if different) |

### Street Validation Fields

| Field | Type | Description |
|-------|------|-------------|
| `attempted` | boolean | Whether street validation was attempted |
| `streetProvided` | boolean | Whether a street was provided in the extracted address |
| `matchFound` | boolean | Whether the street was found in the validation database for the given ZIP code/city |
| `originalStreet` | string | The street name as extracted from the PDF |
| `suggestedStreet` | string | The suggested street name from validation (if different) |

## Validation Logic

### Simplified Validation Algorithm

The validation process follows a sequential approach:

1. **ZIP Code and City Validation**:
   - The system first attempts to validate the ZIP code and city using an internal database
   - If internal validation fails, it tries external validation using the OpenPLZ API
   - If ZIP/city validation fails, the confidence score is reduced significantly (-0.3)
   - If ZIP/city validation fails, street validation automatically fails as well, since reliable street data depends on a valid ZIP/city combination

2. **Street Validation** (only if ZIP/city validation passed):
   - The system normalizes the street name (removing special characters, handling abbreviations)
   - It generates alternative normalizations to handle common variations (e.g., "Straße" vs "Str.")
   - The system checks if the normalized street name matches any known streets for the ZIP code/city
   - If street validation fails, the confidence score is reduced (-0.2)

### Confidence Scoring

- The system starts with a base confidence score of 0
- Successful ZIP/city validation adds 0.4 to the confidence score
- Successful street validation adds an additional 0.2 to the confidence score
- If no validations pass but some address data is present, a base confidence of 0.4 is assigned
- The final confidence score reflects the overall quality of the extracted address:
  - 0.6: High confidence (both ZIP/city and street validations passed)
  - 0.4: Medium confidence (only ZIP/city validation passed or partial address data)
  - 0.0: Low confidence (no validations passed and minimal address data)

## Important Notes

- The system follows a "positive thinking" approach, focusing on whether matches are found rather than mismatches
- Original extracted data is always preserved and used for the letter, even when validation suggests corrections
- Validation results are provided for informational purposes only
- For Austrian addresses (4-digit postal codes), validation is more lenient due to potential API coverage limitations

## Handling Variations

The system handles common variations in street names and addresses:

- Abbreviations (e.g., "Str." vs "Straße")
- Hyphenated names (e.g., "Josef-Schröder-Straße")
- Special characters and umlauts
- Different formats for the same location (e.g., "Wien" vs "Wien, Josefstadt")

This flexible approach ensures that addresses can be validated even when there are minor differences in formatting or abbreviations. 