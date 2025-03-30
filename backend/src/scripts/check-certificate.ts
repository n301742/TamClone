/**
 * Certificate Validation Script
 * 
 * This script checks if the certificate used for BriefButler authentication
 * exists, is valid, and correctly formatted.
 * 
 * Run with: npx ts-node backend/src/scripts/check-certificate.ts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function checkCertificate() {
  console.log('==== CERTIFICATE VALIDATION ====');
  
  // Get certificate path from env or use default
  const certPath = process.env.BRIEFBUTLER_CERTIFICATE_PATH ? 
    path.resolve(process.cwd(), process.env.BRIEFBUTLER_CERTIFICATE_PATH) : 
    path.resolve(process.cwd(), 'backend/certificates/BB_Test_2024.p12');
  
  const certPassword = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar';
  
  console.log(`Certificate path: ${certPath}`);
  console.log(`Certificate password provided: ${certPassword ? 'Yes' : 'No'}`);
  
  // Check if certificate file exists
  if (!fs.existsSync(certPath)) {
    console.error('❌ Certificate file does not exist!');
    
    // Try to find in other locations
    const potentialPaths = [
      path.resolve(process.cwd(), 'backend/certificates/BB_Test_2024.p12'),
      path.resolve(process.cwd(), 'certificates/BB_Test_2024.p12'),
      path.resolve(__dirname, '../../certificates/BB_Test_2024.p12'),
      path.resolve(__dirname, '../../../certificates/BB_Test_2024.p12')
    ];
    
    console.log('\nSearching for certificate in alternative locations:');
    let found = false;
    
    for (const altPath of potentialPaths) {
      if (fs.existsSync(altPath)) {
        console.log(`✅ Found certificate at: ${altPath}`);
        found = true;
      } else {
        console.log(`❌ Not found at: ${altPath}`);
      }
    }
    
    if (!found) {
      console.error('\n❌ Certificate not found in any standard location!');
      console.log('Please make sure to place your certificate file in the correct location');
      console.log('and update the BRIEFBUTLER_CERTIFICATE_PATH in your .env file.');
      return;
    }
  } else {
    console.log('✅ Certificate file exists');
    
    // Check file size
    const stats = fs.statSync(certPath);
    console.log(`Certificate file size: ${stats.size} bytes`);
    
    if (stats.size < 100) {
      console.warn('⚠️ Warning: Certificate file is suspiciously small');
    }
    
    // Try to inspect the certificate using OpenSSL
    try {
      console.log('\nTrying to inspect certificate with OpenSSL...');
      const result = execSync(`openssl pkcs12 -info -in "${certPath}" -noout -passin pass:${certPassword}`, { stdio: 'pipe' });
      console.log('✅ Certificate is valid and readable with the provided password');
    } catch (error: any) {
      console.error('❌ Failed to inspect certificate with OpenSSL:');
      console.error(error.stderr ? error.stderr.toString() : error.message);
      
      console.log('\nTrying alternative formats...');
      
      let passed = false;
      
      // Try with legacy format
      try {
        console.log('Testing with -legacy flag...');
        execSync(`openssl pkcs12 -info -in "${certPath}" -noout -passin pass:${certPassword} -legacy`, { stdio: 'pipe' });
        console.log('✅ Certificate is valid using legacy format!');
        console.log('\nRecommendation: Convert your certificate to a newer format using:');
        console.log(`openssl pkcs12 -in "${certPath}" -out converted.p12 -legacy -passin pass:${certPassword} -passout pass:${certPassword}`);
        passed = true;
      } catch (legacyError: any) {
        console.error('❌ Not a legacy format certificate:');
        console.error(legacyError.stderr ? legacyError.stderr.toString() : legacyError.message);
      }
      
      if (!passed) {
        console.log('\nTrying different passwords...');
        const commonPasswords = ['', 'password', 'briefbutler', 'test', 'changeit', 'changeme'];
        
        for (const pass of commonPasswords) {
          if (pass === certPassword) continue;
          
          try {
            console.log(`Testing with password: "${pass}"...`);
            execSync(`openssl pkcs12 -info -in "${certPath}" -noout -passin pass:${pass}`, { stdio: 'pipe' });
            console.log(`✅ Certificate is valid with password: "${pass}"!`);
            console.log(`\nRecommendation: Update your BRIEFBUTLER_CERTIFICATE_PASSWORD in .env to: ${pass}`);
            passed = true;
            break;
          } catch (passError) {
            // Continue trying
          }
        }
      }
      
      if (!passed) {
        console.error('\n❌ Certificate validation failed with all attempts.');
        console.log('Please ensure:');
        console.log('1. The certificate file is a valid PKCS#12 (.p12 or .pfx) file');
        console.log('2. The password specified in BRIEFBUTLER_CERTIFICATE_PASSWORD is correct');
        console.log('3. The certificate has not expired');
        console.log('\nIt may be helpful to contact BriefButler support for a new certificate');
      }
    }
    
    // Try to convert to PEM format
    const tempDir = path.join(process.cwd(), 'backend/certs_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pemCertPath = path.join(tempDir, 'certificate.pem');
    const pemKeyPath = path.join(tempDir, 'private_key.pem');
    
    // Only try if OpenSSL is available
    console.log('\nAttempting to convert certificate to PEM format...');
    
    try {
      // Extract certificate
      execSync(
        `openssl pkcs12 -in "${certPath}" -out "${pemCertPath}" -clcerts -nokeys -legacy -passin pass:${certPassword}`,
        { stdio: 'pipe' }
      );
      
      // Extract private key
      execSync(
        `openssl pkcs12 -in "${certPath}" -out "${pemKeyPath}" -nocerts -nodes -legacy -passin pass:${certPassword}`,
        { stdio: 'pipe' }
      );
      
      console.log('✅ Successfully converted to PEM format:');
      console.log(`Certificate: ${pemCertPath}`);
      console.log(`Private Key: ${pemKeyPath}`);
      
      console.log('\nRecommendation: Use these PEM files for authentication');
      console.log('You can update your code to use these files or set them in your environment variables.');
    } catch (conversionError: any) {
      console.error('❌ Failed to convert certificate to PEM format:');
      console.error(conversionError.stderr ? conversionError.stderr.toString() : conversionError.message);
    }
  }
  
  console.log('\n==== VALIDATION COMPLETED ====');
}

// Run the check
checkCertificate(); 