# Confidence Scoring System

This document details how the BriefButler application calculates confidence scores for extracted and validated addresses.

## Overview

The confidence scoring system provides a numerical measure (between 0 and 1) of how reliable an extracted address is. This score helps:

1. Identify addresses that may need manual review
2. Prioritize addresses for processing
3. Make automated decisions about address acceptance
4. Track the performance of the extraction and validation system

## Confidence Score Calculation

The confidence score starts at a baseline value and is adjusted based on various factors:

```typescript
// Start with a high baseline confidence
let confidence = 0.9;

// Apply adjustments based on validation results
// ...

// Ensure the final score is between 0 and 1
confidence = Math.max(0, Math.min(1, confidence));
```

## Factors Affecting Confidence

### 1. Address Completeness

The presence or absence of key address components affects the confidence score:

| Component | Impact on Confidence |
|-----------|---------------------|
| Missing name | -0.2 |
| Missing street | -0.2 |
| Missing city and postal code | -0.3 |
| Missing country (for international) | -0.1 |

### 2. ZIP Code Validation

The results of ZIP code validation significantly impact confidence:

| Validation Result | Impact on Confidence |
|-------------------|---------------------|
| Perfect match | No change |
| City matches one of multiple possible cities | -0.05 |
| City mismatch with suggestion | -0.3 |
| ZIP code not found | -0.1 |
| External API validation failure | -0.05 |

For Austrian addresses (4-digit postal codes), these adjustments are reduced by 50% due to less comprehensive database coverage.

### 3. Address Format Validation

The format of address components also affects confidence:

| Format Issue | Impact on Confidence |
|--------------|---------------------|
| Street without house number | -0.1 |
| Unusual postal code format | -0.2 |
| Unusual city name format | -0.1 |

### 4. OCR Quality Indicators

The quality of the OCR process provides additional confidence adjustments:

| OCR Issue | Impact on Confidence |
|-----------|---------------------|
| Low contrast text | -0.1 |
| Text with low confidence characters | -0.05 to -0.2 (proportional) |
| Skewed or rotated text | -0.1 |

## Implementation Details

### Confidence Adjustment in Address Validation

The `isValidAddress` method applies confidence adjustments based on validation results:

```typescript
async isValidAddress(address: ExtractedAddress): Promise<boolean> {
  // Basic validation
  if (!address.name || !address.street || (!address.city && !address.postalCode)) {
    return false;
  }

  let confidenceAdjustment = 0;
  let isValid = true;

  // ZIP code validation if both postal code and city are present
  if (address.postalCode && address.city) {
    // Internal validation
    const internalValidationResult = await this.zipValidationService.validateZipCodeCity(
      address.postalCode,
      address.city
    );

    // Apply confidence adjustments based on validation results
    if (internalValidationResult.matchFound) {
      // Perfect match - no adjustment
    } else if (internalValidationResult.mismatch) {
      // City mismatch
      confidenceAdjustment -= 0.3;
    } else {
      // ZIP code not found in internal database
      confidenceAdjustment -= 0.1;
    }

    // Special handling for Austrian postal codes
    const isAustrian = address.postalCode.length === 4;
    if (isAustrian) {
      // More lenient validation for Austrian addresses
      confidenceAdjustment = confidenceAdjustment / 2;
    }
  }

  // Apply the confidence adjustment
  address.confidence = Math.max(0, Math.min(1, address.confidence + confidenceAdjustment));

  return isValid;
}
```

### Confidence Adjustment in Address Parsing

The `parseAddressFromText` method applies initial confidence scoring:

```typescript
async parseAddressFromText(text: string): Promise<ExtractedAddress> {
  // Start with a high baseline confidence
  let confidence = 0.9;
  
  // Parse address components
  // ...
  
  // Apply confidence adjustments based on completeness
  if (!name) confidence -= 0.2;
  if (!street) confidence -= 0.2;
  if (!postalCode && !city) confidence -= 0.3;
  
  // Create the result object
  const result: ExtractedAddress = {
    name,
    street,
    city,
    postalCode,
    country,
    confidence,
    rawText: text
  };
  
  return result;
}
```

## Confidence Thresholds

The application uses confidence thresholds to determine how to handle addresses:

| Confidence Range | Handling |
|------------------|----------|
| 0.8 - 1.0 | High confidence - automatic processing |
| 0.5 - 0.8 | Medium confidence - may require review |
| 0.0 - 0.5 | Low confidence - requires manual review |

These thresholds can be configured in the application settings.

## Confidence Score Display

The confidence score is displayed to users in the following ways:

1. Color-coded indicators (green for high, yellow for medium, red for low)
2. Percentage display (e.g., "85% confidence")
3. Detailed breakdown of factors affecting the score (in the address review interface)

## Logging and Analytics

Confidence scores are logged for analysis and system improvement:

```typescript
logger.info(`Address processed with confidence ${address.confidence.toFixed(2)}`, {
  addressId: address.id,
  confidence: address.confidence,
  validationDetails: address.zipValidationDetails,
  adjustments: confidenceAdjustments
});
```

These logs are used to:

1. Identify common validation issues
2. Track system performance over time
3. Identify opportunities for improvement
4. Generate reports on address quality

## Confidence Score Evolution

The confidence scoring system evolves based on:

1. Analysis of manual corrections
2. Feedback from delivery success rates
3. Comparison with external validation services
4. Machine learning models trained on historical data

## Best Practices

When working with confidence scores:

1. **Don't rely solely on the score**: Always provide users with the specific validation issues
2. **Adjust thresholds carefully**: Changes should be based on data analysis
3. **Monitor score distribution**: Watch for shifts that might indicate system issues
4. **Provide clear feedback**: Help users understand why an address has a particular score
5. **Collect feedback**: Allow users to report incorrect confidence assessments

## Future Improvements

Planned enhancements to the confidence scoring system:

1. Machine learning-based confidence scoring
2. Historical performance integration
3. Address-type specific scoring (residential vs. business)
4. Regional adjustments based on postal service reliability
5. Integration with delivery success feedback 