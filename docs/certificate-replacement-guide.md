# BriefButler Certificate Replacement Guide

This document explains how to replace the P12 certificate file for the BriefButler API integration.

## Prerequisites

- Access to the new P12 certificate file
- Knowledge of the certificate password
- OpenSSL installed on your system

## Steps to Replace the Certificate

1. **Locate the certificate directory**:
   
   The certificate should be placed in the `backend/certificates` directory. If this directory doesn't exist, create it:
   
   ```bash
   mkdir -p backend/certificates
   ```

2. **Copy the new certificate file**:
   
   Copy your new P12 certificate file into the `backend/certificates` directory. For example:
   
   ```bash
   cp /path/to/your/new-certificate.p12 backend/certificates/BB_Test_2024.p12
   ```

3. **Verify the certificate**:
   
   Run the verification script to ensure the certificate is valid and can be used with the BriefButler API:
   
   ```bash
   ./backend/src/scripts/verify-certificate.sh
   ```
   
   If the script reports any issues, check:
   - That the certificate file is a valid P12/PFX file
   - That the password in `.env` matches the certificate password
   - That the certificate path in `.env` is correct

4. **Update the .env file (if needed)**:
   
   If you're using a different filename or password for the certificate, update these values in the `.env` file:
   
   ```
   BRIEFBUTLER_CERTIFICATE_PATH="certificates/your-new-certificate.p12"
   BRIEFBUTLER_CERTIFICATE_PASSWORD="your-certificate-password"
   ```

5. **Test the API connection**:
   
   After replacing the certificate, test the connection to ensure it's working correctly:
   
   ```bash
   npx ts-node backend/src/scripts/check-briefbutler-connection.ts
   ```

## Troubleshooting

### Certificate Password Issues

If you're having issues with the certificate password, make sure:
- The password in `.env` matches the certificate password
- There are no extra quotes or spaces in the password

### Legacy Certificate Format

Some older P12 certificates use RC2 encryption which requires the `-legacy` flag with OpenSSL. The verification script automatically applies this flag, but if you're manually verifying the certificate, use:

```bash
openssl pkcs12 -info -in "certificates/your-certificate.p12" -noout -passin "pass:your-password" -legacy
```

### Connection Issues

If the certificate is valid but you still can't connect to the API:
1. Check that the API URL in `.env` is correct
2. Temporarily enable mock mode for testing:
   ```
   BRIEFBUTLER_TEST_MODE="true"
   ```
3. Check for any firewall or network restrictions

## Using PEM Files

The BriefButler service automatically tries to use PEM files extracted from the P12 certificate if they exist. These files are stored in:
- `backend/certs_temp/certificate.pem`
- `backend/certs_temp/private_key.pem`

The verification script automatically extracts these files. If you need to extract them manually:

```bash
mkdir -p backend/certs_temp
openssl pkcs12 -in "backend/certificates/your-certificate.p12" -out "backend/certs_temp/certificate.pem" -clcerts -nokeys -legacy -passin "pass:your-password"
openssl pkcs12 -in "backend/certificates/your-certificate.p12" -out "backend/certs_temp/private_key.pem" -nocerts -legacy -passin "pass:your-password" -passout "pass:your-password"
``` 