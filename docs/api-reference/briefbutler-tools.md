# BriefButler Integration Tools

This document provides an overview of the utility scripts available for working with the BriefButler API. These tools are designed to help with setup, testing, and troubleshooting the BriefButler integration.

## Available Scripts

The following scripts are available in the `backend/src/scripts` directory:

| Script Name | Description |
|-------------|-------------|
| `setup-briefbutler.ts` | Interactive assistant to help configure the BriefButler integration |
| `check-briefbutler-connection.ts` | Checks the current connection status to the BriefButler API |
| `test-api-endpoints.ts` | Interactive tool to test various BriefButler API endpoints |
| `test-pem-certificate.ts` | Tests the certificate authentication using PEM files |

## Setup Assistant

The Setup Assistant helps you configure your environment for working with the BriefButler API. It guides you through:

- Setting up environment variables
- Validating your certificate
- Extracting PEM files for use with the API
- Testing API connectivity
- Saving your configuration

### Usage

```bash
npx ts-node backend/src/scripts/setup-briefbutler.ts
```

### What it does

1. Displays your current configuration
2. Allows you to update configuration values
3. Validates your certificate file
4. Extracts PEM files from your certificate
5. Tests the API connection
6. Saves your configuration to the `.env` file

## Connection Checker

The Connection Checker performs a series of tests to verify your connection to the BriefButler API:

- Checks environment configuration
- Validates certificate files
- Tests API connectivity
- Verifies service initialization

### Usage

```bash
npx ts-node backend/src/scripts/check-briefbutler-connection.ts
```

### Example Output

```
🔍 BriefButler Connection Status Check
======================================
...

📋 Connection Status Summary
---------------------------
✅ Environment Configuration: All required variables are set
✅ Certificate File: Certificate found at /path/to/certificate.pfx
✅ Certificate Validity: Certificate appears to be valid
✅ API Connectivity: Successfully connected to API
✅ Service Initialization: Service initialized correctly

📊 Overall Status: ✅ GOOD
```

If issues are detected, you'll receive troubleshooting tips to help resolve them.

## API Endpoint Tester

The API Endpoint Tester allows you to interact with the BriefButler API endpoints, both through an interactive menu and command-line arguments.

### Interactive Mode

```bash
npx ts-node backend/src/scripts/test-api-endpoints.ts
```

This launches an interactive menu where you can choose:

1. Test the root endpoint
2. Check letter status
3. Get user profiles
4. Submit a test letter
5. Cancel a letter
6. Test a custom endpoint
7. Exit

### Command-Line Mode

```bash
npx ts-node backend/src/scripts/test-api-endpoints.ts <endpoint> [method] [data]
```

Examples:

```bash
# Test the root endpoint
npx ts-node backend/src/scripts/test-api-endpoints.ts

# Test a letter status
npx ts-node backend/src/scripts/test-api-endpoints.ts status/ABC123

# Submit a letter with data
npx ts-node backend/src/scripts/test-api-endpoints.ts letter post '{"profile_id":"test","recipient":{"name":"Test"}}'
```

## Certificate Tester

The Certificate Tester specifically checks the certificate authentication by:

1. Loading the certificate and private key PEM files
2. Making direct HTTPS requests to the BriefButler API
3. Testing multiple endpoints from the API documentation
4. Reporting detailed results

### Usage

```bash
npx ts-node backend/src/scripts/test-pem-certificate.ts
```

## Troubleshooting

### Certificate Issues

If you encounter certificate errors:

1. Check that your certificate file exists at the configured path
2. Verify that the certificate password is correct
3. Ensure the certificate is in PKCS#12 (.p12/.pfx) format
4. Try extracting the certificate to PEM format using the setup assistant

### API Connection Issues

If you can't connect to the API:

1. Verify that the API URL is correct
2. Check your network connection
3. Ensure the certificate is valid and authorized for the API
4. Try enabling mock mode to test your integration without a live API connection

### Environment Variable Issues

If environment variables aren't being recognized:

1. Run the setup assistant to configure your .env file
2. Check that the .env file is in the correct location (backend/.env)
3. Verify that the variables are correctly named:
   - `BRIEFBUTLER_API_URL`
   - `BRIEFBUTLER_CERTIFICATE_PATH`
   - `BRIEFBUTLER_CERTIFICATE_PASSWORD`
   - `BRIEFBUTLER_TEST_MODE`

## Using PEM Files

The BriefButler service automatically uses PEM files if they exist at:

- `backend/certs_temp/certificate.pem`
- `backend/certs_temp/private_key.pem`

To extract these files from your PFX certificate:

```bash
# Option 1: Use the setup assistant
npx ts-node backend/src/scripts/setup-briefbutler.ts

# Option 2: Use the API endpoint tester (which extracts PEM files)
npx ts-node backend/src/scripts/test-api-endpoints.ts

# Option 3: Manual extraction with OpenSSL
openssl pkcs12 -in certificates/briefbutler-cert.pfx -out certs_temp/certificate.pem -clcerts -nokeys -legacy -passin pass:foobar
openssl pkcs12 -in certificates/briefbutler-cert.pfx -out certs_temp/private_key.pem -nocerts -legacy -passin pass:foobar -passout pass:foobar
```

## Mock Mode

For development and testing without connecting to the actual API, you can enable mock mode:

1. Set `BRIEFBUTLER_TEST_MODE=true` in your .env file
2. The BriefButler service will return mock responses for all API calls
3. This is useful for UI development and testing without a valid certificate

To enable mock mode from the command line:

```bash
# Using the setup assistant
npx ts-node backend/src/scripts/setup-briefbutler.ts
# Then select "yes" for enable mock mode

# Or directly in the .env file
echo "BRIEFBUTLER_TEST_MODE=true" >> backend/.env
```

## Additional Resources

- [BriefButler API Reference](./briefbutler-api.md) - Comprehensive documentation of the API
- [BriefButler Website](https://developers.briefbutler.com/docs/spool.html) - Official API documentation 