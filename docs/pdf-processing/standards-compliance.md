# Standards Compliance

This document details how the BriefButler application ensures compliance with German and Austrian postal standards for address formatting and positioning.

## Overview

The PDF Processing Service is designed to work with documents that follow specific standards for address positioning and formatting. These standards ensure that:

1. Addresses are positioned correctly for automated processing
2. Address components follow a standardized format
3. Documents are compatible with postal service requirements

## German and Austrian Postal Standards

### DIN 5008

DIN 5008 is the German standard for business correspondence, which includes specifications for address formatting and positioning.

#### Address Field Positioning

DIN 5008 defines two forms for address field positioning:

**Form A (hochgestelltes Anschriftfeld)**
- Position from top edge: 27mm
- Height of address field: 40mm
- Position from left edge: 20mm
- Width of address field: 85mm

**Form B (tiefgestelltes Anschriftfeld)**
- Position from top edge: 45mm
- Height of address field: 40mm
- Position from left edge: 20mm
- Width of address field: 85mm

#### Address Format

DIN 5008 also specifies the format of address components:

```
[Recipient Name]
[Street and House Number]
[Postal Code] [City]
[Country - if international]
```

Example:
```
Max Mustermann
Musterstraße 123
12345 Berlin
```

### DIN 676

DIN 676 is a related standard that defines the layout of business letters, including the position of the address field.

**Type A**
- Position from top edge: 40mm
- Height of address field: 40mm
- Position from left edge: 20mm
- Width of address field: 85mm

### Austrian Standards

Austrian postal standards are similar to German standards but with some differences:

- Austrian postal codes consist of 4 digits (vs. 5 digits in Germany)
- Some formatting preferences differ slightly

## Implementation in the PDF Processing Service

### Constants and Configuration

The service defines constants for the standard measurements:

```typescript
// DIN 5008 constants
export const DIN_5008 = {
  addressField: {
    left: 20, // mm from left edge
    width: 85, // mm
    formA: {
      top: 27, // mm from top edge
      height: 40 // mm
    },
    formB: {
      top: 45, // mm from top edge
      height: 40 // mm
    }
  }
};

// DIN 676 constants
export const DIN_676 = {
  addressField: {
    left: 20, // mm from left edge
    width: 85, // mm
    typeA: {
      top: 40, // mm from top edge
      height: 40 // mm
    }
  }
};
```

### Address Window Identification

The service identifies the address window based on the specified form type:

```typescript
export enum AddressFormType {
  FORM_A = 'FORM_A',
  FORM_B = 'FORM_B',
  DIN_676_A = 'DIN_676_A'
}

function getAddressWindow(formType: AddressFormType): AddressWindow {
  let addressWindow: AddressWindow;
  
  switch (formType) {
    case AddressFormType.FORM_A:
      addressWindow = {
        left: DIN_5008.addressField.left,
        top: DIN_5008.addressField.formA.top,
        width: DIN_5008.addressField.width,
        height: DIN_5008.addressField.formA.height
      };
      break;
    case AddressFormType.FORM_B:
      addressWindow = {
        left: DIN_5008.addressField.left,
        top: DIN_5008.addressField.formB.top,
        width: DIN_5008.addressField.width,
        height: DIN_5008.addressField.formB.height
      };
      break;
    case AddressFormType.DIN_676_A:
      addressWindow = {
        left: DIN_676.addressField.left,
        top: DIN_676.addressField.typeA.top,
        width: DIN_676.addressField.width,
        height: DIN_676.addressField.typeA.height
      };
      break;
    default:
      // Default to DIN 5008 Form A
      addressWindow = {
        left: DIN_5008.addressField.left,
        top: DIN_5008.addressField.formA.top,
        width: DIN_5008.addressField.width,
        height: DIN_5008.addressField.formA.height
      };
  }
  
  return addressWindow;
}
```

### Unit Conversion

The service converts between millimeters (used in the standards) and points (used in PDF documents):

```typescript
// Convert mm to points (1 mm = 2.83465 points)
function mmToPoints(mm: number): number {
  return mm * 2.83465;
}

// Convert points to mm
function pointsToMm(points: number): number {
  return points / 2.83465;
}
```

### Address Format Validation

The service validates that extracted addresses follow the standard format:

```typescript
function validateAddressFormat(address: ExtractedAddress): boolean {
  // Check for required components
  if (!address.name || !address.street || (!address.city && !address.postalCode)) {
    return false;
  }
  
  // Validate postal code format
  if (address.postalCode) {
    // German postal code: 5 digits
    const germanPostalCodeRegex = /^[0-9]{5}$/;
    // Austrian postal code: 4 digits
    const austrianPostalCodeRegex = /^[0-9]{4}$/;
    
    if (!(germanPostalCodeRegex.test(address.postalCode) || 
          austrianPostalCodeRegex.test(address.postalCode))) {
      return false;
    }
  }
  
  // Validate street format (should include house number)
  if (address.street && !address.street.match(/\d+/)) {
    // Street without house number
    return false;
  }
  
  return true;
}
```

## Handling Non-Standard Documents

The service includes mechanisms to handle documents that don't perfectly comply with the standards:

### Auto-Detection of Form Type

If the form type is not specified, the service attempts to auto-detect it:

```typescript
async detectFormType(pdfData: PDFExtractResult): Promise<AddressFormType> {
  // Check for content in the different address window positions
  const formAContent = this.extractTextFromArea(
    pdfData.pages[0].content,
    mmToPoints(DIN_5008.addressField.formA.top),
    mmToPoints(DIN_5008.addressField.left),
    mmToPoints(DIN_5008.addressField.width),
    mmToPoints(DIN_5008.addressField.formA.height)
  );
  
  const formBContent = this.extractTextFromArea(
    pdfData.pages[0].content,
    mmToPoints(DIN_5008.addressField.formB.top),
    mmToPoints(DIN_5008.addressField.left),
    mmToPoints(DIN_5008.addressField.width),
    mmToPoints(DIN_5008.addressField.formB.height)
  );
  
  const din676AContent = this.extractTextFromArea(
    pdfData.pages[0].content,
    mmToPoints(DIN_676.addressField.typeA.top),
    mmToPoints(DIN_676.addressField.left),
    mmToPoints(DIN_676.addressField.width),
    mmToPoints(DIN_676.addressField.typeA.height)
  );
  
  // Determine which area has the most address-like content
  const formAScore = this.scoreAddressContent(formAContent);
  const formBScore = this.scoreAddressContent(formBContent);
  const din676AScore = this.scoreAddressContent(din676AContent);
  
  // Return the form type with the highest score
  if (formAScore > formBScore && formAScore > din676AScore) {
    return AddressFormType.FORM_A;
  } else if (formBScore > formAScore && formBScore > din676AScore) {
    return AddressFormType.FORM_B;
  } else {
    return AddressFormType.DIN_676_A;
  }
}
```

### Flexible Address Window

For documents that don't perfectly align with the standards, the service can expand the address window:

```typescript
function getExpandedAddressWindow(
  baseWindow: AddressWindow,
  expansionFactor: number = 1.2
): AddressWindow {
  return {
    left: baseWindow.left * (2 - expansionFactor),
    top: baseWindow.top * (2 - expansionFactor),
    width: baseWindow.width * expansionFactor,
    height: baseWindow.height * expansionFactor
  };
}
```

## Compliance Reporting

The service generates compliance reports to identify documents that don't meet the standards:

```typescript
interface ComplianceReport {
  isCompliant: boolean;
  issues: ComplianceIssue[];
  recommendations: string[];
}

enum ComplianceIssue {
  ADDRESS_OUTSIDE_WINDOW = 'Address content outside standard window',
  MISSING_POSTAL_CODE = 'Missing postal code',
  INVALID_POSTAL_CODE_FORMAT = 'Invalid postal code format',
  MISSING_HOUSE_NUMBER = 'Street missing house number',
  NON_STANDARD_SPACING = 'Non-standard spacing between components'
}

function generateComplianceReport(
  pdfData: PDFExtractResult,
  extractedAddress: ExtractedAddress,
  formType: AddressFormType
): ComplianceReport {
  const issues: ComplianceIssue[] = [];
  const recommendations: string[] = [];
  
  // Check if address content is within the standard window
  // ...
  
  // Check address format compliance
  // ...
  
  return {
    isCompliant: issues.length === 0,
    issues,
    recommendations
  };
}
```

## Testing for Standards Compliance

The service includes test utilities to verify compliance with the standards:

```typescript
function createTestPdf(
  addressText: string,
  formType: AddressFormType,
  isCompliant: boolean = true
): Buffer {
  // Create a PDF with the address text positioned according to the specified form type
  // If isCompliant is false, position the address outside the standard window
  // ...
}

async function testStandardsCompliance(): Promise<void> {
  // Test with compliant documents
  const compliantPdfA = createTestPdf(
    "Max Mustermann\nMusterstraße 123\n12345 Berlin",
    AddressFormType.FORM_A
  );
  
  // Test with non-compliant documents
  const nonCompliantPdf = createTestPdf(
    "Max Mustermann\nMusterstraße\n12345 Berlin",
    AddressFormType.FORM_A,
    false
  );
  
  // Process the test PDFs and verify the results
  // ...
}
```

## Best Practices for Standards Compliance

1. **Use standard templates**: Provide users with templates that comply with DIN 5008 and DIN 676
2. **Validate before processing**: Check documents for compliance before full processing
3. **Provide clear feedback**: Inform users about compliance issues and how to fix them
4. **Be flexible but informative**: Process non-compliant documents when possible, but inform users about potential issues
5. **Stay updated**: Monitor changes to postal standards and update the service accordingly

## Future Improvements

1. Machine learning-based detection of address windows for non-standard documents
2. Support for additional international standards
3. Automated correction of minor compliance issues
4. Integration with document template generation tools
5. Compliance scoring system to quantify how well a document adheres to standards 