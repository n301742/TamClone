# BriefButler API Reference

This document provides a comprehensive reference for the BriefButler API endpoints, authentication methods, and request/response formats.

> **Sources**: 
> - Spool API: https://developers.briefbutler.com/docs/spool.html#tag/Versand-Schnittstelle
> - Status API: https://developers.briefbutler.com/docs/status.html

## Base URLs

BriefButler provides two main API endpoints:

```
https://demodelivery.briefbutler.com/endpoint-spool/ - For document submission
https://demodelivery.briefbutler.com/endpoint-status/ - For status tracking
```

## Authentication

The BriefButler API uses client certificate authentication (mutual TLS). You must include your client certificate in all API requests.

### Certificate Format

- **Certificate File**: PKCS#12 (.p12) format
- **Certificate Password**: Required for accessing the private key
- **Alternative Format**: PEM files (certificate.pem and private_key.pem)

## API Endpoints

### Submit Document for Delivery

Submits documents for printing and delivery.

```
POST /endpoint-spool/dualDelivery
```

#### Request Body

```json
{
  "metadata": {
    "deliveryId": "MeineRueckscheinID_001",
    "caseId": "20210921T060003-20dcb6fe-6fe9-4b37-8b92-5c713801689b"
  },
  "configuration": {
    "deliveryProfile": "MeinProfil-1",
    "allowEmail": true,
    "costcenter": "testcostcenter"
  },
  "receiver": {
    "email": "max.mustermann@mailhost.com",
    "phoneNumber": "+436641234567",
    "recipient": {
      "physicalPerson": {
        "familyName": "Mustermann",
        "givenName": "Max",
        "dateOfBirth": "1975-10-25"
      }
    },
    "postalAddress": {
      "street": "Teststrasse",
      "number": "21/2/4",
      "postalCode": "1030",
      "city": "Wien",
      "countryCode": "AT"
    }
  },
  "sender": {
    "person": {
      "legalPerson": {
        "name": "Testfirma"
      }
    },
    "postalAddress": {
      "street": "Senderstrasse",
      "number": "1",
      "postalCode": "1010",
      "city": "Wien",
      "countryCode": "AT"
    }
  },
  "subject": "Test Zustellung",
  "documents": [
    {
      "content": "base64_encoded_pdf_content",
      "mimeType": "application/pdf",
      "name": "test.pdf",
      "type": "Standard",
      "realm": "GENERAL"
    }
  ]
}
```

#### Response

```json
{
  "trackingId": "20220513T084530-2b4fb08f-64a5-4b23-b7e4-5f5635e22ba1"
}
```

### Check Document Status by Tracking ID

Retrieves the current status of a document by its tracking ID.

```
GET /endpoint-status/message/trackingId/{trackingId}
```

#### Response

```json
{
  "trackingId": "20220513T084530-2b4fb08f-64a5-4b23-b7e4-5f5635e22ba1",
  "recoIds": ["5f5635e22ba1"],
  "deliveryId": "2b4fb08f-64a5-4b23-b7e4-5f5635e22ba1",
  "state": {
    "timestamp": "2020-01-01T08:59:32Z",
    "created": "2020-01-01T08:59:32Z",
    "updated": "2020-01-01T08:59:32Z",
    "channel": "regmail",
    "stateName": "delivery-fetched",
    "stateCode": 410,
    "returnReceiptDocuments": [
      {
        "documentId": "2b4fb08f-64a5-4b23-b7e4-5f5635e22ba1",
        "name": "confirm_receipt.pdf"
      }
    ],
    "outgoingDocuments": [
      {
        "documentId": "2b4fb08f-64a5-4b23-b7e4-5f5635e22ba1/0",
        "name": "invoice.pdf",
        "type": "Standard",
        "mimetype": "application/pdf",
        "size": 1024,
        "createdAt": "2024-11-04T13:48:53.379900306Z",
        "availableUntil": "2024-11-04T13:48:53.379900306Z"
      }
    ],
    "details": [
      {
        "detailStateName": "regmail-fetched",
        "detailStateCode": 1201,
        "timestamp": "2020-01-01T08:59:32Z",
        "additionalData": {
          "someKey": "someValue"
        }
      }
    ]
  },
  "history": [
    {
      "timestamp": "2020-01-01T08:59:32Z",
      "created": "2020-01-01T08:59:32Z",
      "updated": "2020-01-01T08:59:32Z",
      "channel": "regmail",
      "stateName": "delivery-fetched",
      "stateCode": 410
    }
  ]
}
```

### Check Document Status by Delivery ID and Profile ID

Retrieves the current status of documents by their delivery ID and profile ID.

```
GET /endpoint-status/message/deliveryId/{deliveryId}/{profileId}
```

#### Response

The response is an array of status objects similar to the tracking ID endpoint.

### Get Outgoing Document Content

Retrieves the content of an outgoing document by its tracking ID, document ID and version.

```
GET /endpoint-status/message/outgoingDocument/{trackingId}/{documentId}/{documentVersion}
```

The response is the binary content of the document.

### Get Return Receipt Document

Retrieves the content of a return receipt document by its tracking ID, document ID and version.

```
GET /endpoint-status/message/returnReceipt/{trackingId}/{documentId}/{documentVersion}
```

The response is the binary content of the document.

## Status Codes

- **200 OK**: The request was successful
- **400 Bad Request**: The request was invalid
- **401 Unauthorized**: Authentication failed
- **403 Forbidden**: The client doesn't have permission
- **404 Not Found**: The requested resource wasn't found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Error Responses

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": "Additional error details (if available)"
  }
}
```

## Sample Code

### Node.js Example (with PEM files)

```typescript
import axios from 'axios';
import https from 'https';
import fs from 'fs';

// Load certificate files
const cert = fs.readFileSync('path/to/certificate.pem');
const key = fs.readFileSync('path/to/private_key.pem');

// Create HTTPS agent with certificate
const httpsAgent = new https.Agent({
  cert,
  key,
  passphrase: 'certificate_password',
});

// Create API client
const apiClient = axios.create({
  baseURL: 'https://demodelivery.briefbutler.com',
  httpsAgent,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Submit documents for delivery
async function submitDocuments() {
  try {
    const requestBody = {
      metadata: {
        deliveryId: 'MyDeliveryID_001',
      },
      configuration: {
        deliveryProfile: 'MyProfile-1',
        allowEmail: true,
      },
      receiver: {
        recipient: {
          physicalPerson: {
            familyName: 'Doe',
            givenName: 'John',
          }
        },
        postalAddress: {
          street: 'Main Street',
          number: '10',
          postalCode: '10001',
          city: 'New York',
          countryCode: 'US',
        }
      },
      sender: {
        person: {
          legalPerson: {
            name: 'Company Name',
          }
        }
      },
      subject: 'Important Document',
      documents: [
        {
          content: 'base64_encoded_pdf_content',
          mimeType: 'application/pdf',
          name: 'document.pdf',
          type: 'Standard',
          realm: 'GENERAL',
        }
      ]
    };
    
    const response = await apiClient.post('/endpoint-spool/dualDelivery', requestBody);
    
    console.log('Document submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error submitting document:', error.message);
    throw error;
  }
}
```

### Node.js Example (with PFX file)

```typescript
import axios from 'axios';
import https from 'https';
import fs from 'fs';

// Load PFX certificate
const pfx = fs.readFileSync('path/to/certificate.pfx');

// Create HTTPS agent with certificate
const httpsAgent = new https.Agent({
  pfx,
  passphrase: 'certificate_password',
});

// Create API client
const apiClient = axios.create({
  baseURL: 'https://demodelivery.briefbutler.com',
  httpsAgent,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Check document status
async function checkDocumentStatus(trackingId) {
  try {
    const response = await apiClient.get(`/endpoint-status/message/trackingId/${trackingId}`);
    console.log('Document status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking document status:', error.message);
    throw error;
  }
}
```

## Error Handling

When working with the BriefButler API, it's important to implement proper error handling:

1. **Network Errors**: Handle connection issues and timeouts
2. **Authentication Errors**: Ensure certificate is valid and has correct permissions
3. **Rate Limiting**: Implement backoff strategies for 429 errors
4. **Data Validation**: Verify input data before sending requests
5. **Response Validation**: Check response data integrity before processing

## Rate Limits

- **Default Rate Limit**: 100 requests per minute
- **Bulk Processing**: Contact BriefButler support for higher limits

## Webhooks

BriefButler supports webhooks for status updates. Configure your webhook URL in the BriefButler dashboard.

### Webhook Payload

```json
{
  "event": "document_status_changed",
  "trackingId": "tracking_id_for_the_document",
  "status": "new_status",
  "timestamp": "ISO-8601 timestamp",
  "details": {
    "previous_status": "previous_status",
    "event_description": "Human-readable event description"
  }
}
``` 