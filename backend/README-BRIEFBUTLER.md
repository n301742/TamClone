# BriefButler Integration

This integration connects our application to the BriefButler API, allowing us to:

1. Submit documents for dual delivery via the spool service
2. Track the status of submitted documents
3. Retrieve document and receipt content

## API Endpoints

BriefButler provides two main API endpoints:

```
https://demodelivery.briefbutler.com/endpoint-spool/ - For document submission
https://demodelivery.briefbutler.com/endpoint-status/ - For status tracking
```

## Configuration

Before using the BriefButler integration, ensure you have properly configured the following environment variables in your `.env` file:

```
BRIEFBUTLER_API_URL="https://demodelivery.briefbutler.com"
BRIEFBUTLER_CERTIFICATE_PATH="certificates/Briefbutler_Test_2024.p12"
BRIEFBUTLER_CERTIFICATE_PASSWORD="your-certificate-password"
BRIEFBUTLER_TEST_MODE="false"
```

## Certificate Setup

The BriefButler API uses client certificate authentication (mutual TLS). You need to:

1. Place your `.p12` or `.pfx` certificate file in the `certificates` directory
2. Update the `BRIEFBUTLER_CERTIFICATE_PATH` in your `.env` file to point to this file
3. Set the correct password in `BRIEFBUTLER_CERTIFICATE_PASSWORD`

### Certificate Format

The certificate must be in PKCS#12 (.p12 or .pfx) format. If you have an older certificate or are experiencing authentication issues, run the certificate validation script:

```bash
npx ts-node backend/src/scripts/check-certificate.ts
```

This script will:
- Verify if your certificate exists and is readable
- Check if it's a legacy format that needs conversion
- Convert the certificate to PEM format if needed
- Provide recommendations for fixing any issues

Our service automatically checks for and uses PEM files if they're available in `backend/certs_temp/`.

## Testing

We've created several test scripts to verify the BriefButler integration:

### 1. Test Certificate Authentication

This script tests that your certificate is valid and can authenticate with the BriefButler API:

```bash
npx ts-node backend/src/scripts/check-certificate.ts
```

### 2. Simple API Test

This script tests the basic API functionality without database dependencies:

```bash
# Test with real API (requires valid certificate)
npx ts-node backend/src/scripts/test-briefbutler-simple.ts

# Test in mock mode (doesn't require valid certificate)
npx ts-node backend/src/scripts/test-briefbutler-simple.ts --mock
```

### 3. Direct Document Submission Test

This script tests submitting a document directly to the API:

```bash
# Test with real API (requires valid certificate)
npx ts-node backend/src/scripts/test-real-briefbutler-submission.ts

# Test in mock mode (doesn't require valid certificate)
npx ts-node backend/src/scripts/test-real-briefbutler-submission.ts --mock
```

### 4. Database-Integrated Test

This script tests the full workflow including database operations:

```bash
# Test in mock mode only (as it requires a separate database setup)
npx ts-node backend/src/scripts/test-database-submission.ts --mock
```

### 5. Test Dual Delivery

This script tests the dual delivery functionality:

```bash
# Test with real API (requires valid certificate)
npx ts-node backend/src/scripts/test-briefbutler-dual-delivery.ts

# Test in mock mode (doesn't require valid certificate)
npx ts-node backend/src/scripts/test-briefbutler-dual-delivery.ts --mock
```

### 6. Check Document Status

We've created a dedicated script to check the status of a document by tracking ID:

```bash
# Check the status of a document by tracking ID
npx ts-node backend/src/scripts/check-document-status.ts <trackingId>

# Show detailed JSON response data
npx ts-node backend/src/scripts/check-document-status.ts <trackingId> --verbose

# Use mock mode
npx ts-node backend/src/scripts/check-document-status.ts <trackingId> --mock
```

Example:
```bash
npx ts-node backend/src/scripts/check-document-status.ts 20250330T093223-facb6e8b-b6e5-4536-a9cd-c11cd6d389b5
```

### Real API Testing Notes

When testing with the real API:
1. Make sure your certificate is valid
2. The test scripts will create a 5-second delay to allow you to cancel before making actual API calls
3. All test submissions will use mock recipient data (Max Mustermann at a test address)
4. The submission will be visible in your BriefButler dashboard for tracking

## Recipient Name Handling

The BriefButler API supports two different ways to specify the recipient's name:

### 1. Full Name (Legacy Method)

You can provide the full name as a single string in the `recipientName` field:

```typescript
const data = {
  recipientName: 'Max Mustermann',
  // other fields...
};
```

### 2. Separate First and Last Name (Recommended Method)

For better recipient name handling, you can provide the first name and last name separately:

```typescript
const data = {
  recipientName: 'Max Mustermann', // Still required for backward compatibility
  recipientFirstName: 'Max',       // First/given name
  recipientLastName: 'Mustermann', // Last/family name
  // other fields...
};
```

When both methods are provided, the service prioritizes the separate first/last name fields over the full name.

In the database, we store both the full name (`recipientName`) and the separate components (`recipientFirstName` and `recipientLastName`).

## API Routes

The BriefButler functionality is exposed through the following API endpoints:

- **POST /api/brief-butler/dual-delivery** - Submit a document for dual delivery
- **GET /api/brief-butler/status/:trackingId** - Get the status of a document by tracking ID
- **GET /api/brief-butler/status-by-delivery/:deliveryId/:profileId** - Get status by delivery ID and profile ID
- **GET /api/brief-butler/document/:trackingId/:documentId/:documentVersion** - Get document content
- **GET /api/brief-butler/receipt/:trackingId/:documentId/:documentVersion** - Get receipt document

## Troubleshooting

### Certificate Issues

If you're having problems with the certificate authentication:

1. Run the `check-certificate.ts` script to diagnose issues
2. Make sure the certificate file exists at the specified path
3. Verify the certificate password is correct
4. Check if the certificate is in legacy format and needs conversion

### API Issues

If you're having issues with the API calls:

1. Enable mock mode by setting `BRIEFBUTLER_TEST_MODE="true"` in your `.env` file
2. Check the logs for any error messages
3. Run the test scripts with the `--mock` flag to bypass authentication

### TypeScript Errors

If you encounter TypeScript compilation errors:

1. Check the `SpoolSubmissionData` interface in `src/types/briefbutler.types.ts` if it's missing any properties used in controllers
2. When adding new fields to API payloads, make sure to update the corresponding TypeScript interfaces
3. Note that the `Letter` model from the Prisma schema doesn't have properties like `recipientEmail`, `recipientPhone`, or `reference`—you need to handle these specifically in controllers

## Database Updates

When a document is submitted:
1. The document's status is updated to `PROCESSING`
2. The tracking ID is stored in the document record
3. A new status history entry is created

When checking document status:
1. If the status has changed, the document record is updated
2. A new status history entry is created 