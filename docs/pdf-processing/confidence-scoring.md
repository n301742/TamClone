# Confidence Scoring System

This document details how the BriefButler application calculates confidence scores for extracted and validated addresses.

## Overview

The confidence scoring system provides a numerical measure (between 0 and 1) of how reliable an extracted address is. This score helps:

1. Identify addresses that may need manual review
2. Prioritize addresses for processing
3. Make automated decisions about address acceptance
4. Track the performance of the extraction and validation system

## Confidence Score Calculation

The confidence score starts at a baseline value of 0 and is adjusted based on validation results:

```typescript
// Start with a base confidence of 0
let confidence = 0.0;

// Add to confidence based on successful validations
if (zipValidationResult.isValid) {
  // ZIP/city validation passed
  confidence += 0.4;
}

// Add to confidence for successful street validation
if (streetValidationResult.isValid) {
  confidence += 0.6;
}

// Final confidence score is between 0 and 1
// 0.0: No validations passed
// 0.4: Only ZIP/city validation passed
// 1.0: Both ZIP/city and street validations passed
```

### Confidence Score Interpretation

| Score Range | Interpretation | Recommended Action |
|-------------|----------------|-------------------|
| 0.0 - 0.3   | Very low confidence | Manual review required |
| 0.4 - 0.5   | Low confidence | Manual review recommended |
| 0.6 - 0.7   | Moderate confidence | Automated processing with caution |
| 0.8 - 1.0   | High confidence | Automated processing |

## Validation Components

The confidence score is based on two main validation components:

1. **ZIP/City Validation (0.4 points)**
   - Verifies that the postal code exists
   - Confirms the city matches the postal code
   - Checks for formatting issues

2. **Street Validation (0.6 points)**
   - Verifies the street exists in the given postal code and city
   - Checks for spelling and formatting issues
   - Validates against external databases

## Implementation

The confidence scoring is implemented in the PDF processing service:

```typescript
// In the PDF processing service
if (zipValidationResult.isValid) {
  writeLog(`[PDF Processing] Adding confidence for successful ZIP/city validation: ${0.4}`);
  extractedAddress.confidence += 0.4;
}

if (streetValidationResult.isValid) {
  writeLog(`[PDF Processing] Adding confidence for successful street validation: ${0.6}`);
  extractedAddress.confidence += 0.6;
}
```

## Factors Affecting Confidence

### 1. ZIP Code and City Validation

The results of ZIP code validation significantly impact confidence:

| Validation Result | Impact on Confidence |
|-------------------|---------------------|
| ZIP/city validation passes | +0.4 |
| ZIP/city validation fails | No addition (remains at 0 or base level) |

### 2. Street Validation

The results of street validation also impact confidence:

| Validation Result | Impact on Confidence |
|-------------------|---------------------|
| Street validation passes (only checked if ZIP/city passes) | +0.6 |
| Street validation fails | No addition |

### 3. Base Confidence for Partial Data

If no validations pass but some address data is present:

| Condition | Impact on Confidence |
|-----------|---------------------|
| Some address data present (name, street, postal code, or city) | Base confidence of 0.4 |
| No address data | Confidence remains at 0 |

## Confidence Thresholds

The application uses confidence thresholds to determine how to handle addresses:

| Confidence Range | Handling |
|------------------|----------|
| 0.6 | High confidence - automatic processing (both validations passed) |
| 0.4 | Medium confidence - may require review (partial validation or some address data) |
| 0.0 | Low confidence - requires manual review (no validations passed, minimal address data) |

## Confidence Score Display

The confidence score is displayed to users in the following ways:

1. Color-coded indicators (green for high, yellow for medium, red for low)
2. Percentage display (e.g., "60% confidence")
3. Detailed breakdown of validation results (in the address review interface)

## Logging and Analytics

Confidence scores are logged for analysis and system improvement:

```typescript
logger.info(`Address processed with confidence ${address.confidence.toFixed(2)}`, {
  addressId: address.id,
  confidence: address.confidence,
  validationDetails: {
    zipValidation: address.zipValidationDetails,
    streetValidation: address.streetValidationDetails
  }
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