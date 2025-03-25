#!/bin/bash

# Verify P12 Certificate Script
# This script helps verify that a P12 certificate is valid and can be read with the provided password

# Get the absolute path to the backend directory
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Set the default certificate path and password from .env if available
CERT_PATH=$(grep BRIEFBUTLER_CERTIFICATE_PATH "$BACKEND_DIR/.env" | cut -d '=' -f2 | tr -d '"')
CERT_PASS=$(grep BRIEFBUTLER_CERTIFICATE_PASSWORD "$BACKEND_DIR/.env" | cut -d '=' -f2 | tr -d '"')

# Remove any leading/trailing quotes
CERT_PATH=$(echo "$CERT_PATH" | sed "s/^['\"]//;s/['\"]$//")
CERT_PASS=$(echo "$CERT_PASS" | sed "s/^['\"]//;s/['\"]$//")

# If certificate path doesn't start with /, prepend the backend directory
if [[ "$CERT_PATH" != /* ]]; then
    FULL_CERT_PATH="$BACKEND_DIR/$CERT_PATH"
else
    FULL_CERT_PATH="$CERT_PATH"
fi

echo "============================================"
echo "🔒 BriefButler Certificate Verification Tool"
echo "============================================"
echo
echo "Certificate path: $FULL_CERT_PATH"
echo "Certificate password: $CERT_PASS"
echo

if [ ! -f "$FULL_CERT_PATH" ]; then
    echo "❌ ERROR: Certificate file not found at: $FULL_CERT_PATH"
    exit 1
fi

echo "📄 Certificate file found. Verifying..."
echo

# Try to verify the certificate using OpenSSL with legacy mode
if openssl pkcs12 -info -in "$FULL_CERT_PATH" -noout -passin "pass:$CERT_PASS" -legacy; then
    echo
    echo "✅ Certificate is valid and can be read with the provided password."
    
    # Extract certificate information
    echo
    echo "📋 Certificate Details:"
    echo "===================="
    # Extract and display subject
    SUBJECT=$(openssl pkcs12 -in "$FULL_CERT_PATH" -legacy -passin "pass:$CERT_PASS" -nokeys 2>/dev/null | 
              openssl x509 -noout -subject 2>/dev/null)
    echo "Subject: $SUBJECT"
    
    # Extract and display issuer
    ISSUER=$(openssl pkcs12 -in "$FULL_CERT_PATH" -legacy -passin "pass:$CERT_PASS" -nokeys 2>/dev/null | 
             openssl x509 -noout -issuer 2>/dev/null)
    echo "Issuer: $ISSUER"
    
    # Extract and display validity dates
    DATES=$(openssl pkcs12 -in "$FULL_CERT_PATH" -legacy -passin "pass:$CERT_PASS" -nokeys 2>/dev/null | 
            openssl x509 -noout -dates 2>/dev/null)
    echo "$DATES"
    
else
    echo
    echo "❌ Failed to verify certificate. This may be due to:"
    echo "  - Incorrect password"
    echo "  - Invalid or corrupted certificate file"
    echo "  - Certificate format issues"
    echo
    echo "Try using the -legacy flag with OpenSSL for older RC2 encryption formats."
    exit 1
fi

# Attempt to extract PEM files for further compatibility
echo
echo "📤 Extracting PEM files for API compatibility..."
TEMP_DIR="$BACKEND_DIR/certs_temp"
mkdir -p "$TEMP_DIR"

PEM_CERT_PATH="$TEMP_DIR/certificate.pem"
PEM_KEY_PATH="$TEMP_DIR/private_key.pem"

# Extract certificate to PEM format
if openssl pkcs12 -in "$FULL_CERT_PATH" -out "$PEM_CERT_PATH" -clcerts -nokeys -legacy -passin "pass:$CERT_PASS" 2>/dev/null; then
    echo "✅ Certificate extracted to: $PEM_CERT_PATH"
else
    echo "❌ Failed to extract certificate to PEM format"
fi

# Extract private key to PEM format
if openssl pkcs12 -in "$FULL_CERT_PATH" -out "$PEM_KEY_PATH" -nocerts -legacy -passin "pass:$CERT_PASS" -passout "pass:$CERT_PASS" 2>/dev/null; then
    echo "✅ Private key extracted to: $PEM_KEY_PATH"
else
    echo "❌ Failed to extract private key to PEM format"
fi

echo
echo "✨ Verification complete!"
echo "You can now use these certificates with the BriefButler API." 