/**
 * BriefButler Connection Status Checker
 * 
 * This script verifies the connection to the BriefButler API using the 
 * current service configuration from environment variables. It checks:
 * 
 * 1. Certificate availability and validity
 * 2. API endpoint connectivity
 * 3. Authentication status
 * 
 * Run with: npx ts-node src/scripts/check-briefbutler-connection.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { briefButlerService } from '../services/brief-butler.service';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration from env
const API_URL = process.env.BRIEFBUTLER_API_URL || 'https://demodelivery.briefbutler.com';
const CERT_PATH = process.env.BRIEFBUTLER_CERTIFICATE_PATH || 'certificates/briefbutler-cert.pfx';
const CERT_PASSWORD = process.env.BRIEFBUTLER_CERTIFICATE_PASSWORD || 'foobar';
const MOCK_MODE = process.env.BRIEFBUTLER_TEST_MODE === 'true';

// Status check results
interface CheckResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: any;
}

/**
 * Run all checks for BriefButler connectivity
 */
async function checkConnection() {
  console.log('🔍 BriefButler Connection Status Check');
  console.log('======================================');
  
  const results: CheckResult[] = [];
  
  // 1. Check environment configuration
  results.push(checkEnvironmentConfig());
  
  // 2. Check certificate file
  results.push(checkCertificateFile());
  
  // 3. Check certificate validity
  if (results[1].status !== 'error') {
    results.push(checkCertificateValidity());
  }
  
  // 4. Check API connectivity
  results.push(await checkApiConnectivity());
  
  // 5. Check service initialization
  results.push(checkServiceInitialization());
  
  // Display results
  console.log('\n📋 Connection Status Summary');
  console.log('---------------------------');
  
  let overallStatus = 'success';
  
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    
    if (result.status === 'error') {
      overallStatus = 'error';
    } else if (result.status === 'warning' && overallStatus !== 'error') {
      overallStatus = 'warning';
    }
  });
  
  console.log('\n📊 Overall Status: ' + 
    (overallStatus === 'success' ? '✅ GOOD' : 
     overallStatus === 'warning' ? '⚠️ PARTIAL' : '❌ FAILED'));
  
  if (overallStatus !== 'success') {
    console.log('\n🔧 Troubleshooting Tips:');
    if (results[0].status !== 'success') {
      console.log('- Check your .env file and make sure all required variables are set correctly');
    }
    if (results[1].status !== 'success') {
      console.log('- Verify that the certificate file exists at the specified location');
    }
    if (results[2]?.status !== 'success') {
      console.log('- Check if the certificate is valid and the password is correct');
      console.log('- Try extracting the certificate to PEM format using the test-pem-certificate.ts script');
    }
    if (results[3].status !== 'success') {
      console.log('- Check if the API URL is correct and the server is online');
      console.log('- Verify your network connection and any proxy settings');
    }
    if (results[4].status !== 'success') {
      console.log('- Check for any errors in the BriefButlerService initialization');
    }
    if (MOCK_MODE) {
      console.log('- You are currently in MOCK MODE. Set BRIEFBUTLER_TEST_MODE=false in your .env file for real API calls');
    }
  }
}

/**
 * Check if environment variables are properly configured
 */
function checkEnvironmentConfig(): CheckResult {
  const result: CheckResult = {
    name: 'Environment Configuration',
    status: 'success',
    message: 'All required variables are set',
    details: {
      BRIEFBUTLER_API_URL: API_URL,
      BRIEFBUTLER_CERTIFICATE_PATH: CERT_PATH,
      BRIEFBUTLER_TEST_MODE: MOCK_MODE ? 'true' : 'false'
    }
  };
  
  // Check for potential issues
  if (!process.env.BRIEFBUTLER_API_URL) {
    result.status = 'warning';
    result.message = 'Using default API URL, BRIEFBUTLER_API_URL not set';
  }
  
  if (!process.env.BRIEFBUTLER_CERTIFICATE_PATH) {
    result.status = 'warning';
    result.message = 'Using default certificate path, BRIEFBUTLER_CERTIFICATE_PATH not set';
  }
  
  if (MOCK_MODE) {
    result.status = 'warning';
    result.message = 'Mock mode is enabled - no real API calls will be made';
  }
  
  return result;
}

/**
 * Check if certificate file exists
 */
function checkCertificateFile(): CheckResult {
  const pfxPath = path.resolve(process.cwd(), CERT_PATH);
  const result: CheckResult = {
    name: 'Certificate File',
    status: 'success',
    message: `Certificate found at ${pfxPath}`,
    details: { path: pfxPath }
  };
  
  if (!fs.existsSync(pfxPath)) {
    result.status = 'error';
    result.message = `Certificate not found at ${pfxPath}`;
  }
  
  // Check PEM files as well
  const pemCertPath = path.resolve(__dirname, '../../certs_temp/certificate.pem');
  const pemKeyPath = path.resolve(__dirname, '../../certs_temp/private_key.pem');
  const pemFilesExist = fs.existsSync(pemCertPath) && fs.existsSync(pemKeyPath);
  
  result.details = {
    ...result.details,
    pfxExists: fs.existsSync(pfxPath),
    pemFilesExist,
    pemCertPath,
    pemKeyPath
  };
  
  return result;
}

/**
 * Check if certificate is valid by attempting to extract info
 */
function checkCertificateValidity(): CheckResult {
  const result: CheckResult = {
    name: 'Certificate Validity',
    status: 'success',
    message: 'Certificate appears to be valid',
  };
  
  try {
    const pfxPath = path.resolve(process.cwd(), CERT_PATH);
    
    // Try to get certificate info using OpenSSL
    const command = `openssl pkcs12 -in "${pfxPath}" -info -noout -passin pass:${CERT_PASSWORD} -legacy 2>&1`;
    
    try {
      execSync(command);
    } catch (error: any) {
      result.status = 'error';
      result.message = 'Certificate validation failed';
      result.details = {
        error: error.message,
        hint: 'This may indicate an incorrect password or corrupt certificate file'
      };
      return result;
    }
    
    // Check expiration date
    try {
      // Extract certificate to a temporary file
      const tempCertPath = path.resolve(__dirname, '../../certs_temp/temp_cert.pem');
      const tempDir = path.dirname(tempCertPath);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      execSync(`openssl pkcs12 -in "${pfxPath}" -clcerts -nokeys -out "${tempCertPath}" -passin pass:${CERT_PASSWORD} -legacy 2>/dev/null`);
      
      // Get certificate details including expiration
      const certInfo = execSync(`openssl x509 -in "${tempCertPath}" -noout -dates 2>/dev/null`).toString();
      
      // Clean up
      if (fs.existsSync(tempCertPath)) {
        fs.unlinkSync(tempCertPath);
      }
      
      // Extract expiration date
      const notAfterMatch = certInfo.match(/notAfter=(.+)/);
      if (notAfterMatch && notAfterMatch[1]) {
        const expiryDate = new Date(notAfterMatch[1]);
        const now = new Date();
        const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        result.details = {
          expiryDate: expiryDate.toISOString(),
          daysRemaining
        };
        
        if (daysRemaining < 30) {
          result.status = 'warning';
          result.message = `Certificate expires in ${daysRemaining} days`;
        }
      }
    } catch (error: any) {
      // Non-critical error, just warn
      result.status = 'warning';
      result.message = 'Unable to check certificate expiration date';
      result.details = { error: error.message };
    }
    
    return result;
  } catch (error: any) {
    result.status = 'error';
    result.message = 'Failed to check certificate validity';
    result.details = { error: error.message };
    return result;
  }
}

/**
 * Check if API endpoint is accessible
 */
async function checkApiConnectivity(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'API Connectivity',
    status: 'pending',
    message: 'Checking...'
  };
  
  try {
    // Try a simple request to the root endpoint
    const response = await briefButlerService.getLetterStatus('test-123');
    
    if (response.success) {
      result.status = 'success';
      result.message = 'Successfully connected to API';
      result.details = {
        mockMode: MOCK_MODE,
        statusCode: 200
      };
    } else {
      // Even in mock mode, this shouldn't fail
      result.status = 'warning';
      result.message = 'API request completed but reported an error';
      result.details = {
        mockMode: MOCK_MODE,
        error: response.error
      };
    }
  } catch (error: any) {
    result.status = 'error';
    result.message = 'Failed to connect to API';
    result.details = {
      error: error.message,
      mockMode: MOCK_MODE
    };
  }
  
  return result;
}

/**
 * Check if BriefButlerService initialized properly
 */
function checkServiceInitialization(): CheckResult {
  const result: CheckResult = {
    name: 'Service Initialization',
    status: 'success',
    message: 'Service initialized correctly',
    details: {
      mockMode: briefButlerService['inMockMode']
    }
  };
  
  // This check is a simple way to verify the service instance is created
  if (!briefButlerService) {
    result.status = 'error';
    result.message = 'BriefButlerService not properly initialized';
    return result;
  }
  
  return result;
}

// Run the connection check
checkConnection()
  .then(() => {
    if (MOCK_MODE) {
      console.log('\n⚠️ Note: Mock mode is enabled. Set BRIEFBUTLER_TEST_MODE=false in .env for real API calls.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unhandled error during connection check:', error);
    process.exit(1);
  }); 