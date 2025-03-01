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
if (zipValidationDetails && zipValidationDetails.matchFound) {
  // ZIP/city validation passed
  confidence += 0.4;
  
  // Only check street validation if ZIP/city validation passed
  if (streetValidationDetails && streetValidationDetails.matchFound) {
    confidence += 0.2;
  }
}

// Add a base confidence of 0.4 if we have at least some address data
if (confidence === 0 && (name || street || postalCode || city)) {
  confidence = 0.4;
}

// Ensure the final score is between 0 and 1
confidence = Math.max(0, Math.min(1, confidence));
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
| Street validation passes (only checked if ZIP/city passes) | +0.2 |
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