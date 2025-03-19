# BriefButler Integration

This integration connects our application to the BriefButler API, allowing us to:

1. Submit letters for printing and delivery
2. Track the status of submitted letters
3. Cancel letters that haven't been sent yet
4. Retrieve user-specific profiles

## Configuration

Before using the BriefButler integration, ensure you have properly configured the following environment variables in your `.env` file:

```
BRIEFBUTLER_API_URL="https://demodelivery.briefbutler.com"
BRIEFBUTLER_CERTIFICATE_PATH="certificates/Briefbutler_Test_2024.p12"
BRIEFBUTLER_CERTIFICATE_PASSWORD="your-certificate-password"
```

Make sure the certificate file exists at the specified path relative to the project root.

## Certificate

The BriefButler API uses client certificate authentication. You need to:

1. Place your `.p12` or `.pfx` certificate file in the `certificates` directory
2. Update the `BRIEFBUTLER_CERTIFICATE_PATH` in your `.env` file to point to this file
3. Set the correct password in `BRIEFBUTLER_CERTIFICATE_PASSWORD`

## Testing

We've created several test scripts to verify the BriefButler integration:

### 1. Test Certificate Authentication

This script tests that your certificate is valid and can authenticate with the BriefButler API:

```bash
npx ts-node src/scripts/test-certificate.ts
```

### 2. Test Service Functions

This script tests the direct integration between our service and the BriefButler API:

```bash
npx ts-node src/scripts/test-briefbutler.ts
```

### 3. Test HTTP Endpoints

This script tests our HTTP API endpoints that expose the BriefButler functionality:

```bash
npx ts-node src/scripts/test-briefbutler-http.ts
```

## API Endpoints

The BriefButler functionality is exposed through the following API endpoints:

- **GET /api/brief-butler/profiles/:userId** - Get all profiles for a user
- **POST /api/brief-butler/submit** - Submit a letter to BriefButler
  - Required payload: `{ letterId: string, profileId: string }`
- **GET /api/brief-butler/status/:trackingId** - Get the status of a letter
- **POST /api/brief-butler/cancel/:trackingId** - Cancel a letter that hasn't been sent yet

## Troubleshooting

### Certificate Issues

If you're having problems with the certificate authentication:

1. Make sure the certificate file exists at the specified path
2. Verify the certificate password is correct
3. Check that the certificate hasn't expired
4. Run the `test-certificate.ts` script to diagnose issues

### API Issues

If the certificate is working but you're having issues with the API:

1. Verify the correct `BRIEFBUTLER_API_URL` is set in your `.env` file
2. Check the logs for any error messages
3. Run the test scripts to diagnose specific issues

## Database Updates

When a letter is submitted via BriefButler:

1. The letter's status is updated to `SENT`
2. The tracking ID is stored in the letter record
3. A new status history entry is created

When checking letter status:

1. If the status has changed, the letter record is updated
2. A new status history entry is created

When canceling a letter:

1. The letter's status is updated to `FAILED`
2. A new status history entry is created 