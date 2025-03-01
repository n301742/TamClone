# Address Validation API Reference

## Overview

This document provides detailed information about the address validation response format in the BriefButler API.

## Letter Creation with Address Extraction

### Endpoint

```
POST /api/letters
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | Yes | PDF file to upload |
| `extractAddress` | Boolean | No | Whether to extract address from the PDF (default: false) |
| `formType` | String | No | Form type for address extraction (formA, formB, din676) (default: formB) |
| `description` | String | No | Description of the letter |
| `isExpress` | Boolean | No | Whether the letter should be sent as express (default: false) |
| `isRegistered` | Boolean | No | Whether the letter should be registered (default: false) |
| `isColorPrint` | Boolean | No | Whether the letter should be printed in color (default: false) |
| `isDuplexPrint` | Boolean | No | Whether the letter should be printed on both sides (default: true) |

### Response Format

```json
{
  "status": "success",
  "message": "Letter created successfully",
  "data": {
    "letter": {
      "id": "f31b3fb6-bbcd-41ec-a654-ea11a27a1ac3",
      "userId": "2bc3032c-4309-4144-b161-23581731bdb1",
      "trackingId": null,
      "deliveryId": null,
      "profileId": null,
      "status": "PROCESSING",
      "pdfPath": "uploads/a00c8e65-5bde-4de0-be00-94ba458814c9.pdf",
      "fileName": "Gebührenbescheid Gew-Anm.pdf",
      "fileSize": 38967,
      "recipientName": "Güngör Dogan",
      "recipientAddress": "Josef-Schröder-Straße 78",
      "recipientCity": "Paderborn",
      "recipientState": "",
      "recipientZip": "33098",
      "recipientCountry": "Germany",
      "description": "Test letter with address extraction",
      "isExpress": false,
      "isRegistered": false,
      "isColorPrint": false,
      "isDuplexPrint": true,
      "sentAt": null,
      "deliveredAt": null,
      "createdAt": "2025-03-01T17:28:10.456Z",
      "updatedAt": "2025-03-01T17:28:10.456Z",
      "returnReceiptPath": null,
      "deleteAfter": null
    },
    "addressExtraction": {
      "confidence": 0.9,
      "rawText": "Stadt Paderborn - Marienplatz 11a - 33098 Paderborn \nFrau \nGüngör Dogan \nJosef-Schröder-Straße 78 \n33098 Paderborn ",
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

## Address Extraction Object

The `addressExtraction` object contains the results of the address extraction and validation process.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `confidence` | number | Confidence score (0-1) for the extracted address |
| `rawText` | string | Raw text extracted from the address window |
| `zipCodeValidation` | object | Results of ZIP code and city validation |
| `streetValidation` | object | Results of street validation |

## ZIP Code Validation Object

The `zipCodeValidation` object contains details about the validation of the postal code and city.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `attempted` | boolean | Whether ZIP code validation was attempted |
| `countryDetected` | string | Detected country based on ZIP code format |
| `zipCodeFormat` | string | Format of the ZIP code (e.g., "German (5-digit)") |
| `cityProvided` | boolean | Whether a city was provided in the extracted address |
| `matchFound` | boolean | Whether the ZIP code and city combination was found in the validation database |
| `originalCity` | string | The city name as extracted from the PDF |
| `suggestedCity` | string | The suggested city name from validation (if different) |

## Street Validation Object

The `streetValidation` object contains details about the validation of the street name.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `attempted` | boolean | Whether street validation was attempted |
| `streetProvided` | boolean | Whether a street was provided in the extracted address |
| `matchFound` | boolean | Whether the street was found in the validation database for the given ZIP code/city |
| `originalStreet` | string | The street name as extracted from the PDF |
| `suggestedStreet` | string | The suggested street name from validation (if different) |

## Validation Logic

The validation process follows a sequential approach:

1. **ZIP Code and City Validation** is performed first
2. If ZIP/city validation fails, street validation automatically fails as well
3. Street validation is only performed if ZIP/city validation passes
4. The confidence score is calculated as follows:
   - Base confidence starts at 0
   - Successful ZIP/city validation adds 0.4 to the confidence
   - Successful street validation adds an additional 0.2 to the confidence
   - If no validations pass but some address data is present, a base confidence of 0.4 is assigned

## Examples

### Successful Validation

```json
"addressExtraction": {
  "confidence": 0.6,
  "rawText": "Stadt Paderborn - Marienplatz 11a - 33098 Paderborn \nFrau \nGüngör Dogan \nJosef-Schröder-Straße 78 \n33098 Paderborn ",
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
```

### Validation with Suggestions

```json
"addressExtraction": {
  "confidence": 0.4,
  "rawText": "Stadt Wien - Rathaus - 1010 Wien \nHerr \nMax Mustermann \nJosefstädter Straße 15 \n1080 Wien ",
  "zipCodeValidation": {
    "attempted": true,
    "countryDetected": "Austria",
    "zipCodeFormat": "Austrian (4-digit)",
    "cityProvided": true,
    "matchFound": true,
    "originalCity": "Wien",
    "suggestedCity": "Wien, Josefstadt"
  },
  "streetValidation": {
    "attempted": true,
    "streetProvided": true,
    "matchFound": false,
    "originalStreet": "Josefstädter Straße 15",
    "suggestedStreet": "Josefstädter Str."
  }
}
```

### Validation with No Match

```json
"addressExtraction": {
  "confidence": 0.4,
  "rawText": "Herr \nJohn Doe \nFictional Street 123 \n12345 Nonexistent City ",
  "zipCodeValidation": {
    "attempted": true,
    "countryDetected": "Germany",
    "zipCodeFormat": "German (5-digit)",
    "cityProvided": true,
    "matchFound": false,
    "originalCity": "Nonexistent City",
    "suggestedCity": null
  },
  "streetValidation": {
    "attempted": true,
    "streetProvided": true,
    "matchFound": false,
    "originalStreet": "Fictional Street 123",
    "suggestedStreet": null
  }
}
``` 