# BriefButler Spool Service Integration

This document outlines the integration between our application and the BriefButler Spool Service for dual delivery of documents.

## Overview

The Spool Service is responsible for submitting documents to the BriefButler dual delivery system, which handles printing, enveloping, and delivering letters through traditional postal services and/or digital channels. This integration allows:

1. Submitting documents with recipient and sender information
2. Tracking the status of submitted documents
3. Handling address extraction from PDFs when recipient information is missing

## Configuration

Before using the Spool Service integration, ensure you have properly configured the following environment variables in your `.env` file:

```
BRIEFBUTLER_API_URL="https://demodelivery.briefbutler.com"
BRIEFBUTLER_CERTIFICATE_PATH="certificates/Briefbutler_Test_2024.p12"
BRIEFBUTLER_CERTIFICATE_PASSWORD="your-certificate-password"
```

## API Endpoints

The BriefButler Spool functionality is exposed through the following API endpoints:

### Submit a document to the Spool Service

```
POST /api/brief-butler/spool
```

**Request Body**:
```json
{
  "letterId": "uuid-of-letter-in-database",
  "senderData": {
    "name": "Sender Name",
    "address": "Sender Address",
    "city": "Sender City",
    "zip": "12345",
    "country": "Germany",
    "state": "Sender State (optional)",
    "reference": "Reference ID (optional)",
    "priority": "normal (optional)"
  }
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Letter submitted to spool service successfully",
  "data": {
    "letterId": "uuid-of-letter",
    "spoolId": "spool-tracking-id",
    "status": "PROCESSING"
  }
}
```

### Get status of a Spool submission

```
GET /api/brief-butler/spool/status/:spoolId
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Spool status retrieved successfully",
  "data": {
    "spool_id": "spool-tracking-id",
    "status": "processing|delivered|failed",
    "timestamp": "2025-03-24T12:34:56Z"
  }
}
```

## Usage Flow

1. **Upload PDF Document**: Use the existing letter upload endpoint to store the PDF in the system
2. **Extract Address (Optional)**: The system will automatically extract the recipient's address from the PDF if not provided
3. **Submit to Spool Service**: Call the spool endpoint with the letter ID and sender information
4. **Track Status**: Use the spool status endpoint to monitor the delivery progress

## Address Extraction

If the letter does not have recipient information, the system will:

1. Extract text from the address window area of the PDF
2. Parse the text to identify recipient name, street, postal code, city, and country
3. Validate the postal code and city combination
4. Update the letter record with the extracted address information

## Testing the Integration

A test script is provided to verify the integration:

```bash
npx ts-node src/scripts/test-briefbutler-spool.ts
```

This script tests both the submission and status retrieval functionality in mock mode without making real API calls.

## Error Handling

Common errors and their causes:

| Error | Possible Cause | Solution |
|-------|----------------|----------|
| "Failed to extract address from PDF" | Poor quality PDF or non-standard layout | Provide recipient information manually |
| "Certificate authentication failed" | Invalid certificate or password | Check certificate path and password in `.env` |
| "Recipient information is incomplete" | Missing required address fields | Ensure complete recipient information exists |

## Troubleshooting

If you encounter issues with the Spool Service:

1. Check that the certificate file exists and the password is correct
2. Verify the BriefButler API URL is properly set
3. Examine the API logs for detailed error messages
4. Test with the mock mode enabled to isolate connection issues

For any persistent issues, contact the BriefButler support team or check their documentation at https://demodelivery.briefbutler.com/endpoint-spool/q/swagger-ui/#/spool/post_endpoint_spool_dualDelivery. 