/**
 * Certificate Authentication Test Script
 * 
 * This script tests the certificate authentication by:
 * 1. Loading the certificate file
 * 2. Making a direct HTTPS request to the BriefButler API
 * 3. Reporting success or failure
 * 
 * Run with: npx ts-node src/scripts/test-certificate.ts
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

// Get configuration from environment variables
const baseUrl = process.env.BRIEFBUTLER_API_URL || 'https://demodelivery.briefbutler.com';
const certificatePath = process.env.BRIEFBUTLER_CERTIFICATE_PATH || 'certificates/Briefbutler_Test_2024.p12';
const certificatePassword = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar';

// Absolute path to certificate
const absoluteCertPath = path.resolve(process.cwd(), certificatePath);

async function verifyP12Certificate(certPath: string, password: string): Promise<boolean> {
  try {
    // Use OpenSSL to test the certificate if available
    try {
      console.log('🔍 Verifying certificate with OpenSSL...');
      const cmd = `openssl pkcs12 -info -in "${certPath}" -noout -passin pass:${password}`;
      execSync(cmd, { stdio: 'pipe' });
      console.log('✅ OpenSSL verification successful');
      return true;
    } catch (error: any) {
      console.error('❌ OpenSSL verification failed:', error.message);
      
      if (error.message.includes('wrong password')) {
        console.log('The certificate password is incorrect.');
      } else if (error.message.includes('No such file or directory')) {
        console.log('OpenSSL not found. Continuing with built-in verification.');
      } else {
        console.log('Certificate may be invalid or corrupted. Please check the format.');
      }
    }
    
    // Alternative verification: Try to load it in Node.js
    const buffer = fs.readFileSync(certPath);
    
    // Try to create a pfx context with it
    console.log('🔍 Verifying certificate with Node.js...');
    const { createSecureContext } = require('tls');
    
    createSecureContext({
      pfx: buffer,
      passphrase: password
    });
    
    console.log('✅ Node.js verification successful');
    return true;
  } catch (error: any) {
    console.error('❌ Node.js verification failed:', error.message);
    
    if (error.message.includes('mac verify failure')) {
      console.log('The certificate password is incorrect.');
    } else if (error.message.includes('unsupported')) {
      console.log('The certificate format is not supported. Make sure it is a valid PKCS#12 file.');
    }
    
    return false;
  }
}

async function printCertificateInfo() {
  console.log('📄 Certificate Details:');
  console.log(`- Path: ${absoluteCertPath}`);
  console.log(`- Password: ${certificatePassword ? '******' : 'Not provided'}`);
  console.log(`- File exists: ${fs.existsSync(absoluteCertPath)}`);
  
  if (fs.existsSync(absoluteCertPath)) {
    const stats = fs.statSync(absoluteCertPath);
    console.log(`- File size: ${stats.size} bytes`);
    console.log(`- Last modified: ${stats.mtime}`);
  }
}

async function testCertificateAuth() {
  try {
    console.log('🧪 Testing certificate authentication...');
    await printCertificateInfo();
    
    // Check if certificate file exists
    if (!fs.existsSync(absoluteCertPath)) {
      console.error(`❌ Certificate file not found at ${absoluteCertPath}`);
      console.log('Please ensure the certificate file is in the correct location.');
      return;
    }
    
    console.log('✅ Certificate file found');
    
    // Verify the certificate
    const isValid = await verifyP12Certificate(absoluteCertPath, certificatePassword);
    
    if (!isValid) {
      console.log('❌ Certificate verification failed. Cannot proceed with API test.');
      console.log('Please check your certificate file and password.');
      return;
    }
    
    // Create HTTPS agent with client certificate
    const httpsAgent = new https.Agent({
      pfx: fs.readFileSync(absoluteCertPath),
      passphrase: certificatePassword,
      rejectUnauthorized: false, // Set to false for testing
    });
    
    console.log('✅ HTTPS agent created with certificate');
    
    // Make a simple request to test authentication
    console.log(`🔄 Making test request to ${baseUrl}...`);
    
    const req = https.request(
      `${baseUrl}/api/health`,
      {
        method: 'GET',
        agent: httpsAgent,
        headers: {
          'Accept': 'application/json'
        },
      },
      (res) => {
        console.log(`✅ Response status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            console.log('✅ Response data:', data);
            console.log('🎉 Certificate authentication test completed!');
            
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              console.log('✅ Certificate authentication successful!');
            } else {
              console.log('❌ Certificate authentication failed.');
              console.log('Please check your certificate and password.');
            }
          } catch (error: any) {
            console.error('❌ Error parsing response:', error.message);
          }
        });
      }
    );
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      if (error.message.includes('CERT_HAS_EXPIRED')) {
        console.log('The certificate may have expired. Please check certificate validity.');
      } else if (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
        console.log('Unable to verify certificate. The certificate may not be trusted.');
      } else if (error.message.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
        console.log('Self-signed certificate. The certificate may not be trusted.');
      } else if (error.message.includes('wrong password')) {
        console.log('The certificate password is incorrect.');
      }
    });
    
    req.end();
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCertificateAuth().then(() => {
  console.log('Test script execution completed.');
}); 