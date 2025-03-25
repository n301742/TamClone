# BriefButler API Reference

This document provides a comprehensive reference for the BriefButler API endpoints, authentication methods, and request/response formats.

> **Source**: https://developers.briefbutler.com/docs/spool.html#tag/BriefButler

## Base URL

```
https://demodelivery.briefbutler.com
```

## Authentication

The BriefButler API uses client certificate authentication (mutual TLS). You must include your client certificate in all API requests.

### Certificate Format

- **Certificate File**: PKCS#12 (.p12) format
- **Certificate Password**: Required for accessing the private key
- **Alternative Format**: PEM files (certificate.pem and private_key.pem)

## API Endpoints

### Submit Letter

Submits a new letter for printing and delivery.

```
POST /letter
```

#### Request Body

```json
{
  "document": "base64_encoded_pdf_content",
  "profile_id": "sender_profile_id",
  "recipient": {
    "name": "Recipient Name",
    "address": "Street Address",
    "city": "City",
    "zip": "Postal Code",
    "country": "Country Code",
    "state": "State/Province (optional)"
  },
  "options": {
    "express": false,
    "registered": true,
    "color": false,
    "duplex": true
  }
}
```

#### Response

```json
{
  "tracking_id": "tracking_id_for_the_letter",
  "status": "processing",
  "timestamp": "ISO-8601 timestamp"
}
```

### Check Letter Status

Retrieves the current status of a letter.

```
GET /status/{tracking_id}
```

#### Response

```json
{
  "tracking_id": "tracking_id_for_the_letter",
  "status": "processing|printed|shipped|delivered|returned|cancelled",
  "timestamp": "ISO-8601 timestamp",
  "details": {
    "delivery_date": "ISO-8601 timestamp (if delivered)",
    "estimated_arrival": "ISO-8601 timestamp (if in transit)",
    "current_location": "Location information (if available)",
    "events": [
      {
        "date": "ISO-8601 timestamp",
        "description": "Event description",
        "location": "Event location (if applicable)"
      }
    ]
  }
}
```

### Cancel Letter

Cancels a letter that hasn't been printed yet.

```
POST /cancel/{tracking_id}
```

#### Response

```json
{
  "tracking_id": "tracking_id_for_the_letter",
  "status": "cancelled",
  "timestamp": "ISO-8601 timestamp"
}
```

### Get User Profiles

Retrieves all available sender profiles for a user.

```
GET /profiles/{user_id}
```

#### Response

```json
[
  {
    "id": "profile_id",
    "name": "Profile Name",
    "address": "Sender Address",
    "city": "Sender City",
    "zip": "Sender Postal Code",
    "country": "Sender Country Code",
    "state": "Sender State/Province (if applicable)",
    "default_sender": true
  }
]
```

## Status Codes

- **200 OK**: The request was successful
- **201 Created**: The resource was successfully created
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

// Submit a letter
async function submitLetter() {
  try {
    const response = await apiClient.post('/letter', {
      document: 'base64_encoded_pdf_content',
      profile_id: 'sender_profile_id',
      recipient: {
        name: 'Recipient Name',
        address: 'Street Address',
        city: 'City',
        zip: 'Postal Code',
        country: 'Country Code',
      },
      options: {
        express: false,
        registered: true,
        color: false,
        duplex: true,
      },
    });
    
    console.log('Letter submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error submitting letter:', error.message);
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

// Check letter status
async function checkLetterStatus(trackingId) {
  try {
    const response = await apiClient.get(`/status/${trackingId}`);
    console.log('Letter status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking letter status:', error.message);
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
  "event": "letter_status_changed",
  "tracking_id": "tracking_id_for_the_letter",
  "status": "new_status",
  "timestamp": "ISO-8601 timestamp",
  "details": {
    "previous_status": "previous_status",
    "event_description": "Human-readable event description"
  }
}
``` 