# PDF Processing Service Documentation

## Overview

The PDF Processing Service is a core component of the BriefButler application responsible for extracting and validating address information from uploaded PDF documents. This service follows German and Austrian postal standards (DIN 5008 and DIN 676) to accurately identify recipient addresses in the correct location on the document.

## Key Features

- **Address Window Extraction**: Targets specific regions of the PDF document based on standard formats (DIN 5008 Form A/B, DIN 676 Type A)
- **OCR Processing**: Extracts text from the address window area
- **Address Parsing**: Identifies components like name, street, postal code, city, and country
- **ZIP Code Validation**: Validates postal codes against both internal and external databases
- **Multiple City Handling**: Supports cases where a single ZIP code corresponds to multiple cities
- **Confidence Scoring**: Provides confidence metrics for extracted addresses

## Documentation Structure

- [Address Extraction Process](./address-extraction-process.md): Detailed explanation of how addresses are extracted from PDFs
- [ZIP Code Validation](./zip-code-validation.md): Documentation on the ZIP code validation process
- [Confidence Scoring](./confidence-scoring.md): How confidence scores are calculated and adjusted
- [Standards Compliance](./standards-compliance.md): Information about DIN standards implementation
- [Troubleshooting Guide](./troubleshooting.md): Common issues and their solutions

## Technical Implementation

The PDF Processing Service is implemented in TypeScript and consists of several key components:

1. **PdfProcessingService**: Main service class that orchestrates the extraction process
2. **ZipValidationService**: Internal validation of ZIP codes and cities
3. **ExternalZipValidationService**: External validation using the OpenPLZ API

## Integration Points

- **Letter Controller**: The service is called during letter creation to extract address data
- **External APIs**: Integrates with OpenPLZ API for ZIP code validation
- **Database**: Caches validated ZIP codes for future reference

## Recent Updates

- Added support for multiple cities associated with a single ZIP code
- Enhanced confidence scoring to better reflect validation results
- Improved handling of Austrian postal codes
- Added normalization of city names for better matching

## Maintenance Guidelines

When updating the PDF Processing Service:

1. Always update this documentation to reflect changes
2. Add detailed comments in the code
3. Consider backward compatibility
4. Test with various PDF formats and address styles
5. Update the confidence scoring logic if validation changes 